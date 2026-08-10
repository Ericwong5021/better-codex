import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { HubStore } from "./hub-store.js";
import { hubWebHtml } from "./hub-web.js";
import type { CommandAcknowledgement, SyncChange } from "./sync-contract.js";

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

function sendJson(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function sendHtml(response: ServerResponse) {
  const body = hubWebHtml();
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  response.end(body);
}

function readBody(request: IncomingMessage, limit = 1_048_576) {
  return new Promise<Record<string, unknown>>((resolveBody, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += String(chunk);
      if (Buffer.byteLength(body) > limit) {
        request.destroy();
        reject(new Error("body_too_large"));
      }
    });
    request.on("end", () => {
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
  if (["unauthorized", "forbidden"].includes(code)) return code === "unauthorized" ? 401 : 403;
  if (["issue_not_found", "command_not_found", "project_not_found"].includes(code)) return 404;
  if (["version_conflict", "entity_owned_by_another_device", "issue_already_exists"].includes(code)) return 409;
  if (code === "body_too_large") return 413;
  return 400;
}

export function createHubServer(options: HubServerOptions) {
  if (options.adminToken.length < 32) throw new Error("hub_admin_token_too_short");
  const store = new HubStore(options.database);
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url) return sendJson(response, 400, { error: "invalid_request" });
      const url = new URL(request.url, "http://hub.local");
      const method = request.method ?? "GET";
      if (method === "OPTIONS") {
        response.writeHead(204, { "cache-control": "no-store", "x-content-type-options": "nosniff" });
        return response.end();
      }
      if (!trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      if (url.pathname === "/healthz" && method === "GET") return sendJson(response, 200, store.health());
      if (url.pathname === "/" && method === "GET") return sendHtml(response);

      const token = bearer(request);
      const admin = token && secretEqual(token, options.adminToken);
      if (url.pathname === "/api/v1/pair" && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        const body = await readBody(request);
        return sendJson(response, 201, store.pairDevice(body.name));
      }
      if (url.pathname === "/api/v1/board" && method === "GET") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.board());
      }
      if (url.pathname === "/api/v1/commands" && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 202, store.createCommand(await readBody(request)));
      }

      const device = store.deviceForToken(token);
      if (!device) return sendJson(response, 401, { error: "unauthorized" });
      if (url.pathname === "/api/v1/sync/push" && method === "POST") {
        const body = await readBody(request);
        return sendJson(response, 200, store.push(device.id, body.changes as SyncChange[]));
      }
      if (url.pathname === "/api/v1/sync/pull" && method === "GET") {
        return sendJson(response, 200, store.pull(device.id, Number(url.searchParams.get("cursor") ?? 0)));
      }
      const match = url.pathname.match(/^\/api\/v1\/sync\/commands\/([^/]+)\/ack$/);
      if (match && method === "POST") {
        return sendJson(response, 200, store.acknowledge(device.id, decodeURIComponent(match[1]), await readBody(request) as CommandAcknowledgement));
      }
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
