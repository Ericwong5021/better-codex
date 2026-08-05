import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "./config.js";

export const issueStatuses = ["backlog", "todo", "in_progress", "blocked", "in_review", "done"] as const;
export const issuePriorities = ["none", "low", "medium", "high", "urgent"] as const;

export type IssueStatus = typeof issueStatuses[number];
export type IssuePriority = typeof issuePriorities[number];

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
  version: number;
  created_at: string;
  updated_at: string;
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
};

type IssuePatch = Partial<Pick<Issue, "title" | "description" | "status" | "priority" | "labels" | "sort_order" | "pinned" | "thread_id" | "workspace_path">>;

function now() {
  return new Date().toISOString();
}

function projectPrefix(name: string) {
  const ascii = name.normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (ascii.slice(0, 3) || "TIL").padEnd(3, "X");
}

function issueFromRow(row: Record<string, unknown>): Issue {
  const { labels_json, ...values } = row;
  return {
    ...values,
    labels: JSON.parse(String(labels_json ?? "[]")),
    pinned: Boolean(row.pinned),
  } as Issue;
}

export class Store {
  readonly db: DatabaseSync;

  constructor(file = databasePath) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        external_id TEXT UNIQUE,
        identifier_prefix TEXT NOT NULL DEFAULT 'TIL',
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
      CREATE INDEX IF NOT EXISTS issues_project_status_sort
        ON issues(project_id, archived_at, status, pinned DESC, sort_order, created_at);
      CREATE INDEX IF NOT EXISTS issues_thread_id ON issues(thread_id);
    `);
    this.upgradeLegacyProjects();
    if (this.listProjects().length === 0) {
      this.ensureProject({ externalId: "inbox", name: "Inbox", workspacePath: process.cwd() });
    }
  }

  close() {
    this.db.close();
  }

  private upgradeLegacyProjects() {
    const columns = new Set((this.db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map((item) => item.name));
    for (const [name, definition] of [
      ["external_id", "TEXT"],
      ["identifier_prefix", "TEXT NOT NULL DEFAULT 'TIL'"],
      ["next_issue_number", "INTEGER NOT NULL DEFAULT 1"],
      ["updated_at", "TEXT NOT NULL DEFAULT ''"],
    ]) {
      if (!columns.has(name)) this.db.exec(`ALTER TABLE projects ADD COLUMN ${name} ${definition}`);
    }
    this.db.exec("UPDATE projects SET updated_at = created_at WHERE updated_at = ''");
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
    if (input.externalId) {
      const existing = this.db.prepare("SELECT id FROM projects WHERE external_id = ?").get(input.externalId) as { id: string } | undefined;
      if (existing) {
        const timestamp = now();
        this.db.prepare("UPDATE projects SET name = ?, workspace_path = COALESCE(NULLIF(?, ''), workspace_path), updated_at = ? WHERE id = ?")
          .run(input.name, input.workspacePath ?? "", timestamp, existing.id);
        return this.getProject(existing.id)!;
      }
    }
    return this.createProject(input);
  }

  createProject(input: ProjectInput) {
    const id = input.id ?? randomUUID();
    const timestamp = now();
    this.db.prepare(`
      INSERT INTO projects (
        id, external_id, identifier_prefix, name, workspace_path, next_issue_number, default_branch, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 'main', ?, ?)
    `).run(id, input.externalId ?? null, projectPrefix(input.name), input.name.trim(), input.workspacePath ?? "", timestamp, timestamp);
    return this.getProject(id)!;
  }

  listIssues(filters: { projectId?: string; search?: string; archived?: boolean } = {}) {
    const conditions = [filters.archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"];
    const values: Array<string> = [];
    if (filters.projectId) {
      conditions.push("project_id = ?");
      values.push(filters.projectId);
    }
    if (filters.search) {
      conditions.push("(identifier LIKE ? OR title LIKE ? OR description LIKE ? OR thread_id LIKE ?)");
      const query = `%${filters.search}%`;
      values.push(query, query, query, query);
    }
    const rows = this.db.prepare(`
      SELECT * FROM issues
      WHERE ${conditions.join(" AND ")}
      ORDER BY pinned DESC, sort_order, created_at
    `).all(...values) as Record<string, unknown>[];
    return rows.map(issueFromRow);
  }

  getIssue(id: string) {
    const row = this.db.prepare("SELECT * FROM issues WHERE id = ? OR identifier = ?").get(id, id) as Record<string, unknown> | undefined;
    return row ? issueFromRow(row) : undefined;
  }

  createIssue(input: IssueInput) {
    const project = this.getProject(input.projectId);
    if (!project) throw new Error("project_not_found");
    const title = input.title.trim();
    if (!title) throw new Error("title_required");
    const id = randomUUID();
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.getProject(project.id)!;
      const identifier = `${current.identifier_prefix}-${current.next_issue_number}`;
      const row = this.db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS value FROM issues WHERE project_id = ? AND status = ?")
        .get(project.id, input.status ?? "todo") as { value: number };
      this.db.prepare(`
        INSERT INTO issues (
          id, identifier, project_id, title, description, status, priority, labels_json,
          sort_order, pinned, archived_at, thread_id, workspace_path, version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, 1, ?, ?)
      `).run(
        id,
        identifier,
        project.id,
        title,
        input.description ?? "",
        input.status ?? "todo",
        input.priority ?? "medium",
        JSON.stringify(input.labels ?? []),
        Number(row.value) + 1000,
        input.threadId || null,
        input.workspacePath || null,
        timestamp,
        timestamp,
      );
      this.db.prepare("UPDATE projects SET next_issue_number = next_issue_number + 1, updated_at = ? WHERE id = ?")
        .run(timestamp, project.id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getIssue(id)!;
  }

  updateIssue(id: string, version: number, patch: IssuePatch) {
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
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
    };
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(patch) as Array<[keyof IssuePatch, IssuePatch[keyof IssuePatch]]>) {
      if (value === undefined) continue;
      assignments.push(`${columns[key]} = ?`);
      values.push(key === "labels" ? JSON.stringify(value) : key === "pinned" ? Number(value) : value || null);
    }
    if (assignments.length === 0) return issue;
    assignments.push("version = version + 1", "updated_at = ?");
    values.push(now(), issue.id, version);
    const result = this.db.prepare(`UPDATE issues SET ${assignments.join(", ")} WHERE id = ? AND version = ?`).run(...values as never[]);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getIssue(issue.id)!;
  }

  archiveIssue(id: string, version: number) {
    const issue = this.getIssue(id);
    if (!issue) throw new Error("issue_not_found");
    if (issue.version !== version) throw new Error("version_conflict");
    const result = this.db.prepare("UPDATE issues SET archived_at = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?")
      .run(now(), now(), issue.id, version);
    if (result.changes !== 1) throw new Error("version_conflict");
    return this.getIssue(issue.id)!;
  }
}
