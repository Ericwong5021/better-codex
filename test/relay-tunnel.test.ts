import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, request as httpRequest } from "node:http";
import type { Socket } from "node:net";
import test from "node:test";
import WebSocket, { type RawData } from "ws";
import { createRelayServer } from "../src/relay-server.js";
import { encodeRelayMessage, relayProtocolVersion, relayWebSocketProtocol } from "../src/relay-protocol.js";
import { RuntimeRelayClient } from "../src/runtime-relay-client.js";

function message(socket: WebSocket) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket_message_timeout")), 3000);
    socket.once("message", (data: RawData) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()) as Record<string, unknown>);
    });
  });
}

async function waitFor(check: () => boolean, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("condition_timeout");
}

function waitForMessage(socket: WebSocket, predicate: (value: Record<string, unknown>) => boolean) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket_matching_message_timeout")), 3000);
    const onMessage = (data: RawData) => {
      const value = JSON.parse(data.toString()) as Record<string, unknown>;
      if (!predicate(value)) return;
      clearTimeout(timer);
      socket.off("message", onMessage);
      resolve(value);
    };
    socket.on("message", onMessage);
  });
}

function requestStatus(port: number, path: string, headers: Record<string, string>) {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest({ host: "127.0.0.1", port, path, headers }, response => {
      response.resume();
      response.once("end", () => resolve(response.statusCode || 0));
    });
    request.once("error", reject);
    request.end();
  });
}

