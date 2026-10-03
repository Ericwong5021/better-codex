import { constants } from "node:fs";
import { open, readdir, realpath, lstat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { externalFreshnessTtlMs, externalReportFileName, normalizeExternalReport, ExternalObservationStore, type ExternalObservationCapability } from "./external-observations.js";

const maxReportBytes = 64 * 1024;
const reportFilePattern = /^external-[a-f0-9]{64}\.[0-9]{16}\.[a-f0-9]{64}\.json$/;

export class ExternalReportWatcher {
  private stopped = true;
  private closing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private seen = new Map<string, string>();
  private lastProjection = "";
  private status: ExternalObservationCapability;
  constructor(private readonly store: ExternalObservationStore, private readonly options: {
    directory: string | null;
    intervalMs?: number;
    onChange?: () => void;
    onDiagnostic?: (event: string, fields: Record<string, unknown>) => void;
  }) {
    this.status = { enabled: Boolean(options.directory), connected: false, mode: "opt_in_reporter", poll_interval_ms: options.intervalMs ?? 1000,
      freshness_ttl_ms: externalFreshnessTtlMs, last_poll_at: null, error: null, rejected_reports: 0 };
  }
  capability(): ExternalObservationCapability { return { ...this.status }; }
  start() {
    if (!this.stopped || !this.options.directory) return;
    this.stopped = false;
    this.closing = false;
    void this.poll();
  }
  async stop() {
    this.stopped = true;
    this.closing = true;
    if (this.timer) clearTimeout(this.timer);
    await this.inFlight;
  }
  poll(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.read().finally(() => {
      this.inFlight = null;
      if (!this.stopped) this.timer = setTimeout(() => void this.poll(), this.status.poll_interval_ms);
    });
    return this.inFlight;
  }
  private async read() {
    if (!this.options.directory || this.closing) return;
    const before = JSON.stringify([this.status.connected, this.status.error]);
    let changed = false;
    try {
      const requestedDirectory = resolve(this.options.directory);
      const directoryStat = await lstat(requestedDirectory);
      // Windows mode bits are synthetic; access control relies on the directory ACL.
      // Enforce POSIX write restrictions where the platform exposes them.
      if (directoryStat.isSymbolicLink()) throw new Error("external_spool_symlink");
      if (!directoryStat.isDirectory() || (process.platform !== "win32" && (directoryStat.mode & 0o022))) throw new Error("external_spool_permissions");
      const directory = await realpath(requestedDirectory);
      const entries = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && reportFilePattern.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
      const present = new Set(entries.map(entry => entry.name));
      for (const name of this.seen.keys()) if (!present.has(name)) this.seen.delete(name);
      for (const entry of entries) {
        let file;
        let signature = "";
        try {
          file = await open(join(directory, entry.name), constants.O_RDONLY | constants.O_NOFOLLOW);
          const info = await file.stat();
          signature = `${info.ino}:${info.size}:${info.mtimeMs}`;
          if (this.seen.get(entry.name) === signature) continue;
          if (!info.isFile() || info.size > maxReportBytes || (process.platform !== "win32" && (info.mode & 0o022))) throw new Error("external_report_permissions_or_size");
          const value = normalizeExternalReport(JSON.parse(await file.readFile("utf8")));
          if (externalReportFileName(value) !== entry.name) throw new Error("external_report_filename_mismatch");
          if (this.closing) return;
          let result;
          try { result = this.store.ingest(value); }
          catch (error) {
            if (error instanceof Error && (error.message.startsWith("invalid_external_") || error.message === "external_project_not_found")) throw error;
            throw new Error("external_observation_database_unavailable");
          }
          changed = result.status === "applied" || changed;
          this.seen.set(entry.name, signature);
        } catch (error) {
          if (error instanceof Error && error.message === "external_observation_database_unavailable") throw error;
          if (signature) this.seen.set(entry.name, signature);
          this.status.rejected_reports++;
          this.options.onDiagnostic?.("report_rejected", { error: error instanceof Error && /^invalid_external_|^external_/.test(error.message) ? error.message : "invalid_external_report" });
        } finally { await file?.close(); }
      }
      this.status = { ...this.status, connected: true, error: null, last_poll_at: new Date().toISOString() };
    } catch (error) {
      const code = error instanceof Error && /^external_/.test(error.message) ? error.message : "external_spool_unavailable";
      this.status = { ...this.status, connected: false, error: code, last_poll_at: new Date().toISOString() };
    }
    if (this.closing) return;
    const projection = this.store.list(this.status.connected).map(item => `${item.id}:${item.sequence}:${item.freshness}`).join("|");
    if (changed || before !== JSON.stringify([this.status.connected, this.status.error]) || projection !== this.lastProjection) this.options.onChange?.();
    this.lastProjection = projection;
  }
}
