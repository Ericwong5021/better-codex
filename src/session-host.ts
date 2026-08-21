import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type Socket } from "node:net";
import { chmodSync, closeSync, linkSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync, type Stats } from "node:fs";
import { ensureDirectories, sessionHostLockPath, sessionHostPidPath, sessionHostSocketPath, token } from "./config.js";
import { RuntimeSessionRelay, type RelayPoll, type SessionRelayHost } from "./session-relay.js";
import { sessionHostProtocolVersion, type SessionHostDelivery, type SessionHostMessage, type SessionHostServerMessage, type SessionHostThreadAction } from "./session-host-protocol.js";

type QueuedDelivery = {
  message: SessionHostDelivery;
  sent: boolean;
};

function writeMessage(socket: Socket, message: SessionHostServerMessage) {
  socket.write(`${JSON.stringify(message)}\n`);
}

type SessionHostLock = {
  pid: number;
  token: string;
  processStartedAt: string;
};

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processStartTime(pid: number) {
  try {
    const value = process.platform === "win32"
      ? execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$process = Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\"; if ($process) { $process.CreationDate.ToUniversalTime().ToString('o') }`], { encoding: "utf8", windowsHide: true }).trim()
      : execFileSync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }).trim();
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readLock(path = sessionHostLockPath) {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<SessionHostLock>;
  } catch {
    return null;
  }
}

function activeLock(owner: Partial<SessionHostLock> | null, path = sessionHostLockPath) {
  if (!owner || !Number.isInteger(owner.pid) || owner.pid! < 1) {
    try { return Date.now() - statSync(path).mtimeMs < 5000; } catch { return false; }
  }
  if (!processAlive(owner.pid!)) return false;
  if (typeof owner.processStartedAt !== "string") return true;
  const expected = Date.parse(owner.processStartedAt);
  const observed = processStartTime(owner.pid!);
  return !Number.isFinite(expected) || observed === null || Math.abs(expected - observed) <= 1500;
}

function sameFile(left: Stats, right: Stats) {
  return left.dev === right.dev && left.ino === right.ino;
}

function reapStaleLock() {
  const claimPath = `${sessionHostLockPath}.reap.${process.pid}.${randomUUID()}`;
  try {
    linkSync(sessionHostLockPath, claimPath);
    const lock = statSync(sessionHostLockPath);
    const claim = statSync(claimPath);
    const owner = readLock(claimPath);
    if (!sameFile(lock, claim) || claim.nlink !== 2 || activeLock(owner, claimPath)) return null;
    const current = statSync(sessionHostLockPath);
    const currentClaim = statSync(claimPath);
    if (!sameFile(current, currentClaim) || currentClaim.nlink !== 2) return null;
    unlinkSync(sessionHostLockPath);
    return owner ?? {};
  } catch {
    return null;
  } finally {
    try { unlinkSync(claimPath); } catch {}
  }
}

function acquireLock() {
  const owner = {
    pid: process.pid,
    token: randomUUID(),
    processStartedAt: new Date(processStartTime(process.pid) ?? Date.now()).toISOString(),
  } satisfies SessionHostLock;
  let recoveredOwner: Partial<SessionHostLock> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const descriptor = openSync(sessionHostLockPath, "wx", 0o600);
      try { writeFileSync(descriptor, JSON.stringify(owner)); } finally { closeSync(descriptor); }
      return { token: owner.token, recoveredOwner };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (activeLock(readLock())) return null;
      recoveredOwner = reapStaleLock();
      if (!recoveredOwner) return null;
    }
  }
  return null;
}

class SessionHostServer {
  private readonly server = createServer(socket => this.accept(socket));
  private readonly deliveries: QueuedDelivery[] = [];
  private readonly pendingPolls = new Map<string, (result: RelayPoll) => void>();
  private socket: Socket | null = null;
  private output = "";
  private authenticated = false;
  private shuttingDown = false;
  private lockToken: string | null = null;
  private recoveredOwner: Partial<SessionHostLock> | null = null;
  private ownsEndpoint = false;
  private retriedStaleSocket = false;
  private readonly relay = new RuntimeSessionRelay(this.proxyHost());

