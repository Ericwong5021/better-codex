import { controlCapabilities, controlProtocolVersion, decodeControlMessage, encodeControlMessage } from "./control-protocol.js";
import { syncProtocolVersion, supportedSyncProtocolVersions, type RemoteCommandAck, type SyncChange, type SyncPushRequest } from "./sync-contract.js";

type SqlRow = Record<string, unknown>;
type SqlCursor = { toArray(): SqlRow[] };
type SqlStorage = { exec(query: string, ...bindings: unknown[]): SqlCursor };
type DurableObjectWebSocket = WebSocket & { serializeAttachment?(value: unknown): void; deserializeAttachment?(): unknown };
type DurableObjectState = {
  storage: { sql: SqlStorage };
  blockConcurrencyWhile<T>(callback: () => Promise<T> | T): Promise<T>;
  acceptWebSocket?(socket: DurableObjectWebSocket, tags?: string[]): void;
  getWebSockets?(tag?: string): DurableObjectWebSocket[];
};
type DurableObjectNamespace = { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
type CloudflareEnv = { HUB: DurableObjectNamespace; ADMIN_TOKEN?: string; ASSETS?: { fetch(request: Request): Promise<Response> } };
type WebSocketPairConstructor = new () => [WebSocket, WebSocket];
declare const WebSocketPair: WebSocketPairConstructor;

const schema = `
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, lease_expires_at TEXT, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS entities (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, owner_device_id TEXT NOT NULL, local_revision INTEGER NOT NULL, payload_json TEXT NOT NULL, deleted_at TEXT, updated_at TEXT NOT NULL, PRIMARY KEY(entity_type, entity_id));
CREATE TABLE IF NOT EXISTS sync_events (event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, received_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_projection (device_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversations (issue_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS remote_commands (command_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, operation TEXT NOT NULL, entity_id TEXT NOT NULL, base_revision INTEGER, payload_json TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL, expires_at TEXT NOT NULL, finished_at TEXT, error TEXT, delivery_id TEXT, dispatched_at TEXT, dispatch_expires_at TEXT, attempt_count INTEGER NOT NULL DEFAULT 0, last_delivery_error TEXT);
CREATE INDEX IF NOT EXISTS remote_commands_queue ON remote_commands(device_id, status, requested_at);
`;

function timestamp(offset = 0) {
  return new Date(Date.now() + offset).toISOString();
}

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", ...headers } });
}

function tokenFromRequest(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function controlToken(request: Request) {
  return (request.headers.get("sec-websocket-protocol") || "").split(",").map(value => value.trim()).find(value => value !== "better-codex-control-v1") || "";
}

async function tokenHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function boundedLimit(value: string | null) {
  const parsed = Number(value || 100);
  return Math.min(Math.max(Number.isFinite(parsed) ? Math.trunc(parsed) : 100, 1), 100);
}

function recoverExpiredCommands(sql: SqlStorage) {
  sql.exec("UPDATE remote_commands SET status = 'pending', delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL, last_delivery_error = 'delivery_lease_expired' WHERE status = 'dispatched' AND dispatch_expires_at IS NOT NULL AND dispatch_expires_at <= ?", timestamp());
  sql.exec("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'command_expired' WHERE status = 'pending' AND expires_at <= ?", timestamp(), timestamp());
}

function decodePayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  const forbidden = (item: unknown): boolean => Array.isArray(item)
    ? item.some(forbidden)
    : Boolean(item && typeof item === "object" && Object.entries(item as Record<string, unknown>).some(([key, child]) => ["workspace_path", "thread_id", "credential", "prompt", "sandbox_mode", "model", "reasoning_effort", "rollout_path"].some(blocked => key.toLowerCase().includes(blocked)) || forbidden(child)));
  if (forbidden(source)) throw new Error("forbidden_projection_field");
  return source;
}

export class BetterCodexHubObject {
  private ready: Promise<void>;
  private readonly sql: SqlStorage;

  constructor(private readonly state: DurableObjectState, private readonly env: CloudflareEnv) {
    this.sql = state.storage.sql;
    this.ready = state.blockConcurrencyWhile(() => { this.sql.exec(schema); });
  }

