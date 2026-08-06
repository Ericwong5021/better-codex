import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "./config.js";

export const issueStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"] as const;
export const issuePriorities = ["none", "low", "medium", "high", "urgent"] as const;
export const agentModels = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.4", "gpt-5.3-codex", "gpt-5.3-codex-spark"] as const;
export const agentReasoningEfforts = ["low", "medium", "high", "xhigh", "max", "ultra"] as const;

export type IssueStatus = typeof issueStatuses[number];
export type IssuePriority = typeof issuePriorities[number];
export type AgentModel = typeof agentModels[number];
export type AgentReasoningEffort = typeof agentReasoningEfforts[number];

export type AgentProfile = {
  id: string;
  role: string;
  name: string;
  description: string;
  instructions: string;
  model: AgentModel;
  reasoning_effort: AgentReasoningEffort;
  version: number;
  created_at: string;
  updated_at: string;
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
  version: number;
  created_at: string;
  updated_at: string;
  active_run_status?: "claimed" | "running" | null;
  active_run_started_at?: string | null;
  run_thread_id?: string | null;
};

export type ClaimedIssue = {
  runId: string;
  issue: Issue;
  workspacePath: string;
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
};

type IssuePatch = Partial<Pick<Issue, "title" | "description" | "status" | "priority" | "labels" | "sort_order" | "pinned" | "thread_id" | "workspace_path" | "agent_enabled" | "agent_id">>;

type AgentProfileInput = Pick<AgentProfile, "name" | "description" | "instructions" | "model" | "reasoning_effort">;
type AgentProfilePatch = Partial<AgentProfileInput>;

const latestSchemaVersion = 2;

