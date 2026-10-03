import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { externalObservationId, externalReportFileName, normalizeExternalReport, type ExternalReport } from "./external-observations.js";

export type ExternalReportInput = Omit<ExternalReport, "schema_version" | "item_id" | "sequence" | "reported_at"> & Partial<Pick<ExternalReport, "item_id" | "reported_at">>;

async function atomicWrite(path: string, value: string) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(value); await file.sync(); }
  finally { await file.close(); }
  try { await rename(temporary, path); } finally { await unlink(temporary).catch(() => {}); }
}

/** Opt-in local file publisher only: does not authenticate the claimed account or creator. */
export async function writeExternalReport(directory: string, input: ExternalReportInput): Promise<ExternalReport> {
  const spool = resolve(directory);
  const base = normalizeExternalReport({ ...input, schema_version: 1, sequence: 1, item_id: input.item_id || randomUUID(), reported_at: input.reported_at || new Date().toISOString() });
  const id = externalObservationId(base);
  await mkdir(spool, { recursive: true, mode: 0o700 });
  const directoryStat = await lstat(spool);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory() || (directoryStat.mode & 0o022)) throw new Error("external_spool_permissions");
  const lockPath = join(spool, `${id}.lock`);
  let lock;
  try { lock = await open(lockPath, "wx", 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("external_report_writer_locked"); throw error; }
  try {
    const sequencePath = join(spool, `${id}.sequence`);
    let previous = 0;
    try {
      const file = await open(sequencePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { previous = Number((await file.readFile("utf8")).trim()); } finally { await file.close(); }
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (!Number.isSafeInteger(previous) || previous < 0 || previous >= Number.MAX_SAFE_INTEGER) throw new Error("external_report_sequence_invalid");
    const report = { ...base, sequence: previous + 1 };
    // Reserve before publishing: a crash may leave a gap, but cannot reuse a committed sequence.
    await atomicWrite(sequencePath, String(report.sequence));
    await atomicWrite(join(spool, externalReportFileName(report)), JSON.stringify(report) + "\n");
    return report;
  } finally { await lock.close(); await unlink(lockPath); }
}
