import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkRelease, type ReleaseChannel, type StableManifest } from "./release-update.js";
import { updateVersionAllowed } from "./update-policy.js";
import { coreVersion } from "./version.js";

type HostUpdateState = {
  schemaVersion: 2;
  id: string;
  idempotencyKey: string;
  channel: ReleaseChannel;
  status: "installing" | "current" | "error";
  targetVersion: string;
  sourceVersion: string;
  currentVersion?: string;
  stage: string;
  progress?: number;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  recovery?: "pending" | "restored" | "failed" | null;
  manifest?: StableManifest;
  requestedTarget?: string;
  failureStage?: string;
  exitCode?: number;
  attempts?: number;
  stageDurations?: Record<string, number>;
};

export type HubUpdateOperation = {
  id: string;
  status: "ACCEPTED" | "STAGING" | "ROLLING_BACK" | "ROLLED_BACK" | "COMPLETED" | "FAILED";
  source_core_version: string;
  target_core_version: string;
  error_code: string | null;
};

export type HubUpdateState = {
  status: "current" | "available" | "installing" | "error";
  currentVersion: string;
  latestVersion: string | null;
  checkedAt: string;
  error: string | null;
  stage: string | null;
  progress: number | null;
  deployment: "vps";
  installSupported: boolean;
  channel: ReleaseChannel;
  recovery?: HostUpdateState["recovery"];
  operation?: HubUpdateOperation | null;
  actual_version?: string;
  target_version?: string;
  phase?: string;
  error_details?: { code: string; stage: string; exit_code: number | null } | null;
  recovery_attempts?: number;
  stage_durations?: Record<string, number>;
};

export class HubUpdater {
  private state: HubUpdateState;
  private checkPromise: Promise<HubUpdateState> | null = null;
  private manifest: StableManifest | undefined;
  private readonly directory: string;
  private readonly channel: ReleaseChannel;

  constructor(directory = process.env.BETTER_CODEX_HUB_UPDATER_DIR || "", channel: ReleaseChannel = coreVersion.includes("-beta.") ? "preview" : "stable") {
    this.directory = directory ? resolve(directory) : "";
    this.channel = channel;
    this.state = { status: "current", currentVersion: coreVersion, latestVersion: coreVersion, checkedAt: "", error: null, stage: null, progress: null, deployment: "vps", installSupported: this.supported(), channel };
  }

  private supported() {
    return Boolean(this.directory && existsSync(join(this.directory, "ready")));
  }

  private read<T>(name: string): T | null {
    if (!this.directory) return null;
    try { return JSON.parse(readFileSync(join(this.directory, name), "utf8")) as T; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new Error("update_queue_state_invalid", { cause: error });
    }
  }

  private write(name: string, value: unknown) {
    const path = join(this.directory, name);
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    const descriptor = openSync(temporary, "wx", 0o660);
    try { writeFileSync(descriptor, JSON.stringify(value)); fsyncSync(descriptor); }
    finally { closeSync(descriptor); }
    renameSync(temporary, path);
  }

  private hostState(updateId = "") {
    if (updateId && !/^[a-f0-9-]{36}$/i.test(updateId)) throw new Error("update_operation_not_found");
    const state = this.read<HostUpdateState>("state.json");
    const queued = this.read<HostUpdateState>("request") || this.read<HostUpdateState>("request.running");
    if (updateId) {
      const operation = state?.id === updateId ? state : this.read<HostUpdateState>(`operations/${updateId}.json`);
      if (!operation || operation.id !== updateId) throw new Error("update_operation_not_found");
      return operation;
    }
    if (queued?.id && (!state || state.id !== queued.id)) return queued;
    return state || queued;
  }

  get(updateId = ""): HubUpdateState {
    const host = this.hostState(updateId);
    const base = { ...this.state, currentVersion: coreVersion, installSupported: this.supported() };
    if (!host?.id) return base;
    const status: HubUpdateOperation["status"] = host.recovery === "restored" ? "ROLLED_BACK" : host.recovery === "pending" ? "ROLLING_BACK" : host.status === "error" ? "FAILED" : host.status === "current" && host.stage === "complete" ? "COMPLETED" : host.stage === "queued" ? "ACCEPTED" : "STAGING";
    return { ...base, status: !updateId && host.status === "current" && base.status === "available" ? "available" : host.status, latestVersion: !updateId && host.status === "current" && base.status === "available" ? base.latestVersion : host.targetVersion.replace(/^v/, ""), checkedAt: host.updatedAt, stage: host.stage, progress: host.progress ?? null, error: host.error, recovery: host.recovery, actual_version: coreVersion, target_version: host.targetVersion.replace(/^v/, ""), phase: host.stage, error_details: host.error ? { code: host.error, stage: host.failureStage || host.stage, exit_code: host.exitCode ?? null } : null, recovery_attempts: Math.max(0, (host.attempts || 1) - 1), stage_durations: host.stageDurations, operation: { id: host.id, status, source_core_version: host.sourceVersion, target_core_version: host.targetVersion.replace(/^v/, ""), error_code: host.error } };
  }

