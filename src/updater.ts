import { spawn, spawnSync } from "node:child_process";
import { createHash, verify } from "node:crypto";
import { chmodSync, closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isSea } from "node:sea";
import { canonicalUpdateJson as stableJson, updateVersionAllowed } from "./update-policy.js";
import { packagedBuild } from "./build.js";
import { activeCompatibility, bundledCompatibility, compareVersions, coreVersion, readCompatibilityPointer, rollbackCompatibility, validateCompatibility, writeCompatibilityPointer } from "./compatibility.js";
import { compatibilityCurrentPath, compatibilityVersionsPath, ensureDirectories, runtimeCurrentPath, runtimeVersionsPath, updateActivationPath, updateChannelPath, updateLogPath, updatePublicKeyPath, updateRollbackPath, updateStatePath } from "./config.js";
import { requireStorageCapacity } from "./storage-health.js";
import { processStartTime, readRuntimeState, runtimeAuthorityUpdateState } from "./runtime-state.js";

export type UpdateChannel = "stable" | "preview";

type UpdateAsset = {
  version: string;
  minimumCoreVersion?: string;
  url: string;
  sha256: string;
};

type UpdatePayload = {
  schemaVersion: 1;
  channel: UpdateChannel;
  generatedAt: string;
  compatibility: UpdateAsset | null;
  core: {
    version: string;
    assets: Record<string, Omit<UpdateAsset, "version">>;
  } | null;
  installers?: Record<string, Omit<UpdateAsset, "version">>;
  runtimeSessionHandoff?: {
    protocol: string;
    requiredCapabilities: string[];
  };
};

type SignedUpdateManifest = {
  payload: UpdatePayload;
  signature: string;
};

type RuntimePointer = {
  current: string;
  previous: string | null;
  executable: string;
  updatedAt: string;
};

export type GatewayUpdateState = {
  status: "idle" | "checking" | "current" | "available" | "installing" | "restarting" | "error";
  currentVersion: string;
  latestVersion: string | null;
  targetVersion?: string;
  checkedAt: string | null;
  error: string | null;
  coreUpdateSupported?: boolean;
  channel: UpdateChannel;
};

type CompatibilityPointerState = NonNullable<ReturnType<typeof readCompatibilityPointer>>;

type UpdateRollbackState = {
  schemaVersion?: 2;
  updateId?: string;
  sourceCoreVersion?: string;
  manifest?: SignedUpdateManifest;
  manifestDigest?: string;
  phase?: "staged" | "applying" | "ready" | "rolling_back" | "restored";
  before: { core: RuntimePointer | null; compatibility: CompatibilityPointerState | null };
  after: { core: string; compatibility: string };
  updatedAt: string;
};

export type ActivationState = {
  schemaVersion?: 2;
  stage?: "activating" | "rolling_back" | "committing" | "committing_rollback" | "completed" | "rolled_back" | "recovery_failed";
  ownerStartedAt?: number | null;
  recoveryAttempts?: number;
  desktopErrors?: Array<{ component: string; error: string }>;
  sourceCoreVersion?: string | null;
  failure?: { code: string; stage: string; recoveryError?: string | null } | null;
  status?: string;
  error?: string | null;
  updatedAt?: string;
  coreVersion?: string | null;
  compatibilityVersion?: string | null;
  core?: boolean;
  compatibility?: boolean;
  ownerPid?: number | null;
  updateId?: string | null;
  targetRuntimeGeneration?: number | null;
};

export function readGatewayUpdateActivationState(updateId?: string): ActivationState | null {
  if (updateId && !/^[a-f0-9-]{36}$/i.test(updateId)) throw new Error("update_operation_id_invalid");
  if (updateId) {
    const current = readGatewayUpdateActivationState();
    if (current?.updateId === updateId) return current;
  }
  try {
    const path = updateId ? join(dirname(updateActivationPath), "updates", `${updateId}.json`) : updateActivationPath;
    const value = JSON.parse(readFileSync(path, "utf8")) as ActivationState;
    return value && typeof value === "object" ? value : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error("update_activation_state_invalid", { cause: error });
  }
}

const coreUpdatesSupported = isSea() || packagedBuild;

function currentCoreEntrypoint() {
  return isSea() ? resolve(process.execPath) : resolve(process.argv[1] || process.execPath);
}

function coreInvocation(entrypoint: string, args: string[]) {
  const resolved = resolve(entrypoint);
  return resolved.toLowerCase().endsWith(".cjs")
    ? { command: process.execPath, args: [resolved, ...args] }
    : { command: resolved, args };
}

function runtimeEntrypoint(version: string) {
  const directory = join(runtimeVersionsPath, version);
  const candidates = [
    join(directory, "better-codex.cjs"),
    join(directory, process.platform === "win32" ? "better-codex.exe" : "better-codex"),
  ];
  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

function persistedActivationState(): GatewayUpdateState {
  const value = readGatewayUpdateActivationState();
  const base = { currentVersion: coreVersion, latestVersion: value?.coreVersion ?? null, checkedAt: value?.updatedAt ?? null, error: null, channel: selectedUpdateChannel() };
  if (!value) return { ...base, status: "idle" };
  const authority = value.updateId ? runtimeAuthorityUpdateState(value.updateId) : null;
  if (authority?.state === "committed" || value.status === "success") return { ...base, status: "current" };
  if (value.status === "error" || authority?.state === "rolled_back") return { ...base, status: "error", error: `update_activation_failed:${value.error || "update_rolled_back"}` };
  return { ...base, status: value.status === "activating" ? "restarting" : "idle" };
}

export function activationOwnerAlive(value = readGatewayUpdateActivationState()) {
  if (!value?.ownerPid || !processAlive(value.ownerPid)) return false;
  return value.ownerStartedAt == null || processStartTime(value.ownerPid) === value.ownerStartedAt;
}

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

let gatewayUpdateState: GatewayUpdateState = persistedActivationState();
let gatewayCheckPromise: { channel: UpdateChannel; promise: Promise<GatewayUpdateState> } | null = null;
let gatewayInstallPromise: Promise<Awaited<ReturnType<typeof updateAll>>> | null = null;
let gatewayCheckGeneration = 0;

function validUpdateChannel(value: unknown): value is UpdateChannel {
  return value === "stable" || value === "preview";
}

function acquireUpdateOperationLock(path = `${updateStatePath}.lock`) {
  ensureDirectories();
  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(path, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, token, startedAt: processStartTime(process.pid) }));
      closeSync(descriptor);
      return { path, token };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(readFileSync(path, "utf8")) as { pid?: number; startedAt?: number };
        if (Number.isInteger(owner.pid) && owner.pid && processAlive(owner.pid) && (owner.startedAt == null || processStartTime(owner.pid) === owner.startedAt)) throw new Error("update_in_progress");
      } catch (ownerError) {
        if (ownerError instanceof Error && ownerError.message === "update_in_progress") throw ownerError;
        if (existsSync(path) && Date.now() - statSync(path).mtimeMs < 10_000) throw new Error("update_in_progress");
      }
      try { unlinkSync(path); } catch { throw new Error("update_in_progress"); }
    }
  }
  throw new Error("update_in_progress");
}

