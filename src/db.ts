import { createHash, randomUUID } from "node:crypto";
import { existsSync, linkSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath, developmentDatabaseSnapshotSourcePath } from "./config.js";
import { renderMarkdown } from "./markdown.js";
import { syncProtocolVersion } from "./sync-contract.js";
import { projectDocumentKeys, type ConversationProjection, type DirectoryBrowserResult, type IssueProjection, type ProjectDocumentKey, type ProjectDocumentView, type ProjectPlanningState, type ProjectPlanSnapshot, type ProjectProjection, type RemoteCommand, type RemoteCommandAck, type SyncEntityType, type SyncProjection } from "./sync-contract.js";

export const issueStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"] as const;
export const issuePriorities = ["none", "low", "medium", "high", "urgent"] as const;
const defaultSchedulerModel = "gpt-5.6-sol";
const defaultSchedulerReasoningEffort = "high";

export type IssueStatus = typeof issueStatuses[number];
export type IssuePriority = typeof issuePriorities[number];
export type AgentModel = string;
export type AgentReasoningEffort = string;
export type AgentServiceTier = "default" | "fast";
export type AgentSandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export type AgentProfile = {
  id: string;
  role: string;
  name: string;
  name_en: string;
  description: string;
  instructions: string;
  model: AgentModel;
  reasoning_effort: AgentReasoningEffort;
  service_tier: AgentServiceTier;
  sandbox_mode: AgentSandboxMode;
  max_concurrency: number;
  version: number;
  created_at: string;
  updated_at: string;
  avatar?: string;
};

export type Project = {
  id: string;
  external_id: string | null;
  identifier_prefix: string;
  name: string;
  workspace_path: string;
  root_paths: string[];
  description: string;
  overview_html: string;
  overview_status: "idle" | "generating" | "ready" | "failed";
  overview_error: string | null;
  overview_updated_at: string | null;
  document_views: ProjectDocumentView[];
  document_agent_id: string | null;
  document_feedback: string;
  planning: ProjectPlanningState;
  next_issue_number: number;
  created_at: string;
  updated_at: string;
};

export type PendingActor = "user" | "agent";
export type EnrichmentStatus = "pending" | "failed" | null;
export type IssueReplyStatus = "idle" | "running" | "succeeded" | "failed" | "interrupted";

export type IssueReplyState = {
  issue_id: string;
  request_id?: string;
  status: IssueReplyStatus;
  message: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
};

export type IssueSessionStatus = "starting" | "active" | "stopping" | "waiting_on_approval" | "waiting_on_user" | "idle" | "interrupted" | "failed" | "disconnected";
export type SessionCommandKind = "start" | "turn" | "steer" | "interrupt";
export type SessionCommandStatus = "pending" | "claimed" | "completed" | "failed" | "cancelled";
export type IssueThreadAction = "archive" | "unarchive" | "delete";

export type PendingThreadAction = {
  thread_id: string;
  issue_id: string;
  action: IssueThreadAction;
  event_id: string;
  attempts: number;
  available_at: string;
};

