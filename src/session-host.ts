import { randomUUID } from "node:crypto";
import { createServer, type Socket } from "node:net";
import { chmodSync, existsSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, sessionHostPidPath, sessionHostSocketPath, token } from "./config.js";
import { RuntimeSessionRelay, type RelayPoll, type SessionRelayHost } from "./session-relay.js";
import { sessionHostProtocolVersion, type SessionHostDelivery, type SessionHostMessage, type SessionHostServerMessage } from "./session-host-protocol.js";

type QueuedDelivery = {
  message: SessionHostDelivery;
  sent: boolean;
};

function writeMessage(socket: Socket, message: SessionHostServerMessage) {
  socket.write(`${JSON.stringify(message)}\n`);
}

class SessionHostServer {
  private readonly server = createServer(socket => this.accept(socket));
  private readonly deliveries: QueuedDelivery[] = [];
  private readonly pendingPolls = new Map<string, (result: RelayPoll) => void>();
  private socket: Socket | null = null;
  private output = "";
  private shuttingDown = false;
  private readonly relay = new RuntimeSessionRelay(this.proxyHost());

  start() {
    ensureDirectories();
    if (process.platform !== "win32" && existsSync(sessionHostSocketPath)) {
      try { unlinkSync(sessionHostSocketPath); } catch {}
    }
    writeFileSync(sessionHostPidPath, String(process.pid), { mode: 0o600 });
    this.server.listen(sessionHostSocketPath, () => {
      if (process.platform !== "win32") try { chmodSync(sessionHostSocketPath, 0o600); } catch {}
      this.relay.start();
    });
    this.server.once("error", () => this.shutdown());
    process.once("SIGINT", () => this.shutdown());
    process.once("SIGTERM", () => this.shutdown());
  }

  private accept(socket: Socket) {
    if (this.socket) this.socket.destroy();
    this.socket = socket;
    this.output = "";
    socket.on("data", chunk => this.read(chunk));
    socket.once("close", () => {
      if (this.socket === socket) this.socket = null;
      for (const delivery of this.deliveries) delivery.sent = false;
      for (const resolve of this.pendingPolls.values()) resolve(this.offlinePoll());
      this.pendingPolls.clear();
    });
    socket.once("error", () => {});
  }

  private read(chunk: Buffer) {
    this.output += String(chunk);
    if (Buffer.byteLength(this.output) > 8_388_608) {
      this.socket?.destroy();
      return;
    }
    const lines = this.output.split(/\r?\n/);
    this.output = lines.pop() || "";
    for (const line of lines) {
      try { void this.handle(JSON.parse(line) as SessionHostMessage); } catch {}
    }
  }

  private async handle(message: SessionHostMessage) {
    if (message.type === "hello") {
      if (message.protocol_version !== sessionHostProtocolVersion || message.token !== token()) {
        this.socket?.destroy();
        return;
      }
      if (this.socket) writeMessage(this.socket, { type: "hello_ack", protocol_version: sessionHostProtocolVersion, host_pid: process.pid, relay_id: `session-host:${process.pid}` });
      this.flushDeliveries();
      return;
    }
    if (message.type === "poll_response") {
      const resolve = this.pendingPolls.get(message.request_id);
      if (!resolve) return;
      this.pendingPolls.delete(message.request_id);
      resolve(message.result as RelayPoll);
      return;
    }
    if (message.type === "delivery_ack") {
      const index = this.deliveries.findIndex(delivery => delivery.message.delivery_id === message.delivery_id);
      if (index >= 0) this.deliveries.splice(index, 1);
      return;
    }
    if (message.type === "shutdown" && message.token === token()) {
      this.shutdown();
    }
  }

  private proxyHost(): SessionRelayHost {
    return {
      poll: (relayId, busy) => this.requestPoll(relayId, busy),
      release: (relayId, error) => this.deliver("release", { relay_id: relayId, error }),
      checkpoint: (commandId, relayId, result) => this.deliver("checkpoint", { command_id: commandId, relay_id: relayId, result }),
      complete: (commandId, relayId, result) => this.deliver("complete", { command_id: commandId, relay_id: relayId, result }),
      fail: (commandId, relayId, error, threadId, turnId) => this.deliver("fail", { command_id: commandId, relay_id: relayId, error, thread_id: threadId || null, turn_id: turnId || null }),
      event: (method, params) => this.deliver("event", { method, params }),
    };
  }

  private requestPoll(relayId: string, busy: boolean) {
    if (!this.socket) return Promise.resolve(this.offlinePoll());
    const requestId = randomUUID();
    return new Promise<RelayPoll>(resolve => {
      this.pendingPolls.set(requestId, resolve);
      writeMessage(this.socket!, { type: "poll_request", request_id: requestId, relay_id: relayId, busy });
    });
  }

  private offlinePoll(): RelayPoll {
    return { leader: false, acquired: false, expires_at: new Date().toISOString(), previous_relay_id: null, command: null, thread_ids: [], active_turns: [] };
  }

  private deliver(kind: SessionHostDelivery["kind"], payload: Record<string, unknown>) {
    const message = { type: "delivery", delivery_id: randomUUID(), kind, payload } satisfies SessionHostDelivery;
    this.deliveries.push({ message, sent: false });
    if (this.deliveries.length > 4096) this.deliveries.splice(0, this.deliveries.length - 4096);
    this.flushDeliveries();
  }

  private flushDeliveries() {
    if (!this.socket) return;
    for (const delivery of this.deliveries) {
      if (delivery.sent) continue;
      writeMessage(this.socket, delivery.message);
      delivery.sent = true;
    }
  }

  private shutdown() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.relay.stop();
    this.socket?.destroy();
    this.server.close(() => {
      try { unlinkSync(sessionHostPidPath); } catch {}
      if (process.platform !== "win32") try { unlinkSync(sessionHostSocketPath); } catch {}
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000).unref();
  }
}

export function startSessionHost() {
  const server = new SessionHostServer();
  server.start();
  return server;
}
