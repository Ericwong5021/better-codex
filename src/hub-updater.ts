import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { compareVersions } from "./compatibility.js";
import { checkRelease, type ReleaseChannel } from "./release-update.js";
import { coreVersion } from "./version.js";

type HostUpdateState = {
  status?: "installing" | "current" | "error";
  targetVersion?: string;
  currentVersion?: string;
  stage?: string | null;
  progress?: number | null;
  updatedAt?: string;
  error?: string | null;
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
};

const checkInterval = 60 * 60 * 1000;

export class HubUpdater {
  private state: HubUpdateState;
  private checkPromise: Promise<HubUpdateState> | null = null;
  private readonly directory: string;
  private readonly channel: ReleaseChannel;

  constructor(directory = process.env.BETTER_CODEX_HUB_UPDATER_DIR || "") {
    this.directory = directory ? resolve(directory) : "";
    this.channel = coreVersion.includes("-beta.") ? "preview" : "stable";
    this.state = {
      status: "current",
      currentVersion: coreVersion,
      latestVersion: coreVersion,
      checkedAt: "",
      error: null,
      stage: null,
      progress: null,
      deployment: "vps",
      installSupported: this.supported(),
      channel: this.channel,
    };
  }

  private supported() {
    return Boolean(this.directory && existsSync(join(this.directory, "ready")));
  }

  private hostState(): HostUpdateState | null {
    if (!this.directory) return null;
    try {
      return JSON.parse(readFileSync(join(this.directory, "state.json"), "utf8")) as HostUpdateState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  get() {
    const host = this.hostState();
    const installSupported = this.supported();
    const hostTarget = host?.targetVersion?.replace(/^v/, "") || null;
    if (host?.status === "installing") {
      return {
        ...this.state,
        status: "installing" as const,
        currentVersion: coreVersion,
        latestVersion: host.targetVersion?.replace(/^v/, "") || this.state.latestVersion,
        checkedAt: host.updatedAt || this.state.checkedAt,
        error: null,
        stage: host.stage || this.state.stage || "installing",
        progress: Number.isFinite(host.progress) ? Math.max(0, Math.min(100, Number(host.progress))) : this.state.progress,
        installSupported,
        channel: this.channel,
      };
    }
    if (host?.status === "error" && (!hostTarget || compareVersions(hostTarget, coreVersion) > 0)) {
      return { ...this.state, status: "error" as const, latestVersion: hostTarget || this.state.latestVersion, checkedAt: host.updatedAt || this.state.checkedAt, error: host.error || "update_install_failed", stage: host.stage || "error", progress: Number.isFinite(host.progress) ? Math.max(0, Math.min(100, Number(host.progress))) : this.state.progress, installSupported, channel: this.channel };
    }
    if (host?.status === "current" && host.currentVersion === coreVersion && this.state.latestVersion === coreVersion) {
      return { ...this.state, status: "current" as const, currentVersion: coreVersion, latestVersion: coreVersion, checkedAt: host.updatedAt || this.state.checkedAt, error: null, stage: host.stage || this.state.stage, progress: Number.isFinite(host.progress) ? Math.max(0, Math.min(100, Number(host.progress))) : this.state.progress, installSupported, channel: this.channel };
    }
    return { ...this.state, currentVersion: coreVersion, installSupported, channel: this.channel };
  }

  stale() {
    const checkedAt = Date.parse(this.state.checkedAt);
    return !Number.isFinite(checkedAt) || Date.now() - checkedAt >= checkInterval;
  }

  check() {
    if (this.checkPromise) return this.checkPromise;
    this.state = { ...this.get(), status: "current", error: null, stage: null, progress: null };
    const promise = checkRelease(this.channel).then(result => {
      this.state = { ...result, stage: null, progress: null, deployment: "vps", installSupported: this.supported() };
      return this.get();
    }).finally(() => {
      if (this.checkPromise === promise) this.checkPromise = null;
    });
    this.checkPromise = promise;
    return promise;
  }

  async current() {
    return this.stale() ? this.check() : this.get();
  }

  async install() {
    const request = join(this.directory, "request");
    const running = join(this.directory, "request.running");
    const lock = join(this.directory, "request.lock");
    const host = this.hostState();
    if (host?.status === "installing" || existsSync(request) || existsSync(running)) throw new Error("update_in_progress");
    await this.check();
    const state = this.state;
    if (!state.installSupported) throw new Error("hub_update_not_configured");
    if (state.status !== "available" || !state.latestVersion) throw new Error(state.error || "update_not_available");
    const target = `v${state.latestVersion}`;
    const targetPattern = this.channel === "stable" ? /^v\d+\.\d+\.\d+$/ : /^v\d+\.\d+\.\d+-beta\.\d+$/;
    if (!targetPattern.test(target)) throw new Error("update_version_invalid");
    const temporary = join(this.directory, `request.${process.pid}.${Date.now()}`);
    let locked = false;
    try {
      if (this.hostState()?.status === "installing" || existsSync(request) || existsSync(running)) throw new Error("update_in_progress");
      writeFileSync(lock, `${process.pid}\n`, { mode: 0o600, flag: "wx" });
      locked = true;
      writeFileSync(temporary, `${target}\n`, { mode: 0o600, flag: "wx" });
      renameSync(temporary, request);
    } catch (error) {
      try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
      try { if (locked && existsSync(lock)) unlinkSync(lock); } catch {}
      throw (error as NodeJS.ErrnoException).code === "EEXIST" ? new Error("update_in_progress") : error;
    }
    this.state = { ...state, status: "installing", error: null, stage: "queued", progress: 5 };
    return { accepted: true, state: this.get() };
  }
}