  stale() {
    const checkedAt = Date.parse(this.state.checkedAt);
    return !Number.isFinite(checkedAt) || Date.now() - checkedAt >= 60 * 60 * 1000;
  }

  check() {
    if (this.checkPromise) return this.checkPromise;
    const promise = checkRelease(this.channel).then(result => {
      this.manifest = result.manifest;
      const { manifest: _manifest, ...state } = result;
      this.state = { ...state, stage: null, progress: null, deployment: "vps", installSupported: this.supported() };
      const current = this.get();
      return current.status === "error" && current.recovery !== "failed" ? this.state : current;
    }).finally(() => { if (this.checkPromise === promise) this.checkPromise = null; });
    this.checkPromise = promise;
    return promise;
  }

  async current(updateId = "", idempotencyKey = "") {
    if (idempotencyKey && !updateId) {
      const request = this.read<{ id: string }>(`requests/${createHash("sha256").update(idempotencyKey).digest("hex")}.json`);
      if (!request) throw new Error("update_operation_not_found");
      updateId = request.id;
    }
    return this.get(updateId);
  }

  private receipt(id: string) {
    const update = this.get(id);
    return { accepted: true, update_id: id, state: update.operation!.status, operation: update.operation, update };
  }

  async install(idempotencyKey = "", targetVersion = "") {
    if (!this.supported()) throw new Error("hub_update_not_configured");
    const key = idempotencyKey || randomUUID();
    if (!/^[A-Za-z0-9_-]{8,200}$/.test(key)) throw new Error("invalid_idempotency_key");
    if (targetVersion && !updateVersionAllowed(targetVersion, this.channel)) throw new Error("update_version_invalid");
    const keyPath = `requests/${createHash("sha256").update(key).digest("hex")}.json`;
    const previous = this.read<{ id: string; channel: ReleaseChannel; targetVersion: string }>(keyPath);
    if (previous) {
      if (previous.channel !== this.channel || previous.targetVersion !== targetVersion) throw new Error("update_idempotency_conflict");
      return this.receipt(previous.id);
    }
    const active = this.hostState();
    if (!active || active.status !== "installing") await this.check();
    const lock = join(this.directory, "request.lock");
    if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 30_000) {
      console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ scope: "relay_update", event: "stale_queue_lock_recovered", age_ms: Date.now() - statSync(lock).mtimeMs })}`);
      unlinkSync(lock);
    }
    let descriptor: number;
    try { descriptor = openSync(lock, "wx", 0o660); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("update_in_progress");
      throw error;
    }
    try {
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      mkdirSync(join(this.directory, "requests"), { recursive: true, mode: 0o770 });
      mkdirSync(join(this.directory, "operations"), { recursive: true, mode: 0o770 });
      const repeated = this.read<{ id: string; channel: ReleaseChannel; targetVersion: string }>(keyPath);
      if (repeated) {
        if (repeated.channel !== this.channel || repeated.targetVersion !== targetVersion) throw new Error("update_idempotency_conflict");
        return this.receipt(repeated.id);
      }
      const running = this.hostState();
      if (running?.status === "installing") {
        if (targetVersion && targetVersion !== running.targetVersion.replace(/^v/, "") || running.channel !== this.channel) throw new Error("update_in_progress");
        this.write(keyPath, { id: running.id, channel: this.channel, targetVersion });
        return this.receipt(running.id);
      }
      const state = this.state;
      if (state.status !== "available" || !state.latestVersion || !this.manifest) throw new Error(state.error || "update_not_available");
      if (targetVersion && state.latestVersion !== targetVersion) throw new Error("update_target_version_mismatch");
      const now = new Date().toISOString();
      const operation: HostUpdateState = { schemaVersion: 2, id: randomUUID(), idempotencyKey: key, channel: this.channel, status: "installing", targetVersion: `v${state.latestVersion}`, sourceVersion: coreVersion, stage: "queued", progress: 5, createdAt: now, updatedAt: now, error: null, manifest: this.manifest, requestedTarget: targetVersion };
      this.write(`operations/${operation.id}.json`, operation);
      this.write("request", operation);
      this.write(keyPath, { id: operation.id, channel: this.channel, targetVersion });
      return this.receipt(operation.id);
    } finally {
      closeSync(descriptor);
      unlinkSync(lock);
    }
  }
}
