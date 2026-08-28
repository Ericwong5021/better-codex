import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";
import type { IssueThreadAction, SessionCommand } from "./db.js";
import { compileInputDocument, normalizeInputDocument } from "./codex-input-document.js";
import { normalizeCodexSemanticInput } from "./codex-semantics.js";
import type { SessionHostSemanticMethod } from "./session-host-protocol.js";

export type RelayPoll = {
  leader: boolean;
  acquired: boolean;
  expires_at: string;
  previous_relay_id: string | null;
  command: SessionCommand | null;
  thread_ids: string[];
  active_turns: Array<{ thread_id: string; turn_id: string }>;
};

export type SessionRelayHost = {
  poll: (relayId: string, busy: boolean) => RelayPoll | Promise<RelayPoll>;
  release: (relayId: string, error: string) => void | Promise<void>;
  checkpoint: (commandId: string, relayId: string, result: Record<string, unknown>) => void | Promise<void>;
  complete: (commandId: string, relayId: string, result: Record<string, unknown>) => void | Promise<void>;
  fail: (commandId: string, relayId: string, error: string, threadId?: string, turnId?: string) => void | Promise<void>;
  event: (method: string, params: Record<string, unknown>) => void;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  method: string;
  startedAt: number;
};

type RelayEvent = {
  method: string;
  params: Record<string, unknown>;
};

type AppServerWorkerOptions = {
  role: "catalog" | "thread";
  catalog?: AppServerSessionWorker;
  onThreadBound?: (threadId: string, worker: AppServerSessionWorker) => void;
  onTerminal?: (threadId: string, turnId: string, worker: AppServerSessionWorker) => void;
  onIdle?: (threadId: string, worker: AppServerSessionWorker) => void;
  onDisconnected?: (threadIds: string[], error: string, worker: AppServerSessionWorker) => void;
};

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function semanticDiagnostic(event: string, detail: Record<string, unknown>) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "semantic_compiler", event, host_instance_id: detail.host_instance_id || null, app_server_pid: detail.app_server_pid || null, app_server_started_at: detail.app_server_started_at || null, app_server_version: detail.app_server_version || null, ...detail })}`);
}

function relayDiagnostic(event: string, detail: Record<string, unknown>) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "session_relay", event, ...detail })}`);
}

function codexVersion(executable: string) {
  try {
    return execFileSync(executable, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 5000 }).trim().match(/\b(\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?)\b/)?.[1] || "unknown";
  } catch {
    return "unknown";
  }
}

function sessionId(value: unknown) {
  const id = typeof value === "string" ? value : "";
  return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
}

function appServerError(value: unknown) {
  if (typeof value === "string" && value) return value;
  const error = object(value);
  if (typeof error.message === "string" && error.message) return error.message;
  if (typeof error.code === "string" && error.code) return error.code;
  return "app_server_request_failed";
}

function codexError(value: unknown) {
  const error = object(value);
  const info = error.codexErrorInfo;
  if (typeof info === "string") return { code: info, httpStatusCode: null };
  const structured = object(info);
  const code = Object.keys(structured)[0] || "other";
  const detail = object(structured[code]);
  const httpStatusCode = Number.isInteger(detail.httpStatusCode) ? Number(detail.httpStatusCode) : null;
  return { code, httpStatusCode };
}

function retryKind(code: string) {
  if (code === "httpConnectionFailed") return "network";
  if (["responseStreamConnectionFailed", "responseStreamDisconnected", "responseTooManyFailedAttempts"].includes(code)) return "stream";
  if (code === "serverOverloaded") return "overloaded";
  if (code === "usageLimitExceeded") return "rate_limit";
  return "service";
}

function missingThread(error: unknown) {
  const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return value.includes("thread not found") || value.includes("thread_not_found") || value.includes("rollout not found");
}

function actionAlreadyApplied(action: IssueThreadAction, error: unknown) {
  const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
  if (action === "archive") return value.includes("already archived") || value.includes("thread_archived");
  if (action === "unarchive") return value.includes("not archived") || value.includes("already unarchived");
  return missingThread(error);
}

function eventTurnId(event: RelayEvent) {
  if (["error", "item/started", "item/completed"].includes(event.method)) return sessionId(event.params.turnId);
  if (event.method === "turn/started" || event.method === "turn/completed") return sessionId(object(event.params.turn).id);
  return "";
}

