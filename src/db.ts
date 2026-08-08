import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "./config.js";

export const issueStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"] as const;
export const issuePriorities = ["none", "low", "medium", "high", "urgent"] as const;
const defaultSchedulerModel = "gpt-5.6-sol";

export type IssueStatus = typeof issueStatuses[number];
export type IssuePriority = typeof issuePriorities[number];
export type AgentModel = string;
export type AgentReasoningEffort = string;
export type AgentSandboxMode = "read-only" | "workspace-write" | "danger-full-access";

export type AgentProfile = {
  id: string;
  role: string;
  name: string;
  description: string;
  instructions: string;
  model: AgentModel;
  reasoning_effort: AgentReasoningEffort;
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
  needs_attention: boolean;
  pending_actor: PendingActor;
  enrichment_status: EnrichmentStatus;
  reply_draft: string;
  version: number;
  created_at: string;
  updated_at: string;
  active_run_status?: "claimed" | "running" | "scheduling" | null;
  active_run_started_at?: string | null;
  latest_run_status?: "claimed" | "running" | "scheduling" | "completed" | "failed" | "interrupted" | null;
  latest_scheduler_status?: "pending" | "running" | "completed" | "failed" | "interrupted" | null;
  latest_scheduler_error?: string | null;
  run_thread_id?: string | null;
};

export type ClaimedIssue = {
  runId: string;
  issue: Issue;
  workspacePath: string;
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
};

type ProjectInput = {
  id?: string;
  externalId?: string;
  name: string;
  workspacePath?: string;
};

type IssueInput = {
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
  enrichmentStatus?: EnrichmentStatus;
};

type IssuePatch = Partial<Pick<Issue, "project_id" | "title" | "description" | "status" | "priority" | "labels" | "sort_order" | "pinned" | "thread_id" | "workspace_path" | "agent_enabled" | "agent_id" | "user_assigned" | "needs_attention" | "pending_actor" | "enrichment_status" | "reply_draft">>;

type AgentProfileInput = Pick<AgentProfile, "name" | "description" | "instructions" | "model" | "reasoning_effort"> & { sandbox_mode?: AgentSandboxMode; max_concurrency?: number };
type AgentProfilePatch = Partial<AgentProfileInput>;

export const defaultAgentMaxConcurrency = 5;
export const agentMaxConcurrencyLimit = 20;
export const agentSandboxModes: AgentSandboxMode[] = ["read-only", "workspace-write", "danger-full-access"];

export function cleanMaxConcurrency(value: number | undefined) {
  if (value === undefined) return defaultAgentMaxConcurrency;
  if (!Number.isInteger(value) || value < 1 || value > agentMaxConcurrencyLimit) throw new Error("invalid_agent_max_concurrency");
  return value;
}

const latestSchemaVersion = 3;

function now() {
  return new Date().toISOString();
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
  const description = input.description.trim();
  const instructions = input.instructions.trim();
  if (!name || name.length > 80) throw new Error("agent_name_required");
  if (description.length > 500) throw new Error("agent_description_too_long");
  if (instructions.length > 100000) throw new Error("agent_instructions_too_long");
  if (!input.model.trim() || input.model.length > 80) throw new Error("invalid_agent_model");
  if (!input.reasoning_effort.trim() || input.reasoning_effort.length > 20) throw new Error("invalid_agent_reasoning_effort");
  const sandbox_mode = input.sandbox_mode || "workspace-write";
  if (!agentSandboxModes.includes(sandbox_mode)) throw new Error("invalid_agent_sandbox_mode");
  return { name, description, instructions, model: input.model, reasoning_effort: input.reasoning_effort, sandbox_mode, max_concurrency: cleanMaxConcurrency(input.max_concurrency) };
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
    pending_actor: row.pending_actor === "agent" ? "agent" : "user",
  } as Issue;
}

export class Store {
  readonly db: DatabaseSync;
  readonly file: string;
  lastBackupPath: string | null = null;

