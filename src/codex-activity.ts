import { existsSync, watch, type FSWatcher } from "node:fs";
import { open, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";

export type CodexActivity = {
  status: "starting" | "ready" | "degraded" | "unavailable";
  collector: "running" | "stopped";
  watching: boolean;
  windowSeconds: number;
  tokensPerSecond: number | null;
  requestCount: number;
  speedSampleCount: number;
  outputTokens: number;
  generationSeconds: number;
  sampledAt: number;
  startedAt: number | null;
  lastCollectedAt: number | null;
  lastEventAt: number | null;
  trackedFiles: number;
  collectionCycles: number;
  bytesRead: number;
  readErrors: number;
  errors: string[];
};

type TokenEvent = {
  timestamp: number;
  outputTokens: number;
  generationMs: number | null;
  key: string;
};

type FileCursor = {
  offset: number;
  remainder: Buffer;
  totalTokens: number | null;
  requestStartedAt: number | null;
  outputStartedAt: number | null;
  outputCompletedAt: number | null;
  discardFirstLine: boolean;
  lastSeenAt: number;
};

type CollectionFailure = {
  event: string;
  code: string;
  file?: string;
};

const activityWindowMs = 60_000;
const retentionMs = 65_000;
const reconcileIntervalMs = 30_000;
const watchDebounceMs = 500;
const recentFileMs = 24 * 60 * 60 * 1000;
const maxInitialReadBytes = 8 * 1024 * 1024;
const maxLineBytes = 1024 * 1024;
const readChunkBytes = 256 * 1024;
const sessionChangeListeners = new Set<(threadId: string) => void>();

function notifySessionChange(path: string) {
  const threadId = path.match(/-([a-f0-9-]{36})\.jsonl$/i)?.[1] || "";
  if (!threadId) return;
  for (const listener of sessionChangeListeners) {
    try {
      listener(threadId);
    } catch (error) {
      diagnostic("session_change_listener_failed", { thread_id: threadId, error: errorCode(error) });
    }
  }
}

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function usageOutput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const usage = value as Record<string, unknown>;
  const output = nonNegativeInteger(usage.output_tokens);
  return output;
}

