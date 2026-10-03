import type { DatabaseSync } from "node:sqlite";
import type { TaskBlocker, TaskSummary } from "./external-task-journal.js";

export type IssueRelationships = { parent_issue_id: string | null; depends_on_issue_ids: string[] };
export type IssueTaskHistory = {
  task_id: string; acceptance_state:"accepted"|"unknown"; creator: {source:"runtime_user_context"|"unknown";user_id:string|null};
  relationships: IssueRelationships; blocker: TaskBlocker | null;
  dependencies: Array<{id:string;identifier:string|null;status:string;accepted:boolean}>;
  runs: Array<{id:string;run_number:number;state:string;thread_id:string|null;turn_id:string|null;started_at:string;finished_at:string|null;summary:TaskSummary|null;blocker:TaskBlocker|null}>;
  events: Array<{cursor:number;event_id:string;run_id:string|null;kind:string;observed_at:string;payload:Record<string,unknown>}>;
  next_cursor:number;has_more:boolean;
};

/** Additive schema; the Runtime remains the only writer and existing issue_runs remain canonical. */
export class IssueTaskJournal {
  constructor(private readonly db: DatabaseSync) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS issue_task_relationships (issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,parent_issue_id TEXT);
      CREATE TABLE IF NOT EXISTS issue_dependencies (issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,depends_on_issue_id TEXT NOT NULL,PRIMARY KEY(issue_id,depends_on_issue_id));
      CREATE TABLE IF NOT EXISTS issue_task_events (
        cursor INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,issue_id TEXT NOT NULL,run_id TEXT,kind TEXT NOT NULL,observed_at TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS issue_task_event_history ON issue_task_events(issue_id,cursor);
      CREATE TABLE IF NOT EXISTS task_journal_migrations (scope TEXT PRIMARY KEY,version INTEGER NOT NULL);
      INSERT OR IGNORE INTO task_journal_migrations(scope,version) VALUES('owned',1);
      CREATE TRIGGER IF NOT EXISTS issue_task_created AFTER INSERT ON issues BEGIN
        INSERT INTO issue_task_events(event_id,issue_id,kind,observed_at,payload)
        VALUES(lower(hex(randomblob(16))),NEW.id,'task_created',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('status',NEW.status,'version',NEW.version,'creator_user_id',NEW.creator_user_id));
      END;
      CREATE TRIGGER IF NOT EXISTS issue_task_changed AFTER UPDATE ON issues WHEN NEW.version != OLD.version BEGIN
        INSERT INTO issue_task_events(event_id,issue_id,kind,observed_at,payload)
        VALUES(lower(hex(randomblob(16))),NEW.id,'task_changed',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('status',NEW.status,'previous_status',OLD.status,'version',NEW.version,'pending_actor',NEW.pending_actor));
      END;
      CREATE TRIGGER IF NOT EXISTS issue_task_deleted AFTER DELETE ON issues BEGIN
        INSERT INTO issue_task_events(event_id,issue_id,kind,observed_at,payload)
        VALUES(lower(hex(randomblob(16))),OLD.id,'task_deleted',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('version',OLD.version));
      END;
      CREATE TRIGGER IF NOT EXISTS issue_run_dependency_guard BEFORE INSERT ON issue_runs
      WHEN NEW.status='claimed' AND EXISTS(
        SELECT 1 FROM issue_dependencies d LEFT JOIN issues prerequisite ON prerequisite.id=d.depends_on_issue_id
        WHERE d.issue_id=NEW.issue_id AND (prerequisite.id IS NULL OR prerequisite.status!='done'))
      BEGIN SELECT RAISE(ABORT,'issue_dependencies_blocked'); END;
      CREATE TRIGGER IF NOT EXISTS issue_task_run_created AFTER INSERT ON issue_runs BEGIN
        INSERT INTO issue_task_events(event_id,issue_id,run_id,kind,observed_at,payload)
        VALUES(lower(hex(randomblob(16))),NEW.issue_id,NEW.id,'run_created',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('state',NEW.status,'thread_id',NEW.thread_id,'turn_id',NEW.turn_id));
      END;
      CREATE TRIGGER IF NOT EXISTS issue_task_run_changed AFTER UPDATE ON issue_runs
      WHEN NEW.status IS NOT OLD.status OR NEW.scheduler_status IS NOT OLD.scheduler_status OR NEW.thread_id IS NOT OLD.thread_id OR NEW.turn_id IS NOT OLD.turn_id OR NEW.execution_result IS NOT OLD.execution_result OR NEW.error IS NOT OLD.error BEGIN
        INSERT INTO issue_task_events(event_id,issue_id,run_id,kind,observed_at,payload)
        VALUES(lower(hex(randomblob(16))),NEW.issue_id,NEW.id,'run_changed',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('state',NEW.status,'previous_state',OLD.status,'scheduler_status',NEW.scheduler_status,'error',NEW.error,'is_current_run',NEW.id=(SELECT id FROM issue_runs WHERE issue_id=NEW.issue_id ORDER BY rowid DESC LIMIT 1)));
      END;
      CREATE TRIGGER IF NOT EXISTS issue_task_event_immutable_update BEFORE UPDATE ON issue_task_events BEGIN SELECT RAISE(ABORT,'task_event_immutable'); END;
      CREATE TRIGGER IF NOT EXISTS issue_task_event_immutable_delete BEFORE DELETE ON issue_task_events BEGIN SELECT RAISE(ABORT,'task_event_immutable'); END;
    `);
  }
  relationships(id: string): IssueRelationships {
    const row=this.db.prepare("SELECT parent_issue_id FROM issue_task_relationships WHERE issue_id=?").get(id) as {parent_issue_id:string|null}|undefined;
    const deps=this.db.prepare("SELECT depends_on_issue_id FROM issue_dependencies WHERE issue_id=? ORDER BY depends_on_issue_id").all(id) as Array<{depends_on_issue_id:string}>;
    return {parent_issue_id:row?.parent_issue_id||null,depends_on_issue_ids:deps.map(row=>row.depends_on_issue_id)};
  }
  private dependencies(id: string) {
    return (this.db.prepare(`SELECT d.depends_on_issue_id id,p.identifier,COALESCE(p.status,'missing') status FROM issue_dependencies d
      LEFT JOIN issues p ON p.id=d.depends_on_issue_id WHERE d.issue_id=? ORDER BY d.depends_on_issue_id`).all(id) as Array<{id:string;identifier:string|null;status:string}>)
      .map(row=>({...row,accepted:row.status==='done'}));
  }
  blocker(id: string): TaskBlocker|null {
    const unmet=this.dependencies(id).filter(row=>!row.accepted);
    return unmet.length ? {kind:"dependency",message:`等待依赖任务人工验收：${unmet.map(row=>row.identifier||row.id).join("、")}`} : null;
  }
  setRelationships(id: string,patch: Partial<IssueRelationships>,projectId: string) {
    if (!this.db.isTransaction) throw new Error("issue_relationship_transaction_required");
    const previous=this.relationships(id),parent=patch.parent_issue_id===undefined?previous.parent_issue_id:patch.parent_issue_id;
    const dependencies=patch.depends_on_issue_ids===undefined?previous.depends_on_issue_ids:patch.depends_on_issue_ids;
    if (parent!==null && (typeof parent!=="string"||!parent||parent.length>200||parent.includes("\0"))) throw new Error("invalid_issue_relationship");
    if (!Array.isArray(dependencies)||dependencies.length>64||dependencies.some(value=>typeof value!=="string"||!value||value.length>200||value.includes("\0"))) throw new Error("invalid_issue_relationship");
    const unique=[...new Set(dependencies)].sort();
    for(const referenced of [...unique,...(parent?[parent]:[])]) {
      if(referenced===id) throw new Error("issue_dependency_cycle");
      const row=this.db.prepare("SELECT project_id FROM issues WHERE id=?").get(referenced) as {project_id:string}|undefined;
      if(!row) throw new Error("issue_dependency_not_found");
      if(row.project_id!==projectId) throw new Error("issue_dependency_project_conflict");
    }
    // Project changes must also preserve the validity of incoming relationships.
    const incoming=this.db.prepare(`SELECT i.project_id FROM issues i WHERE i.id IN (
      SELECT issue_id FROM issue_dependencies WHERE depends_on_issue_id=? UNION SELECT issue_id FROM issue_task_relationships WHERE parent_issue_id=?)`).all(id,id) as Array<{project_id:string}>;
    if(incoming.some(row=>row.project_id!==projectId)) throw new Error("issue_dependency_project_conflict");
    const check=(edges:(key:string)=>string[])=>{const visiting=new Set<string>(),done=new Set<string>();
      const visit=(key:string)=>{if(visiting.has(key))throw new Error("issue_dependency_cycle");if(done.has(key))return;visiting.add(key);for(const next of edges(key))visit(next);visiting.delete(key);done.add(key);};visit(id);};
    check(key=>key===id?unique:this.relationships(key).depends_on_issue_ids);
    check(key=>{const next=key===id?parent:this.relationships(key).parent_issue_id;return next?[next]:[];});
    if(parent===previous.parent_issue_id && JSON.stringify(unique)===JSON.stringify(previous.depends_on_issue_ids))return;
    this.db.prepare("INSERT INTO issue_task_relationships(issue_id,parent_issue_id) VALUES (?,?) ON CONFLICT(issue_id) DO UPDATE SET parent_issue_id=excluded.parent_issue_id").run(id,parent);
    this.db.prepare("DELETE FROM issue_dependencies WHERE issue_id=?").run(id);
    for(const dependency of unique)this.db.prepare("INSERT INTO issue_dependencies(issue_id,depends_on_issue_id) VALUES (?,?)").run(id,dependency);
    this.db.prepare(`INSERT INTO issue_task_events(event_id,issue_id,kind,observed_at,payload) VALUES(lower(hex(randomblob(16))),?,'relationships_changed',strftime('%Y-%m-%dT%H:%M:%fZ','now'),?)`)
      .run(id,JSON.stringify({parent_issue_id:parent,depends_on_issue_ids:unique}));
  }
  history(id: string,after=0,limit=100): IssueTaskHistory {
    if(!Number.isSafeInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>200)throw new Error("invalid_task_history_cursor");
    const issue=this.db.prepare("SELECT creator_user_id,status FROM issues WHERE id=?").get(id) as {creator_user_id:string|null;status:string}|undefined;
    if(!issue)throw new Error("issue_not_found");
    const rows=this.db.prepare("SELECT cursor,event_id,run_id,kind,observed_at,payload FROM issue_task_events WHERE issue_id=? AND cursor>? ORDER BY cursor LIMIT ?").all(id,after,limit+1) as Array<{cursor:number;event_id:string;run_id:string|null;kind:string;observed_at:string;payload:string}>;
    const events=rows.slice(0,limit).map(row=>({...row,payload:JSON.parse(row.payload)}));
    const runs=(this.db.prepare(`SELECT r.id,r.status,r.thread_id,r.turn_id,r.started_at,r.finished_at,r.execution_result,r.execution_error,r.error,r.scheduler_error,
      (SELECT COUNT(*) FROM issue_runs previous WHERE previous.issue_id=r.issue_id AND previous.rowid<=r.rowid) run_number FROM issue_runs r WHERE r.issue_id=? ORDER BY r.rowid DESC LIMIT 100`)
      .all(id) as Array<any>).map(row=>({id:String(row.id),run_number:Number(row.run_number),state:String(row.status),thread_id:row.thread_id,turn_id:row.turn_id,started_at:row.started_at,finished_at:row.finished_at,
        summary:row.execution_result?{text:String(row.execution_result).slice(0,4000),evidence:[]}:null,
        blocker:row.execution_error||row.error||row.scheduler_error?{kind:"execution" as const,message:String(row.execution_error||row.error||row.scheduler_error).slice(0,2000)}:null}));
    return {task_id:id,acceptance_state:issue.status==='done'?'accepted':'unknown',creator:{source:issue.creator_user_id?"runtime_user_context":"unknown",user_id:issue.creator_user_id},relationships:this.relationships(id),blocker:this.blocker(id),dependencies:this.dependencies(id),runs,events,next_cursor:events.at(-1)?.cursor??after,has_more:rows.length>limit};
  }
}