function releaseUpdateOperationLock(lock: { path: string; token: string }) {
  try {
    const owner = JSON.parse(readFileSync(lock.path, "utf8")) as { token?: string };
    if (owner.token === lock.token) unlinkSync(lock.path);
  } catch {}
}

async function withUpdateOperationLock<T>(operation: () => Promise<T>) {
  const lock = acquireUpdateOperationLock();
  try { return await operation(); } finally { releaseUpdateOperationLock(lock); }
}

let activationLockHeld = false;

function withActivationLock<T>(operation: () => T): T {
  if (activationLockHeld) return operation();
  const deadline = Date.now() + 2000;
  let lock: ReturnType<typeof acquireUpdateOperationLock>;
  while (true) {
    try { lock = acquireUpdateOperationLock(`${updateActivationPath}.lock`); break; }
    catch (error) {
      if (!(error instanceof Error) || error.message !== "update_in_progress" || Date.now() >= deadline) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  activationLockHeld = true;
  try { return operation(); }
  finally { activationLockHeld = false; releaseUpdateOperationLock(lock); }
}

export function recoverInterruptedActivation(runtimePid: number) {
  return withActivationLock(() => {
    const activation = readGatewayUpdateActivationState();
    if (!activation?.updateId || activation.status !== "activating" || activationOwnerAlive(activation) || Date.now() - Date.parse(activation.updatedAt || "") < 10_000) return null;
    const authority = runtimeAuthorityUpdateState(activation.updateId);
    if (authority.state !== "active" || !authority.generation) return null;
    const updates = { core: activation.coreVersion || null, compatibility: activation.compatibilityVersion || null };
    const source = activation.sourceCoreVersion;
    if (!source) throw new Error("update_recovery_source_missing");
    if ((activation.recoveryAttempts || 0) >= 2) {
      recordGatewayUpdateActivation("error", activation.error || "update_activation_interrupted", updates, null, activation.updateId, authority.generation, { stage: "recovery_failed", failure: { code: "update_recovery_interrupted", stage: activation.stage || "activating", recoveryError: "update_recovery_attempts_exhausted" } });
      return null;
    }
    const args = ["apply-update", String(runtimePid), "--recover", "--update-id", activation.updateId, "--source-core", source, "--target-generation", String(authority.generation), ...(updates.core ? ["--expected-core", updates.core] : []), ...(updates.compatibility ? ["--expected-compatibility", updates.compatibility] : [])];
    const invocation = updateActivatorCommand(updates.core || source, args);
    const descriptor = openSync(updateLogPath, "a");
    try {
      const child = spawn(invocation.command, invocation.args, { cwd: process.cwd(), detached: true, env: { ...process.env }, stdio: ["ignore", descriptor, descriptor], windowsHide: true });
      child.once("error", error => console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "update", event: "recovery_spawn_failed", update_id: activation.updateId, error: error.message })}`));
      if (!child.pid) throw new Error("update_relauncher_spawn_failed");
      recordGatewayUpdateActivation("activating", activation.error || "update_activation_interrupted", updates, child.pid, activation.updateId, authority.generation, { stage: activation.stage || "activating", sourceCoreVersion: source, recoveryAttempts: (activation.recoveryAttempts || 0) + 1 });
      child.unref();
      return child.pid;
    } finally { closeSync(descriptor); }
  });
}

export function selectedUpdateChannel(): UpdateChannel {
  try {
    const value = JSON.parse(readFileSync(updateChannelPath, "utf8")) as { channel?: unknown };
    return validUpdateChannel(value.channel) ? value.channel : "stable";
  } catch {
    return "stable";
  }
}

export function setUpdateChannel(channel: UpdateChannel) {
  if (!validUpdateChannel(channel)) throw new Error("update_channel_invalid");
  const previous = selectedUpdateChannel();
  ensureDirectories();
  writeJsonAtomic(updateChannelPath, { channel, updatedAt: new Date().toISOString() });
  return { channel, previous, changed: channel !== previous };
}

function publicKey() {
  const configured = process.env.BETTER_CODEX_UPDATE_PUBLIC_KEY?.replace(/\\n/g, "\n");
  if (configured) return configured;
  if (existsSync(updatePublicKeyPath)) return readFileSync(updatePublicKeyPath, "utf8");
  throw new Error("update_public_key_unavailable");
}

function httpsUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("update_https_required");
  return url;
}

function manifestUrl(channel: UpdateChannel) {
  const configured = process.env.BETTER_CODEX_UPDATE_MANIFEST_URL;
  if (configured) return httpsUrl(configured);
  const release = channel === "stable" ? "latest/download" : "download/preview";
  return new URL(`https://github.com/Ericwong5021/better-codex/releases/${release}/update-manifest.json`);
}

async function download(url: URL) {
  const started = Date.now();
  const deadline = started + 300_000;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(Math.max(1, Math.min(90_000, deadline - Date.now()))), redirect: "follow", cache: "no-store", headers: { "cache-control": "no-cache", pragma: "no-cache" } });
      if (!response.ok) throw new Error(`update_http_${response.status}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      const code = error instanceof Error ? error.message : String(error);
      const retry = attempt < 3 && Date.now() + attempt * 1000 < deadline && (error instanceof TypeError || ["TimeoutError", "AbortError"].includes((error as Error)?.name) || /^update_http_(408|429|500|502|503|504)$/.test(code));
      console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "update", event: retry ? "download_retry" : "download_failed", host: url.host, attempt, elapsed_ms: Date.now() - started, error: code })}`);
      if (!retry) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
}

function verifyDigest(content: Buffer, expected: string) {
  if (!/^[a-f0-9]{64}$/i.test(expected)) throw new Error("update_hash_invalid");
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual.toLowerCase() !== expected.toLowerCase()) throw new Error("update_hash_mismatch");
}

function validateUpdateAsset(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("update_asset_invalid");
  const asset = value as UpdateAsset;
  if (typeof asset.url !== "string" || typeof asset.sha256 !== "string") throw new Error("update_asset_invalid");
  httpsUrl(asset.url);
}

