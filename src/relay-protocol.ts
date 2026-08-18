export const relayProtocolVersion = "relay/v1" as const;
export const relayWebSocketProtocol = "better-codex-relay-v1" as const;
export const relayCapabilities = ["http-stream", "sse", "file-upload", "request-cancel"] as const;
export const relayMaxChunkBytes = 256 * 1024;
export const relayMaxFrameBytes = 512 * 1024;
export const relayInitialWindowBytes = 1024 * 1024;

export type RelayCapability = typeof relayCapabilities[number];

export type RelayHello = {
  type: "hello";
  protocol_version: typeof relayProtocolVersion;
  device_id: string;
  runtime_instance_id: string;
  core_version: string;
  capabilities: RelayCapability[];
};

export type RelayHelloAck = {
  type: "hello_ack";
  protocol_version: typeof relayProtocolVersion;
  device_id: string;
  runtime_instance_id: string;
  connection_epoch: number;
  heartbeat_interval_ms: number;
  max_concurrent_channels: number;
  max_chunk_bytes: number;
};

type RelayIdentity = {
  protocol_version: typeof relayProtocolVersion;
  device_id: string;
  runtime_instance_id: string;
  connection_epoch: number;
};

export type RelayHeartbeat = RelayIdentity & {
  type: "heartbeat";
  active_channels: number;
  timestamp: string;
};

export type RelayHeartbeatAck = RelayIdentity & {
  type: "heartbeat_ack";
  timestamp: string;
};

export type RelayRequestOpen = RelayIdentity & {
  type: "request_open";
  channel_id: string;
  request_id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
};

export type RelayRequestChunk = RelayIdentity & {
  type: "request_chunk";
  channel_id: string;
  sequence: number;
  data: string;
};

export type RelayRequestEnd = RelayIdentity & {
  type: "request_end";
  channel_id: string;
};

export type RelayRequestCancel = RelayIdentity & {
  type: "request_cancel";
  channel_id: string;
  reason: string;
};

export type RelayResponseOpen = RelayIdentity & {
  type: "response_open";
  channel_id: string;
  status: number;
  headers: Record<string, string>;
};

export type RelayResponseChunk = RelayIdentity & {
  type: "response_chunk";
  channel_id: string;
  sequence: number;
  data: string;
};

export type RelayResponseEnd = RelayIdentity & {
  type: "response_end";
  channel_id: string;
};

export type RelayResponseError = RelayIdentity & {
  type: "response_error";
  channel_id: string;
  error: string;
};

export type RelayWindowUpdate = RelayIdentity & {
  type: "window_update";
  channel_id: string;
  direction: "request" | "response";
  bytes: number;
};

export type RelayMessage = RelayHello | RelayHelloAck | RelayHeartbeat | RelayHeartbeatAck | RelayRequestOpen | RelayRequestChunk | RelayRequestEnd | RelayRequestCancel | RelayResponseOpen | RelayResponseChunk | RelayResponseEnd | RelayResponseError | RelayWindowUpdate;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_relay_message");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, limit = 4096) {
  if (typeof value !== "string" || !value || value.length > limit || value.includes("\0")) throw new Error("invalid_relay_message");
  return value;
}

function requiredInteger(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new Error("invalid_relay_message");
  return Number(value);
}

function validateIdentity(value: Record<string, unknown>) {
  requiredString(value.device_id, 200);
  requiredString(value.runtime_instance_id, 200);
  requiredInteger(value.connection_epoch, 1);
}

function validateHeaders(value: unknown) {
  const headers = record(value);
  if (Object.keys(headers).length > 64) throw new Error("invalid_relay_headers");
  for (const [name, header] of Object.entries(headers)) {
    if (!/^[a-z0-9-]{1,80}$/.test(name) || typeof header !== "string" || header.length > 8192 || /[\r\n\0]/.test(header)) throw new Error("invalid_relay_headers");
  }
}

function validateChunk(value: Record<string, unknown>) {
  requiredString(value.channel_id, 200);
  requiredInteger(value.sequence, 0);
  if (typeof value.data !== "string" || value.data.length > Math.ceil(relayMaxChunkBytes * 4 / 3) + 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data)) throw new Error("invalid_relay_chunk");
  const bytes = Buffer.from(value.data, "base64");
  if (!bytes.length || bytes.byteLength > relayMaxChunkBytes) throw new Error("invalid_relay_chunk");
}

export function encodeRelayMessage(message: RelayMessage) {
  const value = JSON.stringify(message);
  if (Buffer.byteLength(value) > relayMaxFrameBytes) throw new Error("relay_frame_too_large");
  return value;
}

export function decodeRelayMessage(source: string | Uint8Array) {
  const text = typeof source === "string" ? source : new TextDecoder().decode(source);
  if (Buffer.byteLength(text) > relayMaxFrameBytes) throw new Error("relay_frame_too_large");
  const value = record(JSON.parse(text));
  if (value.protocol_version !== relayProtocolVersion) throw new Error("relay_protocol_mismatch");
  const type = requiredString(value.type, 80);
  if (type === "hello") {
    requiredString(value.device_id, 200);
    requiredString(value.runtime_instance_id, 200);
    requiredString(value.core_version, 100);
    if (!Array.isArray(value.capabilities) || value.capabilities.some(capability => !relayCapabilities.includes(capability as RelayCapability))) throw new Error("invalid_relay_capabilities");
  } else if (type === "hello_ack") {
    validateIdentity(value);
    requiredInteger(value.heartbeat_interval_ms, 1000, 300000);
    requiredInteger(value.max_concurrent_channels, 1, 1024);
    requiredInteger(value.max_chunk_bytes, 1024, relayMaxChunkBytes);
  } else {
    validateIdentity(value);
    if (type === "heartbeat") {
      requiredInteger(value.active_channels, 0, 1024);
      requiredString(value.timestamp, 100);
    } else if (type === "heartbeat_ack") {
      requiredString(value.timestamp, 100);
    } else if (type === "request_open") {
      requiredString(value.channel_id, 200);
      requiredString(value.request_id, 200);
      requiredString(value.method, 16);
      const path = requiredString(value.path, 8192);
      if (!path.startsWith("/") || path.startsWith("//")) throw new Error("invalid_relay_path");
      validateHeaders(value.headers);
    } else if (type === "request_chunk" || type === "response_chunk") {
      validateChunk(value);
    } else if (type === "request_end" || type === "response_end") {
      requiredString(value.channel_id, 200);
    } else if (type === "request_cancel") {
      requiredString(value.channel_id, 200);
      requiredString(value.reason, 200);
    } else if (type === "response_open") {
      requiredString(value.channel_id, 200);
      requiredInteger(value.status, 100, 599);
      validateHeaders(value.headers);
    } else if (type === "response_error") {
      requiredString(value.channel_id, 200);
      requiredString(value.error, 200);
    } else if (type === "window_update") {
      requiredString(value.channel_id, 200);
      if (value.direction !== "request" && value.direction !== "response") throw new Error("invalid_relay_message");
      requiredInteger(value.bytes, 1, 16 * 1024 * 1024);
    } else {
      throw new Error("unsupported_relay_message");
    }
  }
  return value as RelayMessage;
}
