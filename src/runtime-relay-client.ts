import WebSocket, { type RawData } from "ws";
import { PassThrough } from "node:stream";
import { once } from "node:events";
import { readRelayConfiguration, type RelayConfiguration } from "./relay-config.js";
import { decodeRelayMessage, encodeRelayMessage, relayCapabilities, relayInitialWindowBytes, relayMaxChunkBytes, relayMaxFrameBytes, relayProtocolVersion, relayWebSocketProtocol, type RelayHelloAck, type RelayMessage, type RelayRequestOpen } from "./relay-protocol.js";

type RuntimeRelayState = {
  enabled: boolean;
  relay_url: string | null;
  connected: boolean;
  runtime_instance_id: string;
  connection_epoch: number | null;
  protocol_version: string;
  last_connected_at: string | null;
  last_heartbeat_at: string | null;
  reconnect_attempts: number;
  active_channels: number;
  last_error: string | null;
};

type RuntimeChannel = {
  open: RelayRequestOpen;
  body: PassThrough | null;
  bytes: number;
  nextSequence: number;
  controller: AbortController;
  running: boolean;
  cancelled: boolean;
  responseCredit: number;
  responseCreditWaiters: Array<() => void>;
};

export type RuntimeRelayClientOptions = {
  runtimePort: () => number;
  localToken: string;
  runtimeInstanceId: string;
  coreVersion: string;
  configuration?: () => RelayConfiguration | null;
};

function errorCode(error: unknown) {
  if (error instanceof Error && error.name === "AbortError") return "request_cancelled";
  return error instanceof Error ? error.message : "relay_client_error";
}

function relaySocketUrl(configuration: RelayConfiguration) {
  const url = new URL(configuration.relay_url);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/v1/runtime/connect";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function requestHeaders(headers: Record<string, string>, token: string) {
  const allowed = new Set(["accept", "accept-language", "content-type", "if-none-match", "last-event-id", "range", "x-better-codex-request-id"]);
  const result: Record<string, string> = { authorization: `Bearer ${token}`, "x-better-codex-relay": "1" };
  for (const [name, value] of Object.entries(headers)) if (allowed.has(name.toLowerCase())) result[name.toLowerCase()] = value;
  return result;
}

function responseHeaders(headers: Headers) {
  const blocked = new Set(["connection", "keep-alive", "proxy-authenticate", "set-cookie", "transfer-encoding", "upgrade"]);
  const result: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (!blocked.has(name.toLowerCase())) result[name.toLowerCase()] = value;
  });
  return result;
}

export class RuntimeRelayClient {
  private socket: WebSocket | null = null;
  private running = false;
  private opening = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private failures = 0;
  private connectionKey = "";
  private hello: RelayHelloAck | null = null;
  private channels = new Map<string, RuntimeChannel>();
  private state: RuntimeRelayState;

  constructor(private readonly options: RuntimeRelayClientOptions) {
    this.state = { enabled: false, relay_url: null, connected: false, runtime_instance_id: options.runtimeInstanceId, connection_epoch: null, protocol_version: relayProtocolVersion, last_connected_at: null, last_heartbeat_at: null, reconnect_attempts: 0, active_channels: 0, last_error: null };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.schedule(0);
  }

  stop() {
    this.running = false;
    this.opening = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    for (const channel of this.channels.values()) {
      channel.cancelled = true;
      channel.controller.abort();
      channel.body?.destroy();
      for (const resolve of channel.responseCreditWaiters.splice(0)) resolve();
    }
    this.channels.clear();
    this.socket?.close(1000);
    this.socket = null;
    this.hello = null;
    this.state = { ...this.state, connected: false, active_channels: 0 };
  }

  reconnect() {
    this.failures = 0;
    this.state.reconnect_attempts = 0;
    this.socket?.close(1000);
    if (this.running) this.schedule(0);
  }

  status() {
    const configuration = (this.options.configuration || readRelayConfiguration)();
    return { ...this.state, enabled: Boolean(configuration), relay_url: configuration?.relay_url || null, active_channels: this.channels.size };
  }

