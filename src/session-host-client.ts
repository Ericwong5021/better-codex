import { spawn } from "node:child_process";
import { closeSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { isSea } from "node:sea";
import { createConnection, type Socket } from "node:net";
import { sessionHostLogPath, sessionHostPidPath, sessionHostSocketPath, betterCodexHome, ensureDirectories, sourceProcessArguments, token } from "./config.js";
import { sessionHostProtocolVersion, type SessionHostDelivery, type SessionHostMessage, type SessionHostPollRequest, type SessionHostServerMessage } from "./session-host-protocol.js";
import type { SessionRelayHost } from "./session-relay.js";

function hostArguments() {
  if (isSea()) return ["session-host"];
  return sourceProcessArguments(["session-host"]);
}

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function hostPid() {
  try {
    const pid = Number(readFileSync(sessionHostPidPath, "utf8"));
    return Number.isInteger(pid) && pid > 0 && processAlive(pid) ? pid : null;
  } catch {
    return null;
  }
}

function spawnHost() {
  const args = hostArguments();
  if (!args) return;
  ensureDirectories();
  const descriptor = openSync(sessionHostLogPath, "a");
  const child = spawn(process.execPath, args, {
    cwd: isSea() ? betterCodexHome : process.cwd(),
    detached: true,
    env: { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    stdio: ["ignore", descriptor, descriptor],
    windowsHide: true,
  });
  child.unref();
  closeSync(descriptor);
}

function writeMessage(socket: Socket, message: SessionHostMessage) {
  socket.write(`${JSON.stringify(message)}\n`);
}

export class SessionHostClient implements SessionRelayHost {
  private socket: Socket | null = null;
  private connecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private output = "";

  constructor(private readonly host: SessionRelayHost) {}

  start() {
    if (!this.stopped || process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY === "1" || process.env.BETTER_CODEX_DISABLE_DELEGATION === "1" || process.env.NODE_TEST_CONTEXT) return;
    this.stopped = false;
    void this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    socket?.destroy();
  }

  poll(relayId: string, busy: boolean) {
    return this.host.poll(relayId, busy);
  }

  release(relayId: string, error: string) {
    return this.host.release(relayId, error);
  }

  checkpoint(commandId: string, relayId: string, result: Record<string, unknown>) {
    return this.host.checkpoint(commandId, relayId, result);
  }

  complete(commandId: string, relayId: string, result: Record<string, unknown>) {
    return this.host.complete(commandId, relayId, result);
  }

  fail(commandId: string, relayId: string, error: string, threadId?: string, turnId?: string) {
    return this.host.fail(commandId, relayId, error, threadId, turnId);
  }

  event(method: string, params: Record<string, unknown>) {
    return this.host.event(method, params);
  }

  private async connect() {
    if (this.stopped || this.socket || this.connecting) return;
    this.connecting = true;
    try {
      let socket = await this.openSocket();
      this.socket = socket;
      this.output = "";
      socket.on("data", chunk => this.read(chunk));
      socket.once("error", () => {});
      socket.once("close", () => this.disconnected(socket));
      writeMessage(socket, {
        type: "hello",
        protocol_version: sessionHostProtocolVersion,
        token: token(),
        runtime_instance_id: `${process.pid}:${Date.now()}`,
      });
    } catch {
      try { spawnHost(); } catch {}
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private openSocket() {
    return new Promise<Socket>((resolve, reject) => {
      const socket = createConnection(sessionHostSocketPath);
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error("session_host_timeout"));
      }, 1500);
      timer.unref();
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve(socket);
      });
      socket.once("error", error => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, 1000);
    this.reconnectTimer.unref();
  }

  private disconnected(socket: Socket) {
    if (this.socket !== socket) return;
    this.socket = null;
    this.scheduleReconnect();
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
      try { this.handle(JSON.parse(line) as SessionHostServerMessage); } catch {}
    }
  }

  private handle(message: SessionHostServerMessage) {
    if (message.type === "hello_ack") return;
    if (message.type === "poll_request") return void this.handlePoll(message);
    if (message.type === "delivery") return void this.handleDelivery(message);
  }

  private async handlePoll(message: SessionHostPollRequest) {
    try {
      const result = await this.host.poll(message.relay_id, message.busy);
      if (this.socket) writeMessage(this.socket, { type: "poll_response", request_id: message.request_id, result });
    } catch {
      this.scheduleReconnect();
    }
  }

  private async handleDelivery(message: SessionHostDelivery) {
    const payload = message.payload;
    try {
      if (message.kind === "release") await this.host.release(String(payload.relay_id || ""), String(payload.error || "session_host_released"));
      if (message.kind === "checkpoint") await this.host.checkpoint(String(payload.command_id || ""), String(payload.relay_id || ""), payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : {});
      if (message.kind === "complete") await this.host.complete(String(payload.command_id || ""), String(payload.relay_id || ""), payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : {});
      if (message.kind === "fail") await this.host.fail(String(payload.command_id || ""), String(payload.relay_id || ""), String(payload.error || "session_host_failed"), typeof payload.thread_id === "string" ? payload.thread_id : undefined, typeof payload.turn_id === "string" ? payload.turn_id : undefined);
      if (message.kind === "event") await this.host.event(String(payload.method || ""), payload.params && typeof payload.params === "object" ? payload.params as Record<string, unknown> : {});
    } finally {
      if (this.socket) writeMessage(this.socket, { type: "delivery_ack", delivery_id: message.delivery_id });
    }
  }
}

export async function stopSessionHostProcess() {
  const pid = hostPid();
  if (!pid) {
    try { unlinkSync(sessionHostPidPath); } catch {}
    return { stopped: false };
  }
  try {
    const socket = await new Promise<Socket>((resolve, reject) => {
      const connection = createConnection(sessionHostSocketPath);
      const timer = setTimeout(() => { connection.destroy(); reject(new Error("session_host_timeout")); }, 1500);
      timer.unref();
      connection.once("connect", () => { clearTimeout(timer); resolve(connection); });
      connection.once("error", error => { clearTimeout(timer); reject(error); });
    });
    writeMessage(socket, { type: "shutdown", token: token() });
    socket.end();
  } catch {
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
  return { stopped: true, pid };
}
