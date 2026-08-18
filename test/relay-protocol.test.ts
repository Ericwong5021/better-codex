import assert from "node:assert/strict";
import test from "node:test";
import { decodeRelayMessage, encodeRelayMessage, relayMaxChunkBytes, relayProtocolVersion } from "../src/relay-protocol.js";

test("relay protocol accepts a compatible hello and rejects incompatible versions", () => {
  const hello = { type: "hello", protocol_version: relayProtocolVersion, device_id: "device-a", runtime_instance_id: "runtime-a", core_version: "0.5.0", capabilities: ["http-stream", "sse", "file-upload", "request-cancel"] } as const;
  assert.deepEqual(decodeRelayMessage(encodeRelayMessage(hello)), hello);
  assert.throws(() => decodeRelayMessage(JSON.stringify({ ...hello, protocol_version: "relay/v0" })), /relay_protocol_mismatch/);
});

test("relay protocol validates connection identity and chunk bounds", () => {
  const base = { protocol_version: relayProtocolVersion, device_id: "device-a", runtime_instance_id: "runtime-a", connection_epoch: 2 } as const;
  const chunk = { ...base, type: "request_chunk", channel_id: "channel-a", sequence: 0, data: Buffer.alloc(relayMaxChunkBytes, 1).toString("base64") } as const;
  assert.equal(decodeRelayMessage(encodeRelayMessage(chunk)).type, "request_chunk");
  assert.throws(() => decodeRelayMessage(JSON.stringify({ ...chunk, connection_epoch: 0 })), /invalid_relay_message/);
  assert.throws(() => decodeRelayMessage(JSON.stringify({ ...chunk, data: Buffer.alloc(relayMaxChunkBytes + 1, 1).toString("base64") })), /invalid_relay_chunk|relay_frame_too_large/);
});

test("relay protocol validates request paths and headers", () => {
  const request = { type: "request_open", protocol_version: relayProtocolVersion, device_id: "device-a", runtime_instance_id: "runtime-a", connection_epoch: 1, channel_id: "channel-a", request_id: "request-a", method: "POST", path: "/api/issues", headers: { "content-type": "application/json" } } as const;
  assert.deepEqual(decodeRelayMessage(encodeRelayMessage(request)), request);
  assert.throws(() => decodeRelayMessage(JSON.stringify({ ...request, path: "https://example.com/api/issues" })), /invalid_relay_path/);
  assert.throws(() => decodeRelayMessage(JSON.stringify({ ...request, headers: { cookie: "value\r\nInjected: true" } })), /invalid_relay_headers/);
});