export type IssueSession = {
  issue_id: string;
  host_id: string;
  thread_id: string;
  status: IssueSessionStatus;
  active_turn_id: string | null;
  active_command_id: string | null;
  last_turn_id: string | null;
  config_fingerprint: string;
  last_agent_message: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionCommand = {
  id: string;
  issue_id: string;
  run_id: string | null;
  request_id: string;
  request_fingerprint: string;
  kind: SessionCommandKind;
  status: SessionCommandStatus;
  host_id: string;
  thread_id: string | null;
  turn_id: string | null;
  payload: Record<string, unknown>;
  relay_id: string | null;
  attempts: number;
  cancel_requested: boolean;
  error: string | null;
  created_at: string;
  claimed_at: string | null;
  finished_at: string | null;
};

export type Issue = {
  id: string;
  identifier: string;
  project_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  sort_order: number;
  pinned: boolean;
  archived_at: string | null;
  thread_id: string | null;
  workspace_path: string | null;
  agent_enabled: boolean;
  agent_id: string | null;
  user_assigned: boolean;
  assignee_user_id: string | null;
  needs_attention: boolean;
  pending_actor: PendingActor;
  enrichment_status: EnrichmentStatus;
  reply_draft: string;
  session_handoff_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  active_run_status?: "claimed" | "running" | "scheduling" | null;
  active_run_started_at?: string | null;
  latest_run_status?: "claimed" | "running" | "scheduling" | "completed" | "failed" | "interrupted" | null;
  latest_scheduler_status?: "pending" | "running" | "completed" | "failed" | "interrupted" | null;
  latest_scheduler_error?: string | null;
  latest_run_finished_at?: string | null;
  run_thread_id?: string | null;
  session_thread_id?: string | null;
  session_status?: IssueSessionStatus | null;
  session_active_turn_id?: string | null;
  session_last_error?: string | null;
  session_updated_at?: string | null;
  session_owned?: boolean;
  session_relay_connected?: boolean;
  session_relay_error?: string | null;
};

export type ClaimedIssue = {
  runId: string;
  issue: Issue;
  workspacePath: string;
};

export const scheduledTaskIntervalUnits = ["minute", "hour", "day", "week"] as const;
export type ScheduledTaskIntervalUnit = typeof scheduledTaskIntervalUnits[number];

export type ScheduledTaskRun = {
  id: string;
  scheduled_task_id: string;
  issue_id: string | null;
  issue_identifier: string | null;
  issue_status: IssueStatus | null;
  active_run_status: "claimed" | "running" | "scheduling" | null;
  scheduled_for: string;
  status: "pending" | "dispatched" | "failed";
  attempts: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type ScheduledTask = {
  id: string;
  name: string;
  prompt: string;
  project_id: string;
  workspace_path: string;
  agent_id: string | null;
  starts_at: string;
  repeat: boolean;
  interval_value: number | null;
  interval_unit: ScheduledTaskIntervalUnit | null;
  enabled: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  recent_runs: ScheduledTaskRun[];
};

export type ScheduledTaskInput = {
  name: string;
  prompt: string;
  projectId: string;
  workspacePath: string;
  agentId?: string;
  startsAt: string;
  repeat?: boolean;
  intervalValue?: number;
  intervalUnit?: ScheduledTaskIntervalUnit;
  enabled?: boolean;
};

export type PendingScheduledTaskRun = {
  run: ScheduledTaskRun;
  task: ScheduledTask;
};

export type SchedulerDecision = {
  status: "done" | "in_review" | "blocked";
  reason: string;
  evidence: string[];
};

export type PendingSchedulerRun = {
  claim: ClaimedIssue;
  executionSuccess: boolean;
  executionError?: string;
  executionResult: string;
};

type ProjectInput = {
  id?: string;
  externalId?: string;
  name: string;
  workspacePath?: string;
  rootPaths?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ImportedSessionInput = {
  threadId: string;
  configFingerprint: string;
  hostId?: string;
  active: boolean;
  turnId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

type IssueInput = {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  labels?: string[];
  threadId?: string;
  workspacePath?: string;
  agentEnabled?: boolean;
  agentId?: string;
  userAssigned?: boolean;
  assigneeUserId?: string;
  enrichmentStatus?: EnrichmentStatus;
  session?: ImportedSessionInput;
};

export type IssuePatch = Partial<Pick<Issue, "project_id" | "title" | "description" | "status" | "priority" | "labels" | "sort_order" | "pinned" | "thread_id" | "workspace_path" | "agent_enabled" | "agent_id" | "user_assigned" | "assignee_user_id" | "needs_attention" | "pending_actor" | "enrichment_status" | "reply_draft">>;

type AgentProfileInput = Pick<AgentProfile, "name" | "name_en" | "description" | "instructions" | "model" | "reasoning_effort"> & { service_tier?: AgentServiceTier; sandbox_mode?: AgentSandboxMode; max_concurrency?: number };
type AgentProfilePatch = Partial<AgentProfileInput>;

export const defaultAgentMaxConcurrency = 5;
export const agentMaxConcurrencyLimit = 20;
export const agentSandboxModes: AgentSandboxMode[] = ["read-only", "workspace-write", "danger-full-access"];

export function cleanMaxConcurrency(value: number | undefined) {
  if (value === undefined) return defaultAgentMaxConcurrency;
  if (!Number.isInteger(value) || value < 1 || value > agentMaxConcurrencyLimit) throw new Error("invalid_agent_max_concurrency");
  return value;
}

const latestSchemaVersion = 17;

function now() {
  return new Date().toISOString();
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sessionCommandFingerprint(input: {
  runId?: string | null;
  kind: SessionCommandKind;
  payload?: Record<string, unknown>;
}) {
  return createHash("sha256").update(canonicalJson({
    kind: input.kind,
    payload: input.payload || {},
    run_id: input.runId || null,
  })).digest("hex");
}

function issueCreateFingerprint(input: IssueInput) {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

function createDevelopmentDatabaseSnapshot(file: string) {
  const sourcePath = developmentDatabaseSnapshotSourcePath;
  if (!sourcePath || resolve(file) !== databasePath || existsSync(file) || !existsSync(sourcePath)) return;
  mkdirSync(dirname(file), { recursive: true });
  const temporary = join(dirname(file), `.better-codex-snapshot-${randomUUID()}.db`);
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    source.exec("PRAGMA busy_timeout = 5000;");
    source.prepare("VACUUM INTO ?").run(temporary);
  } catch (error) {
    try { unlinkSync(temporary); } catch {}
    throw error;
  } finally {
    source.close();
  }
  try {
    linkSync(temporary, file);
    unlinkSync(temporary);
  } catch (error) {
    if (existsSync(file)) {
      try { unlinkSync(temporary); } catch {}
      return;
    }
    try { unlinkSync(temporary); } catch {}
    throw error;
  }
}

function asPendingActor(value: unknown): PendingActor {
  if (value === "user" || value === "agent") return value;
  throw new Error("invalid_pending_actor");
}

function projectPrefix(name: string) {
  const ascii = name.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (ascii.slice(0, 3) || "BCX").padEnd(3, "X");
}

function cleanName(value: string) {
  const name = value.trim();
  if (!name) throw new Error("name_required");
  return name;
}

function cleanTitle(value: string) {
  const title = value.trim();
  if (!title) throw new Error("title_required");
  return title;
}

function cleanAgentProfile(input: AgentProfileInput) {
  const name = input.name.trim();
  const name_en = (input.name_en || "").trim();
  const description = input.description.trim();
  const instructions = input.instructions.trim();
  if (!name || name.length > 80) throw new Error("agent_name_required");
  if (name_en.length > 80) throw new Error("agent_name_en_too_long");
  if (description.length > 500) throw new Error("agent_description_too_long");
  if (instructions.length > 100000) throw new Error("agent_instructions_too_long");
  if (!input.model.trim() || input.model.length > 80) throw new Error("invalid_agent_model");
  if (!input.reasoning_effort.trim() || input.reasoning_effort.length > 20) throw new Error("invalid_agent_reasoning_effort");
  const sandbox_mode = input.sandbox_mode || "workspace-write";
  if (!agentSandboxModes.includes(sandbox_mode)) throw new Error("invalid_agent_sandbox_mode");
  const service_tier = input.service_tier || "default";
  if (service_tier !== "default" && service_tier !== "fast") throw new Error("invalid_agent_service_tier");
  return { name, name_en, description, instructions, model: input.model, reasoning_effort: input.reasoning_effort, service_tier, sandbox_mode, max_concurrency: cleanMaxConcurrency(input.max_concurrency) };
}

function cleanLabels(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, 20);
}

function issueFromRow(row: Record<string, unknown>): Issue {
  const { labels_json, ...values } = row;
  return {
    ...values,
    labels: JSON.parse(String(labels_json ?? "[]")),
    pinned: Boolean(row.pinned),
    agent_enabled: Boolean(row.agent_enabled),
    user_assigned: Boolean(row.user_assigned),
    needs_attention: Boolean(row.needs_attention),
    session_owned: Boolean(row.session_owned),
    session_relay_connected: Boolean(row.session_relay_connected),
    pending_actor: row.pending_actor === "agent" ? "agent" : "user",
  } as Issue;
}

function scheduledTaskRunFromRow(row: Record<string, unknown>): ScheduledTaskRun {
  return {
    id: String(row.id),
    scheduled_task_id: String(row.scheduled_task_id),
    issue_id: row.issue_id ? String(row.issue_id) : null,
    issue_identifier: row.issue_identifier ? String(row.issue_identifier) : null,
    issue_status: row.issue_status ? String(row.issue_status) as IssueStatus : null,
    active_run_status: row.active_run_status ? String(row.active_run_status) as ScheduledTaskRun["active_run_status"] : null,
    scheduled_for: String(row.scheduled_for),
    status: String(row.status) as ScheduledTaskRun["status"],
    attempts: Number(row.attempts || 0),
    error: row.error ? String(row.error) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function scheduledTaskFromRow(row: Record<string, unknown>, recentRuns: ScheduledTaskRun[] = []): ScheduledTask {
  return {
    id: String(row.id),
    name: String(row.name),
    prompt: String(row.prompt),
    project_id: String(row.project_id),
    workspace_path: String(row.workspace_path),
    agent_id: row.agent_id ? String(row.agent_id) : null,
    starts_at: String(row.starts_at),
    repeat: Boolean(row.repeat),
    interval_value: row.interval_value === null || row.interval_value === undefined ? null : Number(row.interval_value),
    interval_unit: row.interval_unit ? String(row.interval_unit) as ScheduledTaskIntervalUnit : null,
    enabled: Boolean(row.enabled),
    next_run_at: row.next_run_at ? String(row.next_run_at) : null,
    last_run_at: row.last_run_at ? String(row.last_run_at) : null,
    version: Number(row.version),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    recent_runs: recentRuns,
  };
}

function scheduledTaskIntervalMilliseconds(value: number, unit: ScheduledTaskIntervalUnit) {
  const units = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 };
  return value * units[unit];
}

function nextScheduledTaskTime(startsAt: string, repeat: boolean, intervalValue: number | null, intervalUnit: ScheduledTaskIntervalUnit | null, after = Date.now()) {
  const start = Date.parse(startsAt);
  if (!repeat) return new Date(Math.max(start, after)).toISOString();
  if (!intervalValue || !intervalUnit) throw new Error("invalid_scheduled_task_interval");
  const interval = scheduledTaskIntervalMilliseconds(intervalValue, intervalUnit);
  if (start > after) return new Date(start).toISOString();
  return new Date(start + (Math.floor((after - start) / interval) + 1) * interval).toISOString();
}

function cleanScheduledTaskInput(input: ScheduledTaskInput) {
  const name = input.name.trim();
  const prompt = input.prompt.trim();
  const workspacePath = input.workspacePath.trim();
  const agentId = (input.agentId || "").trim();
  const starts = new Date(input.startsAt);
  const repeat = Boolean(input.repeat);
  const intervalValue = repeat ? Number(input.intervalValue) : null;
  const intervalUnit = repeat ? input.intervalUnit || null : null;
  if (!name || name.length > 120 || name.includes("\0")) throw new Error("invalid_scheduled_task_name");
  if (!prompt || prompt.length > 100000 || prompt.includes("\0")) throw new Error("invalid_scheduled_task_prompt");
  if (!workspacePath || workspacePath.length > 4096 || workspacePath.includes("\0")) throw new Error("workspace_required");
  if (agentId.length > 200 || agentId.includes("\0")) throw new Error("invalid_agent_id");
  if (!Number.isFinite(starts.getTime())) throw new Error("invalid_scheduled_task_time");
  if (repeat && (!Number.isInteger(intervalValue) || intervalValue < 1 || intervalValue > 999 || !intervalUnit || !scheduledTaskIntervalUnits.includes(intervalUnit))) throw new Error("invalid_scheduled_task_interval");
  return { name, prompt, projectId: input.projectId, workspacePath, agentId, startsAt: starts.toISOString(), repeat, intervalValue, intervalUnit, enabled: input.enabled !== false };
}

function emptyProjectDocumentViews(): ProjectDocumentView[] {
  return projectDocumentKeys.map(key => ({ key, status: "idle", markdown: "", html: "", diagram: null, error: null, updated_at: null }));
}

function projectDocumentViewsFromRow(row: Record<string, unknown>) {
  const views = emptyProjectDocumentViews();
  try {
    const parsed = JSON.parse(String(row.project_documents_json || "[]"));
    if (Array.isArray(parsed)) {
      for (const view of parsed) {
        if (!view || typeof view !== "object" || !projectDocumentKeys.includes(view.key as ProjectDocumentKey)) continue;
        const target = views.find(item => item.key === view.key)!;
        const source = view as Record<string, unknown>;
        const diagramSource = source.diagram && typeof source.diagram === "object" && !Array.isArray(source.diagram) ? source.diagram as Record<string, unknown> : null;
        const diagram = diagramSource && Array.isArray(diagramSource.nodes) && Array.isArray(diagramSource.edges)
          ? {
              nodes: diagramSource.nodes.slice(0, 80).flatMap(node => {
                if (!node || typeof node !== "object" || Array.isArray(node)) return [];
                const item = node as Record<string, unknown>;
                return [{ id: String(item.id || "").slice(0, 80), label: String(item.label || "").slice(0, 160), group: String(item.group || "").slice(0, 80), detail: String(item.detail || "").slice(0, 500) }];
              }).filter(node => node.id && node.label),
              edges: diagramSource.edges.slice(0, 160).flatMap(edge => {
                if (!edge || typeof edge !== "object" || Array.isArray(edge)) return [];
                const item = edge as Record<string, unknown>;
                return [{ from: String(item.from || "").slice(0, 80), to: String(item.to || "").slice(0, 80), label: String(item.label || "").slice(0, 120) }];
              }).filter(edge => edge.from && edge.to),
            }
          : null;
        Object.assign(target, {
          status: ["queued", "generating", "ready", "failed"].includes(String(source.status)) ? source.status : "idle",
          markdown: String(source.markdown || "").slice(0, 120000),
          html: String(source.html || "").slice(0, 500000),
          diagram,
          error: source.error ? String(source.error).slice(0, 2000) : null,
          updated_at: source.updated_at ? String(source.updated_at).slice(0, 64) : null,
        });
      }
    }
  } catch {}
  if (!views[0].html && row.overview_html) Object.assign(views[0], { status: "ready", html: String(row.overview_html), updated_at: row.overview_updated_at ? String(row.overview_updated_at) : null });
  return views;
}

function emptyProjectPlanning(): ProjectPlanningState {
  return { status: "idle", error: null, agent_id: null, revision: 0, updated_at: null, messages: [], plan: null };
}

function projectPlanFromJson(value: unknown): ProjectPlanSnapshot | null {
  try {
    const source = JSON.parse(String(value || "null")) as ProjectPlanSnapshot;
    if (!source || typeof source !== "object" || Array.isArray(source) || typeof source.summary !== "string") return null;
    const keys = ["outcomes", "milestones", "workstreams", "risks", "decisions", "open_questions", "delivery", "evidence"] as const;
    if (keys.some(key => !Array.isArray(source[key]))) return null;
    return source;
  } catch {
    return null;
  }
}

function projectFromRow(row: Record<string, unknown>): Project {
  let rootPaths: string[] = [];
  try {
    const parsed = JSON.parse(String(row.root_paths_json || "[]"));
    if (Array.isArray(parsed)) rootPaths = parsed.map(String).filter(Boolean);
  } catch {}
  const workspacePath = String(row.workspace_path || "");
  if (!rootPaths.length && workspacePath) rootPaths = [workspacePath];
  return {
    id: String(row.id),
    external_id: row.external_id ? String(row.external_id) : null,
    identifier_prefix: String(row.identifier_prefix || "BCX"),
    name: String(row.name || ""),
    workspace_path: workspacePath,
    root_paths: rootPaths,
    description: String(row.description || ""),
    overview_html: String(row.overview_html || ""),
    overview_status: ["generating", "ready", "failed"].includes(String(row.overview_status)) ? String(row.overview_status) as Project["overview_status"] : "idle",
    overview_error: row.overview_error ? String(row.overview_error) : null,
    overview_updated_at: row.overview_updated_at ? String(row.overview_updated_at) : null,
    document_views: projectDocumentViewsFromRow(row),
    document_agent_id: row.document_agent_id ? String(row.document_agent_id) : null,
    document_feedback: String(row.document_feedback || ""),
    planning: emptyProjectPlanning(),
    next_issue_number: Number(row.next_issue_number || 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function sessionCommandFromRow(row: Record<string, unknown>): SessionCommand {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(row.payload_json || "{}")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
  } catch {}
  return {
    id: String(row.id),
    issue_id: String(row.issue_id),
    run_id: row.run_id ? String(row.run_id) : null,
    request_id: String(row.request_id),
    request_fingerprint: String(row.request_fingerprint || ""),
    kind: String(row.kind) as SessionCommandKind,
    status: String(row.status) as SessionCommandStatus,
    host_id: String(row.host_id || "local"),
    thread_id: row.thread_id ? String(row.thread_id) : null,
    turn_id: row.turn_id ? String(row.turn_id) : null,
    payload,
    relay_id: row.relay_id ? String(row.relay_id) : null,
    attempts: Number(row.attempts || 0),
    cancel_requested: Boolean(row.cancel_requested),
    error: row.error ? String(row.error) : null,
    created_at: String(row.created_at),
    claimed_at: row.claimed_at ? String(row.claimed_at) : null,
    finished_at: row.finished_at ? String(row.finished_at) : null,
  };
}

export class Store {
  readonly db: DatabaseSync;
  readonly file: string;
  lastBackupPath: string | null = null;

  constructor(file = databasePath) {
    this.file = file;
    createDevelopmentDatabaseSnapshot(file);
    mkdirSync(dirname(file), { recursive: true });
    const existing = existsSync(file);
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    const currentVersion = this.schemaVersion();
    if (currentVersion > latestSchemaVersion) {
      this.db.close();
      throw new Error("database_schema_too_new");
    }
    if (existing && currentVersion < latestSchemaVersion) this.lastBackupPath = this.backup();
    this.migrate(currentVersion);
    this.ensureAgentColumn();
    this.ensureAgentProfileTable();
    this.ensureAgentAvatarTable();
    this.ensureRunTable();
    this.ensureSessionTables();
    this.ensureIssueReplyTable();
    this.ensureSettingsTable();
    this.ensureDispatchColumns();
    this.ensureEnrichmentColumn();
    this.ensureReplyDraftColumn();
    this.ensureSessionHandoffColumn();
    this.ensureProjectColumns();
    this.recoverProjectPlanning();
    this.ensureSyncTriggers();
    const integrity = this.db.prepare("PRAGMA quick_check").get() as Record<string, unknown> | undefined;
    if (String(integrity?.quick_check ?? "") !== "ok") {
      this.db.close();
      throw new Error("database_integrity_check_failed");
    }
    if (this.listProjects().length === 0) {
      this.ensureProject({ externalId: "inbox", name: "Inbox", workspacePath: process.cwd() });
    }
  }

  private schemaVersion() {
    const table = this.db.prepare("SELECT 1 AS value FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get();
    if (!table) return 0;
    const row = this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations").get() as { version: number };
    return Number(row.version);
  }

  private backup() {
    const directory = join(dirname(this.file), "backups");
    mkdirSync(directory, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = join(directory, `better-codex-before-v${latestSchemaVersion}-${stamp}.db`);
    this.db.prepare("VACUUM INTO ?").run(target);
    return target;
  }

  private migrate(fromVersion: number) {
    this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
    if (fromVersion < 1) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            external_id TEXT UNIQUE,
            identifier_prefix TEXT NOT NULL DEFAULT 'BCX',
            name TEXT NOT NULL,
            workspace_path TEXT NOT NULL DEFAULT '',
            next_issue_number INTEGER NOT NULL DEFAULT 1,
            default_branch TEXT NOT NULL DEFAULT 'main',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY,
            identifier TEXT NOT NULL UNIQUE,
            project_id TEXT NOT NULL REFERENCES projects(id),
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'todo',
            priority TEXT NOT NULL DEFAULT 'medium',
            labels_json TEXT NOT NULL DEFAULT '[]',
            sort_order REAL NOT NULL,
            pinned INTEGER NOT NULL DEFAULT 0,
            archived_at TEXT,
            thread_id TEXT,
            workspace_path TEXT,
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 2) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.upgradeLegacyProjects();
        this.db.exec(`
          CREATE UNIQUE INDEX IF NOT EXISTS projects_external_id ON projects(external_id);
          CREATE INDEX IF NOT EXISTS issues_project_status_sort
            ON issues(project_id, archived_at, status, pinned DESC, sort_order, created_at);
          CREATE INDEX IF NOT EXISTS issues_thread_id ON issues(thread_id);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 3) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 4) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS issue_sessions (
            issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
            host_id TEXT NOT NULL DEFAULT 'local',
            thread_id TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'starting',
            active_turn_id TEXT,
            active_command_id TEXT,
            last_turn_id TEXT,
            config_fingerprint TEXT NOT NULL DEFAULT '',
            last_agent_message TEXT NOT NULL DEFAULT '',
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS session_commands (
            id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
            run_id TEXT,
            request_id TEXT NOT NULL,
            request_fingerprint TEXT NOT NULL,
            kind TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            host_id TEXT NOT NULL DEFAULT 'local',
            thread_id TEXT,
            turn_id TEXT,
            payload_json TEXT NOT NULL DEFAULT '{}',
            result_json TEXT,
            relay_id TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            cancel_requested INTEGER NOT NULL DEFAULT 0,
            error TEXT,
            created_at TEXT NOT NULL,
            claimed_at TEXT,
            finished_at TEXT
          );
          CREATE TABLE IF NOT EXISTS session_relay (
            singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
            relay_id TEXT NOT NULL,
            app_session_id TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            error TEXT,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS session_commands_queue ON session_commands(status, created_at);
          CREATE INDEX IF NOT EXISTS session_commands_issue ON session_commands(issue_id, created_at);
          CREATE UNIQUE INDEX IF NOT EXISTS session_commands_request ON session_commands(issue_id, request_id);
          CREATE INDEX IF NOT EXISTS issue_sessions_thread ON issue_sessions(thread_id);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (4, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 5) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sync_outbox (
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            event_id TEXT NOT NULL UNIQUE,
            changed_at TEXT NOT NULL,
            PRIMARY KEY (entity_type, entity_id)
          );
          CREATE TABLE IF NOT EXISTS sync_tombstones (
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            event_id TEXT NOT NULL UNIQUE,
            changed_at TEXT NOT NULL,
            PRIMARY KEY (entity_type, entity_id)
          );
          CREATE TABLE IF NOT EXISTS sync_cursor (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (5, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 6) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS sync_command_receipts (
            command_id TEXT PRIMARY KEY,
            result_json TEXT NOT NULL,
            applied_at TEXT NOT NULL
          );
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (6, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 7) this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (7, ?)").run(now());
    if (fromVersion < 9) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const issueColumns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(column => column.name));
        const dispatchReset = issueColumns.has("needs_attention") && issueColumns.has("pending_actor")
          ? ", needs_attention = 0, pending_actor = 'user'"
          : "";
        // Cancellation used to be a terminal issue status. Archive is now the
        // terminal action, so keep legacy issues recoverable without allowing
        // them to restart automatically when they are restored.
        this.db.exec(`
          UPDATE issues
          SET status = 'backlog',
              archived_at = COALESCE(archived_at, updated_at),
              version = version + 1
              ${dispatchReset}
          WHERE status = 'cancelled'
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (9, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 10) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS issue_create_requests (
            request_id TEXT PRIMARY KEY,
            request_fingerprint TEXT NOT NULL,
            issue_id TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS issue_create_requests_issue ON issue_create_requests(issue_id);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (10, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 11) this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (11, ?)").run(now());
    if (fromVersion < 12) {
      const timestamp = now();
      this.db.prepare("INSERT OR REPLACE INTO sync_outbox (entity_type, entity_id, event_id, changed_at) SELECT 'project', id, lower(hex(randomblob(16))), ? FROM projects").run(timestamp);
      this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (12, ?)").run(timestamp);
    }
    if (fromVersion < 13) this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (13, ?)").run(now());
    if (fromVersion < 14) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS thread_action_queue (
            thread_id TEXT PRIMARY KEY,
            issue_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('archive', 'unarchive', 'delete')),
            event_id TEXT NOT NULL UNIQUE,
            attempts INTEGER NOT NULL DEFAULT 0,
            available_at TEXT NOT NULL,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS thread_action_queue_available ON thread_action_queue(attempts, available_at);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (14, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 15) this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (15, ?)").run(now());
    if (fromVersion < 16) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS project_planning_sessions (
            project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
            thread_id TEXT UNIQUE,
            agent_id TEXT,
            status TEXT NOT NULL DEFAULT 'idle',
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS project_planning_messages (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK(role IN ('user', 'agent')),
            markdown TEXT NOT NULL,
            html TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS project_planning_messages_project ON project_planning_messages(project_id, created_at);
          CREATE TABLE IF NOT EXISTS project_plan_revisions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            revision INTEGER NOT NULL,
            plan_json TEXT NOT NULL,
            source_message_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(project_id, revision)
          );
          CREATE INDEX IF NOT EXISTS project_plan_revisions_project ON project_plan_revisions(project_id, revision DESC);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (16, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    if (fromVersion < 17) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS scheduled_tasks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            prompt TEXT NOT NULL,
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            workspace_path TEXT NOT NULL,
            agent_id TEXT REFERENCES agent_profiles(id) ON DELETE SET NULL,
            starts_at TEXT NOT NULL,
            repeat INTEGER NOT NULL DEFAULT 0,
            interval_value INTEGER,
            interval_unit TEXT,
            enabled INTEGER NOT NULL DEFAULT 1,
            next_run_at TEXT,
            last_run_at TEXT,
            version INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS scheduled_task_runs (
            id TEXT PRIMARY KEY,
            scheduled_task_id TEXT NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
            issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
            scheduled_for TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            available_at TEXT NOT NULL,
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS scheduled_tasks_due ON scheduled_tasks(enabled, next_run_at);
          CREATE INDEX IF NOT EXISTS scheduled_task_runs_task ON scheduled_task_runs(scheduled_task_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS scheduled_task_runs_pending ON scheduled_task_runs(status, available_at);
        `);
        this.db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (17, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
  }

  private ensureProjectColumns() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("root_paths_json")) this.db.exec("ALTER TABLE projects ADD COLUMN root_paths_json TEXT NOT NULL DEFAULT '[]'");
    if (!columns.has("description")) this.db.exec("ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    if (!columns.has("overview_html")) this.db.exec("ALTER TABLE projects ADD COLUMN overview_html TEXT NOT NULL DEFAULT ''");
    if (!columns.has("overview_status")) this.db.exec("ALTER TABLE projects ADD COLUMN overview_status TEXT NOT NULL DEFAULT 'idle'");
    if (!columns.has("overview_error")) this.db.exec("ALTER TABLE projects ADD COLUMN overview_error TEXT");
    if (!columns.has("overview_updated_at")) this.db.exec("ALTER TABLE projects ADD COLUMN overview_updated_at TEXT");
    if (!columns.has("project_documents_json")) this.db.exec("ALTER TABLE projects ADD COLUMN project_documents_json TEXT NOT NULL DEFAULT '[]'");
    if (!columns.has("document_agent_id")) this.db.exec("ALTER TABLE projects ADD COLUMN document_agent_id TEXT");
    if (!columns.has("document_feedback")) this.db.exec("ALTER TABLE projects ADD COLUMN document_feedback TEXT NOT NULL DEFAULT ''");
    const rows = this.db.prepare("SELECT id, workspace_path, root_paths_json, project_documents_json, overview_status FROM projects").all() as Array<{ id: string; workspace_path: string; root_paths_json: string; project_documents_json: string; overview_status: string }>;
    for (const row of rows) {
      if (row.workspace_path && (!row.root_paths_json || row.root_paths_json === "[]")) this.db.prepare("UPDATE projects SET root_paths_json = ? WHERE id = ?").run(JSON.stringify([row.workspace_path]), row.id);
      if (row.overview_status === "generating") {
        const views = projectDocumentViewsFromRow(row as unknown as Record<string, unknown>).map(view => ["queued", "generating"].includes(view.status) ? { ...view, status: "failed" as const, error: "runtime_restarted" } : view);
        this.db.prepare("UPDATE projects SET project_documents_json = ? WHERE id = ?").run(JSON.stringify(views), row.id);
      }
    }
    this.db.prepare("UPDATE projects SET overview_status = 'failed', overview_error = 'runtime_restarted' WHERE overview_status = 'generating'").run();
  }

  private recoverProjectPlanning() {
    const timestamp = now();
    const projects = this.db.prepare("SELECT project_id FROM project_planning_sessions WHERE status = 'running'").all() as Array<{ project_id: string }>;
    this.db.prepare("UPDATE project_planning_sessions SET status = 'failed', last_error = 'runtime_restarted', updated_at = ? WHERE status = 'running'").run(timestamp);
    for (const project of projects) this.db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, project.project_id);
  }

  private ensureSyncTriggers() {
    const dirty = (entityType: SyncEntityType, id: string) => `
      DELETE FROM sync_tombstones WHERE entity_type = '${entityType}' AND entity_id = ${id};
      INSERT INTO sync_outbox (entity_type, entity_id, event_id, changed_at)
      VALUES ('${entityType}', ${id}, lower(hex(randomblob(16))), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(entity_type, entity_id) DO UPDATE SET event_id = excluded.event_id, changed_at = excluded.changed_at;
    `;
    const removed = (entityType: SyncEntityType, id: string) => `
      DELETE FROM sync_outbox WHERE entity_type = '${entityType}' AND entity_id = ${id};
      INSERT INTO sync_tombstones (entity_type, entity_id, event_id, changed_at)
      VALUES ('${entityType}', ${id}, lower(hex(randomblob(16))), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT(entity_type, entity_id) DO UPDATE SET event_id = excluded.event_id, changed_at = excluded.changed_at;
    `;
    this.db.exec(`
      DROP TRIGGER IF EXISTS sync_project_insert;
      DROP TRIGGER IF EXISTS sync_project_update;
      DROP TRIGGER IF EXISTS sync_project_delete;
      DROP TRIGGER IF EXISTS sync_issue_insert;
      DROP TRIGGER IF EXISTS sync_issue_update;
      DROP TRIGGER IF EXISTS sync_issue_delete;
      DROP TRIGGER IF EXISTS sync_run_insert;
      DROP TRIGGER IF EXISTS sync_run_update;
      DROP TRIGGER IF EXISTS sync_run_delete;
      DROP TRIGGER IF EXISTS sync_session_insert;
      DROP TRIGGER IF EXISTS sync_session_update;
      DROP TRIGGER IF EXISTS sync_session_delete;
      DROP TRIGGER IF EXISTS sync_reply_insert;
      DROP TRIGGER IF EXISTS sync_reply_update;
      DROP TRIGGER IF EXISTS sync_reply_delete;
      CREATE TRIGGER sync_project_insert AFTER INSERT ON projects BEGIN ${dirty("project", "NEW.id")} END;
      CREATE TRIGGER sync_project_update AFTER UPDATE OF name, identifier_prefix, workspace_path, root_paths_json, description, overview_html, overview_status, overview_error, overview_updated_at, project_documents_json, document_agent_id, document_feedback ON projects BEGIN ${dirty("project", "NEW.id")} END;
      CREATE TRIGGER sync_project_delete AFTER DELETE ON projects BEGIN ${removed("project", "OLD.id")} END;
      CREATE TRIGGER sync_issue_insert AFTER INSERT ON issues BEGIN ${dirty("issue", "NEW.id")} END;
      CREATE TRIGGER sync_issue_update AFTER UPDATE OF project_id, title, description, status, priority, labels_json, sort_order, pinned, archived_at, agent_id, agent_enabled, user_assigned, assignee_user_id, needs_attention, pending_actor ON issues BEGIN ${dirty("issue", "NEW.id")} END;
      CREATE TRIGGER sync_issue_delete AFTER DELETE ON issues BEGIN ${removed("issue", "OLD.id")} END;
      CREATE TRIGGER sync_run_insert AFTER INSERT ON issue_runs BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_run_update AFTER UPDATE OF status, scheduler_status, thread_id ON issue_runs BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_run_delete AFTER DELETE ON issue_runs BEGIN ${dirty("issue", "OLD.issue_id")} END;
      CREATE TRIGGER sync_session_insert AFTER INSERT ON issue_sessions BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_session_update AFTER UPDATE OF status, active_turn_id, last_turn_id, last_agent_message, last_error ON issue_sessions BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_session_delete AFTER DELETE ON issue_sessions BEGIN ${dirty("issue", "OLD.issue_id")} END;
      CREATE TRIGGER sync_reply_insert AFTER INSERT ON issue_replies BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_reply_update AFTER UPDATE OF status, message, error, started_at, finished_at ON issue_replies BEGIN ${dirty("issue", "NEW.issue_id")} END;
      CREATE TRIGGER sync_reply_delete AFTER DELETE ON issue_replies BEGIN ${dirty("issue", "OLD.issue_id")} END;
    `);
  }

  private ensureAgentColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("agent_enabled")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_enabled INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("agent_id")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_id TEXT");
    if (!columns.has("user_assigned")) this.db.exec("ALTER TABLE issues ADD COLUMN user_assigned INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("assignee_user_id")) this.db.exec("ALTER TABLE issues ADD COLUMN assignee_user_id TEXT");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_agent_id ON issues(agent_id)");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_assignee_user_id ON issues(assignee_user_id)");
  }

  private ensureDispatchColumns() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    const addedNeedsAttention = !columns.has("needs_attention");
    const addedPendingActor = !columns.has("pending_actor");
    if (addedNeedsAttention) this.db.exec("ALTER TABLE issues ADD COLUMN needs_attention INTEGER NOT NULL DEFAULT 0");
    if (addedPendingActor) this.db.exec("ALTER TABLE issues ADD COLUMN pending_actor TEXT NOT NULL DEFAULT 'user'");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_dispatch ON issues(needs_attention, pending_actor, agent_enabled, status)");
    // One-shot backfill when dispatch columns are first introduced. Do not re-arm
    // resting agent-owned issues (pending_actor=user, needs_attention=0) on every open.
    if (addedNeedsAttention || addedPendingActor) {
      this.db.prepare(`
        UPDATE issues
        SET needs_attention = 1, pending_actor = 'agent'
        WHERE agent_enabled = 1
          AND archived_at IS NULL
          AND status NOT IN ('backlog', 'done')
          AND needs_attention = 0
          AND pending_actor = 'user'
          AND NOT EXISTS (
            SELECT 1 FROM issue_runs
            WHERE issue_runs.issue_id = issues.id
              AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          )
      `).run();
    }
  }

  private ensureEnrichmentColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("enrichment_status")) this.db.exec("ALTER TABLE issues ADD COLUMN enrichment_status TEXT");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_enrichment_status ON issues(enrichment_status)");
  }

  private ensureReplyDraftColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("reply_draft")) this.db.exec("ALTER TABLE issues ADD COLUMN reply_draft TEXT NOT NULL DEFAULT ''");
  }

  private ensureSessionHandoffColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("session_handoff_at")) this.db.exec("ALTER TABLE issues ADD COLUMN session_handoff_at TEXT");
  }

  private ensureSettingsTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private ensureAgentProfileTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_profiles (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        instructions TEXT NOT NULL,
        model TEXT NOT NULL,
        reasoning_effort TEXT NOT NULL,
        service_tier TEXT NOT NULL DEFAULT 'default',
        sandbox_mode TEXT NOT NULL DEFAULT 'workspace-write',
        max_concurrency INTEGER NOT NULL DEFAULT ${defaultAgentMaxConcurrency},
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const columns = new Set((this.db.prepare("PRAGMA table_info(agent_profiles)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("sandbox_mode")) this.db.exec("ALTER TABLE agent_profiles ADD COLUMN sandbox_mode TEXT NOT NULL DEFAULT 'workspace-write'");
    if (!columns.has("max_concurrency")) this.db.exec(`ALTER TABLE agent_profiles ADD COLUMN max_concurrency INTEGER NOT NULL DEFAULT ${defaultAgentMaxConcurrency}`);
    if (!columns.has("name_en")) this.db.exec("ALTER TABLE agent_profiles ADD COLUMN name_en TEXT NOT NULL DEFAULT ''");
    if (!columns.has("service_tier")) this.db.exec("ALTER TABLE agent_profiles ADD COLUMN service_tier TEXT NOT NULL DEFAULT 'default'");
    const englishNames = new Map([
      ["代码审查", "Code Review"],
      ["前端实现", "Frontend Implementation"],
      ["问题排查", "Troubleshooting"],
      ["部署工程", "Deployment Engineering"],
      ["简单任务", "Simple Tasks"],
    ]);
    for (const [name, nameEn] of englishNames) this.db.prepare("UPDATE agent_profiles SET name_en = ? WHERE name = ? AND (name_en IS NULL OR name_en = '')").run(nameEn, name);
  }

  private ensureAgentAvatarTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_avatars (
        agent_id TEXT PRIMARY KEY,
        data_url TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private ensureRunTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issue_runs (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL REFERENCES issues(id),
        status TEXT NOT NULL,
        thread_id TEXT,
        pid INTEGER,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        error TEXT,
        execution_success INTEGER,
        execution_error TEXT,
        scheduler_pid INTEGER,
        scheduler_status TEXT,
        scheduler_error TEXT,
        scheduler_attempts INTEGER NOT NULL DEFAULT 0,
        scheduler_result TEXT,
        execution_mode TEXT NOT NULL DEFAULT 'cli',
        turn_id TEXT,
        execution_result TEXT
      );
      CREATE INDEX IF NOT EXISTS issue_runs_status ON issue_runs(status, started_at);
      CREATE INDEX IF NOT EXISTS issue_runs_issue ON issue_runs(issue_id, started_at);
    `);
    const columns = new Set((this.db.prepare("PRAGMA table_info(issue_runs)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("execution_success")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN execution_success INTEGER");
    if (!columns.has("execution_error")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN execution_error TEXT");
    if (!columns.has("scheduler_pid")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN scheduler_pid INTEGER");
    if (!columns.has("scheduler_status")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN scheduler_status TEXT");
    if (!columns.has("scheduler_error")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN scheduler_error TEXT");
    if (!columns.has("scheduler_attempts")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN scheduler_attempts INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("scheduler_result")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN scheduler_result TEXT");
    if (!columns.has("execution_mode")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN execution_mode TEXT NOT NULL DEFAULT 'cli'");
    if (!columns.has("turn_id")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN turn_id TEXT");
    if (!columns.has("execution_result")) this.db.exec("ALTER TABLE issue_runs ADD COLUMN execution_result TEXT");
  }

  private ensureSessionTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issue_sessions (
        issue_id TEXT PRIMARY KEY REFERENCES issues(id) ON DELETE CASCADE,
        host_id TEXT NOT NULL DEFAULT 'local',
        thread_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'starting',
        active_turn_id TEXT,
        active_command_id TEXT,
        last_turn_id TEXT,
        config_fingerprint TEXT NOT NULL DEFAULT '',
        last_agent_message TEXT NOT NULL DEFAULT '',
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS session_commands (
        id TEXT PRIMARY KEY,
        issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        run_id TEXT,
        request_id TEXT NOT NULL,
        request_fingerprint TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        host_id TEXT NOT NULL DEFAULT 'local',
        thread_id TEXT,
        turn_id TEXT,
        payload_json TEXT NOT NULL DEFAULT '{}',
        result_json TEXT,
        relay_id TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        cancel_requested INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        claimed_at TEXT,
        finished_at TEXT
      );
      CREATE TABLE IF NOT EXISTS session_relay (
        singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
        relay_id TEXT NOT NULL,
        app_session_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        error TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS session_commands_queue ON session_commands(status, created_at);
      CREATE INDEX IF NOT EXISTS session_commands_issue ON session_commands(issue_id, created_at);
      CREATE UNIQUE INDEX IF NOT EXISTS session_commands_request ON session_commands(issue_id, request_id);
      CREATE INDEX IF NOT EXISTS issue_sessions_thread ON issue_sessions(thread_id);
    `);
  }

  private ensureIssueReplyTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS issue_replies (
        issue_id TEXT PRIMARY KEY REFERENCES issues(id),
        request_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        error TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT
      );
    `);
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.db.prepare(`
        SELECT issue_id
        FROM issue_replies
        WHERE status = 'running'
          AND NOT EXISTS (SELECT 1 FROM issue_sessions WHERE issue_sessions.issue_id = issue_replies.issue_id)
          AND NOT EXISTS (
            SELECT 1 FROM session_commands
            WHERE session_commands.issue_id = issue_replies.issue_id
              AND session_commands.status IN ('pending', 'claimed')
          )
      `).all() as Array<{ issue_id: string }>;
      for (const row of rows) {
        this.db.prepare("UPDATE issue_replies SET status = 'interrupted', error = 'runtime_restarted', finished_at = ? WHERE issue_id = ? AND status = 'running'").run(timestamp, row.issue_id);
        this.db.prepare(`
          UPDATE issues
          SET status = 'blocked',
              needs_attention = 1,
              pending_actor = 'user',
              version = version + 1,
              updated_at = ?
          WHERE id = ?
            AND status = 'in_progress'
        `).run(timestamp, row.issue_id);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private upgradeLegacyProjects() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map((item) => item.name));
    for (const [name, definition] of [
      ["external_id", "TEXT"],
      ["identifier_prefix", "TEXT NOT NULL DEFAULT 'BCX'"],
      ["next_issue_number", "INTEGER NOT NULL DEFAULT 1"],
      ["updated_at", "TEXT NOT NULL DEFAULT ''"],
    ]) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE projects ADD COLUMN ${name} ${definition}`);
    }
    this.db.exec("UPDATE projects SET updated_at = created_at WHERE updated_at = ''");
  }

  health() {
    const integrity = this.db.prepare("PRAGMA quick_check").get() as Record<string, unknown> | undefined;
    const threadActions = this.db.prepare("SELECT SUM(CASE WHEN attempts < 5 THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN attempts >= 5 THEN 1 ELSE 0 END) AS failed FROM thread_action_queue").get() as { pending: number | null; failed: number | null };
    return {
      ok: String(integrity?.quick_check ?? "") === "ok",
      schemaVersion: this.schemaVersion(),
      latestSchemaVersion,
      lastBackupPath: this.lastBackupPath,
      effects: { pending: Number(threadActions.pending || 0), failed: Number(threadActions.failed || 0) },
    };
  }

  close() {
    this.db.close();
  }

  initializeSyncQueue() {
    const initialized = this.db.prepare("SELECT value FROM sync_cursor WHERE key = 'initialized_protocol'").get() as { value: string } | undefined;
    if (initialized?.value === syncProtocolVersion) return;
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT OR REPLACE INTO sync_outbox (entity_type, entity_id, event_id, changed_at) SELECT 'project', id, lower(hex(randomblob(16))), ? FROM projects").run(timestamp);
      this.db.prepare("INSERT OR REPLACE INTO sync_outbox (entity_type, entity_id, event_id, changed_at) SELECT 'issue', id, lower(hex(randomblob(16))), ? FROM issues").run(timestamp);
      this.db.prepare("INSERT OR REPLACE INTO sync_cursor (key, value) VALUES ('initialized_protocol', ?)").run(syncProtocolVersion);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  rebuildSyncQueue() {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("DELETE FROM sync_outbox; DELETE FROM sync_tombstones; DELETE FROM sync_cursor;");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    this.initializeSyncQueue();
  }

  getSyncCursor() {
    const row = this.db.prepare("SELECT value FROM sync_cursor WHERE key = 'hub_revision'").get() as { value: string } | undefined;
    return Number(row?.value ?? 0) || 0;
  }

  setSyncCursor(cursor: number) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("invalid_sync_cursor");
    this.db.prepare("INSERT OR REPLACE INTO sync_cursor (key, value) VALUES ('hub_revision', ?)").run(String(cursor));
  }

  syncQueueStatus() {
    const outbox = this.db.prepare("SELECT COUNT(*) AS value FROM sync_outbox").get() as { value: number };
    const tombstones = this.db.prepare("SELECT COUNT(*) AS value FROM sync_tombstones").get() as { value: number };
    return { pending: Number(outbox.value) + Number(tombstones.value), outbox: Number(outbox.value), tombstones: Number(tombstones.value), cursor: this.getSyncCursor() };
  }

  listSyncQueue(limit = 100) {
    const cleanLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    return this.db.prepare(`
      SELECT entity_type, entity_id, event_id, changed_at, 'upsert' AS operation FROM sync_outbox
      UNION ALL
      SELECT entity_type, entity_id, event_id, changed_at, 'delete' AS operation FROM sync_tombstones
      ORDER BY changed_at, entity_type, entity_id
      LIMIT ?
    `).all(cleanLimit) as Array<{ entity_type: SyncEntityType; entity_id: string; event_id: string; changed_at: string; operation: "upsert" | "delete" }>;
  }

  clearSyncQueueEntry(entry: { entity_type: SyncEntityType; entity_id: string; event_id: string; operation: "upsert" | "delete" }) {
    const table = entry.operation === "delete" ? "sync_tombstones" : "sync_outbox";
    this.db.prepare(`DELETE FROM ${table} WHERE entity_type = ? AND entity_id = ? AND event_id = ?`).run(entry.entity_type, entry.entity_id, entry.event_id);
  }

  syncProjection(entityType: SyncEntityType, id: string): SyncProjection | null {
    if (entityType === "project") {
      const project = this.getProject(id);
      if (!project) return null;
      return {
        id: project.id,
        name: project.name,
        identifier_prefix: project.identifier_prefix,
        root_paths: project.root_paths,
        description: project.description,
        overview_html: project.overview_html,
        overview_status: project.overview_status,
        overview_error: project.overview_error,
        overview_updated_at: project.overview_updated_at,
        document_views: project.document_views,
        document_agent_id: project.document_agent_id,
        document_feedback: project.document_feedback,
        planning: { ...project.planning, messages: project.planning.messages.slice(-40) },
        created_at: project.created_at,
        updated_at: project.updated_at,
        local_revision: Math.max(1, Date.parse(project.updated_at) || 1),
      } satisfies ProjectProjection;
    }
    const issue = this.getIssue(id);
    if (!issue) return null;
    const reply = this.getIssueReplyState(issue.id);
    const lastActivityFinishedAt = [
      ["completed", "failed", "interrupted"].includes(issue.latest_run_status || "") ? issue.latest_run_finished_at : null,
      ["succeeded", "failed", "interrupted"].includes(reply.status) ? reply.finished_at : null,
      ["idle", "interrupted", "failed", "disconnected"].includes(issue.session_status || "") ? issue.session_updated_at : null,
    ].filter((value): value is string => Boolean(value)).sort().at(-1) || null;
    return {
      id: issue.id,
      identifier: issue.identifier,
      project_id: issue.project_id,
      title: issue.title,
      description: issue.description,
      status: issue.status,
      priority: issue.priority,
      labels: issue.labels,
      sort_order: issue.sort_order,
      pinned: issue.pinned,
      archived_at: issue.archived_at,
      assigned: Boolean(issue.agent_enabled || issue.user_assigned),
      agent_enabled: issue.agent_enabled,
      agent_id: issue.agent_id,
      user_assigned: issue.user_assigned,
      assignee_user_id: issue.assignee_user_id,
      pending_actor: issue.pending_actor,
      active_run_status: issue.active_run_status ?? null,
      latest_run_status: issue.latest_run_status ?? null,
      latest_scheduler_status: issue.latest_scheduler_status ?? null,
      session_status: issue.session_status ?? null,
      reply_status: reply.status,
      has_conversation: Boolean(issue.run_thread_id),
      last_activity_finished_at: lastActivityFinishedAt,
      needs_attention: issue.needs_attention,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      local_revision: issue.version,
    } satisfies IssueProjection;
  }

  async applyRemoteCommand(command: RemoteCommand, handlers: { files?: (files: Array<{ name: string; type: string; data: string }>) => { paths: string[]; cleanup: () => void } | Promise<{ paths: string[]; cleanup: () => void }>; reply?: (issueId: string, requestId: string, message: string, files: Array<{ name: string; type: string; data: string }>) => void | Promise<void>; stop?: (issueId: string) => void | Promise<void>; projectCreate?: (projectId: string, name: string, workspacePath: string) => void | Promise<void>; projectOverview?: (projectId: string, agentId: string, feedback: string) => void | Promise<void>; projectPlanningReply?: (projectId: string, agentId: string, message: string) => void | Promise<void>; projectPlanningReset?: (projectId: string) => void | Promise<void>; chooseDirectory?: () => string | Promise<string>; browseDirectory?: (path: string) => DirectoryBrowserResult | Promise<DirectoryBrowserResult>; threadAction?: (issueId: string, action: IssueThreadAction) => void | Promise<void> } = {}): Promise<RemoteCommandAck> {
    const receipt = this.db.prepare("SELECT result_json FROM sync_command_receipts WHERE command_id = ?").get(command.command_id) as { result_json: string } | undefined;
    if (receipt) return JSON.parse(receipt.result_json) as RemoteCommandAck;
    const result = await (async () => {
      let transferred: { paths: string[]; cleanup: () => void } | null = null;
      try {
        const payload = command.payload;
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("invalid_command_payload");
        const files = Array.isArray(payload.files) ? payload.files as Array<{ name: string; type: string; data: string }> : [];
        if (["issue.create", "issue.update"].includes(command.operation) && files.length) {
          if (!handlers.files) throw new Error("remote_files_unavailable");
          transferred = await handlers.files(files);
        }
        const fileBlock = transferred?.paths.length ? `附带文件：\n${transferred.paths.map(path => `- ${path}`).join("\n")}` : "";
        const descriptionWithFiles = (description: unknown) => [typeof description === "string" ? description : "", fileBlock].filter(Boolean).join("\n\n");
        if (command.operation === "project.pick_directory") {
          if (command.base_revision !== null || !handlers.chooseDirectory) throw new Error("directory_picker_unavailable");
          const workspacePath = String(await handlers.chooseDirectory()).trim();
          return { command_id: command.command_id, status: "applied", error: null, projection: null, result: { workspace_path: workspacePath } } satisfies RemoteCommandAck;
        }
        if (command.operation === "project.browse_directory") {
          if (command.base_revision !== null || !handlers.browseDirectory || typeof payload.path !== "string") throw new Error("directory_browser_unavailable");
          const directory = await handlers.browseDirectory(payload.path);
          return { command_id: command.command_id, status: "applied", error: null, projection: null, result: directory } satisfies RemoteCommandAck;
        }
        if (command.operation === "settings.auto-dispatch") {
          if (command.entity_id !== "auto-dispatch" || command.base_revision !== null || typeof payload.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
          this.setAutoDispatch(payload.enabled);
          return { command_id: command.command_id, status: "applied", error: null, projection: null } satisfies RemoteCommandAck;
        }
        if (command.operation === "project.create") {
          if (command.base_revision !== null || this.getProject(command.entity_id)) throw new Error("version_conflict");
          if (!handlers.projectCreate) throw new Error("remote_project_create_unavailable");
          await handlers.projectCreate(command.entity_id, String(payload.name || ""), String(payload.workspace_path || ""));
          const project = this.getProject(command.entity_id);
          if (!project) throw new Error("project_create_failed");
          return { command_id: command.command_id, status: "applied", error: null, projection: this.syncProjection("project", project.id) as ProjectProjection } satisfies RemoteCommandAck;
        }
        if (command.operation === "project.overview") {
          const project = this.getProject(command.entity_id);
          if (!project) throw new Error("project_not_found");
          if ((this.syncProjection("project", project.id) as ProjectProjection).local_revision !== command.base_revision) throw new Error("version_conflict");
          if (!handlers.projectOverview) throw new Error("remote_project_overview_unavailable");
          const agentId = typeof payload.agent_id === "string" ? payload.agent_id.trim().slice(0, 200) : "";
          const feedback = typeof payload.feedback === "string" ? payload.feedback.trim().slice(0, 4000) : "";
          await handlers.projectOverview(project.id, agentId, feedback);
          return { command_id: command.command_id, status: "applied", error: null, projection: this.syncProjection("project", project.id) as ProjectProjection } satisfies RemoteCommandAck;
        }
        if (command.operation === "project.planning.reply") {
          const project = this.getProject(command.entity_id);
          if (!project) throw new Error("project_not_found");
          if ((this.syncProjection("project", project.id) as ProjectProjection).local_revision !== command.base_revision) throw new Error("version_conflict");
          if (!handlers.projectPlanningReply) throw new Error("remote_project_planning_unavailable");
          await handlers.projectPlanningReply(project.id, typeof payload.agent_id === "string" ? payload.agent_id.trim().slice(0, 200) : "", typeof payload.message === "string" ? payload.message.trim().slice(0, 12000) : "");
          return { command_id: command.command_id, status: "applied", error: null, projection: this.syncProjection("project", project.id) as ProjectProjection } satisfies RemoteCommandAck;
        }
        if (command.operation === "project.planning.reset") {
          const project = this.getProject(command.entity_id);
          if (!project) throw new Error("project_not_found");
          if ((this.syncProjection("project", project.id) as ProjectProjection).local_revision !== command.base_revision) throw new Error("version_conflict");
          if (!handlers.projectPlanningReset) throw new Error("remote_project_planning_unavailable");
          await handlers.projectPlanningReset(project.id);
          return { command_id: command.command_id, status: "applied", error: null, projection: this.syncProjection("project", project.id) as ProjectProjection } satisfies RemoteCommandAck;
        }
        let issue: Issue;
        if (command.operation === "issue.create") {
          if (command.base_revision !== null || this.getIssue(command.entity_id)) throw new Error("version_conflict");
          issue = this.createIssue({
            id: command.entity_id,
            projectId: String(payload.project_id || ""),
            title: String(payload.title || ""),
            description: descriptionWithFiles(payload.description),
            status: payload.status as IssueStatus | undefined,
            priority: payload.priority as IssuePriority | undefined,
            labels: Array.isArray(payload.labels) ? payload.labels as string[] : [],
            agentEnabled: payload.agent_enabled === true,
            agentId: typeof payload.agent_id === "string" ? payload.agent_id : undefined,
            userAssigned: payload.user_assigned === true,
            assigneeUserId: typeof payload.assignee_user_id === "string" ? payload.assignee_user_id : undefined,
            enrichmentStatus: payload.ai_enrich === true ? "pending" : null,
          });
        } else {
          const current = this.getIssue(command.entity_id);
          if (!current) throw new Error("issue_not_found");
          if (!["issue.reply", "issue.stop"].includes(command.operation) && current.version !== command.base_revision) throw new Error("version_conflict");
          if (!["issue.reply", "issue.stop"].includes(command.operation) && (current.active_run_status || current.session_active_turn_id || this.getIssueReplyState(current.id).status === "running")) throw new Error("issue_execution_running");
          if (["issue.archive", "issue.delete"].includes(command.operation) && current.enrichment_status === "pending") throw new Error("issue_enrichment_pending");
          if (command.operation === "issue.delete") {
            this.deleteArchivedIssue(current.id, current.version);
            return { command_id: command.command_id, status: "applied", error: null, projection: null } satisfies RemoteCommandAck;
          }
          if (command.operation === "issue.archive") {
            issue = this.archiveIssue(current.id, current.version);
          } else if (command.operation === "issue.restore") {
            issue = this.unarchiveIssue(current.id, current.version);
          }
          else if (command.operation === "issue.reply") {
            if (current.archived_at) throw new Error("issue_archived");
            if (!handlers.reply) throw new Error("remote_reply_unavailable");
            const message = String(payload.message || "").trim();
            const files = Array.isArray(payload.files) ? payload.files as Array<{ name: string; type: string; data: string }> : [];
            if (!message && !files.length) throw new Error("message_required");
            await handlers.reply(current.id, command.command_id, message, files);
            issue = this.getIssue(current.id)!;
          } else if (command.operation === "issue.stop") {
            if (!handlers.stop) throw new Error("remote_stop_unavailable");
            await handlers.stop(current.id);
            issue = this.getIssue(current.id)!;
          } else {
            const patch: IssuePatch = {};
            if (command.operation === "issue.move") {
              if (payload.status !== undefined) patch.status = payload.status as IssueStatus;
              if (typeof payload.before_id === "string" && payload.before_id) {
                const before = this.getIssue(payload.before_id);
                if (before && before.project_id === current.project_id && before.status === patch.status) patch.sort_order = before.sort_order - 0.5;
              }
            } else {
              if (payload.project_id !== undefined) patch.project_id = String(payload.project_id);
              if (payload.title !== undefined) patch.title = String(payload.title);
              if (payload.description !== undefined || fileBlock) patch.description = descriptionWithFiles(payload.description);
              if (payload.status !== undefined) patch.status = payload.status as IssueStatus;
              if (payload.priority !== undefined) patch.priority = payload.priority as IssuePriority;
              if (payload.labels !== undefined) patch.labels = payload.labels as string[];
              if (payload.sort_order !== undefined) patch.sort_order = Number(payload.sort_order);
              if (payload.pinned !== undefined) patch.pinned = Boolean(payload.pinned);
              if (payload.agent_enabled !== undefined) patch.agent_enabled = Boolean(payload.agent_enabled);
              if (payload.agent_id !== undefined) patch.agent_id = String(payload.agent_id) || null;
              if (payload.user_assigned !== undefined) patch.user_assigned = Boolean(payload.user_assigned);
              if (payload.assignee_user_id !== undefined) patch.assignee_user_id = typeof payload.assignee_user_id === "string" ? payload.assignee_user_id || null : null;
              if (command.operation === "issue.start") {
                patch.agent_enabled = true;
                patch.user_assigned = false;
                patch.agent_id = typeof payload.agent_id === "string" ? payload.agent_id || null : current.agent_id;
                patch.pending_actor = "agent";
                patch.needs_attention = true;
              }
            }
            issue = this.updateIssue(current.id, current.version, patch);
            if (command.operation === "issue.start") this.enqueueManualStart(issue.id);
          }
        }
        return { command_id: command.command_id, status: "applied", error: null, projection: this.syncProjection("issue", issue.id) as IssueProjection } satisfies RemoteCommandAck;
      } catch (error) {
        transferred?.cleanup();
        const code = error instanceof Error ? error.message : "command_rejected";
        const status = code === "version_conflict" ? "conflict" : "rejected";
        return { command_id: command.command_id, status, error: code, projection: null } satisfies RemoteCommandAck;
      }
    })();
    this.db.prepare("INSERT INTO sync_command_receipts (command_id, result_json, applied_at) VALUES (?, ?, ?)").run(command.command_id, JSON.stringify(result), now());
    return result;
  }

  getAutoDispatch() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'auto_dispatch'").get() as { value: string } | undefined;
    return row?.value === "1";
  }

  setAutoDispatch(enabled: boolean) {
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('auto_dispatch', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(enabled ? "1" : "0");
    return this.getAutoDispatch();
  }

  listManualStartQueue() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'manual_start_queue'").get() as { value: string } | undefined;
    try {
      const values = JSON.parse(row?.value || "[]") as unknown;
      return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value)))] : [];
    } catch {
      return [];
    }
  }

  enqueueManualStart(issueId: string) {
    const queue = this.listManualStartQueue();
    if (!queue.includes(issueId)) queue.push(issueId);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('manual_start_queue', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(queue));
  }

  dequeueManualStart(issueId: string) {
    const queue = this.listManualStartQueue().filter(value => value !== issueId);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('manual_start_queue', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(JSON.stringify(queue));
  }

  getSchedulerModel(defaultModel = "") {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'scheduler_model'").get() as { value: string } | undefined;
    const value = row?.value.trim() || "";
    const configured = defaultModel.trim();
    return value && value.length <= 200 && !value.includes("\0") ? value : configured && configured !== "默认模型" && configured.length <= 200 && !configured.includes("\0") ? configured : defaultSchedulerModel;
  }

  setSchedulerModel(model: string) {
    const value = model.trim();
    if (!value || value.length > 200 || value.includes("\0")) throw new Error("invalid_scheduler_model");
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('scheduler_model', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(value);
    return this.getSchedulerModel();
  }

  getSchedulerReasoningEffort() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'scheduler_reasoning_effort'").get() as { value: string } | undefined;
    const value = row?.value.trim() || "";
    return value && value.length <= 20 && !value.includes("\0") ? value : defaultSchedulerReasoningEffort;
  }

  setSchedulerReasoningEffort(effort: string) {
    const value = effort.trim();
    if (!value || value.length > 20 || value.includes("\0")) throw new Error("invalid_scheduler_reasoning_effort");
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('scheduler_reasoning_effort', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(value);
    return this.getSchedulerReasoningEffort();
  }

  listScheduledTaskRuns(taskId: string, limit = 5) {
    const rows = this.db.prepare(`
      SELECT scheduled_task_runs.*, issues.identifier AS issue_identifier, issues.status AS issue_status,
        (
          SELECT issue_runs.status
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          ORDER BY issue_runs.started_at DESC
          LIMIT 1
        ) AS active_run_status
      FROM scheduled_task_runs
      LEFT JOIN issues ON issues.id = scheduled_task_runs.issue_id
      WHERE scheduled_task_runs.scheduled_task_id = ?
      ORDER BY scheduled_task_runs.created_at DESC
      LIMIT ?
    `).all(taskId, Math.max(1, Math.min(50, Math.floor(limit)))) as Record<string, unknown>[];
    return rows.map(scheduledTaskRunFromRow);
  }

  listScheduledTasks() {
    const rows = this.db.prepare("SELECT * FROM scheduled_tasks ORDER BY enabled DESC, COALESCE(next_run_at, starts_at), created_at DESC").all() as Record<string, unknown>[];
    return rows.map(row => scheduledTaskFromRow(row, this.listScheduledTaskRuns(String(row.id))));
  }

  getScheduledTask(id: string) {
    const row = this.db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? scheduledTaskFromRow(row, this.listScheduledTaskRuns(id)) : undefined;
  }

  createScheduledTask(input: ScheduledTaskInput) {
    const cleaned = cleanScheduledTaskInput(input);
    if (!this.getProject(cleaned.projectId)) throw new Error("project_not_found");
    if (cleaned.agentId && !this.getAgentProfile(cleaned.agentId)) throw new Error("agent_not_found");
    const id = randomUUID();
    const timestamp = now();
    const nextRunAt = nextScheduledTaskTime(cleaned.startsAt, cleaned.repeat, cleaned.intervalValue, cleaned.intervalUnit);
    this.db.prepare(`
      INSERT INTO scheduled_tasks (
        id, name, prompt, project_id, workspace_path, agent_id, starts_at, repeat,
        interval_value, interval_unit, enabled, next_run_at, last_run_at, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, ?)
    `).run(id, cleaned.name, cleaned.prompt, cleaned.projectId, cleaned.workspacePath, cleaned.agentId || null, cleaned.startsAt, Number(cleaned.repeat), cleaned.intervalValue, cleaned.intervalUnit, Number(cleaned.enabled), nextRunAt, timestamp, timestamp);
    return this.getScheduledTask(id)!;
  }

  updateScheduledTask(id: string, version: number, input: ScheduledTaskInput) {
    const current = this.getScheduledTask(id);
    if (!current) throw new Error("scheduled_task_not_found");
    if (!Number.isInteger(version) || version !== current.version) throw new Error("version_conflict");
    const cleaned = cleanScheduledTaskInput(input);
    if (!this.getProject(cleaned.projectId)) throw new Error("project_not_found");
    if (cleaned.agentId && !this.getAgentProfile(cleaned.agentId)) throw new Error("agent_not_found");
    const scheduleChanged = cleaned.startsAt !== current.starts_at || cleaned.repeat !== current.repeat || cleaned.intervalValue !== current.interval_value || cleaned.intervalUnit !== current.interval_unit;
    const nextRunAt = scheduleChanged || cleaned.enabled && (!current.next_run_at || Date.parse(current.next_run_at) <= Date.now())
      ? nextScheduledTaskTime(cleaned.startsAt, cleaned.repeat, cleaned.intervalValue, cleaned.intervalUnit)
      : current.next_run_at;
    const result = this.db.prepare(`
      UPDATE scheduled_tasks
      SET name = ?, prompt = ?, project_id = ?, workspace_path = ?, agent_id = ?, starts_at = ?, repeat = ?,
          interval_value = ?, interval_unit = ?, enabled = ?, next_run_at = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(cleaned.name, cleaned.prompt, cleaned.projectId, cleaned.workspacePath, cleaned.agentId || null, cleaned.startsAt, Number(cleaned.repeat), cleaned.intervalValue, cleaned.intervalUnit, Number(cleaned.enabled), nextRunAt, now(), id, version);
    if (Number(result.changes) !== 1) throw new Error("version_conflict");
    return this.getScheduledTask(id)!;
  }

  deleteScheduledTask(id: string, version: number) {
    const result = this.db.prepare("DELETE FROM scheduled_tasks WHERE id = ? AND version = ?").run(id, version);
    if (Number(result.changes) !== 1) {
      if (!this.getScheduledTask(id)) throw new Error("scheduled_task_not_found");
      throw new Error("version_conflict");
    }
  }

  runScheduledTaskNow(id: string) {
    this.db.exec("BEGIN IMMEDIATE");
    let runId = "";
    try {
      const task = this.db.prepare("SELECT 1 AS value FROM scheduled_tasks WHERE id = ?").get(id);
      if (!task) throw new Error("scheduled_task_not_found");
      const active = this.db.prepare(`
        SELECT 1 AS value
        FROM scheduled_task_runs
        LEFT JOIN issues ON issues.id = scheduled_task_runs.issue_id
        WHERE scheduled_task_runs.scheduled_task_id = ?
          AND (
            scheduled_task_runs.status = 'pending'
            OR scheduled_task_runs.status = 'dispatched' AND issues.archived_at IS NULL AND issues.status NOT IN ('done', 'in_review', 'blocked')
          )
        LIMIT 1
      `).get(id);
      if (active) throw new Error("scheduled_task_running");
      const timestamp = now();
      runId = randomUUID();
      this.db.prepare(`
        INSERT INTO scheduled_task_runs (id, scheduled_task_id, issue_id, scheduled_for, status, attempts, available_at, error, created_at, updated_at)
        VALUES (?, ?, NULL, ?, 'pending', 0, ?, NULL, ?, ?)
      `).run(runId, id, timestamp, timestamp, timestamp, timestamp);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.listScheduledTaskRuns(id, 50).find(run => run.id === runId)!;
  }

  claimDueScheduledTasks(limit = 20) {
    const timestamp = now();
    const claimed: ScheduledTaskRun[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.db.prepare(`
        SELECT scheduled_tasks.*
        FROM scheduled_tasks
        WHERE scheduled_tasks.enabled = 1
          AND scheduled_tasks.next_run_at IS NOT NULL
          AND scheduled_tasks.next_run_at <= ?
          AND NOT EXISTS (
            SELECT 1
            FROM scheduled_task_runs
            LEFT JOIN issues ON issues.id = scheduled_task_runs.issue_id
            WHERE scheduled_task_runs.scheduled_task_id = scheduled_tasks.id
              AND (
                scheduled_task_runs.status = 'pending'
                OR scheduled_task_runs.status = 'dispatched' AND issues.archived_at IS NULL AND issues.status NOT IN ('done', 'in_review', 'blocked')
              )
          )
        ORDER BY scheduled_tasks.next_run_at
        LIMIT ?
      `).all(timestamp, Math.max(1, Math.min(100, Math.floor(limit)))) as Record<string, unknown>[];
      for (const row of rows) {
        const task = scheduledTaskFromRow(row);
        const runId = randomUUID();
        const scheduledFor = task.next_run_at!;
        this.db.prepare(`
          INSERT INTO scheduled_task_runs (id, scheduled_task_id, issue_id, scheduled_for, status, attempts, available_at, error, created_at, updated_at)
          VALUES (?, ?, NULL, ?, 'pending', 0, ?, NULL, ?, ?)
        `).run(runId, task.id, scheduledFor, timestamp, timestamp, timestamp);
        const nextRunAt = task.repeat ? nextScheduledTaskTime(task.starts_at, true, task.interval_value, task.interval_unit, Date.now()) : null;
        this.db.prepare("UPDATE scheduled_tasks SET enabled = ?, next_run_at = ?, last_run_at = ?, version = version + 1, updated_at = ? WHERE id = ?")
          .run(Number(task.repeat), nextRunAt, timestamp, timestamp, task.id);
        claimed.push(scheduledTaskRunFromRow({ id: runId, scheduled_task_id: task.id, issue_id: null, issue_identifier: null, issue_status: null, active_run_status: null, scheduled_for: scheduledFor, status: "pending", attempts: 0, error: null, created_at: timestamp, updated_at: timestamp }));
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return claimed;
  }

  listPendingScheduledTaskRuns(limit = 20): PendingScheduledTaskRun[] {
    const rows = this.db.prepare(`
      SELECT scheduled_task_runs.id AS pending_run_id, scheduled_task_runs.scheduled_for AS pending_scheduled_for,
        scheduled_task_runs.attempts AS pending_attempts, scheduled_task_runs.error AS pending_error,
        scheduled_task_runs.created_at AS pending_created_at, scheduled_task_runs.updated_at AS pending_updated_at,
        scheduled_tasks.*
      FROM scheduled_task_runs
      JOIN scheduled_tasks ON scheduled_tasks.id = scheduled_task_runs.scheduled_task_id
      WHERE scheduled_task_runs.status = 'pending' AND scheduled_task_runs.available_at <= ? AND scheduled_task_runs.attempts < 3
      ORDER BY scheduled_task_runs.available_at, scheduled_task_runs.created_at
      LIMIT ?
    `).all(now(), Math.max(1, Math.min(100, Math.floor(limit)))) as Record<string, unknown>[];
    return rows.map(row => ({
      run: scheduledTaskRunFromRow({
        id: row.pending_run_id,
        scheduled_task_id: row.id,
        issue_id: null,
        issue_identifier: null,
        issue_status: null,
        active_run_status: null,
        scheduled_for: row.pending_scheduled_for,
        status: "pending",
        attempts: row.pending_attempts,
        error: row.pending_error,
        created_at: row.pending_created_at,
        updated_at: row.pending_updated_at,
      }),
      task: scheduledTaskFromRow(row),
    }));
  }

  nextScheduledTaskAt() {
    const row = this.db.prepare(`
      SELECT MIN(value) AS value
      FROM (
        SELECT next_run_at AS value FROM scheduled_tasks WHERE enabled = 1 AND next_run_at IS NOT NULL
        UNION ALL
        SELECT available_at AS value FROM scheduled_task_runs WHERE status = 'pending' AND attempts < 3
      )
    `).get() as { value: string | null };
    return row.value || null;
  }

  attachScheduledTaskRun(runId: string, issueId: string) {
    const result = this.db.prepare("UPDATE scheduled_task_runs SET issue_id = ?, status = 'dispatched', error = NULL, updated_at = ? WHERE id = ? AND status = 'pending'").run(issueId, now(), runId);
    if (Number(result.changes) !== 1) throw new Error("scheduled_task_run_not_pending");
  }

  failScheduledTaskRun(runId: string, error: string) {
    const row = this.db.prepare("SELECT attempts FROM scheduled_task_runs WHERE id = ? AND status = 'pending'").get(runId) as { attempts: number } | undefined;
    if (!row) return;
    const attempts = Number(row.attempts) + 1;
    const status = attempts >= 3 ? "failed" : "pending";
    const retryDelay = [60_000, 300_000, 900_000][Math.min(attempts - 1, 2)];
    this.db.prepare("UPDATE scheduled_task_runs SET status = ?, attempts = ?, available_at = ?, error = ?, updated_at = ? WHERE id = ?")
      .run(status, attempts, new Date(Date.now() + retryDelay).toISOString(), error.slice(0, 2000), now(), runId);
  }

  getDefaultAgentMaxConcurrency() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'default_agent_max_concurrency'").get() as { value: string } | undefined;
    const value = Number(row?.value);
    return Number.isInteger(value) && value >= 1 && value <= agentMaxConcurrencyLimit ? value : defaultAgentMaxConcurrency;
  }

  setDefaultAgentMaxConcurrency(value: number) {
    const cleaned = cleanMaxConcurrency(value);
    this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('default_agent_max_concurrency', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(String(cleaned));
    return this.getDefaultAgentMaxConcurrency();
  }

  isDispatchable(issue: Issue) {
    return Boolean(
      issue.enrichment_status !== "pending"
      &&
      issue.needs_attention
      && issue.pending_actor === "agent"
      && issue.agent_enabled
      && !issue.archived_at
      && issue.status !== "backlog"
      && issue.status !== "done",
    );
  }

  isEnrichmentPending(issue: Issue) {
    return issue.enrichment_status === "pending";
  }

  listPendingEnrichmentIssues() {
    return this.listIssues().filter(issue => issue.enrichment_status === "pending");
  }

  canAutoStartFromUserMessage(issue: Issue) {
    return Boolean(this.getAutoDispatch() && !issue.archived_at && !["backlog", "done"].includes(issue.status));
  }

  private projectPlanningState(projectId: string): ProjectPlanningState {
    const session = this.db.prepare("SELECT agent_id, status, last_error, updated_at FROM project_planning_sessions WHERE project_id = ?").get(projectId) as { agent_id: string | null; status: string; last_error: string | null; updated_at: string } | undefined;
    const messages = (this.db.prepare(`
      SELECT id, role, markdown, html, created_at FROM (
        SELECT id, role, markdown, html, created_at FROM project_planning_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 80
      ) ORDER BY created_at
    `).all(projectId) as Array<{ id: string; role: "user" | "agent"; markdown: string; html: string; created_at: string }>);
    const revision = this.db.prepare("SELECT revision, plan_json, created_at FROM project_plan_revisions WHERE project_id = ? ORDER BY revision DESC LIMIT 1").get(projectId) as { revision: number; plan_json: string; created_at: string } | undefined;
    return {
      status: session && ["running", "ready", "failed"].includes(session.status) ? session.status as ProjectPlanningState["status"] : "idle",
      error: session?.last_error || null,
      agent_id: session?.agent_id || null,
      revision: Number(revision?.revision || 0),
      updated_at: session?.updated_at || revision?.created_at || null,
      messages,
      plan: projectPlanFromJson(revision?.plan_json),
    };
  }

  private withProjectPlanning(project: Project) {
    return { ...project, planning: this.projectPlanningState(project.id) };
  }

  listProjects() {
    return (this.db.prepare(`
      SELECT * FROM projects ORDER BY updated_at DESC, name COLLATE NOCASE
    `).all() as Array<Record<string, unknown>>).map(row => this.withProjectPlanning(projectFromRow(row)));
  }

  getProject(id: string) {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? this.withProjectPlanning(projectFromRow(row)) : undefined;
  }

  startProjectPlanningTurn(id: string, agentId: string, message: string) {
    const project = this.getProject(id);
    const markdown = message.trim().slice(0, 12000);
    if (!project) throw new Error("project_not_found");
    if (!markdown) throw new Error("project_planning_message_required");
    const session = this.db.prepare("SELECT thread_id, agent_id, status FROM project_planning_sessions WHERE project_id = ?").get(id) as { thread_id: string | null; agent_id: string | null; status: string } | undefined;
    if (session?.status === "running") throw new Error("project_planning_busy");
    if (session?.thread_id && session.agent_id !== (agentId || null)) throw new Error("project_planning_agent_locked");
    const timestamp = now();
    const messageId = randomUUID();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        INSERT INTO project_planning_sessions (project_id, thread_id, agent_id, status, last_error, created_at, updated_at)
        VALUES (?, ?, ?, 'running', NULL, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET agent_id = excluded.agent_id, status = 'running', last_error = NULL, updated_at = excluded.updated_at
      `).run(id, session?.thread_id || null, agentId || null, timestamp, timestamp);
      this.db.prepare("INSERT INTO project_planning_messages (id, project_id, role, markdown, html, created_at) VALUES (?, ?, 'user', ?, ?, ?)")
        .run(messageId, id, markdown, renderMarkdown(markdown), timestamp);
      this.db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { project: this.getProject(id)!, messageId, threadId: session?.thread_id || null };
  }

  finishProjectPlanningTurn(id: string, sourceMessageId: string, threadId: string, reply: string, plan: ProjectPlanSnapshot) {
    const session = this.db.prepare("SELECT status FROM project_planning_sessions WHERE project_id = ?").get(id) as { status: string } | undefined;
    if (session?.status !== "running") throw new Error("project_planning_not_running");
    const markdown = reply.trim().slice(0, 120000);
    if (!markdown) throw new Error("project_planning_invalid_output");
    const timestamp = now();
    const responseId = randomUUID();
    const current = this.db.prepare("SELECT MAX(revision) AS revision FROM project_plan_revisions WHERE project_id = ?").get(id) as { revision: number | null };
    const revision = Number(current.revision || 0) + 1;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO project_planning_messages (id, project_id, role, markdown, html, created_at) VALUES (?, ?, 'agent', ?, ?, ?)")
        .run(responseId, id, markdown, renderMarkdown(markdown), timestamp);
      this.db.prepare("INSERT INTO project_plan_revisions (id, project_id, revision, plan_json, source_message_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(randomUUID(), id, revision, JSON.stringify(plan), sourceMessageId, timestamp);
      this.db.prepare("UPDATE project_planning_sessions SET thread_id = ?, status = 'ready', last_error = NULL, updated_at = ? WHERE project_id = ?")
        .run(threadId, timestamp, id);
      this.db.prepare("DELETE FROM project_plan_revisions WHERE project_id = ? AND revision NOT IN (SELECT revision FROM project_plan_revisions WHERE project_id = ? ORDER BY revision DESC LIMIT 30)").run(id, id);
      this.db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getProject(id)!;
  }

  failProjectPlanningTurn(id: string, error: string) {
    const timestamp = now();
    this.db.prepare("UPDATE project_planning_sessions SET status = 'failed', last_error = ?, updated_at = ? WHERE project_id = ?")
      .run(error.slice(0, 2000), timestamp, id);
    this.db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, id);
    return this.getProject(id);
  }

  resetProjectPlanning(id: string) {
    if (!this.getProject(id)) throw new Error("project_not_found");
    const session = this.db.prepare("SELECT status FROM project_planning_sessions WHERE project_id = ?").get(id) as { status: string } | undefined;
    if (session?.status === "running") throw new Error("project_planning_busy");
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM project_plan_revisions WHERE project_id = ?").run(id);
      this.db.prepare("DELETE FROM project_planning_messages WHERE project_id = ?").run(id);
      this.db.prepare("DELETE FROM project_planning_sessions WHERE project_id = ?").run(id);
      this.db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getProject(id)!;
  }

  ensureProject(input: ProjectInput) {
    const name = cleanName(input.name);
    if (input.externalId) {
      const existing = this.db.prepare("SELECT id FROM projects WHERE external_id = ?").get(input.externalId) as { id: string } | undefined;
      if (existing) {
        const timestamp = input.updatedAt ?? now();
        const rootPaths = input.rootPaths?.map(value => value.trim()).filter(Boolean) || [];
        this.db.prepare("UPDATE projects SET name = ?, workspace_path = COALESCE(NULLIF(?, ''), workspace_path), root_paths_json = CASE WHEN ? = '[]' THEN root_paths_json ELSE ? END, description = COALESCE(NULLIF(?, ''), description), created_at = COALESCE(?, created_at), updated_at = MAX(updated_at, ?) WHERE id = ?")
          .run(name, input.workspacePath ?? rootPaths[0] ?? "", JSON.stringify(rootPaths), JSON.stringify(rootPaths), input.description ?? "", input.createdAt ?? null, timestamp, existing.id);
        return this.getProject(existing.id)!;
      }
    }
    return this.createProject({ ...input, name });
  }

  createProject(input: ProjectInput) {
    const name = cleanName(input.name);
    const id = input.id ?? randomUUID();
    const timestamp = now();
    const createdAt = input.createdAt ?? timestamp;
    const updatedAt = input.updatedAt ?? timestamp;
    const rootPaths = input.rootPaths?.map(value => value.trim()).filter(Boolean) || (input.workspacePath ? [input.workspacePath] : []);
    this.db.prepare(`
      INSERT INTO projects (
        id, external_id, identifier_prefix, name, workspace_path, root_paths_json, description, next_issue_number, default_branch, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'main', ?, ?)
    `).run(id, input.externalId ?? null, projectPrefix(name), name, input.workspacePath ?? rootPaths[0] ?? "", JSON.stringify(rootPaths), input.description ?? "", createdAt, updatedAt);
    return this.getProject(id)!;
  }

  startProjectOverview(id: string, agentId = "", feedback = "") {
    const project = this.getProject(id);
    if (!project || project.overview_status === "generating") return null;
    const views = project.document_views.map(view => ({ ...view, status: "queued" as const, error: null }));
    const timestamp = now();
    this.db.prepare("UPDATE projects SET project_documents_json = ?, document_agent_id = ?, document_feedback = ?, overview_status = 'generating', overview_error = NULL, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(views), agentId || null, feedback.trim().slice(0, 4000), timestamp, id);
    return this.getProject(id)!;
  }

  startProjectDocumentView(id: string, key: ProjectDocumentKey) {
    const project = this.getProject(id);
    if (!project) return null;
    const views = project.document_views.map(view => view.key === key ? { ...view, status: "generating" as const, error: null } : view);
    this.db.prepare("UPDATE projects SET project_documents_json = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(views), now(), id);
    return this.getProject(id);
  }

  finishProjectDocumentView(id: string, key: ProjectDocumentKey, markdown: string, html: string, diagram: ProjectDocumentView["diagram"], description = "") {
    const project = this.getProject(id);
    if (!project) return null;
    const timestamp = now();
    const views = project.document_views.map(view => view.key === key ? { ...view, status: "ready" as const, markdown: markdown.slice(0, 120000), html: html.slice(0, 500000), diagram, error: null, updated_at: timestamp } : view);
    this.db.prepare("UPDATE projects SET project_documents_json = ?, description = CASE WHEN ? != '' THEN ? ELSE description END, overview_html = CASE WHEN ? = 'charter' THEN ? ELSE overview_html END, overview_updated_at = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(views), description.trim(), description.trim().slice(0, 2000), key, html.slice(0, 500000), timestamp, timestamp, id);
    return this.getProject(id);
  }

  failProjectDocumentView(id: string, key: ProjectDocumentKey, error: string) {
    const project = this.getProject(id);
    if (!project) return null;
    const views = project.document_views.map(view => view.key === key ? { ...view, status: "failed" as const, error: error.slice(0, 2000) } : view);
    this.db.prepare("UPDATE projects SET project_documents_json = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(views), now(), id);
    return this.getProject(id);
  }

  finishProjectOverview(id: string) {
    const project = this.getProject(id);
    if (!project) return null;
    const failed = project.document_views.filter(view => view.status === "failed");
    const timestamp = now();
    this.db.prepare("UPDATE projects SET overview_status = ?, overview_error = ?, overview_updated_at = ?, updated_at = ? WHERE id = ?")
      .run(failed.length ? "failed" : "ready", failed.length ? `project_document_views_failed:${failed.map(view => view.key).join(",")}` : null, timestamp, timestamp, id);
    return this.getProject(id);
  }

  failProjectOverview(id: string, error: string) {
    const project = this.getProject(id);
    if (!project) return null;
    const message = error.slice(0, 2000);
    const views = project.document_views.map(view => ["queued", "generating"].includes(view.status) ? { ...view, status: "failed" as const, error: message } : view);
    this.db.prepare("UPDATE projects SET project_documents_json = ?, overview_status = 'failed', overview_error = ?, updated_at = ? WHERE id = ?")
      .run(JSON.stringify(views), message, now(), id);
    return this.getProject(id);
  }

  listAgentProfiles() {
    return this.db.prepare("SELECT * FROM agent_profiles ORDER BY name COLLATE NOCASE, created_at").all() as AgentProfile[];
  }

  getAgentProfile(id: string) {
    return this.db.prepare("SELECT * FROM agent_profiles WHERE id = ? OR role = ?").get(id, id) as AgentProfile | undefined;
  }

  getAgentAvatar(id: string) {
    const row = this.db.prepare("SELECT data_url FROM agent_avatars WHERE agent_id = ?").get(id) as { data_url: string } | undefined;
    return row?.data_url ?? "";
  }

  setAgentAvatar(id: string, dataUrl: string) {
    if (!dataUrl) {
      this.db.prepare("DELETE FROM agent_avatars WHERE agent_id = ?").run(id);
      return "";
    }
    this.db.prepare(`
      INSERT INTO agent_avatars (agent_id, data_url, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET data_url = excluded.data_url, updated_at = excluded.updated_at
    `).run(id, dataUrl, now());
    return dataUrl;
  }

  createAgentProfile(input: AgentProfileInput) {
    const profile = cleanAgentProfile(input);
    const id = randomUUID();
    const role = `better_codex_${id.replaceAll("-", "")}`;
    const timestamp = now();
    this.db.prepare(`
      INSERT INTO agent_profiles (id, role, name, name_en, description, instructions, model, reasoning_effort, service_tier, sandbox_mode, max_concurrency, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, role, profile.name, profile.name_en, profile.description, profile.instructions, profile.model, profile.reasoning_effort, profile.service_tier, profile.sandbox_mode, profile.max_concurrency, timestamp, timestamp);
    return this.getAgentProfile(id)!;
  }

  updateAgentProfile(id: string, version: number, patch: AgentProfilePatch) {
    const current = this.getAgentProfile(id);
    if (!current) throw new Error("agent_not_found");
    if (current.version !== version) throw new Error("version_conflict");
    const profile = cleanAgentProfile({
      name: patch.name ?? current.name,
      name_en: patch.name_en ?? current.name_en,
      description: patch.description ?? current.description,
      instructions: patch.instructions ?? current.instructions,
      model: patch.model ?? current.model,
      reasoning_effort: patch.reasoning_effort ?? current.reasoning_effort,
      service_tier: patch.service_tier ?? current.service_tier,
      sandbox_mode: patch.sandbox_mode ?? current.sandbox_mode ?? "workspace-write",
      max_concurrency: patch.max_concurrency ?? current.max_concurrency,
    });
    const result = this.db.prepare(`
      UPDATE agent_profiles SET name = ?, name_en = ?, description = ?, instructions = ?, model = ?, reasoning_effort = ?, service_tier = ?, sandbox_mode = ?, max_concurrency = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(profile.name, profile.name_en, profile.description, profile.instructions, profile.model, profile.reasoning_effort, profile.service_tier, profile.sandbox_mode, profile.max_concurrency, now(), current.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getAgentProfile(current.id)!;
  }

  deleteAgentProfile(id: string, version: number) {
    const profile = this.getAgentProfile(id);
    if (!profile) throw new Error("agent_not_found");
    if (profile.version !== version) throw new Error("version_conflict");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        UPDATE issues
        SET agent_enabled = 0,
            agent_id = NULL,
            user_assigned = 0,
            needs_attention = 0,
            pending_actor = 'user',
            version = version + 1,
            updated_at = ?
        WHERE agent_id = ?
      `).run(now(), profile.id);
      this.db.prepare("DELETE FROM agent_avatars WHERE agent_id = ?").run(profile.id);
      const result = this.db.prepare("DELETE FROM agent_profiles WHERE id = ? AND version = ?").run(profile.id, version);
      if (result.changes !== 1) throw new Error("version_conflict");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return profile;
  }

  listIssues(filters: { projectId?: string; search?: string; archived?: boolean } = {}) {
    const conditions = [filters.archived ? "issues.archived_at IS NOT NULL" : "issues.archived_at IS NULL"];
    const values: Array<string> = [];
    if (filters.projectId) {
      conditions.push("issues.project_id = ?");
      values.push(filters.projectId);
    }
    if (filters.search) {
      conditions.push("(issues.identifier LIKE ? OR issues.title LIKE ? OR issues.description LIKE ? OR issues.thread_id LIKE ? OR issue_sessions.thread_id LIKE ?)");
      const query = `%${filters.search}%`;
      values.push(query, query, query, query, query);
    }
    const rows = this.db.prepare(`
      SELECT issues.*, active_run.status AS active_run_status, active_run.started_at AS active_run_started_at,
        latest_run.status AS latest_run_status, latest_run.scheduler_status AS latest_scheduler_status,
        latest_run.scheduler_error AS latest_scheduler_error, latest_run.finished_at AS latest_run_finished_at,
        COALESCE(issue_sessions.thread_id, latest_thread.thread_id) AS run_thread_id,
        issue_sessions.thread_id AS session_thread_id,
        issue_sessions.status AS session_status,
        issue_sessions.active_turn_id AS session_active_turn_id,
        issue_sessions.last_error AS session_last_error, issue_sessions.updated_at AS session_updated_at,
        CASE WHEN issue_sessions.issue_id IS NULL THEN 0 ELSE 1 END AS session_owned,
        COALESCE((SELECT CASE WHEN session_relay.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END FROM session_relay WHERE singleton = 1), 0) AS session_relay_connected,
        (SELECT error FROM session_relay WHERE singleton = 1) AS session_relay_error
      FROM issues
      LEFT JOIN issue_sessions ON issue_sessions.issue_id = issues.id
      LEFT JOIN issue_runs AS active_run
        ON active_run.id = (
          SELECT issue_runs.id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        )
      LEFT JOIN issue_runs AS latest_run
        ON latest_run.id = (
          SELECT issue_runs.id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        )
      LEFT JOIN issue_runs AS latest_thread
        ON latest_thread.id = (
          SELECT issue_runs.id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.thread_id IS NOT NULL
            AND issue_runs.thread_id NOT LIKE 'local:%'
            AND issue_runs.thread_id NOT LIKE 'cloud:%'
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        )
      WHERE ${conditions.join(" AND ")}
      ORDER BY issues.pinned DESC, issues.sort_order, issues.created_at
    `).all(...values) as Record<string, unknown>[];
    return rows.map(issueFromRow);
  }

  getIssueByThreadId(threadId: string) {
    const candidates = [threadId, `local:${threadId}`, `cloud:${threadId}`];
    const rows = this.db.prepare(`
      SELECT issue_id, MIN(source_order) AS source_order
      FROM (
        SELECT issue_id, 0 AS source_order FROM issue_sessions WHERE thread_id IN (?, ?, ?)
        UNION ALL
        SELECT issue_id, 1 AS source_order FROM issue_runs WHERE thread_id IN (?, ?, ?)
        UNION ALL
        SELECT id AS issue_id, 2 AS source_order FROM issues WHERE thread_id IN (?, ?, ?)
      )
      GROUP BY issue_id
      ORDER BY source_order, issue_id
    `).all(...candidates, ...candidates, ...candidates) as Array<{ issue_id: string }>;
    if (rows.length > 1) throw new Error("thread_association_conflict");
    return rows[0] ? this.getIssue(rows[0].issue_id) : undefined;
  }

  private writeImportedSession(issueId: string, input: ImportedSessionInput, timestamp: string) {
    const status: IssueSessionStatus = input.active ? "active" : "idle";
    const activeTurnId = input.active && input.turnId ? input.turnId : null;
    const lastTurnId = !input.active && input.turnId ? input.turnId : null;
    this.db.prepare(`
      INSERT INTO issue_sessions (
        issue_id, host_id, thread_id, status, active_turn_id, active_command_id, last_turn_id,
        config_fingerprint, last_agent_message, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, '', NULL, ?, ?)
      ON CONFLICT(issue_id) DO UPDATE SET
        host_id = excluded.host_id,
        thread_id = excluded.thread_id,
        status = excluded.status,
        active_turn_id = excluded.active_turn_id,
        last_turn_id = COALESCE(excluded.last_turn_id, issue_sessions.last_turn_id),
        config_fingerprint = excluded.config_fingerprint,
        last_error = NULL,
        updated_at = excluded.updated_at
    `).run(issueId, input.hostId || "local", input.threadId, status, activeTurnId, lastTurnId, input.configFingerprint, timestamp, timestamp);
    this.db.prepare(`
      INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at)
      VALUES (?, ?, ?, '', NULL, ?, ?)
      ON CONFLICT(issue_id) DO UPDATE SET
        request_id = excluded.request_id,
        status = excluded.status,
        error = NULL,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at
    `).run(
      issueId,
      `import:${input.threadId}`,
      input.active ? "running" : "succeeded",
      input.startedAt || timestamp,
      input.active ? null : input.completedAt || timestamp,
    );
  }

  attachImportedSession(issueId: string, input: ImportedSessionInput) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(issueId);
      if (!issue) throw new Error("issue_not_found");
      const existing = this.getIssueSession(issueId);
      if (existing) {
        if (existing.thread_id !== input.threadId) throw new Error("issue_session_already_bound");
        const activeRun = this.db.prepare(`
          SELECT 1 AS value FROM issue_runs
          WHERE issue_id = ? AND status IN ('claimed', 'running', 'scheduling')
          LIMIT 1
        `).get(issueId) as { value: number } | undefined;
        if (existing.active_command_id || activeRun) {
          this.db.exec("COMMIT");
          return issue;
        }
      }
      const owner = this.getIssueSessionByThread(input.threadId);
      if (owner && owner.issue_id !== issueId) throw new Error("issue_session_already_bound");
      this.db.prepare(`
        UPDATE issues
        SET status = ?, needs_attention = ?, pending_actor = ?, version = version + 1, updated_at = ?
        WHERE id = ?
      `).run(input.active ? "in_progress" : "in_review", Number(!input.active), input.active ? "agent" : "user", timestamp, issueId);
      this.writeImportedSession(issueId, input, timestamp);
      this.db.exec("COMMIT");
      return this.getIssue(issueId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getIssue(id: string) {
    const row = this.db.prepare(`
      SELECT issues.*,
        (
          SELECT issue_runs.status
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS active_run_status,
        (
          SELECT issue_runs.started_at
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS active_run_started_at,
        (
          SELECT issue_runs.status
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS latest_run_status,
        (
          SELECT issue_runs.scheduler_status
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS latest_scheduler_status,
        (
          SELECT issue_runs.scheduler_error
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS latest_scheduler_error,
        (
          SELECT issue_runs.finished_at
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS latest_run_finished_at,
        COALESCE((
          SELECT issue_sessions.thread_id
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ), (
          SELECT issue_runs.thread_id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.thread_id IS NOT NULL
            AND issue_runs.thread_id NOT LIKE 'local:%'
            AND issue_runs.thread_id NOT LIKE 'cloud:%'
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        )) AS run_thread_id,
        (
          SELECT issue_sessions.thread_id
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ) AS session_thread_id,
        (
          SELECT issue_sessions.status
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ) AS session_status,
        (
          SELECT issue_sessions.active_turn_id
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ) AS session_active_turn_id,
        (
          SELECT issue_sessions.last_error
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ) AS session_last_error,
        (
          SELECT issue_sessions.updated_at
          FROM issue_sessions
          WHERE issue_sessions.issue_id = issues.id
        ) AS session_updated_at,
        EXISTS(SELECT 1 FROM issue_sessions WHERE issue_sessions.issue_id = issues.id) AS session_owned,
        COALESCE((SELECT CASE WHEN session_relay.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END FROM session_relay WHERE singleton = 1), 0) AS session_relay_connected,
        (SELECT error FROM session_relay WHERE singleton = 1) AS session_relay_error
      FROM issues
      WHERE issues.id = ? OR issues.identifier = ?
    `).get(id, id) as Record<string, unknown> | undefined;
    return row ? issueFromRow(row) : undefined;
  }

  createIssue(input: IssueInput) {
    return this.createIssueRequest(input).issue;
  }

  createIssueRequest(input: IssueInput, requestId = "") {
    const project = this.getProject(input.projectId);
    if (!project) throw new Error("project_not_found");
    if (requestId.length > 200 || requestId.includes("\0")) throw new Error("invalid_request_id");
    const requestFingerprint = requestId ? issueCreateFingerprint(input) : "";
    const enrichmentStatus = input.enrichmentStatus ?? null;
    const title = enrichmentStatus === "pending" ? "正在理解任务" : cleanTitle(input.title);
    if (input.status && !issueStatuses.includes(input.status)) throw new Error("invalid_status");
    if (input.priority && !issuePriorities.includes(input.priority)) throw new Error("invalid_priority");
    const importedSession = input.session;
    const userAssigned = Boolean(input.userAssigned) && !Boolean(input.agentEnabled) && !importedSession;
    const assigneeUserId = userAssigned ? String(input.assigneeUserId || "").trim() || null : null;
    if (assigneeUserId && (assigneeUserId.length > 200 || assigneeUserId.includes("\0"))) throw new Error("invalid_assignee_user_id");
    const agentId = input.agentEnabled && input.agentId ? input.agentId : null;
    if (agentId && !this.getAgentProfile(agentId)) throw new Error("agent_not_found");
    const agentEnabled = (Boolean(input.agentEnabled) || Boolean(importedSession)) && !userAssigned;
    if (enrichmentStatus !== null && enrichmentStatus !== "pending" && enrichmentStatus !== "failed") throw new Error("invalid_enrichment_status");
    const status = importedSession ? importedSession.active ? "in_progress" : "in_review" : enrichmentStatus === "pending" ? "backlog" : input.status ?? "todo";
    const userHandoff = status === "blocked" || status === "in_review";
    const needsAttention = importedSession ? Number(!importedSession.active) : userHandoff ? 1 : agentEnabled && status !== "backlog" && status !== "done" ? 1 : 0;
    const pendingActor = importedSession ? importedSession.active ? "agent" : "user" : agentEnabled && !userHandoff && status !== "done" ? "agent" : "user";
    const id = input.id ?? randomUUID();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(id)) throw new Error("invalid_issue_id");
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (requestId) {
        const existing = this.db.prepare("SELECT request_fingerprint, issue_id FROM issue_create_requests WHERE request_id = ?").get(requestId) as { request_fingerprint: string; issue_id: string } | undefined;
        if (existing) {
          if (existing.request_fingerprint !== requestFingerprint) throw new Error("request_id_conflict");
          const issue = this.getIssue(existing.issue_id);
          if (!issue) throw new Error("issue_not_found");
          this.db.exec("COMMIT");
          return { issue, replayed: true };
        }
      }
      const current = this.getProject(project.id)!;
      let issueNumber = current.next_issue_number;
      let identifier = `${current.identifier_prefix}-${issueNumber}`;
      while (this.db.prepare("SELECT 1 AS value FROM issues WHERE identifier = ?").get(identifier)) {
        issueNumber += 1;
        identifier = `${current.identifier_prefix}-${issueNumber}`;
      }
      const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM issues WHERE project_id = ? AND status = ?")
        .get(project.id, status) as { value: number };
      this.db.prepare(`
        INSERT INTO issues (
          id, identifier, project_id, title, description, status, priority, labels_json,
          sort_order, pinned, archived_at, thread_id, workspace_path, agent_enabled, agent_id, user_assigned, assignee_user_id,
           needs_attention, pending_actor, enrichment_status, version, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        identifier,
        project.id,
        title,
        input.description ?? "",
        status,
        input.priority ?? "medium",
        JSON.stringify(cleanLabels(input.labels ?? [])),
        Number(row.value) + 1000,
        input.threadId || null,
        input.workspacePath || null,
        Number(agentEnabled),
        agentId,
        Number(userAssigned),
        assigneeUserId,
        needsAttention,
        pendingActor,
        enrichmentStatus,
        timestamp,
        timestamp,
      );
      this.db.prepare("UPDATE projects SET next_issue_number = ?, updated_at = ? WHERE id = ?")
        .run(issueNumber + 1, timestamp, project.id);
      if (importedSession) this.writeImportedSession(id, importedSession, timestamp);
      if (requestId) {
        this.db.prepare("INSERT INTO issue_create_requests (request_id, request_fingerprint, issue_id, created_at) VALUES (?, ?, ?, ?)")
          .run(requestId, requestFingerprint, id, timestamp);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { issue: this.getIssue(id)!, replayed: false };
  }

  updateIssue(id: string, version: number, patch: IssuePatch) {
    const pendingActorProvided = patch.pending_actor !== undefined;
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    if (patch.title !== undefined) patch.title = cleanTitle(patch.title);
    if (patch.status !== undefined && !issueStatuses.includes(patch.status)) throw new Error("invalid_status");
    if (patch.priority !== undefined && !issuePriorities.includes(patch.priority)) throw new Error("invalid_priority");
    if (patch.labels !== undefined) patch.labels = cleanLabels(patch.labels);
    if (patch.sort_order !== undefined && !Number.isFinite(patch.sort_order)) throw new Error("invalid_sort_order");
    if (patch.agent_id && !this.getAgentProfile(patch.agent_id)) throw new Error("agent_not_found");
    if (patch.pending_actor !== undefined) patch.pending_actor = asPendingActor(patch.pending_actor);
    if (patch.assignee_user_id !== undefined && patch.assignee_user_id !== null && (patch.assignee_user_id.length > 200 || patch.assignee_user_id.includes("\0"))) throw new Error("invalid_assignee_user_id");
    if (patch.needs_attention !== undefined) patch.needs_attention = Boolean(patch.needs_attention);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(id);
      if (!issue) throw new Error("issue_not_found");
      if (issue.version !== version) throw new Error("version_conflict");
      if (issue.enrichment_status === "pending" && patch.enrichment_status === undefined) throw new Error("issue_enrichment_pending");
      if ((issue.run_thread_id || issue.active_run_status) && (patch.title !== undefined || patch.description !== undefined)) throw new Error("issue_execution_locked");
      if (patch.project_id !== undefined && !this.getProject(patch.project_id)) throw new Error("project_not_found");
      if (patch.user_assigned !== undefined) patch.user_assigned = Boolean(patch.user_assigned);
      if (patch.user_assigned === true) {
        patch.agent_enabled = false;
        patch.agent_id = null;
        if (patch.pending_actor === undefined) patch.pending_actor = "user";
      }
      if (patch.user_assigned === false) patch.assignee_user_id = null;
      if (patch.agent_enabled === false) {
        patch.agent_id = null;
        if (patch.pending_actor === undefined) patch.pending_actor = "user";
      }
      if (patch.agent_enabled === true) {
        patch.user_assigned = false;
        patch.assignee_user_id = null;
        if (patch.pending_actor === undefined) patch.pending_actor = "agent";
      }
      if (patch.status === "done") {
        patch.pending_actor = "user";
        patch.needs_attention = false;
      } else if ((patch.status === "blocked" || patch.status === "in_review") && !pendingActorProvided) {
        patch.pending_actor = "user";
        patch.needs_attention = true;
      }
      if (patch.needs_attention === undefined) {
        const nextStatus = patch.status ?? issue.status;
        const agentOwned = patch.pending_actor === "agent"
          || (patch.status !== undefined && issue.agent_enabled && issue.pending_actor === "agent");
        if (agentOwned && nextStatus !== "backlog" && nextStatus !== "done") patch.needs_attention = true;
      }
      if (patch.status === "backlog" && patch.needs_attention === undefined) patch.needs_attention = false;
      const projectChanged = patch.project_id !== undefined && patch.project_id !== issue.project_id;
      const statusChanged = patch.status !== undefined && patch.status !== issue.status;
      if ((projectChanged || statusChanged) && patch.sort_order === undefined) {
        const projectId = patch.project_id ?? issue.project_id;
        const status = patch.status ?? issue.status;
        const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM issues WHERE project_id = ? AND status = ? AND archived_at IS NULL")
          .get(projectId, status) as { value: number };
        patch.sort_order = Number(row.value) + 1000;
      }
      const columns: Record<keyof IssuePatch, string> = {
        project_id: "project_id",
        title: "title",
        description: "description",
        status: "status",
        priority: "priority",
        labels: "labels_json",
        sort_order: "sort_order",
        pinned: "pinned",
        thread_id: "thread_id",
        workspace_path: "workspace_path",
        agent_enabled: "agent_enabled",
        agent_id: "agent_id",
        user_assigned: "user_assigned",
        assignee_user_id: "assignee_user_id",
        needs_attention: "needs_attention",
        pending_actor: "pending_actor",
        enrichment_status: "enrichment_status",
        reply_draft: "reply_draft",
      };
      const assignments: string[] = [];
      const values: unknown[] = [];
      for (const [key, value] of Object.entries(patch) as Array<[keyof IssuePatch, IssuePatch[keyof IssuePatch]]>) {
        if (value === undefined) continue;
        assignments.push(`${columns[key]} = ?`);
        values.push(
          key === "labels" ? JSON.stringify(value)
            : key === "pinned" || key === "agent_enabled" || key === "user_assigned" || key === "needs_attention" ? Number(value)
              : key === "thread_id" || key === "workspace_path" || key === "agent_id" || key === "assignee_user_id" || key === "enrichment_status" ? value || null
                : value,
        );
      }
      if (assignments.length === 0) {
        this.db.exec("COMMIT");
        return issue;
      }
      assignments.push("version = version + 1", "updated_at = ?");
      values.push(now(), issue.id, version);
      const result = this.db.prepare(`UPDATE issues SET ${assignments.join(", ")} WHERE id = ? AND version = ?`).run(...values as never[]);
      if (result.changes !== 1) throw new Error("version_conflict");
      const updated = this.getIssue(issue.id)!;
      this.db.exec("COMMIT");
      return updated;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  archiveIssue(id: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    if (issue.enrichment_status === "pending") throw new Error("issue_enrichment_pending");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const timestamp = now();
      this.enqueueThreadAction(issue.id, "archive", timestamp);
      const result = this.db.prepare("UPDATE issues SET archived_at = ?, needs_attention = 0, pending_actor = 'user', version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
        .run(timestamp, timestamp, issue.id, version);
      if (result.changes !== 1) throw new Error("version_conflict");
      const updated = this.getIssue(issue.id)!;
      this.db.exec("COMMIT");
      return updated;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  unarchiveIssue(id: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const timestamp = now();
      this.enqueueThreadAction(issue.id, "unarchive", timestamp);
      const result = this.db.prepare("UPDATE issues SET archived_at = NULL, version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND archived_at IS NOT NULL")
        .run(timestamp, issue.id, version);
      if (result.changes !== 1) throw new Error("version_conflict");
      const updated = this.getIssue(issue.id)!;
      this.db.exec("COMMIT");
      return updated;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  deleteArchivedIssue(id: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    if (issue.enrichment_status === "pending") throw new Error("issue_enrichment_pending");
    if (issue.active_run_status || issue.session_active_turn_id || this.getIssueReplyState(issue.id).status === "running") throw new Error("issue_execution_running");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.enqueueThreadAction(issue.id, "delete", now());
      this.db.prepare("DELETE FROM issue_replies WHERE issue_id = ?").run(issue.id);
      this.db.prepare("DELETE FROM issue_runs WHERE issue_id = ?").run(issue.id);
      const result = this.db.prepare("DELETE FROM issues WHERE id = ? AND version = ?").run(issue.id, version);
      if (result.changes !== 1) throw new Error("version_conflict");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listIssueThreadIds(id: string) {
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    const rows = this.db.prepare("SELECT thread_id FROM issue_runs WHERE issue_id = ? AND thread_id IS NOT NULL UNION SELECT thread_id FROM issue_sessions WHERE issue_id = ? AND thread_id IS NOT NULL").all(id, id) as Array<{ thread_id: string }>;
    return [...new Set([issue.thread_id, ...rows.map(row => row.thread_id)].filter((value): value is string => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value)))];
  }

  listPendingThreadActions(limit = 16) {
    return this.db.prepare("SELECT thread_id, issue_id, action, event_id, attempts, available_at FROM thread_action_queue WHERE attempts < 5 AND available_at <= ? ORDER BY available_at, created_at LIMIT ?")
      .all(now(), limit) as PendingThreadAction[];
  }

  nextThreadActionAt() {
    const row = this.db.prepare("SELECT MIN(available_at) AS available_at FROM thread_action_queue WHERE attempts < 5").get() as { available_at: string | null };
    return row.available_at;
  }

  completeThreadAction(entry: PendingThreadAction) {
    this.db.prepare("DELETE FROM thread_action_queue WHERE thread_id = ? AND event_id = ?").run(entry.thread_id, entry.event_id);
  }

  failThreadAction(entry: PendingThreadAction, error: string) {
    const attempts = entry.attempts + 1;
    const delays = [1000, 5000, 30000, 120000, 600000];
    const availableAt = new Date(Date.now() + delays[Math.min(attempts - 1, delays.length - 1)]).toISOString();
    this.db.prepare("UPDATE thread_action_queue SET attempts = ?, available_at = ?, last_error = ?, updated_at = ? WHERE thread_id = ? AND event_id = ?")
      .run(attempts, availableAt, error.slice(0, 1000), now(), entry.thread_id, entry.event_id);
  }

  private enqueueThreadAction(issueId: string, action: IssueThreadAction, timestamp: string) {
    const statement = this.db.prepare(`
      INSERT INTO thread_action_queue (thread_id, issue_id, action, event_id, attempts, available_at, last_error, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, NULL, ?, ?)
      ON CONFLICT(thread_id) DO UPDATE SET
        issue_id = excluded.issue_id,
        action = excluded.action,
        event_id = excluded.event_id,
        attempts = 0,
        available_at = excluded.available_at,
        last_error = NULL,
        updated_at = excluded.updated_at
    `);
    for (const threadId of this.listIssueThreadIds(issueId)) statement.run(threadId, issueId, action, randomUUID(), timestamp, timestamp, timestamp);
  }

  recoverInterruptedRuns() {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.db.prepare("SELECT id, issue_id FROM issue_runs WHERE status IN ('claimed', 'running') AND execution_mode = 'cli'").all() as Array<{ id: string; issue_id: string }>;
      for (const row of rows) {
        this.db.prepare("UPDATE issue_runs SET status = 'interrupted', finished_at = ?, error = 'runtime_restarted' WHERE id = ?").run(timestamp, row.id);
        this.db.prepare(`
          UPDATE issues
          SET status = 'blocked',
              needs_attention = 1,
              pending_actor = 'user',
              version = version + 1,
              updated_at = ?
          WHERE id = ?
            AND status = 'in_progress'
        `).run(timestamp, row.issue_id);
      }
      this.db.prepare("UPDATE issue_runs SET scheduler_pid = NULL, scheduler_status = 'pending' WHERE status = 'scheduling'").run();
      this.db.exec("COMMIT");
      return rows.length;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  claimNextIssue(issueId?: string): ClaimedIssue | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (!issueId && !this.getAutoDispatch()) {
        this.db.exec("COMMIT");
        return null;
      }
      // Queueing is per agent: an issue is only claimable while its agent
      // (custom profile, or the default Codex profile for agent_id NULL) has
      // fewer active runs than its configured max_concurrency.
      const defaultAgentConcurrency = this.getDefaultAgentMaxConcurrency();
      const row = this.db.prepare(`
        SELECT issues.*, COALESCE(NULLIF(issues.workspace_path, ''), NULLIF(projects.workspace_path, ''), '') AS resolved_workspace
        FROM issues
        JOIN projects ON projects.id = issues.project_id
        LEFT JOIN agent_profiles ON agent_profiles.id = issues.agent_id
        WHERE issues.needs_attention = 1
          AND issues.pending_actor = 'agent'
          AND issues.agent_enabled = 1
          ${issueId ? "AND issues.id = ?" : ""}
          AND issues.archived_at IS NULL
          AND issues.status NOT IN ('backlog', 'done')
          AND (issues.workspace_path IS NOT NULL OR projects.workspace_path != '')
          AND NOT EXISTS (
            SELECT 1 FROM issue_runs
            WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running', 'scheduling')
          )
          AND (
            SELECT COUNT(*)
            FROM issue_runs
            JOIN issues AS active_issues ON active_issues.id = issue_runs.issue_id
            WHERE issue_runs.status IN ('claimed', 'running')
              AND COALESCE(active_issues.agent_id, '') = COALESCE(issues.agent_id, '')
          ) < COALESCE(agent_profiles.max_concurrency, ?)
        ORDER BY issues.pinned DESC,
          CASE issues.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
          issues.sort_order,
          issues.created_at
        LIMIT 1
      `).get(...(issueId ? [issueId, defaultAgentConcurrency] : [defaultAgentConcurrency])) as (Record<string, unknown> & { resolved_workspace: string }) | undefined;
      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }
      const { resolved_workspace, ...issueRow } = row;
      const issue = issueFromRow(issueRow);
      const runId = randomUUID();
      const timestamp = now();
      this.db.prepare("INSERT INTO issue_runs (id, issue_id, status, thread_id, started_at, execution_mode) VALUES (?, ?, 'claimed', NULL, ?, 'desktop')").run(runId, issue.id, timestamp);
      const result = this.db.prepare(`
        UPDATE issues
        SET status = 'in_progress',
            needs_attention = 0,
            version = version + 1,
            updated_at = ?
        WHERE id = ?
          AND version = ?
          AND needs_attention = 1
          AND pending_actor = 'agent'
          AND agent_enabled = 1
          AND status NOT IN ('backlog', 'done')
          AND (enrichment_status IS NULL OR enrichment_status != 'pending')
      `).run(timestamp, issue.id, issue.version);
      if (result.changes !== 1) throw new Error("claim_conflict");
      this.db.prepare("DELETE FROM issue_replies WHERE issue_id = ?").run(issue.id);
      if (issueId) this.dequeueManualStart(issue.id);
      this.db.exec("COMMIT");
      return { runId, issue: this.getIssue(issue.id)!, workspacePath: resolved_workspace };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  startRun(runId: string, pid: number) {
    this.db.prepare("UPDATE issue_runs SET status = 'running', pid = ? WHERE id = ? AND status = 'claimed'").run(pid, runId);
  }

  beginScheduling(runId: string, issueId: string, executionSuccess: boolean, executionError?: string) {
    const result = this.db.prepare(`
      UPDATE issue_runs
      SET status = 'scheduling',
          pid = NULL,
          execution_success = ?,
          execution_error = ?,
          scheduler_pid = NULL,
          scheduler_status = 'pending',
          scheduler_error = NULL
      WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running')
    `).run(Number(executionSuccess), executionError ?? null, runId, issueId);
    if (result.changes !== 1) throw new Error("run_transition_conflict");
  }

  listPendingSchedulerRuns(): PendingSchedulerRun[] {
    const rows = this.db.prepare(`
      SELECT issue_runs.id AS run_id,
        issue_runs.issue_id,
        issue_runs.execution_success,
        issue_runs.execution_error,
        issue_runs.execution_result,
        COALESCE(NULLIF(issues.workspace_path, ''), NULLIF(projects.workspace_path, ''), '') AS workspace_path
      FROM issue_runs
      JOIN issues ON issues.id = issue_runs.issue_id
      JOIN projects ON projects.id = issues.project_id
      WHERE issue_runs.status = 'scheduling'
      ORDER BY issue_runs.started_at, issue_runs.rowid
    `).all() as Array<{ run_id: string; issue_id: string; execution_success: number; execution_error: string | null; execution_result: string | null; workspace_path: string }>;
    return rows.flatMap(row => {
      const issue = this.getIssue(row.issue_id);
      if (!issue) return [];
      return [{
        claim: { runId: row.run_id, issue, workspacePath: row.workspace_path },
        executionSuccess: Boolean(row.execution_success),
        ...(row.execution_error ? { executionError: row.execution_error } : {}),
        executionResult: row.execution_result || "",
      }];
    });
  }

  startScheduler(runId: string, pid: number) {
    const result = this.db.prepare(`
      UPDATE issue_runs
      SET scheduler_pid = ?, scheduler_status = 'running', scheduler_error = NULL, scheduler_attempts = scheduler_attempts + 1
      WHERE id = ? AND status = 'scheduling'
    `).run(pid, runId);
    if (result.changes !== 1) throw new Error("run_transition_conflict");
  }

  pauseScheduler(runId: string) {
    this.db.prepare("UPDATE issue_runs SET scheduler_pid = NULL, scheduler_status = 'pending' WHERE id = ? AND status = 'scheduling'").run(runId);
  }

  finalizeScheduler(runId: string, issueId: string, executionSuccess: boolean, decision: SchedulerDecision | null, schedulerError?: string) {
    const timestamp = now();
    const status: IssueStatus = executionSuccess ? decision?.status || "in_review" : "blocked";
    const finalSchedulerError = schedulerError ?? (!decision ? "scheduler_invalid_output" : !executionSuccess && decision.status !== "blocked" ? "scheduler_decision_overridden" : null);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare(`
        UPDATE issue_runs
        SET status = ?,
            finished_at = ?,
            error = execution_error,
            scheduler_pid = NULL,
            scheduler_status = ?,
            scheduler_error = ?,
            scheduler_result = ?
        WHERE id = ? AND issue_id = ? AND status = 'scheduling'
      `).run(
        status === "blocked" ? "failed" : "completed",
        timestamp,
        decision ? "completed" : "failed",
        finalSchedulerError,
        decision ? JSON.stringify(decision) : null,
        runId,
        issueId,
      );
      if (result.changes !== 1) throw new Error("run_transition_conflict");
      this.db.prepare(`
        UPDATE issues
        SET status = ?,
            needs_attention = ?,
            pending_actor = 'user',
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND status = 'in_progress'
      `).run(status, Number(status !== "done"), timestamp, issueId);
      this.db.exec("COMMIT");
      return status;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  setRunWorkspace(issueId: string, workspacePath: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(issueId);
      if (!issue) throw new Error("issue_not_found");
      this.db.prepare("UPDATE issues SET workspace_path = ?, version = version + 1, updated_at = ? WHERE id = ?").run(workspacePath, timestamp, issue.id);
      this.db.prepare("UPDATE projects SET workspace_path = ?, updated_at = ? WHERE id = ? AND workspace_path = ''").run(workspacePath, timestamp, issue.project_id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  linkRunThread(runId: string, issueId: string, threadId: string) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE issue_runs SET thread_id = ? WHERE id = ?").run(threadId, runId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  handoffIssueSession(issueId: string, threadId: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(issueId);
      if (!issue) throw new Error("issue_not_found");
      if (!issue.run_thread_id || issue.run_thread_id !== threadId) throw new Error("issue_session_mismatch");
      if (!issue.session_handoff_at) {
        this.db.prepare(`
          UPDATE issues
          SET session_handoff_at = ?,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND session_handoff_at IS NULL
        `).run(timestamp, timestamp, issueId);
      }
      this.db.exec("COMMIT");
      return this.getIssue(issueId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  beginReplyRun(issueId: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(issueId);
      if (!issue) throw new Error("issue_not_found");
      if (issue.archived_at) throw new Error("issue_archived");
      if (issue.session_handoff_at && !issue.session_owned) throw new Error("issue_session_handed_off");
      if (issue.active_run_status) throw new Error("issue_execution_running");
      if (this.getIssueReplyState(issueId).status === "running") throw new Error("reply_busy");
      this.db.prepare(`
        UPDATE issues
        SET status = 'in_progress',
            needs_attention = 0,
            pending_actor = 'agent',
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND archived_at IS NULL
      `).run(timestamp, issueId);
      this.db.exec("COMMIT");
      return this.getIssue(issueId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  finishReplyRun(issueId: string, success: boolean) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        UPDATE issues
        SET status = ?,
            needs_attention = 1,
            pending_actor = 'user',
            version = version + 1,
            updated_at = ?
        WHERE id = ?
          AND status = 'in_progress'
          AND archived_at IS NULL
      `).run(success ? "in_review" : "blocked", timestamp, issueId);
      this.db.exec("COMMIT");
    } catch (caught) {
      this.db.exec("ROLLBACK");
      throw caught;
    }
  }

  finishRun(runId: string, issueId: string, success: boolean, error?: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare("UPDATE issue_runs SET status = ?, finished_at = ?, error = ? WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running')")
        .run(success ? "completed" : "failed", timestamp, error ?? null, runId, issueId);
      // Safety net only while the board was left mid-run. If the agent already
      // finalized via CLI (done / in_review / blocked / re-queued), keep that.
      // Failures hand back to the user so auto-dispatch cannot loop forever.
      if (result.changes === 1) {
        this.db.prepare(`
          UPDATE issues
          SET status = ?,
              needs_attention = 1,
              pending_actor = 'user',
              version = version + 1,
              updated_at = ?
          WHERE id = ?
            AND status = 'in_progress'
            AND NOT EXISTS (
              SELECT 1 FROM issue_runs
              WHERE issue_runs.issue_id = issues.id
                AND issue_runs.status IN ('claimed', 'running')
            )
        `).run(success ? "in_review" : "blocked", timestamp, issueId);
      }
      this.db.exec("COMMIT");
    } catch (caught) {
      this.db.exec("ROLLBACK");
      throw caught;
    }
  }

  interruptRun(runId: string, issueId: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare("UPDATE issue_runs SET status = 'interrupted', finished_at = ?, error = 'runtime_stopped', scheduler_pid = NULL, scheduler_status = CASE WHEN status = 'scheduling' THEN 'interrupted' ELSE scheduler_status END WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running', 'scheduling')").run(timestamp, runId, issueId);
      if (result.changes === 1) {
        this.db.prepare(`
          UPDATE issues
          SET needs_attention = CASE WHEN status = 'done' THEN needs_attention ELSE 1 END,
              pending_actor = CASE WHEN status = 'done' THEN pending_actor ELSE 'user' END,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND archived_at IS NULL
        `).run(timestamp, issueId);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  reconcileInterruptedRun(issueId: string, threadId: string, completedAt: string, startedAt?: string | null) {
    const timestamp = now();
    const completedTime = Date.parse(completedAt);
    const startedTime = startedAt ? Date.parse(startedAt) : null;
    if (!Number.isFinite(completedTime) || (startedTime !== null && !Number.isFinite(startedTime))) return false;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const run = this.db.prepare(`
        SELECT interrupted.id, interrupted.finished_at
        FROM issue_runs AS interrupted
        JOIN issues ON issues.id = interrupted.issue_id
        WHERE interrupted.issue_id = ?
          AND interrupted.thread_id = ?
          AND interrupted.status = 'interrupted'
          AND issues.status = 'blocked'
          AND interrupted.id = (
            SELECT latest.id
            FROM issue_runs AS latest
            WHERE latest.issue_id = interrupted.issue_id
            ORDER BY latest.started_at DESC, latest.rowid DESC
            LIMIT 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM issue_runs AS active
            WHERE active.issue_id = interrupted.issue_id
              AND active.status IN ('claimed', 'running', 'scheduling')
          )
      `).get(issueId, threadId) as { id: string; finished_at: string | null } | undefined;
      const finishedTime = Date.parse(run?.finished_at || "");
      if (!run || !Number.isFinite(finishedTime) || completedTime <= finishedTime || (startedTime !== null && startedTime > finishedTime)) {
        this.db.exec("COMMIT");
        return false;
      }
      const issueResult = this.db.prepare(`
        UPDATE issues
        SET status = 'in_review',
            needs_attention = 1,
            pending_actor = 'user',
            version = version + 1,
            updated_at = ?
        WHERE id = ?
          AND status = 'blocked'
          AND ? = (
            SELECT latest.id
            FROM issue_runs AS latest
            WHERE latest.issue_id = issues.id
            ORDER BY latest.started_at DESC, latest.rowid DESC
            LIMIT 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM issue_runs AS active
            WHERE active.issue_id = issues.id
              AND active.status IN ('claimed', 'running', 'scheduling')
          )
      `).run(timestamp, issueId, run.id);
      if (issueResult.changes !== 1) {
        this.db.exec("COMMIT");
        return false;
      }
      const runResult = this.db.prepare(`
        UPDATE issue_runs
        SET status = 'completed', finished_at = ?, error = NULL, execution_success = 1, execution_error = NULL
        WHERE id = ? AND issue_id = ? AND thread_id = ? AND status = 'interrupted'
      `).run(completedAt, run.id, issueId, threadId);
      if (runResult.changes !== 1) throw new Error("run_transition_conflict");
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  syncSessionReply(issueId: string, threadId: string, activity: {
    status: "idle" | "running" | "completed" | "interrupted";
    turn_id: string | null;
    started_at: string | null;
    completed_at: string | null;
    updated_at: string | null;
  }) {
    if (activity.status === "idle") return false;
    const startedTime = Date.parse(activity.started_at || "");
    const evidenceAt = activity.status === "running" ? activity.updated_at : activity.completed_at;
    const evidenceTime = Date.parse(evidenceAt || "");
    if (!Number.isFinite(startedTime) || !Number.isFinite(evidenceTime)) return false;
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.db.prepare(`
        SELECT issues.status, issues.updated_at
        FROM issues
        WHERE issues.id = ?
          AND issues.status != 'done'
          AND issues.archived_at IS NULL
          AND ? = (
            SELECT latest.thread_id
            FROM issue_runs AS latest
            WHERE latest.issue_id = issues.id
              AND latest.thread_id IS NOT NULL
              AND latest.thread_id NOT LIKE 'local:%'
              AND latest.thread_id NOT LIKE 'cloud:%'
            ORDER BY latest.started_at DESC, latest.rowid DESC
            LIMIT 1
          )
          AND NOT EXISTS (
            SELECT 1 FROM issue_runs AS active
            WHERE active.issue_id = issues.id
              AND active.status IN ('claimed', 'running', 'scheduling')
          )
      `).get(issueId, threadId) as { status: IssueStatus; updated_at: string } | undefined;
      const reply = this.db.prepare("SELECT request_id, status, message, error, started_at, finished_at FROM issue_replies WHERE issue_id = ?").get(issueId) as {
        request_id: string;
        status: IssueReplyStatus;
        message: string;
        error: string | null;
        started_at: string;
        finished_at: string | null;
      } | undefined;
      if (!issue) {
        this.db.exec("COMMIT");
        return false;
      }
      if (activity.status === "running" && reply?.status === "running" && issue.status === "in_progress") {
        this.db.exec("COMMIT");
        return false;
      }
      if (activity.status === "completed" && reply?.status === "succeeded" && issue.status === "in_review") {
        this.db.exec("COMMIT");
        return false;
      }
      if (activity.status === "interrupted" && reply?.status === "interrupted" && ["in_progress", "blocked"].includes(issue.status)) {
        this.db.exec("COMMIT");
        return false;
      }
      const issueUpdatedTime = Date.parse(issue.updated_at) || 0;
      const replyStartedTime = Date.parse(reply?.started_at || "") || 0;
      const replyFinishedTime = Date.parse(reply?.finished_at || "") || 0;
      const baseline = Math.max(issueUpdatedTime, replyFinishedTime);
      const sessionRequestId = `session:${activity.turn_id || activity.started_at}`;
      const sameTrackedTurn = reply?.request_id === sessionRequestId;
      const unchangedRuntimeInterruption = reply?.status === "interrupted"
        && reply.error === "runtime_restarted"
        && issue.status === "blocked"
        && replyFinishedTime > 0
        && issueUpdatedTime <= replyFinishedTime;
      if (reply?.status === "interrupted" && reply.error === "runtime_restarted" && !unchangedRuntimeInterruption) {
        this.db.exec("COMMIT");
        return false;
      }
      const recoverRuntimeTurn = unchangedRuntimeInterruption
        && startedTime >= replyStartedTime
        && (sameTrackedTurn || startedTime <= replyFinishedTime);
      if (!recoverRuntimeTurn && (sameTrackedTurn ? evidenceTime <= baseline : startedTime <= baseline)) {
        this.db.exec("COMMIT");
        return false;
      }
      const replyStatus: IssueReplyStatus = activity.status === "running" ? "running" : activity.status === "completed" ? "succeeded" : "interrupted";
      const replyError = activity.status === "interrupted" ? "session_interrupted" : null;
      this.db.prepare(`
        INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(issue_id) DO UPDATE SET
          request_id = excluded.request_id,
          status = excluded.status,
          error = excluded.error,
          started_at = excluded.started_at,
          finished_at = excluded.finished_at
      `).run(
        issueId,
        sessionRequestId,
        replyStatus,
        reply?.message || "",
        replyError,
        activity.started_at,
        activity.status === "running" ? null : activity.completed_at,
      );
      const issueResult = this.db.prepare(`
        UPDATE issues
        SET status = ?,
            needs_attention = ?,
            pending_actor = ?,
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND status = ? AND updated_at = ? AND archived_at IS NULL
      `).run(
        activity.status === "running" ? "in_progress" : activity.status === "completed" ? "in_review" : issue.status,
        Number(activity.status !== "running"),
        activity.status === "running" ? "agent" : "user",
        timestamp,
        issueId,
        issue.status,
        issue.updated_at,
      );
      if (issueResult.changes !== 1) throw new Error("reply_transition_conflict");
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  hasActiveIssueRuns() {
    const run = this.db.prepare("SELECT 1 AS value FROM issue_runs WHERE status IN ('claimed', 'running', 'scheduling') LIMIT 1").get();
    const command = this.db.prepare("SELECT 1 AS value FROM session_commands WHERE status IN ('pending', 'claimed') LIMIT 1").get();
    const turn = this.db.prepare("SELECT 1 AS value FROM issue_sessions WHERE active_turn_id IS NOT NULL LIMIT 1").get();
    const reply = this.db.prepare("SELECT 1 AS value FROM issue_replies WHERE status = 'running' LIMIT 1").get();
    return Boolean(run || command || turn || reply);
  }

  getIssueSession(issueId: string): IssueSession | undefined {
    const row = this.db.prepare("SELECT * FROM issue_sessions WHERE issue_id = ?").get(issueId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return {
      issue_id: String(row.issue_id),
      host_id: String(row.host_id),
      thread_id: String(row.thread_id),
      status: String(row.status) as IssueSessionStatus,
      active_turn_id: row.active_turn_id ? String(row.active_turn_id) : null,
      active_command_id: row.active_command_id ? String(row.active_command_id) : null,
      last_turn_id: row.last_turn_id ? String(row.last_turn_id) : null,
      config_fingerprint: String(row.config_fingerprint || ""),
      last_agent_message: String(row.last_agent_message || ""),
      last_error: row.last_error ? String(row.last_error) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  getIssueSessionByThread(threadId: string) {
    const row = this.db.prepare("SELECT issue_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string } | undefined;
    return row ? this.getIssueSession(row.issue_id) : undefined;
  }

  listSessionThreadIds() {
    return (this.db.prepare("SELECT thread_id FROM issue_sessions ORDER BY created_at").all() as Array<{ thread_id: string }>).map(row => row.thread_id);
  }

  listActiveIssueSessions() {
    return (this.db.prepare("SELECT issue_id FROM issue_sessions WHERE active_turn_id IS NOT NULL OR active_command_id IS NOT NULL ORDER BY updated_at").all() as Array<{ issue_id: string }>).flatMap(row => {
      const session = this.getIssueSession(row.issue_id);
      return session ? [session] : [];
    });
  }

  enqueueSessionCommand(input: {
    issueId: string;
    runId?: string | null;
    requestId: string;
    kind: SessionCommandKind;
    threadId?: string | null;
    turnId?: string | null;
    payload?: Record<string, unknown>;
    hostId?: string;
    replaceSession?: boolean;
  }) {
    const fingerprint = sessionCommandFingerprint(input);
    const timestamp = now();
    let commandId = "";
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(input.issueId);
      if (!issue) throw new Error("issue_not_found");
      if (issue.archived_at) throw new Error("issue_archived");
      const existing = this.db.prepare("SELECT * FROM session_commands WHERE issue_id = ? AND request_id = ?").get(input.issueId, input.requestId) as Record<string, unknown> | undefined;
      if (existing) {
        const command = sessionCommandFromRow(existing);
        if (command.request_fingerprint !== fingerprint) throw new Error("request_id_conflict");
        commandId = command.id;
        if (command.status === "failed" || command.status === "cancelled") {
          if (input.replaceSession) {
            const detached = this.db.prepare("DELETE FROM issue_sessions WHERE issue_id = ? AND active_turn_id IS NULL").run(input.issueId);
            if (detached.changes !== 1) throw new Error("issue_session_replace_conflict");
          }
          this.db.prepare(`
            UPDATE session_commands
            SET run_id = ?, kind = ?, host_id = ?, thread_id = ?, turn_id = ?, payload_json = ?,
                status = 'pending', result_json = NULL, relay_id = NULL, cancel_requested = 0,
                attempts = 0, error = NULL, claimed_at = NULL, finished_at = NULL, created_at = ?
            WHERE id = ? AND status IN ('failed', 'cancelled')
          `).run(input.runId || null, input.kind, input.hostId || "local", input.threadId || null, input.turnId || null, JSON.stringify(input.payload || {}), timestamp, command.id);
        }
      } else {
        if (input.replaceSession) {
          const detached = this.db.prepare("DELETE FROM issue_sessions WHERE issue_id = ? AND active_turn_id IS NULL").run(input.issueId);
          if (detached.changes !== 1) throw new Error("issue_session_replace_conflict");
        }
        commandId = randomUUID();
        this.db.prepare(`
          INSERT INTO session_commands (
            id, issue_id, run_id, request_id, request_fingerprint, kind, status, host_id, thread_id, turn_id,
            payload_json, attempts, cancel_requested, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, 0, ?)
        `).run(
          commandId,
          input.issueId,
          input.runId || null,
          input.requestId,
          fingerprint,
          input.kind,
          input.hostId || "local",
          input.threadId || null,
          input.turnId || null,
          JSON.stringify(input.payload || {}),
          timestamp,
        );
      }
      this.db.exec("COMMIT");
      return this.getSessionCommand(commandId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  hasActiveAgentSessionWork(agentId: string | null) {
    return Boolean(this.db.prepare(`
      SELECT 1 AS value
      FROM issues
      WHERE COALESCE(agent_id, '') = COALESCE(?, '')
        AND (
          EXISTS (SELECT 1 FROM issue_runs WHERE issue_runs.issue_id = issues.id AND issue_runs.status IN ('claimed', 'running', 'scheduling'))
          OR EXISTS (SELECT 1 FROM session_commands WHERE session_commands.issue_id = issues.id AND session_commands.status IN ('pending', 'claimed'))
          OR EXISTS (SELECT 1 FROM issue_replies WHERE issue_replies.issue_id = issues.id AND issue_replies.status = 'running')
          OR EXISTS (SELECT 1 FROM issue_sessions WHERE issue_sessions.issue_id = issues.id AND issue_sessions.active_turn_id IS NOT NULL)
        )
      LIMIT 1
    `).get(agentId));
  }

  enqueueSessionReply(input: {
    issueId: string;
    requestId: string;
    kind: "start" | "turn";
    threadId?: string | null;
    payload: Record<string, unknown>;
    message: string;
    hostId?: string;
    replaceSession?: boolean;
  }) {
    const fingerprint = sessionCommandFingerprint(input);
    const timestamp = now();
    let commandId = "";
    let replayed = false;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(input.issueId);
      if (!issue) throw new Error("issue_not_found");
      if (issue.archived_at) throw new Error("issue_archived");
      const existingRow = this.db.prepare("SELECT * FROM session_commands WHERE issue_id = ? AND request_id = ?").get(input.issueId, input.requestId) as Record<string, unknown> | undefined;
      if (existingRow) {
        const existing = sessionCommandFromRow(existingRow);
        if (existing.request_fingerprint !== fingerprint) throw new Error("request_id_conflict");
        commandId = existing.id;
        if (existing.status !== "failed" && existing.status !== "cancelled") {
          replayed = true;
          this.db.exec("COMMIT");
          return { command: this.getSessionCommand(commandId)!, replayed };
        }
      }
      if (issue.session_handoff_at && !issue.session_owned) throw new Error("issue_session_handed_off");
      if (issue.active_run_status) throw new Error("issue_execution_running");
      const reply = this.getIssueReplyState(input.issueId);
      if (reply.status === "running" && reply.request_id !== input.requestId) throw new Error("reply_busy");
      if (input.replaceSession) {
        const detached = this.db.prepare("DELETE FROM issue_sessions WHERE issue_id = ? AND active_turn_id IS NULL").run(input.issueId);
        if (detached.changes !== 1) throw new Error("issue_session_replace_conflict");
      }
      this.db.prepare(`
        UPDATE issues
        SET status = 'in_progress',
            needs_attention = 0,
            pending_actor = 'agent',
            version = version + 1,
            updated_at = ?
        WHERE id = ? AND archived_at IS NULL
      `).run(timestamp, input.issueId);
      this.db.prepare(`
        INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at)
        VALUES (?, ?, 'running', ?, NULL, ?, NULL)
        ON CONFLICT(issue_id) DO UPDATE SET
          request_id = excluded.request_id,
          status = 'running',
          message = excluded.message,
          error = NULL,
          started_at = excluded.started_at,
          finished_at = NULL
      `).run(input.issueId, input.requestId, input.message, timestamp);
      if (commandId) {
        this.db.prepare(`
          UPDATE session_commands
          SET kind = ?, host_id = ?, thread_id = ?, turn_id = NULL, payload_json = ?,
              status = 'pending', result_json = NULL, relay_id = NULL, cancel_requested = 0,
              attempts = 0, error = NULL, claimed_at = NULL, finished_at = NULL, created_at = ?
          WHERE id = ? AND status IN ('failed', 'cancelled')
        `).run(input.kind, input.hostId || "local", input.threadId || null, JSON.stringify(input.payload), timestamp, commandId);
      } else {
        commandId = randomUUID();
        this.db.prepare(`
          INSERT INTO session_commands (
            id, issue_id, run_id, request_id, request_fingerprint, kind, status, host_id, thread_id, turn_id,
            payload_json, attempts, cancel_requested, created_at
          ) VALUES (?, ?, NULL, ?, ?, ?, 'pending', ?, ?, NULL, ?, 0, 0, ?)
        `).run(
          commandId,
          input.issueId,
          input.requestId,
          fingerprint,
          input.kind,
          input.hostId || "local",
          input.threadId || null,
          JSON.stringify(input.payload),
          timestamp,
        );
      }
      this.db.exec("COMMIT");
      return { command: this.getSessionCommand(commandId)!, replayed };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getSessionCommand(id: string) {
    const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? sessionCommandFromRow(row) : undefined;
  }

  getActiveSessionCommand(issueId: string) {
    const row = this.db.prepare(`
      SELECT * FROM session_commands
      WHERE issue_id = ? AND status IN ('pending', 'claimed')
      ORDER BY CASE kind WHEN 'interrupt' THEN 0 ELSE 1 END, created_at, rowid
      LIMIT 1
    `).get(issueId) as Record<string, unknown> | undefined;
    return row ? sessionCommandFromRow(row) : undefined;
  }

  listActiveSessionCommands(issueId: string) {
    return (this.db.prepare(`
      SELECT * FROM session_commands
      WHERE issue_id = ? AND status IN ('pending', 'claimed')
      ORDER BY CASE kind WHEN 'interrupt' THEN 0 ELSE 1 END, created_at, rowid
    `).all(issueId) as Record<string, unknown>[]).map(sessionCommandFromRow);
  }

  heartbeatSessionRelay(relayId: string, appSessionId: string, capabilityError?: string | null) {
    const timestamp = now();
    const expiresAt = new Date(Date.now() + 6000).toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.db.prepare("SELECT relay_id, app_session_id, expires_at, error FROM session_relay WHERE singleton = 1").get() as { relay_id: string; app_session_id: string; expires_at: string; error: string | null } | undefined;
      const leader = !current || current.relay_id === relayId || Date.parse(current.expires_at) <= Date.now();
      const acquired = leader && current?.relay_id !== relayId;
      if (leader) {
        const relayError = capabilityError === undefined ? current?.error || null : capabilityError;
        this.db.prepare(`
          INSERT INTO session_relay (singleton, relay_id, app_session_id, expires_at, error, updated_at)
          VALUES (1, ?, ?, ?, ?, ?)
          ON CONFLICT(singleton) DO UPDATE SET
            relay_id = excluded.relay_id,
            app_session_id = excluded.app_session_id,
            expires_at = excluded.expires_at,
            error = excluded.error,
            updated_at = excluded.updated_at
        `).run(relayId, appSessionId, expiresAt, relayError, timestamp);
      }
      this.db.exec("COMMIT");
      return { leader, acquired, expires_at: leader ? expiresAt : current?.expires_at || expiresAt, previous_relay_id: acquired ? current?.relay_id || null : null };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  getSessionCommandByRequest(issueId: string, requestId: string) {
    const row = this.db.prepare("SELECT * FROM session_commands WHERE issue_id = ? AND request_id = ?").get(issueId, requestId) as Record<string, unknown> | undefined;
    return row ? sessionCommandFromRow(row) : undefined;
  }

  releaseSessionRelay(relayId: string, error: string) {
    const timestamp = now();
    this.db.prepare(`
      UPDATE session_relay
      SET expires_at = ?, error = ?, updated_at = ?
      WHERE singleton = 1 AND relay_id = ?
    `).run(timestamp, error, timestamp, relayId);
  }

  sessionRelayIsLeader(relayId: string) {
    const row = this.db.prepare("SELECT relay_id, expires_at FROM session_relay WHERE singleton = 1").get() as { relay_id: string; expires_at: string } | undefined;
    return Boolean(row && row.relay_id === relayId && Date.parse(row.expires_at) > Date.now());
  }

  failClaimedSessionCommands(relayId?: string) {
    const timestamp = now();
    const rows = this.db.prepare(`
      SELECT * FROM session_commands
      WHERE status = 'claimed' ${relayId ? "AND relay_id != ?" : ""}
    `).all(...(relayId ? [relayId] : [])) as Record<string, unknown>[];
    const failed: SessionCommand[] = [];
    for (const row of rows) {
      const command = sessionCommandFromRow(row);
      const active = command.kind === "interrupt" && command.turn_id
        ? this.db.prepare("SELECT 1 AS value FROM issue_sessions WHERE issue_id = ? AND active_turn_id = ?").get(command.issue_id, command.turn_id)
        : undefined;
      if (active && command.attempts < 3) {
        this.db.prepare(`
          UPDATE session_commands
          SET status = 'pending', relay_id = NULL, claimed_at = NULL, error = NULL, finished_at = NULL
          WHERE id = ? AND status = 'claimed'
        `).run(command.id);
        continue;
      }
      const commandError = (command.kind === "start" || command.kind === "turn") && command.thread_id
        ? "session_outcome_unknown"
        : relayId ? "relay_replaced" : "runtime_restarted";
      this.db.prepare(`
        UPDATE session_commands
        SET status = 'failed', error = ?, finished_at = ?
        WHERE id = ? AND status = 'claimed'
      `).run(commandError, timestamp, command.id);
      if (command.kind === "interrupt") {
        this.db.prepare("UPDATE issue_sessions SET status = 'failed', last_error = ?, updated_at = ? WHERE issue_id = ? AND active_turn_id = ?")
          .run(commandError, timestamp, command.issue_id, command.turn_id);
        this.db.prepare(`
          UPDATE issues SET status = 'blocked', needs_attention = 1, pending_actor = 'user', version = version + 1, updated_at = ?
          WHERE id = ? AND status != 'done' AND archived_at IS NULL
        `).run(timestamp, command.issue_id);
      }
      failed.push({ ...command, status: "failed", error: commandError, finished_at: timestamp });
    }
    return failed;
  }

  claimSessionCommand(relayId: string) {
    if (!this.sessionRelayIsLeader(relayId)) throw new Error("session_relay_not_leader");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare(`
        SELECT * FROM session_commands
        WHERE status = 'pending'
        ORDER BY CASE kind WHEN 'interrupt' THEN 0 ELSE 1 END, created_at, rowid
        LIMIT 1
      `).get() as Record<string, unknown> | undefined;
      if (!row) {
        this.db.exec("COMMIT");
        return undefined;
      }
      const timestamp = now();
      const result = this.db.prepare(`
        UPDATE session_commands
        SET status = 'claimed', relay_id = ?, claimed_at = ?, attempts = attempts + 1
        WHERE id = ? AND status = 'pending'
      `).run(relayId, timestamp, String(row.id));
      if (result.changes !== 1) throw new Error("session_command_claim_conflict");
      this.db.exec("COMMIT");
      return this.getSessionCommand(String(row.id));
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  checkpointSessionCommand(commandId: string, relayId: string, result: Record<string, unknown>) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ? AND status = 'claimed' AND relay_id = ?").get(commandId, relayId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("session_command_not_claimed");
      const command = sessionCommandFromRow(row);
      if (command.kind !== "start" && command.kind !== "turn") throw new Error("session_command_checkpoint_invalid");
      const threadId = typeof result.thread_id === "string" ? result.thread_id : command.thread_id;
      const turnId = typeof result.turn_id === "string" ? result.turn_id : command.turn_id;
      if (!threadId || !/^[a-f0-9-]{36}$/i.test(threadId)) throw new Error("session_thread_invalid");
      if (turnId && !/^[a-f0-9-]{36}$/i.test(turnId)) throw new Error("session_turn_invalid");
      const owner = this.db.prepare("SELECT issue_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string } | undefined;
      if (owner && owner.issue_id !== command.issue_id) throw new Error("issue_session_already_bound");
      if (command.kind === "start") {
        const binding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        if (binding && binding.thread_id !== threadId) throw new Error("issue_session_already_bound");
        this.db.prepare(`
          INSERT INTO issue_sessions (
            issue_id, host_id, thread_id, status, active_turn_id, active_command_id, last_turn_id,
            config_fingerprint, last_agent_message, last_error, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '', NULL, ?, ?)
          ON CONFLICT(issue_id) DO UPDATE SET
            host_id = excluded.host_id,
            thread_id = excluded.thread_id,
            status = excluded.status,
            active_turn_id = excluded.active_turn_id,
            active_command_id = excluded.active_command_id,
            config_fingerprint = excluded.config_fingerprint,
            last_agent_message = CASE WHEN issue_sessions.active_turn_id = excluded.active_turn_id THEN issue_sessions.last_agent_message ELSE '' END,
            last_error = NULL,
            updated_at = excluded.updated_at
        `).run(command.issue_id, command.host_id, threadId, turnId ? "active" : "starting", turnId || null, command.id, String(command.payload.config_fingerprint || ""), timestamp, timestamp);
      } else {
        const binding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        if (!binding || binding.thread_id !== threadId) throw new Error("issue_session_mismatch");
        this.db.prepare(`
          UPDATE issue_sessions
          SET status = ?, active_turn_id = ?, active_command_id = ?,
              last_agent_message = CASE WHEN active_turn_id = ? THEN last_agent_message ELSE '' END,
              last_error = NULL, updated_at = ?
          WHERE issue_id = ? AND thread_id = ?
        `).run(turnId ? "active" : "starting", turnId || null, command.id, turnId || null, timestamp, command.issue_id, threadId);
      }
      this.db.prepare("UPDATE session_commands SET thread_id = ?, turn_id = ? WHERE id = ? AND status = 'claimed' AND relay_id = ?")
        .run(threadId, turnId || null, commandId, relayId);
      if (command.run_id) {
        this.db.prepare(`
          UPDATE issue_runs
          SET thread_id = ?, turn_id = ?, status = CASE WHEN ? IS NULL THEN status ELSE 'running' END, pid = NULL, error = NULL
          WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
        `).run(threadId, turnId || null, turnId || null, command.run_id, command.issue_id);
      }
      this.db.exec("COMMIT");
      return this.getSessionCommand(commandId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  completeSessionCommand(commandId: string, relayId: string, result: Record<string, unknown>) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ? AND status = 'claimed' AND relay_id = ?").get(commandId, relayId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("session_command_not_claimed");
      const command = sessionCommandFromRow(row);
      const threadId = typeof result.thread_id === "string" ? result.thread_id : command.thread_id;
      const turnId = typeof result.turn_id === "string" ? result.turn_id : command.turn_id;
      const timestamp = now();
      if ((command.kind === "start" || command.kind === "turn" || command.kind === "steer") && (!threadId || !/^[a-f0-9-]{36}$/i.test(threadId))) throw new Error("session_thread_invalid");
      if ((command.kind === "start" || command.kind === "turn" || command.kind === "steer") && (!turnId || !/^[a-f0-9-]{36}$/i.test(turnId))) throw new Error("session_turn_invalid");
      if (command.kind === "start") {
        const existingBinding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        if (existingBinding && existingBinding.thread_id !== threadId) throw new Error("issue_session_already_bound");
        const existingOwner = this.db.prepare("SELECT issue_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string } | undefined;
        if (existingOwner && existingOwner.issue_id !== command.issue_id) throw new Error("issue_session_already_bound");
        this.db.prepare(`
          INSERT INTO issue_sessions (
            issue_id, host_id, thread_id, status, active_turn_id, active_command_id, last_turn_id,
            config_fingerprint, last_agent_message, last_error, created_at, updated_at
          ) VALUES (?, ?, ?, 'active', ?, ?, NULL, ?, '', NULL, ?, ?)
          ON CONFLICT(issue_id) DO UPDATE SET
            host_id = excluded.host_id,
            thread_id = excluded.thread_id,
            status = 'active',
            active_turn_id = excluded.active_turn_id,
            active_command_id = excluded.active_command_id,
            config_fingerprint = excluded.config_fingerprint,
            last_agent_message = CASE WHEN issue_sessions.active_turn_id = excluded.active_turn_id THEN issue_sessions.last_agent_message ELSE '' END,
            last_error = NULL,
            updated_at = excluded.updated_at
        `).run(command.issue_id, command.host_id, threadId, turnId, command.id, String(command.payload.config_fingerprint || ""), timestamp, timestamp);
      } else if (command.kind === "turn" || command.kind === "steer") {
        const binding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        if (!binding || binding.thread_id !== threadId) throw new Error("issue_session_mismatch");
        this.db.prepare(`
          UPDATE issue_sessions
          SET status = 'active', active_turn_id = ?,
              active_command_id = CASE WHEN ? = 'turn' THEN ? ELSE active_command_id END,
              last_agent_message = CASE WHEN ? = 'turn' AND active_turn_id IS NOT ? THEN '' ELSE last_agent_message END,
              last_error = NULL, updated_at = ?
          WHERE issue_id = ? AND thread_id = ?
        `).run(turnId, command.kind, command.id, command.kind, turnId, timestamp, command.issue_id, threadId);
      }
      if (command.run_id && threadId && turnId && command.kind !== "interrupt") {
        const run = this.db.prepare(`
          UPDATE issue_runs
          SET status = 'running', thread_id = ?, turn_id = ?, pid = NULL, error = NULL
          WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
        `).run(threadId, turnId, command.run_id, command.issue_id);
        if (run.changes !== 1) throw new Error("run_transition_conflict");
      }
      this.db.prepare(`
        UPDATE session_commands
        SET status = 'completed', thread_id = ?, turn_id = ?, result_json = ?, error = NULL, finished_at = ?
        WHERE id = ? AND status = 'claimed' AND relay_id = ?
      `).run(threadId || null, turnId || null, JSON.stringify(result), timestamp, commandId, relayId);
      this.db.exec("COMMIT");
      return this.getSessionCommand(commandId)!;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  failSessionCommand(commandId: string, relayId: string, error: string, partialThreadId?: string | null, partialTurnId?: string | null) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ? AND status = 'claimed' AND relay_id = ?").get(commandId, relayId) as Record<string, unknown> | undefined;
      if (!row) throw new Error("session_command_not_claimed");
      const command = sessionCommandFromRow(row);
      const threadId = partialThreadId && /^[a-f0-9-]{36}$/i.test(partialThreadId) ? partialThreadId : command.thread_id;
      const turnId = partialTurnId && /^[a-f0-9-]{36}$/i.test(partialTurnId) ? partialTurnId : command.turn_id;
      if (command.kind === "interrupt" && command.attempts < 3 && command.turn_id) {
        const active = this.db.prepare("SELECT 1 AS value FROM issue_sessions WHERE issue_id = ? AND active_turn_id = ?").get(command.issue_id, command.turn_id);
        if (active) {
          this.db.prepare(`
            UPDATE session_commands
            SET status = 'pending', relay_id = NULL, claimed_at = NULL, error = ?, finished_at = NULL
            WHERE id = ? AND status = 'claimed' AND relay_id = ?
          `).run(error, commandId, relayId);
          this.db.exec("COMMIT");
          return { ...command, status: "pending" as const, error, relay_id: null, claimed_at: null, finished_at: null };
        }
      }
      let commandError = error;
      let boundThreadId = threadId;
      let boundTurnId = turnId;
      if (command.kind === "start" && threadId) {
        const existingBinding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        const existingOwner = this.db.prepare("SELECT issue_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string } | undefined;
        const bindingConflict = Boolean(existingBinding && existingBinding.thread_id !== threadId) || Boolean(existingOwner && existingOwner.issue_id !== command.issue_id);
        if (bindingConflict) {
          commandError = "issue_session_already_bound";
          boundThreadId = command.thread_id;
          boundTurnId = command.turn_id;
        } else {
          this.db.prepare(`
            INSERT INTO issue_sessions (
              issue_id, host_id, thread_id, status, active_turn_id, active_command_id, last_turn_id,
              config_fingerprint, last_agent_message, last_error, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '', ?, ?, ?)
            ON CONFLICT(issue_id) DO UPDATE SET
              thread_id = excluded.thread_id,
              status = excluded.status,
              active_turn_id = excluded.active_turn_id,
              active_command_id = excluded.active_command_id,
              config_fingerprint = excluded.config_fingerprint,
              last_agent_message = CASE WHEN excluded.active_turn_id IS NULL OR issue_sessions.active_turn_id = excluded.active_turn_id THEN issue_sessions.last_agent_message ELSE '' END,
              last_error = excluded.last_error,
              updated_at = excluded.updated_at
          `).run(command.issue_id, command.host_id, threadId, turnId ? "active" : "failed", turnId || null, turnId ? command.id : null, String(command.payload.config_fingerprint || ""), error, timestamp, timestamp);
          if (command.run_id) {
            this.db.prepare(`
              UPDATE issue_runs
              SET thread_id = ?, turn_id = ?, status = CASE WHEN ? IS NULL THEN status ELSE 'running' END, pid = NULL
              WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
            `).run(threadId, turnId || null, turnId || null, command.run_id, command.issue_id);
          }
        }
      } else if (command.kind === "turn" && threadId && turnId) {
        const binding = this.db.prepare("SELECT thread_id FROM issue_sessions WHERE issue_id = ?").get(command.issue_id) as { thread_id: string } | undefined;
        if (binding?.thread_id === threadId) {
          this.db.prepare(`
            UPDATE issue_sessions
            SET status = 'active', active_turn_id = ?,
                active_command_id = ?,
                last_agent_message = CASE WHEN active_turn_id = ? THEN last_agent_message ELSE '' END,
                last_error = ?, updated_at = ?
            WHERE issue_id = ? AND thread_id = ?
          `).run(turnId, command.id, turnId, error, timestamp, command.issue_id, threadId);
          if (command.run_id) {
            this.db.prepare(`
              UPDATE issue_runs SET status = 'running', thread_id = ?, turn_id = ?, pid = NULL
              WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
            `).run(threadId, turnId, command.run_id, command.issue_id);
          }
        } else {
          boundTurnId = command.turn_id;
        }
      } else if (command.kind !== "start") {
        this.db.prepare("UPDATE issue_sessions SET last_error = ?, updated_at = ? WHERE issue_id = ?").run(error, timestamp, command.issue_id);
      }
      this.db.prepare(`
        UPDATE session_commands
        SET status = 'failed', thread_id = ?, turn_id = ?, error = ?, finished_at = ?
        WHERE id = ? AND status = 'claimed' AND relay_id = ?
      `).run(boundThreadId || null, boundTurnId || null, commandError, timestamp, commandId, relayId);
      if (command.kind === "interrupt") {
        this.db.prepare("UPDATE issue_sessions SET status = 'failed', last_error = ?, updated_at = ? WHERE issue_id = ? AND active_turn_id = ?")
          .run(commandError, timestamp, command.issue_id, command.turn_id);
        this.db.prepare(`
          UPDATE issues SET status = 'blocked', needs_attention = 1, pending_actor = 'user', version = version + 1, updated_at = ?
          WHERE id = ? AND status != 'done' AND archived_at IS NULL
        `).run(timestamp, command.issue_id);
      }
      this.db.exec("COMMIT");
      return { ...command, status: "failed" as const, thread_id: boundThreadId || null, turn_id: boundTurnId || null, error: commandError, finished_at: timestamp };
    } catch (caught) {
      this.db.exec("ROLLBACK");
      throw caught;
    }
  }

  requestSessionCommandCancellation(commandId: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ? AND status = 'claimed'").get(commandId) as Record<string, unknown> | undefined;
      if (!row) {
        this.db.exec("COMMIT");
        return undefined;
      }
      const command = sessionCommandFromRow(row);
      if (!command.turn_id) {
        const result = this.db.prepare(`
          UPDATE session_commands
          SET status = 'cancelled', cancel_requested = 1, error = 'user_stopped', finished_at = ?
          WHERE id = ? AND status = 'claimed'
        `).run(timestamp, commandId);
        if (result.changes !== 1) throw new Error("session_command_transition_conflict");
        this.db.prepare(`
          UPDATE issue_sessions
          SET status = 'interrupted', last_error = 'user_stopped', updated_at = ?
          WHERE issue_id = ? AND active_command_id = ? AND active_turn_id IS NULL
        `).run(timestamp, command.issue_id, command.id);
        this.db.exec("COMMIT");
        return { ...command, status: "cancelled" as const, cancel_requested: true, error: "user_stopped", finished_at: timestamp };
      }
      const result = this.db.prepare("UPDATE session_commands SET cancel_requested = 1 WHERE id = ? AND status = 'claimed'").run(commandId);
      if (result.changes !== 1) throw new Error("session_command_transition_conflict");
      this.db.exec("COMMIT");
      return { ...command, cancel_requested: true };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  cancelPendingSessionCommand(commandId: string) {
    const timestamp = now();
    const row = this.db.prepare("SELECT * FROM session_commands WHERE id = ? AND status = 'pending'").get(commandId) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const result = this.db.prepare("UPDATE session_commands SET status = 'cancelled', error = 'user_stopped', finished_at = ? WHERE id = ? AND status = 'pending'").run(timestamp, commandId);
    return result.changes === 1 ? { ...sessionCommandFromRow(row), status: "cancelled" as const, error: "user_stopped", finished_at: timestamp } : undefined;
  }

  enqueueSessionInterrupt(issueId: string) {
    const session = this.getIssueSession(issueId);
    if (!session?.active_turn_id) return undefined;
    const run = this.db.prepare(`
      SELECT id FROM issue_runs
      WHERE issue_id = ? AND turn_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
      ORDER BY started_at DESC, rowid DESC LIMIT 1
    `).get(issueId, session.active_turn_id) as { id: string } | undefined;
    const existing = this.db.prepare(`
      SELECT * FROM session_commands
      WHERE issue_id = ? AND kind = 'interrupt' AND status IN ('pending', 'claimed') AND turn_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(issueId, session.active_turn_id) as Record<string, unknown> | undefined;
    if (existing) return sessionCommandFromRow(existing);
    const command = this.enqueueSessionCommand({
      issueId,
      runId: run?.id || null,
      requestId: `interrupt:${issueId}:${session.active_turn_id}`,
      kind: "interrupt",
      threadId: session.thread_id,
      turnId: session.active_turn_id,
      payload: {},
      hostId: session.host_id,
    });
    this.db.prepare("UPDATE issue_sessions SET status = 'stopping', last_error = NULL, updated_at = ? WHERE issue_id = ? AND active_turn_id = ?")
      .run(now(), issueId, session.active_turn_id);
    return command;
  }

  sessionTurnStarted(threadId: string, turnId: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const session = this.db.prepare("SELECT issue_id, active_turn_id, active_command_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string; active_turn_id: string | null; active_command_id: string | null } | undefined;
      if (!session) {
        this.db.exec("COMMIT");
        return undefined;
      }
      if (session.active_turn_id && session.active_turn_id !== turnId) {
        this.db.prepare(`
          UPDATE issue_runs
          SET status = 'interrupted', finished_at = ?, error = 'session_turn_superseded', pid = NULL
          WHERE issue_id = ? AND turn_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
        `).run(timestamp, session.issue_id, session.active_turn_id);
      }
      const commandId = session.active_turn_id ? null : session.active_command_id;
      if (commandId) {
        const command = this.db.prepare("SELECT run_id, status, cancel_requested FROM session_commands WHERE id = ? AND issue_id = ? AND kind IN ('start', 'turn')").get(commandId, session.issue_id) as { run_id: string | null; status: SessionCommandStatus; cancel_requested: number } | undefined;
        if (!command || command.status !== "claimed" || command.cancel_requested) {
          this.db.prepare("UPDATE issue_sessions SET active_command_id = NULL, updated_at = ? WHERE issue_id = ? AND active_command_id = ? AND active_turn_id IS NULL")
            .run(timestamp, session.issue_id, commandId);
          this.db.exec("COMMIT");
          return undefined;
        }
        if (command) {
          this.db.prepare("UPDATE session_commands SET thread_id = ?, turn_id = ? WHERE id = ?").run(threadId, turnId, commandId);
          if (command.run_id) {
            this.db.prepare(`
              UPDATE issue_runs SET status = 'running', thread_id = ?, turn_id = ?, pid = NULL, error = NULL
              WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
            `).run(threadId, turnId, command.run_id, session.issue_id);
          }
        }
      }
      this.db.prepare(`
        UPDATE issue_sessions
        SET status = 'active', active_turn_id = ?, active_command_id = ?,
            last_agent_message = CASE WHEN active_turn_id = ? THEN last_agent_message ELSE '' END,
            last_error = NULL, updated_at = ?
        WHERE issue_id = ?
      `).run(turnId, session.active_turn_id === turnId ? session.active_command_id : commandId, turnId, timestamp, session.issue_id);
      if (session.active_turn_id !== turnId) {
        if (!commandId) this.db.prepare(`
          INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at)
          VALUES (?, ?, 'running', '', NULL, ?, NULL)
          ON CONFLICT(issue_id) DO UPDATE SET
            request_id = excluded.request_id,
            status = 'running',
            error = NULL,
            started_at = excluded.started_at,
            finished_at = NULL
        `).run(session.issue_id, `native:${threadId}:${turnId}`, timestamp);
        this.db.prepare(`
          UPDATE issues
          SET status = 'in_progress',
              needs_attention = 0,
              pending_actor = 'agent',
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND archived_at IS NULL
        `).run(timestamp, session.issue_id);
      }
      this.db.exec("COMMIT");
      return { issue_id: session.issue_id, thread_id: threadId, turn_id: turnId };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  recordSessionAgentMessage(threadId: string, turnId: string, message: string) {
    const timestamp = now();
    const session = this.db.prepare("SELECT issue_id, active_turn_id, last_turn_id FROM issue_sessions WHERE thread_id = ?").get(threadId) as { issue_id: string; active_turn_id: string | null; last_turn_id: string | null } | undefined;
    if (!session || (session.active_turn_id !== turnId && !(session.active_turn_id === null && session.last_turn_id === turnId))) return false;
    this.db.prepare("UPDATE issue_sessions SET last_agent_message = ?, updated_at = ? WHERE issue_id = ?").run(message, timestamp, session.issue_id);
    this.db.prepare("UPDATE issue_runs SET execution_result = ? WHERE issue_id = ? AND turn_id = ? AND status IN ('claimed', 'running')").run(message, session.issue_id, turnId);
    return true;
  }

  syncSessionThreadStatus(threadId: string, status: string, activeFlags: string[] = []) {
    const session = this.getIssueSessionByThread(threadId);
    if (!session) return false;
    if (session.status === "stopping" && session.active_turn_id && status !== "systemError") return false;
    const nextStatus: IssueSessionStatus = status === "active"
      ? activeFlags.includes("waitingOnApproval")
        ? "waiting_on_approval"
        : activeFlags.includes("waitingOnUserInput")
          ? "waiting_on_user"
          : "active"
      : status === "systemError"
        ? "failed"
        : status === "notLoaded"
          ? "disconnected"
          : "idle";
    if (nextStatus === "idle" && session.active_turn_id) return false;
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE issue_sessions SET status = ?, updated_at = ? WHERE issue_id = ?").run(nextStatus, timestamp, session.issue_id);
      if (["active", "waiting_on_approval", "waiting_on_user", "failed"].includes(nextStatus)) {
        const issueStatus = nextStatus === "failed" ? "blocked" : "in_progress";
        const pendingActor = nextStatus === "active" ? "agent" : "user";
        const needsAttention = Number(nextStatus !== "active");
        this.db.prepare(`
          UPDATE issues
          SET status = ?, needs_attention = ?, pending_actor = ?, version = version + 1, updated_at = ?
          WHERE id = ? AND archived_at IS NULL
            AND (? != 'blocked' OR status != 'done')
            AND (status != ? OR needs_attention != ? OR pending_actor != ?)
        `).run(issueStatus, needsAttention, pendingActor, timestamp, session.issue_id, issueStatus, issueStatus, needsAttention, pendingActor);
      }
      this.db.exec("COMMIT");
      return true;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  completeSessionTurn(threadId: string, turnId: string, status: "completed" | "interrupted" | "failed", error?: string) {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const session = this.db.prepare("SELECT * FROM issue_sessions WHERE thread_id = ?").get(threadId) as Record<string, unknown> | undefined;
      if (!session || String(session.active_turn_id || "") !== turnId) {
        this.db.exec("COMMIT");
        return undefined;
      }
      const commandId = session.active_command_id ? String(session.active_command_id) : "";
      const command = commandId
        ? this.db.prepare("SELECT run_id, kind FROM session_commands WHERE id = ? AND issue_id = ? AND turn_id = ?").get(commandId, String(session.issue_id), turnId) as { run_id: string | null; kind: SessionCommandKind } | undefined
        : undefined;
      if (commandId && !command) throw new Error("session_command_turn_mismatch");
      const run = command?.run_id
        ? this.db.prepare(`
            SELECT id FROM issue_runs
            WHERE id = ? AND issue_id = ? AND turn_id = ? AND status IN ('claimed', 'running') AND execution_mode = 'desktop'
          `).get(command.run_id, String(session.issue_id), turnId) as { id: string } | undefined
        : undefined;
      if (command?.run_id && !run) throw new Error("session_run_turn_mismatch");
      const nextStatus: IssueSessionStatus = status === "completed" ? "idle" : status === "interrupted" ? "interrupted" : "failed";
      this.db.prepare(`
        UPDATE issue_sessions
        SET status = ?, active_turn_id = NULL, active_command_id = NULL, last_turn_id = ?, last_error = ?, updated_at = ?
        WHERE issue_id = ? AND active_turn_id = ?
      `).run(nextStatus, turnId, error || null, timestamp, String(session.issue_id), turnId);
      const message = String(session.last_agent_message || "").trim();
      if (run) {
        if (status === "interrupted") {
          this.db.prepare(`
            UPDATE issue_runs
            SET status = 'interrupted', finished_at = ?, error = ?, execution_result = ?, pid = NULL
            WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running')
          `).run(timestamp, error || "user_stopped", message, run.id, String(session.issue_id));
          this.db.prepare(`
            UPDATE issues
            SET needs_attention = CASE WHEN status = 'done' THEN needs_attention ELSE 1 END,
                pending_actor = CASE WHEN status = 'done' THEN pending_actor ELSE 'user' END,
                version = version + 1, updated_at = ?
            WHERE id = ? AND archived_at IS NULL
          `).run(timestamp, String(session.issue_id));
        } else {
          const executionSuccess = status === "completed";
          this.db.prepare(`
            UPDATE issue_runs
            SET status = 'scheduling', pid = NULL, execution_success = ?, execution_error = ?, execution_result = ?,
                scheduler_pid = NULL, scheduler_status = 'pending', scheduler_error = NULL
            WHERE id = ? AND issue_id = ? AND status IN ('claimed', 'running')
          `).run(Number(executionSuccess), executionSuccess ? null : error || "session_turn_failed", message, run.id, String(session.issue_id));
        }
      } else {
        const replyStatus: IssueReplyStatus = status === "completed" ? "succeeded" : status === "interrupted" ? "interrupted" : "failed";
        this.db.prepare(`
          UPDATE issue_replies SET status = ?, error = ?, finished_at = ?
          WHERE issue_id = ? AND status = 'running'
        `).run(replyStatus, error || (status === "interrupted" ? "session_interrupted" : null), timestamp, String(session.issue_id));
        if (status === "interrupted") {
          this.db.prepare(`
            UPDATE issues
            SET needs_attention = CASE WHEN status = 'done' THEN needs_attention ELSE 1 END,
                pending_actor = CASE WHEN status = 'done' THEN pending_actor ELSE 'user' END,
                version = version + 1, updated_at = ?
            WHERE id = ? AND archived_at IS NULL
          `).run(timestamp, String(session.issue_id));
        } else {
          this.db.prepare(`
            UPDATE issues
            SET status = CASE WHEN status = 'done' THEN status ELSE ? END,
                needs_attention = CASE WHEN status = 'done' THEN needs_attention ELSE 1 END,
                pending_actor = CASE WHEN status = 'done' THEN pending_actor ELSE 'user' END,
                version = version + 1, updated_at = ?
            WHERE id = ? AND archived_at IS NULL
          `).run(status === "completed" ? "in_review" : "blocked", timestamp, String(session.issue_id));
        }
      }
      this.db.exec("COMMIT");
      return {
        issue_id: String(session.issue_id),
        run_id: run?.id || null,
        thread_id: threadId,
        turn_id: turnId,
        status,
        error: error || null,
        message,
        should_schedule: Boolean(run && status !== "interrupted"),
      };
    } catch (caught) {
      this.db.exec("ROLLBACK");
      throw caught;
    }
  }

  finishSessionReply(issueId: string, status: "completed" | "interrupted" | "failed", error?: string) {
    const timestamp = now();
    const replyStatus: IssueReplyStatus = status === "completed" ? "succeeded" : status === "interrupted" ? "interrupted" : "failed";
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(`
        UPDATE issue_replies
        SET status = ?, error = ?, finished_at = ?
        WHERE issue_id = ? AND status = 'running'
      `).run(replyStatus, error || (status === "interrupted" ? "session_interrupted" : null), timestamp, issueId);
      if (status === "interrupted") {
        this.db.prepare(`
          UPDATE issues
          SET needs_attention = 1,
              pending_actor = 'user',
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND status = 'in_progress'
        `).run(timestamp, issueId);
      } else {
        this.db.prepare(`
          UPDATE issues
          SET status = CASE WHEN status = 'done' THEN status ELSE ? END,
              needs_attention = CASE WHEN status = 'done' THEN needs_attention ELSE 1 END,
              pending_actor = CASE WHEN status = 'done' THEN pending_actor ELSE 'user' END,
              version = version + 1,
              updated_at = ?
          WHERE id = ? AND status = 'in_progress' AND archived_at IS NULL
        `).run(status === "completed" ? "in_review" : "blocked", timestamp, issueId);
      }
      this.db.exec("COMMIT");
    } catch (caught) {
      this.db.exec("ROLLBACK");
      throw caught;
    }
  }

  getRunClaim(runId: string): ClaimedIssue | undefined {
    const row = this.db.prepare(`
      SELECT issue_runs.issue_id,
        COALESCE(NULLIF(issues.workspace_path, ''), NULLIF(projects.workspace_path, ''), '') AS workspace_path
      FROM issue_runs
      JOIN issues ON issues.id = issue_runs.issue_id
      JOIN projects ON projects.id = issues.project_id
      WHERE issue_runs.id = ?
    `).get(runId) as { issue_id: string; workspace_path: string } | undefined;
    if (!row) return undefined;
    const issue = this.getIssue(row.issue_id);
    return issue ? { runId, issue, workspacePath: row.workspace_path } : undefined;
  }

  listActiveDesktopRuns() {
    const rows = this.db.prepare(`
      SELECT issue_runs.id
      FROM issue_runs
      JOIN issue_sessions ON issue_sessions.issue_id = issue_runs.issue_id
      WHERE issue_runs.status IN ('claimed', 'running')
        AND issue_runs.execution_mode = 'desktop'
        AND issue_runs.thread_id = issue_sessions.thread_id
        AND issue_runs.turn_id IS NOT NULL
      ORDER BY issue_runs.started_at
    `).all() as Array<{ id: string }>;
    return rows.flatMap(row => {
      const claim = this.getRunClaim(row.id);
      return claim ? [claim] : [];
    });
  }

  getIssueReplyState(issueId: string): IssueReplyState {
    const row = this.db.prepare("SELECT * FROM issue_replies WHERE issue_id = ?").get(issueId) as Record<string, unknown> | undefined;
    if (!row) return { issue_id: issueId, status: "idle", message: "" };
    return {
      issue_id: String(row.issue_id),
      request_id: String(row.request_id),
      status: String(row.status) as IssueReplyStatus,
      message: String(row.message),
      ...(row.error ? { error: String(row.error) } : {}),
      started_at: String(row.started_at),
      ...(row.finished_at ? { finished_at: String(row.finished_at) } : {}),
    };
  }

  setIssueReplyState(state: IssueReplyState) {
    this.db.prepare(`
      INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(issue_id) DO UPDATE SET
        request_id = excluded.request_id,
        status = excluded.status,
        message = excluded.message,
        error = excluded.error,
        started_at = excluded.started_at,
        finished_at = excluded.finished_at
    `).run(state.issue_id, state.request_id || "", state.status, state.message, state.error || null, state.started_at || now(), state.finished_at || null);
    return this.getIssueReplyState(state.issue_id);
  }

  conversationProjection(issueId: string, messages: ConversationProjection["messages"]): ConversationProjection {
    const issue = this.getIssue(issueId);
    if (!issue) throw new Error("issue_not_found");
    const reply = this.getIssueReplyState(issueId);
    const projected = messages.slice(-80).map(({ attachments: _attachments, ...message }) => ({ ...message, html: "" }));
    if (reply.status === "running" && reply.message && !projected.some(message => message.role === "user" && message.markdown === reply.message)) {
      projected.push({ id: `reply-${reply.request_id || issueId}`, role: "user", markdown: reply.message, html: "", phase: null, timestamp: reply.started_at || null });
    }
    return {
      issue_id: issueId,
      found: projected.length > 0,
      messages: projected.slice(-80),
      reply,
      updated_at: [issue.updated_at, reply.finished_at || reply.started_at || "", ...projected.map(message => message.timestamp || "")].sort().at(-1) || issue.updated_at,
    };
  }
}
