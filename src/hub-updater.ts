import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkStableRelease } from "./release-update.js";
import { coreVersion } from "./version.js";

type HostUpdateState = {
  status?: "installing" | "current" | "error";
  targetVersion?: string;
  currentVersion?: string;
  updatedAt?: string;
  error?: string | null;
};

export type HubUpdateState = {
  status: "current" | "available" | "installing" | "error";
  currentVersion: string;
  latestVersion: string | null;
  checkedAt: string;
  error: string | null;
  deployment: "vps";
  installSupported: boolean;
};

const checkInterval = 60 * 60 * 1000;

export class HubUpdater {
  private state: HubUpdateState;
  private checkPromise: Promise<HubUpdateState> | null = null;
  private readonly directory: string;

  constructor(directory = process.env.BETTER_CODEX_HUB_UPDATER_DIR || "") {
    this.directory = directory ? resolve(directory) : "";
    this.state = {
      status: "current",
      currentVersion: coreVersion,
      latestVersion: coreVersion,
      checkedAt: "",
      error: null,
      deployment: "vps",
      installSupported: this.supported(),
    };
  }

  private supported() {
    return Boolean(this.directory && existsSync(join(this.directory, "ready")));
  }

  private hostState(): HostUpdateState | null {
    if (!this.directory) return null;
    try {
      return JSON.parse(readFileSync(join(this.directory, "state.json"), "utf8")) as HostUpdateState;
    } catch {
      return null;
    }
  }

  get() {
    const host = this.hostState();
    const installSupported = this.supported();
    if (host?.status === "installing") {
      return {
        ...this.state,
        status: "installing" as const,
        currentVersion: coreVersion,
        latestVersion: host.targetVersion?.replace(/^v/, "") || this.state.latestVersion,
        checkedAt: host.updatedAt || this.state.checkedAt,
        error: null,
        installSupported,
      };
    }
    if (host?.status === "error" && host.targetVersion?.replace(/^v/, "") === this.state.latestVersion) {
      return { ...this.state, status: "error" as const, checkedAt: host.updatedAt || this.state.checkedAt, error: host.error || "update_install_failed", installSupported };
    }
    if (host?.status === "current" && host.currentVersion === coreVersion && this.state.latestVersion === coreVersion) {
      return { ...this.state, status: "current" as const, currentVersion: coreVersion, latestVersion: coreVersion, checkedAt: host.updatedAt || this.state.checkedAt, error: null, installSupported };
    }
    return { ...this.state, currentVersion: coreVersion, installSupported };
  }

  stale() {
    const checkedAt = Date.parse(this.state.checkedAt);
    return !Number.isFinite(checkedAt) || Date.now() - checkedAt >= checkInterval;
  }

  check() {
    if (this.checkPromise) return this.checkPromise;
    this.state = { ...this.get(), status: "current", error: null };
    const promise = checkStableRelease().then(result => {
      this.state = { ...result, deployment: "vps", installSupported: this.supported() };
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
    const state = await this.check();
    if (!state.installSupported) throw new Error("hub_update_not_configured");
    if (state.status !== "available" || !state.latestVersion) throw new Error(state.error || "update_not_available");
    const target = `v${state.latestVersion}`;
    if (!/^v\d+\.\d+\.\d+$/.test(target)) throw new Error("update_version_invalid");
    const temporary = join(this.directory, `request.${process.pid}.${Date.now()}`);
    const request = join(this.directory, "request");
    const lock = join(this.directory, "request.lock");
    if (existsSync(request) || this.hostState()?.status === "installing") throw new Error("update_in_progress");
    let locked = false;
    try {
      writeFileSync(lock, `${process.pid}\n`, { mode: 0o600, flag: "wx" });
      locked = true;
      writeFileSync(temporary, `${target}\n`, { mode: 0o600, flag: "wx" });
      renameSync(temporary, request);
    } catch (error) {
      try { if (existsSync(temporary)) unlinkSync(temporary); } catch {}
      try { if (locked && existsSync(lock)) unlinkSync(lock); } catch {}
      throw (error as NodeJS.ErrnoException).code === "EEXIST" ? new Error("update_in_progress") : error;
    }
    this.state = { ...state, status: "installing", error: null };
    return { accepted: true, state: this.get() };
  }
}
