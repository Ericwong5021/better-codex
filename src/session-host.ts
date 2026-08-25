import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, type Socket } from "node:net";
import { chmodSync, closeSync, linkSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync, type Stats } from "node:fs";
import { betterCodexHome, betterCodexProfile, ensureDirectories, sessionHostLockPath, sessionHostPidPath, sessionHostSocketPath, sessionHostStatusPath, sessionHostTransportPath, token } from "./config.js";
import { RuntimeSessionRelay, type RelayPoll, type SessionRelayHost } from "./session-relay.js";
import { sessionHostProtocolVersion, type SessionHostDelivery, type SessionHostMessage, type SessionHostSemanticMethod, type SessionHostServerMessage, type SessionHostStatus, type SessionHostThreadAction } from "./session-host-protocol.js";
import { SessionHostTransport } from "./session-host-transport.js";

type RuntimeConnection = {
  socket: Socket;
  epoch: number;
  output: string;
  authenticated: boolean;
  runtimeInstanceId: string | null;
  runtimeGeneration: number | null;
  runtimeVersion: string | null;
  handoffUpdateId: string | null;
  connectedAt: string;
  authTimer: NodeJS.Timeout;
};

function diagnostic(event: string, detail: Record<string, unknown> = {}) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "session_host", event, host_pid: process.pid, ...detail })}`);
}

function semanticResponseError(error: unknown) {
  const value = error instanceof Error ? error.message : String(error || "");
  const status = value.match(/(?:http|status(?: code)?)[^0-9]{0,12}([45][0-9]{2})/i)?.[1];
  if (status) return `UPSTREAM_HTTP_${status}`;
  if (["semantic_method_not_allowed", "app_server_unavailable", "app_server_timeout", "app_server_closed", "app_server_request_failed"].includes(value)) return value;
  return "app_server_request_failed";
}

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
  private readonly pendingPolls = new Map<string, (result: RelayPoll) => void>();
  private readonly connections = new Set<RuntimeConnection>();
  private readonly sentDeliveries = new Set<string>();
  private connection: RuntimeConnection | null = null;
  private connectionEpoch = 0;
  private highestRuntimeGeneration = 0;
  private shuttingDown = false;
  private lockToken: string | null = null;
  private recoveredOwner: Partial<SessionHostLock> | null = null;
  private ownsEndpoint = false;
  private retriedStaleSocket = false;
  private readonly hostInstanceId = randomUUID();
  private readonly transport = new SessionHostTransport(sessionHostTransportPath, this.hostInstanceId);
  private readonly startedAt = new Date(processStartTime(process.pid) ?? Date.now()).toISOString();
  private runtimeDisconnectedAt: string | null = null;
  private handoff: SessionHostStatus["handoff"] = null;
  private orphanTimer: NodeJS.Timeout | null = null;
  private statusTimer: NodeJS.Timeout | null = null;
  private readonly relay = new RuntimeSessionRelay(this.proxyHost(), this.hostInstanceId);

  start() {
    ensureDirectories();
    const lock = acquireLock();
    if (!lock) {
      diagnostic("duplicate_host_rejected", { lock_path: sessionHostLockPath });
      return;
    }
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
      this.writeStatus();
      this.statusTimer = setInterval(() => this.writeStatus(), 10_000);
      this.statusTimer.unref();
      this.scheduleOrphanShutdown();
      diagnostic("started", { host_instance_id: this.hostInstanceId, profile: betterCodexProfile, home: betterCodexHome });
    });
  }

  private listenFailed(error: NodeJS.ErrnoException) {
    if (error.code === "EADDRINUSE" && process.platform !== "win32" && !this.retriedStaleSocket && !this.recordedHostAlive()) {
      this.retriedStaleSocket = true;
      try { unlinkSync(sessionHostSocketPath); } catch {}
      this.listen();
      return;
    }
    diagnostic("listen_failed", { error: error.message, code: error.code || null });
    this.shutdown(1);
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

  private writeStatus(running = true) {
    const relay = this.relay.status();
    const transport = this.transport.stats();
    const connection = this.connection?.authenticated ? this.connection : null;
    const status = {
      protocol_version: sessionHostProtocolVersion,
      profile: betterCodexProfile,
      home: betterCodexHome,
      host_pid: process.pid,
      host_instance_id: this.hostInstanceId,
      started_at: this.startedAt,
      running,
      connection_epoch: this.connectionEpoch,
      runtime_instance_id: connection?.runtimeInstanceId ?? null,
      runtime_generation: connection?.runtimeGeneration ?? null,
      runtime_version: connection?.runtimeVersion ?? null,
      runtime_connected: Boolean(connection),
      runtime_connected_at: connection?.connectedAt ?? null,
      runtime_disconnected_at: this.runtimeDisconnectedAt,
      ...relay,
      ...transport,
      handoff: this.handoff,
      updated_at: new Date().toISOString(),
    } satisfies SessionHostStatus;
    const temporary = `${sessionHostStatusPath}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(status), { mode: 0o600 });
    renameSync(temporary, sessionHostStatusPath);
  }

  private handoffSnapshot() {
    const relay = this.relay.status();
    const transport = this.transport.stats();
    return {
      host_instance_id: this.hostInstanceId,
      app_server_pid: relay.app_server_pid,
      app_server_started_at: relay.app_server_started_at,
      command_in_flight: relay.command_in_flight,
      active_turns: relay.active_turns,
      ...transport,
    };
  }

  private scheduleOrphanShutdown(delay = 300_000) {
    if (this.orphanTimer) clearTimeout(this.orphanTimer);
    this.orphanTimer = setTimeout(() => {
      this.orphanTimer = null;
      if (this.connection?.authenticated) return;
      const transport = this.transport.stats();
      if (!this.relay.idle() || transport.queued_deliveries > 0) {
        diagnostic("orphan_shutdown_deferred", { ...this.relay.status(), ...transport });
        this.scheduleOrphanShutdown(60_000);
        return;
      }
      diagnostic("orphan_shutdown", { disconnected_at: this.runtimeDisconnectedAt, ...transport });
      this.shutdown();
    }, delay);
    this.orphanTimer.unref();
  }

  private accept(socket: Socket) {
    if (this.connections.size >= 16) {
      diagnostic("connection_limit_rejected", { connections: this.connections.size });
      socket.destroy();
      return;
    }
    const authTimer = setTimeout(() => {
      diagnostic("authentication_timeout");
      socket.destroy();
    }, 2000);
    authTimer.unref();
    const connection = { socket, epoch: 0, output: "", authenticated: false, runtimeInstanceId: null, runtimeGeneration: null, runtimeVersion: null, handoffUpdateId: null, connectedAt: new Date().toISOString(), authTimer } satisfies RuntimeConnection;
    this.connections.add(connection);
    socket.on("data", chunk => this.read(connection, chunk));
    socket.once("close", () => {
      clearTimeout(connection.authTimer);
      this.connections.delete(connection);
      if (this.connection !== connection) return;
      this.connection = null;
      this.runtimeDisconnectedAt = new Date().toISOString();
      this.sentDeliveries.clear();
      for (const resolve of this.pendingPolls.values()) resolve(this.offlinePoll());
      this.pendingPolls.clear();
      this.writeStatus();
      this.scheduleOrphanShutdown();
      diagnostic("runtime_disconnected", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId });
    });
    socket.once("error", error => diagnostic("runtime_socket_error", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId, error: error.message }));
  }

  private read(connection: RuntimeConnection, chunk: Buffer) {
    if (!this.connections.has(connection)) {
      diagnostic("fenced_runtime_data", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId });
      return;
    }
    connection.output += String(chunk);
    if (Buffer.byteLength(connection.output) > 8_388_608) {
      diagnostic("runtime_message_buffer_exceeded", { connection_epoch: connection.epoch, bytes: Buffer.byteLength(connection.output) });
      connection.socket.destroy();
      return;
    }
    const lines = connection.output.split(/\r?\n/);
    connection.output = lines.pop() || "";
    for (const line of lines) {
      try {
        void this.handle(connection, JSON.parse(line) as SessionHostMessage).catch(error => {
          diagnostic("message_failed", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId, error: error instanceof Error ? error.message : String(error) });
          connection.socket.destroy();
        });
      } catch (error) {
        diagnostic("message_decode_failed", { connection_epoch: connection.epoch, error: error instanceof Error ? error.message : String(error) });
        connection.socket.destroy();
      }
    }
  }

  private async handle(connection: RuntimeConnection, message: SessionHostMessage) {
    if (message.type === "hello") {
      const validGeneration = Number.isSafeInteger(message.runtime_generation) && message.runtime_generation > 0;
      const validCapabilities = message.capabilities?.durable_deliveries === true && message.capabilities?.runtime_handoff === true;
      const staleGeneration = validGeneration && message.runtime_generation < this.highestRuntimeGeneration;
      const handoffMismatch = this.handoff && (message.runtime_generation < this.handoff.target_runtime_generation || message.handoff_update_id !== this.handoff.update_id);
      if (connection.authenticated || message.protocol_version !== sessionHostProtocolVersion || message.token !== token() || message.profile !== betterCodexProfile || !message.runtime_version || !validGeneration || !validCapabilities || staleGeneration || handoffMismatch) {
        const error = staleGeneration || handoffMismatch ? "stale_runtime_generation" : "runtime_authentication_failed";
        diagnostic(error, { connection_epoch: connection.epoch, runtime_instance_id: message.runtime_instance_id, runtime_generation: message.runtime_generation, highest_runtime_generation: this.highestRuntimeGeneration, handoff_update_id: message.handoff_update_id, protocol_version: message.protocol_version, profile: message.profile });
        connection.socket.destroy();
        return;
      }
      const previous = this.connection;
      if (previous && previous !== connection) {
        diagnostic("runtime_connection_replaced", { previous_epoch: previous.epoch, previous_runtime_instance_id: previous.runtimeInstanceId, next_runtime_instance_id: message.runtime_instance_id });
        previous.socket.destroy();
        this.sentDeliveries.clear();
        for (const resolve of this.pendingPolls.values()) resolve(this.offlinePoll());
        this.pendingPolls.clear();
      }
      connection.epoch = ++this.connectionEpoch;
      connection.authenticated = true;
      clearTimeout(connection.authTimer);
      connection.runtimeInstanceId = message.runtime_instance_id;
      connection.runtimeGeneration = message.runtime_generation;
      connection.runtimeVersion = message.runtime_version;
      connection.handoffUpdateId = message.handoff_update_id;
      connection.connectedAt = new Date().toISOString();
      this.connection = connection;
      this.highestRuntimeGeneration = Math.max(this.highestRuntimeGeneration, message.runtime_generation);
      this.runtimeDisconnectedAt = null;
      if (this.orphanTimer) clearTimeout(this.orphanTimer);
      this.orphanTimer = null;
      writeMessage(connection.socket, { type: "hello_ack", protocol_version: sessionHostProtocolVersion, host_pid: process.pid, host_instance_id: this.hostInstanceId, connection_epoch: connection.epoch, runtime_instance_id: message.runtime_instance_id, runtime_generation: message.runtime_generation, started_at: this.startedAt, relay_id: `session-host:${process.pid}`, capabilities: { thread_actions: true, durable_deliveries: true, runtime_handoff: true, semantic_requests: true } });
      this.writeStatus();
      diagnostic("runtime_connected", { connection_epoch: connection.epoch, runtime_instance_id: message.runtime_instance_id, runtime_generation: message.runtime_generation, runtime_version: message.runtime_version, handoff_update_id: message.handoff_update_id });
      this.flushDeliveries();
      return;
    }
    if (message.type === "shutdown") {
      if (message.token !== token()) {
        diagnostic("shutdown_authentication_failed", { connection_epoch: connection.epoch });
        connection.socket.destroy();
        return;
      }
      this.shutdown();
      return;
    }
    if (this.connection !== connection) {
      diagnostic("fenced_runtime_message", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId, message_type: message.type });
      connection.socket.destroy();
      return;
    }
    if (message.type === "thread_action_request") {
      if (!connection.authenticated) {
        connection.socket.destroy();
        return;
      }
      const validAction = ["archive", "unarchive", "delete"].includes(message.action);
      const validIds = Array.isArray(message.thread_ids) && message.thread_ids.every(value => typeof value === "string");
      if (!validAction || !validIds) {
        writeMessage(connection.socket, { type: "thread_action_response", request_id: String(message.request_id || ""), ok: false, error: "session_host_thread_action_invalid" });
        return;
      }
      try {
        await this.relay.threadAction(message.thread_ids, message.action as SessionHostThreadAction);
        if (this.connection === connection) writeMessage(connection.socket, { type: "thread_action_response", request_id: message.request_id, ok: true });
      } catch (error) {
        if (this.connection === connection) writeMessage(connection.socket, { type: "thread_action_response", request_id: message.request_id, ok: false, error: error instanceof Error ? error.message : "codex_thread_action_failed" });
      }
      return;
    }
    if (message.type === "semantic_request") {
      const methods: SessionHostSemanticMethod[] = ["skills/list", "app/installed", "app/list", "plugin/installed", "mcpServerStatus/list", "fuzzyFileSearch"];
      const deadline = Date.parse(message.deadline_at);
      const validParams = message.params && typeof message.params === "object" && !Array.isArray(message.params) && Buffer.byteLength(JSON.stringify(message.params)) <= 131_072;
      const identity = () => {
        const status = this.relay.status();
        return { host_instance_id: this.hostInstanceId, app_server_pid: status.app_server_pid, app_server_started_at: status.app_server_started_at, app_server_version: status.app_server_version, catalog_generation: `${this.hostInstanceId}:${status.app_server_pid || 0}:${status.app_server_started_at || ""}` };
      };
      if (!connection.authenticated || !methods.includes(message.method) || !validParams || !Number.isFinite(deadline) || deadline <= Date.now()) {
        writeMessage(connection.socket, { type: "semantic_response", request_id: String(message.request_id || ""), ok: false, error: "semantic_request_invalid", identity: identity() });
        return;
      }
      try {
        const response = await this.relay.semanticRequest(message.method, message.params, Math.min(30_000, Math.max(1, deadline - Date.now())));
        if (this.connection === connection) writeMessage(connection.socket, { type: "semantic_response", request_id: message.request_id, ok: true, result: response.result, identity: { host_instance_id: this.hostInstanceId, ...response.identity, catalog_generation: `${this.hostInstanceId}:${response.identity.catalog_generation}` } });
      } catch (error) {
        if (this.connection === connection) writeMessage(connection.socket, { type: "semantic_response", request_id: message.request_id, ok: false, error: semanticResponseError(error), identity: identity() });
      }
      return;
    }
    if (message.type === "begin_handoff") {
      const validUpdateId = /^[a-f0-9-]{36}$/i.test(message.update_id);
      const validGeneration = Number.isSafeInteger(message.target_runtime_generation) && message.target_runtime_generation > (connection.runtimeGeneration || 0);
      const deadline = Date.parse(message.deadline_at);
      if (!validUpdateId || !validGeneration || !Number.isFinite(deadline) || deadline <= Date.now()) {
        writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: false, error: "session_host_handoff_invalid", handoff: this.handoff, snapshot: this.handoffSnapshot() });
        return;
      }
      if (this.handoff && (this.handoff.update_id !== message.update_id || this.handoff.target_runtime_generation !== message.target_runtime_generation)) {
        writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: false, error: "session_host_handoff_conflict", handoff: this.handoff, snapshot: this.handoffSnapshot() });
        return;
      }
      this.handoff ||= {
        update_id: message.update_id,
        source_runtime_instance_id: connection.runtimeInstanceId || "",
        source_runtime_generation: connection.runtimeGeneration || 0,
        target_runtime_generation: message.target_runtime_generation,
        target_version: message.target_version,
        started_at: new Date().toISOString(),
        deadline_at: message.deadline_at,
      };
      this.highestRuntimeGeneration = Math.max(this.highestRuntimeGeneration, message.target_runtime_generation);
      this.writeStatus();
      diagnostic("runtime_handoff_started", { ...this.handoff, active_turns: this.relay.status().active_turns, ...this.transport.stats() });
      writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: true, handoff: this.handoff, snapshot: this.handoffSnapshot() });
      return;
    }
    if (message.type === "complete_handoff") {
      const valid = this.handoff
        ? this.handoff.update_id === message.update_id && connection.handoffUpdateId === message.update_id && (connection.runtimeGeneration || 0) >= this.handoff.target_runtime_generation
        : connection.handoffUpdateId === message.update_id;
      if (!valid) {
        writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: false, error: "session_host_handoff_mismatch", handoff: this.handoff, snapshot: this.handoffSnapshot() });
        return;
      }
      const completed = this.handoff;
      this.handoff = null;
      this.writeStatus();
      diagnostic("runtime_handoff_completed", { update_id: message.update_id, source_runtime_instance_id: completed?.source_runtime_instance_id || null, runtime_instance_id: connection.runtimeInstanceId, runtime_generation: connection.runtimeGeneration, active_turns: this.relay.status().active_turns, ...this.transport.stats() });
      writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: true, handoff: null, snapshot: this.handoffSnapshot() });
      return;
    }
    if (message.type === "cancel_handoff") {
      const valid = this.handoff && this.handoff.update_id === message.update_id && connection.runtimeInstanceId === this.handoff.source_runtime_instance_id && connection.runtimeGeneration === this.handoff.source_runtime_generation;
      if (!valid) {
        writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: false, error: "session_host_handoff_mismatch", handoff: this.handoff, snapshot: this.handoffSnapshot() });
        return;
      }
      this.handoff = null;
      this.highestRuntimeGeneration = connection.runtimeGeneration || this.highestRuntimeGeneration;
      this.writeStatus();
      diagnostic("runtime_handoff_cancelled", { update_id: message.update_id, runtime_instance_id: connection.runtimeInstanceId, runtime_generation: connection.runtimeGeneration });
      writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: true, handoff: null, snapshot: this.handoffSnapshot() });
      return;
    }
    if (message.type === "handoff_status_request") {
      writeMessage(connection.socket, { type: "handoff_response", request_id: message.request_id, ok: true, handoff: this.handoff, snapshot: this.handoffSnapshot() });
      return;
    }
    if (!connection.authenticated) {
      connection.socket.destroy();
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
      this.transport.acknowledge(message);
      this.sentDeliveries.delete(message.delivery_id);
      this.writeStatus();
      return;
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
    const connection = this.connection?.authenticated ? this.connection : null;
    if (!connection) return Promise.resolve(this.offlinePoll());
    const requestId = randomUUID();
    return new Promise<RelayPoll>(resolve => {
      this.pendingPolls.set(requestId, resolve);
      try {
        writeMessage(connection.socket, { type: "poll_request", request_id: requestId, relay_id: relayId, busy: busy || Boolean(this.handoff) });
      } catch (error) {
        this.pendingPolls.delete(requestId);
        diagnostic("poll_delivery_failed", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId, request_id: requestId, error: error instanceof Error ? error.message : String(error) });
        resolve(this.offlinePoll());
        connection.socket.destroy();
      }
    });
  }

  private offlinePoll(): RelayPoll {
    return { leader: false, acquired: false, expires_at: new Date().toISOString(), previous_relay_id: null, command: null, thread_ids: [], active_turns: [] };
  }

  private deliver(kind: SessionHostDelivery["kind"], payload: Record<string, unknown>) {
    const message = this.transport.enqueue(kind, payload);
    diagnostic("delivery_queued", { delivery_id: message.delivery_id, host_instance_id: message.host_instance_id, sequence: message.sequence, kind: message.kind, queued_deliveries: this.transport.stats().queued_deliveries });
    this.writeStatus();
    this.flushDeliveries();
  }

  private flushDeliveries() {
    const connection = this.connection?.authenticated ? this.connection : null;
    if (!connection) return;
    for (const delivery of this.transport.pending()) {
      if (this.sentDeliveries.has(delivery.delivery_id)) continue;
      try {
        writeMessage(connection.socket, delivery);
        this.sentDeliveries.add(delivery.delivery_id);
      } catch (error) {
        diagnostic("delivery_failed", { connection_epoch: connection.epoch, runtime_instance_id: connection.runtimeInstanceId, delivery_id: delivery.delivery_id, host_instance_id: delivery.host_instance_id, sequence: delivery.sequence, kind: delivery.kind, error: error instanceof Error ? error.message : String(error) });
        connection.socket.destroy();
        return;
      }
    }
  }

  private shutdown(exitCode = 0) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    if (this.orphanTimer) clearTimeout(this.orphanTimer);
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.orphanTimer = null;
    this.statusTimer = null;
    this.relay.stop();
    for (const connection of this.connections) connection.socket.destroy();
    this.connections.clear();
    this.connection = null;
    try { this.writeStatus(false); } catch (error) { diagnostic("final_status_write_failed", { error: error instanceof Error ? error.message : String(error) }); }
    this.transport.close();
    const finish = () => {
      if (this.ownsLock()) {
        try {
          if (Number(readFileSync(sessionHostPidPath, "utf8")) === process.pid) unlinkSync(sessionHostPidPath);
        } catch {}
        if (this.ownsEndpoint && process.platform !== "win32") try { unlinkSync(sessionHostSocketPath); } catch {}
        this.releaseLock();
      }
      process.exit(exitCode);
    };
    if (this.server.listening) this.server.close(finish);
    else finish();
    setTimeout(() => process.exit(exitCode), 1000).unref();
  }
}

export function startSessionHost() {
  const server = new SessionHostServer();
  server.start();
  return server;
}