function validatePayload(value: unknown, channel: UpdateChannel) {
  if (!value || typeof value !== "object") throw new Error("update_manifest_invalid");
  const payload = value as UpdatePayload;
  if (payload.schemaVersion !== 1 || payload.channel !== channel || !Number.isFinite(Date.parse(payload.generatedAt))) throw new Error("update_manifest_invalid");
  if (payload.compatibility) {
    if (typeof payload.compatibility.version !== "string" || typeof payload.compatibility.minimumCoreVersion !== "string") throw new Error("update_compatibility_invalid");
    if (channel === "stable" && (payload.compatibility.version.includes("-") || payload.compatibility.minimumCoreVersion.includes("-"))) throw new Error("update_prerelease_not_allowed");
    validateUpdateAsset(payload.compatibility);
  }
  if (payload.core) {
    if (
      typeof payload.core.version !== "string"
      || payload.core.version.length > 128
      || !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(payload.core.version)
      || !payload.core.assets
      || typeof payload.core.assets !== "object"
      || Array.isArray(payload.core.assets)
    ) throw new Error("update_core_invalid");
    if (channel === "stable" && payload.core.version.includes("-")) throw new Error("update_prerelease_not_allowed");
    if (!updateVersionAllowed(payload.core.version, channel)) throw new Error("update_core_invalid");
    Object.values(payload.core.assets).forEach(validateUpdateAsset);
  }
  if (payload.installers) {
    if (typeof payload.installers !== "object" || Array.isArray(payload.installers)) throw new Error("update_installers_invalid");
    Object.values(payload.installers).forEach(validateUpdateAsset);
  }
  if (payload.runtimeSessionHandoff) {
    if (typeof payload.runtimeSessionHandoff.protocol !== "string" || !payload.runtimeSessionHandoff.protocol || !Array.isArray(payload.runtimeSessionHandoff.requiredCapabilities) || payload.runtimeSessionHandoff.requiredCapabilities.some(capability => typeof capability !== "string" || !capability)) throw new Error("update_session_handoff_invalid");
  }
  return payload;
}

export function validateUpdatePayloadForTest(value: unknown, channel: UpdateChannel = "stable") {
  return validatePayload(value, channel);
}

async function fetchSignedUpdateManifest(channel: UpdateChannel) {
  const content = await download(manifestUrl(channel));
  const manifest = JSON.parse(content.toString("utf8")) as SignedUpdateManifest;
  if (!manifest.payload || typeof manifest.signature !== "string") throw new Error("update_manifest_invalid");
  const valid = verify(null, Buffer.from(stableJson(manifest.payload)), publicKey(), Buffer.from(manifest.signature, "base64"));
  if (!valid) throw new Error("update_signature_invalid");
  validatePayload(manifest.payload, channel);
  return manifest;
}

export async function fetchUpdateManifest(channel: UpdateChannel = selectedUpdateChannel()) {
  return (await fetchSignedUpdateManifest(channel)).payload;
}

function platformAssetKey() {
  const architecture = process.arch === "x64" ? "amd64" : process.arch;
  return `${process.platform}-${architecture}`;
}

function writeJsonAtomic(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  const descriptor = openSync(temporary, "w", 0o600);
  try {
    writeFileSync(descriptor, JSON.stringify(value));
    fsyncSync(descriptor);
  } finally { closeSync(descriptor); }
  renameSync(temporary, path);
  if (process.platform !== "win32") {
    const directory = openSync(dirname(path), "r");
    try { fsyncSync(directory); } finally { closeSync(directory); }
  }
}

function validatedRuntimePointer(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const pointer = value as RuntimePointer;
  if (typeof pointer.current !== "string" || typeof pointer.executable !== "string" || (pointer.previous !== null && typeof pointer.previous !== "string")) return null;
  const executable = resolve(pointer.executable);
  const relation = relative(resolve(runtimeVersionsPath), executable);
  if (!relation || relation.startsWith("..") || isAbsolute(relation)) return null;
  return { ...pointer, executable };
}

function readRuntimePointer() {
  try {
    const pointer = validatedRuntimePointer(JSON.parse(readFileSync(runtimeCurrentPath, "utf8")));
    if (!pointer) throw new Error("runtime_pointer_invalid");
    return pointer;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function readRollbackState() {
  try {
    const value = JSON.parse(readFileSync(updateRollbackPath, "utf8")) as UpdateRollbackState;
    if (!value?.before || !value.after || typeof value.after.core !== "string" || typeof value.after.compatibility !== "string") throw new Error("update_rollback_state_invalid");
    const core = value.before.core === null ? null : validatedRuntimePointer(value.before.core);
    if (value.before.core !== null && !core) throw new Error("update_rollback_state_invalid");
    const compatibility = value.before.compatibility;
    if (compatibility !== null && (typeof compatibility.current !== "string" || !Number.isInteger(compatibility.failures))) throw new Error("update_rollback_state_invalid");
    return { ...value, before: { core, compatibility } };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function writeRollbackState(
  before: UpdateRollbackState["before"],
  after = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version },
  phase: UpdateRollbackState["phase"] = "ready",
  metadata: Partial<UpdateRollbackState> = {},
) {
  writeJsonAtomic(updateRollbackPath, {
    ...metadata,
    schemaVersion: 2,
    phase,
    before,
    after,
    updatedAt: new Date().toISOString(),
  } satisfies UpdateRollbackState);
}

function restorePointerPair(state: UpdateRollbackState["before"]) {
  if (state.core) writeJsonAtomic(runtimeCurrentPath, state.core);
  else if (existsSync(runtimeCurrentPath)) unlinkSync(runtimeCurrentPath);
  if (state.compatibility) writeCompatibilityPointer(state.compatibility);
  else if (existsSync(compatibilityCurrentPath)) unlinkSync(compatibilityCurrentPath);
}

function rollbackResult(transaction: UpdateRollbackState) {
  const targetCoreVersion = transaction.before.core?.current ?? transaction.sourceCoreVersion ?? coreVersion;
  const targetCompatibilityVersion = transaction.before.compatibility?.current ?? bundledCompatibility.version;
  const coreChanged = transaction.after.core !== targetCoreVersion;
  const compatibilityChanged = transaction.after.compatibility !== targetCompatibilityVersion;
  return {
    rolledBack: coreChanged || compatibilityChanged,
    core: coreChanged ? { rolledBack: true, previous: transaction.after.core, version: targetCoreVersion, pendingRestart: true } : { rolledBack: false },
    compatibility: compatibilityChanged ? { rolledBack: true, previous: transaction.after.compatibility, version: targetCompatibilityVersion } : { rolledBack: false },
    pendingRestart: coreChanged,
  };
}

function validateRollbackTarget(transaction: UpdateRollbackState) {
  const targetCoreVersion = transaction.before.core?.current ?? transaction.sourceCoreVersion ?? coreVersion;
  if (transaction.before.core && !existsSync(transaction.before.core.executable)) throw new Error("rollback_core_unavailable");
  const targetCompatibilityVersion = transaction.before.compatibility?.current ?? bundledCompatibility.version;
  if (targetCompatibilityVersion !== bundledCompatibility.version) {
    validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, targetCompatibilityVersion, "manifest.json"), "utf8")), targetCoreVersion);
  }
}

function completeRollback(transaction: UpdateRollbackState) {
  validateRollbackTarget(transaction);
  restorePointerPair(transaction.before);
  if (transaction.updateId) writeRollbackState(transaction.before, transaction.after, "restored", transaction);
  else if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
  return rollbackResult(transaction);
}

function settleInterruptedUpdateTransaction() {
  const transaction = readRollbackState();
  if (transaction?.updateId) return null;
  if (transaction?.phase === "rolling_back") return completeRollback(transaction);
  if (transaction?.phase !== "applying") return null;
  if (effectiveCoreVersion() === transaction.after.core && activeCompatibility().version === transaction.after.compatibility) {
    writeRollbackState(transaction.before, transaction.after, "ready", transaction);
    return null;
  }
  restorePointerPair(transaction.before);
  if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
  return null;
}

