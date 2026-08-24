import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, readFileSync, unlinkSync } from "node:fs";
import { isSea } from "node:sea";
import { createConnection, type Socket } from "node:net";
import { sessionHostLogPath, sessionHostPidPath, sessionHostSocketPath, sessionHostStatusPath, betterCodexHome, betterCodexProfile, peerBetterCodexHome, ensureDirectories, sourceProcessArguments, token } from "./config.js";
import { sessionHostProtocolVersion, type SessionHostDelivery, type SessionHostMessage, type SessionHostPollRequest, type SessionHostServerMessage, type SessionHostStatus, type SessionHostThreadAction } from "./session-host-protocol.js";
import type { SessionRelayHost } from "./session-relay.js";

function hostArguments() {
  if (isSea()) return ["session-host"];
  return sourceProcessArguments(["session-host"]);
}

function diagnostic(event: string, detail: Record<string, unknown> = {}) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "session_host_client", event, runtime_pid: process.pid, ...detail })}`);
}

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
      ? execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"; if ($process) { $process.CreationDate.ToUniversalTime().ToString('o') }`], { encoding: "utf8", windowsHide: true }).trim()
      : execFileSync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }).trim();
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
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
  if (!args) throw new Error("session_host_source_unavailable");
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

function readHostStatus(home: string, profile: string) {
  const statusPath = home === betterCodexHome ? sessionHostStatusPath : `${home}/run/session-host-status.json`;
  const pidPath = home === betterCodexHome ? sessionHostPidPath : `${home}/run/session-host.pid`;
  let status: SessionHostStatus | null = null;
  let recordedPid: number | null = null;
  let error: string | null = null;
  try { status = JSON.parse(readFileSync(statusPath, "utf8")) as SessionHostStatus; } catch (cause) { error = (cause as NodeJS.ErrnoException).code === "ENOENT" ? "session_host_status_missing" : "session_host_status_invalid"; }
  try {
    const value = Number(readFileSync(pidPath, "utf8"));
    recordedPid = Number.isInteger(value) && value > 0 ? value : null;
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") error ||= "session_host_pid_invalid";
  }
  const pid = status?.host_pid ?? recordedPid;
  const alive = Boolean(pid && processAlive(pid));
  const fresh = Boolean(status?.updated_at && Date.now() - Date.parse(status.updated_at) <= 30_000);
  const pidMatches = Boolean(status && recordedPid && status.host_pid === recordedPid);
  const observedStart = pid ? processStartTime(pid) : null;
  const expectedStart = status?.started_at ? Date.parse(status.started_at) : NaN;
  const startedAtMatches = Number.isFinite(expectedStart) && observedStart !== null && Math.abs(expectedStart - observedStart) <= 1500;
  return { profile, home, status_path: statusPath, pid_path: pidPath, recorded_pid: recordedPid, alive, fresh, pid_matches: pidMatches, started_at_matches: startedAtMatches, ok: Boolean(status?.running && alive && fresh && pidMatches && startedAtMatches), error, status };
}

function discoverHostProcesses() {
  try {
    if (process.platform === "win32") {
      const source = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'session-host' -and $_.CommandLine -match 'better-codex|cli\\.(js|ts)' } | Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true }).trim();
      const parsed = source ? JSON.parse(source) : [];
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      const matches = rows.map(row => ({ pid: Number(row.ProcessId), ppid: Number(row.ParentProcessId), started_at: row.CreationDate || null, command: String(row.CommandLine || "") })).filter(row => row.pid > 0);
      const parents = new Set(matches.map(row => row.ppid));
      return { processes: matches.filter(row => !parents.has(row.pid)).map(({ ppid: _ppid, ...row }) => row), error: null };
    }
    const output = execFileSync("ps", ["-axo", "pid=,ppid=,lstart=,command="], { encoding: "utf8" });
    const matches = output.split(/\r?\n/).flatMap(line => {
      const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.{24})\s+(.+)$/);
      if (!match || !/(?:better-codex\S*|cli\.(?:js|ts))\s+session-host(?:\s|$)/i.test(match[4])) return [];
      return [{ pid: Number(match[1]), ppid: Number(match[2]), started_at: new Date(match[3]).toISOString(), command: match[4] }];
    });
    const parents = new Set(matches.map(row => row.ppid));
    const processes = matches.filter(row => !parents.has(row.pid)).map(({ ppid: _ppid, ...row }) => row);
    return { processes, error: null };
  } catch (error) {
    return { processes: [], error: error instanceof Error ? error.message : "session_host_process_discovery_failed" };
  }
}

export function sessionHostStatus() {
  const current = readHostStatus(betterCodexHome, betterCodexProfile);
  const peer = readHostStatus(peerBetterCodexHome, betterCodexProfile === "development" ? "stable" : "development");
  const discovery = discoverHostProcesses();
  const tracked = new Set([current.status?.host_pid, peer.status?.host_pid].filter((value): value is number => Boolean(value)));
  const untracked = discovery.processes.filter(process => !tracked.has(process.pid));
  return { ok: current.ok && !untracked.length && !discovery.error, current, peer, processes: discovery.processes, untracked, discovery_error: discovery.error };
}

