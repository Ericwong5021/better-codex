import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { ExternalObservation, ExternalReport } from "./external-observations.js";
import type { TaskCreatorProfiles } from "./task-creator-profiles.js";

export const externalTaskStates = ["queued", "running", "waiting_user", "waiting_approval", "blocked", "failed", "cancelled", "completed", "idle"] as const;
export type ExternalTaskState = typeof externalTaskStates[number];
export type TaskBlocker = { kind: "dependency" | "input" | "approval" | "execution" | "protocol" | "other"; message: string };
export type TaskSummary = { text: string; evidence: string[] };
export type ExternalTaskReport = {
  schema_version: 2; provider: string; account_id: string; host_id: string; source_task_id: string;
  source_run_id: string | null; run_number: number | null; sequence: number; event_id: string; version: number;
  reported_at: string; event_kind: "snapshot" | "heartbeat" | "worker_exit"; state: ExternalTaskState;
  title: string; description: string; project_id: string | null; thread_id: string | null;
  parent_source_task_id: string | null; depends_on_source_task_ids: string[];
  creator_name: string | null; executor_name: string | null; message: string | null;
  blocker: TaskBlocker | null; summary: TaskSummary | null;
};
export type ExternalEventOutcome = "applied" | "duplicate" | "out_of_order" | "stale_run" | "terminal_run" | "legacy_import";
export type ExternalTaskEvent = { cursor: number; task_id: string; event_id: string; source_run_id: string | null; sequence: number;
  source_version: number | null; kind: string; state: string | null; outcome: ExternalEventOutcome;
  reported_at: string; observed_at: string | null; message: string | null; applied_state: string | null; detail: {blocker:TaskBlocker|null;summary:TaskSummary|null}|null };
export type ExternalTaskRun = { source_run_id: string; run_number: number; state: ExternalTaskState;
  first_reported_at: string; last_reported_at: string; finished_at: string | null; summary: TaskSummary | null; blocker: TaskBlocker | null };
type StoredRun = Omit<ExternalTaskRun,"summary"|"blocker"> & { summary: string | null; blocker: string | null };
type Snapshot = { id: string; payload: string; version: number; sequence: number; source_version: number;
  source_run_id: string | null; run_number: number | null; creator_name: string | null; channel: "mcp" | "local_file"; observed_at: string };