  start() {
    ensureDirectories();
    const lock = acquireLock();
    if (!lock) return;
    this.lockToken = lock.token;
    this.recoveredOwner = lock.recoveredOwner;
    this.listen();
    this.server.on("error", error => this.listenFailed(error as NodeJS.ErrnoException));
    process.once("SIGINT", () => this.shutdown());
    process.once("SIGTERM", () => this.shutdown());
  }

  private listen() {
    this.server.listen(sessionHostSocketPath, () => {
      this.ownsEndpoint = true;
      writeFileSync(sessionHostPidPath, String(process.pid), { mode: 0o600 });
      if (process.platform !== "win32") try { chmodSync(sessionHostSocketPath, 0o600); } catch {}
      this.relay.start();
    });
  }

  private listenFailed(error: NodeJS.ErrnoException) {
    if (error.code === "EADDRINUSE" && process.platform !== "win32" && !this.retriedStaleSocket && !this.recordedHostAlive()) {
      this.retriedStaleSocket = true;
      try { unlinkSync(sessionHostSocketPath); } catch {}
      this.listen();
      return;
    }
    this.shutdown();
  }

  private recordedHostAlive() {
    try {
      const pid = Number(readFileSync(sessionHostPidPath, "utf8"));
      if (!Number.isInteger(pid) || pid < 1 || pid === process.pid || !processAlive(pid)) return false;
      if (this.recoveredOwner?.pid === pid && typeof this.recoveredOwner.processStartedAt === "string") {
        const expected = Date.parse(this.recoveredOwner.processStartedAt);
        const observed = processStartTime(pid);
        if (Number.isFinite(expected) && observed !== null && Math.abs(expected - observed) > 1500) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private ownsLock() {
    return Boolean(this.lockToken && readLock()?.token === this.lockToken);
  }

  private releaseLock() {
    if (!this.ownsLock()) return;
    try { unlinkSync(sessionHostLockPath); } catch {}
    this.lockToken = null;
  }

  private accept(socket: Socket) {
    if (this.socket) this.socket.destroy();
    this.socket = socket;
    this.output = "";
    this.authenticated = false;
    socket.on("data", chunk => this.read(chunk));
    socket.once("close", () => {
      if (this.socket === socket) {
        this.socket = null;
        this.authenticated = false;
      }
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
      this.authenticated = true;
      if (this.socket) writeMessage(this.socket, { type: "hello_ack", protocol_version: sessionHostProtocolVersion, host_pid: process.pid, relay_id: `session-host:${process.pid}`, capabilities: { thread_actions: true } });
      this.flushDeliveries();
      return;
    }
    if (message.type === "thread_action_request") {
      const socket = this.socket;
      if (!socket || !this.authenticated) {
        socket?.destroy();
        return;
      }
      const validAction = ["archive", "unarchive", "delete"].includes(message.action);
      const validIds = Array.isArray(message.thread_ids) && message.thread_ids.every(value => typeof value === "string");
      if (!validAction || !validIds) {
        writeMessage(socket, { type: "thread_action_response", request_id: String(message.request_id || ""), ok: false, error: "session_host_thread_action_invalid" });
        return;
      }
      try {
        await this.relay.threadAction(message.thread_ids, message.action as SessionHostThreadAction);
        if (this.socket === socket) writeMessage(socket, { type: "thread_action_response", request_id: message.request_id, ok: true });
      } catch (error) {
        if (this.socket === socket) writeMessage(socket, { type: "thread_action_response", request_id: message.request_id, ok: false, error: error instanceof Error ? error.message : "codex_thread_action_failed" });
      }
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
    const finish = () => {
      if (this.ownsLock()) {
        try {
          if (Number(readFileSync(sessionHostPidPath, "utf8")) === process.pid) unlinkSync(sessionHostPidPath);
        } catch {}
        if (this.ownsEndpoint && process.platform !== "win32") try { unlinkSync(sessionHostSocketPath); } catch {}
        this.releaseLock();
      }
      process.exit(0);
    };
    if (this.server.listening) this.server.close(finish);
    else finish();
    setTimeout(() => process.exit(0), 1000).unref();
  }
}

export function startSessionHost() {
  const server = new SessionHostServer();
  server.start();
  return server;
}
