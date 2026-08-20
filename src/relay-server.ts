import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { betterCodexWebIconPng } from "./brand-assets.js";
import { coreVersion } from "./compatibility.js";
import { deviceAuthorizationPage } from "./device-authorization-page.js";
import { clearRelaySessionCookie, parseCookies, passwordHash, passwordMatches, readHubSecret, relaySessionCookie, validateWebPassword, validateWebUsername } from "./relay-auth.js";
import { decodeRelayMessage, encodeRelayMessage, relayCapabilities, relayInitialWindowBytes, relayMaxChunkBytes, relayProtocolVersion, relayWebSocketProtocol, type RelayHello, type RelayMessage } from "./relay-protocol.js";
import { RelayStore } from "./relay-store.js";
import { betterCodexWebManifest, betterCodexWebServiceWorker } from "./web-app.js";
import { betterCodexWebHostCss, betterCodexWebHostHtml, betterCodexWebHostJavaScript } from "./web-host.js";
import { upgradeWebSocket, type WebSocketConnection } from "./websocket-server.js";

export type RelayServerOptions = {
  host: string;
  port: number;
  database: string;
  adminToken: string;
  webPassword?: string;
  webUsername?: string;
  secureCookies?: boolean;
  allowedHosts?: string[];
  trustedProxy?: boolean;
  heartbeatIntervalMs?: number;
  maxConcurrentChannels?: number;
  maxRequestBytes?: number;
};

type DeviceAuthorization = {
  authorization_id: string;
  user_code: string;
  device_name: string;
  status: "pending" | "approved" | "consumed";
  created_at: string;
  expires_at: string;
  credentials: { device_id: string; device_name: string; device_token: string; created_at: string } | null;
};

type ActiveRuntime = {
  deviceId: string;
  deviceName: string;
  runtimeInstanceId: string;
  connectionEpoch: number;
  protocolVersion: string;
  coreVersion: string;
  capabilities: string[];
  connectedAt: string;
  lastHeartbeatAt: string;
  activeChannels: number;
  channels: Map<string, RelayChannel>;
  socket: WebSocketConnection;
};

type RelayChannel = {
  id: string;
  requestId: string;
  method: string;
  request: IncomingMessage;
  response: ServerResponse;
  path: string;
  headers: Record<string, string>;
  recoverable: boolean;
  requestSequence: number;
  responseSequence: number;
  responseStarted: boolean;
  completed: boolean;
  requestBytes: number;
  requestCredit: number;
  requestQueue: Buffer[];
  requestChunks: Buffer[];
  requestEnded: boolean;
  requestEndSent: boolean;
  timeout: NodeJS.Timeout;
};