export function recoverInterruptedUpdateTransaction() {
  const phase = readRollbackState()?.phase;
  if (phase !== "applying" && phase !== "rolling_back") return;
  let lock: ReturnType<typeof acquireUpdateOperationLock> | null = null;
  try {
    lock = acquireUpdateOperationLock();
    settleInterruptedUpdateTransaction();
  } catch (error) {
    if (!(error instanceof Error && error.message === "update_in_progress")) throw error;
  } finally {
    if (lock) releaseUpdateOperationLock(lock);
  }
}

export function activeCoreExecutable() {
  const pointer = readRuntimePointer();
  return pointer ? pointer.executable : currentCoreEntrypoint();
}

export function managedCoreCommand(args: string[]) {
  const pointer = readRuntimePointer();
  if (!pointer) return null;
  if (!existsSync(pointer.executable)) throw new Error("managed_core_unavailable");
  return coreInvocation(pointer.executable, args);
}

export function activeCoreCommand(args: string[]) {
  return coreInvocation(activeCoreExecutable(), args);
}

export function updateActivatorCommand(version: string, args: string[]) {
  const executable = runtimeEntrypoint(version) || (version === coreVersion ? currentCoreEntrypoint() : null);
  if (!executable) throw new Error("update_activator_unavailable");
  return coreInvocation(executable, args);
}

function effectiveCoreVersion() {
  const managed = readRuntimePointer()?.current;
  return managed ?? coreVersion;
}

function pendingCoreActivation() {
  const pointer = readRuntimePointer();
  return pointer && compareVersions(pointer.current, coreVersion) > 0 ? pointer : null;
}

export function getGatewayUpdateState() {
  if (gatewayUpdateState.status === "restarting") {
    const persisted = persistedActivationState();
    if (persisted.status !== "restarting") gatewayUpdateState = persisted.status === "idle" ? { ...persisted, status: "current" } : persisted;
  }
  const channel = selectedUpdateChannel();
  if (gatewayUpdateState.channel !== channel && !["installing", "restarting"].includes(gatewayUpdateState.status)) {
    gatewayUpdateState = { status: "idle", currentVersion: effectiveCoreVersion(), latestVersion: null, checkedAt: null, error: null, channel };
  }
  return { ...gatewayUpdateState, currentVersion: coreVersion, coreUpdateSupported: coreUpdatesSupported };
}

