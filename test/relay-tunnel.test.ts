import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import WebSocket, { type RawData } from "ws";
import { createRelayServer } from "../src/relay-server.js";
import { encodeRelayMessage, relayProtocolVersion, relayWebSocketProtocol } from "../src/relay-protocol.js";

function message(socket: WebSocket) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("websocket_message_timeout")), 3000);
    socket.once("message", (data: RawData) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()) as Record<string, unknown>);
    });
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
  assert.equal(relay.runtime()?.activeChannels, 3);
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
