import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { injectionScript } from "./dom.js";
import { clearWebSessionCookie, cookies, passwordHash, passwordMatches, readHubSecret, validateWebPassword, validateWebUsername, webSessionCookie } from "./hub-auth.js";
import { issuePriorities, issueStatuses } from "./db.js";
import { HubStore } from "./hub-store.js";
import type { RemoteCommandAck, SyncPushRequest } from "./sync-contract.js";
import { betterCodexWebHostCss, betterCodexWebHostHtml, betterCodexWebHostJavaScript } from "./web-host.js";
import { avatarInitials } from "./user-profile.js";
import { renderMarkdown } from "./markdown.js";
import { controlCapabilities, controlProtocolVersion, decodeControlMessage, encodeControlMessage } from "./control-protocol.js";
import { upgradeWebSocket, type WebSocketConnection } from "./websocket-server.js";

export type HubServerOptions = {
  host: string;
  port: number;
  database: string;
  adminToken: string;
  webPassword?: string;
  webUsername?: string;
  secureCookies?: boolean;
  allowedHosts?: string[];
  trustedProxy?: boolean;
};

export function hubServerOptions(): HubServerOptions {
  const port = Number(process.env.BETTER_CODEX_HUB_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("invalid_hub_port");
  const adminToken = readHubSecret("BETTER_CODEX_HUB_BOOTSTRAP_SECRET_FILE", "BETTER_CODEX_HUB_BOOTSTRAP_SECRET") || readHubSecret("BETTER_CODEX_HUB_ADMIN_TOKEN_FILE", "BETTER_CODEX_HUB_ADMIN_TOKEN");
  const webPassword = validateWebPassword(readHubSecret("BETTER_CODEX_HUB_WEB_PASSWORD_FILE", "BETTER_CODEX_HUB_WEB_PASSWORD"));
  const webUsername = validateWebUsername(process.env.BETTER_CODEX_HUB_WEB_USERNAME || "admin");
  if (adminToken.length < 32) throw new Error("hub_bootstrap_secret_too_short");
  if (adminToken === webPassword) throw new Error("hub_secrets_must_be_distinct");
  return {
    host: process.env.BETTER_CODEX_HUB_HOST || "127.0.0.1",
    port,
    database: resolve(process.env.BETTER_CODEX_HUB_DB || "./data/better-codex-hub.db"),
    adminToken,
    webPassword,
    webUsername,
    secureCookies: process.env.BETTER_CODEX_HUB_INSECURE_COOKIES !== "1",
    allowedHosts: String(process.env.BETTER_CODEX_HUB_ALLOWED_HOSTS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean),
    trustedProxy: process.env.BETTER_CODEX_HUB_TRUST_PROXY === "1",
  };
}

function loginClientAddress(request: IncomingMessage, trustedProxy: boolean) {
  if (!trustedProxy) return String(request.socket.remoteAddress || "unknown");
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded !== "string" || !isIP(forwarded.trim())) return null;
  return forwarded.trim();
}

