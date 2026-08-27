import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type CodexActivity = {
  status: "ready" | "degraded" | "unavailable";
  windowSeconds: number;
  tokensPerSecond: number;
  requestCount: number;
  totalTokens: number;
  sampledAt: number;
  readErrors: number;
  errors: string[];
};

type TokenEvent = {
  timestamp: number;
  totalTokens: number;
  key: string;
};

type FileCursor = {
  offset: number;
  remainder: Buffer;
  totalTokens: number | null;
  discardFirstLine: boolean;
  lastSeenAt: number;
};

const activityWindowMs = 60_000;
const retentionMs = 65_000;
const discoveryIntervalMs = 2_000;
const recentFileMs = 24 * 60 * 60 * 1000;
const maxInitialReadBytes = 8 * 1024 * 1024;
const maxLineBytes = 1024 * 1024;
const readChunkBytes = 256 * 1024;

function nonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function usageTotal(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const usage = value as Record<string, unknown>;
  const total = nonNegativeInteger(usage.total_tokens);
  const input = nonNegativeInteger(usage.input_tokens);
  const output = nonNegativeInteger(usage.output_tokens);
  const cached = nonNegativeInteger(usage.cached_input_tokens);
  const reasoning = nonNegativeInteger(usage.reasoning_output_tokens);
  if (input === null && output === null && cached === null && reasoning === null) return null;
  const calculated = (input ?? 0) + (output ?? 0);
  return total ?? calculated;
}

function cumulativeTotal(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return nonNegativeInteger((value as Record<string, unknown>).total_tokens);
}

function errorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  if (error instanceof Error && /^[a-z0-9_]+$/i.test(error.message)) return error.message;
  return "codex_activity_read_failed";
}

function tokenRecord(line: string) {
  if (!line.includes("token_count")) return null;
  const record = JSON.parse(line) as Record<string, unknown>;
  if (record.type !== "event_msg" || !record.payload || typeof record.payload !== "object") return null;
  const payload = record.payload as Record<string, unknown>;
  if (payload.type !== "token_count" || !payload.info || typeof payload.info !== "object") return null;
  const info = payload.info as Record<string, unknown>;
  const lastTokens = usageTotal(info.last_token_usage);
  const totalTokens = cumulativeTotal(info.total_token_usage);
  const timestamp = Date.parse(String(record.timestamp || ""));
  return { lastTokens, totalTokens, timestamp };
}

class CodexActivityReader {
  private readonly cursors = new Map<string, FileCursor>();
  private readonly events: TokenEvent[] = [];
  private readonly eventKeys = new Set<string>();
  private initialized = false;
  private lastDiscoveryAt = 0;
  private readErrors = 0;

  private sessionsRoot() {
    return join(process.env.CODEX_HOME || join(homedir(), ".codex"), "sessions");
  }