export function recordGatewayUpdateActivation(status: "activating" | "success" | "error", error: string | null = null, updates: { core: string | null; compatibility: string | null } = { core: null, compatibility: null }, ownerPid: number | null = null, updateId: string | null = null, targetRuntimeGeneration: number | null = null, detail: Pick<ActivationState, "stage" | "failure" | "sourceCoreVersion" | "recoveryAttempts" | "desktopErrors"> = {}) {
  return withActivationLock(() => {
  const previous = readGatewayUpdateActivationState();
  if (updateId && !/^[a-f0-9-]{36}$/i.test(updateId)) throw new Error("update_operation_id_invalid");
  const historyPath = updateId ? join(dirname(updateActivationPath), "updates", `${updateId}.json`) : null;
  if (updateId) {
    const authority = runtimeAuthorityUpdateState(updateId);
    if (authority.state === "committed" && status !== "success") throw new Error("runtime_authority_update_committed");
    if (previous?.updateId !== updateId && historyPath && existsSync(historyPath)) throw new Error("update_superseded");
    if (authority.state === "active" && targetRuntimeGeneration != null && targetRuntimeGeneration !== authority.generation) throw new Error("update_activation_generation_stale");
  }
  if (updateId && previous?.updateId === updateId) {
    if (targetRuntimeGeneration != null && previous.targetRuntimeGeneration != null && targetRuntimeGeneration < previous.targetRuntimeGeneration) throw new Error("update_activation_generation_stale");
    if (["completed", "rolled_back", "recovery_failed"].includes(previous.stage || "") && status === "activating") throw new Error("update_operation_terminal");
    if (["committing", "committing_rollback"].includes(previous.stage || "") && status === "activating" && detail.stage !== previous.stage) throw new Error("update_commit_outcome_pending");
  }
  if (updateId && previous?.updateId && previous.updateId !== updateId && previous.status === "activating") throw new Error("update_in_progress");
  const sameOperation = previous?.updateId === updateId;
  const stage = detail.stage || (status === "activating" ? "activating" : status === "success" ? "completed" : sameOperation && previous?.stage === "rolled_back" ? "rolled_back" : "recovery_failed");
  const value: ActivationState = { ...(sameOperation ? previous : {}), schemaVersion: 2, ...detail, stage, status, error, coreVersion: updates.core, compatibilityVersion: updates.compatibility, ownerPid, ownerStartedAt: ownerPid ? processStartTime(ownerPid) : null, updateId, targetRuntimeGeneration: targetRuntimeGeneration ?? (sameOperation ? previous?.targetRuntimeGeneration : null), updatedAt: new Date().toISOString() };
  writeJsonAtomic(updateActivationPath, value);
  if (historyPath) writeJsonAtomic(historyPath, value);
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: value.updatedAt, scope: "update", event: "activation_transition", update_id: updateId, stage, status, source_version: value.sourceCoreVersion, target_version: updates.core, generation: value.targetRuntimeGeneration, owner_pid: ownerPid, owner_started_at: value.ownerStartedAt, error, failure: value.failure })}`);
  gatewayUpdateState = status === "error"
    ? { ...getGatewayUpdateState(), status: "error", error: `update_activation_failed:${error || "unknown"}` }
    : { ...getGatewayUpdateState(), status: status === "activating" ? "restarting" : "current", error: null };
  });
}

export function checkGatewayUpdate(channel: UpdateChannel = selectedUpdateChannel()) {
  if (gatewayCheckPromise?.channel === channel) return gatewayCheckPromise.promise;
  const generation = ++gatewayCheckGeneration;
  getGatewayUpdateState();
  if (["installing", "restarting"].includes(gatewayUpdateState.status) && gatewayUpdateState.channel === channel) return Promise.resolve(getGatewayUpdateState());
  gatewayUpdateState = { ...getGatewayUpdateState(), status: "checking", error: null, channel };
  const promise = checkForUpdates(channel).then(result => {
    if (selectedUpdateChannel() !== channel || generation !== gatewayCheckGeneration) return getGatewayUpdateState();
    const checkedAt = new Date().toISOString();
    if (!result.checked || !("core" in result)) {
      gatewayUpdateState = { ...getGatewayUpdateState(), status: "error", checkedAt, error: "error" in result ? result.error : "update_check_failed" };
      return getGatewayUpdateState();
    }
    const coreAvailable = Boolean(coreUpdatesSupported && result.core?.available);
    const compatibilityAvailable = Boolean(result.compatibility?.available);
    const available = coreAvailable || compatibilityAvailable;
    const latestVersion = coreAvailable
      ? result.core?.version ?? effectiveCoreVersion()
      : compatibilityAvailable
        ? result.compatibility?.version ?? effectiveCoreVersion()
        : effectiveCoreVersion();
    gatewayUpdateState = { targetVersion: result.core?.version || coreVersion, status: available ? "available" : "current", currentVersion: effectiveCoreVersion(), latestVersion, checkedAt, error: null, channel };
    return getGatewayUpdateState();
  }).finally(() => {
    if (gatewayCheckPromise?.promise === promise) gatewayCheckPromise = null;
  });
  gatewayCheckPromise = { channel, promise };
  return promise;
}

export function startGatewayUpdateChecks() {
  const initial = setTimeout(() => {
    if (!gatewayUpdateState.error?.startsWith("update_activation_failed:")) void checkGatewayUpdate();
  }, 5_000);
  const periodic = setInterval(() => void checkGatewayUpdate(), 60 * 60 * 1000);
  initial.unref();
  periodic.unref();
  return () => {
    clearTimeout(initial);
    clearInterval(periodic);
  };
}

type GatewayUpdateRequest = { updateId: string; targetVersion: string; channel: UpdateChannel };

export function readGatewayUpdateRequest(key: string): GatewayUpdateRequest | null {
  const path = join(dirname(updateActivationPath), "requests", `${createHash("sha256").update(key).digest("hex")}.json`);
  try { return JSON.parse(readFileSync(path, "utf8")) as GatewayUpdateRequest; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new Error("update_request_state_invalid", { cause: error });
  }
}

export function bindGatewayUpdateRequest(key: string, request: GatewayUpdateRequest) {
  const previous = readGatewayUpdateRequest(key);
  if (previous && stableJson(previous) !== stableJson(request)) throw new Error("update_idempotency_conflict");
  const path = join(dirname(updateActivationPath), "requests", `${createHash("sha256").update(key).digest("hex")}.json`);
  if (!previous) writeJsonAtomic(path, request);
}

export function installGatewayUpdate(updateId: string, requestedTargetVersion = "", channel = selectedUpdateChannel()) {
  if (gatewayInstallPromise) return gatewayInstallPromise;
  const promise = (async () => {
    if (pendingCoreActivation()) throw new Error("update_previous_activation_pending");
    const manifest = await fetchSignedUpdateManifest(channel);
    const target = manifest.payload.core?.version || coreVersion;
    if (requestedTargetVersion && requestedTargetVersion !== target) throw new Error(`update_target_version_mismatch:${requestedTargetVersion}:${target}`);
    gatewayUpdateState = { ...getGatewayUpdateState(), status: "installing", error: null };
    return updateAll(channel, { updateId, manifest });
  })().then(result => {
    const updated = result.core.updated || result.compatibility.updated;
    gatewayUpdateState = {
      ...getGatewayUpdateState(),
      status: updated ? "restarting" : "current",
      latestVersion: result.core.updated
        ? result.core.version
        : result.compatibility.updated
          ? result.compatibility.version
          : gatewayUpdateState.latestVersion,
      error: null,
    };
    return result;
  }).catch(error => {
    gatewayUpdateState = { ...getGatewayUpdateState(), status: "error", error: error instanceof Error ? error.message : "update_install_failed" };
    throw error;
  }).finally(() => {
    if (gatewayInstallPromise === promise) gatewayInstallPromise = null;
  });
  gatewayInstallPromise = promise;
  return promise;
}

async function validateCoreRuntime(executable: string) {
  const home = mkdtempSync(join(tmpdir(), "better-codex-update-"));
  mkdirSync(join(home, "run"), { recursive: true });
  writeFileSync(join(home, "run", "injection.json"), JSON.stringify({ enabled: false }), { mode: 0o600 });
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    BETTER_CODEX_HOME: home,
    BETTER_CODEX_RUNTIME_PORT: "0",
    BETTER_CODEX_DISABLE_DELEGATION: "1",
    CODEX_HOME: join(home, "codex"),
  };
  delete environment.BETTER_CODEX_DB;
  const invocation = coreInvocation(executable, ["runtime"]);
  const child = spawn(invocation.command, invocation.args, { stdio: "ignore", windowsHide: true, env: environment });
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (child.exitCode !== null) throw new Error("core_health_validation_failed");
      try {
        const state = JSON.parse(readFileSync(join(home, "run", "runtime.json"), "utf8")) as { port?: number; instanceId?: string };
        if (!state.port || !state.instanceId) continue;
        const response = await fetch(`http://127.0.0.1:${state.port}/health`, { signal: AbortSignal.timeout(1000) });
        const health = await response.json() as { ok?: boolean; instanceId?: string };
        if (response.ok && health.ok && health.instanceId === state.instanceId) return;
      } catch {}
    }
    throw new Error("core_health_validation_failed");
  } finally {
    child.kill("SIGTERM");
    try { rmSync(home, { recursive: true, force: true }); } catch {}
  }
}

function rollbackCorePointer(pointer: RuntimePointer) {
  if (!pointer.previous || pointer.previous === coreVersion) {
    if (existsSync(runtimeCurrentPath)) unlinkSync(runtimeCurrentPath);
    return;
  }
  const executable = runtimeEntrypoint(pointer.previous);
  if (!executable) {
    if (existsSync(runtimeCurrentPath)) unlinkSync(runtimeCurrentPath);
    return;
  }
  writeJsonAtomic(runtimeCurrentPath, { current: pointer.previous, previous: coreVersion, executable, updatedAt: new Date().toISOString() } satisfies RuntimePointer);
}

export function rollbackCoreUpdate(expectedVersion?: string | null) {
  const pointer = readRuntimePointer();
  if (!pointer || (expectedVersion && pointer.current !== expectedVersion)) return { rolledBack: false };
  const previous = pointer.current;
  rollbackCorePointer(pointer);
  return { rolledBack: true, previous, version: effectiveCoreVersion() };
}

function rollbackCoreTargetVersion(pointer: RuntimePointer | null) {
  if (!pointer) return effectiveCoreVersion();
  if (!pointer.previous || pointer.previous === coreVersion) return coreVersion;
  const executable = runtimeEntrypoint(pointer.previous);
  return executable ? pointer.previous : coreVersion;
}

function rollbackAllUpdatesUnlocked() {
    const recoveredRollback = settleInterruptedUpdateTransaction();
    if (recoveredRollback) return recoveredRollback;
    const corePointer = readRuntimePointer();
    const compatibilityPointer = readCompatibilityPointer();
    const rollback = readRollbackState();

    if (rollback) {
      if (effectiveCoreVersion() !== rollback.after.core || activeCompatibility().version !== rollback.after.compatibility) throw new Error("rollback_state_stale");
      validateRollbackTarget(rollback);
      writeRollbackState(rollback.before, rollback.after, "rolling_back");
      return completeRollback({ ...rollback, phase: "rolling_back" });
    }

    if (corePointer) {
      const targetCoreVersion = rollbackCoreTargetVersion(corePointer);
      rollbackCorePointer(corePointer);
      return {
        rolledBack: true,
        core: { rolledBack: true, previous: corePointer.current, version: targetCoreVersion, pendingRestart: true },
        compatibility: { rolledBack: false },
        pendingRestart: true,
        legacy: true,
      };
    }
    if (compatibilityPointer?.previous) {
      const previous = activeCompatibility().version;
      const compatibility = rollbackCompatibility();
      return { rolledBack: true, core: { rolledBack: false }, compatibility: { rolledBack: true, previous, version: compatibility.version }, pendingRestart: false, legacy: true };
    }
    return { rolledBack: false, core: { rolledBack: false }, compatibility: { rolledBack: false }, pendingRestart: false };
}