export function relayServerOptions(): RelayServerOptions {
  const port = Number(process.env.BETTER_CODEX_RELAY_PORT ?? process.env.BETTER_CODEX_HUB_PORT ?? 4318);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("invalid_relay_port");
  const adminToken = readHubSecret("BETTER_CODEX_RELAY_BOOTSTRAP_SECRET_FILE", "BETTER_CODEX_RELAY_BOOTSTRAP_SECRET") || readHubSecret("BETTER_CODEX_HUB_BOOTSTRAP_SECRET_FILE", "BETTER_CODEX_HUB_BOOTSTRAP_SECRET") || readHubSecret("BETTER_CODEX_HUB_ADMIN_TOKEN_FILE", "BETTER_CODEX_HUB_ADMIN_TOKEN");
  const webPassword = validateWebPassword(readHubSecret("BETTER_CODEX_RELAY_WEB_PASSWORD_FILE", "BETTER_CODEX_RELAY_WEB_PASSWORD") || readHubSecret("BETTER_CODEX_HUB_WEB_PASSWORD_FILE", "BETTER_CODEX_HUB_WEB_PASSWORD"));
  const webUsername = validateWebUsername(process.env.BETTER_CODEX_RELAY_WEB_USERNAME || process.env.BETTER_CODEX_HUB_WEB_USERNAME || "admin");
  if (adminToken.length < 32) throw new Error("relay_bootstrap_secret_too_short");
  if (adminToken === webPassword) throw new Error("relay_secrets_must_be_distinct");
  return {
    host: process.env.BETTER_CODEX_RELAY_HOST || process.env.BETTER_CODEX_HUB_HOST || "127.0.0.1",
    port,
    database: resolve(process.env.BETTER_CODEX_RELAY_DB || "./data/better-codex-relay.db"),
    adminToken,
    webPassword,
    webUsername,
    secureCookies: process.env.BETTER_CODEX_RELAY_INSECURE_COOKIES !== "1" && process.env.BETTER_CODEX_HUB_INSECURE_COOKIES !== "1",
    allowedHosts: String(process.env.BETTER_CODEX_RELAY_ALLOWED_HOSTS || process.env.BETTER_CODEX_HUB_ALLOWED_HOSTS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean),
    trustedProxy: process.env.BETTER_CODEX_RELAY_TRUST_PROXY === "1" || process.env.BETTER_CODEX_HUB_TRUST_PROXY === "1",
  };
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

function sendText(response: ServerResponse, status: number, body: string | Buffer, contentType: string, headers: Record<string, string> = {}) {
  response.writeHead(status, { ...securityHeaders(), "content-type": contentType, "content-length": Buffer.byteLength(body), ...headers });
  response.end(body);
}

function readBody(request: IncomingMessage, limit = 1024 * 1024) {
  return new Promise<Record<string, unknown>>((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    request.on("data", chunk => {
      if (failed) return;
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += value.length;
      if (size > limit) {
        failed = true;
        chunks.length = 0;
        request.resume();
        reject(new Error("body_too_large"));
        return;
      }
      chunks.push(value);
    });
    request.on("end", () => {
      if (failed) return;
      try {
        const source = Buffer.concat(chunks, size).toString("utf8");
        const value = source ? JSON.parse(source) : {};
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
  try { return new URL(origin).host === request.headers.host; } catch { return false; }
}

function trustedHost(request: IncomingMessage, allowedHosts: string[]) {
  const raw = String(request.headers.host || "").toLowerCase();
  if (!raw || raw.includes("/") || raw.includes("\\")) return false;
  let hostname = "";
  try { hostname = new URL(`http://${raw}`).hostname.toLowerCase(); } catch { return false; }
  if (["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname)) return true;
  return allowedHosts.includes(raw) || allowedHosts.includes(hostname);
}

function clientAddress(request: IncomingMessage, trustedProxy: boolean) {
  if (!trustedProxy) return String(request.socket.remoteAddress || "unknown");
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded !== "string" || !isIP(forwarded.trim())) return null;
  return forwarded.trim();
}

function bearer(request: IncomingMessage) {
  const value = String(request.headers.authorization || "");
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

function secretEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function errorStatus(code: string) {
  if (code === "unauthorized") return 401;
  if (["forbidden", "csrf_invalid", "untrusted_host"].includes(code)) return 403;
  if (["device_not_found", "device_authorization_not_found"].includes(code)) return 404;
  if (["relay_protocol_mismatch", "runtime_already_paired"].includes(code)) return 409;
  if (code === "body_too_large") return 413;
  if (code === "login_rate_limited") return 429;
  return 400;
}

function publicRuntime(runtime: ActiveRuntime | null) {
  if (!runtime) return { online: false };
  return {
    online: true,
    device_name: runtime.deviceName,
    core_version: runtime.coreVersion,
    connected_at: runtime.connectedAt,
    last_heartbeat_at: runtime.lastHeartbeatAt,
    active_channels: runtime.activeChannels,
  };
}

function connectionMatches(runtime: ActiveRuntime | null, message: Exclude<RelayMessage, RelayHello>) {
  return Boolean(runtime && message.device_id === runtime.deviceId && message.runtime_instance_id === runtime.runtimeInstanceId && message.connection_epoch === runtime.connectionEpoch);
}

function forwardedRequestHeaders(request: IncomingMessage, requestId: string) {
  const allowed = new Set(["accept", "accept-language", "content-type", "if-none-match", "last-event-id", "range"]);
  const headers: Record<string, string> = { "x-better-codex-request-id": requestId };
  for (const [name, value] of Object.entries(request.headers)) {
    if (!allowed.has(name.toLowerCase()) || value === undefined) continue;
    headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

function forwardedResponseHeaders(headers: Record<string, string>) {
  const blocked = new Set(["connection", "keep-alive", "proxy-authenticate", "set-cookie", "transfer-encoding", "upgrade"]);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !blocked.has(name.toLowerCase())));
}

function relayErrorStatus(error: string) {
  if (error === "request_cancelled" || error === "relay_request_timeout") return 504;
  if (error === "runtime_unavailable") return 503;
  if (error === "relay_channel_limit") return 429;
  if (error === "body_too_large") return 413;
  return 502;
}

export function createRelayServer(options: RelayServerOptions) {
  if (options.adminToken.length < 32) throw new Error("relay_bootstrap_secret_too_short");
  const store = new RelayStore(options.database);
  store.ensureWebCredentials(validateWebUsername(options.webUsername || "admin"), passwordHash(options.webPassword || options.adminToken));
  const secureCookies = options.secureCookies !== false;
  const allowedHosts = options.allowedHosts || [];
  const heartbeatIntervalMs = options.heartbeatIntervalMs || 20_000;
  const maxConcurrentChannels = options.maxConcurrentChannels || 32;
  const maxRequestBytes = options.maxRequestBytes || 50 * 1024 * 1024;
  const authorizations = new Map<string, DeviceAuthorization>();
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  let runtime: ActiveRuntime | null = null;
  const retryableChannels = new Map<string, RelayChannel>();
  const finishChannel = (active: ActiveRuntime, channel: RelayChannel) => {
    if (channel.completed) return;
    channel.completed = true;
    clearTimeout(channel.timeout);
    active.channels.delete(channel.id);
    active.activeChannels = active.channels.size;
    retryableChannels.delete(channel.id);
  };
  const failChannel = (active: ActiveRuntime, channel: RelayChannel, error: string, detail = error) => {
    if (channel.completed) return;
    if (!channel.response.headersSent) sendJson(channel.response, relayErrorStatus(error), {
      error,
      detail,
      request_id: channel.requestId,
      channel_id: channel.id,
      method: channel.method,
      request_bytes: channel.requestBytes,
      request_ended: channel.requestEnded,
      response_started: channel.responseStarted,
      connection_epoch: active.connectionEpoch,
      runtime_instance_id: active.runtimeInstanceId,
    });
    else channel.response.end();
    finishChannel(active, channel);
  };
  const failRuntimeChannels = (active: ActiveRuntime, error: string, detail = error) => {
    for (const channel of [...active.channels.values()]) failChannel(active, channel, error, detail);
  };
  const sendRequestOpen = (active: ActiveRuntime, channel: RelayChannel) => {
    active.socket.send(encodeRelayMessage({ type: "request_open", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, request_id: channel.requestId, method: channel.method, path: channel.path, headers: channel.headers }));
  };
  const flushRequest = (active: ActiveRuntime, channel: RelayChannel) => {
    if (channel.completed) return;
    while (channel.requestQueue.length && channel.requestCredit >= channel.requestQueue[0].length) {
      const chunk = channel.requestQueue.shift()!;
      active.socket.send(encodeRelayMessage({ type: "request_chunk", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, sequence: channel.requestSequence, data: chunk.toString("base64") }));
      channel.requestSequence += 1;
      channel.requestCredit -= chunk.length;
    }
    if (channel.requestQueue.length) {
      channel.request.pause();
      return;
    }
    if (channel.requestEnded && !channel.requestEndSent) {
      channel.requestEndSent = true;
      active.socket.send(encodeRelayMessage({ type: "request_end", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id }));
      return;
    }
    channel.request.resume();
  };
  const replayChannel = (active: ActiveRuntime, channel: RelayChannel) => {
    channel.requestSequence = 0;
    channel.responseSequence = 0;
    channel.responseStarted = false;
    channel.requestCredit = relayInitialWindowBytes;
    channel.requestQueue = [...channel.requestChunks];
    channel.requestEndSent = false;
    active.channels.set(channel.id, channel);
    active.activeChannels = active.channels.size;
    sendRequestOpen(active, channel);
    flushRequest(active, channel);
  };
  const forwardRequest = (request: IncomingMessage, response: ServerResponse, url: URL, method: string) => {
    const active = runtime;
    if (!active) return sendJson(response, 503, { error: "runtime_offline" });
    if (active.channels.size >= maxConcurrentChannels) return sendJson(response, 429, { error: "relay_channel_limit" });
    if (["/api/shutdown"].includes(url.pathname) || url.pathname.startsWith("/api/session-relay/") || url.pathname.startsWith("/api/mockup/") || url.pathname.startsWith("/api/sync/") || url.pathname.startsWith("/api/relay/")) return sendJson(response, 404, { error: "not_found" });
    const channelId = randomUUID();
    const suppliedRequestId = String(request.headers["x-better-codex-request-id"] || "");
    const requestId = /^[A-Za-z0-9_-]{8,200}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
    const timeout = setTimeout(() => {
      const channel = runtime?.channels.get(channelId) || retryableChannels.get(channelId);
      if (!channel || channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "relay_request_timeout" })); } catch {}
        failChannel(current, channel, "relay_request_timeout");
      } else {
        channel.completed = true;
        retryableChannels.delete(channelId);
        sendJson(channel.response, relayErrorStatus("relay_request_timeout"), { error: "relay_request_timeout", request_id: channel.requestId, channel_id: channel.id, method: channel.method, request_bytes: channel.requestBytes, request_ended: channel.requestEnded, response_started: false });
      }
    }, 120_000);
    timeout.unref();
    const recoverable = !["GET", "HEAD", "OPTIONS"].includes(method) && /^[A-Za-z0-9_-]{8,200}$/.test(suppliedRequestId);
    const channel: RelayChannel = { id: channelId, requestId, method, request, response, path: `${url.pathname}${url.search}`, headers: forwardedRequestHeaders(request, requestId), recoverable, requestSequence: 0, responseSequence: 0, responseStarted: false, completed: false, requestBytes: 0, requestCredit: relayInitialWindowBytes, requestQueue: [], requestChunks: [], requestEnded: false, requestEndSent: false, timeout };
    active.channels.set(channelId, channel);
    active.activeChannels = active.channels.size;
    sendRequestOpen(active, channel);
    request.on("data", chunkValue => {
      if (channel.completed) return;
      request.pause();
      const bytes = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue);
      channel.requestBytes += bytes.length;
      if (channel.requestBytes > maxRequestBytes) {
        try { active.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channelId, reason: "body_too_large" })); } catch {}
        request.resume();
        failChannel(active, channel, "body_too_large");
        return;
      }
      for (let offset = 0; offset < bytes.length; offset += relayMaxChunkBytes) {
        const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + relayMaxChunkBytes));
        channel.requestQueue.push(chunk);
        if (channel.recoverable) channel.requestChunks.push(chunk);
      }
      flushRequest(active, channel);
    });
    request.once("end", () => {
      channel.requestEnded = true;
      flushRequest(active, channel);
    });
    request.once("error", error => {
      if (channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "browser_request_error" })); } catch {}
        failChannel(current, channel, "relay_stream_interrupted", "browser_request_error:" + String((error as NodeJS.ErrnoException).code || error.message || "unknown"));
      } else {
        channel.completed = true;
        clearTimeout(channel.timeout);
        retryableChannels.delete(channelId);
      }
    });
    response.once("close", () => {
      if (channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "browser_disconnected" })); } catch {}
        finishChannel(current, channel);
      } else {
        channel.completed = true;
        clearTimeout(channel.timeout);
        retryableChannels.delete(channelId);
      }
    });
  };
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url) return sendJson(response, 400, { error: "invalid_request" });
      const url = new URL(request.url, "http://relay.local");
      const method = request.method || "GET";
      if (!trustedHost(request, allowedHosts)) return sendJson(response, 403, { error: "untrusted_host" });
      if (method === "OPTIONS") {
        response.writeHead(204, securityHeaders());
        return response.end();
      }
      if (!trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      if (url.pathname === "/healthz" && method === "GET") return sendJson(response, 200, { ok: true, name: "Better Codex Relay", version: coreVersion, protocol_version: relayProtocolVersion, runtime: publicRuntime(runtime) });
      if ((["/", "/web", "/web/projects"].includes(url.pathname) || url.pathname.startsWith("/web/projects/")) && method === "GET") return sendText(response, 200, betterCodexWebHostHtml("relay"), "text/html; charset=utf-8", { "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
      if (url.pathname === "/web/host.css" && method === "GET") return sendText(response, 200, betterCodexWebHostCss(), "text/css; charset=utf-8");
      if (url.pathname === "/web/host.js" && method === "GET") return sendText(response, 200, betterCodexWebHostJavaScript("relay"), "text/javascript; charset=utf-8");
      if (url.pathname === "/web/manifest.webmanifest" && method === "GET") return sendText(response, 200, betterCodexWebManifest(), "application/manifest+json; charset=utf-8");
      if (url.pathname === "/web/service-worker.js" && method === "GET") return sendText(response, 200, betterCodexWebServiceWorker(), "text/javascript; charset=utf-8", { "service-worker-allowed": "/" });
      if (url.pathname === "/better-codex-icon-192.png" && method === "GET") return sendText(response, 200, betterCodexWebIconPng(192), "image/png", { "cache-control": "public, max-age=86400" });
      if (url.pathname === "/better-codex-icon-512.png" && method === "GET") return sendText(response, 200, betterCodexWebIconPng(512), "image/png", { "cache-control": "public, max-age=86400" });
      const deviceAuthorizationPageMatch = url.pathname.match(/^\/web\/device-authorizations\/([^/]+)$/);
      if (deviceAuthorizationPageMatch && method === "GET") {
        const authorization = authorizations.get(decodeURIComponent(deviceAuthorizationPageMatch[1]));
        if (!authorization || authorization.status !== "pending" || Date.parse(authorization.expires_at) <= Date.now()) return sendText(response, 410, "authorization_expired", "text/plain; charset=utf-8");
        return sendText(response, 200, deviceAuthorizationPage(authorization.authorization_id, url.searchParams.get("code") || "", "/relay/session", "Relay"), "text/html; charset=utf-8", { "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'" });
      }
      if (url.pathname === "/relay/session" && method === "POST") {
        if (!trustedOrigin(request, true)) return sendJson(response, 403, { error: "forbidden" });
        const client = clientAddress(request, options.trustedProxy === true);
        if (!client) return sendJson(response, 400, { error: "invalid_proxy_client" });
        const attempt = loginAttempts.get(client);
        if (attempt && attempt.resetAt > Date.now() && attempt.count >= 5) return sendJson(response, 429, { error: "login_rate_limited" }, { "retry-after": String(Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000))) });
        const body = await readBody(request, 4096);
        if (String(body.username || "") !== store.webUsername() || !passwordMatches(String(body.password || ""), store.webPasswordHash())) {
          const current = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 15 * 60_000 };
          loginAttempts.set(client, { ...current, count: current.count + 1 });
          store.audit(client, "web_login_failed");
          return sendJson(response, 401, { error: "unauthorized" });
        }
        loginAttempts.delete(client);
        const session = store.createWebSession();
        store.audit(client, "web_login_succeeded");
        return sendJson(response, 200, { csrf_token: session.csrf_token, expires_at: session.expires_at }, { "set-cookie": relaySessionCookie(session.token, secureCookies) });
      }

      const sessionToken = parseCookies(request.headers.cookie).get("better_codex_relay_session") || "";
      const session = store.webSession(sessionToken);
      if (session) response.setHeader("set-cookie", relaySessionCookie(sessionToken, secureCookies, Math.max(1, Math.ceil((Date.parse(session.expires_at) - Date.now()) / 1000))));
      const csrfValid = Boolean(session && typeof request.headers["x-csrf-token"] === "string" && secretEqual(request.headers["x-csrf-token"], session.csrf_token));
      const admin = secretEqual(bearer(request), options.adminToken);
      if (url.pathname === "/relay/session" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { csrf_token: session.csrf_token, expires_at: session.expires_at });
      }
      if (url.pathname === "/relay/logout" && method === "DELETE") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" }, { "set-cookie": clearRelaySessionCookie(secureCookies) });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        store.revokeWebSession(sessionToken);
        return sendJson(response, 200, { ok: true }, { "set-cookie": clearRelaySessionCookie(secureCookies) });
      }
      if (url.pathname === "/relay/status" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { ok: true, name: "Better Codex Relay", version: coreVersion, protocol_version: relayProtocolVersion, runtime: publicRuntime(runtime) });
      }
      if (url.pathname === "/relay/device" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { devices: store.devices(), active_device_id: runtime?.deviceId || null });
      }
      if (url.pathname === "/api/v1/device-authorizations" && method === "POST") {
        const body = await readBody(request, 4096);
        const authorizationId = randomBytes(24).toString("base64url");
        const userCode = randomBytes(6).toString("base64url").toUpperCase();
        const createdAt = new Date().toISOString();
        const authorization: DeviceAuthorization = { authorization_id: authorizationId, user_code: userCode, device_name: typeof body.name === "string" ? body.name.trim().slice(0, 120) || "Better Codex Runtime" : "Better Codex Runtime", status: "pending", created_at: createdAt, expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), credentials: null };
        authorizations.set(authorizationId, authorization);
        const protocol = options.secureCookies === false ? "http" : "https";
        return sendJson(response, 201, { authorization_id: authorizationId, user_code: userCode, status: authorization.status, expires_at: authorization.expires_at, approval_url: `${protocol}://${request.headers.host}/web/device-authorizations/${encodeURIComponent(authorizationId)}?code=${encodeURIComponent(userCode)}` });
      }
      const authorizationMatch = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)$/);
      if (authorizationMatch && method === "GET") {
        const authorization = authorizations.get(decodeURIComponent(authorizationMatch[1]));
        if (!authorization) return sendJson(response, 404, { error: "device_authorization_not_found" });
        if (Date.parse(authorization.expires_at) <= Date.now()) return sendJson(response, 410, { error: "device_authorization_expired" });
        return sendJson(response, 200, { authorization_id: authorization.authorization_id, user_code: authorization.user_code, status: authorization.status, expires_at: authorization.expires_at });
      }
      const authorizationTokenMatch = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)\/token$/);
      if (authorizationTokenMatch && method === "POST") {
        const authorization = authorizations.get(decodeURIComponent(authorizationTokenMatch[1]));
        const body = await readBody(request, 4096);
        if (!authorization || String(body.user_code || "") !== authorization.user_code) return sendJson(response, 404, { error: "device_authorization_not_found" });
        if (Date.parse(authorization.expires_at) <= Date.now()) return sendJson(response, 410, { error: "device_authorization_expired" });
        if (authorization.status !== "approved" || !authorization.credentials) return sendJson(response, 202, { status: authorization.status });
        authorization.status = "consumed";
        const credentials = authorization.credentials;
        authorization.credentials = null;
        return sendJson(response, 200, { status: "approved", ...credentials });
      }
      const authorizationApprovalMatch = url.pathname.match(/^\/api\/v1\/device-authorizations\/([^/]+)\/approve$/);
      if (authorizationApprovalMatch && method === "POST") {
        if (!session || !trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const authorization = authorizations.get(decodeURIComponent(authorizationApprovalMatch[1]));
        const body = await readBody(request, 4096);
        if (!authorization || String(body.user_code || "") !== authorization.user_code) return sendJson(response, 404, { error: "device_authorization_not_found" });
        if (Date.parse(authorization.expires_at) <= Date.now()) return sendJson(response, 410, { error: "device_authorization_expired" });
        const pairing = store.createPairingCode();
        authorization.credentials = store.pairDevice(authorization.device_name, pairing.pairing_code, true);
        authorization.status = "approved";
        return sendJson(response, 200, { status: authorization.status, device_id: authorization.credentials.device_id });
      }
      if (url.pathname === "/api/v1/devices/pair" && method === "POST") {
        const body = await readBody(request, 4096);
        return sendJson(response, 201, store.pairDevice(body.name, body.pairing_code, body.replace_existing !== false));
      }
      if (url.pathname === "/api/v1/admin/pairing-codes" && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 201, store.createPairingCode());
      }
      if (url.pathname === "/api/v1/admin/devices" && method === "GET") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.devices());
      }
      const revokeMatch = url.pathname.match(/^\/api\/v1\/admin\/devices\/([^/]+)$/);
      if (revokeMatch && method === "DELETE") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        const id = decodeURIComponent(revokeMatch[1]);
        if (runtime?.deviceId === id) runtime.socket.close(4003);
        return sendJson(response, 200, store.revokeDevice(id));
      }
      const rotateMatch = url.pathname.match(/^\/api\/v1\/admin\/devices\/([^/]+)\/rotate-token$/);
      if (rotateMatch && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        const id = decodeURIComponent(rotateMatch[1]);
        if (runtime?.deviceId === id) runtime.socket.close(4003);
        return sendJson(response, 200, store.rotateDeviceToken(id));
      }
      if (url.pathname === "/api/v1/admin/audit" && method === "GET") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, store.auditEvents(Number(url.searchParams.get("limit") || 100)));
      }
      if (url.pathname === "/web/injection.js" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return forwardRequest(request, response, url, method);
      }
      if (url.pathname === "/health" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return forwardRequest(request, response, url, method);
      }
      if (url.pathname.startsWith("/api/")) {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        if (!["GET", "HEAD"].includes(method) && (!trustedOrigin(request, true) || !csrfValid)) return sendJson(response, 403, { error: "csrf_invalid" });
        return forwardRequest(request, response, url, method);
      }
      return sendJson(response, 404, { error: "not_found" });
    })().catch(error => {
      const code = error instanceof Error ? error.message : "relay_error";
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
      const url = new URL(request.url || "/", "http://relay.local");
      if (url.pathname !== "/api/v1/runtime/connect") {
        socket.destroy();
        return;
      }
      const device = store.deviceForToken(bearer(request));
      if (!device) {
        socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        return;
      }
      let connection: WebSocketConnection | null = null;
      let active: ActiveRuntime | null = null;
      let messageQueue = Promise.resolve();
      let socketError = "";
      connection = upgradeWebSocket(request, socket, [relayWebSocketProtocol], {
        message: source => {
          messageQueue = messageQueue.then(async () => {
            try {
            const message = decodeRelayMessage(source);
            if (message.type === "hello") {
              if (active || message.device_id !== device.id) throw new Error("relay_hello_invalid");
              const epoch = store.nextConnectionEpoch(device.id);
              const previous = runtime;
              const timestamp = new Date().toISOString();
              active = { deviceId: device.id, deviceName: device.name, runtimeInstanceId: message.runtime_instance_id, connectionEpoch: epoch, protocolVersion: message.protocol_version, coreVersion: message.core_version, capabilities: message.capabilities, connectedAt: timestamp, lastHeartbeatAt: timestamp, activeChannels: 0, channels: new Map(), socket: connection! };
              runtime = active;
              if (previous) failRuntimeChannels(previous, "relay_connection_replaced");
              previous?.socket.close(4001);
              connection?.send(encodeRelayMessage({ type: "hello_ack", protocol_version: relayProtocolVersion, device_id: device.id, runtime_instance_id: message.runtime_instance_id, connection_epoch: epoch, heartbeat_interval_ms: heartbeatIntervalMs, max_concurrent_channels: maxConcurrentChannels, max_chunk_bytes: relayMaxChunkBytes }));
              for (const channel of [...retryableChannels.values()]) replayChannel(active, channel);
              store.audit(device.id, "runtime_connected", relayProtocolVersion);
              return;
            }
            if (!active || !connectionMatches(active, message)) throw new Error("relay_connection_replaced");
            if (message.type === "heartbeat") {
              active.lastHeartbeatAt = new Date().toISOString();
              connection?.send(encodeRelayMessage({ type: "heartbeat_ack", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, timestamp: new Date().toISOString() }));
              return;
            }
            if (message.type === "response_open") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) return;
              if (channel.responseStarted) throw new Error("relay_channel_invalid");
              channel.responseStarted = true;
              clearTimeout(channel.timeout);
              const headers = forwardedResponseHeaders(message.headers);
              if (headers["content-type"]?.toLowerCase().includes("text/event-stream")) {
                headers["cache-control"] = "no-cache";
                headers["x-accel-buffering"] = "no";
              }
              channel.response.writeHead(message.status, { ...securityHeaders(), ...headers });
              return;
            }
            if (message.type === "response_chunk") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) return;
              if (!channel.responseStarted || message.sequence !== channel.responseSequence) throw new Error("relay_chunk_sequence_invalid");
              channel.responseSequence += 1;
              const bytes = Buffer.from(message.data, "base64");
              if (!channel.response.write(bytes)) await once(channel.response, "drain");
              if (!channel.completed) connection?.send(encodeRelayMessage({ type: "window_update", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, direction: "response", bytes: bytes.length }));
              return;
            }
            if (message.type === "response_end") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) return;
              if (!channel.responseStarted) throw new Error("relay_channel_invalid");
              channel.response.end();
              finishChannel(active, channel);
              return;
            }
            if (message.type === "response_error") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) return;
              failChannel(active, channel, message.error);
              return;
            }
            if (message.type === "window_update") {
              const channel = active.channels.get(message.channel_id);
              if (message.direction !== "request") throw new Error("relay_channel_invalid");
              if (!channel) return;
              channel.requestCredit += message.bytes;
              flushRequest(active, channel);
              return;
            }
            throw new Error("unsupported_relay_message");
            } catch (error) {
              store.audit(device.id, "relay_protocol_error", error instanceof Error ? error.message : "relay_protocol_error");
              connection?.close(error instanceof Error && error.message === "relay_protocol_mismatch" ? 4002 : 1008);
            }
          });
        },
        close: () => {
          if (runtime?.socket === connection) {
            const interrupted = runtime;
            for (const channel of [...interrupted.channels.values()]) {
              if (channel.recoverable && channel.requestEnded && !channel.responseStarted) {
                interrupted.channels.delete(channel.id);
                retryableChannels.set(channel.id, channel);
              } else {
                failChannel(interrupted, channel, "relay_stream_interrupted", socketError ? "runtime_socket_error:" + socketError : "runtime_socket_closed");
              }
            }
            interrupted.activeChannels = interrupted.channels.size;
            runtime = null;
          }
          if (active) store.audit(device.id, "runtime_disconnected");
          active = null;
        },
        error: error => {
          socketError = error.message;
          store.audit(device.id, "runtime_socket_error", error.message);
        },
      });
      connection?.acceptHead(head);
    } catch {
      socket.destroy();
    }
  });

  const heartbeatSweep = setInterval(() => {
    if (!runtime) return;
    if (Date.now() - Date.parse(runtime.lastHeartbeatAt) > heartbeatIntervalMs * 3) {
      store.audit(runtime.deviceId, "runtime_heartbeat_timeout");
      runtime.socket.close(4004);
    }
    for (const [id, authorization] of authorizations) if (Date.parse(authorization.expires_at) <= Date.now() || authorization.status === "consumed") authorizations.delete(id);
  }, Math.min(5000, heartbeatIntervalMs));
  heartbeatSweep.unref();

  const close = () => new Promise<void>((resolveClose, reject) => {
    clearInterval(heartbeatSweep);
    for (const channel of retryableChannels.values()) {
      channel.completed = true;
      clearTimeout(channel.timeout);
      channel.response.end();
    }
    retryableChannels.clear();
    runtime?.socket.close(1001);
    runtime = null;
    server.close(error => {
      store.close();
      if (error) reject(error);
      else resolveClose();
    });
    server.closeAllConnections();
  });
  return { server, store, close, runtime: () => runtime };
}

export function startRelayServer(options = relayServerOptions()) {
  const relay = createRelayServer(options);
  relay.server.listen(options.port, options.host, () => {
    const address = relay.server.address();
    const port = typeof address === "object" && address ? address.port : options.port;
    console.log(`Better Codex Relay listening on http://${options.host}:${port}`);
  });
  const stop = () => void relay.close().then(() => process.exit(0), () => process.exit(1));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return relay.server;
}
