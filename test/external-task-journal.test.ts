import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ExternalObservationStore, externalObservationId } from "../src/external-observations.js";
import { externalTaskId } from "../src/external-task-journal.js";
import { Store } from "../src/db.js";

const now = Date.now();
const report = (patch: Record<string,unknown> = {}) => ({schema_version:2,provider:"codex",account_id:"declared",host_id:"fixture",source_task_id:"task-a",
  source_run_id:"attempt-a",run_number:1,sequence:1,event_id:"event-a",version:1,reported_at:new Date(now).toISOString(),event_kind:"snapshot",state:"running",
  title:"Task A",description:"",project_id:null,thread_id:null,parent_source_task_id:null,depends_on_source_task_ids:[],creator_name:"dot",executor_name:null,message:null,blocker:null,summary:null,...patch});
const fixture = () => {const db=new DatabaseSync(":memory:");return {db,store:new ExternalObservationStore(db)};};

test("source task identity survives thread change and retry; stale attempts remain visible only as receipts",()=>{
  const {db,store}=fixture();try {
    const {id}=store.ingest(report(),now,"mcp");
    assert.equal(store.get(id,true,now)!.thread_id,null);
    store.ingest(report({sequence:2,event_id:"complete-a",version:2,state:"completed",thread_id:"real-thread-a",summary:{text:"Ready for review",evidence:["test log"]}}),now,"mcp");
    assert.equal(store.get(id,true,now)!.task_result,"reported_complete");assert.equal(store.get(id,true,now)!.acceptance_state,"unknown");
    assert.equal(store.ingest(report({sequence:3,event_id:"retry-b",version:3,source_run_id:"attempt-b",run_number:2,thread_id:"real-thread-b"}),now,"mcp").id,id);
    const snapshot=store.get(id,true,now);
    assert.equal(store.ingest(report({sequence:99,event_id:"late-a",version:99,state:"failed"}),now,"mcp").status,"stale_run");
    assert.deepEqual(store.get(id,true,now),{...snapshot,history_cursor:store.journal.cursor(id)});
    assert.equal(store.journal.runs(id).length,2);assert.equal(store.journal.runs(id)[1].summary?.text,"Ready for review");
    assert.equal(store.journal.recentEvents(id).at(-1)?.outcome,"stale_run");
    assert.match(store.messages(id).at(-1)!.text,/未更新当前状态/);
    assert.equal(store.get(id,true,now+30_000)!.execution_state,"unknown");
    assert.equal(store.journal.runs(id)[0].state,"running","silence never fails or restarts the source run");
  }finally{db.close();}
});

test("event conflict, terminal fencing, version rollback and invalid heartbeat cannot mutate current state",()=>{
  const {db,store}=fixture();try {
    const value=report(),{id}=store.ingest(value,now,"mcp");
    assert.equal(store.ingest(value,now,"mcp").status,"duplicate");assert.equal(store.journal.cursor(),1);
    assert.throws(()=>store.ingest({...value,title:"Changed duplicate"},now,"mcp"),/external_event_conflict/);
    assert.throws(()=>store.ingest(report({sequence:2,event_id:"heartbeat",version:2,event_kind:"heartbeat",state:"completed"}),now,"mcp"),/heartbeat_state_conflict/);
    store.ingest(report({sequence:2,event_id:"failed",version:2,state:"failed",blocker:{kind:"execution",message:"Source process failed"}}),now,"mcp");
    assert.equal(store.ingest(report({sequence:3,event_id:"undo",version:3}),now,"mcp").status,"terminal_run");
    assert.equal(store.ingest(report({sequence:4,event_id:"rollback",version:1,state:"failed"}),now,"mcp").status,"out_of_order");
    assert.equal(store.get(id,true,now)!.reported_execution_state,"failed");
    assert.throws(()=>store.ingest(report({sequence:5,event_id:"wrong-ordinal",version:5,run_number:2}),now,"mcp"),/run_identity_conflict/);
  }finally{db.close();}
});

test("worker exit without a completion or waiting protocol event is an anomaly, explicit waiting survives exit",()=>{
  const {db,store}=fixture();try {
    const {id}=store.ingest(report(),now,"mcp");
    store.ingest(report({sequence:2,event_id:"exit",version:2,event_kind:"worker_exit",state:"completed"}),now,"mcp");
    assert.equal(store.get(id,true,now)!.reported_execution_state,"blocked");
    assert.equal(store.get(id,true,now)!.blocker?.kind,"protocol");assert.equal(store.get(id,true,now)!.task_result,"unknown");
    for (const state of ["waiting_user","waiting_approval","blocked"]) {
      const identity={source_task_id:state,source_run_id:state};
      const task=store.ingest(report({...identity,state,blocker:{kind:"input",message:"Need source input"}}),now,"mcp");
      store.ingest(report({...identity,sequence:2,event_id:"exited",version:2,state,event_kind:"worker_exit"}),now,"mcp");
      assert.equal(store.get(task.id,true,now)!.reported_execution_state,state);assert.equal(store.get(task.id,true,now)!.blocker?.kind,"input");
    }
  }finally{db.close();}
});