  private schedule(delay?: number) {
    if (!this.running || this.reconnectTimer) return;
    const base = delay ?? [1000, 2000, 4000, 8000, 15000, 30000][Math.min(this.failures, 5)];
    const jitter = base ? Math.floor(base * (Math.random() * 0.3 - 0.15)) : 0;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, Math.max(0, base + jitter));
    this.reconnectTimer.unref();
  }

  private async connect() {
    const configuration = (this.options.configuration || readRelayConfiguration)();
    if (!this.running || this.opening) return;
    if (!configuration) {
      this.state = { ...this.state, enabled: false, relay_url: null, connected: false, last_error: null };
      return;
    }
    const key = `${configuration.relay_url}|${configuration.device_id}|${configuration.device_token}`;
    if (this.socket && this.connectionKey === key && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) return;
    this.connectionKey = key;
    this.opening = true;
    this.state = { ...this.state, enabled: true, relay_url: configuration.relay_url, connected: false };
    const socket = new WebSocket(relaySocketUrl(configuration), relayWebSocketProtocol, { headers: { authorization: `Bearer ${configuration.device_token}` }, handshakeTimeout: 15_000, maxPayload: relayMaxFrameBytes, perMessageDeflate: false });
    this.socket = socket;
    let authenticationFailure = false;
    socket.once("open", () => {
      this.opening = false;
      socket.send(encodeRelayMessage({ type: "hello", protocol_version: relayProtocolVersion, device_id: configuration.device_id, runtime_instance_id: this.options.runtimeInstanceId, core_version: this.options.coreVersion, capabilities: [...relayCapabilities] }));
    });
    socket.on("unexpected-response", (request, response) => {
      authenticationFailure = response.statusCode === 401 || response.statusCode === 403;
      this.state.last_error = authenticationFailure ? "unauthorized" : `relay_http_${response.statusCode}`;
      response.resume();
      request.destroy();
      socket.terminate();
    });
    socket.on("message", data => {
      try {
        const message = decodeRelayMessage(this.messageText(data));
        this.messageQueue = this.messageQueue.then(() => this.handleMessage(socket, configuration, message)).catch(error => {
          this.state.last_error = errorCode(error);
          socket.close(1008);
        });
      } catch (error) {
        this.state.last_error = errorCode(error);
        socket.close(error instanceof Error && error.message === "relay_protocol_mismatch" ? 4002 : 1008);
      }
    });
    socket.once("close", () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.opening = false;
      this.hello = null;
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      for (const channel of this.channels.values()) {
        channel.cancelled = true;
        channel.controller.abort();
        channel.body?.destroy();
        for (const resolve of channel.responseCreditWaiters.splice(0)) resolve();
      }
      this.channels.clear();
      this.state = { ...this.state, connected: false, connection_epoch: null, active_channels: 0, reconnect_attempts: this.failures + 1 };
      this.failures += 1;
      if (this.running) this.schedule(authenticationFailure ? 5 * 60_000 : undefined);
    });
    socket.once("error", error => {
      this.opening = false;
      if (!this.state.last_error) this.state.last_error = errorCode(error);
    });
  }

  private messageText(data: RawData) {
    if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
    if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
    return Buffer.from(data).toString("utf8");
  }

  private identity() {
    if (!this.hello) throw new Error("relay_not_ready");
    return { protocol_version: relayProtocolVersion, device_id: this.hello.device_id, runtime_instance_id: this.hello.runtime_instance_id, connection_epoch: this.hello.connection_epoch } as const;
  }

  private send(socket: WebSocket, message: RelayMessage) {
    if (socket !== this.socket || socket.readyState !== WebSocket.OPEN) throw new Error("relay_connection_closed");
    socket.send(encodeRelayMessage(message));
  }

  private messageQueue = Promise.resolve();

  private releaseResponseCredit(channel: RuntimeChannel, bytes: number) {
    channel.responseCredit += bytes;
    for (const resolve of channel.responseCreditWaiters.splice(0)) resolve();
  }

  private async consumeResponseCredit(channel: RuntimeChannel, bytes: number) {
    while (!channel.cancelled && channel.responseCredit < bytes) await new Promise<void>(resolve => channel.responseCreditWaiters.push(resolve));
    if (channel.cancelled) throw new DOMException("request_cancelled", "AbortError");
    channel.responseCredit -= bytes;
  }

  private async handleMessage(socket: WebSocket, configuration: RelayConfiguration, message: RelayMessage) {
    if (message.type === "hello_ack") {
      if (message.device_id !== configuration.device_id || message.runtime_instance_id !== this.options.runtimeInstanceId) throw new Error("relay_identity_mismatch");
      this.hello = message;
      this.failures = 0;
      const timestamp = new Date().toISOString();
      this.state = { ...this.state, connected: true, connection_epoch: message.connection_epoch, last_connected_at: timestamp, last_heartbeat_at: timestamp, reconnect_attempts: 0, last_error: null };
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => {
        if (!this.hello || socket.readyState !== WebSocket.OPEN) return;
        this.send(socket, { type: "heartbeat", ...this.identity(), active_channels: this.channels.size, timestamp: new Date().toISOString() });
      }, message.heartbeat_interval_ms);
      this.heartbeatTimer.unref();
      return;
    }
    if (message.type === "hello" || !this.hello || message.device_id !== this.hello.device_id || message.runtime_instance_id !== this.hello.runtime_instance_id || message.connection_epoch !== this.hello.connection_epoch) throw new Error("relay_connection_replaced");
    if (message.type === "heartbeat_ack") {
      this.state.last_heartbeat_at = message.timestamp;
      return;
    }
    if (message.type === "request_open") {
      if (this.channels.size >= this.hello.max_concurrent_channels) throw new Error("relay_channel_limit");
      if (this.channels.has(message.channel_id)) throw new Error("relay_channel_conflict");
      const method = message.method.toUpperCase();
      if (!/^(GET|HEAD|POST|PUT|PATCH|DELETE)$/.test(method)) throw new Error("method_not_allowed");
      const channel: RuntimeChannel = { open: message, body: ["GET", "HEAD"].includes(method) ? null : new PassThrough({ highWaterMark: relayMaxChunkBytes }), bytes: 0, nextSequence: 0, controller: new AbortController(), running: true, cancelled: false, responseCredit: relayInitialWindowBytes, responseCreditWaiters: [] };
      this.channels.set(message.channel_id, channel);
      void this.forward(socket, channel);
      return;
    }
    if (message.type === "request_chunk") {
      const channel = this.channels.get(message.channel_id);
      if (!channel || !channel.running || !channel.body || message.sequence !== channel.nextSequence) throw new Error("relay_chunk_sequence_invalid");
      const bytes = Buffer.from(message.data, "base64");
      channel.bytes += bytes.length;
      if (channel.bytes > 50 * 1024 * 1024) throw new Error("body_too_large");
      channel.nextSequence += 1;
      if (!channel.body.write(bytes)) await once(channel.body, "drain");
      if (!channel.cancelled) this.send(socket, { type: "window_update", ...this.identity(), channel_id: channel.open.channel_id, direction: "request", bytes: bytes.length });
      return;
    }
    if (message.type === "request_end") {
      const channel = this.channels.get(message.channel_id);
      if (!channel || !channel.running) throw new Error("relay_channel_invalid");
      channel.body?.end();
      return;
    }
    if (message.type === "request_cancel") {
      const channel = this.channels.get(message.channel_id);
      if (!channel) return;
      channel.cancelled = true;
      channel.controller.abort();
      channel.body?.destroy();
      for (const resolve of channel.responseCreditWaiters.splice(0)) resolve();
      this.channels.delete(message.channel_id);
      return;
    }
    if (message.type === "window_update") {
      const channel = this.channels.get(message.channel_id);
      if (message.direction !== "response") throw new Error("relay_channel_invalid");
      if (!channel) return;
      this.releaseResponseCredit(channel, message.bytes);
      return;
    }
    throw new Error("unsupported_relay_message");
  }

  private async forward(socket: WebSocket, channel: RuntimeChannel) {
    const timer = setTimeout(() => channel.controller.abort(), 120_000);
    timer.unref();
    try {
      const method = channel.open.method.toUpperCase();
      const port = this.options.runtimePort();
      if (!Number.isInteger(port) || port < 1) throw new Error("runtime_unavailable");
      const init: RequestInit & { duplex?: "half" } = { method, headers: requestHeaders(channel.open.headers, this.options.localToken), signal: channel.controller.signal };
      if (channel.body) {
        init.body = channel.body as unknown as BodyInit;
        init.duplex = "half";
      }
      const response = await fetch(`http://127.0.0.1:${port}${channel.open.path}`, init);
      if (channel.cancelled) return;
      clearTimeout(timer);
      this.send(socket, { type: "response_open", ...this.identity(), channel_id: channel.open.channel_id, status: response.status, headers: responseHeaders(response.headers) });
      const reader = response.body?.getReader();
      let sequence = 0;
      if (reader) {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          const bytes = Buffer.from(next.value);
          for (let offset = 0; offset < bytes.length; offset += relayMaxChunkBytes) {
            const chunk = bytes.subarray(offset, Math.min(bytes.length, offset + relayMaxChunkBytes));
            await this.consumeResponseCredit(channel, chunk.length);
            this.send(socket, { type: "response_chunk", ...this.identity(), channel_id: channel.open.channel_id, sequence, data: chunk.toString("base64") });
            sequence += 1;
          }
        }
      }
      this.send(socket, { type: "response_end", ...this.identity(), channel_id: channel.open.channel_id });
    } catch (error) {
      if (!channel.cancelled && socket.readyState === WebSocket.OPEN && this.hello) {
        this.send(socket, { type: "response_error", ...this.identity(), channel_id: channel.open.channel_id, error: errorCode(error) });
      }
    } finally {
      clearTimeout(timer);
      this.channels.delete(channel.open.channel_id);
    }
  }
}