function bearer(request: IncomingMessage) {
  const header = request.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function secretEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function securityHeaders() {
  return {
    "cache-control": "no-store",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function sendJson(response: ServerResponse, status: number, value: unknown, headers: Record<string, string> = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, { ...securityHeaders(), "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "content-security-policy": "default-src 'none'; frame-ancestors 'none'", ...headers });
  response.end(body);
}

function sendText(response: ServerResponse, status: number, body: string, contentType: string, headers: Record<string, string> = {}) {
  response.writeHead(status, { ...securityHeaders(), "content-type": contentType, "content-length": Buffer.byteLength(body), ...headers });
  response.end(body);
}

function readBody(request: IncomingMessage, limit = 1_048_576) {
  return new Promise<Record<string, unknown>>((resolveBody, reject) => {
    let body = "";
    let failed = false;
    request.on("data", chunk => {
      if (failed) return;
      body += String(chunk);
      if (Buffer.byteLength(body) > limit) {
        failed = true;
        body = "";
        reject(new Error("body_too_large"));
      }
    });
    request.on("end", () => {
      if (failed) return;
      try {
        const value = body ? JSON.parse(body) : {};
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
        resolveBody(value as Record<string, unknown>);
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function trustedOrigin(request: IncomingMessage, required = false) {
  const origin = request.headers.origin;
  if (!origin) return !required;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function trustedHost(request: IncomingMessage, allowedHosts: string[]) {
  const raw = String(request.headers.host || "").toLowerCase();
  if (!raw || raw.includes("/") || raw.includes("\\")) return false;
  let hostname = "";
  try { hostname = new URL(`http://${raw}`).hostname.toLowerCase(); } catch { return false; }
  if (["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) return true;
  return allowedHosts.includes(raw) || allowedHosts.includes(hostname);
}

function errorStatus(code: string) {
  if (code === "unauthorized") return 401;
  if (["forbidden", "csrf_invalid", "writer_lease_conflict"].includes(code)) return 403;
  if (["device_not_found", "issue_not_found", "command_not_found"].includes(code)) return 404;
  if (["entity_owned_by_another_device", "incompatible_protocol", "version_conflict", "command_id_conflict", "issue_execution_running", "stale_command_delivery"].includes(code)) return 409;
  if (code === "runtime_not_paired") return 503;
  if (code === "body_too_large") return 413;
  if (code === "login_rate_limited") return 429;
  return 400;
}

function issueForWeb(issue: ReturnType<HubStore["board"]>["issues"][number]) {
  return {
    ...issue,
    version: issue.local_revision,
    remote_pending: issue.remote_state?.status === "pending" || issue.remote_state?.status === "dispatched",
    remote_conflict: issue.remote_state?.status === "conflict",
    thread_id: null,
    run_thread_id: issue.has_conversation ? issue.id : null,
    workspace_path: null,
    agent_enabled: issue.agent_enabled,
    agent_id: issue.agent_id,
    user_assigned: issue.user_assigned,
    pending_actor: issue.pending_actor,
    enrichment_status: null,
    reply_draft: "",
    reply_status: issue.reply_status,
    active_run_status: issue.active_run_status,
    latest_run_status: issue.latest_run_status,
    latest_scheduler_status: issue.latest_scheduler_status,
    session_status: issue.session_status,
  };
}

function agentsForWeb(board: ReturnType<HubStore["board"]>) {
  return [
    { id: "", role: "codex", name: "Codex", name_en: "Codex", description: "", instructions: "", model: "", reasoning_effort: "", sandbox_mode: "workspace-write", max_concurrency: 5, version: 1, created_at: "", updated_at: "", avatar: board.default_avatar, is_default: true, remote_read_only: true },
    ...board.agents.map(agent => ({ ...agent, instructions: "", model: "", reasoning_effort: "", sandbox_mode: "workspace-write", max_concurrency: 5, is_default: false, remote_read_only: true })),
  ];
}

export function createHubServer(options: HubServerOptions) {
  if (options.adminToken.length < 32) throw new Error("hub_admin_token_too_short");
  const store = new HubStore(options.database);
  const initialPassword = options.webPassword ?? options.adminToken;
  store.ensureWebCredentials(validateWebUsername(options.webUsername || "admin"), passwordHash(initialPassword));
  const secureCookies = options.secureCookies !== false;
  const allowedHosts = options.allowedHosts ?? [];
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  const controlConnections = new Map<string, Set<WebSocketConnection>>();
  const notifyControl = (deviceId: string) => {
    const count = store.pendingCommandCount(deviceId);
    if (count < 1) return;
    const message = encodeControlMessage({ type: "commands_available", protocol_version: controlProtocolVersion, count });
    for (const connection of controlConnections.get(deviceId) || []) connection.send(message);
  };
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url) return sendJson(response, 400, { error: "invalid_request" });
      const url = new URL(request.url, "http://hub.local");
      const method = request.method ?? "GET";
      if (!trustedHost(request, allowedHosts)) return sendJson(response, 403, { error: "untrusted_host" });
      if (method === "OPTIONS") {
        response.writeHead(204, securityHeaders());
        return response.end();
      }
      if (!trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      if (url.pathname === "/healthz" && method === "GET") return sendJson(response, 200, store.health());
      if (["/", "/web"].includes(url.pathname) && method === "GET") return sendText(response, 200, betterCodexWebHostHtml(true), "text/html; charset=utf-8", { "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
      if (url.pathname === "/web/host.css" && method === "GET") return sendText(response, 200, betterCodexWebHostCss(), "text/css; charset=utf-8");
      if (url.pathname === "/web/host.js" && method === "GET") return sendText(response, 200, betterCodexWebHostJavaScript(true), "text/javascript; charset=utf-8");
      if (url.pathname === "/web/session" && method === "POST") {
        if (!trustedOrigin(request, true)) return sendJson(response, 403, { error: "forbidden" });
        const client = loginClientAddress(request, options.trustedProxy === true);
        if (!client) return sendJson(response, 400, { error: "invalid_proxy_client" });
        const attempt = loginAttempts.get(client);
        if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) {
          store.audit(client, "web_login_rate_limited");
          return sendJson(response, 429, { error: "login_rate_limited" }, { "retry-after": String(Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000))) });
        }
        const body = await readBody(request, 4096);
        if (String(body.username ?? "") !== store.webUsername() || !passwordMatches(String(body.password ?? ""), store.webPasswordHash() || "")) {
          const current = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 15 * 60_000 };
          loginAttempts.set(client, { ...current, count: current.count + 1 });
          store.audit(client, "web_login_failed");
          return sendJson(response, 401, { error: "unauthorized" });
        }
        loginAttempts.delete(client);
        const session = store.createWebSession();
        return sendJson(response, 200, { csrf_token: session.csrf_token, expires_at: session.expires_at }, { "set-cookie": webSessionCookie(session.token, secureCookies) });
      }

      const token = bearer(request);
      const admin = token.length > 0 && secretEqual(token, options.adminToken);
      const browserToken = cookies(request.headers.cookie).get("better_codex_session") || "";
      const browser = store.webSession(browserToken);
      const csrfValid = Boolean(browser && typeof request.headers["x-csrf-token"] === "string" && secretEqual(request.headers["x-csrf-token"], browser.csrf_token));
      if (url.pathname === "/web/session" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { csrf_token: browser.csrf_token, expires_at: browser.expires_at });
      }
      if (url.pathname === "/web/session" && method === "DELETE") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" }, { "set-cookie": clearWebSessionCookie(secureCookies) });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        store.revokeWebSession(browserToken);
        return sendJson(response, 200, { ok: true }, { "set-cookie": clearWebSessionCookie(secureCookies) });
      }
      if (url.pathname === "/web/injection.js" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        const locale = String(url.searchParams.get("locale") || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
        return sendText(response, 200, injectionScript(0, "", "install", locale, "web"), "text/javascript; charset=utf-8");
      }
      if (url.pathname === "/api/v1/devices/pair" && method === "POST") {
        const body = await readBody(request);
        return sendJson(response, 201, store.pairDevice(body.name, body.pairing_code, body.replace_existing === true));
      }
      if (url.pathname === "/api/v1/admin/pairing-codes" && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 201, store.createPairingCode());
      }
      if (url.pathname === "/api/v1/admin/devices" && method === "GET") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.devices());
      }
      const revoke = url.pathname.match(/^\/api\/v1\/admin\/devices\/([^/]+)$/);
      if (revoke && method === "DELETE") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.revokeDevice(decodeURIComponent(revoke[1])));
      }
      if (url.pathname === "/api/v1/admin/projection" && method === "DELETE") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.clearProjection());
      }

      if (url.pathname === "/api/v1/board" && method === "GET") {
        if (!admin && !browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.board());
      }
      if (url.pathname === "/api/bootstrap" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        const board = store.board();
        const userName = store.webUsername() || "admin";
        return sendJson(response, 200, {
          projects: board.projects,
          agents: agentsForWeb(board),
          statuses: issueStatuses,
          priorities: issuePriorities,
          appearance: { theme: "system", accent: "green" },
          locale: "zh-CN",
          user: { id: `remote:${userName}`, name: userName, email: "", handle: userName, initials: avatarInitials(userName), color: "#16a34a" },
          agentModelCatalog: [],
          agentModels: [],
          agentReasoningEfforts: [],
          autoDispatch: false,
          schedulerModel: "",
          schedulerReasoningEffort: "",
          mockup: false,
          runtime: board.runtime,
          capabilities: { issues: "read-write", agents: "read-only", nativeThreads: false },
        });
      }
      if (url.pathname === "/api/account/usage" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { usage: null });
      }
      if (url.pathname === "/api/update" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { available: false, checking: false, installing: false });
      }
      if (url.pathname === "/api/agents" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, agentsForWeb(store.board()));
      }
      if (url.pathname === "/api/projects" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.board().projects);
      }
      if (url.pathname === "/api/issues" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        const board = store.board();
        const projectId = url.searchParams.get("project_id");
        const search = (url.searchParams.get("search") || "").toLowerCase();
        const archived = url.searchParams.get("archived") === "1";
        const issues = board.issues.filter(issue => Boolean(issue.archived_at) === archived && (!projectId || issue.project_id === projectId) && (!search || `${issue.identifier} ${issue.title} ${issue.description}`.toLowerCase().includes(search)));
        return sendJson(response, 200, issues.map(issueForWeb));
      }
      const issueMatch = url.pathname.match(/^\/api\/issues\/([^/]+)$/);
      if (issueMatch && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        const issue = store.board().issues.find(item => item.id === decodeURIComponent(issueMatch[1]) || item.identifier === decodeURIComponent(issueMatch[1]));
        return issue ? sendJson(response, 200, issueForWeb(issue)) : sendJson(response, 404, { error: "issue_not_found" });
      }
      if (url.pathname === "/api/issues" && method === "POST") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const body = await readBody(request);
        const command = store.createRemoteCommand({
          command_id: body.command_id ?? request.headers["x-better-codex-command-id"],
          operation: "issue.create",
          entity_id: body.id,
          base_revision: null,
          payload: { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, labels: body.labels, agent_enabled: body.agent_enabled, agent_id: body.agent_id, user_assigned: body.user_assigned },
        });
        notifyControl(command.device_id);
        const issue = store.board().issues.find(item => item.id === command.entity_id)!;
        return sendJson(response, 202, issueForWeb(issue));
      }
      if (issueMatch && method === "PATCH") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const body = await readBody(request);
        const issueId = decodeURIComponent(issueMatch[1]);
        const command = store.createRemoteCommand({
          command_id: body.command_id ?? request.headers["x-better-codex-command-id"],
          operation: "issue.update",
          entity_id: issueId,
          base_revision: body.version,
          payload: { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, labels: body.labels, sort_order: body.sort_order, pinned: body.pinned, agent_enabled: body.agent_enabled, agent_id: body.agent_id, user_assigned: body.user_assigned },
        });
        notifyControl(command.device_id);
        const issue = store.board().issues.find(item => item.id === command.entity_id)!;
        return sendJson(response, 202, issueForWeb(issue));
      }
      const conversationMatch = url.pathname.match(/^\/api\/issues\/([^/]+)\/conversation$/);
      if (conversationMatch && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        const issueId = decodeURIComponent(conversationMatch[1]);
        const issue = store.board().issues.find(item => item.id === issueId || item.identifier === issueId);
        if (!issue) return sendJson(response, 404, { error: "issue_not_found" });
        const projection = store.conversation(issue.id);
        let messages = projection?.messages ?? [];
        let reply = projection?.reply ?? { status: issue.reply_status, message: "" };
        if (issue.remote_state?.operation === "issue.reply") {
          const command = store.remoteCommand(issue.remote_state.command_id);
          if (command?.status === "pending" || command?.status === "dispatched") {
            const names = Array.isArray(command.payload.files) ? command.payload.files.flatMap(file => file && typeof file === "object" && typeof (file as Record<string, unknown>).name === "string" ? [String((file as Record<string, unknown>).name)] : []) : [];
            const message = String(command.payload.message || "") || (names.length ? `附带文件：\n${names.map(name => `- ${name}`).join("\n")}` : "");
            reply = { request_id: command.command_id, status: "running", message, started_at: command.requested_at };
            if (!messages.some(item => item.role === "user" && item.markdown === message)) messages = [...messages, { id: `reply-${command.command_id}`, role: "user", markdown: message, html: "", phase: null, timestamp: command.requested_at }];
          } else if (command?.status === "conflict" || command?.status === "rejected") {
            reply = { request_id: command.command_id, status: "failed", message: String(command.payload.message || ""), error: command.error || "command_rejected", started_at: command.requested_at, finished_at: command.finished_at || undefined };
          }
        }
        return sendJson(response, 200, { issue_id: issue.id, found: messages.length > 0, messages: messages.map(message => ({ ...message, html: renderMarkdown(message.markdown) })), reply, updated_at: projection?.updated_at || issue.updated_at, issue: issueForWeb(issue) });
      }
      const replyMatch = url.pathname.match(/^\/api\/issues\/([^/]+)\/reply$/);
      if (replyMatch && method === "POST") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const body = await readBody(request, 30 * 1024 * 1024);
        const issueId = decodeURIComponent(replyMatch[1]);
        const issue = store.board().issues.find(item => item.id === issueId || item.identifier === issueId);
        if (!issue) return sendJson(response, 404, { error: "issue_not_found" });
        const command = store.createRemoteCommand({ command_id: body.request_id ?? request.headers["x-better-codex-command-id"], operation: "issue.reply", entity_id: issue.id, base_revision: issue.local_revision, payload: { message: body.message, files: body.files } });
        notifyControl(command.device_id);
        const names = Array.isArray(command.payload.files) ? command.payload.files.flatMap(file => file && typeof file === "object" && typeof (file as Record<string, unknown>).name === "string" ? [String((file as Record<string, unknown>).name)] : []) : [];
        const message = String(command.payload.message || "") || (names.length ? `附带文件：\n${names.map(name => `- ${name}`).join("\n")}` : "");
        return sendJson(response, 202, { issue_id: issue.id, request_id: command.command_id, status: "running", message });
      }
      const issueAction = url.pathname.match(/^\/api\/issues\/([^/]+)\/(move|start|stop|archive|unarchive)$/);
      if (issueAction && method === "POST") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const body = await readBody(request);
        const action = issueAction[2];
        const operation = action === "archive" ? "issue.archive" : action === "unarchive" ? "issue.restore" : action === "start" ? "issue.start" : action === "stop" ? "issue.stop" : "issue.move";
        const payload = action === "move"
          ? { status: body.status, before_id: body.before_id }
          : action === "start"
            ? { project_id: body.project_id, title: body.title, description: body.description, status: body.status, priority: body.priority, labels: body.labels, agent_id: body.agent_id }
            : {};
        const command = store.createRemoteCommand({ command_id: body.command_id ?? request.headers["x-better-codex-command-id"], operation, entity_id: decodeURIComponent(issueAction[1]), base_revision: body.version, payload });
        notifyControl(command.device_id);
        const issue = store.board().issues.find(item => item.id === command.entity_id)!;
        return sendJson(response, 202, issueForWeb(issue));
      }
      const commandStatus = url.pathname.match(/^\/api\/v1\/commands\/([^/]+)$/);
      if (commandStatus && method === "GET") {
        if (!browser && !admin) return sendJson(response, 401, { error: "unauthorized" });
        const command = store.remoteCommand(decodeURIComponent(commandStatus[1]));
        return command ? sendJson(response, 200, command) : sendJson(response, 404, { error: "command_not_found" });
      }
      if (url.pathname === "/api/events" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        response.writeHead(200, { ...securityHeaders(), "connection": "keep-alive", "content-type": "text/event-stream; charset=utf-8", "x-accel-buffering": "no" });
        response.flushHeaders();
        let cursor = Number(request.headers["last-event-id"] ?? store.board().revision);
        if (!Number.isSafeInteger(cursor) || cursor < 0) cursor = 0;
        const initial = store.changeWindow(cursor);
        if (initial.resync_required) {
          cursor = initial.revision;
          response.write(`id: ${cursor}\nevent: resync_required\ndata: {}\n\n`);
        } else response.write(`id: ${initial.revision}\nevent: ready\ndata: {}\n\n`);
        const poll = setInterval(() => {
          const window = store.changeWindow(cursor);
          if (window.resync_required) {
            cursor = window.revision;
            response.write(`id: ${cursor}\nevent: resync_required\ndata: {}\n\n`);
            return;
          }
          const changes = window.changes;
          for (const change of changes) {
            cursor = change.seq;
            response.write(`id: ${change.seq}\nevent: change\ndata: ${JSON.stringify(change)}\n\n`);
          }
          response.write(": heartbeat\n\n");
        }, 1000);
        request.once("close", () => clearInterval(poll));
        return;
      }
      if (url.pathname.startsWith("/api/") && browser && method !== "GET") {
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        return sendJson(response, 405, { error: "remote_operation_forbidden" });
      }

      const device = store.deviceForToken(token);
      if (!device) return sendJson(response, 401, { error: "unauthorized" });
      if (url.pathname === "/api/v1/capabilities" && method === "GET") return sendJson(response, 200, { protocol_versions: ["sync/v6", "sync/v5"], control_protocol: "control/v1", transports: ["websocket", "http"], command_delivery: "lease" });
      if (url.pathname === "/api/v1/sync/push" && method === "POST") return sendJson(response, 200, store.push(device.id, await readBody(request, 45 * 1024 * 1024) as SyncPushRequest));
      const conversationPush = url.pathname.match(/^\/api\/v1\/sync\/issues\/([^/]+)\/conversation$/);
      if (conversationPush && method === "PUT") return sendJson(response, 200, store.putConversation(device.id, decodeURIComponent(conversationPush[1]), await readBody(request, 10 * 1024 * 1024)));
      if (url.pathname === "/api/v1/sync/commands" && method === "GET") return sendJson(response, 200, { commands: store.pendingCommands(device.id, Number(url.searchParams.get("limit") || 100)) });
      if (url.pathname === "/api/v1/sync/commands/claim" && method === "POST") return sendJson(response, 200, { commands: store.claimCommands(device.id, Number(url.searchParams.get("limit") || 100)) });
      const commandAck = url.pathname.match(/^\/api\/v1\/sync\/commands\/([^/]+)\/ack$/);
      if (commandAck && method === "POST") {
        const body = await readBody(request);
        return sendJson(response, 200, store.ackRemoteCommand(device.id, { ...body, command_id: decodeURIComponent(commandAck[1]) } as RemoteCommandAck));
      }
      return sendJson(response, 404, { error: "not_found" });
    })().catch(error => {
      const code = error instanceof Error ? error.message : "hub_error";
      if (!response.headersSent) sendJson(response, errorStatus(code), { error: code });
      else response.end();
    });
  });
  server.on("upgrade", (request, socket, head) => {
    try {
      if (!trustedHost(request, allowedHosts) || !trustedOrigin(request)) {
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return;
      }
      const url = new URL(request.url || "/", "http://hub.local");
      if (url.pathname !== "/api/v1/control") {
        socket.destroy();
        return;
      }
      const requested = String(request.headers["sec-websocket-protocol"] ?? "").split(",").map(value => value.trim()).filter(Boolean);
      const token = requested.find(value => value !== "better-codex-control-v1") || "";
      const device = store.deviceForToken(token);
      if (!device) {
        socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        return;
      }
      let connection: WebSocketConnection | null = null;
      let helloReceived = false;
      connection = upgradeWebSocket(request, socket, ["better-codex-control-v1"], {
        message: value => {
          try {
            const message = decodeControlMessage(value);
            if (message.type === "hello") {
              if (message.device_id !== device.id) throw new Error("device_mismatch");
              helloReceived = true;
              const lease = store.heartbeat(device.id);
              connection?.send(encodeControlMessage({ type: "hello_ack", protocol_version: controlProtocolVersion, sync_protocol_version: "sync/v6", capabilities: [...controlCapabilities], revision: store.revision(), lease_expires_at: lease.lease_expires_at }));
              if (lease.commands_available > 0) connection?.send(encodeControlMessage({ type: "commands_available", protocol_version: controlProtocolVersion, count: lease.commands_available }));
              return;
            }
            if (!helloReceived) throw new Error("control_hello_required");
            if (message.type === "heartbeat") {
              if (message.device_id !== device.id) throw new Error("device_mismatch");
              const lease = store.heartbeat(device.id);
              connection?.send(encodeControlMessage({ type: "heartbeat_ack", protocol_version: controlProtocolVersion, lease_expires_at: lease.lease_expires_at, commands_available: lease.commands_available }));
              if (lease.commands_available > 0) connection?.send(encodeControlMessage({ type: "commands_available", protocol_version: controlProtocolVersion, count: lease.commands_available }));
              return;
            }
            if (message.type === "rpc_request" && message.method === "commands.claim") {
              const commands = store.claimCommands(device.id, Number(message.params.limit || 100));
              connection?.send(encodeControlMessage({ type: "rpc_response", protocol_version: controlProtocolVersion, request_id: message.request_id, ok: true, result: { commands } }));
              return;
            }
            if (message.type === "rpc_request" && message.method === "commands.ack") {
              const result = store.ackRemoteCommand(device.id, message.params as RemoteCommandAck);
              connection?.send(encodeControlMessage({ type: "rpc_response", protocol_version: controlProtocolVersion, request_id: message.request_id, ok: true, result: { command: result } }));
              return;
            }
            throw new Error("unsupported_control_message");
          } catch (error) {
            connection?.close(1008);
            store.audit(device.id, "control_protocol_error", error instanceof Error ? error.message : "control_error");
          }
        },
        close: () => {
          const connections = controlConnections.get(device.id);
          connections?.delete(connection!);
          if (connections?.size === 0) controlConnections.delete(device.id);
        },
        error: error => store.audit(device.id, "control_socket_error", error.message),
      });
      if (!connection) return;
      const connections = controlConnections.get(device.id) || new Set<WebSocketConnection>();
      connections.add(connection);
      controlConnections.set(device.id, connections);
      connection.acceptHead(head);
    } catch {
      socket.destroy();
    }
  });
  server.once("close", () => store.close());
  return { server, store };
}

export function startHubServer(options = hubServerOptions()) {
  const { server } = createHubServer(options);
  server.listen(options.port, options.host, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : options.port;
    console.log(`Better Codex Hub listening on http://${options.host}:${port}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