const terminal = new Set<ExternalTaskState>(["completed", "failed", "cancelled"]);
const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]`
  : value && typeof value === "object" ? `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}` : JSON.stringify(value);
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const string = (value: unknown, max: number, nullable = false): string | null => {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== "string" || value.length > max || value.includes("\0") || (!nullable && !value.trim())) throw new Error("invalid_external_task_text");
  return value.trim() || (nullable ? null : "");
};
const positive = (value: unknown) => { if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error("invalid_external_task_number"); return Number(value); };
export function normalizeExternalTaskReport(value: unknown, now = Date.now()): ExternalTaskReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_external_task_report");
  const input = value as Record<string, unknown>;
  if (input.schema_version !== 2 || !externalTaskStates.includes(input.state as ExternalTaskState)) throw new Error("invalid_external_task_state");
  const eventKind = input.event_kind ?? "snapshot";
  if (!["snapshot", "heartbeat", "worker_exit"].includes(String(eventKind))) throw new Error("invalid_external_task_event_kind");
  const sourceRun = string(input.source_run_id, 200, true), runNumber = input.run_number == null ? null : positive(input.run_number);
  if (Boolean(sourceRun) !== Boolean(runNumber) || (!sourceRun && !["queued", "idle", "blocked"].includes(String(input.state)))
    || (!sourceRun && eventKind !== "snapshot")) throw new Error("invalid_external_task_run");
  const reportedAt = string(input.reported_at, 40)!; const time = Date.parse(reportedAt);
  if (!Number.isFinite(time) || time > now + 30_000) throw new Error("invalid_external_task_time");
  const dependencies = input.depends_on_source_task_ids ?? [];
  if (!Array.isArray(dependencies) || dependencies.length > 64) throw new Error("invalid_external_task_dependencies");
  const sourceTask = string(input.source_task_id, 200)!;
  const dependsOn = [...new Set(dependencies.map(item => string(item, 200)!))];
  const parent = string(input.parent_source_task_id, 200, true);
  if (dependsOn.includes(sourceTask) || parent === sourceTask) throw new Error("external_dependency_cycle");
  let blocker: TaskBlocker | null = null, summary: TaskSummary | null = null;
  if (input.blocker != null) {
    const b = input.blocker as Record<string, unknown>;
    if (!b || typeof b !== "object" || !["dependency", "input", "approval", "execution", "protocol", "other"].includes(String(b.kind))) throw new Error("invalid_external_task_blocker");
    blocker = { kind: b.kind as TaskBlocker["kind"], message: string(b.message, 2000)! };
  }
  if (input.summary != null) {
    const s = input.summary as Record<string, unknown>;
    if (!s || typeof s !== "object" || !Array.isArray(s.evidence) || s.evidence.length > 24) throw new Error("invalid_external_task_summary");
    summary = { text: string(s.text, 4000)!, evidence: s.evidence.map(item => string(item, 2000)!) };
  }
  return { schema_version: 2, provider: string(input.provider, 64)!, account_id: string(input.account_id, 160)!, host_id: string(input.host_id, 160)!,
    source_task_id: sourceTask, source_run_id: sourceRun, run_number: runNumber, sequence: positive(input.sequence), event_id: string(input.event_id, 200)!, version: positive(input.version),
    reported_at: new Date(time).toISOString(), event_kind: eventKind as ExternalTaskReport["event_kind"], state: input.state as ExternalTaskState,
    title: string(input.title, 300)!, description: string(input.description, 20_000, true) || "", project_id: string(input.project_id, 200, true), thread_id: string(input.thread_id, 200, true),
    parent_source_task_id: parent, depends_on_source_task_ids: dependsOn, creator_name: string(input.creator_name, 160, true), executor_name: string(input.executor_name, 160, true),
    message: string(input.message, 20_000, true), blocker, summary };
}
export function externalTaskId(identity: Pick<ExternalTaskReport, "provider" | "account_id" | "host_id" | "source_task_id">) {
  return `external-${hash([identity.provider, identity.account_id, identity.host_id, identity.source_task_id])}`;
}

/** Called only by the owning Runtime. Snapshot, run, and immutable receipts share its transaction. */
export class ExternalTaskJournal {
  private transactionCounter = 0;
  constructor(private readonly db: DatabaseSync, private readonly creatorProfiles?: Pick<TaskCreatorProfiles, "resolve">) {
    this.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS external_task_snapshots (
          id TEXT PRIMARY KEY, provider TEXT NOT NULL, account_id TEXT NOT NULL, host_id TEXT NOT NULL, source_task_id TEXT NOT NULL,
          version INTEGER NOT NULL, sequence INTEGER NOT NULL, source_version INTEGER NOT NULL, source_run_id TEXT, run_number INTEGER,
          payload TEXT NOT NULL, creator_name TEXT, channel TEXT NOT NULL, observed_at TEXT NOT NULL,
          UNIQUE(provider,account_id,host_id,source_task_id));
        CREATE TABLE IF NOT EXISTS external_task_runs (
          task_id TEXT NOT NULL, source_run_id TEXT NOT NULL, run_number INTEGER NOT NULL, state TEXT NOT NULL,
          first_reported_at TEXT NOT NULL, last_reported_at TEXT NOT NULL, finished_at TEXT, summary TEXT, blocker TEXT,
          PRIMARY KEY(task_id,source_run_id), UNIQUE(task_id,run_number));
        CREATE TABLE IF NOT EXISTS external_task_events (
          cursor INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL, event_id TEXT NOT NULL, source_run_id TEXT,
          sequence INTEGER NOT NULL, source_version INTEGER, kind TEXT NOT NULL, state TEXT, outcome TEXT NOT NULL,
          reported_at TEXT NOT NULL, observed_at TEXT, message TEXT, fingerprint TEXT NOT NULL, applied_state TEXT, detail TEXT,
          UNIQUE(task_id,event_id));
        CREATE INDEX IF NOT EXISTS external_task_event_history ON external_task_events(task_id,cursor);
        CREATE TABLE IF NOT EXISTS task_journal_migrations (scope TEXT PRIMARY KEY, version INTEGER NOT NULL);
        INSERT OR IGNORE INTO task_journal_migrations(scope,version) VALUES ('external',1);
      `);
      const columns=db.prepare("PRAGMA table_info(external_task_events)").all() as Array<{name:string}>;
      if(!columns.some(row=>row.name==='applied_state'))db.exec("ALTER TABLE external_task_events ADD COLUMN applied_state TEXT");
      if(!columns.some(row=>row.name==='detail'))db.exec("ALTER TABLE external_task_events ADD COLUMN detail TEXT");
      db.exec(`CREATE TRIGGER IF NOT EXISTS external_task_event_immutable_update BEFORE UPDATE ON external_task_events BEGIN SELECT RAISE(ABORT,'task_event_immutable'); END;
        CREATE TRIGGER IF NOT EXISTS external_task_event_immutable_delete BEFORE DELETE ON external_task_events BEGIN SELECT RAISE(ABORT,'task_event_immutable'); END;`);
      // Preserve known old messages without inventing historical runs or receipt timestamps.
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='external_observation_messages'").get()) db.exec(`INSERT OR IGNORE INTO external_task_events(task_id,event_id,sequence,kind,outcome,reported_at,message,fingerprint)
        SELECT observation_id,item_id,sequence,'legacy_import','legacy_import',created_at,text,'legacy-import'
        FROM external_observation_messages ORDER BY rowid`);
    });
  }
  private transaction<T>(operation: () => T): T {
    const nested = this.db.isTransaction, point = `external_task_${++this.transactionCounter}`;
    this.db.exec(nested ? `SAVEPOINT ${point}` : "BEGIN IMMEDIATE");
    try { const result = operation(); this.db.exec(nested ? `RELEASE ${point}` : "COMMIT"); return result; }
    catch (error) { this.db.exec(nested ? `ROLLBACK TO ${point}; RELEASE ${point}` : "ROLLBACK"); throw error; }
  }
  hasTask(id: string) { return Boolean(this.db.prepare("SELECT 1 FROM external_task_snapshots WHERE id=?").get(id)); }
  private receipt(id: string, report: ExternalTaskReport, outcome: ExternalEventOutcome, observedAt: string, snapshot?: ExternalTaskReport) {
    this.db.prepare(`INSERT INTO external_task_events(task_id,event_id,source_run_id,sequence,source_version,kind,state,outcome,reported_at,observed_at,message,fingerprint,applied_state,detail)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, report.event_id, report.source_run_id, report.sequence, report.version, report.event_kind, report.state, outcome,
      report.reported_at, observedAt, report.message, hash(report),snapshot?.state||null,JSON.stringify({blocker:snapshot?.blocker||report.blocker,summary:snapshot?.summary||report.summary}));
  }
  recordLegacy(id: string, report: ExternalReport, now: number) {
    this.db.prepare(`INSERT OR IGNORE INTO external_task_events(task_id,event_id,sequence,kind,state,outcome,reported_at,observed_at,message,fingerprint)
      VALUES (?,?,?,'legacy_report',?,'applied',?,?,?,?)`).run(id, report.item_id, report.sequence, report.state, report.reported_at, new Date(now).toISOString(), report.message, hash(report));
  }
  private checkCycles(report: ExternalTaskReport) {
    const rows = this.db.prepare("SELECT payload FROM external_task_snapshots WHERE provider=? AND account_id=? AND host_id=?")
      .all(report.provider, report.account_id, report.host_id) as Array<{payload:string}>;
    const records = new Map(rows.map(row => { const value = JSON.parse(row.payload) as ExternalTaskReport; return [value.source_task_id,value]; }));
    records.set(report.source_task_id, report);
    const check = (edges: (item: ExternalTaskReport) => string[]) => {
      const path = new Set<string>(), done = new Set<string>();
      const visit = (id: string) => { if (path.has(id)) throw new Error("external_dependency_cycle"); if (done.has(id)) return;
        path.add(id); const item = records.get(id); if (item) for (const dependency of edges(item)) visit(dependency); path.delete(id); done.add(id); };
      visit(report.source_task_id);
    };
    check(item => item.depends_on_source_task_ids); check(item => item.parent_source_task_id ? [item.parent_source_task_id] : []);
  }
  ingest(value: unknown, now: number, channel: "mcp" | "local_file") {
    const report = normalizeExternalTaskReport(value, now), id = externalTaskId(report), observedAt = new Date(now).toISOString();
    return this.transaction(() => {
      const seen = this.db.prepare("SELECT fingerprint,outcome FROM external_task_events WHERE task_id=? AND event_id=?").get(id, report.event_id) as {fingerprint:string;outcome:string} | undefined;
      if (seen) { if (seen.fingerprint !== hash(report)) throw new Error("external_event_conflict"); return {status:"duplicate" as const,id}; }
      const previous = this.db.prepare("SELECT * FROM external_task_snapshots WHERE id=?").get(id) as Snapshot | undefined;
      const legacy = !previous && this.db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='external_observations'").get()
        ? this.db.prepare("SELECT sequence,payload FROM external_observations WHERE id=?").get(id) as {sequence:number;payload:string}|undefined : undefined;
      let outcome: ExternalEventOutcome = "applied";
      const run = report.source_run_id ? this.db.prepare("SELECT * FROM external_task_runs WHERE task_id=? AND source_run_id=?").get(id,report.source_run_id) as StoredRun | undefined : undefined;
      if (run && run.run_number !== report.run_number) throw new Error("external_run_identity_conflict");
      if (report.run_number != null && this.db.prepare("SELECT 1 FROM external_task_runs WHERE task_id=? AND run_number=? AND source_run_id!=?").get(id,report.run_number,report.source_run_id)) throw new Error("external_run_identity_conflict");
      if (previous && ((previous.run_number != null && (report.run_number == null || report.run_number < previous.run_number))
        || (previous.run_number === report.run_number && previous.source_run_id !== report.source_run_id))) outcome = "stale_run";
      else if ((previous && (report.sequence <= previous.sequence || report.version < previous.source_version)) || (legacy && report.sequence <= legacy.sequence)) outcome = "out_of_order";
      else if (run && terminal.has(run.state) && report.state !== run.state) outcome = "terminal_run";
      if (outcome !== "applied") { this.receipt(id,report,outcome,observedAt); return {status:outcome,id}; }
      if (report.event_kind === "heartbeat" && (!run || report.state !== run.state)) throw new Error("external_heartbeat_state_conflict");
      if (report.project_id && !this.db.prepare("SELECT 1 FROM projects WHERE id=?").get(report.project_id)) throw new Error("external_project_not_found");
      this.checkCycles(report);
      // A process exiting without a protocol terminal event is blocked, never completed or restarted.
      const protocolExit = report.event_kind === "worker_exit" && (!run || ["running","queued","idle"].includes(run.state));
      const state = protocolExit ? "blocked" : report.event_kind === "worker_exit" && run ? run.state : report.state;
      const blocker = protocolExit ? {kind:"protocol" as const,message:"执行进程退出，但未上报完成、失败、取消或等待协议事件；需要来源系统确认。"}
        : report.event_kind === "worker_exit" && run?.blocker ? JSON.parse(run.blocker) as TaskBlocker : report.blocker;
      const summary = report.summary || (run?.summary ? JSON.parse(run.summary) as TaskSummary : null);
      const snapshot = {...report,state,blocker,summary};
      const legacyCreator=legacy?JSON.parse(legacy.payload) as {creator_name:string|null;_creator_name?:string|null}:undefined;
      const creator = previous ? previous.creator_name : legacyCreator ? ("_creator_name" in legacyCreator ? legacyCreator._creator_name ?? null : legacyCreator.creator_name) : report.creator_name;
      this.db.prepare(`INSERT INTO external_task_snapshots(id,provider,account_id,host_id,source_task_id,version,sequence,source_version,source_run_id,run_number,payload,creator_name,channel,observed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,sequence=excluded.sequence,source_version=excluded.source_version,
        source_run_id=excluded.source_run_id,run_number=excluded.run_number,payload=excluded.payload,channel=excluded.channel,observed_at=excluded.observed_at`)
        .run(id,report.provider,report.account_id,report.host_id,report.source_task_id,(previous?.version || 0)+1,report.sequence,report.version,report.source_run_id,report.run_number,JSON.stringify(snapshot),creator,channel,observedAt);
      if (report.source_run_id) this.db.prepare(`INSERT INTO external_task_runs(task_id,source_run_id,run_number,state,first_reported_at,last_reported_at,finished_at,summary,blocker)
        VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(task_id,source_run_id) DO UPDATE SET state=excluded.state,last_reported_at=excluded.last_reported_at,
        finished_at=COALESCE(external_task_runs.finished_at,excluded.finished_at),summary=COALESCE(excluded.summary,external_task_runs.summary),blocker=excluded.blocker`)
        .run(id,report.source_run_id,report.run_number,state,report.reported_at,report.reported_at,terminal.has(state) ? report.reported_at : null,report.summary ? JSON.stringify(report.summary) : null,blocker ? JSON.stringify(blocker) : null);
      this.receipt(id,report,"applied",observedAt,snapshot);
      return {status:"applied" as const,id};
    });
  }
  private project(row: Snapshot, connectivity: {local_file:boolean;mcp:boolean}, now: number): ExternalObservation {
    const report = JSON.parse(row.payload) as ExternalTaskReport;
    const freshness = !connectivity[row.channel] ? "disconnected" : now-Date.parse(report.reported_at)>=30_000 ? "stale" : "fresh";
    const execution = report.state === "completed" ? "idle" : report.state;
    return {id:row.id,provider:report.provider,account_id:report.account_id,host_id:report.host_id,thread_id:report.thread_id,
      source_task_id:report.source_task_id,source_run_id:report.source_run_id,run_number:report.run_number,source_version:row.source_version,version:row.version,
      parent_source_task_id:report.parent_source_task_id,depends_on_source_task_ids:report.depends_on_source_task_ids,
      title:report.title,description:report.description,project_id:report.project_id,parent_thread_id:null,
      execution_state:freshness==="fresh"?execution:"unknown",reported_execution_state:execution,task_result:report.state==="completed"?"reported_complete":"unknown",acceptance_state:"unknown",freshness,
      reported_at:report.reported_at,observed_at:row.observed_at,updated_at:row.observed_at,sequence:row.sequence,source:{kind:"task_reporter",attribution:"declared",channel:row.channel},
      creator:{name:row.creator_name,verification:"unknown",avatar:null,...this.creatorProfiles?.resolve(report)},executor:{name:report.executor_name,verification:"unknown"},declared_creator_name:report.creator_name,
      blocker:report.blocker,summary:report.summary,history_cursor:this.cursor(row.id)};
  }
  list(connectivity: {local_file:boolean;mcp:boolean}, now: number) { return (this.db.prepare("SELECT * FROM external_task_snapshots ORDER BY observed_at DESC,id").all() as Snapshot[]).map(row=>this.project(row,connectivity,now)); }
  get(id: string, connectivity: {local_file:boolean;mcp:boolean}, now: number) { const row=this.db.prepare("SELECT * FROM external_task_snapshots WHERE id=?").get(id) as Snapshot | undefined; return row ? this.project(row,connectivity,now) : null; }
  runs(id: string): ExternalTaskRun[] { return (this.db.prepare("SELECT source_run_id,run_number,state,first_reported_at,last_reported_at,finished_at,summary,blocker FROM external_task_runs WHERE task_id=? ORDER BY run_number DESC LIMIT 100").all(id) as any[]).map(row=>({...row,summary:row.summary?JSON.parse(row.summary):null,blocker:row.blocker?JSON.parse(row.blocker):null})); }
  cursor(id?: string) { return Number((this.db.prepare(`SELECT COALESCE(MAX(cursor),0) n FROM external_task_events${id?" WHERE task_id=?":""}`).get(...(id?[id]:[])) as {n:number}).n); }
  private eventRow(row: Omit<ExternalTaskEvent,"detail"> & {detail:string|null}): ExternalTaskEvent { return {...row,detail:row.detail?JSON.parse(row.detail):null}; }
  recentEvents(id: string, limit=200): ExternalTaskEvent[] {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("invalid_external_event_limit");
    return (this.db.prepare("SELECT cursor,task_id,event_id,source_run_id,sequence,source_version,kind,state,outcome,reported_at,observed_at,message,applied_state,detail FROM external_task_events WHERE task_id=? ORDER BY cursor DESC LIMIT ?")
      .all(id,Math.min(200,limit)) as Array<Omit<ExternalTaskEvent,"detail"> & {detail:string|null}>).reverse().map(row=>this.eventRow(row));
  }
  events(after=0,limit=200,id?: string): {events:ExternalTaskEvent[];next_cursor:number;has_more:boolean} {
    if (!Number.isSafeInteger(after)||after<0||!Number.isInteger(limit)||limit<1||limit>200) throw new Error("invalid_external_event_cursor");
    const rows=this.db.prepare(`SELECT cursor,task_id,event_id,source_run_id,sequence,source_version,kind,state,outcome,reported_at,observed_at,message,applied_state,detail FROM external_task_events WHERE cursor>?${id?" AND task_id=?":""} ORDER BY cursor LIMIT ?`).all(after,...(id?[id]:[]),limit+1) as Array<Omit<ExternalTaskEvent,"detail"> & {detail:string|null}>;
    const events=rows.slice(0,limit).map(row=>this.eventRow(row)); return {events,next_cursor:events.at(-1)?.cursor ?? after,has_more:rows.length>limit};
  }
}
