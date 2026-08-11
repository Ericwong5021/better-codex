import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { injectionScript } from "./dom.js";
import { issuePriorities, issueStatuses } from "./db.js";
import { HubStore } from "./hub-store.js";
import type { SyncPushRequest } from "./sync-contract.js";
import { betterCodexWebHostCss, betterCodexWebHostHtml, betterCodexWebHostJavaScript } from "./web-host.js";

export type HubServerOptions = {
  host: string;
  port: number;
  database: string;
  adminToken: string;
};

function readAdminToken() {
  const file = process.env.BETTER_CODEX_HUB_ADMIN_TOKEN_FILE;
  const value = file ? readFileSync(resolve(file), "utf8").trim() : process.env.BETTER_CODEX_HUB_ADMIN_TOKEN?.trim() ?? "";
  if (value.length < 32) throw new Error("hub_admin_token_too_short");
  return value;
}

export function hubServerOptions(): HubServerOptions {
  const port = Number(process.env.BETTER_CODEX_HUB_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("invalid_hub_port");
  return {
    host: process.env.BETTER_CODEX_HUB_HOST || "127.0.0.1",
    port,
    database: resolve(process.env.BETTER_CODEX_HUB_DB || "./data/better-codex-hub.db"),
    adminToken: readAdminToken(),
  };
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
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, { ...securityHeaders(), "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(body), "content-security-policy": "default-src 'none'; frame-ancestors 'none'" });
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

function trustedOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function errorStatus(code: string) {
  if (code === "unauthorized") return 401;
  if (["forbidden", "writer_lease_conflict"].includes(code)) return 403;
  if (["device_not_found", "issue_not_found"].includes(code)) return 404;
  if (["entity_owned_by_another_device", "incompatible_protocol"].includes(code)) return 409;
  if (code === "body_too_large") return 413;
  return 400;
}

function issueForWeb(issue: ReturnType<HubStore["board"]>["issues"][number]) {
  return {
    ...issue,
    version: issue.local_revision,
    thread_id: null,
    workspace_path: null,
    agent_enabled: false,
    agent_id: null,
    user_assigned: issue.assigned,
    pending_actor: "user",
    enrichment_status: null,
    reply_draft: "",
    reply_status: "idle",
    active_run_status: issue.active_run ? "running" : null,
  };
}

export function createHubServer(options: HubServerOptions) {
  if (options.adminToken.length < 32) throw new Error("hub_admin_token_too_short");
  const store = new HubStore(options.database);
  const webSessions = new Map<string, number>();
  const sessionValid = (token: string) => {
    const expires = webSessions.get(token) ?? 0;
    if (expires <= Date.now()) {
      if (token) webSessions.delete(token);
      return false;
    }
    return true;
  };
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url) return sendJson(response, 400, { error: "invalid_request" });
      const url = new URL(request.url, "http://hub.local");
      const method = request.method ?? "GET";
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
        const body = await readBody(request, 4096);
        if (!secretEqual(String(body.token ?? ""), options.adminToken)) return sendJson(response, 401, { error: "unauthorized" });
        const token = randomBytes(32).toString("base64url");
        webSessions.set(token, Date.now() + 12 * 60 * 60_000);
        return sendJson(response, 200, { token });
      }

      const token = bearer(request);
      const admin = token.length > 0 && secretEqual(token, options.adminToken);
      const browser = sessionValid(token);
      if (url.pathname === "/web/injection.js" && method === "GET") {
        const session = url.searchParams.get("session") || "";
        if (!sessionValid(session)) return sendJson(response, 401, { error: "unauthorized" });
        const locale = String(url.searchParams.get("locale") || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en";
        return sendText(response, 200, injectionScript(0, session, "install", locale, "web"), "text/javascript; charset=utf-8");
      }
      if (url.pathname === "/api/v1/devices/pair" && method === "POST") {
        const body = await readBody(request);
        return sendJson(response, 201, store.pairDevice(body.name, body.pairing_code));
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
        return sendJson(response, 200, {
          projects: board.projects,
          agents: [],
          statuses: issueStatuses,
          priorities: issuePriorities,
          appearance: { theme: "system", accent: "green" },
          locale: "zh-CN",
          user: { id: "remote", name: "Better Codex", email: "", handle: "remote", initials: "BC", color: "#16a34a" },
          agentModelCatalog: [],
          agentModels: [],
          agentReasoningEfforts: [],
          autoDispatch: false,
          schedulerModel: "",
          schedulerReasoningEffort: "",
          mockup: false,
          runtime: board.runtime,
          capabilities: { issues: "read-only", agents: "unavailable", nativeThreads: false },
        });
      }
      if (url.pathname === "/api/update" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { available: false, checking: false, installing: false });
      }
      if (url.pathname === "/api/agents" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, []);
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
      if (url.pathname === "/api/events" && method === "GET") {
        if (!browser) return sendJson(response, 401, { error: "unauthorized" });
        response.writeHead(200, { ...securityHeaders(), "connection": "keep-alive", "content-type": "text/event-stream; charset=utf-8", "x-accel-buffering": "no" });
        response.flushHeaders();
        let cursor = Number(request.headers["last-event-id"] ?? store.board().revision);
        if (!Number.isSafeInteger(cursor) || cursor < 0) cursor = 0;
        response.write(`id: ${store.board().revision}\nevent: ready\ndata: {}\n\n`);
        const poll = setInterval(() => {
          const changes = store.changesAfter(cursor);
          for (const change of changes) {
            cursor = change.seq;
            response.write(`id: ${change.seq}\nevent: change\ndata: ${JSON.stringify(change)}\n\n`);
          }
          response.write(": heartbeat\n\n");
        }, 1000);
        request.once("close", () => clearInterval(poll));
        return;
      }
      if (url.pathname.startsWith("/api/") && browser && method !== "GET") return sendJson(response, 405, { error: "remote_read_only" });

      const device = store.deviceForToken(token);
      if (!device) return sendJson(response, 401, { error: "unauthorized" });
      if (url.pathname === "/api/v1/sync/push" && method === "POST") return sendJson(response, 200, store.push(device.id, await readBody(request) as SyncPushRequest));
      return sendJson(response, 404, { error: "not_found" });
    })().catch(error => {
      const code = error instanceof Error ? error.message : "hub_error";
      if (!response.headersSent) sendJson(response, errorStatus(code), { error: code });
      else response.end();
    });
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