function cumulativeTotal(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return nonNegativeInteger((value as Record<string, unknown>).total_tokens);
}

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  if (error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)) return error.message;
  return "codex_activity_collection_failed";
}

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "codex_activity", event, ...fields })}`);
}

function tokenRecord(line: string) {
  if (!line.includes("token_count")) return null;
  const record = JSON.parse(line) as Record<string, unknown>;
  if (record.type !== "event_msg" || !record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Record<string, unknown>;
  if (payload.type !== "token_count" || !payload.info || typeof payload.info !== "object") return null;
  const info = payload.info as Record<string, unknown>;
  const timestamp = Date.parse(String(record.timestamp || ""));
  if (!Number.isFinite(timestamp)) throw new Error("codex_activity_timestamp_invalid");
  return {
    outputTokens: usageOutput(info.last_token_usage),
    totalTokens: cumulativeTotal(info.total_token_usage),
    timestamp,
  };
}

function generationTimingRecord(line: string) {
  const itemCompleted = line.includes('"type":"item_completed"') && (line.includes('"type":"Reasoning"') || line.includes('"type":"AgentMessage"'));
  const requestBoundary = line.includes('"type":"task_started"') || line.includes('"type":"user_message"');
  const outputCompleted = line.includes('"type":"reasoning"') || line.includes('"type":"message"') || line.includes('"type":"custom_tool_call"') || line.includes('"type":"function_call"') || line.includes('"type":"agent_message"');
  if (!itemCompleted && !requestBoundary && !outputCompleted) return null;
  const record = JSON.parse(line) as Record<string, unknown>;
  if (!record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Record<string, unknown>;
  const timestamp = Date.parse(String(record.timestamp || ""));
  if (!Number.isFinite(timestamp)) throw new Error("codex_activity_timestamp_invalid");
  if (record.type === "event_msg" && (payload.type === "task_started" || payload.type === "user_message")) return { requestStartedAt: timestamp, outputStartedAt: null, outputCompletedAt: null };
  if (record.type === "event_msg" && payload.type === "item_completed" && payload.item && typeof payload.item === "object") {
    const item = payload.item as Record<string, unknown>;
    if (item.type !== "Reasoning" && item.type !== "AgentMessage") return null;
    const startedAt = nonNegativeInteger(item.started_at_ms);
    const completedAt = nonNegativeInteger(item.completed_at_ms);
    if (startedAt === null || completedAt === null || completedAt < startedAt) throw new Error("codex_activity_generation_timing_invalid");
    return { requestStartedAt: null, outputStartedAt: startedAt, outputCompletedAt: completedAt };
  }
  if (record.type === "event_msg" && payload.type === "agent_message") return { requestStartedAt: null, outputStartedAt: null, outputCompletedAt: timestamp };
  if (record.type !== "response_item") return null;
  const type = String(payload.type);
  const assistantMessage = type === "message" && payload.role === "assistant";
  if (!["reasoning", "custom_tool_call", "function_call", "agent_message"].includes(type) && !assistantMessage) return null;
  return { requestStartedAt: null, outputStartedAt: null, outputCompletedAt: timestamp };
}

class CodexActivityCollector {
  private readonly cursors = new Map<string, FileCursor>();
  private readonly events: TokenEvent[] = [];
  private readonly eventKeys = new Set<string>();
  private readonly pendingFiles = new Set<string>();
  private watcher: FSWatcher | null = null;
  private watcherError: string | null = null;
  private reconcileTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private cycle: Promise<void> | null = null;
  private pendingCycle = false;
  private pendingDiscovery = false;
  private running = false;
  private initialized = false;
  private generation = 0;
  private startedAt = 0;
  private lastCollectedAt = 0;
  private lastEventAt = 0;
  private collectionCycles = 0;
  private bytesRead = 0;
  private readErrors = 0;
  private cycleFailures: CollectionFailure[] = [];
  private failureFingerprints = new Set<string>();

  private sessionsRoot() {
    return join(process.env.CODEX_HOME || join(homedir(), ".codex"), "sessions");
  }

  private installWatcher() {
    if (!this.running || this.watcher) return;
    const root = this.sessionsRoot();
    try {
      const watcher = watch(root, { recursive: true }, (event, filename) => this.handleWatchEvent(event, filename));
      watcher.on("error", error => {
        if (this.watcher !== watcher) return;
        watcher.close();
        this.watcher = null;
        this.setWatcherError(errorCode(error));
        this.scheduleCycle(true, 1000);
      });
      watcher.unref();
      this.watcher = watcher;
      if (this.watcherError) diagnostic("watcher_recovered", { previous_error: this.watcherError, sessions_root: root });
      this.watcherError = null;
      diagnostic("watcher_started", { sessions_root: root });
    } catch (error) {
      this.setWatcherError(errorCode(error));
    }
  }

  private handleWatchEvent(event: string, filename: string | Buffer | null) {
    if (!filename) {
      this.scheduleCycle(true);
      return;
    }
    const root = resolve(this.sessionsRoot());
    const path = resolve(root, String(filename));
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      diagnostic("watcher_path_rejected", { path });
      return;
    }
    if (path.endsWith(".jsonl")) this.pendingFiles.add(path);
    this.scheduleCycle(event === "rename");
  }

  private setWatcherError(code: string) {
    if (this.watcherError === code) return;
    this.watcherError = code;
    this.readErrors += 1;
    diagnostic("watcher_failed", { error: code, sessions_root: this.sessionsRoot() });
  }

  private scheduleCycle(discover = false, delay = watchDebounceMs) {
    if (!this.running) return;
    this.pendingCycle = true;
    this.pendingDiscovery ||= discover;
    if (this.cycle || this.debounceTimer) return;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.runScheduledCycle();
    }, delay);
    this.debounceTimer.unref();
  }

  private runScheduledCycle() {
    if (!this.running || this.cycle || !this.pendingCycle) return;
    const discover = this.pendingDiscovery;
    const files = [...this.pendingFiles];
    this.pendingCycle = false;
    this.pendingDiscovery = false;
    this.pendingFiles.clear();
    const generation = this.generation;
    const cycle = this.collect(discover, files, generation);
    this.cycle = cycle;
    void cycle.catch(error => {
      this.updateCycleFailures([{ event: "collector_cycle_failed", code: errorCode(error) }]);
    }).finally(() => {
      if (this.cycle === cycle) this.cycle = null;
      if (this.running && this.pendingCycle) this.scheduleCycle(this.pendingDiscovery, 0);
    });
  }

  private async discoverFiles(now: number) {
    const root = this.sessionsRoot();
    if (!existsSync(root)) throw new Error("codex_sessions_directory_missing");
    const dates = [new Date(now), new Date(now - 24 * 60 * 60 * 1000)];
    const recentRoots = dates.map(date => join(root, String(date.getUTCFullYear()), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")));
    const pending = this.initialized ? [...new Set(recentRoots)].filter(existsSync) : [root];
    while (pending.length) {
      const directory = pending.pop();
      if (!directory) continue;
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          pending.push(path);
          continue;
        }
        if (!entry.isFile() || !entry.name.endsWith(".jsonl") || this.cursors.has(path)) continue;
        await this.trackFile(path, now);
      }
    }
  }

  private async trackFile(path: string, now: number) {
    if (this.cursors.has(path) || !path.endsWith(".jsonl")) return;
    const fileStat = await stat(path);
    if (!fileStat.isFile() || now - fileStat.mtimeMs > recentFileMs) return;
    const readHistory = this.initialized || fileStat.mtimeMs >= this.startedAt - retentionMs;
    const offset = readHistory ? Math.max(0, fileStat.size - maxInitialReadBytes) : fileStat.size;
    this.cursors.set(path, {
      offset,
      remainder: Buffer.alloc(0),
      totalTokens: null,
      requestStartedAt: null,
      outputStartedAt: null,
      outputCompletedAt: null,
      discardFirstLine: offset > 0,
      lastSeenAt: fileStat.mtimeMs,
    });
  }

  private addEvent(timestamp: number, outputTokens: number, generationMs: number | null, cumulative: number | null) {
    const now = Date.now();
    if (timestamp > now + 5000) throw new Error("codex_activity_timestamp_in_future");
    if (outputTokens <= 0 || timestamp < now - retentionMs) return;
    const safeTimestamp = Math.min(now, timestamp);
    const key = [safeTimestamp, outputTokens, generationMs ?? "", cumulative ?? ""].join(":");
    if (this.eventKeys.has(key)) return;
    this.eventKeys.add(key);
    this.events.push({ timestamp: safeTimestamp, outputTokens, generationMs, key });
    this.lastEventAt = Math.max(this.lastEventAt, safeTimestamp);
  }

  private parseLine(cursor: FileCursor, line: string) {
    const timing = generationTimingRecord(line);
    if (timing) {
      if (timing.requestStartedAt !== null) {
        cursor.requestStartedAt = timing.requestStartedAt;
        cursor.outputStartedAt = null;
        cursor.outputCompletedAt = null;
      }
      if (timing.outputStartedAt !== null) cursor.outputStartedAt = cursor.outputStartedAt === null ? timing.outputStartedAt : Math.min(cursor.outputStartedAt, timing.outputStartedAt);
      if (timing.outputCompletedAt !== null) cursor.outputCompletedAt = cursor.outputCompletedAt === null ? timing.outputCompletedAt : Math.max(cursor.outputCompletedAt, timing.outputCompletedAt);
      return;
    }
    if (!line.includes("token_count")) return;
    const record = tokenRecord(line);
    if (!record) return;
    const generationStartedAt = cursor.outputStartedAt ?? cursor.requestStartedAt;
    const generationCompletedAt = cursor.outputCompletedAt;
    cursor.requestStartedAt = record.timestamp;
    cursor.outputStartedAt = null;
    cursor.outputCompletedAt = null;
    const previousTotal = cursor.totalTokens;
    if (record.totalTokens !== null) {
      cursor.totalTokens = record.totalTokens;
      if (previousTotal !== null && record.totalTokens <= previousTotal) return;
    }
    const generationMs = generationStartedAt !== null && generationCompletedAt !== null && generationCompletedAt > generationStartedAt
      ? generationCompletedAt - generationStartedAt
      : null;
    if (record.outputTokens !== null) this.addEvent(generationCompletedAt ?? record.timestamp, record.outputTokens, generationMs, record.totalTokens);
  }

  private async readFile(path: string, cursor: FileCursor, generation: number) {
    const fileStat = await stat(path);
    cursor.lastSeenAt = fileStat.mtimeMs;
    if (fileStat.size < cursor.offset) {
      cursor.offset = Math.max(0, fileStat.size - maxInitialReadBytes);
      cursor.remainder = Buffer.alloc(0);
      cursor.totalTokens = null;
      cursor.requestStartedAt = null;
      cursor.outputStartedAt = null;
      cursor.outputCompletedAt = null;
      cursor.discardFirstLine = cursor.offset > 0;
    }
    if (fileStat.size === cursor.offset) return false;
    const descriptor = await open(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(readChunkBytes);
      while (cursor.offset < fileStat.size) {
        const length = Math.min(buffer.length, fileStat.size - cursor.offset);
        const { bytesRead } = await descriptor.read(buffer, 0, length, cursor.offset);
        if (bytesRead <= 0) throw new Error("codex_activity_read_stalled");
        if (!this.running || generation !== this.generation) return false;
        const combined = cursor.remainder.length ? Buffer.concat([cursor.remainder, buffer.subarray(0, bytesRead)]) : buffer.subarray(0, bytesRead);
        let start = 0;
        let discardFirstLine = cursor.discardFirstLine;
        for (let index = 0; index < combined.length; index += 1) {
          if (combined[index] !== 10) continue;
          if (discardFirstLine) discardFirstLine = false;
          else {
            const end = index > start && combined[index - 1] === 13 ? index - 1 : index;
            if (end - start > maxLineBytes) throw new Error("codex_activity_line_too_large");
            this.parseLine(cursor, combined.subarray(start, end).toString("utf8"));
          }
          start = index + 1;
        }
        const remainder = Buffer.from(combined.subarray(start));
        if (remainder.length > maxLineBytes) throw new Error("codex_activity_line_too_large");
        cursor.offset += bytesRead;
        cursor.remainder = remainder;
        cursor.discardFirstLine = discardFirstLine;
        this.bytesRead += bytesRead;
      }
    } finally {
      await descriptor.close();
    }
    return true;
  }

  private prune(now: number) {
    const cutoff = now - retentionMs;
    for (let index = this.events.length - 1; index >= 0; index -= 1) {
      const event = this.events[index];
      if (!event || event.timestamp >= cutoff) continue;
      this.eventKeys.delete(event.key);
      this.events.splice(index, 1);
    }
    for (const [path, cursor] of this.cursors) {
      if (now - cursor.lastSeenAt > recentFileMs) this.cursors.delete(path);
    }
  }

  private updateCycleFailures(failures: CollectionFailure[]) {
    const fingerprints = new Set(failures.map(failure => [failure.event, failure.code, failure.file || ""].join(":")));
    for (const failure of failures) {
      const fingerprint = [failure.event, failure.code, failure.file || ""].join(":");
      if (!this.failureFingerprints.has(fingerprint)) diagnostic(failure.event, { error: failure.code, ...(failure.file ? { file: failure.file } : {}) });
    }
    if (this.failureFingerprints.size && !fingerprints.size) diagnostic("collection_recovered", { tracked_files: this.cursors.size });
    this.failureFingerprints = fingerprints;
    this.cycleFailures = failures;
    this.readErrors += failures.length;
  }

  private async collect(discover: boolean, files: string[], generation: number) {
    const failures: CollectionFailure[] = [];
    let discoverySucceeded = false;
    if (discover) {
      this.installWatcher();
      try {
        await this.discoverFiles(Date.now());
        discoverySucceeded = true;
      } catch (error) {
        failures.push({ event: "discovery_failed", code: errorCode(error) });
      }
    }
    for (const path of files) {
      try {
        await this.trackFile(path, Date.now());
      } catch (error) {
        const code = errorCode(error);
        if (code !== "ENOENT") failures.push({ event: "file_discovery_failed", code, file: path });
      }
    }
    const targets: Array<[string, FileCursor]> = discover ? [...this.cursors.entries()] : [];
    if (!discover) {
      for (const path of files) {
        const cursor = this.cursors.get(path);
        if (cursor) targets.push([path, cursor]);
      }
    }
    for (const [path, cursor] of targets) {
      if (!this.running || generation !== this.generation) return;
      try {
        if (await this.readFile(path, cursor, generation)) notifySessionChange(path);
      } catch (error) {
        const code = errorCode(error);
        if (code === "ENOENT") this.cursors.delete(path);
        else failures.push({ event: "file_read_failed", code, file: path });
      }
    }
    if (!this.running || generation !== this.generation) return;
    if (discoverySucceeded) this.initialized = true;
    this.collectionCycles += 1;
    this.lastCollectedAt = Date.now();
    this.prune(this.lastCollectedAt);
    this.updateCycleFailures(failures);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.initialized = false;
    this.generation += 1;
    this.startedAt = Date.now();
    this.lastCollectedAt = 0;
    this.lastEventAt = 0;
    this.collectionCycles = 0;
    this.bytesRead = 0;
    this.readErrors = 0;
    this.cycleFailures = [];
    this.failureFingerprints.clear();
    this.cursors.clear();
    this.events.length = 0;
    this.eventKeys.clear();
    diagnostic("collector_started", { pid: process.pid, reconcile_interval_ms: reconcileIntervalMs });
    this.installWatcher();
    this.reconcileTimer = setInterval(() => this.scheduleCycle(true, 0), reconcileIntervalMs);
    this.reconcileTimer.unref();
    this.scheduleCycle(true, 0);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.generation += 1;
    if (this.reconcileTimer) clearInterval(this.reconcileTimer);
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.reconcileTimer = null;
    this.debounceTimer = null;
    this.pendingCycle = false;
    this.pendingDiscovery = false;
    this.pendingFiles.clear();
    this.watcher?.close();
    this.watcher = null;
    diagnostic("collector_stopped", { collection_cycles: this.collectionCycles, bytes_read: this.bytesRead, read_errors: this.readErrors });
  }

  snapshot(): CodexActivity {
    const now = Date.now();
    this.prune(now);
    const events = this.events.filter(event => event.timestamp >= now - activityWindowMs && event.timestamp <= now);
    const speedSamples = events.filter(event => event.generationMs !== null);
    const outputTokens = events.reduce((sum, event) => sum + event.outputTokens, 0);
    const sampledOutputTokens = speedSamples.reduce((sum, event) => sum + event.outputTokens, 0);
    const generationMs = speedSamples.reduce((sum, event) => sum + (event.generationMs ?? 0), 0);
    const errors = [...new Set([...this.cycleFailures.map(failure => failure.code), ...(this.watcherError ? [this.watcherError] : [])])];
    const status = !this.running
      ? "unavailable"
      : !this.initialized
        ? errors.length ? "unavailable" : "starting"
        : errors.length ? "degraded" : "ready";
    return {
      status,
      collector: this.running ? "running" : "stopped",
      watching: Boolean(this.watcher),
      windowSeconds: activityWindowMs / 1000,
      tokensPerSecond: generationMs > 0 ? Math.round(sampledOutputTokens / (generationMs / 1000) * 10) / 10 : null,
      requestCount: events.length,
      speedSampleCount: speedSamples.length,
      outputTokens,
      generationSeconds: Math.round(generationMs / 100) / 10,
      sampledAt: now,
      startedAt: this.startedAt || null,
      lastCollectedAt: this.lastCollectedAt || null,
      lastEventAt: this.lastEventAt || null,
      trackedFiles: this.cursors.size,
      collectionCycles: this.collectionCycles,
      bytesRead: this.bytesRead,
      readErrors: this.readErrors,
      errors,
    };
  }
}

const activityCollector = new CodexActivityCollector();

export function startCodexActivityCollection() {
  activityCollector.start();
}

export function stopCodexActivityCollection() {
  activityCollector.stop();
}

export function readCodexActivity() {
  return activityCollector.snapshot();
}

export function subscribeCodexSessionChanges(listener: (threadId: string) => void) {
  sessionChangeListeners.add(listener);
  return () => sessionChangeListeners.delete(listener);
}
