import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Store } from "../src/db.js";

const fixture=()=>{const home=mkdtempSync(join(tmpdir(),"owned-task-journal-")),file=join(home,"runtime.db"),store=new Store(file);
  const project=store.ensureProject({externalId:"test",name:"Tests",workspacePath:home});
  return {home,file,store,project,close:()=>{store.close();rmSync(home,{recursive:true,force:true});}};};

test("explicit dependencies block manual and automatic claims until human acceptance, not completion or failure",()=>{
  const f=fixture();try {
    const parent=f.store.createIssue({projectId:f.project.id,title:"Prerequisite",agentEnabled:false});
    const child=f.store.createIssue({projectId:f.project.id,title:"Dependent",agentEnabled:true,parentIssueId:parent.id,dependsOnIssueIds:[parent.id]});
    assert.equal(f.store.isDispatchable(child),false);assert.equal(f.store.claimNextIssue(child.id),null);
    for(const status of ["blocked","in_review"] as const){const current=f.store.getIssue(parent.id)!;f.store.updateIssue(parent.id,current.version,{status});assert.equal(f.store.claimNextIssue(child.id),null);}
    const before=f.store.getIssue(parent.id)!;f.store.updateIssue(parent.id,before.version,{status:"done"});
    assert.equal(f.store.isDispatchable(f.store.getIssue(child.id)!),true);
    assert.equal(f.store.claimNextIssue(child.id)!.issue.id,child.id);assert.equal(f.store.claimNextIssue(child.id),null);
    assert.equal(f.store.taskJournal.history(child.id).dependencies[0].accepted,true);
  }finally{f.close();}
});

test("missing prerequisites remain blocked; legacy SQL admission is guarded and cannot bypass dependencies",()=>{
  const f=fixture();try{
    const parent=f.store.createIssue({projectId:f.project.id,title:"Parent"});
    const child=f.store.createIssue({projectId:f.project.id,title:"Child",agentEnabled:true,dependsOnIssueIds:[parent.id]});
    assert.throws(()=>f.store.db.prepare("INSERT INTO issue_runs(id,issue_id,status,started_at) VALUES ('bypass',?,'claimed',?)").run(child.id,new Date().toISOString()),/issue_dependencies_blocked/);
    f.store.db.prepare("DELETE FROM issues WHERE id=?").run(parent.id);
    assert.equal(f.store.taskJournal.history(child.id).dependencies[0].status,"missing");
    assert.equal(f.store.claimNextIssue(child.id),null);
    f.store.updateIssue(child.id,f.store.getIssue(child.id)!.version,{depends_on_issue_ids:[]});
    assert.ok(f.store.claimNextIssue(child.id));
  }finally{f.close();}
});

test("relationship cycles, invalid projects and stale versions roll back task content, edges and events together",()=>{
  const f=fixture();try{
    const a=f.store.createIssue({projectId:f.project.id,title:"A"}),b=f.store.createIssue({projectId:f.project.id,title:"B",dependsOnIssueIds:[a.id],parentIssueId:a.id});
    const cursor=f.store.taskJournal.history(a.id).next_cursor;
    for(const patch of [{depends_on_issue_ids:[b.id]},{parent_issue_id:b.id}])assert.throws(()=>f.store.updateIssue(a.id,a.version,{...patch,title:"Should rollback"}),/dependency_cycle/);
    assert.equal(f.store.getIssue(a.id)!.title,"A");assert.equal(f.store.taskJournal.history(a.id).next_cursor,cursor);
    assert.throws(()=>f.store.updateIssue(b.id,b.version+1,{depends_on_issue_ids:[]}),/version_conflict/);
    const other=f.store.ensureProject({externalId:"other",name:"Other",workspacePath:f.home});
    assert.throws(()=>f.store.updateIssue(a.id,a.version,{project_id:other.id}),/dependency_project_conflict/);
    assert.throws(()=>f.store.createIssue({projectId:f.project.id,title:"Bad",dependsOnIssueIds:["missing"]}),/dependency_not_found/);
    assert.equal(f.store.listIssues().length,2);
  }finally{f.close();}
});

