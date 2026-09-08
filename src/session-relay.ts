import type { IssueThreadAction, SessionCommand } from "./db.js";
import type { SessionHostSemanticMethod } from "./session-host-protocol.js";
import { AppServerSessionWorker, relayDiagnostic, sessionId, type SessionRelayHost } from "./session-app-server.js";
export type { SessionRelayHost, RelayPoll } from "./session-app-server.js";

const THREAD_WORKER_RELEASE_TIMEOUT_MS = 5000;
const MAX_CONCURRENT_SESSION_COMMANDS = 8;
const THREAD_WORKER_RELEASE_POLL_MS = 25;

export class RuntimeSessionRelay {
  private readonly catalog: AppServerSessionWorker;
  private readonly workers = new Set<AppServerSessionWorker>();
  private readonly threadWorkers = new Map<string, AppServerSessionWorker>();
  private readonly workerReleaseTasks = new Map<AppServerSessionWorker, Promise<void>>();
  private readonly handedOffThreads = new Set<string>();
  private readonly runningCommands = new Map<string, Promise<void>>();
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
      awaiting_persistence: status.awaiting_persistence,
      busy_threads: status.busy_threads,
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
    return !this.pollBusy && this.runningCommands.size === 0 && this.workers.size === 0 && this.catalog.idle();
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
      if (worker && action !== "delete" && !worker.threadIsDurable(threadId)) throw new Error("thread_not_materialized");
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
    if (!worker.threadIsDurable(id)) throw new Error("thread_not_materialized");
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
        void this.releaseWorkerWhenAvailable(source, threadId, `turn_terminal:${turnId}`, turnId).catch(error => relayDiagnostic("thread_worker_release_failed", { ...this.workerReleaseDetail(source, threadId, `turn_terminal:${turnId}`), turn_id: turnId, error: error instanceof Error ? error.message : String(error) }));
      },
      onIdle: (threadId, source) => {
        void this.releaseWorkerWhenAvailable(source, threadId, "thread_idle").catch(error => relayDiagnostic("thread_worker_release_failed", { ...this.workerReleaseDetail(source, threadId, "thread_idle"), error: error instanceof Error ? error.message : String(error) }));
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

  private workerReleaseDetail(worker: AppServerSessionWorker, threadId: string, reason: string) {
    const status = worker.status();
    return {
      host_instance_id: this.hostInstanceId || null,
      thread_id: threadId,
      app_server_pid: status.app_server_pid,
      app_server_started_at: status.app_server_started_at,
      command_in_flight: status.command_in_flight,
      pending_requests: status.pending_requests,
      active_turns: status.active_turns,
      busy_threads: status.busy_threads,
      reason,
    };
  }

  private releaseWorkerWhenAvailable(worker: AppServerSessionWorker, threadId: string, reason: string, terminalTurnId = "") {
    const existing = this.workerReleaseTasks.get(worker);
    if (existing) return existing;
    let tracked: Promise<void>;
    tracked = this.waitAndReleaseWorker(worker, threadId, reason, terminalTurnId).finally(() => {
      if (this.workerReleaseTasks.get(worker) === tracked) this.workerReleaseTasks.delete(worker);
    });
    this.workerReleaseTasks.set(worker, tracked);
    return tracked;
  }

  private async waitAndReleaseWorker(worker: AppServerSessionWorker, threadId: string, reason: string, terminalTurnId: string) {
    await new Promise<void>(resolve => setImmediate(resolve));
    const startedAt = Date.now();
    let attempts = 0;
    while (this.workers.has(worker) && worker.busyForThread(threadId)) {
      const status = worker.status();
      const replacement = status.active_turns.find(turn => turn.thread_id === threadId && turn.turn_id !== terminalTurnId);
      if (replacement) {
        relayDiagnostic("thread_worker_release_superseded", { ...this.workerReleaseDetail(worker, threadId, reason), terminal_turn_id: terminalTurnId || null, replacement_turn_id: replacement.turn_id, attempts, elapsed_ms: Date.now() - startedAt });
        return;
      }
      if (terminalTurnId && !status.command_in_flight && status.pending_requests === 0 && !status.active_turns.some(turn => turn.thread_id === threadId)) break;
      attempts += 1;
      if (attempts === 1) relayDiagnostic("thread_worker_release_deferred", { ...this.workerReleaseDetail(worker, threadId, reason), terminal_turn_id: terminalTurnId || null });
      if (Date.now() - startedAt >= THREAD_WORKER_RELEASE_TIMEOUT_MS) {
        relayDiagnostic("thread_worker_release_timeout", { ...this.workerReleaseDetail(worker, threadId, reason), terminal_turn_id: terminalTurnId || null, attempts, elapsed_ms: Date.now() - startedAt });
        throw new Error("thread_worker_release_timeout");
      }
      await new Promise<void>(resolve => setTimeout(resolve, THREAD_WORKER_RELEASE_POLL_MS));
    }
    if (this.workers.has(worker) && !worker.retainUntilDurable(threadId, reason)) await this.releaseWorker(worker, threadId, reason);
  }

  private workerForThread(threadId: string) {
    if (this.handedOffThreads.has(threadId)) throw new Error("thread_handed_off");
    return this.threadWorkers.get(threadId) || this.createWorker(threadId);
  }

  private async execute(command: SessionCommand) {
    const threadId = sessionId(command.thread_id);
    let worker: AppServerSessionWorker | null = null;
    try {
      worker = threadId ? this.workerForThread(threadId) : this.createWorker();
      await worker.execute(command, this.relayId);
    } catch (error) {
      const failure = error instanceof Error ? error.message : String(error);
      relayDiagnostic("session_command_dispatch_failed", { command_id: command.id, issue_id: command.issue_id, kind: command.kind, thread_id: threadId || null, host_instance_id: this.hostInstanceId, error: failure });
      await this.host.fail(command.id, this.relayId, failure, threadId || undefined);
    }
    if (worker && !worker.hasActiveTurn() && command.kind !== "compact") {
      const boundThread = sessionId(command.thread_id) || worker.status().thread_ids[0] || "";
      if (boundThread) await this.releaseWorkerWhenAvailable(worker, boundThread, `command_complete:${command.kind}`);
      else {
        this.removeWorker(worker);
        await worker.stopAndWait();
      }
    }
  }

  private async poll() {
    if (this.pollBusy || this.stopped || this.runningCommands.size >= MAX_CONCURRENT_SESSION_COMMANDS) return;
    this.pollBusy = true;
    try {
      await this.catalog.waitUntilReady();
      const result = await this.host.poll(this.relayId, false);
      if (!result.leader) return;
      if (result.command) {
        const command = result.command;
        if (this.runningCommands.has(command.id)) throw new Error("session_command_already_dispatched");
        const execution = this.execute(command).catch(error => {
          relayDiagnostic("session_command_execution_failed", { command_id: command.id, issue_id: command.issue_id, host_instance_id: this.hostInstanceId, error: error instanceof Error ? error.message : String(error) });
        }).finally(() => {
          this.runningCommands.delete(command.id);
          void this.poll();
        });
        this.runningCommands.set(command.id, execution);
        setImmediate(() => void this.poll());
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
          if (!worker.hasActiveTurn()) await this.releaseWorkerWhenAvailable(worker, threadId, "reconciled_terminal", active.turn_id);
        }
      }
    } catch (error) {
      relayDiagnostic("coordinator_poll_failed", { host_instance_id: this.hostInstanceId || null, relay_id: this.relayId, error: error instanceof Error ? error.message : String(error) });
    } finally {
      this.pollBusy = false;
    }
  }
}
