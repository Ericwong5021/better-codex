import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { TaskCreatorProfiles } from "./task-creator-profiles.js";
import { ExternalTaskJournal, type ExternalEventOutcome, type TaskBlocker, type TaskSummary } from "./external-task-journal.js";

export const externalFreshnessTtlMs = 30_000;
export type ExternalExecutionState = "queued" | "running" | "waiting_user" | "waiting_approval" | "blocked" | "failed" | "cancelled" | "idle" | "unknown";
export type ExternalReportState = "running" | "waiting_user" | "waiting_approval" | "failed" | "idle" | "completed";
export type ExternalObservation = {
  id: string;
  provider: string;
  account_id: string;
  host_id: string;
  thread_id: string | null;
  title: string;
  description: string;
  project_id: string | null;
  parent_thread_id: string | null;
  execution_state: ExternalExecutionState;
  reported_execution_state: ExternalExecutionState;
  task_result: "unknown" | "reported_complete";
  acceptance_state: "unknown";
  freshness: "fresh" | "stale" | "disconnected";
  reported_at: string;
  observed_at: string;
  updated_at: string;
  sequence: number;
  source: { kind: "task_reporter"; attribution: "declared"; channel?: "local_file" | "mcp" };
  creator: { name: string | null; verification: "unknown"; avatar: null; local_profile_id?: string; display_source?: "user_mapping" };
  executor?: { name: string | null; verification: "unknown" };
  declared_creator_name?: string | null;
  source_task_id?: string; source_run_id?: string | null; run_number?: number | null; source_version?: number; version?: number;
  parent_source_task_id?: string | null; depends_on_source_task_ids?: string[];
  blocker?: TaskBlocker | null; summary?: TaskSummary | null; history_cursor?: number;
};
export type ExternalObservationMessage = { item_id: string; sequence: number; role: "agent" | "system"; text: string; created_at: string };
export type ExternalObservationCapability = {
  enabled: boolean;
  connected: boolean;
  mode: "opt_in_reporter" | "mcp_reporting" | "mixed";
  poll_interval_ms: number;
  freshness_ttl_ms: number;
  last_poll_at: string | null;
  error: string | null;
  rejected_reports: number;
};
export type ExternalReport = {
  schema_version: 1;
  provider: string;
  account_id: string;
  host_id: string;
  thread_id: string;
  sequence: number;
  item_id: string;
  reported_at: string;
  state: ExternalReportState;
  title: string;
  description: string;
  project_id: string | null;
  parent_thread_id: string | null;
  creator_name: string | null;
  executor_name?: string | null;
  message: string | null;
};

function text(value: unknown, name: string, max: number, optional = false): string {
  if (optional && (value === undefined || value === null)) return "";
  if (typeof value !== "string" || value.length > max || value.includes("\0") || (!optional && !value.trim())) throw new Error(`invalid_external_${name}`);
  return value.trim();
}

/** Explicit whitelist. Caller-supplied verification, avatars and execution ownership never survive. */
export function normalizeExternalReport(value: unknown, now = Date.now()): ExternalReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_external_report");
  const input = value as Record<string, unknown>;
  const sequence = input.sequence;
  if (input.schema_version !== 1 || !Number.isSafeInteger(sequence) || Number(sequence) < 1) throw new Error("invalid_external_report_version");
  const state = input.state;
  if (!["running", "waiting_user", "waiting_approval", "failed", "completed", "idle"].includes(String(state))) throw new Error("invalid_external_report_state");
  const reportedAt = text(input.reported_at, "reported_at", 40);
  const timestamp = Date.parse(reportedAt);
  if (!Number.isFinite(timestamp) || timestamp > now + 30_000) throw new Error("invalid_external_report_time");
  return {
    schema_version: 1,
    provider: text(input.provider, "provider", 64), account_id: text(input.account_id, "account_id", 160),
    host_id: text(input.host_id, "host_id", 160), thread_id: text(input.thread_id, "thread_id", 200),
    sequence: Number(sequence), item_id: text(input.item_id, "item_id", 200), reported_at: new Date(timestamp).toISOString(),
    state: state as ExternalReportState, title: text(input.title, "title", 300),
    description: text(input.description, "description", 20_000, true),
    project_id: text(input.project_id, "project_id", 200, true) || null,
    parent_thread_id: text(input.parent_thread_id, "parent_thread_id", 200, true) || null,
    creator_name: text(input.creator_name, "creator_name", 160, true) || null,
    executor_name: text(input.executor_name, "executor_name", 160, true) || null,
    message: text(input.message, "message", 20_000, true) || null,
  };
}