function now() {
  return new Date().toISOString();
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
  if (!description || description.length > 500) throw new Error("agent_description_required");
  if (!instructions || instructions.length > 100000) throw new Error("agent_instructions_required");
  if (!agentModels.includes(input.model)) throw new Error("invalid_agent_model");
  if (!agentReasoningEfforts.includes(input.reasoning_effort)) throw new Error("invalid_agent_reasoning_effort");
  return { name, description, instructions, model: input.model, reasoning_effort: input.reasoning_effort };
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
    this.ensureRunTable();
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
  }

  private ensureAgentColumn() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(issues)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("agent_enabled")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_enabled INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("agent_id")) this.db.exec("ALTER TABLE issues ADD COLUMN agent_id TEXT");
    this.db.exec("CREATE INDEX IF NOT EXISTS issues_agent_id ON issues(agent_id)");
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
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
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
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS issue_runs_status ON issue_runs(status, started_at);
      CREATE INDEX IF NOT EXISTS issue_runs_issue ON issue_runs(issue_id, started_at);
    `);
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

  createAgentProfile(input: AgentProfileInput) {
    const profile = cleanAgentProfile(input);
    const id = randomUUID();
    const role = `better_codex_${id.replaceAll("-", "")}`;
    const timestamp = now();
    this.db.prepare(`
      INSERT INTO agent_profiles (id, role, name, description, instructions, model, reasoning_effort, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, role, profile.name, profile.description, profile.instructions, profile.model, profile.reasoning_effort, timestamp, timestamp);
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
    });
    const result = this.db.prepare(`
      UPDATE agent_profiles SET name = ?, description = ?, instructions = ?, model = ?, reasoning_effort = ?, version = version + 1, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(profile.name, profile.description, profile.instructions, profile.model, profile.reasoning_effort, now(), current.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getAgentProfile(current.id)!;
  }

  deleteAgentProfile(id: string, version: number) {
    const profile = this.getAgentProfile(id);
    if (!profile) throw new Error("agent_not_found");
    if (profile.version !== version) throw new Error("version_conflict");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE issues SET agent_id = NULL, version = version + 1, updated_at = ? WHERE agent_id = ?").run(now(), profile.id);
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
        latest_run.thread_id AS run_thread_id
      FROM issues
      LEFT JOIN issue_runs AS active_run
        ON active_run.id = (
          SELECT issue_runs.id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.status IN ('claimed', 'running')
          ORDER BY issue_runs.started_at DESC
          LIMIT 1
        )
      LEFT JOIN issue_runs AS latest_run
        ON latest_run.id = (
          SELECT issue_runs.id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.thread_id IS NOT NULL
            AND issue_runs.thread_id NOT LIKE 'local:%'
            AND issue_runs.thread_id NOT LIKE 'cloud:%'
          ORDER BY issue_runs.started_at DESC
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
          SELECT issue_runs.thread_id
          FROM issue_runs
          WHERE issue_runs.issue_id = issues.id
            AND issue_runs.thread_id IS NOT NULL
            AND issue_runs.thread_id NOT LIKE 'local:%'
            AND issue_runs.thread_id NOT LIKE 'cloud:%'
          ORDER BY issue_runs.started_at DESC
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
    const title = cleanTitle(input.title);
    if (input.status && !issueStatuses.includes(input.status)) throw new Error("invalid_status");
    if (input.priority && !issuePriorities.includes(input.priority)) throw new Error("invalid_priority");
    const agentId = input.agentEnabled && input.agentId ? input.agentId : null;
    if (agentId && !this.getAgentProfile(agentId)) throw new Error("agent_not_found");
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
        .get(project.id, input.status ?? "todo") as { value: number };
      this.db.prepare(`
        INSERT INTO issues (
          id, identifier, project_id, title, description, status, priority, labels_json,
          sort_order, pinned, archived_at, thread_id, workspace_path, agent_enabled, agent_id, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        identifier,
        project.id,
        title,
        input.description ?? "",
        input.status ?? "todo",
        input.priority ?? "medium",
        JSON.stringify(cleanLabels(input.labels ?? [])),
        Number(row.value) + 1000,
        input.threadId || null,
        input.workspacePath || null,
        Number(input.agentEnabled ?? false),
        agentId,
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
    if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
    if (patch.title !== undefined) patch.title = cleanTitle(patch.title);
    if (patch.status !== undefined && !issueStatuses.includes(patch.status)) throw new Error("invalid_status");
    if (patch.priority !== undefined && !issuePriorities.includes(patch.priority)) throw new Error("invalid_priority");
    if (patch.labels !== undefined) patch.labels = cleanLabels(patch.labels);
    if (patch.sort_order !== undefined && !Number.isFinite(patch.sort_order)) throw new Error("invalid_sort_order");
    if (patch.agent_id && !this.getAgentProfile(patch.agent_id)) throw new Error("agent_not_found");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const issue = this.getIssue(id);
      if (!issue) throw new Error("issue_not_found");
      if (issue.version !== version) throw new Error("version_conflict");
      if (patch.agent_enabled === false) patch.agent_id = null;
      if (patch.status !== undefined && patch.status !== issue.status && patch.sort_order === undefined) {
        const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM issues WHERE project_id = ? AND status = ? AND archived_at IS NULL")
          .get(issue.project_id, patch.status) as { value: number };
        patch.sort_order = Number(row.value) + 1000;
      }
      const columns: Record<keyof IssuePatch, string> = {
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
      };
      const assignments: string[] = [];
      const values: unknown[] = [];
      for (const [key, value] of Object.entries(patch) as Array<[keyof IssuePatch, IssuePatch[keyof IssuePatch]]>) {
        if (value === undefined) continue;
        assignments.push(`${columns[key]} = ?`);
        values.push(key === "labels" ? JSON.stringify(value) : key === "pinned" || key === "agent_enabled" ? Number(value) : key === "thread_id" || key === "workspace_path" || key === "agent_id" ? value || null : value);
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
    const result = this.db.prepare("UPDATE issues SET archived_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
      .run(now(), now(), issue.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getIssue(issue.id)!;
  }

  recoverInterruptedRuns() {
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const rows = this.db.prepare("SELECT id, issue_id FROM issue_runs WHERE status IN ('claimed', 'running')").all() as Array<{ id: string; issue_id: string }>;
      for (const row of rows) {
        this.db.prepare("UPDATE issue_runs SET status = 'interrupted', finished_at = ?, error = 'runtime_restarted' WHERE id = ?").run(timestamp, row.id);
        this.db.prepare("UPDATE issues SET status = 'blocked', version = version + 1, updated_at = ? WHERE id = ? AND status = 'in_progress'").run(timestamp, row.issue_id);
      }
      this.db.exec("COMMIT");
      return rows.length;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  claimNextIssue(): ClaimedIssue | null {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const active = this.db.prepare("SELECT 1 AS value FROM issue_runs WHERE status IN ('claimed', 'running') LIMIT 1").get();
      if (active) {
        this.db.exec("COMMIT");
        return null;
      }
      const row = this.db.prepare(`
        SELECT issues.*, COALESCE(NULLIF(issues.workspace_path, ''), NULLIF(projects.workspace_path, ''), '') AS resolved_workspace
        FROM issues
        JOIN projects ON projects.id = issues.project_id
        WHERE issues.status = 'todo'
          AND issues.agent_enabled = 1
          AND issues.archived_at IS NULL
          AND (issues.thread_id IS NOT NULL OR issues.workspace_path IS NOT NULL OR projects.workspace_path != '')
        ORDER BY issues.pinned DESC,
          CASE issues.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
          issues.sort_order,
          issues.created_at
        LIMIT 1
      `).get() as (Record<string, unknown> & { resolved_workspace: string }) | undefined;
      if (!row) {
        this.db.exec("COMMIT");
        return null;
      }
      const { resolved_workspace, ...issueRow } = row;
      const issue = issueFromRow(issueRow);
      const runId = randomUUID();
      const timestamp = now();
      this.db.prepare("INSERT INTO issue_runs (id, issue_id, status, thread_id, started_at) VALUES (?, ?, 'claimed', NULL, ?)").run(runId, issue.id, timestamp);
      const result = this.db.prepare("UPDATE issues SET status = 'in_progress', version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND status = 'todo'").run(timestamp, issue.id, issue.version);
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
      this.db.prepare("UPDATE issue_runs SET status = ?, finished_at = ?, error = ? WHERE id = ? AND status IN ('claimed', 'running')")
        .run(success ? "completed" : "failed", timestamp, error ?? null, runId);
      this.db.prepare("UPDATE issues SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND status = 'in_progress'")
        .run(success ? "in_review" : "blocked", timestamp, issueId);
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
      this.db.prepare("UPDATE issue_runs SET status = 'interrupted', finished_at = ?, error = 'runtime_stopped' WHERE id = ? AND status IN ('claimed', 'running')").run(timestamp, runId);
      this.db.prepare("UPDATE issues SET status = 'blocked', version = version + 1, updated_at = ? WHERE id = ? AND status = 'in_progress'").run(timestamp, issueId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