class AppServerSessionWorker {
  private child: ChildProcessWithoutNullStreams | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private commandInFlight = false;
  private generation = 0;
  private sequence = 0;
  private output = "";
  private currentThreadId = "";
  private readonly threads = new Set<string>();
  private readonly busyThreads = new Set<string>();
  private readonly activeTurns = new Map<string, string>();
  private readonly pending = new Map<number, PendingRequest>();
  private readonly guardianDenials = new Map<string, Array<Record<string, unknown>>>();
  private bufferedEvents: RelayEvent[] = [];
  private operationQueue: Promise<void> = Promise.resolve();
  private appServerStartedAt: string | null = null;
  private appServerVersion = "";
  private appServerReady = false;
  private readonly readyWaiters = new Set<{ resolve: () => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private terminalTurn: { threadId: string; turnId: string } | null = null;

  constructor(private readonly host: SessionRelayHost, private readonly hostInstanceId: string, private readonly options: AppServerWorkerOptions) {}

  status() {
    return {
      app_server_pid: this.child?.pid ?? null,
      app_server_started_at: this.appServerStartedAt,
      app_server_version: this.appServerVersion,
      app_server_connected: Boolean(this.child),
      command_in_flight: this.commandInFlight,
      pending_requests: this.pending.size,
      active_turns: [...this.activeTurns].map(([thread_id, turn_id]) => ({ thread_id, turn_id })).sort((left, right) => left.thread_id.localeCompare(right.thread_id)),
      busy_threads: [...this.busyThreads].sort(),
      role: this.options.role,
      thread_ids: [...this.threads].sort(),
    };
  }

  idle() {
    return !this.commandInFlight && this.pending.size === 0 && this.activeTurns.size === 0;
  }

  start() {
    if (!this.stopped || process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY === "1") return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    const child = this.child;
    this.appServerReady = false;
    this.rejectPending("runtime_stopped");
    this.rejectReadyWaiters("app_server_stopped");
    if (child) child.kill("SIGTERM");
    else {
      this.appServerStartedAt = null;
      this.appServerVersion = "";
      this.activeTurns.clear();
      this.busyThreads.clear();
    }
  }

  async stopAndWait(timeout = 5000) {
    const child = this.child;
    this.stop();
    if (!child) return;
    if (child.exitCode !== null || child.signalCode !== null) {
      this.disconnect(child, "app_server_stopped");
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        const killed = setTimeout(() => reject(new Error("app_server_stop_timeout")), 2000);
        killed.unref();
        child.once("close", () => { clearTimeout(killed); resolve(); });
      }, timeout);
      timer.unref();
      child.once("close", () => { clearTimeout(timer); resolve(); });
    });
  }

  waitUntilReady(timeout = 10000) {
    if (this.child && this.appServerReady) return Promise.resolve();
    if (this.stopped) return Promise.reject(new Error("app_server_unavailable"));
    return new Promise<void>((resolve, reject) => {
      const waiter = { resolve, reject, timer: setTimeout(() => {
        this.readyWaiters.delete(waiter);
        reject(new Error("app_server_timeout"));
      }, timeout) };
      waiter.timer.unref();
      this.readyWaiters.add(waiter);
    });
  }

  hasActiveTurn() {
    return this.activeTurns.size > 0;
  }

  ownsThread(threadId: string) {
    return this.threads.has(threadId) || this.currentThreadId === threadId || this.activeTurns.has(threadId) || this.busyThreads.has(threadId);
  }

  busyForThread(threadId: string) {
    return (this.commandInFlight && this.currentThreadId === threadId) || this.activeTurns.has(threadId) || this.busyThreads.has(threadId) || (this.pending.size > 0 && this.ownsThread(threadId));
  }

  threadAction(threadIds: string[], action: IssueThreadAction) {
    const ids = [...new Set(threadIds.filter(value => /^[a-f0-9-]{36}$/i.test(value)))];
    if (!ids.length) return Promise.resolve();
    return this.serialize(async () => {
      for (const threadId of ids) {
        try {
          await this.request(`thread/${action}`, { threadId });
        } catch (error) {
          if (!missingThread(error) && !actionAlreadyApplied(action, error)) throw error;
        }
        if (action !== "unarchive") this.threads.delete(threadId);
      }
    });
  }

  async semanticRequest(method: SessionHostSemanticMethod, params: Record<string, unknown>, timeout = 8000) {
    const methods: SessionHostSemanticMethod[] = ["skills/list", "app/installed", "app/list", "plugin/installed", "mcpServerStatus/list", "fuzzyFileSearch"];
    if (!methods.includes(method)) throw new Error("semantic_method_not_allowed");
    if (!this.child || !this.appServerReady) throw new Error("app_server_unavailable");
    const result = await this.request(method, params, timeout);
    if (!this.child || !this.appServerReady) throw new Error("app_server_unavailable");
    return {
      result,
      identity: {
        app_server_pid: this.child.pid ?? null,
        app_server_started_at: this.appServerStartedAt,
        app_server_version: this.appServerVersion,
        catalog_generation: `${this.generation}:${this.child.pid ?? 0}:${this.appServerStartedAt || ""}`,
      },
    };
  }

  private serialize<T>(operation: () => Promise<T>) {
    const result = this.operationQueue.then(() => operation(), () => operation());
    this.operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private connect() {
    if (this.stopped || this.child) return;
    this.generation += 1;
    this.output = "";
    const child = spawn(codexExecutablePath(), ["app-server"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child = child;
    this.appServerStartedAt = new Date().toISOString();
    child.stdout.on("data", chunk => this.read(chunk));
    child.stderr.on("data", chunk => {
      const message = String(chunk).trim().slice(0, 2000);
      if (message) console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "session_relay", event: "app_server_stderr", host_instance_id: this.hostInstanceId || null, app_server_pid: child.pid || null, message })}`);
    });
    child.once("error", error => this.disconnect(child, error.message || "app_server_unavailable"));
    child.once("close", () => this.disconnect(child, "app_server_closed"));
    void this.initialize(child);
  }

  private async initialize(child: ChildProcessWithoutNullStreams) {
    try {
      const initialized = object(await this.request("initialize", {
        clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion },
        capabilities: { experimentalApi: true },
      }, 10000));
      if (this.child !== child || this.stopped) return;
      this.appServerVersion = String(object(initialized.serverInfo).version || initialized.version || codexVersion(codexExecutablePath()));
      this.appServerReady = true;
      this.resolveReadyWaiters();
      this.notify("initialized", {});
    } catch (error) {
      this.disconnect(child, error instanceof Error ? error.message : "app_server_initialize_failed");
    }
  }

  private disconnect(child: ChildProcessWithoutNullStreams, error: string) {
    if (this.child !== child) return;
    const intentional = this.stopped;
    const affectedThreads = [...new Set([...this.threads, ...this.activeTurns.keys(), ...this.busyThreads])];
    relayDiagnostic("app_server_disconnected", {
      host_instance_id: this.hostInstanceId || null,
      app_server_pid: child.pid || null,
      app_server_started_at: this.appServerStartedAt,
      app_server_version: this.appServerVersion || null,
      error,
      exit_code: child.exitCode,
      signal_code: child.signalCode,
      pending_requests: this.pending.size,
      command_in_flight: this.commandInFlight,
      thread_id: this.currentThreadId || null,
    });
    this.child = null;
    this.appServerStartedAt = null;
    this.appServerVersion = "";
    this.appServerReady = false;
    this.activeTurns.clear();
    this.busyThreads.clear();
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.commandInFlight = false;
    this.currentThreadId = "";
    this.bufferedEvents = [];
    this.rejectPending(error);
    this.rejectReadyWaiters(error);
    if (!intentional) this.options.onDisconnected?.(affectedThreads, error, this);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    if (this.options.role === "catalog" && !this.stopped && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1000);
      this.reconnectTimer.unref();
    }
  }

  private rejectPending(error: string) {
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(error));
    }
    this.pending.clear();
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

  private read(chunk: Buffer) {
    this.output += String(chunk);
    if (Buffer.byteLength(this.output) > 8_388_608) {
      if (this.child) this.disconnect(this.child, "app_server_output_too_large");
      return;
    }
    const lines = this.output.split(/\r?\n/);
    this.output = lines.pop() || "";
    for (const line of lines) {
      let message: Record<string, unknown>;
      try {
        message = object(JSON.parse(line));
      } catch {
        continue;
      }
      if (message.id !== undefined && (message.result !== undefined || message.error !== undefined) && !message.method) {
        const id = Number(message.id);
        const request = this.pending.get(id);
        if (!request) continue;
        this.pending.delete(id);
        clearTimeout(request.timer);
        const elapsed = Date.now() - request.startedAt;
        if (elapsed >= 5000) relayDiagnostic("app_server_request_slow", {
          host_instance_id: this.hostInstanceId || null,
          app_server_pid: this.child?.pid ?? null,
          app_server_started_at: this.appServerStartedAt,
          app_server_version: this.appServerVersion || null,
          request_id: id,
          method: request.method,
          elapsed_ms: elapsed,
          outcome: message.error ? "error" : "success",
          thread_id: this.currentThreadId || null,
        });
        if (message.error) request.reject(new Error(appServerError(message.error)));
        else request.resolve(message.result);
        continue;
      }
      if (typeof message.method !== "string") continue;
      if (message.id !== undefined) {
        this.respondUnsupported(message.id, message.method);
        continue;
      }
      this.handleNotification(message.method, object(message.params));
    }
  }

  private write(value: Record<string, unknown>) {
    if (!this.child || !this.child.stdin.writable) throw new Error("app_server_unavailable");
    this.child.stdin.write(`${JSON.stringify(value)}\n`);
  }

  private request(method: string, params: Record<string, unknown>, timeout = 30000) {
    const id = ++this.sequence;
    const startedAt = Date.now();
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        relayDiagnostic("app_server_request_timeout", {
          host_instance_id: this.hostInstanceId || null,
          app_server_pid: this.child?.pid ?? null,
          app_server_started_at: this.appServerStartedAt,
          app_server_version: this.appServerVersion || null,
          request_id: id,
          method,
          timeout_ms: timeout,
          elapsed_ms: Date.now() - startedAt,
          pending_requests: this.pending.size,
          command_in_flight: this.commandInFlight,
          thread_id: this.currentThreadId || null,
        });
        reject(new Error("app_server_timeout"));
      }, timeout);
      timer.unref();
      this.pending.set(id, { resolve, reject, timer, method, startedAt });
      try {
        this.write({ id, method, params });
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("app_server_unavailable"));
      }
    });
  }

  private notify(method: string, params: Record<string, unknown>) {
    this.write({ method, params });
  }

  private respondUnsupported(id: unknown, method: string) {
    try {
      this.write({ id, error: { code: -32601, message: `unsupported_server_request:${method}` } });
    } catch {}
  }

  private handleNotification(method: string, params: Record<string, unknown>) {
    if (method === "thread/started") return;
    const threadId = sessionId(params.threadId);
    if (!threadId || (!this.threads.has(threadId) && threadId !== this.currentThreadId)) return;
    if (method === "item/autoApprovalReview/completed") {
      const review = object(params.review);
      if (review.status === "denied") {
        const denials = this.guardianDenials.get(threadId) || [];
        denials.push(this.guardianEvent(params));
        this.guardianDenials.set(threadId, denials.slice(-20));
      }
      return;
    }
    if (!["thread/status/changed", "turn/started", "turn/completed", "error", "item/started", "item/completed"].includes(method)) return;
    let relayParams: Record<string, unknown> = params;
    if (method === "thread/status/changed") {
      const status = object(params.status);
      const statusType = String(status.type || "");
      if (statusType === "idle" || statusType === "notLoaded") this.busyThreads.delete(threadId);
      else if (statusType) this.busyThreads.add(threadId);
      relayParams = {
        threadId,
        status: {
          type: statusType,
          activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(value => typeof value === "string") : [],
        },
      };
      if (statusType === "idle") setImmediate(() => this.options.onIdle?.(threadId, this));
    }
    if (method === "turn/started") {
      const turn = object(params.turn);
      const turnId = sessionId(turn.id);
      if (turnId) this.activeTurns.set(threadId, turnId);
      relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || "") } };
    }
    if (method === "error") {
      const turnId = sessionId(params.turnId);
      if (!turnId) return;
      const error = object(params.error);
      const detail = codexError(error);
      relayParams = {
        threadId,
        turnId,
        willRetry: params.willRetry === true,
        error: {
          kind: retryKind(detail.code),
          code: detail.code,
          httpStatusCode: detail.httpStatusCode,
          message: String(error.message || "provider_request_failed").slice(0, 2000),
        },
        hostInstanceId: this.hostInstanceId || null,
        appServerPid: this.child?.pid || null,
      };
    }
    if (method === "item/started") {
      const item = object(params.item);
      const turnId = sessionId(params.turnId);
      if (!turnId) return;
      relayParams = { threadId, turnId, item: { type: String(item.type || "").slice(0, 100) } };
    }
    if (method === "item/completed") {
      const item = object(params.item);
      if (item.type !== "agentMessage" || typeof item.text !== "string") return;
      relayParams = { threadId, turnId: String(params.turnId || ""), item: { type: "agentMessage", text: item.text } };
    }
    if (method === "turn/completed") {
      const turn = object(params.turn);
      const turnId = sessionId(turn.id);
      if (turnId && this.activeTurns.get(threadId) === turnId) this.activeTurns.delete(threadId);
      if (!this.activeTurns.has(threadId)) this.busyThreads.delete(threadId);
      const turnError = object(turn.error);
      const items = Array.isArray(turn.items) ? turn.items.flatMap(value => {
        const item = object(value);
        return item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : [];
      }) : [];
      relayParams = {
        threadId,
        turn: {
          id: String(turn.id || ""),
          status: String(turn.status || ""),
          items,
          error: Object.keys(turnError).length ? { message: String(turnError.message || "") } : null,
        },
      };
      if (turnId) this.terminalTurn = { threadId, turnId };
    }
    const event = { method, params: relayParams };
    if (this.commandInFlight && method !== "thread/status/changed" && method !== "turn/started") this.bufferedEvents.push(event);
    else this.emit(event);
    this.settleTerminalTurn();
  }

  private emit(event: RelayEvent) {
    this.host.event(event.method, event.params);
  }

  private flush(turnId = "", includeUnmatched = false) {
    const events = this.bufferedEvents;
    this.bufferedEvents = [];
    for (const event of events) {
      const id = eventTurnId(event);
      if (includeUnmatched || !id || id === turnId) this.emit(event);
    }
  }

  private settleTerminalTurn() {
    if (!this.terminalTurn || this.commandInFlight) return;
    const terminal = this.terminalTurn;
    this.terminalTurn = null;
    this.options.onTerminal?.(terminal.threadId, terminal.turnId, this);
  }

  private heartbeat(relayId: string) {
    if (!this.child) return;
    try {
      void this.host.poll(relayId, true);
    } catch {}
  }

  execute(command: SessionCommand, relayId: string) {
    return this.serialize(() => this.executeCommand(command, relayId));
  }

  private async executeCommand(command: SessionCommand, relayId: string) {
    const payload = command.payload;
    let threadId = sessionId(command.thread_id);
    let turnId = sessionId(command.turn_id);
    if (threadId) {
      this.threads.add(threadId);
      this.options.onThreadBound?.(threadId, this);
    }
    this.commandInFlight = true;
    this.bufferedEvents = [];
    this.heartbeatTimer = setInterval(() => this.heartbeat(relayId), 2000);
    this.heartbeatTimer.unref();
    try {
      let completion: Record<string, unknown> = {};
      if (command.kind === "bind" || command.kind === "start") {
        const params: Record<string, unknown> = {
          approvalPolicy: String(payload.approval_policy || "on-request"),
          approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
          sandbox: String(payload.sandbox_mode || "workspace-write"),
        };
        if (payload.workspace_path) params.cwd = String(payload.workspace_path);
        if (payload.model) params.model = String(payload.model);
        if (payload.service_tier) params.serviceTier = String(payload.service_tier);
        if (payload.developer_instructions) params.developerInstructions = String(payload.developer_instructions);
        const started = object(await this.request("thread/start", params));
        threadId = sessionId(object(started.thread).id);
        if (!threadId) throw new Error("desktop_thread_start_invalid");
        this.currentThreadId = threadId;
        this.threads.add(threadId);
        this.options.onThreadBound?.(threadId, this);
        this.host.checkpoint(command.id, relayId, { thread_id: threadId });
        if (command.kind === "start") {
          const turn = payload.semantic_command === "review"
            ? object(await this.request("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" }))
            : object(await this.request("turn/start", await this.turnStartParams(threadId, payload)));
          turnId = sessionId(object(turn.turn).id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          this.activeTurns.set(threadId, turnId);
          this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
        }
      } else if (command.kind === "turn") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        let turn: Record<string, unknown>;
        try {
          turn = object(await this.request("turn/start", await this.turnStartParams(threadId, payload)));
        } catch (error) {
          if (!this.isThreadNotFound(error)) throw error;
          await this.resume(threadId, payload);
          turn = object(await this.request("turn/start", await this.turnStartParams(threadId, payload)));
        }
        turnId = sessionId(object(turn.turn).id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        this.activeTurns.set(threadId, turnId);
        this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      } else if (command.kind === "review") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        const review = object(await this.request("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" }));
        turnId = sessionId(object(review.turn).id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        this.activeTurns.set(threadId, turnId);
        this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      } else if (command.kind === "compact") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        await this.request("thread/compact/start", { threadId });
      } else if (command.kind === "rename") {
        if (!threadId) throw new Error("session_thread_invalid");
        const name = String(payload.title || "").trim().slice(0, 200);
        if (!name) throw new Error("thread_name_required");
        this.currentThreadId = threadId;
        await this.request("thread/name/set", { threadId, name });
        completion = { name };
        relayDiagnostic("thread_name_updated", { command_id: command.id, issue_id: command.issue_id, host_instance_id: this.hostInstanceId || null, app_server_pid: this.child?.pid ?? null, app_server_started_at: this.appServerStartedAt, app_server_version: this.appServerVersion || null, thread_id: threadId, title_length: name.length });
      } else if (command.kind === "native") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        completion = await this.executeNativeCommand(threadId, payload);
        const completedThreadId = sessionId(completion.thread_id);
        if (completedThreadId) threadId = completedThreadId;
        const completedTurnId = sessionId(completion.turn_id);
        if (completedTurnId) turnId = completedTurnId;
      } else if (command.kind === "steer") {
        if (!threadId || !turnId) throw new Error("session_turn_invalid");
        this.currentThreadId = threadId;
        const steered = object(await this.request("turn/steer", {
          threadId,
          expectedTurnId: turnId,
          input: await this.semanticInput(payload),
        }));
        turnId = sessionId(steered.turnId) || turnId;
      } else if (command.kind === "interrupt") {
        if (!threadId || !turnId) throw new Error("session_turn_invalid");
        this.currentThreadId = threadId;
        await this.request("turn/interrupt", { threadId, turnId });
      } else {
        throw new Error("session_command_invalid");
      }
      this.host.complete(command.id, relayId, { thread_id: threadId, turn_id: turnId, ...completion });
      this.commandInFlight = false;
      this.flush(turnId, command.kind === "steer" || command.kind === "interrupt" || command.kind === "compact");
      if (threadId) this.threads.add(threadId);
    } catch (error) {
      const commandError = error instanceof Error ? error.message : "app_server_request_failed";
      if (command.kind === "rename") relayDiagnostic("thread_name_failed", { command_id: command.id, issue_id: command.issue_id, host_instance_id: this.hostInstanceId || null, app_server_pid: this.child?.pid ?? null, app_server_started_at: this.appServerStartedAt, app_server_version: this.appServerVersion || null, thread_id: threadId || null, error: commandError });
      if (threadId && turnId && commandError === "session_command_not_claimed") {
        try {
          await this.request("turn/interrupt", { threadId, turnId });
        } catch {}
      }
      try {
        this.host.fail(command.id, relayId, commandError, threadId || undefined, turnId || undefined);
      } catch {}
      this.commandInFlight = false;
      this.flush("", true);
      if (commandError === "app_server_timeout" && this.child) this.disconnect(this.child, commandError);
    } finally {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      if (this.commandInFlight) {
        this.commandInFlight = false;
        this.flush("", true);
      }
      this.currentThreadId = "";
      this.settleTerminalTurn();
    }
  }

  private async turnStartParams(threadId: string, payload: Record<string, unknown>) {
    const params: Record<string, unknown> = {
      threadId,
      input: await this.semanticInput(payload),
      approvalPolicy: String(payload.approval_policy || "on-request"),
      approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
    };
    if (payload.workspace_path) params.cwd = String(payload.workspace_path);
    if (payload.model) params.model = String(payload.model);
    if (payload.effort) params.effort = String(payload.effort);
    if (payload.service_tier) params.serviceTier = String(payload.service_tier);
    return params;
  }

  private async semanticInput(payload: Record<string, unknown>) {
    if (payload.input_document && typeof payload.input_document === "object" && !Array.isArray(payload.input_document)) {
      const document = normalizeInputDocument(payload.input_document);
      const catalog = this.options.catalog || this;
      const catalogIdentity = (await catalog.semanticRequest("skills/list", { cwds: [String(payload.workspace_path || "")], forceReload: false })).identity;
      const expectedGeneration = `${this.hostInstanceId}:${catalogIdentity.catalog_generation}`;
      const references = Object.values(document.references);
      semanticDiagnostic("compile_started", { host_instance_id: this.hostInstanceId, app_server_pid: this.child?.pid ?? null, app_server_started_at: this.appServerStartedAt, app_server_version: this.appServerVersion, reference_count: references.length, reference_kinds: references.map(reference => reference.kind), part_count: document.parts.length });
      for (const reference of references) {
        if (reference.provenance?.host_instance_id && reference.provenance.host_instance_id !== this.hostInstanceId) throw new Error("REFERENCE_HOST_MISMATCH");
        if (reference.provenance?.catalog_generation && reference.provenance.catalog_generation !== expectedGeneration) throw new Error("REFERENCE_STALE");
        if (reference.provenance?.app_server_version && reference.provenance.app_server_version !== this.appServerVersion) throw new Error("APP_SERVER_VERSION_UNSUPPORTED");
        if (reference.mapping && reference.mapping.verified_version !== this.appServerVersion) throw new Error("REFERENCE_MAPPING_UNVERIFIED");
      }
      const skillReferences = references.filter(reference => reference.kind === "skill");
      if (skillReferences.length) {
        const result = object((await catalog.semanticRequest("skills/list", { cwds: [String(payload.workspace_path || "")], forceReload: false })).result);
        const skills = (Array.isArray(result.data) ? result.data : []).flatMap(entry => Array.isArray(object(entry).skills) ? object(entry).skills as unknown[] : []).map(object);
        for (const reference of skillReferences) {
          const locator = object(reference.locator);
          if (!skills.some(skill => skill.enabled !== false && skill.name === locator.name && skill.path === locator.path)) throw new Error("REFERENCE_NOT_FOUND");
        }
      }
      const appReferences = references.filter(reference => reference.kind === "app" || reference.kind === "desktop_app");
      if (appReferences.length) {
        const result = object((await catalog.semanticRequest("app/installed", { forceRefresh: false })).result);
        const apps = (Array.isArray(result.apps) ? result.apps : []).map(object);
        for (const reference of appReferences) {
          const locator = object(reference.locator);
          const id = String(locator.path || "").replace(/^app:\/\//, "");
          if (!apps.some(app => app.id === id && app.enabled === true && app.callable === true)) throw new Error("REFERENCE_DISABLED");
        }
      }
      const input = compileInputDocument(document, String(payload.workspace_path || ""));
      semanticDiagnostic("compile_completed", { host_instance_id: this.hostInstanceId, app_server_pid: this.child?.pid ?? null, app_server_started_at: this.appServerStartedAt, app_server_version: this.appServerVersion, input_types: input.map(item => item.type), input_count: input.length });
      return input;
    }
    return normalizeCodexSemanticInput(payload.input, String(payload.message || ""));
  }

  private async resume(threadId: string, payload?: Record<string, unknown>) {
    const params: Record<string, unknown> = { threadId, excludeTurns: true };
    if (payload) {
      if (payload.workspace_path) params.cwd = String(payload.workspace_path);
      if (payload.model) params.model = String(payload.model);
      if (payload.service_tier) params.serviceTier = String(payload.service_tier);
      params.approvalPolicy = String(payload.approval_policy || "on-request");
      params.approvalsReviewer = String(payload.approvals_reviewer || "auto_review");
      params.sandbox = String(payload.sandbox_mode || "workspace-write");
      params.developerInstructions = String(payload.developer_instructions || "");
    }
    const result = object(await this.request("thread/resume", params));
    if (sessionId(object(result.thread).id) !== threadId) throw new Error("desktop_thread_resume_invalid");
    this.threads.add(threadId);
    return result;
  }

  private requiredArgument(command: string, value: string) {
    if (!value) throw new Error(`native_command_argument_required:${command}`);
    return value;
  }

  private async executeNativeCommand(threadId: string, payload: Record<string, unknown>) {
    const command = String(payload.native_command || "");
    const argument = String(payload.argument || "").trim();
    const resumed = await this.resume(threadId, payload);
    if (command === "approve") {
      const denials = this.guardianDenials.get(threadId) || [];
      const event = denials.at(-1);
      if (!event) throw new Error("native_approval_not_found");
      const result = object(await this.request("thread/approveGuardianDeniedAction", { threadId, event }));
      denials.pop();
      return { thread_id: threadId, command, approved: true, response: result };
    }
    if (command === "fast") {
      const current = String(resumed.serviceTier || "default");
      const requested = argument.toLowerCase();
      const enabled = requested ? ["on", "fast", "true", "1"].includes(requested) : current !== "fast";
      if (requested && !["on", "off", "fast", "default", "true", "false", "1", "0"].includes(requested)) throw new Error("native_fast_value_invalid");
      await this.request("thread/settings/update", { threadId, serviceTier: enabled ? "fast" : null });
      return { thread_id: threadId, command, service_tier: enabled ? "fast" : "default" };
    }
    if (command === "feedback") {
      const reason = this.requiredArgument(command, argument);
      const response = object(await this.request("feedback/upload", { classification: "bug", reason, threadId, includeLogs: false }));
      return { thread_id: threadId, command, uploaded: true, response };
    }
    if (command === "fork") {
      const response = object(await this.request("thread/fork", { threadId, cwd: String(payload.workspace_path || "") || null, excludeTurns: true }));
      const forkedThreadId = sessionId(object(response.thread).id);
      if (!forkedThreadId) throw new Error("native_fork_invalid");
      if (argument) await this.request("thread/name/set", { threadId: forkedThreadId, name: argument.slice(0, 200) });
      this.threads.add(forkedThreadId);
      return { thread_id: forkedThreadId, source_thread_id: threadId, command, rebind_thread: true };
    }
    if (command === "goal") {
      const normalized = argument.toLowerCase();
      if (!argument) return { thread_id: threadId, command, ...object(await this.request("thread/goal/get", { threadId })) };
      if (["clear", "off", "none"].includes(normalized)) {
        await this.request("thread/goal/clear", { threadId });
        return { thread_id: threadId, command, goal: null };
      }
      const response = object(await this.request("thread/goal/set", { threadId, objective: argument, status: "active" }));
      return { thread_id: threadId, command, ...response };
    }
    if (command === "init") {
      const input = [{ type: "text", text: "Create an AGENTS.md file that serves as a concise contributor guide for this repository. Inspect the repository first. Include project structure, build and validation commands, coding conventions, and commit guidance that are actually supported by the repository. Do not overwrite an existing AGENTS.md; if one exists, report that clearly instead.", text_elements: [] }];
      const turn = object(await this.request("turn/start", await this.turnStartParams(threadId, { ...payload, input })));
      const turnId = sessionId(object(turn.turn).id);
      if (!turnId) throw new Error("desktop_turn_start_invalid");
      this.activeTurns.set(threadId, turnId);
      return { thread_id: threadId, turn_id: turnId, command };
    }
    if (command === "mcp") {
      const response = object(await this.request("mcpServerStatus/list", { threadId, cursor: null, limit: 100, detail: "toolsAndAuthOnly" }));
      const servers = (Array.isArray(response.data) ? response.data : []).map(value => {
        const server = object(value);
        return { name: String(server.name || ""), auth_status: String(server.authStatus || ""), tool_count: Object.keys(object(server.tools)).length, resource_count: Array.isArray(server.resources) ? server.resources.length : 0 };
      });
      return { thread_id: threadId, command, servers, next_cursor: response.nextCursor ?? null };
    }
    if (command === "memories") {
      const value = this.requiredArgument(command, argument).toLowerCase();
      if (!["on", "off", "enabled", "disabled"].includes(value)) throw new Error("native_memories_value_invalid");
      const mode = ["on", "enabled"].includes(value) ? "enabled" : "disabled";
      await this.request("thread/memoryMode/set", { threadId, mode });
      return { thread_id: threadId, command, memory_mode: mode };
    }
    if (command === "model") {
      const model = this.requiredArgument(command, argument);
      await this.request("thread/settings/update", { threadId, model });
      return { thread_id: threadId, command, model };
    }
    if (command === "personality") {
      const personality = this.requiredArgument(command, argument).toLowerCase();
      if (!["none", "friendly", "pragmatic"].includes(personality)) throw new Error("native_personality_value_invalid");
      await this.request("thread/settings/update", { threadId, personality });
      return { thread_id: threadId, command, personality };
    }
    if (command === "plan") {
      const value = argument.toLowerCase();
      if (value && !["on", "off", "plan", "default"].includes(value)) throw new Error("native_plan_value_invalid");
      const mode = ["off", "default"].includes(value) ? "default" : "plan";
      const presets = object(await this.request("collaborationMode/list", {}));
      const preset = (Array.isArray(presets.data) ? presets.data : []).map(object).find(item => item.mode === mode);
      if (!preset) throw new Error("native_plan_preset_unavailable");
      await this.request("thread/settings/update", { threadId, collaborationMode: { mode, settings: { model: preset.model || resumed.model, reasoning_effort: preset.reasoning_effort ?? resumed.reasoningEffort, developer_instructions: null } } });
      return { thread_id: threadId, command, collaboration_mode: mode };
    }
    if (command === "project") {
      const projectId = this.requiredArgument(command, argument);
      await this.request("thread/metadata/update", { threadId, projectId: projectId === "none" || projectId === "clear" ? "" : projectId });
      return { thread_id: threadId, command, project_id: projectId === "none" || projectId === "clear" ? null : projectId };
    }
    if (command === "reasoning") {
      const effort = this.requiredArgument(command, argument);
      await this.request("thread/settings/update", { threadId, effort });
      return { thread_id: threadId, command, reasoning_effort: effort };
    }
    throw new Error("native_command_invalid");
  }

  private guardianEvent(params: Record<string, unknown>) {
    const review = object(params.review);
    const source = String(object(params.action).type || "");
    const action = object(params.action);
    const commandSource = action.source === "unifiedExec" ? "unified_exec" : action.source;
    const protocol = action.protocol === "socks5Tcp" ? "socks5_tcp" : action.protocol === "socks5Udp" ? "socks5_udp" : action.protocol;
    const permissionProfile = object(action.permissions);
    const eventAction: Record<string, unknown> = source === "command"
      ? { type: "command", source: commandSource, command: action.command, cwd: action.cwd }
      : source === "execve"
        ? { type: "execve", source: commandSource, program: action.program, argv: action.argv, cwd: action.cwd }
        : source === "applyPatch"
          ? { type: "apply_patch", cwd: action.cwd, files: action.files }
          : source === "networkAccess"
            ? { type: "network_access", target: action.target, host: action.host, protocol, port: action.port }
            : source === "mcpToolCall"
              ? { type: "mcp_tool_call", server: action.server, tool_name: action.toolName, connector_id: action.connectorId ?? null, connector_name: action.connectorName ?? null, tool_title: action.toolTitle ?? null }
              : source === "requestPermissions"
                ? { type: "request_permissions", reason: action.reason ?? null, permissions: { network: permissionProfile.network ?? null, file_system: permissionProfile.fileSystem ?? null } }
                : { type: source };
    return {
      id: String(params.reviewId || ""),
      target_item_id: params.targetItemId ?? null,
      turn_id: String(params.turnId || ""),
      status: String(review.status || ""),
      risk_level: review.riskLevel ?? null,
      user_authorization: review.userAuthorization ?? null,
      rationale: review.rationale ?? null,
      decision_source: params.decisionSource ?? null,
      action: eventAction,
    };
  }

  private isThreadNotFound(error: unknown) {
    const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
    return value.includes("thread not found") || value.includes("thread_not_found");
  }

  async reconcile(values: Array<{ thread_id: string; turn_id: string }>) {
    for (const value of values) {
      const threadId = sessionId(value.thread_id);
      const turnId = sessionId(value.turn_id);
      if (!threadId || !turnId) continue;
      this.threads.add(threadId);
      this.options.onThreadBound?.(threadId, this);
      try {
        let summary = object(await this.request("thread/read", { threadId, includeTurns: false }));
        let thread = object(summary.thread);
        let status = object(thread.status);
        let statusType = String(status.type || "");
        if (statusType === "notLoaded") {
          await this.resume(threadId);
          summary = object(await this.request("thread/read", { threadId, includeTurns: false }));
          thread = object(summary.thread);
          status = object(thread.status);
          statusType = String(status.type || "");
        }
        if (statusType === "active") {
          this.activeTurns.set(threadId, turnId);
          this.emit({
            method: "thread/status/changed",
            params: {
              threadId,
              status: {
                type: statusType,
                activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(item => typeof item === "string") : [],
              },
            },
          });
          continue;
        }
        if (statusType !== "idle") continue;
        const detail = object(await this.request("thread/read", { threadId, includeTurns: true }));
        const turns = Array.isArray(object(detail.thread).turns) ? object(detail.thread).turns as unknown[] : [];
        const turn = turns.map(object).find(item => sessionId(item.id) === turnId);
        if (!turn || !["completed", "interrupted", "failed"].includes(String(turn.status || ""))) continue;
        if (this.activeTurns.get(threadId) === turnId) this.activeTurns.delete(threadId);
        if (!this.activeTurns.has(threadId)) this.busyThreads.delete(threadId);
        const items = Array.isArray(turn.items) ? turn.items.flatMap(value => {
          const item = object(value);
          return item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : [];
        }) : [];
        const error = object(turn.error);
        this.emit({
          method: "turn/completed",
          params: {
            threadId,
            turn: {
              id: turnId,
              status: String(turn.status),
              items,
              error: Object.keys(error).length ? { message: String(error.message || "") } : null,
            },
          },
        });
      } catch (error) {
        relayDiagnostic("thread_reconcile_failed", { host_instance_id: this.hostInstanceId || null, app_server_pid: this.child?.pid ?? null, thread_id: threadId, turn_id: turnId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}

export class RuntimeSessionRelay {
  private readonly catalog: AppServerSessionWorker;
  private readonly workers = new Set<AppServerSessionWorker>();
  private readonly threadWorkers = new Map<string, AppServerSessionWorker>();
  private readonly handedOffThreads = new Set<string>();
  private pollTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private pollBusy = false;
  private lastTurnProbe = 0;
  private relayGeneration = 0;
  private relayId = "";

  constructor(private readonly host: SessionRelayHost, private readonly hostInstanceId = "") {
    this.catalog = new AppServerSessionWorker(host, hostInstanceId, { role: "catalog" });
  }

  status() {
    const catalog = this.catalog.status();
    const threadWorkers = [...this.workers].map(worker => worker.status()).map(status => ({
      thread_id: status.thread_ids[0] || null,
      app_server_pid: status.app_server_pid,
      app_server_started_at: status.app_server_started_at,
      app_server_version: status.app_server_version,
      command_in_flight: status.command_in_flight,
      pending_requests: status.pending_requests,
      active_turns: status.active_turns,
      busy: status.busy_threads.length > 0,
    })).sort((left, right) => String(left.thread_id || "").localeCompare(String(right.thread_id || "")));
    const activeTurns = threadWorkers.flatMap(worker => worker.active_turns);
    return {
      app_server_pid: catalog.app_server_pid,
      app_server_started_at: catalog.app_server_started_at,
      app_server_version: catalog.app_server_version,
      app_server_connected: catalog.app_server_connected,
      command_in_flight: threadWorkers.some(worker => worker.command_in_flight),
      pending_requests: catalog.pending_requests + threadWorkers.reduce((total, worker) => total + worker.pending_requests, 0),
      active_turns: [...new Map(activeTurns.map(turn => [turn.thread_id, turn])).values()].sort((left, right) => left.thread_id.localeCompare(right.thread_id)),
      thread_workers: threadWorkers,
    };
  }

  idle() {
    return !this.pollBusy && this.workers.size === 0 && this.catalog.idle();
  }

  start() {
    if (!this.stopped || process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY === "1") return;
    this.stopped = false;
    this.relayId = `runtime:${process.pid}:${++this.relayGeneration}`;
    this.catalog.start();
    void this.catalog.waitUntilReady().then(() => this.poll()).catch(error => relayDiagnostic("catalog_start_failed", { host_instance_id: this.hostInstanceId || null, error: error instanceof Error ? error.message : String(error) }));
    this.pollTimer = setInterval(() => void this.poll(), 1000);
    this.pollTimer.unref();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    for (const worker of this.workers) worker.stop();
    this.workers.clear();
    this.threadWorkers.clear();
    this.handedOffThreads.clear();
    this.catalog.stop();
    if (this.relayId) this.host.release(this.relayId, "runtime_stopped");
  }

  async threadAction(threadIds: string[], action: IssueThreadAction) {
    for (const threadId of threadIds) {
      const worker = this.threadWorkers.get(threadId);
      if (worker?.busyForThread(threadId)) throw new Error("thread_handoff_busy");
      if (worker) await this.releaseWorker(worker, threadId, "thread_action");
    }
    await this.catalog.waitUntilReady();
    return this.catalog.threadAction(threadIds, action);
  }

  async semanticRequest(method: SessionHostSemanticMethod, params: Record<string, unknown>, timeout = 8000) {
    await this.catalog.waitUntilReady(timeout);
    return this.catalog.semanticRequest(method, params, timeout);
  }

  async handoffThread(threadId: string) {
    const id = sessionId(threadId);
    if (!id) throw new Error("thread_id_invalid");
    const worker = this.threadWorkers.get(id);
    if (!worker) {
      this.handedOffThreads.add(id);
      return { released: true, thread_id: id, worker: null };
    }
    if (worker.busyForThread(id)) throw new Error("thread_handoff_busy");
    const status = worker.status();
    this.handedOffThreads.add(id);
    await this.releaseWorker(worker, id, "desktop_handoff");
    return { released: true, thread_id: id, worker: { app_server_pid: status.app_server_pid, app_server_started_at: status.app_server_started_at } };
  }

  private createWorker(initialThreadId = "") {
    const worker = new AppServerSessionWorker(this.host, this.hostInstanceId, {
      role: "thread",
      catalog: this.catalog,
      onThreadBound: (threadId, source) => this.bindWorker(threadId, source),
      onTerminal: (threadId, turnId, source) => {
        void this.releaseWorker(source, threadId, `turn_terminal:${turnId}`).catch(error => relayDiagnostic("thread_worker_release_failed", { host_instance_id: this.hostInstanceId || null, thread_id: threadId, turn_id: turnId, error: error instanceof Error ? error.message : String(error) }));
      },
      onIdle: (threadId, source) => {
        setImmediate(() => void this.releaseWorker(source, threadId, "thread_idle").catch(error => {
          if (error instanceof Error && error.message === "thread_handoff_busy") return;
          relayDiagnostic("thread_worker_release_failed", { host_instance_id: this.hostInstanceId || null, thread_id: threadId, error: error instanceof Error ? error.message : String(error) });
        }));
      },
      onDisconnected: (threadIds, error, source) => {
        this.removeWorker(source);
        for (const threadId of threadIds) this.host.event("thread/status/changed", { threadId, status: { type: "systemError", activeFlags: [] }, error, hostInstanceId: this.hostInstanceId || null });
      },
    });
    this.workers.add(worker);
    if (initialThreadId) this.bindWorker(initialThreadId, worker);
    worker.start();
    return worker;
  }

  private bindWorker(threadId: string, worker: AppServerSessionWorker) {
    const current = this.threadWorkers.get(threadId);
    if (current && current !== worker) throw new Error("thread_worker_conflict");
    this.threadWorkers.set(threadId, worker);
  }

  private removeWorker(worker: AppServerSessionWorker) {
    this.workers.delete(worker);
    for (const [threadId, current] of this.threadWorkers) if (current === worker) this.threadWorkers.delete(threadId);
  }

  private async releaseWorker(worker: AppServerSessionWorker, threadId: string, reason: string) {
    if (!this.workers.has(worker)) return;
    if (worker.busyForThread(threadId)) throw new Error("thread_handoff_busy");
    const status = worker.status();
    await worker.stopAndWait();
    this.removeWorker(worker);
    relayDiagnostic("thread_worker_released", { host_instance_id: this.hostInstanceId || null, thread_id: threadId, app_server_pid: status.app_server_pid, app_server_started_at: status.app_server_started_at, reason });
  }

  private workerForThread(threadId: string) {
    if (this.handedOffThreads.has(threadId)) throw new Error("thread_handed_off");
    return this.threadWorkers.get(threadId) || this.createWorker(threadId);
  }

  private async execute(command: SessionCommand) {
    const threadId = sessionId(command.thread_id);
    const worker = threadId ? this.workerForThread(threadId) : this.createWorker();
    await worker.waitUntilReady();
    await worker.execute(command, this.relayId);
    if (!worker.hasActiveTurn() && command.kind !== "compact") {
      const boundThread = sessionId(command.thread_id) || worker.status().thread_ids[0] || "";
      if (boundThread) await this.releaseWorker(worker, boundThread, `command_complete:${command.kind}`);
      else {
        this.removeWorker(worker);
        await worker.stopAndWait();
      }
    }
  }

  private async poll() {
    if (this.pollBusy || this.stopped) return;
    this.pollBusy = true;
    try {
      await this.catalog.waitUntilReady();
      const result = await this.host.poll(this.relayId, false);
      if (!result.leader) return;
      if (result.command) {
        await this.execute(result.command);
        return;
      }
      if (result.active_turns.length && Date.now() - this.lastTurnProbe >= 5000) {
        this.lastTurnProbe = Date.now();
        for (const active of result.active_turns) {
          const threadId = sessionId(active.thread_id);
          if (!threadId) continue;
          const worker = this.workerForThread(threadId);
          await worker.waitUntilReady();
          await worker.reconcile([active]);
          if (!worker.hasActiveTurn()) await this.releaseWorker(worker, threadId, "reconciled_terminal");
        }
      }
    } catch (error) {
      relayDiagnostic("coordinator_poll_failed", { host_instance_id: this.hostInstanceId || null, relay_id: this.relayId, error: error instanceof Error ? error.message : String(error) });
    } finally {
      this.pollBusy = false;
    }
  }
}