  constructor(file = databasePath) {
    this.file = file;
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
    this.ensureIssueReplyTable();
    this.ensureSettingsTable();
    this.ensureDispatchColumns();
    this.ensureEnrichmentColumn();
    this.ensureReplyDraftColumn();
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
  }

  private ensureAgentColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("agent_enabled")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_enabled INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("agent_id")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_id TEXT");
    if (!columns.has("user_assigned")) this.db.exec("ALTER TABLE issues ADD COLUMN user_assigned INTEGER NOT NULL DEFAULT 0");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_agent_id ON issues(agent_id)");
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
          AND status NOT IN ('backlog', 'done', 'cancelled')
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
        scheduler_result TEXT
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
    this.db.prepare("UPDATE issue_replies SET status = 'interrupted', error = 'runtime_restarted', finished_at = ? WHERE status = 'running'").run(timestamp);
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
    return {
      ok: String(integrity?.quick_check ?? "") === "ok",
      schemaVersion: this.schemaVersion(),
      latestSchemaVersion,
      lastBackupPath: this.lastBackupPath,
    };
  }

  close() {
    this.db.close();
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

  getSchedulerModel() {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'scheduler_model'").get() as { value: string } | undefined;
    const value = row?.value.trim() || "";
    return value && value.length <= 200 && !value.includes("\0") ? value : defaultSchedulerModel;
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
      && issue.status !== "done"
      && issue.status !== "cancelled",
    );
  }

  isEnrichmentPending(issue: Issue) {
    return issue.enrichment_status === "pending";
  }

  listPendingEnrichmentIssues() {
    return this.listIssues().filter(issue => issue.enrichment_status === "pending");
  }

  canAutoStartFromUserMessage(issue: Issue) {
    return Boolean(this.getAutoDispatch() && !issue.archived_at && !["backlog", "done", "cancelled"].includes(issue.status));
  }

  listProjects() {
    return this.db.prepare(`
      SELECT id, external_id, identifier_prefix, name, workspace_path, next_issue_number, created_at, updated_at
      FROM projects ORDER BY name COLLATE NOCASE
    `).all() as Project[];
  }

  getProject(id: string) {
    return this.db.prepare(`
      SELECT id, external_id, identifier_prefix, name, workspace_path, next_issue_number, created_at, updated_at
      FROM projects WHERE id = ?
    `).get(id) as Project | undefined;
  }

  ensureProject(input: ProjectInput) {
    const name = cleanName(input.name);
    if (input.externalId) {
      const existing = this.db.prepare("SELECT id FROM projects WHERE external_id = ?").get(input.externalId) as { id: string } | undefined;
      if (existing) {
        const timestamp = now();
        this.db.prepare("UPDATE projects SET name = ?, workspace_path = COALESCE(NULLIF(?, ''), workspace_path), updated_at = ? WHERE id = ?")
          .run(name, input.workspacePath ?? "", timestamp, existing.id);
        return this.getProject(existing.id)!;
      }
    }
    return this.createProject({ ...input, name });
  }

  createProject(input: ProjectInput) {
    const name = cleanName(input.name);
    const id = input.id ?? randomUUID();
    const timestamp = now();
    this.db.prepare(`
      INSERT INTO projects (
        id, external_id, identifier_prefix, name, workspace_path, next_issue_number, default_branch, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 'main', ?, ?)
    `).run(id, input.externalId ?? null, projectPrefix(name), name, input.workspacePath ?? "", timestamp, timestamp);
    return this.getProject(id)!;
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
      INSERT INTO agent_profiles (id, role, name, description, instructions, model, reasoning_effort, sandbox_mode, max_concurrency, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, role, profile.name, profile.description, profile.instructions, profile.model, profile.reasoning_effort, profile.sandbox_mode, profile.max_concurrency, timestamp, timestamp);
    return this.getAgentProfile(id)!;
  }

  updateAgentProfile(id: string, version: number, patch: AgentProfilePatch) {
    const current = this.getAgentProfile(id);
    if (!current) throw new Error("agent_not_found");
    if (current.version !== version) throw new Error("version_conflict");
    const profile = cleanAgentProfile({
      name: patch.name ?? current.name,
      description: patch.description ?? current.description,
      instructions: patch.instructions ?? current.instructions,
      model: patch.model ?? current.model,
      reasoning_effort: patch.reasoning_effort ?? current.reasoning_effort,
      sandbox_mode: patch.sandbox_mode ?? current.sandbox_mode ?? "workspace-write",
      max_concurrency: patch.max_concurrency ?? current.max_concurrency,
    });
    const result = this.db.prepare(`
      UPDATE agent_profiles SET name = ?, description = ?, instructions = ?, model = ?, reasoning_effort = ?, sandbox_mode = ?, max_concurrency = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(profile.name, profile.description, profile.instructions, profile.model, profile.reasoning_effort, profile.sandbox_mode, profile.max_concurrency, now(), current.id, version);
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
      conditions.push("(issues.identifier LIKE ? OR issues.title LIKE ? OR issues.description LIKE ? OR issues.thread_id LIKE ?)");
      const query = `%${filters.search}%`;
      values.push(query, query, query, query);
    }
    const rows = this.db.prepare(`
      SELECT issues.*, active_run.status AS active_run_status, active_run.started_at AS active_run_started_at,
        latest_run.status AS latest_run_status, latest_run.scheduler_status AS latest_scheduler_status,
        latest_run.scheduler_error AS latest_scheduler_error, latest_thread.thread_id AS run_thread_id
      FROM issues
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
          SELECT issue_runs.thread_id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.thread_id IS NOT NULL
            AND issue_runs.thread_id NOT LIKE 'local:%'
            AND issue_runs.thread_id NOT LIKE 'cloud:%'
          ORDER BY issue_runs.started_at DESC, issue_runs.rowid DESC
          LIMIT 1
        ) AS run_thread_id
      FROM issues
      WHERE issues.id = ? OR issues.identifier = ?
    `).get(id, id) as Record<string, unknown> | undefined;
    return row ? issueFromRow(row) : undefined;
  }

  createIssue(input: IssueInput) {
    const project = this.getProject(input.projectId);
    if (!project) throw new Error("project_not_found");
    const enrichmentStatus = input.enrichmentStatus ?? null;
    const title = enrichmentStatus === "pending" ? "正在理解任务" : cleanTitle(input.title);
    if (input.status && !issueStatuses.includes(input.status)) throw new Error("invalid_status");
    if (input.priority && !issuePriorities.includes(input.priority)) throw new Error("invalid_priority");
    const userAssigned = Boolean(input.userAssigned) && !Boolean(input.agentEnabled);
    const agentId = input.agentEnabled && input.agentId ? input.agentId : null;
    if (agentId && !this.getAgentProfile(agentId)) throw new Error("agent_not_found");
    const agentEnabled = Boolean(input.agentEnabled) && !userAssigned;
    if (enrichmentStatus !== null && enrichmentStatus !== "pending" && enrichmentStatus !== "failed") throw new Error("invalid_enrichment_status");
    const status = enrichmentStatus === "pending" ? "backlog" : input.status ?? "todo";
    const userHandoff = status === "blocked" || status === "in_review";
    const needsAttention = userHandoff ? 1 : agentEnabled && status !== "backlog" && status !== "done" && status !== "cancelled" ? 1 : 0;
    const pendingActor = agentEnabled && !userHandoff && status !== "done" && status !== "cancelled" ? "agent" : "user";
    const id = randomUUID();
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
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
          sort_order, pinned, archived_at, thread_id, workspace_path, agent_enabled, agent_id, user_assigned,
           needs_attention, pending_actor, enrichment_status, version, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
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
        needsAttention,
        pendingActor,
        enrichmentStatus,
        timestamp,
        timestamp,
      );
      this.db.prepare("UPDATE projects SET next_issue_number = ?, updated_at = ? WHERE id = ?")
        .run(issueNumber + 1, timestamp, project.id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getIssue(id)!;
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
      if (patch.agent_enabled === false) {
        patch.agent_id = null;
        if (patch.pending_actor === undefined) patch.pending_actor = "user";
      }
      if (patch.agent_enabled === true) {
        patch.user_assigned = false;
        if (patch.pending_actor === undefined) patch.pending_actor = "agent";
      }
      if (patch.status === "done" || patch.status === "cancelled") {
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
        if (agentOwned && nextStatus !== "backlog" && nextStatus !== "done" && nextStatus !== "cancelled") patch.needs_attention = true;
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
              : key === "thread_id" || key === "workspace_path" || key === "agent_id" || key === "enrichment_status" ? value || null
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
    const result = this.db.prepare("UPDATE issues SET archived_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
      .run(now(), now(), issue.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getIssue(issue.id)!;
  }

  unarchiveIssue(id: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    const result = this.db.prepare("UPDATE issues SET archived_at = NULL, version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND archived_at IS NOT NULL")
      .run(now(), issue.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getIssue(issue.id)!;
  }

  deleteArchivedIssue(id: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    if (!issue.archived_at) throw new Error("issue_not_archived");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM issue_replies WHERE issue_id = ?").run(issue.id);
      this.db.prepare("DELETE FROM issue_runs WHERE issue_id = ?").run(issue.id);
      const result = this.db.prepare("DELETE FROM issues WHERE id = ? AND version = ? AND archived_at IS NOT NULL").run(issue.id, version);
      if (result.changes !== 1) throw new Error("version_conflict");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  recoverInterruptedRuns() {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.db.prepare("SELECT id, issue_id FROM issue_runs WHERE status IN ('claimed', 'running')").all() as Array<{ id: string; issue_id: string }>;
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
          AND issues.status NOT IN ('backlog', 'done', 'cancelled')
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
      this.db.prepare("INSERT INTO issue_runs (id, issue_id, status, thread_id, started_at) VALUES (?, ?, 'claimed', NULL, ?)").run(runId, issue.id, timestamp);
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
          AND status NOT IN ('backlog', 'done', 'cancelled')
          AND (enrichment_status IS NULL OR enrichment_status != 'pending')
      `).run(timestamp, issue.id, issue.version);
      if (result.changes !== 1) throw new Error("claim_conflict");
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
        COALESCE(NULLIF(issues.workspace_path, ''), NULLIF(projects.workspace_path, ''), '') AS workspace_path
      FROM issue_runs
      JOIN issues ON issues.id = issue_runs.issue_id
      JOIN projects ON projects.id = issues.project_id
      WHERE issue_runs.status = 'scheduling'
      ORDER BY issue_runs.started_at, issue_runs.rowid
    `).all() as Array<{ run_id: string; issue_id: string; execution_success: number; execution_error: string | null; workspace_path: string }>;
    return rows.flatMap(row => {
      const issue = this.getIssue(row.issue_id);
      if (!issue) return [];
      return [{
        claim: { runId: row.run_id, issue, workspacePath: row.workspace_path },
        executionSuccess: Boolean(row.execution_success),
        ...(row.execution_error ? { executionError: row.execution_error } : {}),
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
        executionSuccess ? "completed" : "failed",
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
          SET status = CASE WHEN status = 'in_progress' THEN 'blocked' ELSE status END,
              needs_attention = CASE WHEN status IN ('done', 'cancelled') THEN needs_attention ELSE 1 END,
              pending_actor = CASE WHEN status IN ('done', 'cancelled') THEN pending_actor ELSE 'user' END,
              version = version + 1,
              updated_at = ?
          WHERE id = ?
        `).run(timestamp, issueId);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
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
}