test("relay authenticates one runtime, replaces old connections, and stores no business tables", async () => {
  const adminToken = "a".repeat(64);
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken, webUsername: "admin", webPassword: "relay-password-123", secureCookies: false, heartbeatIntervalMs: 1000 });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const address = relay.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const socketBase = `ws://127.0.0.1:${address.port}`;
  const pairing = relay.store.createPairingCode();
  const device = relay.store.pairDevice("Runtime A", pairing.pairing_code);

  const health = await fetch(`${base}/healthz`).then(response => response.json()) as { runtime: { online: boolean }; name: string };
  assert.equal(health.name, "Better Codex Relay");
  assert.equal(health.runtime.online, false);

  const page = await fetch(`${base}/web`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /data-better-codex-host="relay"/);
  assert.match(html, /Better Codex Relay/);
  assert.match(html, /Relay 不保存任务、智能体或会话数据/);
  const host = await fetch(`${base}/web/host.js`).then(response => response.text());
  assert.match(host, /const SESSION_PATH = RELAY \? "\/relay\/session"/);
  assert.match(host, /agents: REMOTE && !RELAY \? "read-only" : "read-write"/);
  assert.match(host, /连接恢复后将自动重试/);
  assert.doesNotMatch(host, /Hub 管理命令/);

  const first = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${device.device_token}` } });
  await once(first, "open");
  first.send(encodeRelayMessage({ type: "hello", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-1", core_version: "0.5.0", capabilities: ["http-stream", "sse", "file-upload", "request-cancel"] }));
  const firstAck = await message(first);
  assert.equal(firstAck.type, "hello_ack");
  assert.equal(firstAck.connection_epoch, 1);

  const firstClosed = once(first, "close");
  const second = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${device.device_token}` } });
  await once(second, "open");
  second.send(encodeRelayMessage({ type: "hello", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-2", core_version: "0.5.1", capabilities: ["http-stream", "sse", "file-upload", "request-cancel"] }));
  const secondAck = await message(second);
  assert.equal(secondAck.connection_epoch, 2);
  await firstClosed;

  second.send(encodeRelayMessage({ type: "heartbeat", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-2", connection_epoch: 2, active_channels: 3, timestamp: new Date().toISOString() }));
  const heartbeat = await message(second);
  assert.equal(heartbeat.type, "heartbeat_ack");
  assert.equal(relay.runtime()?.activeChannels, 0);
  assert.deepEqual(relay.store.tableNames(), ["relay_audit", "relay_devices", "relay_settings", "relay_web_sessions", "sqlite_sequence"]);

  const staleRejected = once(second, "close");
  second.send(encodeRelayMessage({ type: "heartbeat", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-2", connection_epoch: 1, active_channels: 0, timestamp: new Date().toISOString() }));
  await staleRejected;
  assert.equal(relay.runtime(), null);
  const rotated = relay.store.rotateDeviceToken(device.device_id);
  const rejectedOldToken = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${device.device_token}` } });
  const [, oldTokenResponse] = await once(rejectedOldToken, "unexpected-response");
  assert.equal((oldTokenResponse as { statusCode: number }).statusCode, 401);
  (oldTokenResponse as { resume: () => void }).resume();
  relay.store.revokeDevice(device.device_id);
  const rejectedRevokedToken = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${rotated.device_token}` } });
  const [, revokedResponse] = await once(rejectedRevokedToken, "unexpected-response");
  assert.equal((revokedResponse as { statusCode: number }).statusCode, 401);
  (revokedResponse as { resume: () => void }).resume();
  assert.doesNotMatch(JSON.stringify(relay.store.auditEvents(100)), new RegExp(`${device.device_token}|${rotated.device_token}`));
  await relay.close();
});

test("relay Web session requires same-origin CSRF for protected requests", async () => {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "b".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const address = relay.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(`${base}/relay/status`)).status, 401);
  assert.equal(await requestStatus(address.port, "/healthz", { host: "evil.example" }), 403);
  assert.equal((await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) })).status, 403);
  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  assert.equal(login.status, 200);
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  assert.ok(cookie.startsWith("better_codex_relay_session="));
  assert.equal((await fetch(`${base}/relay/session`, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${base}/relay/logout`, { method: "DELETE", headers: { cookie, origin: base } })).status, 403);
  assert.equal((await fetch(`${base}/relay/logout`, { method: "DELETE", headers: { cookie, origin: base, "x-csrf-token": session.csrf_token } })).status, 200);
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "wrong-password" }) })).status, 401);
  }
  assert.equal((await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) })).status, 429);
  assert.doesNotMatch(JSON.stringify(relay.store.auditEvents(100)), /relay-password-123|wrong-password/);
  await relay.close();
});

test("relay buffers and retries an idempotent write through repeated Runtime reconnects", async () => {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "f".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false, reconnectGraceMs: 1000, maxReplayAttempts: 3 });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const address = relay.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const socketBase = `ws://127.0.0.1:${address.port}`;
  const device = relay.store.pairDevice("Runtime Retry", relay.store.createPairingCode().pairing_code);
  const connect = async (instance: string, onOpen?: (socket: WebSocket) => void) => {
    const socket = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${device.device_token}` } });
    await once(socket, "open");
    onOpen?.(socket);
    const acknowledged = waitForMessage(socket, value => value.type === "hello_ack");
    socket.send(encodeRelayMessage({ type: "hello", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: instance, core_version: "0.5.0", capabilities: ["http-stream"] }));
    await acknowledged;
    return socket;
  };
  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  const response = fetch(`${base}/api/retryable-write`, { method: "POST", headers: { cookie, origin: base, "x-csrf-token": session.csrf_token, "content-type": "application/json", "x-better-codex-request-id": "retryable-write-1" }, body: JSON.stringify({ value: "once" }) });
  assert.equal(await Promise.race([response.then(() => "settled"), new Promise(resolve => setTimeout(() => resolve("pending"), 25))]), "pending");
  let firstOpenPromise: Promise<Record<string, unknown>> | undefined;
  let firstEndPromise: Promise<Record<string, unknown>> | undefined;
  const first = await connect("runtime-retry-1", socket => {
    firstOpenPromise = waitForMessage(socket, value => value.type === "request_open");
    firstEndPromise = waitForMessage(socket, value => value.type === "request_end");
  });
  assert.equal((await firstOpenPromise!).request_id, "retryable-write-1");
  await firstEndPromise;
  const firstClosed = once(first, "close");
  let secondOpenPromise: Promise<Record<string, unknown>> | undefined;
  let secondEndPromise: Promise<Record<string, unknown>> | undefined;
  const second = await connect("runtime-retry-2", socket => {
    secondOpenPromise = waitForMessage(socket, value => value.type === "request_open");
    secondEndPromise = waitForMessage(socket, value => value.type === "request_end");
  });
  await firstClosed;
  assert.equal((await secondOpenPromise!).request_id, "retryable-write-1");
  await secondEndPromise;
  const secondClosed = once(second, "close");
  second.close();
  await secondClosed;
  let thirdOpenPromise: Promise<Record<string, unknown>> | undefined;
  let thirdEndPromise: Promise<Record<string, unknown>> | undefined;
  const third = await connect("runtime-retry-3", socket => {
    thirdOpenPromise = waitForMessage(socket, value => value.type === "request_open");
    thirdEndPromise = waitForMessage(socket, value => value.type === "request_end");
  });
  const replayedOpen = await thirdOpenPromise!;
  const replayedEnd = await thirdEndPromise!;
  assert.equal(replayedOpen.request_id, "retryable-write-1");
  assert.equal(replayedOpen.method, "POST");
  third.send(encodeRelayMessage({ type: "response_open", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-retry-3", connection_epoch: 3, channel_id: String(replayedEnd.channel_id), status: 202, headers: { "content-type": "application/json" } }));
  third.send(encodeRelayMessage({ type: "response_chunk", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-retry-3", connection_epoch: 3, channel_id: String(replayedEnd.channel_id), sequence: 0, data: Buffer.from('{"retried":true}').toString("base64") }));
  third.send(encodeRelayMessage({ type: "response_end", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: "runtime-retry-3", connection_epoch: 3, channel_id: String(replayedEnd.channel_id) }));
  const completed = await response;
  assert.equal(completed.status, 202);
  assert.deepEqual(await completed.json(), { retried: true });
  third.close();
  await relay.close();
});

test("relay reports an idempotent write only after reconnect attempts are exhausted", async () => {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "e".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false, reconnectGraceMs: 1000, maxReplayAttempts: 2 });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const address = relay.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const socketBase = `ws://127.0.0.1:${address.port}`;
  const device = relay.store.pairDevice("Runtime Retry Limit", relay.store.createPairingCode().pairing_code);
  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  const response = fetch(`${base}/api/retry-limit`, { method: "POST", headers: { cookie, origin: base, "x-csrf-token": session.csrf_token, "content-type": "application/json", "x-better-codex-request-id": "retry-limit-write-1" }, body: JSON.stringify({ value: "once" }) });
  for (let attempt = 1; attempt <= 2; attempt++) {
    let ended: Promise<Record<string, unknown>> | undefined;
    const socket = new WebSocket(`${socketBase}/api/v1/runtime/connect`, relayWebSocketProtocol, { headers: { authorization: `Bearer ${device.device_token}` } });
    await once(socket, "open");
    ended = waitForMessage(socket, value => value.type === "request_end");
    const acknowledged = waitForMessage(socket, value => value.type === "hello_ack");
    socket.send(encodeRelayMessage({ type: "hello", protocol_version: relayProtocolVersion, device_id: device.device_id, runtime_instance_id: `runtime-limit-${attempt}`, core_version: "0.5.0", capabilities: ["http-stream"] }));
    await acknowledged;
    await ended;
    const closed = once(socket, "close");
    socket.close();
    await closed;
  }
  const failed = await response;
  assert.equal(failed.status, 502);
  const failure = await failed.json() as Record<string, unknown>;
  assert.equal(failure.error, "relay_stream_interrupted");
  assert.equal(failure.detail, "relay_retries_exhausted");
  assert.equal(failure.request_id, "retry-limit-write-1");
  assert.equal(failure.method, "POST");
  assert.equal(failure.request_ended, true);
  assert.equal(failure.response_started, false);
  assert.equal(failure.connection_epoch, 2);
  assert.equal(failure.runtime_instance_id, "runtime-limit-2");
  assert.equal(failure.replay_attempts, 2);
  await relay.close();
});

test("runtime relay client retries after an unexpected HTTP response", async () => {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "d".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false });
  const pairing = relay.store.createPairingCode();
  const device = relay.store.pairDevice("Runtime A", pairing.pairing_code);
  const unavailable = createServer();
  let unavailableSocket: Socket | undefined;
  unavailable.on("upgrade", (_request, socket) => {
    unavailableSocket = socket;
    socket.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
  });
  unavailable.listen(0, "127.0.0.1");
  await once(unavailable, "listening");
  const address = unavailable.address();
  assert.ok(address && typeof address === "object");
  const configuration = { enabled: true, relay_url: `http://127.0.0.1:${address.port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() } as const;
  const client = new RuntimeRelayClient({ runtimePort: () => 4317, localToken: "local-runtime-token", runtimeInstanceId: "runtime-retry", coreVersion: "0.5.0", configuration: () => configuration });
  client.start();
  await waitFor(() => client.status().last_error === "relay_http_502" && client.status().reconnect_attempts > 0);
  unavailableSocket?.destroy();
  await new Promise<void>((resolve, reject) => unavailable.close(error => error ? reject(error) : resolve()));
  relay.server.listen(address.port, "127.0.0.1");
  await once(relay.server, "listening");
  await waitFor(() => client.status().connected);
  client.stop();
  await relay.close();
});

test("runtime relay client forwards concurrent HTTP requests with only the local token", async () => {
  const localToken = "local-runtime-token";
  let sseClosed = 0;
  let uploadAborted = false;
  let resolveUploadStarted: (() => void) | undefined;
  const uploadStarted = new Promise<void>(resolve => { resolveUploadStarted = resolve; });
  const local = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${localToken}`) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (request.url === "/api/events") {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      let id = 0;
      const interval = setInterval(() => {
        id += 1;
        response.write(`id: ${id}\nevent: change\ndata: {"sequence":${id}}\n\n`);
      }, 10);
      response.once("close", () => {
        clearInterval(interval);
        sseClosed += 1;
      });
      return;
    }
    if (request.url === "/api/large") {
      const body = Buffer.alloc(3 * 1024 * 1024, 97);
      response.writeHead(200, { "content-type": "application/octet-stream", "content-length": body.length });
      response.end(body);
      return;
    }
    if (request.url === "/api/cancel-upload") {
      request.once("data", () => resolveUploadStarted?.());
      request.once("aborted", () => { uploadAborted = true; });
      request.resume();
      return;
    }
    const chunks: Buffer[] = [];
    request.on("data", chunk => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      response.writeHead(200, { "content-type": "application/json", "x-runtime": "local" });
      response.end(JSON.stringify({ path: request.url, method: request.method, body, body_bytes: Buffer.byteLength(body), chunk_count: chunks.length, relay: request.headers["x-better-codex-relay"], request_id: request.headers["x-better-codex-request-id"], cookie: request.headers.cookie, csrf: request.headers["x-csrf-token"] }));
    });
  });
  local.listen(0, "127.0.0.1");
  await once(local, "listening");
  const localAddress = local.address();
  assert.ok(localAddress && typeof localAddress === "object");

  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "c".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false, heartbeatIntervalMs: 1000 });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const relayAddress = relay.server.address();
  assert.ok(relayAddress && typeof relayAddress === "object");
  const base = `http://127.0.0.1:${relayAddress.port}`;
  const pairing = relay.store.createPairingCode();
  const device = relay.store.pairDevice("Runtime A", pairing.pairing_code);
  const configuration = { enabled: true, relay_url: base, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() } as const;
  const client = new RuntimeRelayClient({ runtimePort: () => localAddress.port, localToken, runtimeInstanceId: "runtime-http-1", coreVersion: "0.5.0", configuration: () => configuration });
  client.start();
  await waitFor(() => client.status().connected);

  assert.equal((await fetch(`${base}/api/echo`)).status, 401);

  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  assert.equal((await fetch(`${base}/api/relay/disconnect`, { method: "POST", headers: { cookie, origin: base, "x-csrf-token": session.csrf_token } })).status, 404);
  const health = await fetch(`${base}/health`, { headers: { cookie } });
  assert.equal(health.status, 200);
  const healthBody = await health.json() as { path: string; method: string; body: string; relay: string; request_id: string };
  assert.equal(healthBody.path, "/health");
  assert.equal(healthBody.method, "GET");
  assert.equal(healthBody.body, "");
  assert.equal(healthBody.relay, "1");
  assert.ok(healthBody.request_id.length > 8);

  const responses = await Promise.all(Array.from({ length: 8 }, async (_, index) => {
    const requestId = `request-${index}-abcdef`;
    const response = await fetch(`${base}/api/echo?index=${index}`, { method: "POST", headers: { authorization: "Bearer browser-secret", cookie, origin: base, "content-type": "application/json", "x-csrf-token": session.csrf_token, "x-better-codex-request-id": requestId }, body: JSON.stringify({ index }) });
    assert.equal(response.status, 200);
    return response.json() as Promise<{ path: string; body: string; request_id: string; cookie?: string; csrf?: string }>;
  }));
  assert.equal(responses.length, 8);
  for (const [index, response] of responses.entries()) {
    assert.equal(response.path, `/api/echo?index=${index}`);
    assert.equal(response.body, JSON.stringify({ index }));
    assert.equal(response.request_id, `request-${index}-abcdef`);
    assert.equal(response.cookie, undefined);
    assert.equal(response.csrf, undefined);
  }

  const large = await fetch(`${base}/api/large`, { headers: { cookie } });
  assert.equal(large.status, 200);
  assert.equal((await large.arrayBuffer()).byteLength, 3 * 1024 * 1024);

  const uploadBytes = 3 * 1024 * 1024;
  let uploadOffset = 0;
  const uploadBody = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (uploadOffset >= uploadBytes) return controller.close();
      const size = Math.min(32 * 1024, uploadBytes - uploadOffset);
      uploadOffset += size;
      controller.enqueue(new Uint8Array(size).fill(120));
    },
  });
  const uploadInit: RequestInit & { duplex: "half" } = { method: "POST", headers: { cookie, origin: base, "content-type": "application/octet-stream", "x-csrf-token": session.csrf_token }, body: uploadBody, duplex: "half" };
  const upload = await fetch(`${base}/api/upload`, uploadInit);
  assert.equal(upload.status, 200);
  const uploadResult = await upload.json() as { body_bytes: number; chunk_count: number };
  assert.equal(uploadResult.body_bytes, uploadBytes);
  assert.ok(uploadResult.chunk_count > 1);

  const eventsController = new AbortController();
  const events = await fetch(`${base}/api/events`, { headers: { cookie, "last-event-id": "7" }, signal: eventsController.signal });
  assert.match(events.headers.get("content-type") || "", /text\/event-stream/);
  assert.equal(events.headers.get("x-accel-buffering"), "no");
  const eventsReader = events.body?.getReader();
  assert.ok(eventsReader);
  let eventText = "";
  while (!eventText.includes("id: 3")) {
    const chunk = await eventsReader.read();
    if (chunk.done) break;
    eventText += new TextDecoder().decode(chunk.value);
  }
  assert.match(eventText, /event: change/);
  eventsController.abort();
  await eventsReader.cancel().catch(() => {});
  await waitFor(() => sseClosed === 1 && (relay.runtime()?.activeChannels || 0) === 0);

  let cancelOffset = 0;
  const cancelBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (cancelOffset >= 20 * 1024 * 1024) return controller.close();
      cancelOffset += 32 * 1024;
      controller.enqueue(new Uint8Array(32 * 1024).fill(121));
      await new Promise(resolve => setTimeout(resolve, 5));
    },
  });
  const cancelController = new AbortController();
  const cancelInit: RequestInit & { duplex: "half" } = { method: "POST", headers: { cookie, origin: base, "content-type": "application/octet-stream", "x-csrf-token": session.csrf_token }, body: cancelBody, duplex: "half", signal: cancelController.signal };
  const cancelledUpload = fetch(`${base}/api/cancel-upload`, cancelInit);
  await uploadStarted;
  cancelController.abort();
  await assert.rejects(cancelledUpload, error => error instanceof Error && error.name === "AbortError");
  await waitFor(() => uploadAborted && (relay.runtime()?.activeChannels || 0) === 0);

  client.stop();
  await waitFor(() => !relay.runtime());
  assert.equal((await fetch(`${base}/api/echo`, { headers: { cookie } })).status, 503);
  assert.equal((await fetch(`http://127.0.0.1:${localAddress.port}/health`, { headers: { authorization: `Bearer ${localToken}` } })).status, 200);

  const restarted = new RuntimeRelayClient({ runtimePort: () => localAddress.port, localToken, runtimeInstanceId: "runtime-http-2", coreVersion: "0.5.0", configuration: () => configuration });
  restarted.start();
  await waitFor(() => restarted.status().connected);
  assert.equal(restarted.status().connection_epoch, 2);
  assert.equal((await fetch(`${base}/health`, { headers: { cookie } })).status, 200);
  const reconnectedEventsController = new AbortController();
  const reconnectedEvents = await fetch(`${base}/api/events`, { headers: { cookie, "last-event-id": "3" }, signal: reconnectedEventsController.signal });
  assert.equal(reconnectedEvents.status, 200);
  const reconnectedReader = reconnectedEvents.body?.getReader();
  assert.ok(reconnectedReader);
  assert.match(new TextDecoder().decode((await reconnectedReader.read()).value), /event: change/);
  reconnectedEventsController.abort();
  await reconnectedReader.cancel().catch(() => {});
  await waitFor(() => sseClosed === 2);
  restarted.stop();
  await relay.close();
  local.close();
  await once(local, "close");
});