function writeMessage(socket: Socket, message: SessionHostMessage) {
  socket.write(`${JSON.stringify(message)}\n`);
}

type ReadyWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type ThreadActionRequest = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

function transientThreadActionError(error: unknown) {
  return ["session_host_disconnected", "session_host_timeout", "session_host_unavailable", "app_server_unavailable", "app_server_timeout", "app_server_closed"].includes(error instanceof Error ? error.message : "");
}

export class SessionHostClient implements SessionRelayHost {
  private socket: Socket | null = null;
  private connecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private readonly outputs = new WeakMap<Socket, string>();
  private acknowledged = false;
  private threadActionsSupported = false;
  private readonly runtimeInstanceId = `${process.pid}:${randomUUID()}`;
  private hostIdentity: { pid: number; instanceId: string | null; connectionEpoch: number | null; startedAt: string | null } | null = null;
  private readonly readyWaiters = new Set<ReadyWaiter>();
  private readonly threadActionRequests = new Map<string, ThreadActionRequest>();

  constructor(private readonly host: SessionRelayHost) {}

  status() {
    return {
      connected: Boolean(this.socket && this.acknowledged),
      runtime_instance_id: this.runtimeInstanceId,
      host: this.hostIdentity,
      reconnecting: Boolean(this.connecting || this.reconnectTimer),
    };
  }

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
    this.acknowledged = false;
    this.threadActionsSupported = false;
    this.hostIdentity = null;
    this.rejectReadyWaiters("session_host_unavailable");
    this.rejectThreadActions("session_host_unavailable");
    socket?.destroy();
  }

  async threadAction(threadIds: string[], action: SessionHostThreadAction) {
    const ids = [...new Set(threadIds.filter(value => /^[a-f0-9-]{36}$/i.test(value)))];
    if (!ids.length) return;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await this.requestThreadAction(ids, action);
        return;
      } catch (error) {
        lastError = error;
        if (!transientThreadActionError(error) || attempt === 1) throw error;
        if (!this.stopped) void this.connect();
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("codex_thread_action_failed");
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
      this.outputs.set(socket, "");
      this.acknowledged = false;
      this.threadActionsSupported = false;
      this.hostIdentity = null;
      socket.on("data", chunk => this.read(socket, chunk));
      socket.once("error", error => diagnostic("socket_error", { error: error.message }));
      socket.once("close", () => this.disconnected(socket));
      writeMessage(socket, {
        type: "hello",
        protocol_version: sessionHostProtocolVersion,
        token: token(),
        runtime_instance_id: this.runtimeInstanceId,
      });
    } catch (error) {
      diagnostic("connect_failed", { error: error instanceof Error ? error.message : String(error) });
      try { spawnHost(); } catch (spawnError) { diagnostic("spawn_failed", { error: spawnError instanceof Error ? spawnError.message : String(spawnError) }); }
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
    this.acknowledged = false;
    this.threadActionsSupported = false;
    this.hostIdentity = null;
    this.rejectThreadActions("session_host_disconnected");
    this.scheduleReconnect();
  }

  private read(socket: Socket, chunk: Buffer) {
    if (this.socket !== socket) {
      diagnostic("fenced_host_data");
      return;
    }
    const output = (this.outputs.get(socket) || "") + String(chunk);
    if (Buffer.byteLength(output) > 8_388_608) {
      diagnostic("host_message_buffer_exceeded", { bytes: Buffer.byteLength(output) });
      socket.destroy();
      return;
    }
    const lines = output.split(/\r?\n/);
    this.outputs.set(socket, lines.pop() || "");
    for (const line of lines) {
      try { this.handle(socket, JSON.parse(line) as SessionHostServerMessage); }
      catch (error) {
        diagnostic("message_decode_failed", { error: error instanceof Error ? error.message : String(error) });
        socket.destroy();
      }
    }
  }

  private handle(socket: Socket, message: SessionHostServerMessage) {
    if (this.socket !== socket) {
      diagnostic("fenced_host_message", { message_type: message.type });
      return;
    }
    if (message.type === "hello_ack") {
      if (this.acknowledged || message.protocol_version !== sessionHostProtocolVersion || message.runtime_instance_id && message.runtime_instance_id !== this.runtimeInstanceId) {
        diagnostic("host_ack_identity_mismatch", { expected_runtime_instance_id: this.runtimeInstanceId, actual_runtime_instance_id: message.runtime_instance_id, host_pid: message.host_pid });
        socket.destroy();
        return;
      }
      this.acknowledged = true;
      this.threadActionsSupported = message.capabilities?.thread_actions === true;
      this.hostIdentity = { pid: message.host_pid, instanceId: message.host_instance_id || null, connectionEpoch: message.connection_epoch ?? null, startedAt: message.started_at || null };
      diagnostic("connected", { runtime_instance_id: this.runtimeInstanceId, host_pid: message.host_pid, host_instance_id: message.host_instance_id || null, connection_epoch: message.connection_epoch ?? null });
      this.resolveReadyWaiters();
      return;
    }
    if (!this.acknowledged) {
      diagnostic("host_message_before_ack", { message_type: message.type });
      socket.destroy();
      return;
    }
    if (message.type === "thread_action_response") {
      const request = this.threadActionRequests.get(message.request_id);
      if (!request) return;
      this.threadActionRequests.delete(message.request_id);
      clearTimeout(request.timer);
      if (message.ok) request.resolve();
      else request.reject(new Error(message.error || "codex_thread_action_failed"));
      return;
    }
    if (message.type === "poll_request") return void this.handlePoll(socket, message);
    if (message.type === "delivery") return void this.handleDelivery(socket, message).catch(error => {
      diagnostic("delivery_apply_failed", { delivery_id: message.delivery_id, kind: message.kind, error: error instanceof Error ? error.message : String(error) });
      socket.destroy();
    });
  }

  private waitUntilReady() {
    if (this.socket && this.acknowledged) return Promise.resolve();
    if (this.stopped) return Promise.reject(new Error("session_host_unavailable"));
    return new Promise<void>((resolve, reject) => {
      const waiter: ReadyWaiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.readyWaiters.delete(waiter);
          reject(new Error("session_host_timeout"));
        }, 5000),
      };
      waiter.timer.unref();
      this.readyWaiters.add(waiter);
      void this.connect();
    });
  }

  private async requestThreadAction(threadIds: string[], action: SessionHostThreadAction) {
    await this.waitUntilReady();
    if (!this.threadActionsSupported) throw new Error("session_host_thread_action_unavailable");
    const socket = this.socket;
    if (!socket) throw new Error("session_host_unavailable");
    const requestId = randomUUID();
    return new Promise<void>((resolve, reject) => {
      const request: ThreadActionRequest = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.threadActionRequests.delete(requestId);
          reject(new Error("session_host_timeout"));
        }, 30000),
      };
      request.timer.unref();
      this.threadActionRequests.set(requestId, request);
      try {
        writeMessage(socket, { type: "thread_action_request", request_id: requestId, thread_ids: threadIds, action });
      } catch (error) {
        this.threadActionRequests.delete(requestId);
        clearTimeout(request.timer);
        reject(error instanceof Error ? error : new Error("session_host_unavailable"));
      }
    });
  }

  private resolveReadyWaiters() {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    this.readyWaiters.clear();
  }

  private rejectReadyWaiters(error: string) {
    for (const waiter of this.readyWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(error));
    }
    this.readyWaiters.clear();
  }

  private rejectThreadActions(error: string) {
    for (const request of this.threadActionRequests.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(error));
    }
    this.threadActionRequests.clear();
  }

  private async handlePoll(socket: Socket, message: SessionHostPollRequest) {
    try {
      const result = await this.host.poll(message.relay_id, message.busy);
      if (this.socket === socket) writeMessage(socket, { type: "poll_response", request_id: message.request_id, result });
    } catch (error) {
      diagnostic("poll_failed", { request_id: message.request_id, relay_id: message.relay_id, error: error instanceof Error ? error.message : String(error) });
      socket.destroy();
      this.scheduleReconnect();
    }
  }

  private async handleDelivery(socket: Socket, message: SessionHostDelivery) {
    const payload = message.payload;
    try {
      if (message.kind === "release") await this.host.release(String(payload.relay_id || ""), String(payload.error || "session_host_released"));
      if (message.kind === "checkpoint") await this.host.checkpoint(String(payload.command_id || ""), String(payload.relay_id || ""), payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : {});
      if (message.kind === "complete") await this.host.complete(String(payload.command_id || ""), String(payload.relay_id || ""), payload.result && typeof payload.result === "object" ? payload.result as Record<string, unknown> : {});
      if (message.kind === "fail") await this.host.fail(String(payload.command_id || ""), String(payload.relay_id || ""), String(payload.error || "session_host_failed"), typeof payload.thread_id === "string" ? payload.thread_id : undefined, typeof payload.turn_id === "string" ? payload.turn_id : undefined);
      if (message.kind === "event") await this.host.event(String(payload.method || ""), payload.params && typeof payload.params === "object" ? payload.params as Record<string, unknown> : {});
    } finally {
      if (this.socket === socket) writeMessage(socket, { type: "delivery_ack", delivery_id: message.delivery_id });
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
  } catch (error) {
    diagnostic("graceful_stop_failed", { host_pid: pid, error: error instanceof Error ? error.message : String(error) });
    try {
      process.kill(pid, "SIGTERM");
    } catch (killError) {
      if (processAlive(pid)) throw new Error("session_host_stop_failed", { cause: killError });
    }
  }
  return { stopped: true, pid };
}
