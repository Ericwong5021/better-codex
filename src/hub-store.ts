import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { issuePriorities, issueStatuses } from "./db.js";
import { remoteIssuePatchFields, syncEntityTypes, type AgentProjection, type CommandAcknowledgement, type HubBoard, type HubBoardEntity, type IssueProjection, type ProjectProjection, type RemoteCommand, type SyncChange, type SyncEntityType, type SyncProjection } from "./sync-contract.js";

function now() {
  return new Date().toISOString();
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function parseObject(value: string) {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_stored_json");
  return parsed as Record<string, unknown>;
}

function cleanName(value: unknown, limit: number) {
  if (typeof value !== "string" || !value.trim() || value.length > limit || value.includes("\0")) throw new Error("invalid_name");
  return value.trim();
}

function cleanString(value: unknown, limit: number, allowEmpty = true) {
  if (typeof value !== "string" || value.length > limit || value.includes("\0") || (!allowEmpty && !value.trim())) throw new Error("invalid_projection");
  return value;
}

function cleanProjection(type: SyncEntityType, id: string, value: unknown): SyncProjection {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  if (source.id !== id) throw new Error("projection_id_mismatch");
  if (type === "project") return {
    id,
    name: cleanString(source.name, 120, false),
    identifier_prefix: cleanString(source.identifier_prefix, 20, false),
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
  } satisfies ProjectProjection;
  if (type === "agent") return {
    id,
    name: cleanString(source.name, 80, false),
    name_en: cleanString(source.name_en, 80),
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
  } satisfies AgentProjection;
  if (!issueStatuses.includes(source.status as never) || !issuePriorities.includes(source.priority as never)) throw new Error("invalid_projection");
  if (!Array.isArray(source.labels) || source.labels.length > 20 || source.labels.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_projection");
  for (const field of ["pinned", "agent_enabled", "user_assigned", "needs_attention"] as const) if (typeof source[field] !== "boolean") throw new Error("invalid_projection");
  if (typeof source.sort_order !== "number" || !Number.isFinite(source.sort_order)) throw new Error("invalid_projection");
  if (source.archived_at !== null && (typeof source.archived_at !== "string" || source.archived_at.length > 64)) throw new Error("invalid_projection");
  if (source.agent_id !== null && (typeof source.agent_id !== "string" || source.agent_id.length > 200)) throw new Error("invalid_projection");
  if (!['user', 'agent'].includes(String(source.pending_actor))) throw new Error("invalid_projection");
  if (source.active_run_status !== null && (typeof source.active_run_status !== "string" || source.active_run_status.length > 40)) throw new Error("invalid_projection");
  return {
    id,
    identifier: cleanString(source.identifier, 200),
    project_id: cleanString(source.project_id, 200, false),
    title: cleanString(source.title, 500, false),
    description: cleanString(source.description, 100_000),
    status: source.status as IssueProjection["status"],
    priority: source.priority as IssueProjection["priority"],
    labels: source.labels as string[],
    sort_order: source.sort_order,
    pinned: source.pinned as boolean,
    archived_at: source.archived_at as string | null,
    agent_id: source.agent_id as string | null,
    agent_enabled: source.agent_enabled as boolean,
    user_assigned: source.user_assigned as boolean,
    needs_attention: source.needs_attention as boolean,
    pending_actor: source.pending_actor as IssueProjection["pending_actor"],
    active_run_status: source.active_run_status as string | null,
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
  } satisfies IssueProjection;
}

function cleanIssuePatch(value: unknown, create = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_patch");
  const source = value as Record<string, unknown>;
  if (Object.keys(source).some(key => !remoteIssuePatchFields.includes(key as never))) throw new Error("unsupported_patch_field");
  const patch: Record<string, unknown> = {};
  for (const field of remoteIssuePatchFields) {
    if (!(field in source)) continue;
    const item = source[field];
    if (field === "title") patch.title = cleanName(item, 500);
    else if (field === "description") {
      if (typeof item !== "string" || item.length > 100_000 || item.includes("\0")) throw new Error("invalid_description");
      patch.description = item;
    } else if (field === "project_id") patch.project_id = cleanName(item, 200);
    else if (field === "status") {
      if (!issueStatuses.includes(item as never)) throw new Error("invalid_status");
      patch.status = item;
    } else if (field === "priority") {
      if (!issuePriorities.includes(item as never)) throw new Error("invalid_priority");
      patch.priority = item;
    } else if (field === "labels") {
      if (!Array.isArray(item) || item.length > 20 || item.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_labels");
      patch.labels = [...new Set(item.map(label => label.trim()).filter(Boolean))];
    } else if (field === "sort_order") {
      if (typeof item !== "number" || !Number.isFinite(item)) throw new Error("invalid_sort_order");
      patch.sort_order = item;
    } else if (field === "pinned") {
      if (typeof item !== "boolean") throw new Error("invalid_pinned");
      patch.pinned = item;
    }
  }
  if (create && (!patch.project_id || !patch.title)) throw new Error("create_fields_required");
  if (!Object.keys(patch).length) throw new Error("empty_patch");
  return patch;
}

type EntityRow = {
  entity_type: SyncEntityType;
  entity_id: string;
  owner_device_id: string;
  revision: number;
  payload_json: string;
  deleted_at: string | null;
  updated_at: string;
};

type CommandRow = {
  id: string;
  device_id: string;
  entity_type: "issue";
  entity_id: string;
  operation: RemoteCommand["operation"];
  patch_json: string;
  expected_json: string;
  status: "pending" | "applied" | "rejected";
  error: string | null;
  created_at: string;
};

export class HubStore {
  readonly db: DatabaseSync;

  constructor(readonly file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS entities (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        owner_device_id TEXT NOT NULL REFERENCES devices(id),
        revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        deleted_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
      );
      CREATE TABLE IF NOT EXISTS sync_events (
        event_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        received_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS changes (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS commands (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        patch_json TEXT NOT NULL,
        expected_json TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        acknowledged_at TEXT
      );
      CREATE INDEX IF NOT EXISTS commands_device_status ON commands(device_id, status, created_at);
      CREATE INDEX IF NOT EXISTS commands_entity_status ON commands(entity_type, entity_id, status, created_at);
    `);
  }

  close() {
    this.db.close();
  }

  health() {
    const row = this.db.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    return { ok: row?.quick_check === "ok", devices: Number((this.db.prepare("SELECT COUNT(*) AS value FROM devices").get() as { value: number }).value) };
  }

  pairDevice(name: unknown) {
    const deviceName = cleanName(name, 120);
    const id = randomUUID();
    const token = randomBytes(32).toString("hex");
    const timestamp = now();
    this.db.prepare("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)")
      .run(id, deviceName, tokenHash(token), timestamp, timestamp);
    return { device_id: id, device_token: token, device_name: deviceName };
  }

  deviceForToken(token: string) {
    if (!token) return null;
    const row = this.db.prepare("SELECT id, name FROM devices WHERE token_hash = ?").get(tokenHash(token)) as { id: string; name: string } | undefined;
    return row ?? null;
  }

  private entity(type: SyncEntityType, id: string) {
    return this.db.prepare("SELECT * FROM entities WHERE entity_type = ? AND entity_id = ?").get(type, id) as EntityRow | undefined;
  }

  private cursor() {
    return Number((this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS value FROM changes").get() as { value: number }).value);
  }

  push(deviceId: string, changes: SyncChange[]) {
    if (!Array.isArray(changes) || changes.length > 500) throw new Error("invalid_changes");
    const accepted: string[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const change of changes) {
        if (!change || typeof change !== "object" || !syncEntityTypes.includes(change.entity_type) || !change.entity_id || !change.event_id || !["upsert", "delete"].includes(change.operation)) throw new Error("invalid_change");
        if (this.db.prepare("SELECT 1 AS value FROM sync_events WHERE event_id = ?").get(change.event_id)) {
          accepted.push(change.event_id);
          continue;
        }
        const current = this.entity(change.entity_type, change.entity_id);
        if (current && current.owner_device_id !== deviceId) throw new Error("entity_owned_by_another_device");
        const timestamp = now();
        const deletedAt = change.operation === "delete" ? change.changed_at || timestamp : null;
        const payload = change.operation === "upsert" ? JSON.stringify(cleanProjection(change.entity_type, change.entity_id, change.projection)) : current?.payload_json ?? "{}";
        const changed = !current || current.payload_json !== payload || current.deleted_at !== deletedAt;
        if (!current) {
          this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, revision, payload_json, deleted_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)")
            .run(change.entity_type, change.entity_id, deviceId, payload, deletedAt, timestamp);
        } else if (changed) {
          this.db.prepare("UPDATE entities SET revision = revision + 1, payload_json = ?, deleted_at = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ?")
            .run(payload, deletedAt, timestamp, change.entity_type, change.entity_id);
        }
        this.db.prepare("INSERT INTO sync_events (event_id, device_id, received_at) VALUES (?, ?, ?)").run(change.event_id, deviceId, timestamp);
        if (changed) this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES (?, ?, ?, ?)").run(change.entity_type, change.entity_id, change.operation, timestamp);
        accepted.push(change.event_id);
      }
      this.db.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").run(now(), deviceId);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { accepted, cursor: this.cursor() };
  }

  pull(deviceId: string, cursor: number) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("invalid_cursor");
    const rows = this.db.prepare("SELECT * FROM commands WHERE device_id = ? AND status = 'pending' ORDER BY created_at, rowid LIMIT 100").all(deviceId) as CommandRow[];
    this.db.prepare("UPDATE devices SET last_seen_at = ? WHERE id = ?").run(now(), deviceId);
    return {
      cursor: this.cursor(),
      commands: rows.map(row => ({
        id: row.id,
        entity_type: "issue" as const,
        entity_id: row.entity_id,
        operation: row.operation,
        patch: parseObject(row.patch_json),
        expected: parseObject(row.expected_json),
        created_at: row.created_at,
      })),
    };
  }

  acknowledge(deviceId: string, commandId: string, acknowledgement: CommandAcknowledgement) {
    const command = this.db.prepare("SELECT * FROM commands WHERE id = ?").get(commandId) as CommandRow | undefined;
    if (!command || command.device_id !== deviceId) throw new Error("command_not_found");
    if (command.status !== "pending") return { status: command.status };
    if (!acknowledgement || !["applied", "rejected"].includes(acknowledgement.status)) throw new Error("invalid_acknowledgement");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (acknowledgement.status === "applied") {
        if (!acknowledgement.projection || acknowledgement.projection.id !== command.entity_id) throw new Error("projection_required");
        const payload = JSON.stringify(cleanProjection("issue", command.entity_id, acknowledgement.projection));
        const current = this.entity("issue", command.entity_id);
        const timestamp = now();
        if (current) {
          this.db.prepare("UPDATE entities SET revision = revision + 1, payload_json = ?, deleted_at = NULL, updated_at = ? WHERE entity_type = 'issue' AND entity_id = ?")
            .run(payload, timestamp, command.entity_id);
        } else {
          this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, revision, payload_json, deleted_at, updated_at) VALUES ('issue', ?, ?, 1, ?, NULL, ?)")
            .run(command.entity_id, deviceId, payload, timestamp);
        }
        this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'upsert', ?)").run(command.entity_id, timestamp);
      }
      const error = acknowledgement.status === "rejected" ? String(acknowledgement.error || "command_rejected").slice(0, 500) : null;
      this.db.prepare("UPDATE commands SET status = ?, error = ?, acknowledged_at = ? WHERE id = ?")
        .run(acknowledgement.status, error, now(), command.id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { status: acknowledgement.status, cursor: this.cursor() };
  }

  private pendingFor(type: SyncEntityType, id: string) {
    return this.db.prepare("SELECT * FROM commands WHERE entity_type = ? AND entity_id = ? AND status = 'pending' ORDER BY created_at, rowid").all(type, id) as CommandRow[];
  }

  private issueView(id: string) {
    const entity = this.entity("issue", id);
    let payload = entity && !entity.deleted_at ? parseObject(entity.payload_json) : null;
    const pending = this.pendingFor("issue", id);
    for (const command of pending) {
      const patch = parseObject(command.patch_json);
      if (command.operation === "create") payload = { id, ...patch };
      else if (payload && command.operation === "update") payload = { ...payload, ...patch };
      else if (payload && command.operation === "archive") payload = { ...payload, archived_at: command.created_at };
      else if (payload && command.operation === "unarchive") payload = { ...payload, archived_at: null };
    }
    return payload ? { payload: payload as IssueProjection, revision: (entity?.revision ?? 0) + pending.length, pending: pending.length > 0, owner: entity?.owner_device_id ?? pending[0]?.device_id ?? null } : null;
  }

  board(): HubBoard {
    const rows = this.db.prepare("SELECT * FROM entities WHERE deleted_at IS NULL ORDER BY entity_type, updated_at").all() as EntityRow[];
    const projects = rows.filter(row => row.entity_type === "project").map(row => ({ revision: row.revision, pending: false, payload: parseObject(row.payload_json) as ProjectProjection }));
    const agents = rows.filter(row => row.entity_type === "agent").map(row => ({ revision: row.revision, pending: false, payload: parseObject(row.payload_json) as AgentProjection }));
    const issueIds = new Set(rows.filter(row => row.entity_type === "issue").map(row => row.entity_id));
    for (const row of this.db.prepare("SELECT DISTINCT entity_id FROM commands WHERE entity_type = 'issue' AND status = 'pending'").all() as Array<{ entity_id: string }>) issueIds.add(row.entity_id);
    const issues: Array<HubBoardEntity<IssueProjection>> = [];
    for (const id of issueIds) {
      const view = this.issueView(id);
      if (view) issues.push({ revision: view.revision, pending: view.pending, payload: view.payload });
    }
    issues.sort((left, right) => left.payload.sort_order - right.payload.sort_order || left.payload.created_at.localeCompare(right.payload.created_at));
    const conflicts = (this.db.prepare("SELECT id, entity_id, error, created_at FROM commands WHERE status = 'rejected' ORDER BY acknowledged_at DESC LIMIT 20").all() as Array<{ id: string; entity_id: string; error: string | null; created_at: string }>).map(row => ({ ...row, error: row.error || "command_rejected" }));
    return { revision: this.cursor(), projects, issues, agents, conflicts };
  }

  createCommand(input: { entity_id?: unknown; operation?: unknown; patch?: unknown; revision?: unknown }) {
    if (!input || !["create", "update", "archive", "unarchive"].includes(String(input.operation))) throw new Error("invalid_command_operation");
    const operation = String(input.operation) as RemoteCommand["operation"];
    const id = operation === "create" ? randomUUID() : cleanName(input.entity_id, 200);
    const view = this.issueView(id);
    if (operation !== "create" && !view) throw new Error("issue_not_found");
    if (operation === "create" && view) throw new Error("issue_already_exists");
    if (operation !== "create" && Number(input.revision) !== view!.revision) throw new Error("version_conflict");
    const patch = operation === "create" || operation === "update" ? cleanIssuePatch(input.patch, operation === "create") : {};
    let owner: string | null = view?.owner ?? null;
    if (operation === "create") {
      const project = this.entity("project", String(patch.project_id));
      if (!project || project.deleted_at) throw new Error("project_not_found");
      owner = project.owner_device_id;
      patch.description ??= "";
      patch.status ??= "backlog";
      patch.priority ??= "medium";
      patch.labels ??= [];
      patch.sort_order ??= Date.now();
      patch.pinned ??= false;
      patch.identifier = "";
      patch.archived_at = null;
      patch.agent_id = null;
      patch.agent_enabled = false;
      patch.user_assigned = false;
      patch.needs_attention = false;
      patch.pending_actor = "user";
      patch.active_run_status = null;
      patch.created_at = now();
      patch.updated_at = patch.created_at;
    }
    if (!owner) throw new Error("owner_device_unavailable");
    const expected: Record<string, unknown> = {};
    if (operation === "update") for (const field of Object.keys(patch)) expected[field] = (view!.payload as unknown as Record<string, unknown>)[field];
    if (operation === "archive" || operation === "unarchive") expected.archived_at = view!.payload.archived_at;
    const command: RemoteCommand = { id: randomUUID(), entity_type: "issue", entity_id: id, operation, patch, expected, created_at: now() };
    this.db.prepare("INSERT INTO commands (id, device_id, entity_type, entity_id, operation, patch_json, expected_json, status, created_at) VALUES (?, ?, 'issue', ?, ?, ?, ?, 'pending', ?)")
      .run(command.id, owner, id, operation, JSON.stringify(patch), JSON.stringify(expected), command.created_at);
    return { ...command, revision: (view?.revision ?? 0) + 1, pending: true };
  }
}
