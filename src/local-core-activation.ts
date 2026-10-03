import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { compatibilityCurrentPath, managedRuntimePath, runPath, runtimeAuthorityPath, runtimeCurrentPath, runtimeLockPath, runtimeStatePath, runtimeVersionsPath, updateActivationPath, updateRollbackPath, updateStatePath } from "./config.js";
import { processStartTime, readRuntimeState } from "./runtime-state.js";
import { serviceStatus } from "./service.js";
import { requireStorageCapacity } from "./storage-health.js";

const journalPath = join(managedRuntimePath, "local-core-activation.json");
const maxArtifactBytes = 256 * 1024 * 1024;
type Snapshot = { core: string | null; compatibility: string | null; authority: string | null };
type Journal = {
  schemaVersion: 1;
  trust: "explicit-local-sha256";
  operationId: string;
  phase: "staged" | "publishing" | "selected" | "rolling_back" | "rolled_back";
  ownerPid: number;
  ownerStartedAt: number;
  lastAuthorityGeneration: number;
  version: string;
  sha256: string;
  executable: string;
  before: Snapshot;
  sourceSha256: string | null;
  targetPointer: string;
  updatedAt: string;
};

function fail(code: string): never { throw new Error(`local_activation_${code}`); }
function digest(content: Buffer) { return createHash("sha256").update(content).digest("hex"); }
function alive(pid: number) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
}
function optionalBytes(path: string): string | null {
  try {
    if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) fail("state_not_regular");
    return readFileSync(path).toString("base64");
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
function object(path: string): Record<string, unknown> | null {
  const bytes = optionalBytes(path);
  if (bytes === null) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes, "base64").toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) fail("state_invalid");
    return value as Record<string, unknown>;
  } catch { return fail("state_invalid"); }
}
function snapshot(): Snapshot {
  return { core: optionalBytes(runtimeCurrentPath), compatibility: optionalBytes(compatibilityCurrentPath), authority: optionalBytes(runtimeAuthorityPath) };
}
function validVersion(value: string) {
  return value.length <= 128 && /^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(value);
}
function corePointer(bytes: string | null, requireExisting = true) {
  if (bytes === null) return null;
  try {
    const value = JSON.parse(Buffer.from(bytes, "base64").toString("utf8")) as { current?: string; executable?: string };
    if (!value || typeof value.current !== "string" || !validVersion(value.current) || typeof value.executable !== "string" || value.executable !== join(runtimeVersionsPath, value.current, "better-codex.cjs")) fail("source_pointer_invalid");
    for (const directory of [runtimeVersionsPath, join(runtimeVersionsPath, value.current)]) {
      if (existsSync(directory)) {
        const stat = lstatSync(directory);
        if (stat.isSymbolicLink() || !stat.isDirectory()) fail("source_pointer_invalid");
      } else if (requireExisting) fail("source_pointer_invalid");
    }
    if (requireExisting && (!existsSync(value.executable) || !lstatSync(value.executable).isFile() || lstatSync(value.executable).isSymbolicLink())) fail("source_pointer_invalid");
    return value as { current: string; executable: string };
  } catch { return fail("source_pointer_invalid"); }
}
function generation() {
  const authority = object(runtimeAuthorityPath);
  if (!authority) return 0;
  if (!Number.isSafeInteger(authority.generation) || Number(authority.generation) < 1 || !["claimed", "reserved"].includes(String(authority.status))) fail("authority_invalid");
  return Number(authority.generation);
}
function stopped(ownFence = false) {
  if (readRuntimeState()) fail("runtime_running");
  const state = object(runtimeStatePath);
  if (state && (!Number.isInteger(state.pid) || Number(state.pid) < 1)) fail("runtime_state_invalid");
  if (state && alive(Number(state.pid))) fail("runtime_running");
  const lock = object(runtimeLockPath);
  if (lock && !(ownFence && lock.pid === process.pid && lock.instanceId === fenceInstance)) fail("runtime_lock_present");
  const service = serviceStatus();
  if (service.running || service.pid) fail("service_running");
  const authority = object(runtimeAuthorityPath);
  generation();
  if (authority && (authority.status === "reserved" || authority.updateId || Number.isInteger(authority.runtimePid) && alive(Number(authority.runtimePid)))) fail("authority_active");
  const activation = object(updateActivationPath);
  if (activation && (activation.status === "activating" || activation.stage === "recovery_failed" || !["success", "error"].includes(String(activation.status)))) fail("update_pending");
  const rollback = object(updateRollbackPath);
  if (rollback && (!['ready', 'restored'].includes(String(rollback.phase)) || rollback.updateId && rollback.updateId !== authority?.settledUpdateId)) fail("update_pending");
  if (existsSync(join(runPath, "update-client.json"))) fail("update_receipt_pending");
}
function flushDirectory(path: string) {
  if (process.platform === "win32") return;
  const directory = openSync(path, "r");
  try { fsyncSync(directory); } finally { closeSync(directory); }
}
function durableWrite(path: string, bytes: Buffer) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try { writeFileSync(descriptor, bytes); fsyncSync(descriptor); }
  finally { closeSync(descriptor); }
  renameSync(temporary, path);
  flushDirectory(dirname(path));
}
function record(journal: Journal) {
  journal.updatedAt = new Date().toISOString();
  const bytes = Buffer.from(JSON.stringify(journal));
  durableWrite(join(managedRuntimePath, "local-core-activations", journal.operationId, "journal.json"), bytes);
  durableWrite(journalPath, bytes);
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ scope: "local_update", event: "selection_transition", operation_id: journal.operationId, phase: journal.phase, target_version: journal.version, generation: journal.lastAuthorityGeneration, owner_pid: journal.ownerPid, owner_started_at: journal.ownerStartedAt })}`);
}
function readJournal(): Journal | null {
  const value = object(journalPath);
  if (!value) return null;
  if (value.schemaVersion !== 1 || value.trust !== "explicit-local-sha256" || typeof value.operationId !== "string" || !/^[a-f0-9-]{36}$/i.test(value.operationId) || !["staged", "publishing", "selected", "rolling_back", "rolled_back"].includes(String(value.phase)) || !value.before || typeof value.before !== "object" || typeof value.version !== "string" || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(value.version) || typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isSafeInteger(value.lastAuthorityGeneration) || Number(value.lastAuthorityGeneration) < 0 || typeof value.targetPointer !== "string" || value.executable !== join(runtimeVersionsPath, value.version, "better-codex.cjs")) fail("journal_invalid");
  const before = value.before as Record<string, unknown>;
  if (["core", "compatibility", "authority"].some(key => before[key] !== null && typeof before[key] !== "string")) fail("journal_invalid");
  const target = corePointer(value.targetPointer, false);
  if (target?.current !== value.version || target.executable !== value.executable) fail("journal_invalid");
  return value as unknown as Journal;
}
let fenceInstance: string | null = null;
function coordinated<T>(callback: () => T): T {
  mkdirSync(managedRuntimePath, { recursive: true });
  mkdirSync(runPath, { recursive: true });
  const startedAt = processStartTime(process.pid);
  if (startedAt === null) fail("owner_start_unavailable");
  const token = randomUUID();
  const operationLock = `${updateStatePath}.lock`;
  // The official updater uses this same exclusive lock. Stale locks fail closed.
  let updateOwned = false;
  let runtimeOwned = false;
  try {
    const updateFd = openSync(operationLock, "wx", 0o600);
    updateOwned = true;
    try { writeFileSync(updateFd, JSON.stringify({ pid: process.pid, token, startedAt })); fsyncSync(updateFd); } finally { closeSync(updateFd); }
    stopped();
    fenceInstance = `local-activation-${token}`;
    const runtimeFd = openSync(runtimeLockPath, "wx", 0o600);
    runtimeOwned = true;
    try { writeFileSync(runtimeFd, JSON.stringify({ pid: process.pid, instanceId: fenceInstance, processStartedAt: new Date(startedAt).toISOString(), startedAt: new Date().toISOString() })); fsyncSync(runtimeFd); } finally { closeSync(runtimeFd); }
    return callback();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") fail("coordinator_busy");
    throw error;
  } finally {
    if (runtimeOwned && object(runtimeLockPath)?.instanceId === fenceInstance) unlinkSync(runtimeLockPath);
    fenceInstance = null;
    if (updateOwned && object(operationLock)?.token === token) unlinkSync(operationLock);
  }
}
function artifact(path: string) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maxArtifactBytes) fail("artifact_invalid");
  return readFileSync(path);
}
function validateVersion(executable: string, version: string) {
  const home = mkdtempSync(join(tmpdir(), "better-codex-local-validation-"));
  try {
    const environment: NodeJS.ProcessEnv = {};
    for (const key of ["PATH", "SystemRoot", "WINDIR", "TMPDIR", "TMP", "TEMP"]) if (process.env[key]) environment[key] = process.env[key];
    Object.assign(environment, { HOME: home, USERPROFILE: home, BETTER_CODEX_HOME: join(home, "runtime"), BETTER_CODEX_PEER_HOME: join(home, "peer"), BETTER_CODEX_PROFILE: "stable", CODEX_HOME: join(home, "codex"), BETTER_CODEX_DISABLE_DELEGATION: "1" });
    const result = spawnSync(process.execPath, [executable, "version", "--json"], { encoding: "utf8", env: environment, cwd: home, timeout: 15_000, maxBuffer: 1024 * 1024, windowsHide: true });
    if (result.status !== 0 || result.error) fail("validation_failed");
    let actual: unknown;
    try { actual = JSON.parse(result.stdout); } catch { fail("validation_failed"); }
    if (!actual || typeof actual !== "object" || (actual as { core?: string }).core !== version) fail("version_mismatch");
  } finally { rmSync(home, { recursive: true, force: true }); }
}

/** An explicit local artifact selection, separate from signed channel updates.
 * This publishes only core selection; callers must subsequently verify /readyz.
 */
export function activateLocalCore(options: { executable: string; version: string; sha256: string }) {
  if (!validVersion(options.version)) fail("version_invalid");
  if (!/^[a-f0-9]{64}$/i.test(options.sha256)) fail("sha256_invalid");
  const source = resolve(options.executable);
  if (!source.endsWith(".cjs")) fail("artifact_format_unsupported");
  return coordinated(() => {
    const previousJournal = readJournal();
    if (previousJournal && !["selected", "rolled_back"].includes(previousJournal.phase)) fail("recovery_required");
    const before = snapshot();
    const sourcePointer = corePointer(before.core);
    const sourceSha256 = sourcePointer ? digest(artifact(sourcePointer.executable)) : null;
    const content = artifact(source);
    const sha256 = options.sha256.toLowerCase();
    if (digest(content) !== sha256) fail("artifact_hash_mismatch");
    if (sourcePointer?.current === options.version && sourceSha256 !== sha256) fail("version_conflict");
    const storage = requireStorageCapacity(runtimeVersionsPath, content.length * 3);
    if (storage.degraded) fail("storage_degraded");
    const versionDirectory = join(runtimeVersionsPath, options.version);
    if (existsSync(runtimeVersionsPath) && lstatSync(runtimeVersionsPath).isSymbolicLink()) fail("versions_path_invalid");
    mkdirSync(runtimeVersionsPath, { recursive: true });
    if (existsSync(versionDirectory)) {
      if (lstatSync(versionDirectory).isSymbolicLink() || !lstatSync(versionDirectory).isDirectory()) fail("version_conflict");
      const existing = join(versionDirectory, "better-codex.cjs");
      if (!existsSync(existing) || digest(artifact(existing)) !== sha256) fail("version_conflict");
    }
    const stage = mkdtempSync(join(runtimeVersionsPath, ".local-activation-"));
    try {
      const staged = join(stage, "better-codex.cjs");
      const descriptor = openSync(staged, "wx", 0o755);
      try { writeFileSync(descriptor, content); fsyncSync(descriptor); } finally { closeSync(descriptor); }
      validateVersion(staged, options.version);
      if (digest(artifact(staged)) !== sha256 || digest(artifact(source)) !== sha256) fail("artifact_changed");
      const operationId = randomUUID();
      const executable = join(versionDirectory, "better-codex.cjs");
      const targetPointer = Buffer.from(JSON.stringify({ current: options.version, previous: sourcePointer?.current ?? null, executable, updatedAt: new Date().toISOString() })).toString("base64");
      const journal: Journal = { schemaVersion: 1, trust: "explicit-local-sha256", operationId, phase: "staged", ownerPid: process.pid, ownerStartedAt: processStartTime(process.pid)!, lastAuthorityGeneration: generation(), version: options.version, sha256, executable, before, sourceSha256, targetPointer, updatedAt: new Date().toISOString() };
      for (const [key, bytes] of Object.entries(before)) if (bytes !== null) durableWrite(join(managedRuntimePath, "local-core-activations", operationId, `${key}.before`), Buffer.from(bytes, "base64"));
      record(journal);
      if (!existsSync(versionDirectory)) {
        renameSync(stage, versionDirectory);
        flushDirectory(runtimeVersionsPath);
      }
      if (digest(artifact(executable)) !== sha256) fail("version_conflict");
      stopped(true);
      if (JSON.stringify(snapshot()) !== JSON.stringify(before)) fail("source_changed");
      if (sourcePointer && digest(artifact(sourcePointer.executable)) !== sourceSha256) fail("source_changed");
      journal.phase = "publishing";
      record(journal);
      stopped(true);
      if (JSON.stringify(snapshot()) !== JSON.stringify(before)) fail("source_changed");
      if (digest(artifact(executable)) !== sha256) fail("artifact_changed");
      durableWrite(runtimeCurrentPath, Buffer.from(targetPointer, "base64"));
      journal.phase = "selected";
      record(journal);
      return { activated: true, operation_id: operationId, currentVersion: options.version, previous: sourcePointer?.current ?? null, executable, sha256, pendingRestart: true, journal: journalPath };
    } finally { rmSync(stage, { recursive: true, force: true }); }
  });
}

/** Restore only this local operation's exact source selection while still offline.
 * A target Runtime start changes authority and fences this rollback. For a later
 * downgrade, stop that Runtime and activate the retained old core/hash as a new
 * local operation; never restore an earlier authority record or business data.
 */
export function rollbackLocalCore(operationId: string) {
  return coordinated(() => {
    const journal = readJournal();
    if (!journal || journal.operationId !== operationId) fail("operation_mismatch");
    const current = snapshot();
    if (current.authority !== journal.before.authority || generation() !== journal.lastAuthorityGeneration || current.compatibility !== journal.before.compatibility || current.core !== journal.before.core && current.core !== journal.targetPointer) fail("rollback_superseded");
    const previous = corePointer(journal.before.core);
    if (previous && digest(artifact(previous.executable)) !== journal.sourceSha256) fail("rollback_source_changed");
    if (journal.phase === "rolled_back") {
      if (current.core !== journal.before.core) fail("rollback_superseded");
      return { rolledBack: true, operation_id: operationId, pendingRestart: true };
    }
    journal.phase = "rolling_back";
    record(journal);
    stopped(true);
    if (JSON.stringify(snapshot()) !== JSON.stringify(current)) fail("rollback_superseded");
    if (journal.before.core === null) {
      if (existsSync(runtimeCurrentPath)) { unlinkSync(runtimeCurrentPath); flushDirectory(dirname(runtimeCurrentPath)); }
    } else durableWrite(runtimeCurrentPath, Buffer.from(journal.before.core, "base64"));
    journal.phase = "rolled_back";
    record(journal);
    return { rolledBack: true, operation_id: operationId, currentVersion: previous?.current ?? null, pendingRestart: true };
  });
}
