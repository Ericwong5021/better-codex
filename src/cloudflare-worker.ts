import { controlCapabilities, controlProtocolVersion, decodeControlMessage, encodeControlMessage } from "./control-protocol.js";
import { normalizeAgentDirectoryProjection, normalizeAgentModelCatalogProjection, normalizeCodexUsageProjection, runtimeProjectionSignature, syncProtocolVersion, supportedSyncProtocolVersions, type RemoteCommandAck, type RuntimeProjection, type SyncChange, type SyncPushRequest } from "./sync-contract.js";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { coreVersion } from "./version.js";
import { cloudflareIssuePriorities, cloudflareIssueStatuses, cloudflareRenderMarkdown, cloudflareWebCss, cloudflareWebHtml, cloudflareWebJavaScript } from "./cloudflare-web.js";
import { betterCodexWebManifest, betterCodexWebServiceWorker } from "./web-app.js";
import { checkStableRelease, type ReleaseUpdateState } from "./release-update.js";

type SqlRow = Record<string, unknown>;
type SqlCursor = { toArray(): SqlRow[] };
type SqlStorage = { exec(query: string, ...bindings: unknown[]): SqlCursor };
type DurableObjectWebSocket = WebSocket & { serializeAttachment?(value: unknown): void; deserializeAttachment?(): unknown };
type DurableObjectState = {
  storage: { sql: SqlStorage; transactionSync?<T>(callback: () => T): T };
  blockConcurrencyWhile<T>(callback: () => Promise<T> | T): Promise<T>;
  acceptWebSocket?(socket: DurableObjectWebSocket, tags?: string[]): void;
  getWebSockets?(tag?: string): DurableObjectWebSocket[];
};
type DurableObjectNamespace = { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
type R2Bucket = { put(key: string, value: string, options?: Record<string, unknown>): Promise<unknown>; get(key: string): Promise<{ text(): Promise<string> } | null> };
type CloudflareEnv = { HUB: DurableObjectNamespace; ADMIN_TOKEN?: string; WEB_PASSWORD?: string; ASSETS?: { fetch(request: Request): Promise<Response> }; BACKUPS?: R2Bucket };
type WebSocketPairConstructor = new () => [WebSocket, WebSocket];
declare const WebSocketPair: WebSocketPairConstructor;

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, lease_expires_at TEXT, revoked_at TEXT);
CREATE TABLE IF NOT EXISTS entities (entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, owner_device_id TEXT NOT NULL, local_revision INTEGER NOT NULL, payload_json TEXT NOT NULL, deleted_at TEXT, updated_at TEXT NOT NULL, PRIMARY KEY(entity_type, entity_id));
CREATE TABLE IF NOT EXISTS sync_events (event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, received_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runtime_projection (device_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversations (issue_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL, payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hub_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS web_sessions (token_hash TEXT PRIMARY KEY, csrf_token TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_seen_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS login_attempts (client_key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS device_authorizations (authorization_id TEXT PRIMARY KEY, user_code_hash TEXT NOT NULL UNIQUE, device_name TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, device_id TEXT, device_token_hash TEXT, device_token TEXT, created_at TEXT NOT NULL, approved_at TEXT);
CREATE TABLE IF NOT EXISTS remote_commands (command_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, operation TEXT NOT NULL, entity_id TEXT NOT NULL, base_revision INTEGER, payload_json TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL, expires_at TEXT NOT NULL, finished_at TEXT, error TEXT, delivery_id TEXT, dispatched_at TEXT, dispatch_expires_at TEXT, attempt_count INTEGER NOT NULL DEFAULT 0, last_delivery_error TEXT);
CREATE INDEX IF NOT EXISTS remote_commands_queue ON remote_commands(device_id, status, requested_at);
`;
const schemaVersion = 1;

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

function cookieValue(request: Request, name: string) {
  const value = request.headers.get("cookie") || "";
  return value.split(";").map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

async function tokenHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

function base64Url(value: Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function passwordHash(value: string, salt = randomBytes(16)) {
  const digest = scryptSync(value, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$16384$8$1$${base64Url(salt)}$${base64Url(digest)}`;
}

function passwordMatches(value: string, encoded: string) {
  try {
    const [algorithm, cost, blockSize, parallelism, saltValue, digestValue] = encoded.split("$");
    if (algorithm !== "scrypt" || !saltValue || !digestValue) return false;
    const expected = Buffer.from(digestValue, "base64url");
    const actual = scryptSync(value, Buffer.from(saltValue, "base64url"), expected.length, { N: Number(cost), r: Number(blockSize), p: Number(parallelism), maxmem: 64 * 1024 * 1024 });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function boundedLimit(value: string | null) {
  const parsed = Number(value || 100);
  return Math.min(Math.max(Number.isFinite(parsed) ? Math.trunc(parsed) : 100, 1), 100);
}

function recoverExpiredCommands(sql: SqlStorage) {
  sql.exec("UPDATE remote_commands SET status = 'pending', delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL, last_delivery_error = 'delivery_lease_expired' WHERE status = 'dispatched' AND dispatch_expires_at IS NOT NULL AND dispatch_expires_at <= ?", timestamp());
  sql.exec("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'command_expired' WHERE status = 'pending' AND expires_at <= ?", timestamp(), timestamp());
}

function decodePayload(value: unknown, allowAgentConfig = false) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  const blockedKeys = ["workspace_path", "thread_id", "credential", "prompt", "sandbox_mode", "rollout_path", ...(allowAgentConfig ? [] : ["model", "reasoning_effort"])];
  const forbidden = (item: unknown): boolean => Array.isArray(item)
    ? item.some(forbidden)
    : Boolean(item && typeof item === "object" && Object.entries(item as Record<string, unknown>).some(([key, child]) => blockedKeys.some(blocked => key.toLowerCase().includes(blocked)) || forbidden(child)));
  if (forbidden(source)) throw new Error("forbidden_projection_field");
  return source;
}

function cleanCommandPayload(operation: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_command_payload");
  const source = value as Record<string, unknown>;
  const allowed = operation === "issue.create"
    ? ["project_id", "title", "description", "status", "priority", "labels", "agent_enabled", "agent_id", "user_assigned"]
    : operation === "issue.update"
      ? ["project_id", "title", "description", "status", "priority", "labels", "sort_order", "pinned", "agent_enabled", "agent_id", "user_assigned"]
      : operation === "issue.start"
        ? ["project_id", "title", "description", "status", "priority", "labels", "agent_id"]
        : operation === "issue.reply" ? ["message", "files"]
          : operation === "issue.move" ? ["status", "before_id"]
            : operation === "settings.auto-dispatch" ? ["enabled"] : [];
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error("forbidden_command_field");
  const payload: Record<string, unknown> = {};
  for (const key of allowed) if (source[key] !== undefined) payload[key] = source[key];
  if (payload.status !== undefined && !cloudflareIssueStatuses.includes(String(payload.status))) throw new Error("invalid_status");
  if (payload.priority !== undefined && !cloudflareIssuePriorities.includes(String(payload.priority))) throw new Error("invalid_priority");
  if (payload.labels !== undefined && (!Array.isArray(payload.labels) || payload.labels.length > 20 || payload.labels.some(label => typeof label !== "string" || label.length > 100))) throw new Error("invalid_labels");
  if (payload.sort_order !== undefined && (typeof payload.sort_order !== "number" || !Number.isFinite(payload.sort_order))) throw new Error("invalid_sort_order");
  if (payload.files !== undefined && (!Array.isArray(payload.files) || payload.files.length > 4 || payload.files.some(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return true;
    const file = value as Record<string, unknown>;
    if (Object.keys(file).some(key => !["name", "type", "data"].includes(key))) return true;
    const type = typeof file.type === "string" ? file.type.toLowerCase() : "";
    return typeof file.name !== "string" || file.name.length > 160 || !/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(type) || typeof file.data !== "string" || !file.data.startsWith(`data:${type};base64,`);
  }) || payload.files.reduce((size, value) => size + String((value as Record<string, unknown>).data || "").length, 0) > 28_000_000)) throw new Error("invalid_files");
  if (operation === "settings.auto-dispatch" && typeof payload.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
  if ((operation === "issue.create" && (!payload.project_id || !payload.title)) || (operation === "issue.move" && !payload.status) || (operation === "issue.start" && !payload.title) || (operation === "issue.reply" && !payload.message && !(Array.isArray(payload.files) && payload.files.length))) throw new Error("invalid_command_payload");
  return payload;
}

function commandOperation(value: string) {
  return ["issue.create", "issue.update", "issue.start", "issue.reply", "issue.move", "issue.stop", "issue.archive", "issue.restore", "settings.auto-dispatch"].includes(value);
}

function webSessionCookie(token: string) {
  return `better_codex_session=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=43200`;
}

function trustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character] || character));
}

function issueForWeb(issue: Record<string, unknown>) {
  const remoteState = issue.remote_state as Record<string, unknown> | undefined;
  return { ...issue, version: issue.local_revision, remote_pending: remoteState?.status === "pending" || remoteState?.status === "dispatched", remote_conflict: remoteState?.status === "conflict", thread_id: null, run_thread_id: issue.has_conversation ? issue.id : null, workspace_path: null, enrichment_status: null, reply_draft: "" };
}

function agentsForWeb(board: { agents: Array<Record<string, unknown>>; default_avatar: unknown; runtime?: Record<string, unknown> | null }) {
  const runtime = board.runtime || {};
  return [
    { id: "", role: "codex", name: "Codex", name_en: "Codex", description: "", instructions: "", model: runtime.default_agent_model || "", reasoning_effort: runtime.default_agent_reasoning_effort || "", sandbox_mode: "workspace-write", max_concurrency: 5, version: 1, created_at: "", updated_at: "", avatar: board.default_avatar, is_default: true, remote_read_only: true },
    ...board.agents.map(agent => ({ ...agent, instructions: "", sandbox_mode: "workspace-write", max_concurrency: 5, is_default: false, remote_read_only: true })),
  ];
}

export class BetterCodexHubObject {
  private ready: Promise<void>;
  private readonly sql: SqlStorage;
  private readonly webEventStreams = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private updateState: ReleaseUpdateState = { status: "current", currentVersion: coreVersion, latestVersion: coreVersion, checkedAt: "", error: null };
  private updateCheckPromise: Promise<ReleaseUpdateState> | null = null;

  constructor(private readonly state: DurableObjectState, private readonly env: CloudflareEnv) {
    this.sql = state.storage.sql;
    this.ready = state.blockConcurrencyWhile(() => {
      this.sql.exec(schema);
      const migration = Number(this.sql.exec("SELECT COALESCE(MAX(version), 0) AS value FROM schema_migrations").toArray()[0]?.value || 0);
      if (migration > schemaVersion) throw new Error("hub_schema_too_new");
      if (migration < 1) this.sql.exec("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", schemaVersion, timestamp());
      if (this.env.ADMIN_TOKEN && this.env.ADMIN_TOKEN.length < 32) throw new Error("admin_token_too_short");
      if (this.env.ADMIN_TOKEN && this.env.WEB_PASSWORD && this.env.ADMIN_TOKEN === this.env.WEB_PASSWORD) throw new Error("hub_secrets_must_be_distinct");
      if (this.env.WEB_PASSWORD && this.env.WEB_PASSWORD.length < 12) throw new Error("web_password_too_short");
      if (!this.sql.exec("SELECT value FROM hub_settings WHERE key = 'web_password_hash'").toArray().length && this.env.WEB_PASSWORD) this.sql.exec("INSERT INTO hub_settings (key, value, updated_at) VALUES ('web_password_hash', ?, ?)", passwordHash(this.env.WEB_PASSWORD), timestamp());
    });
  }

  private transaction<T>(callback: () => T) {
    return this.state.storage.transactionSync ? this.state.storage.transactionSync(callback) : callback();
  }

  async fetch(request: Request) {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") return json({ ok: true, name: "Better Codex Hub", deployment: "cloudflare", version: coreVersion, protocol_version: syncProtocolVersion, revision: this.revision() });
    if (url.pathname === "/api/v1/control" && request.headers.get("upgrade")?.toLowerCase() === "websocket") return this.openControl(request);
    if (url.pathname === "/web/session" && request.method === "POST") return this.login(request);
    if (url.pathname === "/web/session" && request.method === "GET") return this.session(request);
    if (url.pathname === "/web/session" && request.method === "DELETE") return this.logout(request);
    const approvalPage = url.pathname.match(/^\/web\/device-authorizations\/([^/]+)$/);
    if (approvalPage && request.method === "GET") return this.authorizationPage(decodeURIComponent(approvalPage[1]), url.searchParams.get("code") || "");
    if (url.pathname === "/api/v1/device-authorizations" && request.method === "POST") return this.createAuthorization(request);
    const authorizationStatus = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)$/);
    if (authorizationStatus && request.method === "GET") return json(this.authorization(decodeURIComponent(authorizationStatus[1])) || { error: "device_authorization_not_found" }, 200);
    const authorizationToken = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)\/token$/);
    if (authorizationToken && request.method === "POST") return this.authorizationToken(decodeURIComponent(authorizationToken[1]), request);
    const authorizationApproval = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)\/approve$/);
    if (authorizationApproval && request.method === "POST") return this.approveAuthorization(decodeURIComponent(authorizationApproval[1]), request);
    if (url.pathname === "/api/v1/admin/backup" && request.method === "POST") return this.createBackup(request);
    if (url.pathname === "/api/v1/admin/backup/status" && request.method === "GET") return this.backupStatus(request);
    if (url.pathname === "/api/v1/admin/backup/restore" && request.method === "POST") return this.restoreBackup(request);
    if (url.pathname === "/api/v1/admin/password" && request.method === "POST") return this.rotatePassword(request);
    if (url.pathname === "/api/v1/admin/read-only" && request.method === "GET") return this.readOnly(request);
    if (url.pathname === "/api/v1/admin/read-only" && request.method === "POST") return this.setReadOnly(request);
    if (url.pathname === "/api/v1/admin/command-queue" && request.method === "GET") return this.commandQueue(request);
    if (url.pathname === "/" && request.method === "GET") return this.webDashboard();
    if ((url.pathname === "/web" || url.pathname === "/web/") && request.method === "GET") return this.webDashboard();
    if (url.pathname === "/web/host.css" && request.method === "GET") return new Response(cloudflareWebCss(), { headers: { "content-type": "text/css; charset=utf-8" } });
    if (url.pathname === "/web/host.js" && request.method === "GET") return new Response(cloudflareWebJavaScript(), { headers: { "content-type": "text/javascript; charset=utf-8" } });
    if (url.pathname === "/web/manifest.webmanifest" && request.method === "GET") return new Response(betterCodexWebManifest(), { headers: { "cache-control": "no-cache", "content-type": "application/manifest+json; charset=utf-8" } });
    if (url.pathname === "/web/service-worker.js" && request.method === "GET") return new Response(betterCodexWebServiceWorker(), { headers: { "cache-control": "no-cache", "content-type": "text/javascript; charset=utf-8", "service-worker-allowed": "/" } });
    if (url.pathname === "/api/v1/board" && request.method === "GET") {
      if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
      return json(this.board());
    }
    if (url.pathname === "/api/v1/status" && request.method === "GET") {
      if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
      const backup = this.sql.exec("SELECT value, updated_at FROM hub_settings WHERE key = 'last_backup_key'").toArray()[0] as { value?: string; updated_at?: string } | undefined;
      const readOnly = this.sql.exec("SELECT value FROM hub_settings WHERE key = 'read_only'").toArray()[0] as { value?: string } | undefined;
      const runtime = this.sql.exec("SELECT payload_json, updated_at FROM runtime_projection ORDER BY updated_at DESC LIMIT 1").toArray()[0] as { payload_json?: string; updated_at?: string } | undefined;
      return json({ protocol_version: syncProtocolVersion, revision: this.revision(), runtime: runtime?.payload_json ? JSON.parse(runtime.payload_json) : null, backup: { configured: Boolean(this.env.BACKUPS), last_backup: backup ? { key: backup.value, created_at: backup.updated_at } : null }, read_only: readOnly?.value === "1" });
    }
    if (url.pathname === "/api/bootstrap" && request.method === "GET") return this.webBootstrap(request);
    if (url.pathname === "/api/account/usage" && request.method === "GET") return this.webUsage(request);
    if (url.pathname === "/api/settings/auto-dispatch" && ["GET", "PATCH"].includes(request.method)) return this.webAutoDispatch(request);
    if (url.pathname === "/api/remote-access/status" && request.method === "GET") return this.webRemoteStatus(request);
    if (url.pathname === "/api/update" && request.method === "GET") return this.webUpdate(request, false);
    if (url.pathname === "/api/update/check" && request.method === "POST") return this.webUpdate(request, true);
    if (url.pathname === "/api/agents" && request.method === "GET") return this.webAgents(request);
    if (url.pathname === "/api/projects" && request.method === "GET") return this.webProjects(request);
    if (url.pathname === "/api/issues" && request.method === "GET") return this.webIssues(request, url);
    const webIssue = url.pathname.match(/^\/api\/issues\/([^/]+)$/);
    if (webIssue && request.method === "GET") return this.webIssue(request, decodeURIComponent(webIssue[1]));
    const conversation = url.pathname.match(/^\/api\/issues\/([^/]+)\/conversation$/);
    if (conversation && request.method === "GET") return this.webConversation(request, decodeURIComponent(conversation[1]));
    const commandStatus = url.pathname.match(/^\/api\/v1\/commands\/([^/]+)$/);
    if (commandStatus && request.method === "GET") return this.webCommand(request, decodeURIComponent(commandStatus[1]));
    if (url.pathname === "/api/events" && request.method === "GET") return this.webEvents(request, url);
    if ((url.pathname === "/api/issues" || url.pathname.startsWith("/api/issues/")) && request.method !== "GET") return this.webMutation(request, url);
    if (url.pathname === "/api/v1/devices" && request.method === "POST") return this.createDevice(request);
    const device = await this.deviceForToken(tokenFromRequest(request));
    if (!device) return json({ error: "unauthorized" }, 401);
    try {
      if (url.pathname === "/api/v1/capabilities" && request.method === "GET") return json({ protocol_versions: [...supportedSyncProtocolVersions], control_protocol: "control/v1", transports: ["websocket", "http"], command_delivery: "lease" });
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

  private async isWebAuthorized(request: Request) {
    if (this.env.ADMIN_TOKEN && request.headers.get("authorization") === `Bearer ${this.env.ADMIN_TOKEN}`) return true;
    const session = cookieValue(request, "better_codex_session");
    if (!session) return false;
    return this.sql.exec("SELECT 1 AS value FROM web_sessions WHERE token_hash = ? AND expires_at > ?", await tokenHash(session), timestamp()).toArray().length > 0;
  }

  private async webCsrf(request: Request) {
    const session = cookieValue(request, "better_codex_session");
    const csrf = request.headers.get("x-csrf-token") || "";
    if (!session || !csrf) return false;
    const row = this.sql.exec("SELECT csrf_token FROM web_sessions WHERE token_hash = ? AND expires_at > ?", await tokenHash(session), timestamp()).toArray()[0] as { csrf_token?: string } | undefined;
    return Boolean(row?.csrf_token && row.csrf_token === csrf);
  }

  private writerDevice() {
    const row = this.sql.exec("SELECT id, name FROM devices WHERE revoked_at IS NULL ORDER BY CASE WHEN lease_expires_at > ? THEN 0 ELSE 1 END, last_seen_at DESC LIMIT 1", timestamp()).toArray()[0] as { id: string; name: string } | undefined;
    if (!row) throw new Error("runtime_not_paired");
    return row;
  }

  private createWebCommandRow(input: { commandId?: unknown; operation: string; entityId?: unknown; baseRevision?: unknown; payload: Record<string, unknown> }) {
    const readOnly = this.sql.exec("SELECT value FROM hub_settings WHERE key = 'read_only'").toArray()[0] as { value?: string } | undefined;
    if (readOnly?.value === "1") throw new Error("hub_read_only");
    const commandId = typeof input.commandId === "string" && input.commandId ? input.commandId : crypto.randomUUID();
    const settingOperation = input.operation === "settings.auto-dispatch";
    if (!commandOperation(input.operation)) throw new Error("invalid_command_operation");
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(commandId)) throw new Error("invalid_command_id");
    const existing = this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", commandId).toArray()[0] as SqlRow | undefined;
    const payloadJson = JSON.stringify(cleanCommandPayload(input.operation, input.payload));
    if (existing) {
      if (existing.operation !== input.operation || existing.payload_json !== payloadJson) throw new Error("command_id_conflict");
      return this.command(existing);
    }
    if (settingOperation) {
      const active = this.sql.exec("SELECT * FROM remote_commands WHERE operation = ? AND entity_id = 'auto-dispatch' AND status IN ('pending', 'dispatched') ORDER BY requested_at LIMIT 1", input.operation).toArray()[0] as SqlRow | undefined;
      if (active) {
        if (active.payload_json === payloadJson) return this.command(active);
        throw new Error("setting_busy");
      }
    }
    const device = this.writerDevice();
    const entityId = settingOperation ? "auto-dispatch" : typeof input.entityId === "string" && input.entityId ? input.entityId : crypto.randomUUID();
    const current = this.sql.exec("SELECT payload_json, deleted_at FROM entities WHERE entity_type = 'issue' AND entity_id = ?", entityId).toArray()[0] as { payload_json: string; deleted_at: string | null } | undefined;
    if (input.operation === "issue.create" && current && !current.deleted_at) throw new Error("issue_exists");
    if (input.operation !== "issue.create" && !settingOperation && (!current || current.deleted_at)) throw new Error("issue_not_found");
    const baseRevision = input.operation === "issue.create" || settingOperation ? null : Number(input.baseRevision);
    if (input.operation !== "issue.create" && !settingOperation && (!Number.isInteger(baseRevision) || Number(baseRevision) < 1)) throw new Error("invalid_version");
    const requested = timestamp();
    let command: SqlRow;
    try {
      command = this.transaction(() => {
        this.sql.exec("INSERT INTO remote_commands (command_id, device_id, operation, entity_id, base_revision, payload_json, status, requested_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)", commandId, device.id, input.operation, entityId, baseRevision, payloadJson, requested, timestamp(24 * 60 * 60_000));
        return this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", commandId).toArray()[0] as SqlRow;
      });
    } catch (error) {
      throw error;
    }
    this.notifyDevice(device.id);
    this.notifyWeb({ entity_type: settingOperation ? "settings" : "issue", entity_id: String(command.entity_id), operation: "command" });
    return this.command(command);
  }

  private notifyDevice(deviceId: string) {
    const sockets = this.state.getWebSockets?.(`device:${deviceId}`) || [];
    if (!sockets.length) return;
    const count = this.countCommands(deviceId);
    const message = encodeControlMessage({ type: "commands_available", protocol_version: controlProtocolVersion, count });
    for (const socket of sockets) socket.send(message);
  }

  private async createWebCommand(url: URL, request: Request) {
    const body = await request.json() as Record<string, unknown>;
    const issueMatch = url.pathname.match(/^\/api\/issues\/([^/]+)$/);
    const actionMatch = url.pathname.match(/^\/api\/issues\/([^/]+)\/(move|start|stop|archive|unarchive|reply)$/);
    if (url.pathname === "/api/issues" && request.method === "POST") return this.createWebCommandRow({ commandId: body.command_id, operation: "issue.create", entityId: body.id, baseRevision: null, payload: { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, labels: body.labels, agent_enabled: body.agent_enabled, agent_id: body.agent_id, user_assigned: body.user_assigned } });
    if (issueMatch && request.method === "PATCH") return this.createWebCommandRow({ commandId: body.command_id, operation: "issue.update", entityId: decodeURIComponent(issueMatch[1]), baseRevision: body.version, payload: { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, sort_order: body.sort_order, pinned: body.pinned, agent_enabled: body.agent_enabled, agent_id: body.agent_id, user_assigned: body.user_assigned } });
    if (!actionMatch || request.method !== "POST") throw new Error("not_found");
    const action = actionMatch[2];
    const operation = action === "archive" ? "issue.archive" : action === "unarchive" ? "issue.restore" : action === "start" ? "issue.start" : action === "stop" ? "issue.stop" : action === "reply" ? "issue.reply" : "issue.move";
    return this.createWebCommandRow({ commandId: body.command_id || body.request_id, operation, entityId: decodeURIComponent(actionMatch[1]), baseRevision: body.version, payload: action === "move" ? { status: body.status, before_id: body.before_id } : action === "start" ? { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, labels: body.labels, agent_id: body.agent_id } : action === "reply" ? { message: body.message, files: body.files } : {} });
  }

  private board() {
    const rows = this.sql.exec("SELECT entity_type, entity_id, payload_json FROM entities WHERE deleted_at IS NULL ORDER BY entity_type, entity_id").toArray() as Array<{ entity_type: string; entity_id: string; payload_json: string }>;
    const projects = rows.filter(row => row.entity_type === "project").map(row => JSON.parse(row.payload_json));
    const issues = rows.filter(row => row.entity_type === "issue").map(row => JSON.parse(row.payload_json) as Record<string, unknown>);
    const directory = rows.find(row => row.entity_type === "agent_directory");
    const agents = directory ? JSON.parse(directory.payload_json) : { agents: [], default_avatar: "" };
    const runtimeRow = this.sql.exec("SELECT payload_json, updated_at FROM runtime_projection ORDER BY updated_at DESC LIMIT 1").toArray()[0] as { payload_json?: string; updated_at?: string } | undefined;
    let runtime = runtimeRow?.payload_json ? JSON.parse(runtimeRow.payload_json) as Record<string, unknown> : null;
    if (runtime && runtimeRow?.updated_at && Date.now() - Date.parse(runtimeRow.updated_at) > 60_000) runtime = { ...runtime, health_state: "offline" };
    const commands = this.sql.exec("SELECT * FROM remote_commands WHERE status IN ('pending', 'dispatched', 'conflict', 'rejected') ORDER BY requested_at").toArray();
    for (const row of commands) {
      const command = this.command(row);
      let issue = issues.find(item => item.id === command.entity_id);
      if (!issue && command.operation === "issue.create" && ["pending", "dispatched"].includes(String(command.status))) {
        const payload = command.payload as Record<string, unknown>;
        issue = { id: command.entity_id, identifier: `PENDING-${String(command.entity_id).slice(0, 8).toUpperCase()}`, project_id: payload.project_id, title: payload.title, description: payload.description || "", status: payload.status || "todo", priority: payload.priority || "medium", labels: payload.labels || [], sort_order: Number.MAX_SAFE_INTEGER, pinned: false, archived_at: null, assigned: payload.agent_enabled === true || payload.user_assigned === true, agent_enabled: payload.agent_enabled === true, agent_id: payload.agent_id || null, user_assigned: payload.user_assigned === true, pending_actor: payload.agent_enabled === true ? "agent" : "user", active_run_status: null, latest_run_status: null, latest_scheduler_status: null, session_status: null, reply_status: "idle", has_conversation: false, last_activity_finished_at: null, needs_attention: false, created_at: command.requested_at, updated_at: command.requested_at, local_revision: 0 };
        issues.push(issue);
      }
      if (!issue) continue;
      if (["pending", "dispatched"].includes(String(command.status)) && ["issue.update", "issue.move", "issue.start"].includes(String(command.operation))) Object.assign(issue, command.payload, { updated_at: command.requested_at });
      Object.assign(issue, { remote_state: { command_id: command.command_id, status: command.status, operation: command.operation, error: command.error } });
    }
    return { revision: this.revision(), projects, issues, agents: agents.agents || [], default_avatar: agents.default_avatar || "", runtime };
  }

  private webDashboard() {
    return new Response(cloudflareWebHtml(), { status: 200, headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" } });
  }

  private snapshot() {
    const tables = ["devices", "entities", "sync_events", "changes", "runtime_projection", "conversations", "remote_commands", "hub_settings"];
    return { version: 1, created_at: timestamp(), tables: Object.fromEntries(tables.map(table => [table, this.snapshotRows(table)])) };
  }

  private async createBackup(request: Request) {
    if (!this.env.BACKUPS || !this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const key = `hub-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    await this.env.BACKUPS.put(key, JSON.stringify(this.snapshot()), { httpMetadata: { contentType: "application/json" } });
    this.sql.exec("INSERT INTO hub_settings (key, value, updated_at) VALUES ('last_backup_key', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", key, timestamp());
    return json({ ok: true, key, created_at: timestamp() });
  }

  private snapshotRows(table: string) {
    return this.sql.exec(`SELECT * FROM ${table}`).toArray().map(row => {
      const copy = { ...row } as Record<string, unknown>;
      if (table === "hub_settings" && copy.key === "web_password_hash") return null;
      if (table === "web_sessions" || table === "login_attempts" || table === "device_authorizations") return null;
      if (table === "devices") delete copy.device_token;
      return copy;
    }).filter((row): row is Record<string, unknown> => row !== null);
  }

  private async backupStatus(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const row = this.sql.exec("SELECT value, updated_at FROM hub_settings WHERE key = 'last_backup_key'").toArray()[0] as { value: string; updated_at: string } | undefined;
    return json({ configured: Boolean(this.env.BACKUPS), last_backup: row ? { key: row.value, created_at: row.updated_at } : null });
  }

  private async restoreBackup(request: Request) {
    if (!this.env.BACKUPS || !this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const body = await request.json() as Record<string, unknown>;
    const key = typeof body.key === "string" ? body.key : "";
    if (!/^hub-[A-Za-z0-9_.-]+\.json$/.test(key)) return json({ error: "invalid_backup_key" }, 400);
    const object = await this.env.BACKUPS.get(key);
    if (!object) return json({ error: "backup_not_found" }, 404);
    let snapshot: unknown;
    try { snapshot = JSON.parse(await object.text()); } catch { return json({ error: "backup_invalid" }, 400); }
    if (!snapshot || typeof snapshot !== "object" || (snapshot as Record<string, unknown>).version !== 1) return json({ error: "backup_invalid" }, 400);
    const tables = (snapshot as Record<string, unknown>).tables;
    if (!tables || typeof tables !== "object" || Array.isArray(tables)) return json({ error: "backup_invalid" }, 400);
    const allowed = ["devices", "entities", "sync_events", "changes", "runtime_projection", "conversations", "remote_commands", "hub_settings"];
    const columns: Record<string, string[]> = {
      devices: ["id", "name", "token_hash", "created_at", "last_seen_at", "lease_expires_at", "revoked_at"],
      entities: ["entity_type", "entity_id", "owner_device_id", "local_revision", "payload_json", "deleted_at", "updated_at"],
      sync_events: ["event_id", "device_id", "received_at"],
      changes: ["seq", "entity_type", "entity_id", "operation", "created_at"],
      runtime_projection: ["device_id", "payload_json", "updated_at"],
      conversations: ["issue_id", "owner_device_id", "payload_json", "updated_at"],
      remote_commands: ["command_id", "device_id", "operation", "entity_id", "base_revision", "payload_json", "status", "requested_at", "expires_at", "finished_at", "error", "delivery_id", "dispatched_at", "dispatch_expires_at", "attempt_count", "last_delivery_error"],
      hub_settings: ["key", "value", "updated_at"],
    };
    for (const table of allowed) {
      const rows = (tables as Record<string, unknown>)[table];
      if (rows !== undefined && !Array.isArray(rows)) return json({ error: "backup_invalid" }, 400);
      if (Array.isArray(rows)) for (const value of rows) {
        if (!value || typeof value !== "object" || Array.isArray(value)) return json({ error: "backup_invalid" }, 400);
        const row = value as Record<string, unknown>;
        const names = columns[table].filter(name => row[name] !== undefined);
        if (!names.length || (table === "devices" && !row.token_hash) || (table === "hub_settings" && (!row.key || row.value === undefined || !row.updated_at))) return json({ error: "backup_invalid" }, 400);
      }
    }
    const currentPassword = this.sql.exec("SELECT value FROM hub_settings WHERE key = 'web_password_hash'").toArray()[0] as { value?: string } | undefined;
    try {
      this.transaction(() => {
        this.sql.exec("DELETE FROM devices; DELETE FROM entities; DELETE FROM sync_events; DELETE FROM changes; DELETE FROM runtime_projection; DELETE FROM conversations; DELETE FROM remote_commands; DELETE FROM hub_settings;");
        if (currentPassword?.value) this.sql.exec("INSERT INTO hub_settings (key, value, updated_at) VALUES ('web_password_hash', ?, ?)", currentPassword.value, timestamp());
        for (const table of allowed) {
          const rows = (tables as Record<string, unknown>)[table];
          if (!Array.isArray(rows)) continue;
          for (const value of rows) {
            const row = value as Record<string, unknown>;
            const names = columns[table].filter(name => row[name] !== undefined);
            if (!names.length) continue;
            const placeholders = names.map(() => "?").join(", ");
            this.sql.exec(`INSERT INTO ${table} (${names.join(", ")}) VALUES (${placeholders})`, ...names.map(name => row[name]));
          }
        }
      });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "backup_restore_failed" }, 400);
    }
    return json({ ok: true, key, restored_at: timestamp() });
  }

  private async readOnly(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const row = this.sql.exec("SELECT value FROM hub_settings WHERE key = 'read_only'").toArray()[0] as { value?: string } | undefined;
    return json({ read_only: row?.value === "1" });
  }

  private async setReadOnly(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const body = await request.json() as Record<string, unknown>;
    const readOnly = body.read_only === true;
    this.sql.exec("INSERT INTO hub_settings (key, value, updated_at) VALUES ('read_only', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", readOnly ? "1" : "0", timestamp());
    return json({ read_only: readOnly });
  }

  private async rotatePassword(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    const body = await request.json() as Record<string, unknown>;
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password === this.env.ADMIN_TOKEN) return json({ error: "invalid_web_password" }, 400);
    this.sql.exec("INSERT INTO hub_settings (key, value, updated_at) VALUES ('web_password_hash', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", passwordHash(password), timestamp());
    this.sql.exec("DELETE FROM web_sessions; UPDATE device_authorizations SET status = 'denied' WHERE status = 'pending';");
    return json({ updated: true, sessions_revoked: true, device_authorizations_revoked: true });
  }

  private async commandQueue(request: Request) {
    if (!this.env.ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${this.env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401);
    recoverExpiredCommands(this.sql);
    const rows = this.sql.exec("SELECT status, COUNT(*) AS value FROM remote_commands WHERE status IN ('pending', 'dispatched') GROUP BY status").toArray() as Array<{ status: string; value: number }>;
    return json({ pending: Number(rows.find(row => row.status === "pending")?.value || 0), dispatched: Number(rows.find(row => row.status === "dispatched")?.value || 0) });
  }

  private async login(request: Request) {
    if (!trustedOrigin(request)) return json({ error: "forbidden" }, 403);
    const body = await request.json() as Record<string, unknown>;
    const username = String(body.username || "");
    const password = String(body.password || "");
    const clientKey = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    const attempt = this.sql.exec("SELECT count, reset_at FROM login_attempts WHERE client_key = ?", clientKey).toArray()[0] as { count: number; reset_at: string } | undefined;
    if (attempt && attempt.reset_at > timestamp() && attempt.count >= 5) return json({ error: "login_rate_limited" }, 429, { "retry-after": String(Math.max(1, Math.ceil((Date.parse(attempt.reset_at) - Date.now()) / 1000))) });
    const stored = this.sql.exec("SELECT value FROM hub_settings WHERE key = 'web_password_hash'").toArray()[0]?.value;
    const expected = stored ? String(stored) : "";
    if (username !== "admin" || !passwordMatches(password, expected)) {
      const current = attempt && attempt.reset_at > timestamp() ? attempt : { count: 0, reset_at: timestamp(15 * 60_000) };
      this.sql.exec("INSERT INTO login_attempts (client_key, count, reset_at) VALUES (?, ?, ?) ON CONFLICT(client_key) DO UPDATE SET count = excluded.count, reset_at = excluded.reset_at", clientKey, current.count + 1, current.reset_at);
      return json({ error: "unauthorized" }, 401);
    }
    this.sql.exec("DELETE FROM login_attempts WHERE client_key = ?", clientKey);
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = [...tokenBytes].map(value => value.toString(16).padStart(2, "0")).join("");
    const csrfBytes = new Uint8Array(24);
    crypto.getRandomValues(csrfBytes);
    const csrf = [...csrfBytes].map(value => value.toString(16).padStart(2, "0")).join("");
    const created = timestamp();
    this.sql.exec("INSERT INTO web_sessions (token_hash, csrf_token, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)", await tokenHash(token), csrf, created, timestamp(12 * 60 * 60_000), created);
    return json({ csrf_token: csrf, expires_at: timestamp(12 * 60 * 60_000) }, 200, { "set-cookie": webSessionCookie(token) });
  }

  private async session(request: Request) {
    const token = cookieValue(request, "better_codex_session");
    const row = this.sql.exec("SELECT csrf_token, expires_at FROM web_sessions WHERE token_hash = ? AND expires_at > ?", await tokenHash(token), timestamp()).toArray()[0] as { csrf_token: string; expires_at: string } | undefined;
    return row ? json({ csrf_token: row.csrf_token, expires_at: row.expires_at }) : json({ error: "unauthorized" }, 401);
  }

  private async logout(request: Request) {
    if (!trustedOrigin(request) || !(await this.webCsrf(request))) return json({ error: "csrf_invalid" }, 403);
    const token = cookieValue(request, "better_codex_session");
    this.sql.exec("DELETE FROM web_sessions WHERE token_hash = ?", await tokenHash(token));
    return json({ ok: true }, 200, { "set-cookie": "better_codex_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0" });
  }

  private async webAuthorized(request: Request, value: unknown) {
    return await this.isWebAuthorized(request) ? json(value) : json({ error: "unauthorized" }, 401);
  }

  private async webUsage(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const runtime = this.sql.exec("SELECT payload_json FROM runtime_projection ORDER BY updated_at DESC LIMIT 1").toArray()[0] as { payload_json?: string } | undefined;
    const projection = runtime?.payload_json ? JSON.parse(runtime.payload_json) as RuntimeProjection : null;
    return json({ usage: normalizeCodexUsageProjection(projection?.usage) });
  }

  private async webAutoDispatch(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const runtime = this.board().runtime as RuntimeProjection | null;
    if (request.method === "GET") return json({ enabled: runtime?.auto_dispatch === true });
    if (!trustedOrigin(request) || !(await this.webCsrf(request))) return json({ error: "csrf_invalid" }, 403);
    if (!runtime || runtime.health_state !== "online") return json({ error: "runtime_offline" }, 503);
    if (runtime.protocol_version !== syncProtocolVersion) return json({ error: "incompatible_protocol" }, 409);
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.enabled !== "boolean") return json({ error: "invalid_auto_dispatch" }, 400);
    const activeRow = this.sql.exec("SELECT * FROM remote_commands WHERE operation = 'settings.auto-dispatch' AND entity_id = 'auto-dispatch' AND status IN ('pending', 'dispatched') ORDER BY requested_at LIMIT 1").toArray()[0] as SqlRow | undefined;
    if (activeRow) {
      const activeCommand = this.command(activeRow);
      const activePayload = activeCommand.payload as Record<string, unknown>;
      if (activePayload.enabled === body.enabled) return json({ enabled: body.enabled, command_id: activeCommand.command_id }, 202);
      return json({ error: "setting_busy" }, 409);
    }
    if (runtime.auto_dispatch === body.enabled) return json({ enabled: body.enabled, command_id: null });
    try {
      const command = this.createWebCommandRow({ commandId: request.headers.get("x-better-codex-command-id"), operation: "settings.auto-dispatch", payload: { enabled: body.enabled } });
      return json({ enabled: body.enabled, command_id: command.command_id }, 202);
    } catch (error) {
      const code = error instanceof Error ? error.message : "command_failed";
      return json({ error: code }, ["command_id_conflict", "setting_busy"].includes(code) ? 409 : 400);
    }
  }

  private async webRemoteStatus(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const runtime = this.board().runtime as RuntimeProjection | null;
    const connected = runtime?.health_state === "online";
    return json({ ...runtime, remote: { ok: true, name: "Better Codex Hub", deployment: "cloudflare", version: coreVersion, protocol_version: syncProtocolVersion, url: new URL(request.url).origin, reachable: connected, error: connected ? null : "runtime_offline" } });
  }

  private checkUpdate() {
    if (this.updateCheckPromise) return this.updateCheckPromise;
    const promise = checkStableRelease().then(result => {
      this.updateState = result;
      return result;
    }).finally(() => {
      if (this.updateCheckPromise === promise) this.updateCheckPromise = null;
    });
    this.updateCheckPromise = promise;
    return promise;
  }

  private async webUpdate(request: Request, force: boolean) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    if (request.method !== "GET" && (!trustedOrigin(request) || !(await this.webCsrf(request)))) return json({ error: "csrf_invalid" }, 403);
    const checkedAt = Date.parse(this.updateState.checkedAt);
    const state = force || !Number.isFinite(checkedAt) || Date.now() - checkedAt >= 60 * 60 * 1000 ? await this.checkUpdate() : this.updateState;
    return json({ ...state, deployment: "cloudflare", installSupported: false });
  }

  private async webBootstrap(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const board = this.board();
    const runtime = board.runtime as RuntimeProjection | null;
    const agentModelCatalog = runtime?.agent_models || [];
    return json({ projects: board.projects, agents: agentsForWeb(board), statuses: cloudflareIssueStatuses, priorities: cloudflareIssuePriorities, appearance: { theme: "system", accent: "green" }, locale: "zh-CN", user: { id: "remote:admin", name: "admin", email: "", handle: "admin", initials: "AD", color: "#16a34a" }, agentModelCatalog, agentModels: agentModelCatalog.map(model => model.id), agentReasoningEfforts: [...new Set(agentModelCatalog.flatMap(model => model.supportedReasoningEfforts.map(effort => effort.value)))], autoDispatch: runtime?.auto_dispatch === true, schedulerModel: runtime?.scheduler_model || "", schedulerReasoningEffort: runtime?.scheduler_reasoning_effort || "", mockup: false, runtime: board.runtime, capabilities: { issues: "read-write", agents: "read-only", nativeThreads: false } });
  }

  private async webAgents(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    return json(agentsForWeb(this.board()));
  }

  private async webProjects(request: Request) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    return json(this.board().projects);
  }

  private async webIssues(request: Request, url: URL) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const projectId = url.searchParams.get("project_id");
    const search = (url.searchParams.get("search") || "").toLowerCase();
    const archived = url.searchParams.get("archived") === "1";
    const issues = this.board().issues.filter(issue => Boolean(issue.archived_at) === archived && (!projectId || issue.project_id === projectId) && (!search || `${String(issue.identifier || "")} ${String(issue.title || "")} ${String(issue.description || "")}`.toLowerCase().includes(search)));
    return json(issues.map(issueForWeb));
  }

  private async webIssue(request: Request, id: string) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const issue = this.board().issues.find(item => item.id === id || item.identifier === id);
    return issue ? json(issueForWeb(issue)) : json({ error: "issue_not_found" }, 404);
  }

  private async webConversation(request: Request, id: string) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const issue = this.board().issues.find(item => item.id === id || item.identifier === id);
    if (!issue) return json({ error: "issue_not_found" }, 404);
    const row = this.sql.exec("SELECT payload_json, updated_at FROM conversations WHERE issue_id = ?", issue.id).toArray()[0] as { payload_json?: string; updated_at?: string } | undefined;
    const projection = row?.payload_json ? JSON.parse(row.payload_json) as Record<string, unknown> : null;
    const messages = Array.isArray(projection?.messages) ? projection.messages.map(value => {
      const message = value as Record<string, unknown>;
      return { ...message, html: cloudflareRenderMarkdown(String(message.markdown || "")) };
    }) : [];
    return json({ issue_id: issue.id, found: messages.length > 0, messages, reply: projection?.reply || { status: issue.reply_status || "idle", message: "" }, updated_at: projection?.updated_at || row?.updated_at || issue.updated_at, issue: issueForWeb(issue) });
  }

  private async webCommand(request: Request, id: string) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const row = this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", id).toArray()[0];
    return row ? json(this.command(row)) : json({ error: "command_not_found" }, 404);
  }

  private async webEvents(request: Request, url: URL) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    const cursor = Math.max(0, Number(request.headers.get("last-event-id") || url.searchParams.get("cursor") || 0));
    const changes = this.sql.exec("SELECT seq, entity_type, entity_id, operation, created_at FROM changes WHERE seq > ? ORDER BY seq LIMIT 100", Number.isSafeInteger(cursor) ? cursor : 0).toArray();
    const revision = this.revision();
    const initial = changes.length ? changes.map(change => `id: ${change.seq}\nevent: change\ndata: ${JSON.stringify(change)}\n\n`).join("") : `id: ${revision}\nevent: ready\ndata: {}\n\n`;
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setTimeout>;
    let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
    const stream = new ReadableStream<Uint8Array>({
      start: controller => {
        controllerRef = controller;
        controller.enqueue(encoder.encode(initial));
        this.webEventStreams.add(controller);
        timer = setTimeout(() => {
          if (!this.webEventStreams.delete(controller)) return;
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
          controller.close();
        }, 25_000);
      },
      cancel: () => {
        clearTimeout(timer);
        if (controllerRef) this.webEventStreams.delete(controllerRef);
      },
    });
    return new Response(stream, { headers: { "cache-control": "no-store", "content-type": "text/event-stream; charset=utf-8" } });
  }

  private notifyWeb(event: Record<string, unknown>) {
    const body = new TextEncoder().encode(`id: ${this.revision()}\nevent: change\ndata: ${JSON.stringify(event)}\n\n`);
    for (const controller of this.webEventStreams) {
      try { controller.enqueue(body); } catch { this.webEventStreams.delete(controller); }
    }
  }

  private async webMutation(request: Request, url: URL) {
    if (!(await this.isWebAuthorized(request))) return json({ error: "unauthorized" }, 401);
    if (!trustedOrigin(request) || !(await this.webCsrf(request))) return json({ error: "csrf_invalid" }, 403);
    try {
      const command = await this.createWebCommand(url, request);
      const row = command as Record<string, unknown>;
      const issue = this.board().issues.find(item => item.id === row.entity_id);
      return json(issue ? issueForWeb(issue) : command, 202);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "command_failed" }, 400);
    }
  }

  private authorizationPage(authorizationId: string, code: string) {
    const row = this.authorization(authorizationId);
    if (!row || row.status !== "pending") return new Response("authorization_expired", { status: 410, headers: { "content-type": "text/plain; charset=utf-8" } });
    const safeId = JSON.stringify(authorizationId);
    const safeCode = JSON.stringify(code);
    return new Response(`<!doctype html><meta charset="utf-8"><title>Approve Better Codex Runtime</title><main><h1>Approve Better Codex Runtime</h1><p>Device code: <strong>${escapeHtml(code)}</strong></p><form id="f"><input name="username" autocomplete="username" placeholder="Username" required><input name="password" type="password" autocomplete="current-password" placeholder="Password" required><button>Approve</button><output id="o"></output></form><script>const id=${safeId},code=${safeCode},f=document.querySelector('#f'),o=document.querySelector('#o');f.onsubmit=async e=>{e.preventDefault();const d=new FormData(f);let r=await fetch('/web/session',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({username:d.get('username'),password:d.get('password')})});const s=await r.json();if(!r.ok)throw new Error('login_failed');r=await fetch('/api/v1/device-authorizations/'+encodeURIComponent(id)+'/approve',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-csrf-token':s.csrf_token},body:JSON.stringify({user_code:code})});const v=await r.json();o.textContent=r.ok?'Approved. Return to the CLI.':v.error||'Approval failed'};</script></main>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'" } });
  }

  private async createAuthorization(request: Request) {
    if (this.isReadOnlyValue()) return json({ error: "hub_read_only" }, 409);
    if (request.headers.get("authorization")) return json({ error: "device_authorization_requires_cli" }, 403);
    const body = await request.json() as Record<string, unknown>;
    const deviceName = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Runtime";
    const id = crypto.randomUUID();
    const codeBytes = new Uint8Array(5);
    crypto.getRandomValues(codeBytes);
    const code = [...codeBytes].map(value => value.toString(16).padStart(2, "0")).join("").slice(0, 10).toUpperCase();
    this.sql.exec("INSERT INTO device_authorizations (authorization_id, user_code_hash, device_name, status, expires_at, created_at) VALUES (?, ?, ?, 'pending', ?, ?)", id, await tokenHash(code), deviceName, timestamp(10 * 60_000), timestamp());
    const base = new URL(request.url).origin;
    return json({ authorization_id: id, user_code: code, device_name: deviceName, status: "pending", expires_at: timestamp(10 * 60_000), approval_url: `${base}/web/device-authorizations/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}` }, 201);
  }

  private isReadOnlyValue() {
    return (this.sql.exec("SELECT value FROM hub_settings WHERE key = 'read_only'").toArray()[0] as { value?: string } | undefined)?.value === "1";
  }

  private authorization(id: string) {
    this.sql.exec("UPDATE device_authorizations SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?", timestamp());
    return this.sql.exec("SELECT authorization_id, device_name, status, expires_at, device_id FROM device_authorizations WHERE authorization_id = ?", id).toArray()[0] as Record<string, unknown> | undefined;
  }

  private async authorizationToken(id: string, request: Request) {
    const body = await request.json() as Record<string, unknown>;
    const codeHash = await tokenHash(String(body.user_code || "").trim().toUpperCase());
    const row = this.sql.exec("SELECT authorization_id, device_name, status, expires_at, device_id, device_token FROM device_authorizations WHERE authorization_id = ? AND user_code_hash = ?", id, codeHash).toArray()[0] as Record<string, unknown> | undefined;
    if (!row || String(row.expires_at) <= timestamp()) return json({ error: "invalid_device_authorization" }, 400);
    if (row.status !== "approved" || !row.device_id || !row.device_token) return json({ authorization_id: id, status: row.status });
    const token = String(row.device_token);
    const result = this.transaction(() => {
      const current = this.sql.exec("SELECT device_token FROM device_authorizations WHERE authorization_id = ? AND status = 'approved'", id).toArray()[0] as { device_token?: string } | undefined;
      if (!current?.device_token) return null;
      this.sql.exec("UPDATE device_authorizations SET device_token = NULL WHERE authorization_id = ? AND device_token IS NOT NULL", id);
      return current.device_token;
    });
    return result ? json({ authorization_id: id, status: "approved", device_id: row.device_id, device_name: row.device_name, device_token: token }) : json({ authorization_id: id, status: "approved" });
  }

  private async approveAuthorization(id: string, request: Request) {
    if (!trustedOrigin(request)) return json({ error: "csrf_invalid" }, 403);
    const session = cookieValue(request, "better_codex_session");
    const csrf = request.headers.get("x-csrf-token") || "";
    const sessionRow = this.sql.exec("SELECT csrf_token FROM web_sessions WHERE token_hash = ? AND expires_at > ?", await tokenHash(session), timestamp()).toArray()[0] as { csrf_token: string } | undefined;
    if (!sessionRow || sessionRow.csrf_token !== csrf) return json({ error: "csrf_invalid" }, 403);
    const body = await request.json() as Record<string, unknown>;
    const codeHash = await tokenHash(String(body.user_code || "").trim().toUpperCase());
    const row = this.sql.exec("SELECT device_name, status, expires_at FROM device_authorizations WHERE authorization_id = ? AND user_code_hash = ?", id, codeHash).toArray()[0] as { device_name: string; status: string; expires_at: string } | undefined;
    if (!row || row.status !== "pending" || row.expires_at <= timestamp()) return json({ error: "invalid_device_authorization" }, 400);
    const deviceId = crypto.randomUUID();
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = [...tokenBytes].map(value => value.toString(16).padStart(2, "0")).join("");
    const now = timestamp();
    const tokenHashValue = await tokenHash(token);
    this.transaction(() => {
      const current = this.sql.exec("SELECT status FROM device_authorizations WHERE authorization_id = ? AND status = 'pending'", id).toArray();
      if (!current.length) throw new Error("invalid_device_authorization");
      this.sql.exec("UPDATE device_authorizations SET status = 'approved', device_id = ?, device_token_hash = ?, device_token = ?, approved_at = ? WHERE authorization_id = ? AND status = 'pending'", deviceId, tokenHashValue, token, now, id);
      if (!this.sql.exec("SELECT 1 FROM device_authorizations WHERE authorization_id = ? AND status = 'approved' AND device_id = ?", id, deviceId).toArray().length) throw new Error("invalid_device_authorization");
      this.sql.exec("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)", deviceId, row.device_name, tokenHashValue, now, now);
    });
    return json({ authorization_id: id, status: "approved", device_id: deviceId, device_name: row.device_name });
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
    const result = this.transaction(() => {
      const leaseExpiresAt = this.lease(deviceId);
      const accepted: string[] = [];
      for (const change of request.changes) {
      if (!change || typeof change.event_id !== "string" || !change.entity_id || !["project", "issue", "agent_directory"].includes(change.entity_type)) throw new Error("invalid_change");
      if (this.sql.exec("SELECT event_id FROM sync_events WHERE event_id = ?", change.event_id).toArray().length) { accepted.push(change.event_id); continue; }
      const current = this.sql.exec("SELECT * FROM entities WHERE entity_type = ? AND entity_id = ?", change.entity_type, change.entity_id).toArray()[0] as { owner_device_id: string; payload_json: string; local_revision: number; deleted_at: string | null } | undefined;
      if (current && current.owner_device_id !== deviceId) throw new Error("entity_owned_by_another_device");
      const decoded = change.operation === "upsert" ? decodePayload(change.projection, change.entity_type === "agent_directory") : null;
      const projection = decoded && change.entity_type === "agent_directory" ? normalizeAgentDirectoryProjection(decoded, change.entity_id) : decoded;
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
      const runtimeRow = this.sql.exec("SELECT payload_json FROM runtime_projection WHERE device_id = ?", deviceId).toArray()[0] as { payload_json?: string } | undefined;
      const runtime = { ...request.runtime, protocol_version: request.protocol_version, last_seen_at: timestamp(), usage: normalizeCodexUsageProjection(request.runtime.usage), agent_models: normalizeAgentModelCatalogProjection(request.runtime.agent_models), auto_dispatch: request.runtime.auto_dispatch === true, scheduler_model: String(request.runtime.scheduler_model || "").slice(0, 200), scheduler_reasoning_effort: String(request.runtime.scheduler_reasoning_effort || "").slice(0, 40), default_agent_model: String(request.runtime.default_agent_model || "").slice(0, 200), default_agent_reasoning_effort: String(request.runtime.default_agent_reasoning_effort || "").slice(0, 40) };
      this.sql.exec("INSERT INTO runtime_projection (device_id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at", deviceId, JSON.stringify(runtime), timestamp());
      if (runtimeProjectionSignature(runtimeRow?.payload_json ? JSON.parse(runtimeRow.payload_json) as RuntimeProjection : null) !== runtimeProjectionSignature(runtime)) this.sql.exec("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('runtime', ?, 'upsert', ?)", deviceId, timestamp());
      return { accepted, cursor: this.revision(), lease_expires_at: leaseExpiresAt };
    });
    if (result.accepted.length) this.notifyWeb({ entity_type: "sync", entity_id: deviceId, operation: "push" });
    return result;
  }

  private pendingCommands(deviceId: string, limit: number) {
    recoverExpiredCommands(this.sql);
    return this.sql.exec("SELECT * FROM remote_commands WHERE device_id = ? AND status = 'pending' ORDER BY requested_at, rowid LIMIT ?", deviceId, limit).toArray().map(row => this.command(row));
  }

  private claimCommands(deviceId: string, limit: number) {
    recoverExpiredCommands(this.sql);
    const rows = this.pendingCommands(deviceId, limit);
    const claimed = this.transaction(() => rows.flatMap(command => {
        const deliveryId = crypto.randomUUID();
        this.sql.exec("UPDATE remote_commands SET status = 'dispatched', delivery_id = ?, dispatched_at = ?, dispatch_expires_at = ?, attempt_count = COALESCE(attempt_count, 0) + 1 WHERE command_id = ? AND status = 'pending'", deliveryId, timestamp(), timestamp(90_000), command.command_id);
        if (!this.sql.exec("SELECT 1 FROM remote_commands WHERE command_id = ? AND status = 'dispatched' AND delivery_id = ?", command.command_id, deliveryId).toArray().length) return [];
        return [this.command(this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", command.command_id).toArray()[0])];
      }));
    return claimed;
  }

  private ack(deviceId: string, ack: RemoteCommandAck) {
    recoverExpiredCommands(this.sql);
    const row = this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ? AND device_id = ?", ack.command_id, deviceId).toArray()[0] as SqlRow | undefined;
    if (!row) throw new Error("command_not_found");
    if (!["pending", "dispatched"].includes(String(row.status))) return this.command(row);
    if (row.status === "dispatched" && row.delivery_id && row.delivery_id !== ack.delivery_id) throw new Error("stale_command_delivery");
    if (!["applied", "rejected", "conflict"].includes(ack.status)) throw new Error("invalid_command_status");
    const result = this.transaction(() => {
      if (ack.status === "applied" && row.operation !== "settings.auto-dispatch") {
        const projection = decodePayload(ack.projection);
        if (projection.id !== row.entity_id || !Number.isSafeInteger(projection.local_revision) || Number(projection.local_revision) < 1) throw new Error("invalid_projection");
        this.sql.exec("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES ('issue', ?, ?, ?, ?, NULL, ?) ON CONFLICT(entity_type, entity_id) DO UPDATE SET owner_device_id = excluded.owner_device_id, local_revision = excluded.local_revision, payload_json = excluded.payload_json, deleted_at = NULL, updated_at = excluded.updated_at", row.entity_id, deviceId, projection.local_revision, JSON.stringify(projection), timestamp());
        this.sql.exec("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'upsert', ?)", row.entity_id, timestamp());
      }
      if (ack.status === "applied" && row.operation === "settings.auto-dispatch") {
        const runtime = this.sql.exec("SELECT payload_json FROM runtime_projection WHERE device_id = ?", deviceId).toArray()[0] as { payload_json?: string } | undefined;
        if (runtime?.payload_json) this.sql.exec("UPDATE runtime_projection SET payload_json = ?, updated_at = ? WHERE device_id = ?", JSON.stringify({ ...JSON.parse(runtime.payload_json), auto_dispatch: JSON.parse(String(row.payload_json)).enabled === true }), timestamp(), deviceId);
      }
      this.sql.exec("UPDATE remote_commands SET status = ?, finished_at = ?, error = ?, delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL WHERE command_id = ?", ack.status, timestamp(), ack.error, ack.command_id);
      const result = this.command(this.sql.exec("SELECT * FROM remote_commands WHERE command_id = ?", ack.command_id).toArray()[0]);
      return result;
    });
    this.notifyWeb({ entity_type: row.operation === "settings.auto-dispatch" ? "settings" : "issue", entity_id: String(row.entity_id), operation: "command" });
    return result;
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
        const selectedSyncProtocol = message.type === "hello" ? supportedSyncProtocolVersions.find(version => message.sync_protocol_versions.includes(version)) : undefined;
        if (message.type === "hello" && !selectedSyncProtocol) throw new Error("incompatible_protocol");
        socket.send(encodeControlMessage(message.type === "hello"
          ? { type: "hello_ack", protocol_version: controlProtocolVersion, sync_protocol_version: selectedSyncProtocol!, capabilities: [...controlCapabilities], revision: this.revision(), lease_expires_at: leaseExpiresAt }
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
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && (path === "/better-codex-icon-192.png" || path === "/better-codex-icon-512.png") && env.ASSETS) return env.ASSETS.fetch(request);
    const id = env.HUB.idFromName("primary");
    return env.HUB.get(id).fetch(request);
  },
};
