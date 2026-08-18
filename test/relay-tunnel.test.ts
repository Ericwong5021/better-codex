import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
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
  await relay.close();
});

test("relay Web session requires same-origin CSRF for protected requests", async () => {
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "b".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const address = relay.server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  assert.equal(login.status, 200);
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
  assert.ok(cookie.startsWith("better_codex_relay_session="));
  assert.equal((await fetch(`${base}/relay/session`, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${base}/relay/logout`, { method: "DELETE", headers: { cookie, origin: base } })).status, 403);
  assert.equal((await fetch(`${base}/relay/logout`, { method: "DELETE", headers: { cookie, origin: base, "x-csrf-token": session.csrf_token } })).status, 200);
  await relay.close();
});

test("runtime relay client forwards concurrent HTTP requests with only the local token", async () => {
  const localToken = "local-runtime-token";
  const local = createServer((request, response) => {
    if (request.headers.authorization !== `Bearer ${localToken}`) {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    const chunks: Buffer[] = [];
    request.on("data", chunk => chunks.push(Buffer.from(chunk)));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      response.writeHead(200, { "content-type": "application/json", "x-runtime": "local" });
      response.end(JSON.stringify({ path: request.url, method: request.method, body, relay: request.headers["x-better-codex-relay"], request_id: request.headers["x-better-codex-request-id"] }));
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

  const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
  const session = await login.json() as { csrf_token: string };
  const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
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
    const response = await fetch(`${base}/api/echo?index=${index}`, { method: "POST", headers: { cookie, origin: base, "content-type": "application/json", "x-csrf-token": session.csrf_token, "x-better-codex-request-id": requestId }, body: JSON.stringify({ index }) });
    assert.equal(response.status, 200);
    return response.json() as Promise<{ path: string; body: string; request_id: string }>;
  }));
  assert.equal(responses.length, 8);
  for (const [index, response] of responses.entries()) {
    assert.equal(response.path, `/api/echo?index=${index}`);
    assert.equal(response.body, JSON.stringify({ index }));
    assert.equal(response.request_id, `request-${index}-abcdef`);
  }

  client.stop();
  await waitFor(() => !relay.runtime());
  assert.equal((await fetch(`${base}/api/echo`, { headers: { cookie } })).status, 503);
  assert.equal((await fetch(`http://127.0.0.1:${localAddress.port}/health`, { headers: { authorization: `Bearer ${localToken}` } })).status, 200);

  const restarted = new RuntimeRelayClient({ runtimePort: () => localAddress.port, localToken, runtimeInstanceId: "runtime-http-2", coreVersion: "0.5.0", configuration: () => configuration });
  restarted.start();
  await waitFor(() => restarted.status().connected);
  assert.equal(restarted.status().connection_epoch, 2);
  assert.equal((await fetch(`${base}/health`, { headers: { cookie } })).status, 200);
  restarted.stop();
  await relay.close();
  local.close();
  await once(local, "close");
});