  private async discoverFiles(now: number) {
    if (now - this.lastDiscoveryAt < discoveryIntervalMs) return;
    this.lastDiscoveryAt = now;
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
        const fileStat = await stat(path);
        if (now - fileStat.mtimeMs > recentFileMs) continue;
        const initialOffset = this.initialized ? Math.max(0, fileStat.size - maxInitialReadBytes) : fileStat.size;
        this.cursors.set(path, {
          offset: initialOffset,
          remainder: Buffer.alloc(0),
          totalTokens: null,
          discardFirstLine: initialOffset > 0 && initialOffset < fileStat.size,
          lastSeenAt: now,
        });
      }
    }
    this.initialized = true;
  }

  private addEvent(timestamp: number, totalTokens: number, cumulative: number | null) {
    if (totalTokens <= 0) return;
    const safeTimestamp = Number.isFinite(timestamp) ? Math.min(Date.now(), timestamp) : Date.now();
    const key = [safeTimestamp, totalTokens, cumulative ?? ""].join(":");
    if (this.eventKeys.has(key)) return;
    this.eventKeys.add(key);
    this.events.push({ timestamp: safeTimestamp, totalTokens, key });
  }

  private parseLine(cursor: FileCursor, line: string) {
    if (!line.includes("token_count")) return;
    const record = tokenRecord(line);
    if (!record) return;
    const previousTotal = cursor.totalTokens;
    if (record.totalTokens !== null) {
      cursor.totalTokens = record.totalTokens;
      if (previousTotal !== null && record.totalTokens <= previousTotal) return;
    }
    if (record.lastTokens !== null) this.addEvent(record.timestamp, record.lastTokens, record.totalTokens);
  }

  private readFile(path: string, cursor: FileCursor, now: number) {
    const stat = statSync(path);
    cursor.lastSeenAt = stat.mtimeMs;
    if (stat.size < cursor.offset) {
      cursor.offset = stat.size;
      cursor.remainder = Buffer.alloc(0);
      cursor.totalTokens = null;
      cursor.discardFirstLine = false;
      return;
    }
    if (stat.size === cursor.offset) return;
    const descriptor = openSync(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(readChunkBytes);
      while (cursor.offset < stat.size) {
        const length = Math.min(buffer.length, stat.size - cursor.offset);
        const bytes = readSync(descriptor, buffer, 0, length, cursor.offset);
        if (bytes <= 0) throw new Error("codex_activity_read_stalled");
        cursor.offset += bytes;
        const combined = cursor.remainder.length ? Buffer.concat([cursor.remainder, buffer.subarray(0, bytes)]) : buffer.subarray(0, bytes);
        let start = 0;
        for (let index = 0; index < combined.length; index += 1) {
          if (combined[index] !== 10) continue;
          if (cursor.discardFirstLine) cursor.discardFirstLine = false;
          else {
            const end = index > start && combined[index - 1] === 13 ? index - 1 : index;
            if (end - start > maxLineBytes) throw new Error("codex_activity_line_too_large");
            this.parseLine(cursor, combined.subarray(start, end).toString("utf8"));
          }
          start = index + 1;
        }
        cursor.remainder = Buffer.from(combined.subarray(start));
        if (cursor.remainder.length > maxLineBytes) throw new Error("codex_activity_line_too_large");
      }
    } finally {
      closeSync(descriptor);
    }
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

  async read(since: number): Promise<CodexActivity> {
    const discoveryAt = Date.now();
    const errors: string[] = [];
    try {
      await this.discoverFiles(discoveryAt);
    } catch (error) {
      errors.push(errorCode(error));
    }
    const now = Date.now();
    for (const [path, cursor] of this.cursors) {
      try {
        this.readFile(path, cursor, now);
      } catch (error) {
        errors.push(errorCode(error));
      }
    }
    this.readErrors += errors.length;
    this.prune(now);
    const safeSince = Number.isFinite(since) ? Math.min(now, Math.max(now - 5 * 60_000, since)) : now;
    const cutoff = Math.max(now - activityWindowMs, safeSince);
    const events = this.events.filter(event => event.timestamp >= cutoff && event.timestamp <= now);
    const totalTokens = events.reduce((sum, event) => sum + event.totalTokens, 0);
    const unavailable = !existsSync(this.sessionsRoot()) || (!this.cursors.size && errors.length > 0);
    return {
      status: unavailable ? "unavailable" : errors.length ? "degraded" : "ready",
      windowSeconds: activityWindowMs / 1000,
      tokensPerSecond: Math.round(totalTokens / (activityWindowMs / 1000) * 10) / 10,
      requestCount: events.length,
      totalTokens,
      sampledAt: now,
      readErrors: this.readErrors,
      errors: [...new Set(errors)].slice(0, 8),
    };
  }
}

const activityReader = new CodexActivityReader();
let activityReadQueue: Promise<void> = Promise.resolve();

export function readCodexActivity(since: number) {
  const result = activityReadQueue.then(() => activityReader.read(since));
  activityReadQueue = result.then(() => undefined, () => undefined);
  return result;
}