test("dependency and parent cycles roll back atomically; unresolved external relationships are preserved as declarations",()=>{
  const {db,store}=fixture();try {
    store.ingest(report({depends_on_source_task_ids:["task-b"]}),now,"mcp");
    assert.throws(()=>store.ingest(report({source_task_id:"task-b",depends_on_source_task_ids:["task-a"]}),now,"mcp"),/dependency_cycle/);
    assert.equal(store.list(true,now).length,1);assert.equal(store.journal.cursor(),1);
    store.ingest(report({source_task_id:"parent-a",parent_source_task_id:"parent-b"}),now,"mcp");
    assert.throws(()=>store.ingest(report({source_task_id:"parent-b",parent_source_task_id:"parent-a"}),now,"mcp"),/dependency_cycle/);
    assert.throws(()=>store.ingest(report({source_task_id:"self",depends_on_source_task_ids:["self"]}),now,"mcp"),/dependency_cycle/);
  }finally{db.close();}
});

test("durable cursor resumes after reopen, pages receipts in receiver order and bounds recent history",()=>{
  const home=mkdtempSync(join(tmpdir(),"external-cursor-")),file=join(home,"runtime.db");let db=new DatabaseSync(file);
  try {
    let store=new ExternalObservationStore(db);
    for(let sequence=1;sequence<=205;sequence++)store.ingest(report({sequence,version:sequence,event_id:`e-${sequence}`,message:`message-${sequence}`}),now,"mcp");
    const page=store.journal.events(0,100);assert.equal(page.events.length,100);assert.equal(page.has_more,true);
    db.close();db=new DatabaseSync(file);store=new ExternalObservationStore(db);
    const replay=store.journal.events(page.next_cursor,100);assert.equal(replay.events[0].event_id,"e-101");assert.equal(replay.next_cursor,200);
    assert.equal(store.journal.events(replay.next_cursor,100).events.length,5);
    const id=externalTaskId(report() as any);assert.equal(store.messages(id)[0].text,"message-6");assert.equal(store.messages(id).at(-1)!.text,"message-205");
    assert.throws(()=>store.journal.events(-1),/invalid_external_event_cursor/);
  }finally{db.close();rmSync(home,{recursive:true,force:true});}
});

test("legacy history keeps stable IDs and unknown runs; v2 cannot self-verify or create execution ownership",()=>{
  const home=mkdtempSync(join(tmpdir(),"external-boundary-"));const owned=new Store(join(home,"runtime.db"));
  try {
    const store=new ExternalObservationStore(owned.db);
    const legacy={schema_version:1,provider:"codex",account_id:"declared",host_id:"fixture",thread_id:"task-a",sequence:1,item_id:"legacy",reported_at:new Date(now).toISOString(),state:"running",title:"Legacy"};
    const {id}=store.ingest(legacy,now,"mcp");assert.equal(id,externalObservationId(legacy as any));
    assert.equal(store.get(id,true,now)!.source_run_id,null);
    assert.equal(store.ingest(report({event_id:"v2-counter-reset"}),now,"mcp").status,"out_of_order");
    assert.equal(store.get(id,true,now)!.source_run_id,null);
    assert.equal(store.ingest(report({sequence:2,version:2,event_id:"upgraded",creator:{verification:"verified",id:"dot",avatar:"https://signed.example/secret"},acceptance_state:"accepted",agent_enabled:true}),now,"mcp").id,id);
    assert.equal(store.get(id,true,now)!.creator.verification,"unknown");assert.equal(store.get(id,true,now)!.creator.avatar,null);
    assert.throws(()=>store.ingest({...legacy,sequence:3,item_id:"downgrade"},now,"mcp"),/legacy_downgrade_denied/);
    assert.equal(store.journal.runs(id).length,1);assert.equal(store.journal.events().events[0].source_run_id,null);
    assert.doesNotMatch(JSON.stringify(store.get(id,true,now)),/signed.example/);
    for(const table of ["issues","issue_runs","issue_sessions","session_commands"])assert.equal(owned.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n,0);
  }finally{owned.close();rmSync(home,{recursive:true,force:true});}
});

test("concurrent ingestion serializes duplicate admission in the same SQLite transaction",{timeout:20_000},async()=>{
  const home=mkdtempSync(join(tmpdir(),"external-concurrent-")),file=join(home,"runtime.db");const db=new DatabaseSync(file);new ExternalObservationStore(db);db.close();
  const run=promisify(execFile);
  const program=`import {DatabaseSync} from 'node:sqlite';import {ExternalObservationStore} from './src/external-observations.ts';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA busy_timeout=5000');const store=new ExternalObservationStore(db);console.log(store.ingest(JSON.parse(process.argv[2]),${now},'mcp').status);db.close();`;
  try {
    const results=await Promise.all([1,2].map(()=>run(process.execPath,["--import","tsx","--input-type=module","-e",program,file,JSON.stringify(report())])));
    assert.deepEqual(results.map(r=>r.stdout.trim()).sort(),["applied","duplicate"]);
    const read=new DatabaseSync(file);try{assert.equal(read.prepare("SELECT COUNT(*) n FROM external_task_events").get()!.n,1);assert.equal(read.prepare("SELECT COUNT(*) n FROM external_task_runs").get()!.n,1);}finally{read.close();}
  }finally{rmSync(home,{recursive:true,force:true});}
});