export function rollbackAllUpdates() {
  const lock = acquireUpdateOperationLock();
  try { requireOfflineUpdateWriter(); return rollbackAllUpdatesUnlocked(); } finally { releaseUpdateOperationLock(lock); }
}

function requireOfflineUpdateWriter() {
  if (readRuntimeState() || readGatewayUpdateActivationState()?.status === "activating") throw new Error("update_runtime_coordinator_required");
}

export function rollbackActivatedUpdate(expected: { core: string | null; compatibility: string | null }, updateId?: string) {
  const lock = acquireUpdateOperationLock();
  try {
    const transaction = readRollbackState();
    if (transaction?.updateId) {
      if (transaction.updateId !== updateId || runtimeAuthorityUpdateState(updateId).state !== "active") throw new Error("update_superseded");
      if (expected.core && transaction.after.core !== expected.core || expected.compatibility && transaction.after.compatibility !== expected.compatibility) throw new Error("update_superseded");
      const core = effectiveCoreVersion();
      const compatibility = activeCompatibility().version;
      if (![transaction.after.core, transaction.before.core?.current || transaction.sourceCoreVersion].includes(core) || ![transaction.after.compatibility, transaction.before.compatibility?.current || bundledCompatibility.version].includes(compatibility)) throw new Error("update_pointer_conflict");
      if (transaction.phase !== "rolling_back" && transaction.phase !== "restored") throw new Error("update_rollback_intent_missing");
      return completeRollback(transaction);
    }
    if (
      (expected.core && effectiveCoreVersion() !== expected.core)
      || (expected.compatibility && activeCompatibility().version !== expected.compatibility)
    ) {
      return { rolledBack: false, reason: "update_superseded", core: { rolledBack: false }, compatibility: { rolledBack: false }, pendingRestart: false };
    }
    return rollbackAllUpdatesUnlocked();
  } finally {
    releaseUpdateOperationLock(lock);
  }
}

export function rollbackAbandonedUpdate(expectedCore: string | null) {
  const lock = acquireUpdateOperationLock();
  try {
    const transaction = readRollbackState();
    if (!transaction) {
      if (expectedCore) throw new Error("update_rollback_state_missing");
      return { rolledBack: false, core: { rolledBack: false }, compatibility: { rolledBack: false }, pendingRestart: false };
    }
    if (expectedCore && transaction.after.core !== expectedCore) throw new Error("update_superseded");
    if (transaction.phase === "staged") {
      unlinkSync(updateRollbackPath);
      return { rolledBack: false, core: { rolledBack: false }, compatibility: { rolledBack: false }, pendingRestart: false };
    }
    if (transaction.phase === "applying") {
      settleInterruptedUpdateTransaction();
      return { rolledBack: false, core: { rolledBack: false }, compatibility: { rolledBack: false }, pendingRestart: false };
    }
    return completeRollback(transaction);
  } finally {
    releaseUpdateOperationLock(lock);
  }
}

export function activeVersions() {
  return {
    core: coreVersion,
    compatibility: activeCompatibility().version,
    managedCore: readRuntimePointer()?.current ?? null,
  };
}

export async function checkForUpdates(channel: UpdateChannel = selectedUpdateChannel()) {
  try {
    const manifest = await fetchUpdateManifest(channel);
    const coreAsset = manifest.core?.assets[platformAssetKey()];
    const result = {
      checked: true,
      offline: false,
      channel,
      current: activeVersions(),
      core: manifest.core ? { version: manifest.core.version, available: Boolean(coreAsset) && compareVersions(manifest.core.version, effectiveCoreVersion()) > 0 } : null,
      compatibility: manifest.compatibility ? { version: manifest.compatibility.version, available: compareVersions(manifest.compatibility.version, activeCompatibility().version) > 0, minimumCoreVersion: manifest.compatibility.minimumCoreVersion } : null,
    };
    writeJsonAtomic(updateStatePath, { checkedAt: new Date().toISOString(), channel, result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "update_check_failed";
    const result = { checked: false, offline: message.startsWith("update_http_") || message.includes("fetch") || message.includes("timeout"), channel, current: activeVersions(), error: message };
    writeJsonAtomic(updateStatePath, { checkedAt: new Date().toISOString(), channel, result });
    return result;
  }
}

async function updateCompatibilityUnlocked(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel(), publish = true, targetCoreVersion = effectiveCoreVersion()) {
  const manifest = payload ?? await fetchUpdateManifest(channel);
  const asset = manifest.compatibility;
  if (!asset) return { updated: false, reason: "compatibility_update_unavailable", version: activeCompatibility().version };
  if (compareVersions(targetCoreVersion, asset.minimumCoreVersion ?? "0.0.0") < 0) throw new Error("compatibility_core_incompatible");
  if (compareVersions(asset.version, activeCompatibility().version) <= 0) return { updated: false, reason: "compatibility_current", version: activeCompatibility().version };
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  const compatibility = validateCompatibility(JSON.parse(content.toString("utf8")), targetCoreVersion);
  if (compatibility.version !== asset.version || compatibility.minimumCoreVersion !== asset.minimumCoreVersion) throw new Error("compatibility_manifest_mismatch");
  ensureDirectories();
  requireStorageCapacity(compatibilityVersionsPath, content.length * 2);
  const directory = join(compatibilityVersionsPath, compatibility.version);
  mkdirSync(directory, { recursive: true });
  const target = join(directory, "manifest.json");
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, content, { mode: 0o600 });
  renameSync(temporary, target);
  const current = activeCompatibility().version;
  if (compareVersions(compatibility.version, current) <= 0) return { updated: false, reason: "compatibility_current", version: current };
  if (publish) writeCompatibilityPointer({ current: compatibility.version, previous: current, failures: 0, updatedAt: new Date().toISOString() });
  return { updated: true, previous: current, version: compatibility.version };
}

export async function updateCompatibility(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
  requireOfflineUpdateWriter();
  return withUpdateOperationLock(async () => {
    const before = { core: readRuntimePointer(), compatibility: readCompatibilityPointer() };
    const manifest = validatePayload(payload ?? await fetchUpdateManifest(channel), channel);
    const current = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version };
    const plannedAfter = {
      core: current.core,
      compatibility: manifest.compatibility && compareVersions(manifest.compatibility.version, current.compatibility) > 0 ? manifest.compatibility.version : current.compatibility,
    };
    if (plannedAfter.compatibility === current.compatibility) return updateCompatibilityUnlocked(manifest, channel);
    writeRollbackState(before, plannedAfter, "applying");
    try {
      const result = await updateCompatibilityUnlocked(manifest, channel);
      const actualAfter = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version };
      if (actualAfter.core !== plannedAfter.core || actualAfter.compatibility !== plannedAfter.compatibility) throw new Error("update_transaction_version_mismatch");
      writeRollbackState(before, actualAfter, "ready");
      return result;
    } catch (error) {
      restorePointerPair(before);
      if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      throw error;
    }
  });
}