export function externalObservationId(identity: Pick<ExternalReport, "provider" | "account_id" | "host_id" | "thread_id">) {
  return `external-${createHash("sha256").update(JSON.stringify([identity.provider, identity.account_id, identity.host_id, identity.thread_id])).digest("hex")}`;
}

export function externalReportFileName(report: ExternalReport) {
  return `${externalObservationId(report)}.${String(report.sequence).padStart(16, "0")}.${createHash("sha256").update(report.item_id).digest("hex")}.json`;
}

type ObservationRow = { id: string; sequence: number; payload: string; observed_at: string };
type ExternalConnectivity = boolean | { local_file: boolean; mcp: boolean };

/** Uses the Runtime's existing SQLite connection; never owns or schedules an Issue. */
export class ExternalObservationStore {
  private savepoint = 0;
  readonly journal: ExternalTaskJournal;
  constructor(private readonly db: DatabaseSync, private readonly creatorProfiles?: Pick<TaskCreatorProfiles, "resolve">) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS external_observations (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        account_id TEXT NOT NULL,
        host_id TEXT NOT NULL,
        thread_id TEXT NOT NULL,
        sequence INTEGER NOT NULL CHECK(sequence > 0),
        payload TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        UNIQUE(provider, account_id, host_id, thread_id)
      );
      CREATE TABLE IF NOT EXISTS external_observation_messages (
        observation_id TEXT NOT NULL REFERENCES external_observations(id),
        item_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('agent', 'system')),
        text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(observation_id, item_id),
        UNIQUE(observation_id, sequence)
      );
      CREATE INDEX IF NOT EXISTS external_observation_recency ON external_observations(observed_at DESC);
    `);
    this.journal = new ExternalTaskJournal(db, creatorProfiles);
  }

  ingest(value: unknown, now = Date.now(), channel: "local_file" | "mcp" = "local_file"): { status: ExternalEventOutcome; id: string } {
    if (value && typeof value === "object" && "schema_version" in value && value.schema_version === 2) return this.journal.ingest(value, now, channel);
    const report = normalizeExternalReport(value, now);
    const id = externalObservationId(report);
    if (this.journal.hasTask(id)) throw new Error("external_legacy_downgrade_denied");
    const savepoint = `external_observation_${++this.savepoint}`;
    this.db.exec(`SAVEPOINT ${savepoint}`);
    try {
      const seen = this.db.prepare("SELECT 1 FROM external_observation_messages WHERE observation_id = ? AND item_id = ?").get(id, report.item_id);
      const previous = this.db.prepare("SELECT sequence, payload FROM external_observations WHERE id = ?").get(id) as { sequence: number; payload: string } | undefined;
      if (seen || (previous && report.sequence <= previous.sequence)) {
        this.db.exec(`RELEASE ${savepoint}`);
        return { status: seen ? "duplicate" : "out_of_order", id };
      }
      if (report.project_id && !this.db.prepare("SELECT 1 FROM projects WHERE id = ?").get(report.project_id)) throw new Error("external_project_not_found");
      const observedAt = new Date(now).toISOString();
      const earlier = previous ? JSON.parse(previous.payload) as ExternalReport & { _creator_name?: string | null } : null;
      // Freeze the first known declaration; old rows retain their recorded value.
      // Display mappings apply on read, so historical rows need no destructive migration.
      const creatorName = earlier ? ("_creator_name" in earlier ? earlier._creator_name : earlier.creator_name) : report.creator_name;
      this.db.prepare(`INSERT INTO external_observations(id, provider, account_id, host_id, thread_id, sequence, payload, observed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET sequence = excluded.sequence, payload = excluded.payload, observed_at = excluded.observed_at`)
        .run(id, report.provider, report.account_id, report.host_id, report.thread_id, report.sequence, JSON.stringify({ ...report, _creator_name: creatorName, _ingestion_channel: channel }), observedAt);
      this.db.prepare("INSERT INTO external_observation_messages(observation_id, item_id, sequence, role, text, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, report.item_id, report.sequence, report.message ? "agent" : "system", report.message || `Task reported: ${report.state}`, report.reported_at);
      this.journal.recordLegacy(id, report, now);
      this.db.exec(`RELEASE ${savepoint}`);
      return { status: "applied", id };
    } catch (error) {
      this.db.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
      throw error;
    }
  }

  private project(row: ObservationRow, connectivity: ExternalConnectivity, now: number): ExternalObservation {
    const report = JSON.parse(row.payload) as ExternalReport & { _ingestion_channel?: "local_file" | "mcp"; _creator_name?: string | null };
    const channel = report._ingestion_channel === "mcp" ? "mcp" : "local_file";
    const connected = typeof connectivity === "boolean" ? connectivity : connectivity[channel];
    const freshness = !connected ? "disconnected" : now - Date.parse(report.reported_at) >= externalFreshnessTtlMs ? "stale" : "fresh";
    const reportedExecution: ExternalExecutionState = report.state === "completed" ? "idle" : report.state;
    return {
      id: row.id, provider: report.provider, account_id: report.account_id, host_id: report.host_id, thread_id: report.thread_id,
      title: report.title, description: report.description, project_id: report.project_id, parent_thread_id: report.parent_thread_id,
      execution_state: freshness === "fresh" ? reportedExecution : "unknown", reported_execution_state: reportedExecution,
      task_result: report.state === "completed" ? "reported_complete" : "unknown", acceptance_state: "unknown", freshness,
      reported_at: report.reported_at, observed_at: row.observed_at, updated_at: row.observed_at, sequence: row.sequence,
      source: { kind: "task_reporter", attribution: "declared", channel },
      creator: { name: "_creator_name" in report ? report._creator_name ?? null : report.creator_name, verification: "unknown", avatar: null, ...this.creatorProfiles?.resolve(report) },
      executor: { name: report.executor_name || null, verification: "unknown" },
      declared_creator_name: report.creator_name,
      source_task_id: report.thread_id, source_run_id: null, run_number: null, history_cursor: this.journal.cursor(row.id),
    };
  }

  list(connected: ExternalConnectivity, now = Date.now()): ExternalObservation[] {
    const rows = this.db.prepare("SELECT id, sequence, payload, observed_at FROM external_observations ORDER BY observed_at DESC, id").all() as ObservationRow[];
    const connectivity = typeof connected === "boolean" ? { local_file: connected, mcp: connected } : connected;
    const v2 = this.journal.list(connectivity, now), ids = new Set(v2.map(item => item.id));
    return [...v2, ...rows.filter(row => !ids.has(row.id)).map(row => this.project(row, connected, now))].sort((a,b) => b.observed_at.localeCompare(a.observed_at) || a.id.localeCompare(b.id));
  }

  get(id: string, connected: ExternalConnectivity, now = Date.now()): ExternalObservation | null {
    const v2 = this.journal.get(id, typeof connected === "boolean" ? {local_file:connected,mcp:connected} : connected, now);
    if (v2) return v2;
    const row = this.db.prepare("SELECT id, sequence, payload, observed_at FROM external_observations WHERE id = ?").get(id) as ObservationRow | undefined;
    return row ? this.project(row, connected, now) : null;
  }

  messages(id: string, limit = 200): ExternalObservationMessage[] {
    if (this.journal.hasTask(id)) return this.journal.recentEvents(id, limit).map(event => ({item_id:event.event_id,sequence:event.sequence,role:event.message ? "agent" : "system",text:(event.outcome !== "applied" ? `此事件未更新当前状态（${event.outcome}）。\n\n` : "") + (event.message || `来源上报：${event.state || event.kind}`),created_at:event.reported_at}));
    const rows = this.db.prepare("SELECT item_id, sequence, role, text, created_at FROM external_observation_messages WHERE observation_id = ? ORDER BY sequence DESC LIMIT ?")
      .all(id, Math.max(1, Math.min(500, limit))) as ExternalObservationMessage[];
    return rows.reverse();
  }
}
