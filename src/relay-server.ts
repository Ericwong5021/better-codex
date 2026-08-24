import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isIP } from "node:net";
import { resolve } from "node:path";
import { betterCodexWebIconPng } from "./brand-assets.js";
import { createWebCommand, webCommandTarget } from "./command-contract.js";
import { coreVersion } from "./compatibility.js";
import { deviceAuthorizationPage } from "./device-authorization-page.js";
import { clearRelaySessionCookie, parseCookies, passwordHash, passwordMatches, readHubSecret, relaySessionCookie, validateWebPassword, validateWebUsername } from "./relay-auth.js";
import { decodeRelayMessage, encodeRelayMessage, relayCapabilities, relayInitialWindowBytes, relayMaxChunkBytes, relayProtocolVersion, relayRuntimeReconnectCloseCode, relayRuntimeStoppedCloseCode, relayWebSocketProtocol, type RelayHello, type RelayMessage } from "./relay-protocol.js";
import { RelayStore, type RelayCommand } from "./relay-store.js";
import { avatarInitials } from "./user-profile.js";
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
  maxBufferedResponseBytes?: number;
  reconnectGraceMs?: number;
  maxReplayAttempts?: number;
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
  commandChannels: Map<string, RelayCommandChannel>;
  socket: WebSocketConnection;
};

type ReconnectingRuntime = {
  deviceId: string;
  deviceName: string;
  runtimeInstanceId: string;
  connectionEpoch: number;
  protocolVersion: string;
  coreVersion: string;
  connectedAt: string;
  lastHeartbeatAt: string;
  disconnectedAt: string;
  reconnectDeadlineAt: string;
};

type RelayCommandChannel = {
  id: string;
  commandId: string;
  deliveryId: string;
  responseStatus: number | null;
  responseHeaders: Record<string, string>;
  responseSequence: number;
  responseChunks: Buffer[];
  responseBytes: number;
  timeout: NodeJS.Timeout;
};