async function updateCoreUnlocked(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel(), publish = true) {
  if (!coreUpdatesSupported) return { updated: false, reason: "core_update_requires_packaged_build", version: coreVersion };
  const manifest = validatePayload(payload ?? await fetchUpdateManifest(channel), channel);
  if (!manifest.core || compareVersions(manifest.core.version, effectiveCoreVersion()) <= 0) return { updated: false, reason: "core_current", version: effectiveCoreVersion() };
  const asset = manifest.core.assets[platformAssetKey()];
  if (!asset) throw new Error("core_asset_unavailable");
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  ensureDirectories();
  requireStorageCapacity(runtimeVersionsPath, content.length * 3);
  const runtimeRoot = resolve(runtimeVersionsPath);
  const directory = resolve(runtimeRoot, manifest.core.version);
  const relation = relative(runtimeRoot, directory);
  if (!relation || relation.startsWith("..") || isAbsolute(relation)) throw new Error("update_core_invalid");
  const executableName = packagedBuild ? "better-codex.cjs" : process.platform === "win32" ? "better-codex.exe" : "better-codex";
  const stagingDirectory = mkdtempSync(join(runtimeRoot, ".update-"));
  const stagedExecutable = join(stagingDirectory, executableName);
  try {
    writeFileSync(stagedExecutable, content, { mode: 0o755 });
    if (process.platform !== "win32") chmodSync(stagedExecutable, 0o755);
    const validationInvocation = coreInvocation(stagedExecutable, ["version", "--json"]);
    const validation = spawnSync(validationInvocation.command, validationInvocation.args, { encoding: "utf8", windowsHide: true, timeout: 15000, env: { ...process.env, BETTER_CODEX_HOME: join(stagingDirectory, "validation"), CODEX_HOME: join(stagingDirectory, "codex"), BETTER_CODEX_DISABLE_DELEGATION: "1" } });
    if (validation.status !== 0) throw new Error("core_validation_failed");
    const version = JSON.parse(validation.stdout) as { core?: string };
    if (version.core !== manifest.core.version) throw new Error("core_version_mismatch");
    await validateCoreRuntime(stagedExecutable);
    const current = effectiveCoreVersion();
    if (compareVersions(manifest.core.version, current) <= 0) return { updated: false, reason: "core_current", version: current };
    mkdirSync(directory, { recursive: true });
    const executable = join(directory, executableName);
    renameSync(stagedExecutable, executable);
    const previous = readRuntimePointer();
    if (publish) writeJsonAtomic(runtimeCurrentPath, { current: manifest.core.version, previous: previous?.current ?? coreVersion, executable, updatedAt: new Date().toISOString() } satisfies RuntimePointer);
    return { updated: true, previous: previous?.current ?? coreVersion, version: manifest.core.version, pendingRestart: true };
  } finally {
    try { rmSync(stagingDirectory, { recursive: true, force: true }); } catch {}
  }
}

export async function updateCore(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
  requireOfflineUpdateWriter();
  return withUpdateOperationLock(async () => {
    if (!coreUpdatesSupported) return updateCoreUnlocked(payload, channel);
    const before = { core: readRuntimePointer(), compatibility: readCompatibilityPointer() };
    const manifest = validatePayload(payload ?? await fetchUpdateManifest(channel), channel);
    const current = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version };
    const plannedAfter = {
      core: manifest.core && manifest.core.assets[platformAssetKey()] && compareVersions(manifest.core.version, current.core) > 0 ? manifest.core.version : current.core,
      compatibility: current.compatibility,
    };
    if (plannedAfter.core === current.core) return updateCoreUnlocked(manifest, channel);
    writeRollbackState(before, plannedAfter, "applying");
    try {
      const result = await updateCoreUnlocked(manifest, channel);
      const actualAfter = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version };
      if (actualAfter.core !== plannedAfter.core || actualAfter.compatibility !== plannedAfter.compatibility) throw new Error("update_transaction_version_mismatch");
      writeRollbackState(before, actualAfter, "ready");
      return result;
    } catch (error) {
      restorePointerPair(before);
      if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      throw error;
    }
  });
}

export async function updateAll(channel: UpdateChannel = selectedUpdateChannel(), pinned?: { updateId: string; manifest: SignedUpdateManifest }) {
  if (!pinned) requireOfflineUpdateWriter();
  return withUpdateOperationLock(async () => {
    const manifest = validatePayload(pinned?.manifest.payload ?? await fetchUpdateManifest(channel), channel);
    let source = readRuntimePointer();
    if (pinned && coreUpdatesSupported && !source) {
      const directory = join(runtimeVersionsPath, coreVersion);
      mkdirSync(directory, { recursive: true });
      const executable = join(directory, packagedBuild ? "better-codex.cjs" : process.platform === "win32" ? "better-codex.exe" : "better-codex");
      if (resolve(executable) !== currentCoreEntrypoint()) copyFileSync(currentCoreEntrypoint(), executable);
      source = { current: coreVersion, previous: null, executable, updatedAt: new Date().toISOString() };
    }
    let sourceCompatibility = readCompatibilityPointer();
    if (pinned) {
      const compatibility = activeCompatibility();
      writeJsonAtomic(join(compatibilityVersionsPath, compatibility.version, "manifest.json"), compatibility);
      sourceCompatibility ||= { current: compatibility.version, previous: null, failures: 0, updatedAt: new Date().toISOString() };
    }
    const before = { core: source, compatibility: sourceCompatibility };
    const plannedAfter = {
      core: manifest.core && coreUpdatesSupported && manifest.core.assets[platformAssetKey()] && compareVersions(manifest.core.version, effectiveCoreVersion()) > 0
        ? manifest.core.version
        : effectiveCoreVersion(),
      compatibility: manifest.compatibility && compareVersions(manifest.compatibility.version, activeCompatibility().version) > 0
        ? manifest.compatibility.version
        : activeCompatibility().version,
    };
    const metadata: Partial<UpdateRollbackState> = { sourceCoreVersion: coreVersion, ...(pinned ? { updateId: pinned.updateId, manifest: pinned.manifest, manifestDigest: createHash("sha256").update(stableJson(pinned.manifest.payload)).digest("hex") } : {}) };
    validateRollbackTarget({ before, after: plannedAfter, updatedAt: new Date().toISOString(), ...metadata });
    writeRollbackState(before, plannedAfter, pinned ? "staged" : "applying", metadata);
    try {
      const core = await updateCoreUnlocked(manifest, channel, !pinned);
      const compatibility = await updateCompatibilityUnlocked(manifest, channel, !pinned, plannedAfter.core);
      const actualAfter = { core: core.version, compatibility: compatibility.version };
      if (actualAfter.core !== plannedAfter.core || actualAfter.compatibility !== plannedAfter.compatibility) throw new Error("update_transaction_version_mismatch");
      if (core.updated || compatibility.updated) writeRollbackState(before, actualAfter, pinned ? "staged" : "ready", metadata);
      else if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      return { channel, core, compatibility, runtimeSessionHandoff: manifest.runtimeSessionHandoff || null };
    } catch (error) {
      if (!pinned) restorePointerPair(before);
      if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      throw error;
    }
  });
}