test("late scheduler, failure and interruption update old run history but never overwrite a newer attempt",()=>{
  for(const method of ["scheduler","finish","interrupt"]){const f=fixture();try{
    const issue=f.store.createIssue({projectId:f.project.id,title:"Attempts",agentEnabled:true});
    const a=f.store.claimNextIssue(issue.id)!;f.store.startRun(a.runId,1);
    if(method==="scheduler")f.store.beginScheduling(a.runId,issue.id,true);
    f.store.db.prepare("INSERT INTO issue_runs(id,issue_id,status,started_at) VALUES ('new-attempt',?,'completed',?)").run(issue.id,new Date().toISOString());
    const current=f.store.updateIssue(issue.id,f.store.getIssue(issue.id)!.version,{status:"todo",pending_actor:"agent",needs_attention:true});
    if(method==="scheduler")assert.equal(f.store.finalizeScheduler(a.runId,issue.id,true,{status:"done",reason:"Late",evidence:[]}),"todo");
    else if(method==="finish")f.store.finishRun(a.runId,issue.id,false,"Late failure");
    else f.store.interruptRun(a.runId,issue.id);
    assert.equal(f.store.getIssue(issue.id)!.version,current.version);assert.equal(f.store.getIssue(issue.id)!.status,"todo");
    const history=f.store.taskJournal.history(issue.id);assert.equal(history.runs.length,2);assert.equal(history.runs[0].id,"new-attempt");
    const receipt=history.events.filter(event=>event.run_id===a.runId&&event.kind==="run_changed").at(-1)!;
    assert.equal(receipt.payload.is_current_run,0);
  }finally{f.close();}}
});

test("failure and cancellation are recorded, explicit retry has another Run; repeated finish is idempotent",()=>{
  const f=fixture();try{
    const issue=f.store.createIssue({projectId:f.project.id,title:"Retry",agentEnabled:true,creatorUserId:"persisted-runtime-user"});
    const a=f.store.claimNextIssue(issue.id)!;f.store.finishRun(a.runId,issue.id,false,"Failed source");
    const first=f.store.taskJournal.history(issue.id);assert.equal(first.runs[0].blocker?.kind,"execution");assert.equal(f.store.getIssue(issue.id)!.status,"blocked");
    f.store.finishRun(a.runId,issue.id,false,"Duplicate failure");assert.equal(f.store.taskJournal.history(issue.id).next_cursor,first.next_cursor);
    f.store.updateIssue(issue.id,f.store.getIssue(issue.id)!.version,{status:"todo",needs_attention:true,pending_actor:"agent"});
    const b=f.store.claimNextIssue(issue.id)!;assert.notEqual(a.runId,b.runId);f.store.interruptRun(b.runId,issue.id);
    const history=f.store.taskJournal.history(issue.id);assert.equal(history.runs[0].state,"interrupted");assert.equal(history.runs[0].run_number,2);
    assert.deepEqual(history.creator,{source:"runtime_user_context",user_id:"persisted-runtime-user"});
    assert.throws(()=>f.store.db.prepare("DELETE FROM issue_task_events WHERE issue_id=?").run(issue.id),/task_event_immutable/);
  }finally{f.close();}
});

test("owned event cursor and unknown historical creators survive reopening without inventing runs",()=>{
  const f=fixture();try{
    const issue=f.store.createIssue({projectId:f.project.id,title:"Persisted"});const first=f.store.taskJournal.history(issue.id);
    f.store.updateIssue(issue.id,issue.version,{priority:"urgent"});
    f.store.close();const reopened=new Store(f.file);try{
      const replay=reopened.taskJournal.history(issue.id,first.next_cursor,1);assert.equal(replay.events.length,1);assert.ok(replay.events[0].cursor>first.next_cursor);
      assert.deepEqual(replay.creator,{source:"unknown",user_id:null});assert.deepEqual(replay.runs,[]);
      assert.equal(reopened.db.prepare("SELECT MAX(version) n FROM schema_migrations").get()!.n,25,"feature schema is additive for code rollback");
    }finally{reopened.close();}
  }finally{rmSync(f.home,{recursive:true,force:true});}
});

test("simultaneous workers can claim a queued task once; duplicate create has one task and one creation event",{timeout:20_000},async()=>{
  const f=fixture();const task=f.store.createIssueRequest({projectId:f.project.id,title:"Concurrent",agentEnabled:true},"owned-create-unique");
  assert.equal(f.store.createIssueRequest({projectId:f.project.id,title:"Concurrent",agentEnabled:true},"owned-create-unique").issue.id,task.issue.id);
  assert.equal(f.store.taskJournal.history(task.issue.id).events.filter(event=>event.kind==="task_created").length,1);
  f.store.close();const execute=promisify(execFile);
  const script="import {Store} from './src/db.ts';const store=new Store(process.argv[1]);console.log(store.claimNextIssue(process.argv[2])?'claimed':'empty');store.close();";
  try{
    const result=await Promise.all([1,2].map(()=>execute(process.execPath,["--import","tsx","--input-type=module","-e",script,f.file,task.issue.id])));
    assert.deepEqual(result.map(r=>r.stdout.trim()).sort(),["claimed","empty"]);
    const read=new Store(f.file);try{assert.equal(read.taskJournal.history(task.issue.id).runs.length,1);}finally{read.close();}
  }finally{rmSync(f.home,{recursive:true,force:true});}
});