type RelayChannel = {
  id: string;
  sessionId: string;
  deviceId: string;
  requestId: string;
  traceId: string;
  method: string;
  request: IncomingMessage;
  response: ServerResponse;
  path: string;
  headers: Record<string, string>;
  recoverable: boolean;
  requestSequence: number;
  responseSequence: number;
  upstreamResponseStarted: boolean;
  downstreamResponseStarted: boolean;
  bufferResponse: boolean;
  responseStatus: number | null;
  responseHeaders: Record<string, string>;
  responseChunks: Buffer[];
  responseBytes: number;
  completed: boolean;
  requestBytes: number;
  requestCredit: number;
  requestQueue: Buffer[];
  requestChunks: Buffer[];
  requestEnded: boolean;
  requestEndSent: boolean;
  replayAttempts: number;
  retryTimeout: NodeJS.Timeout | null;
  connectionEpoch: number;
  runtimeInstanceId: string;
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

function readRawBody(request: IncomingMessage, limit: number) {
  return new Promise<Buffer>((resolveBody, reject) => {
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
      if (!failed) resolveBody(Buffer.concat(chunks, size));
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
  if (["device_not_found", "device_authorization_not_found", "web_session_not_found", "web_user_not_found"].includes(code)) return 404;
  if (["relay_protocol_mismatch", "runtime_already_paired", "web_user_exists"].includes(code)) return 409;
  if (code === "body_too_large") return 413;
  if (code === "login_rate_limited") return 429;
  return 400;
}

function userForWeb(user: NonNullable<ReturnType<RelayStore["webUser"]>>) {
  return {
    id: user.id,
    name: user.nickname,
    email: "",
    handle: user.username,
    initials: avatarInitials(user.nickname),
    color: user.avatar_color,
    avatar: user.avatar,
    avatar_generated: user.avatar_generated,
    disabled: user.disabled,
  };
}

function publicRuntime(runtime: ActiveRuntime | null, reconnecting: ReconnectingRuntime | null) {
  if (!runtime) {
    if (!reconnecting) return { online: false, state: "offline" };
    return {
      online: false,
      state: "reconnecting",
      device_name: reconnecting.deviceName,
      core_version: reconnecting.coreVersion,
      connected_at: reconnecting.connectedAt,
      last_heartbeat_at: reconnecting.lastHeartbeatAt,
      disconnected_at: reconnecting.disconnectedAt,
      reconnect_deadline_at: reconnecting.reconnectDeadlineAt,
      active_channels: 0,
    };
  }
  return {
    online: true,
    state: "online",
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
  const allowed = new Set(["accept", "accept-language", "content-type", "if-none-match", "last-event-id", "range", "x-better-codex-trace-id"]);
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

function isJsonResponse(headers: Record<string, string>) {
  const contentType = String(headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  return contentType === "application/json" || contentType.endsWith("+json");
}

function relayErrorStatus(error: string) {
  if (error === "unauthorized") return 401;
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
  const maxBufferedResponseBytes = options.maxBufferedResponseBytes || 16 * 1024 * 1024;
  const reconnectGraceMs = options.reconnectGraceMs || 30_000;
  const maxReplayAttempts = options.maxReplayAttempts || 3;
  const authorizations = new Map<string, DeviceAuthorization>();
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  let runtime: ActiveRuntime | null = null;
  let reconnectingRuntime: ReconnectingRuntime | null = null;
  let reconnectGraceTimeout: NodeJS.Timeout | null = null;
  const retryableChannels = new Map<string, RelayChannel>();
  const commandWaiters = new Map<string, Set<{ response: ServerResponse; timeout: NodeJS.Timeout }>>();
  const syncActiveChannels = (active: ActiveRuntime) => {
    active.activeChannels = active.channels.size + active.commandChannels.size;
  };
  const clearReconnectGrace = () => {
    if (reconnectGraceTimeout) clearTimeout(reconnectGraceTimeout);
    reconnectGraceTimeout = null;
    reconnectingRuntime = null;
  };
  const startReconnectGrace = (interrupted: ActiveRuntime, detail: string, code: number) => {
    clearReconnectGrace();
    const disconnectedAt = new Date();
    const reconnecting = {
      deviceId: interrupted.deviceId,
      deviceName: interrupted.deviceName,
      runtimeInstanceId: interrupted.runtimeInstanceId,
      connectionEpoch: interrupted.connectionEpoch,
      protocolVersion: interrupted.protocolVersion,
      coreVersion: interrupted.coreVersion,
      connectedAt: interrupted.connectedAt,
      lastHeartbeatAt: interrupted.lastHeartbeatAt,
      disconnectedAt: disconnectedAt.toISOString(),
      reconnectDeadlineAt: new Date(disconnectedAt.getTime() + reconnectGraceMs).toISOString(),
    } satisfies ReconnectingRuntime;
    reconnectingRuntime = reconnecting;
    store.audit(interrupted.deviceId, "runtime_reconnecting", `${detail}:code=${code}`);
    reconnectGraceTimeout = setTimeout(() => {
      if (reconnectingRuntime !== reconnecting || runtime) return;
      reconnectingRuntime = null;
      reconnectGraceTimeout = null;
      store.audit(interrupted.deviceId, "runtime_reconnect_timeout", detail);
    }, reconnectGraceMs);
    reconnectGraceTimeout.unref();
  };
  const finishChannel = (active: ActiveRuntime | null, channel: RelayChannel) => {
    if (channel.completed) return;
    channel.completed = true;
    clearTimeout(channel.timeout);
    if (channel.retryTimeout) clearTimeout(channel.retryTimeout);
    channel.retryTimeout = null;
    if (active?.channels.get(channel.id) === channel) {
      active.channels.delete(channel.id);
      syncActiveChannels(active);
    }
    if (runtime?.channels.get(channel.id) === channel) {
      runtime.channels.delete(channel.id);
      syncActiveChannels(runtime);
    }
    retryableChannels.delete(channel.id);
  };
  const startDownstreamResponse = async (channel: RelayChannel) => {
    if (channel.downstreamResponseStarted) return;
    if (channel.responseStatus === null) throw new Error("relay_channel_invalid");
    channel.downstreamResponseStarted = true;
    clearTimeout(channel.timeout);
    channel.response.writeHead(channel.responseStatus, { ...securityHeaders(), ...channel.responseHeaders });
    for (const chunk of channel.responseChunks) if (!channel.response.write(chunk)) await once(channel.response, "drain");
    channel.responseChunks = [];
    channel.responseBytes = 0;
  };
  const failChannel = (active: ActiveRuntime | null, channel: RelayChannel, error: string, detail = error) => {
    if (channel.completed) return;
    if (!channel.response.headersSent) sendJson(channel.response, relayErrorStatus(error), {
      error,
      detail,
      trace_id: channel.traceId,
      request_id: channel.requestId,
      channel_id: channel.id,
      method: channel.method,
      request_bytes: channel.requestBytes,
      request_ended: channel.requestEnded,
      response_started: channel.downstreamResponseStarted,
      upstream_response_started: channel.upstreamResponseStarted,
      downstream_response_started: channel.downstreamResponseStarted,
      connection_epoch: channel.connectionEpoch,
      runtime_instance_id: channel.runtimeInstanceId,
      replay_attempts: channel.replayAttempts,
    });
    else channel.response.end();
    finishChannel(active, channel);
  };
  const revokeSessionChannels = (sessionId: string) => {
    const active = runtime;
    if (active) {
      for (const channel of active.channels.values()) {
        if (channel.sessionId !== sessionId) continue;
        try { active.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, reason: "web_session_revoked" })); } catch {}
        failChannel(active, channel, "unauthorized", "web_session_revoked");
      }
    }
    for (const channel of retryableChannels.values()) {
      if (channel.sessionId === sessionId) failChannel(null, channel, "unauthorized", "web_session_revoked");
    }
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
  const queueChannel = (active: ActiveRuntime | null, channel: RelayChannel, detail: string) => {
    if (!channel.recoverable || channel.downstreamResponseStarted) {
      failChannel(active, channel, "relay_stream_interrupted", detail);
      return;
    }
    store.audit(channel.deviceId, "relay_channel_queued", `trace=${channel.traceId}:channel=${channel.id}:request=${channel.requestId}:attempt=${channel.replayAttempts}:upstream_response_started=${channel.upstreamResponseStarted}:detail=${detail}`);
    if (channel.replayAttempts >= maxReplayAttempts) {
      failChannel(active, channel, "relay_stream_interrupted", "relay_retries_exhausted");
      return;
    }
    if (active?.channels.get(channel.id) === channel) {
      active.channels.delete(channel.id);
      syncActiveChannels(active);
    }
    retryableChannels.set(channel.id, channel);
    if (channel.retryTimeout) clearTimeout(channel.retryTimeout);
    channel.retryTimeout = setTimeout(() => {
      if (!retryableChannels.has(channel.id) || channel.completed) return;
      failChannel(null, channel, "runtime_unavailable", "relay_reconnect_timeout");
    }, reconnectGraceMs);
    channel.retryTimeout.unref();
    channel.request.resume();
  };
  const replayChannel = (active: ActiveRuntime, channel: RelayChannel) => {
    if (channel.completed || (channel.deviceId && channel.deviceId !== active.deviceId)) return;
    if (channel.retryTimeout) clearTimeout(channel.retryTimeout);
    channel.retryTimeout = null;
    retryableChannels.delete(channel.id);
    channel.deviceId = active.deviceId;
    channel.connectionEpoch = active.connectionEpoch;
    channel.runtimeInstanceId = active.runtimeInstanceId;
    channel.replayAttempts += 1;
    channel.requestSequence = 0;
    channel.responseSequence = 0;
    channel.upstreamResponseStarted = false;
    channel.downstreamResponseStarted = false;
    channel.bufferResponse = false;
    channel.responseStatus = null;
    channel.responseHeaders = {};
    channel.responseChunks = [];
    channel.responseBytes = 0;
    channel.requestCredit = relayInitialWindowBytes;
    channel.requestQueue = [...channel.requestChunks];
    channel.requestEndSent = false;
    active.channels.set(channel.id, channel);
    syncActiveChannels(active);
    store.audit(active.deviceId, "relay_channel_replayed", `trace=${channel.traceId}:channel=${channel.id}:request=${channel.requestId}:attempt=${channel.replayAttempts}:epoch=${active.connectionEpoch}`);
    try {
      sendRequestOpen(active, channel);
      flushRequest(active, channel);
    } catch {
      queueChannel(active, channel, "runtime_socket_closed");
    }
  };
  const sendCommandResult = (response: ServerResponse, command: RelayCommand) => {
    if (response.headersSent || response.destroyed) return;
    const status = command.response_status || (command.status === "expired" ? 504 : 202);
    if (command.response_body && command.response_status) {
      response.writeHead(status, { ...securityHeaders(), ...forwardedResponseHeaders(command.response_headers), "content-length": command.response_body.length });
      response.end(command.response_body);
      return;
    }
    sendJson(response, status, { command_id: command.command_id, status: command.status, error: command.last_error });
  };
  const queuedCommandResponse = (response: ServerResponse, command: RelayCommand) => {
    if (!response.headersSent && !response.destroyed) sendJson(response, 202, { command_id: command.command_id, status: command.status, queued: true }, { "x-better-codex-command-status": command.status });
  };
  const sendCommandStatus = (response: ServerResponse, command: RelayCommand) => {
    let payload: unknown = null;
    if (command.response_body) {
      try { payload = JSON.parse(command.response_body.toString("utf8")); } catch {}
    }
    sendJson(response, 200, { command_id: command.command_id, status: command.status, response_status: command.response_status, error: command.last_error || (payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : null), payload });
  };
  const resolveCommandWaiters = (command: RelayCommand) => {
    const waiters = commandWaiters.get(command.command_id);
    if (!waiters) return;
    commandWaiters.delete(command.command_id);
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      sendCommandResult(waiter.response, command);
    }
  };
  const waitForCommand = (response: ServerResponse, command: RelayCommand) => {
    const timeout = setTimeout(() => {
      const waiters = commandWaiters.get(command.command_id);
      if (waiters) {
        for (const waiter of waiters) if (waiter.response === response) waiters.delete(waiter);
        if (!waiters.size) commandWaiters.delete(command.command_id);
      }
      const current = store.relayCommand(command.command_id) || command;
      if (["applied", "rejected", "conflict", "expired"].includes(current.status)) sendCommandResult(response, current);
      else queuedCommandResponse(response, current);
    }, 15_000);
    timeout.unref();
    const waiter = { response, timeout };
    const waiters = commandWaiters.get(command.command_id) || new Set<{ response: ServerResponse; timeout: NodeJS.Timeout }>();
    waiters.add(waiter);
    commandWaiters.set(command.command_id, waiters);
    response.once("close", () => {
      clearTimeout(timeout);
      waiters.delete(waiter);
      if (!waiters.size) commandWaiters.delete(command.command_id);
    });
  };
  let pumpCommands = (active: ActiveRuntime) => {};
  const retryCommandChannel = (active: ActiveRuntime, channel: RelayCommandChannel, error: string) => {
    clearTimeout(channel.timeout);
    active.commandChannels.delete(channel.id);
    syncActiveChannels(active);
    store.retryCommand(channel.commandId, channel.deliveryId, error);
  };
  const finishCommandChannel = (active: ActiveRuntime, channel: RelayCommandChannel) => {
    clearTimeout(channel.timeout);
    active.commandChannels.delete(channel.id);
    syncActiveChannels(active);
    const status = channel.responseStatus || 502;
    const body = Buffer.concat(channel.responseChunks, channel.responseBytes);
    let responseError = "";
    try { responseError = String(JSON.parse(body.toString("utf8"))?.error || ""); } catch {}
    if (status === 408 || status === 425 || status === 429 || status >= 500 || responseError === "request_outcome_unknown") {
      store.retryCommand(channel.commandId, channel.deliveryId, `runtime_http_${status}`);
      return;
    }
    store.completeCommand(channel.commandId, channel.deliveryId, status, channel.responseHeaders, body);
    const command = store.relayCommand(channel.commandId);
    if (command) resolveCommandWaiters(command);
  };
  const dispatchCommand = (active: ActiveRuntime, command: RelayCommand) => {
    if (!command.delivery_id) return;
    const channelId = randomUUID();
    const channel = {
      id: channelId,
      commandId: command.command_id,
      deliveryId: command.delivery_id,
      responseStatus: null,
      responseHeaders: {},
      responseSequence: 0,
      responseChunks: [],
      responseBytes: 0,
      timeout: setTimeout(() => {}, 0),
    } satisfies RelayCommandChannel;
    clearTimeout(channel.timeout);
    channel.timeout = setTimeout(() => {
      if (!active.commandChannels.has(channel.id)) return;
      try { active.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, reason: "relay_command_timeout" })); } catch {}
      retryCommandChannel(active, channel, "relay_command_timeout");
    }, 120_000);
    channel.timeout.unref();
    active.commandChannels.set(channel.id, channel);
    syncActiveChannels(active);
    try {
      active.socket.send(encodeRelayMessage({ type: "request_open", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, request_id: command.command_id, method: command.method, path: command.path, headers: command.headers }));
      let sequence = 0;
      for (let offset = 0; offset < command.body.length; offset += relayMaxChunkBytes) {
        const chunk = command.body.subarray(offset, Math.min(command.body.length, offset + relayMaxChunkBytes));
        active.socket.send(encodeRelayMessage({ type: "request_chunk", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, sequence, data: chunk.toString("base64") }));
        sequence += 1;
      }
      active.socket.send(encodeRelayMessage({ type: "request_end", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id }));
    } catch {
      retryCommandChannel(active, channel, "runtime_socket_closed");
    }
  };
  pumpCommands = (active: ActiveRuntime) => {
    if (runtime !== active) return;
    const capacity = Math.max(0, maxConcurrentChannels - active.activeChannels);
    if (!capacity) return;
    for (const command of store.claimCommands(active.deviceId, Math.min(capacity, 8))) dispatchCommand(active, command);
  };
  const forwardCommand = async (request: IncomingMessage, response: ServerResponse, url: URL, method: string, sessionId: string) => {
    const suppliedRequestId = String(request.headers["x-better-codex-request-id"] || request.headers["x-better-codex-command-id"] || "");
    if (!/^[A-Za-z0-9_-]{8,200}$/.test(suppliedRequestId)) return forwardRequest(request, response, url, method, sessionId);
    const body = await readRawBody(request, Math.min(maxRequestBytes, 2 * 1024 * 1024));
    const path = `${url.pathname}${url.search}`;
    const command = createWebCommand(suppliedRequestId, method, path, body);
    if (!command) return sendJson(response, 400, { error: "command_not_supported" });
    if (command.kind === "issue" && ((method === "POST" && url.pathname === "/api/issues") || method === "PATCH")) {
      const payload = JSON.parse(body.toString("utf8")) as Record<string, unknown>;
      if (payload.assignee_user_id !== undefined && payload.assignee_user_id !== null) {
        const assignee = typeof payload.assignee_user_id === "string" ? store.webUser(payload.assignee_user_id) : null;
        if (!assignee || assignee.disabled) throw new Error("web_user_not_found");
      }
      if (payload.user_assigned === true && typeof payload.assignee_user_id !== "string") throw new Error("web_user_not_found");
    }
    const result = store.enqueueCommand(sessionId, command, forwardedRequestHeaders(request, command.command_id));
    if (result.kind === "conflict") return sendJson(response, 409, { error: "request_id_conflict", command_id: command.command_id });
    if (["applied", "rejected", "conflict", "expired"].includes(result.command.status)) return sendCommandResult(response, result.command);
    if (!runtime) return queuedCommandResponse(response, result.command);
    waitForCommand(response, result.command);
    pumpCommands(runtime);
  };
  function forwardRequest(request: IncomingMessage, response: ServerResponse, url: URL, method: string, sessionId: string) {
    const active = runtime;
    const presence = active || reconnectingRuntime;
    if (["/api/shutdown"].includes(url.pathname) || url.pathname.startsWith("/api/session-relay/") || url.pathname.startsWith("/api/mockup/") || url.pathname.startsWith("/api/sync/") || url.pathname.startsWith("/api/relay/")) return sendJson(response, 404, { error: "not_found" });
    const channelId = randomUUID();
    const suppliedRequestId = String(request.headers["x-better-codex-request-id"] || "");
    const requestId = /^[A-Za-z0-9_-]{8,200}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
    const suppliedTraceId = String(request.headers["x-better-codex-trace-id"] || "");
    const traceId = /^[A-Za-z0-9_-]{8,200}$/.test(suppliedTraceId) ? suppliedTraceId : randomUUID();
    const recoverable = Boolean(presence && ["GET", "HEAD"].includes(method));
    if (!active && !recoverable) return sendJson(response, 503, { error: "runtime_offline", trace_id: traceId });
    if ((active?.activeChannels || 0) + retryableChannels.size >= maxConcurrentChannels) return sendJson(response, 429, { error: "relay_channel_limit", trace_id: traceId });
    const timeout = setTimeout(() => {
      const channel = runtime?.channels.get(channelId) || retryableChannels.get(channelId);
      if (!channel || channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "relay_request_timeout" })); } catch {}
        failChannel(current, channel, "relay_request_timeout");
      } else {
        failChannel(null, channel, "relay_request_timeout");
      }
    }, 120_000);
    timeout.unref();
    const channel: RelayChannel = { id: channelId, sessionId, deviceId: presence?.deviceId || "", requestId, traceId, method, request, response, path: `${url.pathname}${url.search}`, headers: forwardedRequestHeaders(request, requestId), recoverable, requestSequence: 0, responseSequence: 0, upstreamResponseStarted: false, downstreamResponseStarted: false, bufferResponse: false, responseStatus: null, responseHeaders: {}, responseChunks: [], responseBytes: 0, completed: false, requestBytes: 0, requestCredit: relayInitialWindowBytes, requestQueue: [], requestChunks: [], requestEnded: false, requestEndSent: false, replayAttempts: 0, retryTimeout: null, connectionEpoch: presence?.connectionEpoch || 0, runtimeInstanceId: presence?.runtimeInstanceId || "", timeout };
    request.on("data", chunkValue => {
      if (channel.completed) return;
      request.pause();
      const bytes = Buffer.isBuffer(chunkValue) ? chunkValue : Buffer.from(chunkValue);
      channel.requestBytes += bytes.length;
      if (channel.requestBytes > maxRequestBytes) {
        const current = runtime;
        if (current?.channels.get(channelId) === channel) {
          try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "body_too_large" })); } catch {}
        }
        request.resume();
        failChannel(current, channel, "body_too_large");
        return;
      }
      for (let offset = 0; offset < bytes.length; offset += relayMaxChunkBytes) {
        const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + relayMaxChunkBytes));
        channel.requestQueue.push(chunk);
        if (channel.recoverable) channel.requestChunks.push(chunk);
      }
      const current = runtime;
      if (current?.channels.get(channelId) === channel) {
        try { flushRequest(current, channel); }
        catch { queueChannel(current, channel, "runtime_socket_closed"); }
      } else {
        request.resume();
      }
    });
    request.once("end", () => {
      channel.requestEnded = true;
      const current = runtime;
      if (current?.channels.get(channelId) === channel) {
        try { flushRequest(current, channel); }
        catch { queueChannel(current, channel, "runtime_socket_closed"); }
      }
    });
    request.once("error", error => {
      if (channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "browser_request_error" })); } catch {}
        failChannel(current, channel, "relay_stream_interrupted", "browser_request_error:" + String((error as NodeJS.ErrnoException).code || error.message || "unknown"));
      } else {
        finishChannel(null, channel);
      }
    });
    response.once("close", () => {
      if (channel.completed) return;
      const current = runtime;
      if (current?.channels.has(channelId)) {
        try { current.socket.send(encodeRelayMessage({ type: "request_cancel", protocol_version: relayProtocolVersion, device_id: current.deviceId, runtime_instance_id: current.runtimeInstanceId, connection_epoch: current.connectionEpoch, channel_id: channelId, reason: "browser_disconnected" })); } catch {}
        finishChannel(current, channel);
      } else {
        finishChannel(null, channel);
      }
    });
    const current = runtime;
    if (current) {
      channel.deviceId = current.deviceId;
      channel.connectionEpoch = current.connectionEpoch;
      channel.runtimeInstanceId = current.runtimeInstanceId;
      current.channels.set(channelId, channel);
      syncActiveChannels(current);
      try {
        sendRequestOpen(current, channel);
      } catch {
        queueChannel(current, channel, "runtime_socket_closed");
      }
    } else {
      queueChannel(null, channel, "runtime_reconnecting");
    }
  }
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
      if (url.pathname === "/healthz" && method === "GET") return sendJson(response, 200, { ok: true, name: "Better Codex Relay", version: coreVersion, protocol_version: relayProtocolVersion, runtime: publicRuntime(runtime, reconnectingRuntime), pending_commands: store.pendingCommandCount() });
      if ((["/", "/web", "/web/projects", "/web/agents"].includes(url.pathname) || url.pathname.startsWith("/web/projects/") || url.pathname.startsWith("/web/agents/")) && method === "GET") return sendText(response, 200, betterCodexWebHostHtml("relay"), "text/html; charset=utf-8", { "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" });
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
        const user = store.webUserCredentials(String(body.username || "").trim());
        if (!user || !passwordMatches(String(body.password || ""), user.password_hash)) {
          const current = attempt && attempt.resetAt > Date.now() ? attempt : { count: 0, resetAt: Date.now() + 15 * 60_000 };
          loginAttempts.set(client, { ...current, count: current.count + 1 });
          store.audit(client, "web_login_failed");
          return sendJson(response, 401, { error: "unauthorized" });
        }
        loginAttempts.delete(client);
        const session = store.createWebSession(user.id, { remembered: body.remember === true, deviceName: body.device_name, userAgent: request.headers["user-agent"], clientIp: client });
        store.audit(user.id, "web_login_succeeded", client);
        const cookieLifetime = session.remembered ? "persistent" : undefined;
        return sendJson(response, 200, { csrf_token: session.csrf_token, expires_at: session.expires_at, user: userForWeb(session.user), users: store.listWebUsers().map(userForWeb) }, { "set-cookie": relaySessionCookie(session.token, secureCookies, cookieLifetime) });
      }

      const runtimeSessionDevice = url.pathname.startsWith("/api/v1/runtime/web-sessions") ? store.deviceForToken(bearer(request)) : null;
      if (url.pathname === "/api/v1/runtime/web-sessions" && method === "GET") {
        if (!runtimeSessionDevice) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { sessions: store.webSessions() });
      }
      const runtimeSessionMatch = url.pathname.match(/^\/api\/v1\/runtime\/web-sessions\/([^/]+)$/);
      if (runtimeSessionMatch && method === "DELETE") {
        if (!runtimeSessionDevice) return sendJson(response, 401, { error: "unauthorized" });
        const revoked = store.revokeWebSessionById(decodeURIComponent(runtimeSessionMatch[1]));
        revokeSessionChannels(revoked.id);
        store.audit(runtimeSessionDevice.id, "web_session_revoked", revoked.id);
        return sendJson(response, 200, { ok: true, ...revoked });
      }

      const sessionToken = parseCookies(request.headers.cookie).get("better_codex_relay_session") || "";
      const session = store.webSession(sessionToken);
      if (session) response.setHeader("set-cookie", relaySessionCookie(sessionToken, secureCookies, session.remembered ? "persistent" : undefined));
      const csrfValid = Boolean(session && typeof request.headers["x-csrf-token"] === "string" && secretEqual(request.headers["x-csrf-token"], session.csrf_token));
      const admin = secretEqual(bearer(request), options.adminToken);
      if (url.pathname === "/relay/session" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { csrf_token: session.csrf_token, expires_at: session.expires_at, user: userForWeb(session.user), users: store.listWebUsers().map(userForWeb) });
      }
      if (url.pathname === "/relay/logout" && method === "DELETE") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" }, { "set-cookie": clearRelaySessionCookie(secureCookies) });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        store.revokeWebSession(sessionToken);
        return sendJson(response, 200, { ok: true }, { "set-cookie": clearRelaySessionCookie(secureCookies) });
      }
      if (url.pathname === "/relay/status" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { ok: true, name: "Better Codex Relay", version: coreVersion, protocol_version: relayProtocolVersion, runtime: publicRuntime(runtime, reconnectingRuntime), pending_commands: store.pendingCommandCount() });
      }
      if (url.pathname === "/relay/device" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { devices: store.devices(), active_device_id: runtime?.deviceId || null });
      }
      if (url.pathname === "/api/profile" && method === "PATCH") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        if (!trustedOrigin(request, true) || !csrfValid) return sendJson(response, 403, { error: "csrf_invalid" });
        const body = await readBody(request, 600_000);
        return sendJson(response, 200, { user: userForWeb(store.setWebUserProfile(session.user.id, body.nickname, body.avatar, body.avatar_color, body.avatar_generated)) });
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
      if (url.pathname === "/api/v1/admin/users" && method === "GET") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        return sendJson(response, 200, { users: store.listWebUsers().map(userForWeb) });
      }
      if (url.pathname === "/api/v1/admin/users" && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        const body = await readBody(request, 8192);
        const username = validateWebUsername(String(body.username || ""));
        const password = validateWebPassword(String(body.password || ""));
        return sendJson(response, 201, { user: userForWeb(store.createWebUser(username, passwordHash(password), body.nickname)) });
      }
      const userAdminMatch = url.pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)\/(disable|enable|password)$/);
      if (userAdminMatch && method === "POST") {
        if (!admin) return sendJson(response, 401, { error: "unauthorized" });
        const username = validateWebUsername(decodeURIComponent(userAdminMatch[1]));
        const operation = userAdminMatch[2];
        const existing = store.listWebUsers().find(user => user.username.toLowerCase() === username.toLowerCase());
        if (!existing) throw new Error("web_user_not_found");
        const sessionIds = store.webSessionIdsForUser(existing.id);
        if (operation === "disable") {
          const user = store.setWebUserDisabled(username, true);
          sessionIds.forEach(revokeSessionChannels);
          return sendJson(response, 200, { user: userForWeb(user) });
        }
        if (operation === "enable") return sendJson(response, 200, { user: userForWeb(store.setWebUserDisabled(username, false)) });
        const body = await readBody(request, 4096);
        const password = validateWebPassword(String(body.password || ""));
        const user = store.setWebUserPassword(username, passwordHash(password));
        sessionIds.forEach(revokeSessionChannels);
        return sendJson(response, 200, { user: userForWeb(user) });
      }
      if (url.pathname === "/web/injection.js" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return forwardRequest(request, response, url, method, session.id);
      }
      if (url.pathname === "/health" && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        return forwardRequest(request, response, url, method, session.id);
      }
      const commandStatusMatch = url.pathname.match(/^\/api\/commands\/([A-Za-z0-9_-]{8,200})$/);
      if (commandStatusMatch && method === "GET") {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        const command = store.relayCommand(commandStatusMatch[1]);
        if (!command || command.session_id !== session.id) return sendJson(response, 404, { error: "command_not_found" });
        if (["applied", "rejected", "conflict", "expired"].includes(command.status)) return sendCommandStatus(response, command);
        return sendJson(response, 202, { command_id: command.command_id, status: command.status, attempt_count: command.attempt_count, queued: true });
      }
      if (url.pathname.startsWith("/api/")) {
        if (!session) return sendJson(response, 401, { error: "unauthorized" });
        if (!["GET", "HEAD"].includes(method) && (!trustedOrigin(request, true) || !csrfValid)) return sendJson(response, 403, { error: "csrf_invalid" });
        if (webCommandTarget(method, `${url.pathname}${url.search}`)) return forwardCommand(request, response, url, method, session.id);
        return forwardRequest(request, response, url, method, session.id);
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
              const reconnecting = reconnectingRuntime;
              clearReconnectGrace();
              const timestamp = new Date().toISOString();
              active = { deviceId: device.id, deviceName: device.name, runtimeInstanceId: message.runtime_instance_id, connectionEpoch: epoch, protocolVersion: message.protocol_version, coreVersion: message.core_version, capabilities: message.capabilities, connectedAt: timestamp, lastHeartbeatAt: timestamp, activeChannels: 0, channels: new Map(), commandChannels: new Map(), socket: connection! };
              runtime = active;
              if (previous) {
                store.audit(device.id, "runtime_connection_replaced", previous.runtimeInstanceId === active.runtimeInstanceId ? "same_instance" : "different_instance");
                for (const channel of [...previous.channels.values()]) queueChannel(previous, channel, "relay_connection_replaced");
                for (const channel of [...previous.commandChannels.values()]) retryCommandChannel(previous, channel, "relay_connection_replaced");
              }
              previous?.socket.close(4001);
              connection?.send(encodeRelayMessage({ type: "hello_ack", protocol_version: relayProtocolVersion, device_id: device.id, runtime_instance_id: message.runtime_instance_id, connection_epoch: epoch, heartbeat_interval_ms: heartbeatIntervalMs, max_concurrent_channels: maxConcurrentChannels, max_chunk_bytes: relayMaxChunkBytes }));
              for (const channel of [...retryableChannels.values()]) if (!channel.deviceId || channel.deviceId === active.deviceId) replayChannel(active, channel);
              pumpCommands(active);
              if (reconnecting?.deviceId === active.deviceId) store.audit(device.id, "runtime_reconnected", reconnecting.runtimeInstanceId === active.runtimeInstanceId ? "same_instance" : "different_instance");
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
              if (!channel) {
                const commandChannel = active.commandChannels.get(message.channel_id);
                if (!commandChannel || commandChannel.responseStatus !== null) return;
                commandChannel.responseStatus = message.status;
                commandChannel.responseHeaders = forwardedResponseHeaders(message.headers);
                return;
              }
              if (channel.upstreamResponseStarted) {
                const detail = JSON.stringify({ trace_id: channel.traceId, channel_id: channel.id, request_id: channel.requestId, state: "duplicate_response_open", connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId });
                store.audit(active.deviceId, "relay_channel_invalid", detail);
                failChannel(active, channel, "relay_stream_interrupted", "relay_duplicate_response_open");
                return;
              }
              channel.upstreamResponseStarted = true;
              if (channel.retryTimeout) clearTimeout(channel.retryTimeout);
              channel.retryTimeout = null;
              const headers = forwardedResponseHeaders(message.headers);
              if (headers["content-type"]?.toLowerCase().includes("text/event-stream")) {
                headers["cache-control"] = "no-cache";
                headers["x-accel-buffering"] = "no";
              }
              channel.responseStatus = message.status;
              channel.responseHeaders = headers;
              const contentLength = Number(headers["content-length"] || 0);
              channel.bufferResponse = channel.recoverable && isJsonResponse(headers) && (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength <= maxBufferedResponseBytes);
              if (!channel.bufferResponse) await startDownstreamResponse(channel);
              return;
            }
            if (message.type === "response_chunk") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) {
                const commandChannel = active.commandChannels.get(message.channel_id);
                if (!commandChannel) {
                  store.audit(active.deviceId, "relay_late_response_chunk", JSON.stringify({ channel_id: message.channel_id, sequence: message.sequence, connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId }));
                  return;
                }
                if (commandChannel.responseStatus === null || message.sequence !== commandChannel.responseSequence) {
                  store.audit(active.deviceId, "relay_command_chunk_sequence_invalid", JSON.stringify({ channel_id: commandChannel.id, command_id: commandChannel.commandId, expected_sequence: commandChannel.responseSequence, actual_sequence: message.sequence, response_started: commandChannel.responseStatus !== null, connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId }));
                  retryCommandChannel(active, commandChannel, "relay_chunk_sequence_invalid");
                  pumpCommands(active);
                  return;
                }
                const bytes = Buffer.from(message.data, "base64");
                commandChannel.responseSequence += 1;
                commandChannel.responseBytes += bytes.length;
                if (commandChannel.responseBytes > 4 * 1024 * 1024) {
                  retryCommandChannel(active, commandChannel, "relay_command_response_too_large");
                  return;
                }
                commandChannel.responseChunks.push(bytes);
                connection?.send(encodeRelayMessage({ type: "window_update", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: commandChannel.id, direction: "response", bytes: bytes.length }));
                return;
              }
              if (!channel.upstreamResponseStarted || message.sequence !== channel.responseSequence) {
                const detail = JSON.stringify({ trace_id: channel.traceId, channel_id: channel.id, request_id: channel.requestId, expected_sequence: channel.responseSequence, actual_sequence: message.sequence, upstream_response_started: channel.upstreamResponseStarted, downstream_response_started: channel.downstreamResponseStarted, connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId });
                store.audit(active.deviceId, "relay_channel_chunk_sequence_invalid", detail);
                failChannel(active, channel, "relay_stream_interrupted", "relay_chunk_sequence_invalid");
                return;
              }
              channel.responseSequence += 1;
              const bytes = Buffer.from(message.data, "base64");
              if (channel.bufferResponse) {
                channel.responseChunks.push(bytes);
                channel.responseBytes += bytes.length;
                if (channel.responseBytes > maxBufferedResponseBytes) {
                  channel.bufferResponse = false;
                  store.audit(active.deviceId, "relay_channel_buffer_limit", `trace=${channel.traceId}:channel=${channel.id}:request=${channel.requestId}:bytes=${channel.responseBytes}`);
                  await startDownstreamResponse(channel);
                }
              } else if (!channel.response.write(bytes)) await once(channel.response, "drain");
              if (!channel.completed) connection?.send(encodeRelayMessage({ type: "window_update", protocol_version: relayProtocolVersion, device_id: active.deviceId, runtime_instance_id: active.runtimeInstanceId, connection_epoch: active.connectionEpoch, channel_id: channel.id, direction: "response", bytes: bytes.length }));
              return;
            }
            if (message.type === "response_end") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) {
                const commandChannel = active.commandChannels.get(message.channel_id);
                if (!commandChannel) return;
                if (commandChannel.responseStatus === null) {
                  store.audit(active.deviceId, "relay_command_response_end_invalid", JSON.stringify({ channel_id: commandChannel.id, command_id: commandChannel.commandId, response_started: false, connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId }));
                  retryCommandChannel(active, commandChannel, "relay_channel_invalid");
                  pumpCommands(active);
                  return;
                }
                finishCommandChannel(active, commandChannel);
                pumpCommands(active);
                return;
              }
              if (!channel.upstreamResponseStarted) {
                store.audit(active.deviceId, "relay_channel_response_end_invalid", JSON.stringify({ trace_id: channel.traceId, channel_id: channel.id, request_id: channel.requestId, upstream_response_started: false, connection_epoch: active.connectionEpoch, runtime_instance_id: active.runtimeInstanceId }));
                failChannel(active, channel, "relay_stream_interrupted", "relay_response_end_before_open");
                return;
              }
              if (!channel.downstreamResponseStarted) await startDownstreamResponse(channel);
              channel.response.end();
              if (channel.replayAttempts > 0) store.audit(active.deviceId, "relay_channel_replay_completed", `trace=${channel.traceId}:channel=${channel.id}:request=${channel.requestId}:attempt=${channel.replayAttempts}:epoch=${active.connectionEpoch}`);
              finishChannel(active, channel);
              return;
            }
            if (message.type === "response_error") {
              const channel = active.channels.get(message.channel_id);
              if (!channel) {
                const commandChannel = active.commandChannels.get(message.channel_id);
                if (!commandChannel) return;
                retryCommandChannel(active, commandChannel, message.error);
                pumpCommands(active);
                return;
              }
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
        close: (code, _reason) => {
          if (runtime?.socket === connection) {
            const interrupted = runtime;
            runtime = null;
            const detail = socketError ? "runtime_socket_error:" + socketError : code === relayRuntimeReconnectCloseCode ? "runtime_reconnect_requested" : code === relayRuntimeStoppedCloseCode ? "runtime_stopped" : "runtime_socket_closed";
            const recoverable = ![1001, 1008, 4001, 4002, 4003, relayRuntimeStoppedCloseCode].includes(code);
            if (recoverable) startReconnectGrace(interrupted, detail, code);
            else clearReconnectGrace();
            for (const channel of [...interrupted.channels.values()]) {
              if (recoverable) queueChannel(interrupted, channel, detail);
              else failChannel(interrupted, channel, "runtime_unavailable", detail);
            }
            for (const channel of [...interrupted.commandChannels.values()]) retryCommandChannel(interrupted, channel, detail);
            syncActiveChannels(interrupted);
            if (!recoverable && code === relayRuntimeStoppedCloseCode) store.audit(device.id, "runtime_stopped");
          }
          if (active) store.audit(device.id, "runtime_disconnected", socketError ? "runtime_socket_error:" + socketError : `runtime_socket_closed:code=${code}`);
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
    if (runtime) {
      if (Date.now() - Date.parse(runtime.lastHeartbeatAt) > heartbeatIntervalMs * 3) {
        store.audit(runtime.deviceId, "runtime_heartbeat_timeout");
        runtime.socket.close(4004);
      } else {
        pumpCommands(runtime);
      }
    }
    for (const [id, authorization] of authorizations) if (Date.parse(authorization.expires_at) <= Date.now() || authorization.status === "consumed") authorizations.delete(id);
  }, Math.min(5000, heartbeatIntervalMs));
  heartbeatSweep.unref();

  const close = () => new Promise<void>((resolveClose, reject) => {
    clearInterval(heartbeatSweep);
    clearReconnectGrace();
    for (const channel of retryableChannels.values()) {
      channel.completed = true;
      clearTimeout(channel.timeout);
      if (channel.retryTimeout) clearTimeout(channel.retryTimeout);
      channel.response.end();
    }
    retryableChannels.clear();
    for (const [commandId, waiters] of commandWaiters) {
      for (const waiter of waiters) {
        clearTimeout(waiter.timeout);
        if (!waiter.response.headersSent && !waiter.response.destroyed) sendJson(waiter.response, 202, { command_id: commandId, status: "pending", queued: true });
      }
    }
    commandWaiters.clear();
    if (runtime) for (const channel of runtime.commandChannels.values()) clearTimeout(channel.timeout);
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