export function activateStagedUpdate(updateId: string) {
  const lock = acquireUpdateOperationLock();
  try {
    const transaction = readRollbackState();
    if (!transaction || transaction.updateId !== updateId || transaction.phase !== "staged") throw new Error("update_staging_identity_mismatch");
    if (runtimeAuthorityUpdateState(updateId).state !== "active") throw new Error("update_staging_authority_mismatch");
    const manifest = transaction.manifest;
    if (!manifest || createHash("sha256").update(stableJson(manifest.payload)).digest("hex") !== transaction.manifestDigest || !verify(null, Buffer.from(stableJson(manifest.payload)), publicKey(), Buffer.from(manifest.signature, "base64"))) throw new Error("update_staging_signature_invalid");
    const sourceVersion = transaction.before.core?.current || transaction.sourceCoreVersion;
    const sourceCompatibility = transaction.before.compatibility?.current || bundledCompatibility.version;
    if (effectiveCoreVersion() !== sourceVersion || activeCompatibility().version !== sourceCompatibility) throw new Error("update_staging_source_changed");
    const executable = runtimeEntrypoint(transaction.after.core) || (transaction.after.core === coreVersion ? currentCoreEntrypoint() : null);
    if (!executable) throw new Error("update_staged_core_unavailable");
    const asset = manifest.payload.core?.assets[platformAssetKey()];
    if (transaction.after.core !== sourceVersion && (!asset || createHash("sha256").update(readFileSync(executable)).digest("hex") !== asset.sha256.toLowerCase())) throw new Error("update_staged_core_hash_mismatch");
    if (transaction.after.compatibility !== sourceCompatibility) {
      const contents = readFileSync(join(compatibilityVersionsPath, transaction.after.compatibility, "manifest.json"));
      if (!manifest.payload.compatibility || createHash("sha256").update(contents).digest("hex") !== manifest.payload.compatibility.sha256.toLowerCase()) throw new Error("update_staged_compatibility_hash_mismatch");
    }
    validateRollbackTarget(transaction);
    writeRollbackState(transaction.before, transaction.after, "applying", transaction);
    if (coreUpdatesSupported) writeJsonAtomic(runtimeCurrentPath, { current: transaction.after.core, previous: sourceVersion, executable, updatedAt: new Date().toISOString() });
    writeCompatibilityPointer({ current: transaction.after.compatibility, previous: sourceCompatibility, failures: 0, updatedAt: new Date().toISOString() });
    writeRollbackState(transaction.before, transaction.after, "ready", transaction);
  } finally {
    releaseUpdateOperationLock(lock);
  }
}

export function prepareUpdateRollback(updateId: string, error: string, generation: number) {
  const lock = acquireUpdateOperationLock();
  try { return withActivationLock(() => {
    const activation = readGatewayUpdateActivationState();
    if (activation?.updateId !== updateId || activation.stage === "recovery_failed") throw new Error("update_recovery_requires_action");
    if (activation.stage === "committing" || activation.stage === "committing_rollback") throw new Error("update_commit_outcome_pending");
    const authority = runtimeAuthorityUpdateState(updateId);
    if (authority.state !== "active" || authority.generation !== generation) throw new Error(`update_activation_authority_${authority.state}`);
    const transaction = readRollbackState();
    if (!transaction || transaction.updateId && transaction.updateId !== updateId) throw new Error("update_rollback_state_missing");
    validateRollbackTarget(transaction);
    writeRollbackState(transaction.before, transaction.after, "rolling_back", transaction);
    recordGatewayUpdateActivation("activating", error, { core: activation.coreVersion || null, compatibility: activation.compatibilityVersion || null }, process.pid, updateId, generation, { stage: "rolling_back", failure: activation.failure || { code: error, stage: activation.stage || "activating" }, sourceCoreVersion: transaction.sourceCoreVersion || transaction.before.core?.current });
  }); } finally {
    releaseUpdateOperationLock(lock);
  }
}

export function verifyUpdatePointers(updateId: string, recovering: boolean) {
  const transaction = readRollbackState();
  if (!transaction?.updateId) return;
  if (transaction.updateId !== updateId) throw new Error("update_superseded");
  const expected = recovering ? { core: transaction.before.core?.current || transaction.sourceCoreVersion, compatibility: transaction.before.compatibility?.current || bundledCompatibility.version } : transaction.after;
  if (effectiveCoreVersion() !== expected.core || activeCompatibility().version !== expected.compatibility) throw new Error("update_pointer_outcome_mismatch");
}

export function rollbackCompatibilityUpdate(expectedVersion?: string | null) {
  requireOfflineUpdateWriter();
  const pointer = readCompatibilityPointer();
  if (expectedVersion && pointer?.current !== expectedVersion) return { rolledBack: false };
  const previous = activeCompatibility().version;
  const compatibility = rollbackCompatibility(expectedVersion);
  return { rolledBack: true, previous, version: compatibility.version };
}

export function maybeDelegateToActiveCore() {
  if (!coreUpdatesSupported || process.env.BETTER_CODEX_DISABLE_DELEGATION === "1") return null;
  if (process.argv[2] === "apply-update" || process.argv[2] === "update" && process.argv[3] === "install") return null;
  const pointer = readRuntimePointer();
  if (!pointer || resolve(pointer.executable) === currentCoreEntrypoint()) return null;
  if (!existsSync(pointer.executable)) throw new Error("managed_core_unavailable");
  const invocation = coreInvocation(pointer.executable, process.argv.slice(2));
  const environment = { ...process.env };
  if (isSea()) environment.BETTER_CODEX_LAUNCHER_PATH = process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath;
  else {
    delete environment.BETTER_CODEX_LAUNCHER_PATH;
    environment.BETTER_CODEX_BASE_ENTRYPOINT = process.env.BETTER_CODEX_BASE_ENTRYPOINT ?? currentCoreEntrypoint();
  }
  const child = spawnSync(invocation.command, invocation.args, { stdio: "inherit", windowsHide: true, env: environment });
  if (child.error) throw new Error("managed_core_launch_failed", { cause: child.error });
  return child.status ?? 1;
}

export function shouldCheckForUpdates() {
  try {
    const value = JSON.parse(readFileSync(updateStatePath, "utf8")) as { checkedAt?: string };
    return !value.checkedAt || Date.now() - Date.parse(value.checkedAt) > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}