  async fetch(request: Request) {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") return json({ ok: true, protocol_version: syncProtocolVersion, revision: this.revision() });
      if (url.pathname === "/api/v1/control" && request.headers.get("upgrade")?.toLowerCase() === "websocket") return this.openControl(request);
    if (url.pathname === "/api/v1/devices" && request.method === "POST") return this.createDevice(request);
    const device = await this.deviceForToken(tokenFromRequest(request));
    if (!device) return json({ error: "unauthorized" }, 401);
    try {
      if (url.pathname === "/api/v1/capabilities" && request.method === "GET") return json({ protocol_versions: ["sync/v6", "sync/v5"], control_protocol: "control/v1", transports: ["websocket", "http"], command_delivery: "lease" });
      if (url.pathname === "/api/v1/sync/push" && request.method === "POST") return json(this.push(device.id, await request.json() as SyncPushRequest));
      if (url.pathname === "/api/v1/sync/commands" && request.method === "GET") return json({ commands: this.pendingCommands(device.id, boundedLimit(url.searchParams.get("limit"))) });
      if (url.pathname === "/api/v1/sync/commands/claim" && request.method === "POST") return json({ commands: this.claimCommands(device.id, boundedLimit(url.searchParams.get("limit"))) });
      const ack = url.pathname.match(/^\/api\/v1\/sync\/commands\/([^/]+)\/ack$/);
      if (ack && request.method === "POST") return json(this.ack(device.id, { ...(await request.json() as Record<string, unknown>), command_id: decodeURIComponent(ack[1]) } as RemoteCommandAck));
      const conversation = url.pathname.match(/^\/api\/v1\/sync\/issues\/([^/]+)\/conversation$/);
      if (conversation && request.method === "PUT") return json(this.putConversation(device.id, decodeURIComponent(conversation[1]), await request.json()));
      return json({ error: "not_found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "hub_error" }, 400);
    }
  }

  private async createDevice(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const body = await request.json() as Record<string, unknown>;
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Runtime";
    const id = crypto.randomUUID();
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = [...tokenBytes].map(value => value.toString(16).padStart(2, "0")).join("");
    const created = timestamp();
    this.sql.exec("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)", id, name, await tokenHash(token), created, created);
    return json({ protocol_version: syncProtocolVersion, device_id: id, device_name: name, device_token: token }, 201);
  }

  private async deviceForToken(token: string) {
    if (!token) return null;
    const row = this.sql.exec("SELECT id, name, lease_expires_at FROM devices WHERE token_hash = ? AND revoked_at IS NULL", await tokenHash(token)).toArray()[0] as { id: string; name: string; lease_expires_at: string | null } | undefined;
    return row || null;
  }

  private revision() {
    return Number(this.sql.exec("SELECT COALESCE(MAX(seq), 0) AS value FROM changes").toArray()[0]?.value || 0);
  }

  private lease(deviceId: string) {
    const expires = timestamp(90_000);
    const existing = this.sql.exec("SELECT id FROM devices WHERE id = ? AND revoked_at IS NULL", deviceId).toArray()[0];
    if (!existing) throw new Error("device_revoked");
    this.sql.exec("UPDATE devices SET last_seen_at = ?, lease_expires_at = ? WHERE id = ? AND revoked_at IS NULL", timestamp(), expires, deviceId);
    return expires;
  }

  private countCommands(deviceId: string) {
    return Number(this.sql.exec("SELECT COUNT(*) AS value FROM remote_commands WHERE device_id = ? AND status IN ('pending', 'dispatched')", deviceId).toArray()[0]?.value || 0);
  }

  private push(deviceId: string, request: SyncPushRequest) {
    if (!supportedSyncProtocolVersions.includes(request.protocol_version)) throw new Error("incompatible_protocol");
    if (request.device_id !== deviceId || !Array.isArray(request.changes) || request.changes.length > 100) throw new Error("invalid_changes");
    if (request.runtime?.device_id !== deviceId || !supportedSyncProtocolVersions.includes(request.runtime?.protocol_version) || request.runtime.health_state !== "online") throw new Error("invalid_runtime_projection");
    const leaseExpiresAt = this.lease(deviceId);
    const accepted: string[] = [];
    for (const change of request.changes) {
      if (!change || typeof change.event_id !== "string" || !change.entity_id || !["project", "issue", "agent_directory"].includes(change.entity_type)) throw new Error("invalid_change");
      if (this.sql.exec("SELECT event_id FROM sync_events WHERE event_id = ?", change.event_id).toArray().length) { accepted.push(change.event_id); continue; }
      const current = this.sql.exec("SELECT * FROM entities WHERE entity_type = ? AND entity_id = ?", change.entity_type, change.entity_id).toArray()[0] as { owner_device_id: string; payload_json: string; local_revision: number; deleted_at: string | null } | undefined;
      if (current && current.owner_device_id !== deviceId) throw new Error("entity_owned_by_another_device");
      const projection = change.operation === "upsert" ? decodePayload(change.projection) : null;
      if (projection && (projection.id !== change.entity_id || !Number.isSafeInteger(projection.local_revision) || Number(projection.local_revision) < 1)) throw new Error("invalid_projection");
      const payload = JSON.stringify(projection || (current ? JSON.parse(current.payload_json) : {}));
      const localRevision = Number((projection as Record<string, unknown> | null)?.local_revision || current?.local_revision || 0);
      const deletedAt = projection ? null : change.changed_at;
      if (!current) this.sql.exec("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", change.entity_type, change.entity_id, deviceId, localRevision, payload, deletedAt, timestamp());
      else this.sql.exec("UPDATE entities SET local_revision = ?, payload_json = ?, deleted_at = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ?", localRevision, payload, deletedAt, timestamp(), change.entity_type, change.entity_id);
      this.sql.exec("INSERT INTO sync_events (event_id, device_id, received_at) VALUES (?, ?, ?)", change.event_id, deviceId, timestamp());
      this.sql.exec("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES (?, ?, ?, ?)", change.entity_type, change.entity_id, projection ? "upsert" : "delete", timestamp());
      accepted.push(change.event_id);
    }
    this.sql.exec("INSERT INTO runtime_projection (device_id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at", deviceId, JSON.stringify({ ...request.runtime, protocol_version: request.protocol_version, last_seen_at: timestamp() }), timestamp());
    return { accepted, cursor: this.revision(), lease_expires_at: leaseExpiresAt };
  }

  private pendingCommands(deviceId: string, limit: number) {
    recoverExpiredCommands(this.sql);
    return this.sql.exec("SELECT * FROM remote_commands WHERE device_id = ? AND status = 'pending' ORDER BY requested_at, rowid LIMIT ?", deviceId, limit).toArray().map(row => this.command(row));
  }

  private claimCommands(deviceId: string, limit: number) {
    recoverExpiredCommands(this.sql);
    const rows = this.pendingCommands(deviceId, limit);
    return rows.map(command => {
      const deliveryId = crypto.randomUUID();
      this.sql.exec("UPDATE remote_commands SET status = 'dispatched', delivery_id = ?, dispatched_at = ?, dispatch_expires_at = ?, attempt_count = COALESCE(attempt_count, 0) + 1 WHERE command_id = ? AND status = 'pending'", deliveryId, timestamp(), timestamp(90_000), command.command_id);
      return this.command(this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", command.command_id).toArray()[0]);
    });
  }

  private ack(deviceId: string, ack: RemoteCommandAck) {
    recoverExpiredCommands(this.sql);
    const row = this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ? AND device_id = ?", ack.command_id, deviceId).toArray()[0] as SqlRow | undefined;
    if (!row) throw new Error("command_not_found");
    if (!["pending", "dispatched"].includes(String(row.status))) return this.command(row);
    if (row.status === "dispatched" && row.delivery_id && row.delivery_id !== ack.delivery_id) throw new Error("stale_command_delivery");
    if (!["applied", "rejected", "conflict"].includes(ack.status)) throw new Error("invalid_command_status");
    if (ack.status === "applied") {
      const projection = decodePayload(ack.projection);
      if (projection.id !== row.entity_id || !Number.isSafeInteger(projection.local_revision) || Number(projection.local_revision) < 1) throw new Error("invalid_projection");
      this.sql.exec("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES ('issue', ?, ?, ?, ?, NULL, ?) ON CONFLICT(entity_type, entity_id) DO UPDATE SET owner_device_id = excluded.owner_device_id, local_revision = excluded.local_revision, payload_json = excluded.payload_json, deleted_at = NULL, updated_at = excluded.updated_at", row.entity_id, deviceId, projection.local_revision, JSON.stringify(projection), timestamp());
      this.sql.exec("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'upsert', ?)", row.entity_id, timestamp());
    }
    this.sql.exec("UPDATE remote_commands SET status = ?, finished_at = ?, error = ?, delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL WHERE command_id = ?", ack.status, timestamp(), ack.error, ack.command_id);
    return this.command(this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", ack.command_id).toArray()[0]);
  }

  private putConversation(deviceId: string, issueId: string, value: unknown) {
    const payload = JSON.stringify(decodePayload(value));
    this.sql.exec("INSERT INTO conversations (issue_id, owner_device_id, payload_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(issue_id) DO UPDATE SET owner_device_id = excluded.owner_device_id, payload_json = excluded.payload_json, updated_at = excluded.updated_at", issueId, deviceId, payload, timestamp());
    return JSON.parse(payload);
  }

  private command(row: SqlRow): Record<string, unknown> {
    return { ...row, payload: JSON.parse(String(row.payload_json)), payload_json: undefined, attempt_count: Number(row.attempt_count || 0) };
  }

  private async openControl(request: Request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1] as DurableObjectWebSocket;
    const device = await this.deviceForToken(controlToken(request));
    if (!device) return json({ error: "unauthorized" }, 401);
    server.serializeAttachment?.({ device_id: device.id });
    this.state.acceptWebSocket?.(server, [`device:${device.id}`]);
    return new Response(null, { status: 101, webSocket: client, headers: { "sec-websocket-protocol": "better-codex-control-v1" } } as ResponseInit & { webSocket: WebSocket });
  }

  async webSocketMessage(socket: DurableObjectWebSocket, value: string | ArrayBuffer) {
    await this.ready;
    const attachment = socket.deserializeAttachment?.() as { device_id?: string } | undefined;
    if (!attachment?.device_id) return socket.close(1008, "unauthorized");
    try {
      const message = decodeControlMessage(typeof value === "string" ? value : new Uint8Array(value));
      if (message.type === "hello" || message.type === "heartbeat") {
        if (message.device_id !== attachment.device_id) throw new Error("device_mismatch");
        const leaseExpiresAt = this.lease(attachment.device_id);
        socket.send(encodeControlMessage(message.type === "hello"
          ? { type: "hello_ack", protocol_version: controlProtocolVersion, sync_protocol_version: syncProtocolVersion, capabilities: [...controlCapabilities], revision: this.revision(), lease_expires_at: leaseExpiresAt }
          : { type: "heartbeat_ack", protocol_version: controlProtocolVersion, lease_expires_at: leaseExpiresAt, commands_available: this.countCommands(attachment.device_id) }));
        if (this.countCommands(attachment.device_id) > 0) socket.send(encodeControlMessage({ type: "commands_available", protocol_version: controlProtocolVersion, count: this.countCommands(attachment.device_id) }));
        return;
      }
      if (message.type === "rpc_request" && message.method === "commands.claim") {
        const commands = this.claimCommands(attachment.device_id, boundedLimit(String(message.params.limit || 100)));
        socket.send(encodeControlMessage({ type: "rpc_response", protocol_version: controlProtocolVersion, request_id: message.request_id, ok: true, result: { commands } }));
        return;
      }
      if (message.type === "rpc_request" && message.method === "commands.ack") {
        const command = this.ack(attachment.device_id, message.params as RemoteCommandAck);
        socket.send(encodeControlMessage({ type: "rpc_response", protocol_version: controlProtocolVersion, request_id: message.request_id, ok: true, result: { command } }));
        return;
      }
      throw new Error("unsupported_control_message");
    } catch {
      socket.close(1008, "invalid_control_message");
    }
  }

  webSocket(ws: DurableObjectWebSocket) {
    ws.addEventListener("message", event => { void this.webSocketMessage(ws, typeof event.data === "string" ? event.data : event.data as ArrayBuffer); });
    ws.addEventListener("close", () => this.webSocketClose(ws));
    ws.addEventListener("error", () => this.webSocketError(ws));
  }

  webSocketClose(socket: DurableObjectWebSocket) {
    socket.close();
  }

  webSocketError(socket: DurableObjectWebSocket) {
    socket.close(1011, "socket_error");
  }
}

export default {
  async fetch(request: Request, env: CloudflareEnv) {
    if (env.ASSETS && request.method === "GET" && !new URL(request.url).pathname.startsWith("/api/") && new URL(request.url).pathname !== "/healthz") return env.ASSETS.fetch(request);
    const id = env.HUB.idFromName("primary");
    return env.HUB.get(id).fetch(request);
  },
};
