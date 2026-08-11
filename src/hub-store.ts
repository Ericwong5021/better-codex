import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { issuePriorities, issueStatuses } from "./db.js";
import { forbiddenProjectionKeys, remoteCommandOperations, syncEntityTypes, syncProtocolVersion, type HubBoard, type IssueProjection, type ProjectProjection, type RemoteCommand, type RemoteCommandAck, type RemoteCommandOperation, type RemoteCommandStatus, type RuntimeProjection, type SyncChange, type SyncEntityType, type SyncProjection, type SyncPushRequest } from "./sync-contract.js";

function now() {
  return new Date().toISOString();
}

function after(milliseconds: number) {
  return new Date(Date.now() + milliseconds).toISOString();
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanString(value: unknown, limit: number, allowEmpty = true) {
  if (typeof value !== "string" || value.length > limit || value.includes("\0") || (!allowEmpty && !value.trim())) throw new Error("invalid_projection");
  return value;
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => forbiddenProjectionKeys.some(blocked => key.toLowerCase().includes(blocked)) || containsForbiddenKey(item));
}

function cleanProjection(type: SyncEntityType, id: string, value: unknown): SyncProjection {
  if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("forbidden_projection_field");
  const source = value as Record<string, unknown>;
  if (source.id !== id || !Number.isSafeInteger(source.local_revision) || Number(source.local_revision) < 1) throw new Error("invalid_projection");
  if (type === "project") return {
    id,
    name: cleanString(source.name, 120, false),
    identifier_prefix: cleanString(source.identifier_prefix, 20, false),
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
    local_revision: Number(source.local_revision),
  } satisfies ProjectProjection;
  if (!issueStatuses.includes(source.status as never) || !issuePriorities.includes(source.priority as never)) throw new Error("invalid_projection");
  if (!Array.isArray(source.labels) || source.labels.length > 20 || source.labels.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_projection");
  if (typeof source.sort_order !== "number" || !Number.isFinite(source.sort_order)) throw new Error("invalid_projection");
  for (const field of ["pinned", "assigned", "active_run", "needs_attention"] as const) if (typeof source[field] !== "boolean") throw new Error("invalid_projection");
  if (source.archived_at !== null && (typeof source.archived_at !== "string" || source.archived_at.length > 64)) throw new Error("invalid_projection");
  return {
    id,
    identifier: cleanString(source.identifier, 200, false),
    project_id: cleanString(source.project_id, 200, false),
    title: cleanString(source.title, 500, false),
    description: cleanString(source.description, 100_000),
    status: source.status as IssueProjection["status"],
    priority: source.priority as IssueProjection["priority"],
    labels: source.labels as string[],
    sort_order: source.sort_order,
    pinned: source.pinned as boolean,
    archived_at: source.archived_at as string | null,
    assigned: source.assigned as boolean,
    active_run: source.active_run as boolean,
    needs_attention: source.needs_attention as boolean,
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
    local_revision: Number(source.local_revision),
  } satisfies IssueProjection;
}

function cleanRuntime(value: unknown, deviceId: string): RuntimeProjection {
  if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("invalid_runtime_projection");
  const source = value as Record<string, unknown>;
  if (source.device_id !== deviceId || source.protocol_version !== syncProtocolVersion || source.health_state !== "online") throw new Error("invalid_runtime_projection");
  return {
    device_id: deviceId,
    device_name: cleanString(source.device_name, 120, false),
    protocol_version: syncProtocolVersion,
    core_version: cleanString(source.core_version, 40, false),
    last_seen_at: now(),
    last_sync_at: typeof source.last_sync_at === "string" ? cleanString(source.last_sync_at, 64) : null,
    queue_depth: Number.isSafeInteger(source.queue_depth) && Number(source.queue_depth) >= 0 ? Number(source.queue_depth) : 0,
    health_state: "online",
  };
}

type EntityRow = { entity_type: SyncEntityType; entity_id: string; payload_json: string; deleted_at: string | null };
type CommandRow = { command_id: string; device_id: string; operation: RemoteCommandOperation; entity_id: string; base_revision: number | null; payload_json: string; status: RemoteCommandStatus; requested_at: string; expires_at: string; finished_at: string | null; error: string | null };

function commandFromRow(row: CommandRow): RemoteCommand {
  return { ...row, payload: JSON.parse(row.payload_json) as Record<string, unknown> };
}

function cleanCommandPayload(operation: RemoteCommandOperation, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("invalid_command_payload");
  const source = value as Record<string, unknown>;
  const allowed = operation === "issue.create"
    ? ["project_id", "title", "description", "status", "priority", "labels", "user_assigned"]
    : operation === "issue.update"
      ? ["project_id", "title", "description", "status", "priority", "labels", "sort_order", "pinned", "user_assigned"]
      : operation === "issue.move" ? ["status", "before_id"] : [];
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error("forbidden_command_field");
  const payload: Record<string, unknown> = {};
  if (source.project_id !== undefined) payload.project_id = cleanString(source.project_id, 200, false);
  if (source.title !== undefined) payload.title = cleanString(source.title, 500, false);
  if (source.description !== undefined) payload.description = cleanString(source.description, 100_000);
  if (source.status !== undefined) {
    if (!issueStatuses.includes(source.status as never)) throw new Error("invalid_status");
    payload.status = source.status;
  }
  if (source.priority !== undefined) {
    if (!issuePriorities.includes(source.priority as never)) throw new Error("invalid_priority");
    payload.priority = source.priority;
  }
  if (source.labels !== undefined) {
    if (!Array.isArray(source.labels) || source.labels.length > 20 || source.labels.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_labels");
    payload.labels = source.labels;
  }
  if (source.sort_order !== undefined) {
    if (typeof source.sort_order !== "number" || !Number.isFinite(source.sort_order)) throw new Error("invalid_sort_order");
    payload.sort_order = source.sort_order;
  }
  if (source.pinned !== undefined) payload.pinned = source.pinned === true;
  if (source.user_assigned !== undefined) payload.user_assigned = source.user_assigned === true;
  if (source.before_id !== undefined) payload.before_id = cleanString(source.before_id, 200);
  if (operation === "issue.create" && (!payload.project_id || !payload.title)) throw new Error("invalid_command_payload");
  if (operation === "issue.move" && !payload.status) throw new Error("invalid_command_payload");
  return payload;
}

export class HubStore {
  readonly db: DatabaseSync;

  constructor(readonly file: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hub_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS pairing_codes (code_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL, used_at TEXT);
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        lease_expires_at TEXT,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS entities (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        owner_device_id TEXT NOT NULL REFERENCES devices(id),
        local_revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        deleted_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
      );
      CREATE TABLE IF NOT EXISTS sync_events (event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, received_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_projection (device_id TEXT PRIMARY KEY REFERENCES devices(id), payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS remote_commands (
        command_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        base_revision INTEGER,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        finished_at TEXT,
        error TEXT
      );
      CREATE TABLE IF NOT EXISTS remote_command_audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id TEXT NOT NULL,
        status TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS changes_created_at ON changes(created_at);
      CREATE INDEX IF NOT EXISTS remote_commands_queue ON remote_commands(device_id, status, requested_at);
      INSERT OR IGNORE INTO hub_migrations (version, applied_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      INSERT OR IGNORE INTO hub_migrations (version, applied_at) VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    `);
  }

  close() {
    this.db.close();
  }

  health() {
    const check = this.db.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    const devices = this.db.prepare("SELECT COUNT(*) AS value FROM devices WHERE revoked_at IS NULL").get() as { value: number };
    return { ok: check?.quick_check === "ok", protocol_version: syncProtocolVersion, devices: Number(devices.value), revision: this.cursor() };
  }

  createPairingCode() {
    const code = randomBytes(6).toString("base64url");
    const expires_at = after(10 * 60_000);
    this.db.prepare("INSERT INTO pairing_codes (code_hash, expires_at) VALUES (?, ?)").run(tokenHash(code), expires_at);
    return { pairing_code: code, expires_at };
  }

  pairDevice(nameValue: unknown, code: unknown) {
    const name = cleanString(nameValue, 120, false).trim();
    if (typeof code !== "string" || !code) throw new Error("invalid_pairing_code");
    const row = this.db.prepare("SELECT expires_at, used_at FROM pairing_codes WHERE code_hash = ?").get(tokenHash(code)) as { expires_at: string; used_at: string | null } | undefined;
    if (!row || row.used_at || row.expires_at <= now()) throw new Error("invalid_pairing_code");
    const id = randomUUID();
    const token = randomBytes(32).toString("hex");
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("UPDATE pairing_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL").run(timestamp, tokenHash(code));
      this.db.prepare("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").run(id, name, tokenHash(token), timestamp, timestamp);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { protocol_version: syncProtocolVersion, device_id: id, device_token: token, device_name: name };
  }

  deviceForToken(token: string) {
    if (!token) return null;
    return this.db.prepare("SELECT id, name, lease_expires_at FROM devices WHERE token_hash = ? AND revoked_at IS NULL").get(tokenHash(token)) as { id: string; name: string; lease_expires_at: string | null } | undefined ?? null;
  }

  devices() {
    return this.db.prepare("SELECT id, name, created_at, last_seen_at, lease_expires_at, revoked_at FROM devices ORDER BY created_at").all();
  }

  revokeDevice(id: string) {
    const result = this.db.prepare("UPDATE devices SET revoked_at = ?, lease_expires_at = NULL WHERE id = ? AND revoked_at IS NULL").run(now(), id);
    if (result.changes !== 1) throw new Error("device_not_found");
    return { revoked: true, device_id: id };
  }

  private cursor() {
    return Number((this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS value FROM changes").get() as { value: number }).value);
  }

  private writerDeviceId(entityId = "") {
    if (entityId) {
      const entity = this.db.prepare("SELECT owner_device_id FROM entities WHERE entity_type = 'issue' AND entity_id = ?").get(entityId) as { owner_device_id: string } | undefined;
      if (entity) return entity.owner_device_id;
    }
    const device = this.db.prepare("SELECT id FROM devices WHERE revoked_at IS NULL AND lease_expires_at IS NOT NULL ORDER BY last_seen_at DESC LIMIT 1").get() as { id: string } | undefined;
    if (!device) throw new Error("runtime_not_paired");
    return device.id;
  }

  private recordCommandChange(commandId: string, status: RemoteCommandStatus, detail: string | null = null) {
    const timestamp = now();
    this.db.prepare("INSERT INTO remote_command_audit (command_id, status, detail, created_at) VALUES (?, ?, ?, ?)").run(commandId, status, detail, timestamp);
    this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'command', ?)").run(commandId, timestamp);
  }

  private expireCommands() {
    const rows = this.db.prepare("SELECT command_id FROM remote_commands WHERE status = 'pending' AND expires_at <= ?").all(now()) as Array<{ command_id: string }>;
    for (const row of rows) {
      this.db.prepare("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'command_expired' WHERE command_id = ? AND status = 'pending'").run(now(), row.command_id);
      this.recordCommandChange(row.command_id, "expired", "command_expired");
    }
  }

  createRemoteCommand(input: { command_id?: unknown; operation: unknown; entity_id?: unknown; base_revision?: unknown; payload?: unknown }) {
    if (!remoteCommandOperations.includes(input.operation as never)) throw new Error("invalid_command_operation");
    const operation = input.operation as RemoteCommandOperation;
    const commandId = input.command_id === undefined ? randomUUID() : cleanString(input.command_id, 200, false);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(commandId)) throw new Error("invalid_command_id");
    const baseRevision = operation === "issue.create" ? null : Number(input.base_revision);
    if (operation !== "issue.create" && (!Number.isInteger(baseRevision) || Number(baseRevision) < 1)) throw new Error("invalid_version");
    const payload = cleanCommandPayload(operation, input.payload ?? {});
    const existing = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow | undefined;
    if (existing) {
      if (existing.operation !== operation || (input.entity_id !== undefined && existing.entity_id !== input.entity_id) || existing.base_revision !== baseRevision || existing.payload_json !== JSON.stringify(payload)) throw new Error("command_id_conflict");
      return commandFromRow(existing);
    }
    const entityId = operation === "issue.create" && input.entity_id === undefined ? randomUUID() : cleanString(input.entity_id, 200, false);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(entityId)) throw new Error("invalid_issue_id");
    const current = this.db.prepare("SELECT payload_json, deleted_at FROM entities WHERE entity_type = 'issue' AND entity_id = ?").get(entityId) as { payload_json: string; deleted_at: string | null } | undefined;
    if (operation === "issue.create" && current && !current.deleted_at) throw new Error("issue_exists");
    if (operation !== "issue.create" && (!current || current.deleted_at)) throw new Error("issue_not_found");
    if (current && (JSON.parse(current.payload_json) as IssueProjection).active_run) throw new Error("issue_execution_running");
    const deviceId = this.writerDeviceId(entityId);
    const requestedAt = now();
    const expiresAt = after(24 * 60 * 60_000);
    this.db.prepare("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'superseded' WHERE entity_id = ? AND status IN ('conflict', 'rejected')").run(requestedAt, entityId);
    this.db.prepare("INSERT INTO remote_commands (command_id, device_id, operation, entity_id, base_revision, payload_json, status, requested_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)").run(commandId, deviceId, operation, entityId, baseRevision, JSON.stringify(payload), requestedAt, expiresAt);
    this.recordCommandChange(commandId, "pending");
    return commandFromRow(this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow);
  }

  remoteCommand(commandId: string) {
    this.expireCommands();
    const row = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow | undefined;
    return row ? commandFromRow(row) : null;
  }

  pendingCommands(deviceId: string, limit = 100) {
    this.expireCommands();
    return (this.db.prepare("SELECT * FROM remote_commands WHERE device_id = ? AND status = 'pending' ORDER BY requested_at, command_id LIMIT ?").all(deviceId, Math.min(Math.max(Math.trunc(limit), 1), 100)) as CommandRow[]).map(commandFromRow);
  }

  ackRemoteCommand(deviceId: string, ack: RemoteCommandAck) {
    const row = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ? AND device_id = ?").get(ack.command_id, deviceId) as CommandRow | undefined;
    if (!row) throw new Error("command_not_found");
    if (row.status !== "pending") return commandFromRow(row);
    if (!(["applied", "rejected", "conflict"] as const).includes(ack.status)) throw new Error("invalid_command_status");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (ack.status === "applied") {
        const projection = cleanProjection("issue", row.entity_id, ack.projection);
        const current = this.db.prepare("SELECT owner_device_id FROM entities WHERE entity_type = 'issue' AND entity_id = ?").get(row.entity_id) as { owner_device_id: string } | undefined;
        if (!current) this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES ('issue', ?, ?, ?, ?, NULL, ?)").run(row.entity_id, deviceId, projection.local_revision, JSON.stringify(projection), now());
        else this.db.prepare("UPDATE entities SET local_revision = ?, payload_json = ?, deleted_at = NULL, updated_at = ? WHERE entity_type = 'issue' AND entity_id = ? AND owner_device_id = ?").run(projection.local_revision, JSON.stringify(projection), now(), row.entity_id, deviceId);
      }
      this.db.prepare("UPDATE remote_commands SET status = ?, finished_at = ?, error = ? WHERE command_id = ? AND status = 'pending'").run(ack.status, now(), ack.error, ack.command_id);
      this.recordCommandChange(ack.command_id, ack.status, ack.error);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.remoteCommand(ack.command_id)!;
  }

  private acquireLease(deviceId: string) {
    const timestamp = now();
    const takeoverAt = new Date(Date.now() - 60_000).toISOString();
    const owner = this.db.prepare("SELECT id FROM devices WHERE id != ? AND revoked_at IS NULL AND lease_expires_at IS NOT NULL AND last_seen_at > ? LIMIT 1").get(deviceId, takeoverAt);
    if (owner) throw new Error("writer_lease_conflict");
    const expires = after(30_000);
    this.db.prepare("UPDATE devices SET last_seen_at = ?, lease_expires_at = ? WHERE id = ? AND revoked_at IS NULL").run(timestamp, expires, deviceId);
    return expires;
  }

  push(deviceId: string, request: SyncPushRequest) {
    if (request.protocol_version !== syncProtocolVersion) throw new Error("incompatible_protocol");
    if (request.device_id !== deviceId || !Array.isArray(request.changes) || request.changes.length > 100) throw new Error("invalid_changes");
    const runtime = cleanRuntime(request.runtime, deviceId);
    const accepted: string[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const lease_expires_at = this.acquireLease(deviceId);
      for (const change of request.changes) {
        if (!change || !syncEntityTypes.includes(change.entity_type) || typeof change.entity_id !== "string" || !change.entity_id || typeof change.event_id !== "string" || !change.event_id || !["upsert", "delete"].includes(change.operation)) throw new Error("invalid_change");
        if (this.db.prepare("SELECT 1 FROM sync_events WHERE event_id = ?").get(change.event_id)) {
          accepted.push(change.event_id);
          continue;
        }
        const current = this.db.prepare("SELECT * FROM entities WHERE entity_type = ? AND entity_id = ?").get(change.entity_type, change.entity_id) as (EntityRow & { owner_device_id: string; local_revision: number }) | undefined;
        if (current && current.owner_device_id !== deviceId) throw new Error("entity_owned_by_another_device");
        const projection = change.operation === "upsert" ? cleanProjection(change.entity_type, change.entity_id, change.projection) : null;
        const payload = projection ? JSON.stringify(projection) : current?.payload_json ?? "{}";
        const deletedAt = projection ? null : cleanString(change.changed_at, 64, false);
        const localRevision = projection?.local_revision ?? current?.local_revision ?? 0;
        const changed = !current || current.payload_json !== payload || current.deleted_at !== deletedAt;
        if (!current) this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(change.entity_type, change.entity_id, deviceId, localRevision, payload, deletedAt, now());
        else if (changed) this.db.prepare("UPDATE entities SET local_revision = ?, payload_json = ?, deleted_at = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ?").run(localRevision, payload, deletedAt, now(), change.entity_type, change.entity_id);
        this.db.prepare("INSERT INTO sync_events (event_id, device_id, received_at) VALUES (?, ?, ?)").run(change.event_id, deviceId, now());
        if (changed) this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES (?, ?, ?, ?)").run(change.entity_type, change.entity_id, projection ? "upsert" : "delete", now());
        accepted.push(change.event_id);
      }
      this.db.prepare("INSERT INTO runtime_projection (device_id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at").run(deviceId, JSON.stringify({ ...runtime, last_seen_at: now() }), now());
      this.db.exec("COMMIT");
      return { accepted, cursor: this.cursor(), lease_expires_at };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  board(): HubBoard {
    this.expireCommands();
    const rows = this.db.prepare("SELECT entity_type, entity_id, payload_json, deleted_at FROM entities WHERE deleted_at IS NULL ORDER BY entity_type, updated_at").all() as EntityRow[];
    const runtimeRow = this.db.prepare("SELECT payload_json, updated_at FROM runtime_projection ORDER BY updated_at DESC LIMIT 1").get() as { payload_json: string; updated_at: string } | undefined;
    let runtime = runtimeRow ? JSON.parse(runtimeRow.payload_json) as RuntimeProjection : null;
    if (runtime && Date.now() - Date.parse(runtimeRow!.updated_at) > 60_000) runtime = { ...runtime, health_state: "offline" };
    const issues = rows.filter(row => row.entity_type === "issue").map(row => JSON.parse(row.payload_json) as IssueProjection);
    const commands = this.db.prepare("SELECT * FROM remote_commands WHERE status IN ('pending', 'conflict', 'rejected') ORDER BY requested_at, command_id").all() as CommandRow[];
    for (const row of commands) {
      const command = commandFromRow(row);
      let issue = issues.find(item => item.id === command.entity_id);
      if (!issue && command.operation === "issue.create" && command.status === "pending") {
        issue = {
          id: command.entity_id,
          identifier: `PENDING-${command.entity_id.slice(0, 8).toUpperCase()}`,
          project_id: String(command.payload.project_id),
          title: String(command.payload.title),
          description: String(command.payload.description || ""),
          status: command.payload.status as IssueProjection["status"] || "todo",
          priority: command.payload.priority as IssueProjection["priority"] || "medium",
          labels: command.payload.labels as string[] || [],
          sort_order: Number.MAX_SAFE_INTEGER,
          pinned: false,
          archived_at: null,
          assigned: command.payload.user_assigned === true,
          active_run: false,
          needs_attention: false,
          created_at: command.requested_at,
          updated_at: command.requested_at,
          local_revision: 0,
        };
        issues.push(issue);
      }
      if (!issue) continue;
      if (command.status === "pending" && ["issue.update", "issue.move"].includes(command.operation)) Object.assign(issue, command.payload, { updated_at: command.requested_at });
      Object.assign(issue, { remote_state: { command_id: command.command_id, status: command.status, operation: command.operation, error: command.error } });
    }
    return {
      revision: this.cursor(),
      projects: rows.filter(row => row.entity_type === "project").map(row => JSON.parse(row.payload_json) as ProjectProjection),
      issues: issues.sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)),
      runtime,
    };
  }

  changesAfter(cursor: number, limit = 1000) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("invalid_cursor");
    return this.db.prepare("SELECT seq, entity_type, entity_id, operation, created_at FROM changes WHERE seq > ? ORDER BY seq LIMIT ?").all(cursor, Math.min(Math.max(limit, 1), 1000)) as Array<{ seq: number; entity_type: string; entity_id: string; operation: string; created_at: string }>;
  }

  clearProjection() {
    const pending = this.db.prepare("SELECT COUNT(*) AS value FROM remote_commands WHERE status = 'pending'").get() as { value: number };
    if (Number(pending.value) > 0) throw new Error("pending_commands_exist");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("DELETE FROM runtime_projection; DELETE FROM sync_events; DELETE FROM entities; DELETE FROM changes;");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return { cleared: true };
  }
}
