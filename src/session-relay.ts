import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";
import type { IssueThreadAction, SessionCommand } from "./db.js";
import { normalizeCodexSemanticInput } from "./codex-semantics.js";

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
  event: (method: string, params: Record<string, unknown>) => void | Promise<void>;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type RelayEvent = {
  method: string;
  params: Record<string, unknown>;
};

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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
  if (event.method === "item/completed") return sessionId(event.params.turnId);
  if (event.method === "turn/started" || event.method === "turn/completed") return sessionId(object(event.params.turn).id);
  return "";
}

export class RuntimeSessionRelay {
  private child: ChildProcessWithoutNullStreams | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private stopped = true;
  private pollBusy = false;
  private commandInFlight = false;
  private generation = 0;
  private sequence = 0;
  private relayId = "";
  private output = "";
  private lastTurnProbe = 0;
  private currentThreadId = "";
  private readonly threads = new Set<string>();
  private readonly pending = new Map<number, PendingRequest>();
  private bufferedEvents: RelayEvent[] = [];
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly host: SessionRelayHost) {}

  start() {
    if (!this.stopped || process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY === "1") return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.pollTimer = null;
    this.heartbeatTimer = null;
    const child = this.child;
    this.child = null;
    this.rejectPending("runtime_stopped");
    if (this.relayId) this.host.release(this.relayId, "runtime_stopped");
    child?.kill("SIGTERM");
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

  private serialize<T>(operation: () => Promise<T>) {
    const result = this.operationQueue.then(() => operation(), () => operation());
    this.operationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private connect() {
    if (this.stopped || this.child) return;
    this.generation += 1;
    this.relayId = `runtime:${process.pid}:${this.generation}`;
    this.output = "";
    const child = spawn(codexExecutablePath(), ["app-server"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    this.child = child;
    child.stdout.on("data", chunk => this.read(chunk));
    child.stderr.resume();
    child.once("error", error => this.disconnect(child, error.message || "app_server_unavailable"));
    child.once("close", () => this.disconnect(child, "app_server_closed"));
    void this.initialize(child);
  }

  private async initialize(child: ChildProcessWithoutNullStreams) {
    try {
      await this.request("initialize", {
        clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion },
        capabilities: { experimentalApi: true },
      }, 10000);
      if (this.child !== child || this.stopped) return;
      this.notify("initialized", {});
      await this.poll();
      if (this.child !== child || this.stopped) return;
      this.pollTimer = setInterval(() => void this.poll(), 1000);
      this.pollTimer.unref();
    } catch (error) {
      this.disconnect(child, error instanceof Error ? error.message : "app_server_initialize_failed");
    }
  }

  private disconnect(child: ChildProcessWithoutNullStreams, error: string) {
    if (this.child !== child) return;
    this.child = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.pollTimer = null;
    this.heartbeatTimer = null;
    this.pollBusy = false;
    this.commandInFlight = false;
    this.currentThreadId = "";
    this.bufferedEvents = [];
    this.rejectPending(error);
    this.host.release(this.relayId, error);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    if (!this.stopped && !this.reconnectTimer) {
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
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("app_server_timeout"));
      }, timeout);
      timer.unref();
      this.pending.set(id, { resolve, reject, timer });
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
    if (!["thread/status/changed", "turn/started", "turn/completed", "item/completed"].includes(method)) return;
    let relayParams: Record<string, unknown> = params;
    if (method === "thread/status/changed") {
      const status = object(params.status);
      relayParams = {
        threadId,
        status: {
          type: String(status.type || ""),
          activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(value => typeof value === "string") : [],
        },
      };
    }
    if (method === "turn/started") {
      const turn = object(params.turn);
      relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || "") } };
    }
    if (method === "item/completed") {
      const item = object(params.item);
      if (item.type !== "agentMessage" || typeof item.text !== "string") return;
      relayParams = { threadId, turnId: String(params.turnId || ""), item: { type: "agentMessage", text: item.text } };
    }
    if (method === "turn/completed") {
      const turn = object(params.turn);
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
    }
    const event = { method, params: relayParams };
    if (this.commandInFlight && method !== "thread/status/changed" && method !== "turn/started") this.bufferedEvents.push(event);
    else this.emit(event);
  }

  private emit(event: RelayEvent) {
    try {
      this.host.event(event.method, event.params);
    } catch {}
  }

  private flush(turnId = "", includeUnmatched = false) {
    const events = this.bufferedEvents;
    this.bufferedEvents = [];
    for (const event of events) {
      const id = eventTurnId(event);
      if (includeUnmatched || !id || id === turnId) this.emit(event);
    }
  }

  private async poll() {
    if (this.pollBusy || this.stopped || !this.child) return;
    this.pollBusy = true;
    try {
      const result = await this.host.poll(this.relayId, false);
      this.threads.clear();
      for (const value of result.thread_ids) {
        const threadId = sessionId(value);
        if (threadId) this.threads.add(threadId);
      }
      if (!result.leader) return;
      if (result.command) {
        await this.execute(result.command, this.relayId);
        return;
      }
      if (result.active_turns.length && Date.now() - this.lastTurnProbe >= 5000) {
        this.lastTurnProbe = Date.now();
        await this.reconcile(result.active_turns);
      }
    } finally {
      this.pollBusy = false;
    }
  }

  private heartbeat(relayId: string) {
    if (relayId !== this.relayId || !this.child) return;
    try {
      void this.host.poll(relayId, true);
    } catch {}
  }

  private execute(command: SessionCommand, relayId: string) {
    return this.serialize(() => this.executeCommand(command, relayId));
  }

  private async executeCommand(command: SessionCommand, relayId: string) {
    const payload = command.payload;
    let threadId = sessionId(command.thread_id);
    let turnId = sessionId(command.turn_id);
    this.commandInFlight = true;
    this.bufferedEvents = [];
    this.heartbeatTimer = setInterval(() => this.heartbeat(relayId), 2000);
    this.heartbeatTimer.unref();
    try {
      if (command.kind === "start") {
        const params: Record<string, unknown> = {
          cwd: String(payload.workspace_path || ""),
          approvalPolicy: String(payload.approval_policy || "on-request"),
          approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
          sandbox: String(payload.sandbox_mode || "workspace-write"),
        };
        if (payload.model) params.model = String(payload.model);
        if (payload.service_tier) params.serviceTier = String(payload.service_tier);
        if (payload.developer_instructions) params.developerInstructions = String(payload.developer_instructions);
        const started = object(await this.request("thread/start", params));
        threadId = sessionId(object(started.thread).id);
        if (!threadId) throw new Error("desktop_thread_start_invalid");
        this.currentThreadId = threadId;
        this.host.checkpoint(command.id, relayId, { thread_id: threadId });
        try {
          await this.request("thread/name/set", { threadId, name: String(payload.title || "Better Codex") });
        } catch {}
        const turn = object(await this.request("turn/start", this.turnStartParams(threadId, payload)));
        turnId = sessionId(object(turn.turn).id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      } else if (command.kind === "turn") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        let turn: Record<string, unknown>;
        try {
          turn = object(await this.request("turn/start", this.turnStartParams(threadId, payload)));
        } catch (error) {
          if (!this.isThreadNotFound(error)) throw error;
          await this.resume(threadId, payload);
          turn = object(await this.request("turn/start", this.turnStartParams(threadId, payload)));
        }
        turnId = sessionId(object(turn.turn).id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      } else if (command.kind === "review") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        const review = object(await this.request("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" }));
        turnId = sessionId(object(review.turn).id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        this.host.checkpoint(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      } else if (command.kind === "compact") {
        if (!threadId) throw new Error("session_thread_invalid");
        this.currentThreadId = threadId;
        await this.resume(threadId, payload);
        await this.request("thread/compact/start", { threadId });
      } else if (command.kind === "steer") {
        if (!threadId || !turnId) throw new Error("session_turn_invalid");
        this.currentThreadId = threadId;
        const steered = object(await this.request("turn/steer", {
          threadId,
          expectedTurnId: turnId,
          input: normalizeCodexSemanticInput(payload.input, String(payload.message || "")),
        }));
        turnId = sessionId(steered.turnId) || turnId;
      } else if (command.kind === "interrupt") {
        if (!threadId || !turnId) throw new Error("session_turn_invalid");
        this.currentThreadId = threadId;
        await this.request("turn/interrupt", { threadId, turnId });
      } else {
        throw new Error("session_command_invalid");
      }
      this.host.complete(command.id, relayId, { thread_id: threadId, turn_id: turnId });
      this.commandInFlight = false;
      this.flush(turnId, command.kind === "steer" || command.kind === "interrupt" || command.kind === "compact");
      if (threadId) this.threads.add(threadId);
    } catch (error) {
      const commandError = error instanceof Error ? error.message : "app_server_request_failed";
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
    }
  }

  private turnStartParams(threadId: string, payload: Record<string, unknown>) {
    const params: Record<string, unknown> = {
      threadId,
      input: normalizeCodexSemanticInput(payload.input, String(payload.message || "")),
      approvalPolicy: String(payload.approval_policy || "on-request"),
      approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
    };
    if (payload.workspace_path) params.cwd = String(payload.workspace_path);
    if (payload.model) params.model = String(payload.model);
    if (payload.effort) params.effort = String(payload.effort);
    if (payload.service_tier) params.serviceTier = String(payload.service_tier);
    return params;
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
  }

  private isThreadNotFound(error: unknown) {
    const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
    return value.includes("thread not found") || value.includes("thread_not_found");
  }

  private async reconcile(values: Array<{ thread_id: string; turn_id: string }>) {
    for (const value of values) {
      const threadId = sessionId(value.thread_id);
      const turnId = sessionId(value.turn_id);
      if (!threadId || !turnId) continue;
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
      } catch {}
    }
  }
}
