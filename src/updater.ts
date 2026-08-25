import { spawn, spawnSync } from "node:child_process";
import { createHash, verify } from "node:crypto";
import { chmodSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isSea } from "node:sea";
import { packagedBuild } from "./build.js";
import { activeCompatibility, bundledCompatibility, compareVersions, coreVersion, readCompatibilityPointer, rollbackCompatibility, validateCompatibility, writeCompatibilityPointer } from "./compatibility.js";
import { compatibilityCurrentPath, compatibilityVersionsPath, ensureDirectories, runtimeCurrentPath, runtimeVersionsPath, updateActivationPath, updateChannelPath, updatePublicKeyPath, updateRollbackPath, updateStatePath } from "./config.js";
import { requireStorageCapacity } from "./storage-health.js";

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
  checkedAt: string | null;
  error: string | null;
  coreUpdateSupported?: boolean;
  channel: UpdateChannel;
};

type CompatibilityPointerState = NonNullable<ReturnType<typeof readCompatibilityPointer>>;

type UpdateRollbackState = {
  phase?: "applying" | "ready" | "rolling_back";
  before: { core: RuntimePointer | null; compatibility: CompatibilityPointerState | null };
  after: { core: string; compatibility: string };
  updatedAt: string;
};

export type ActivationState = {
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

export function readGatewayUpdateActivationState() {
  try {
    const value = JSON.parse(readFileSync(updateActivationPath, "utf8")) as ActivationState;
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

const activationRecoveryTimeout = 120_000;
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

function acquireActivationRecoveryLock() {
  const path = `${updateActivationPath}.lock`;
  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(path, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, token }));
      closeSync(descriptor);
      return { path, token };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(readFileSync(path, "utf8")) as { pid?: number };
        if (Number.isInteger(owner.pid) && owner.pid && processAlive(owner.pid)) return null;
      } catch {}
      try { unlinkSync(path); } catch { return null; }
    }
  }
  return null;
}

function releaseActivationRecoveryLock(lock: { path: string; token: string }) {
  try {
    const owner = JSON.parse(readFileSync(lock.path, "utf8")) as { token?: string };
    if (owner.token === lock.token) unlinkSync(lock.path);
  } catch {}
}

function persistedActivationState(): GatewayUpdateState {
  recoverInterruptedUpdateTransaction();
  try {
    const value = JSON.parse(readFileSync(updateActivationPath, "utf8")) as ActivationState;
    if (value.status === "activating") {
      const startedAt = Date.parse(value.updatedAt || "");
      if (Number.isInteger(value.ownerPid) && value.ownerPid && processAlive(value.ownerPid)) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null, channel: selectedUpdateChannel() };
      if (Number.isFinite(startedAt) && Date.now() - startedAt <= activationRecoveryTimeout) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null, channel: selectedUpdateChannel() };
      const lock = acquireActivationRecoveryLock();
      if (!lock) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null, channel: selectedUpdateChannel() };
      try {
        const current = JSON.parse(readFileSync(updateActivationPath, "utf8")) as ActivationState;
        if (current.status !== "activating" || current.updatedAt !== value.updatedAt) return persistedActivationState();
        if (!current.coreVersion && current.core) current.coreVersion = readRuntimePointer()?.current ?? null;
        if (!current.compatibilityVersion && current.compatibility) current.compatibilityVersion = readCompatibilityPointer()?.current ?? null;
        writeJsonAtomic(updateActivationPath, current);
        rollbackActivatedUpdate({ core: current.coreVersion ?? null, compatibility: current.compatibilityVersion ?? null });
        writeJsonAtomic(updateActivationPath, { ...current, status: "error", error: "update_activation_interrupted", ownerPid: null, updatedAt: new Date().toISOString() });
        return { status: "error", currentVersion: coreVersion, latestVersion: null, checkedAt: current.updatedAt ?? null, error: "update_activation_failed:update_activation_interrupted", channel: selectedUpdateChannel() };
      } finally {
        releaseActivationRecoveryLock(lock);
      }
    }
    if (value.status === "error") return { status: "error", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: `update_activation_failed:${value.error || "unknown"}`, channel: selectedUpdateChannel() };
  } catch {}
  return { status: "idle", currentVersion: coreVersion, latestVersion: null, checkedAt: null, error: null, channel: selectedUpdateChannel() };
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

function acquireUpdateOperationLock() {
  ensureDirectories();
  const path = `${updateStatePath}.lock`;
  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(path, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, token }));
      closeSync(descriptor);
      return { path, token };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        const owner = JSON.parse(readFileSync(path, "utf8")) as { pid?: number };
        if (Number.isInteger(owner.pid) && owner.pid && processAlive(owner.pid)) throw new Error("update_in_progress");
      } catch (ownerError) {
        if (ownerError instanceof Error && ownerError.message === "update_in_progress") throw ownerError;
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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
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
  const response = await fetch(url, { signal: AbortSignal.timeout(300000), redirect: "follow", cache: "no-store", headers: { "cache-control": "no-cache", pragma: "no-cache" } });
  if (!response.ok) throw new Error(`update_http_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
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

export async function fetchUpdateManifest(channel: UpdateChannel = selectedUpdateChannel()) {
  const content = await download(manifestUrl(channel));
  const manifest = JSON.parse(content.toString("utf8")) as SignedUpdateManifest;
  if (!manifest.payload || typeof manifest.signature !== "string") throw new Error("update_manifest_invalid");
  const valid = verify(null, Buffer.from(stableJson(manifest.payload)), publicKey(), Buffer.from(manifest.signature, "base64"));
  if (!valid) throw new Error("update_signature_invalid");
  return validatePayload(manifest.payload, channel);
}

function platformAssetKey() {
  const architecture = process.arch === "x64" ? "amd64" : process.arch;
  return `${process.platform}-${architecture}`;
}

function writeJsonAtomic(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, path);
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
  try { return validatedRuntimePointer(JSON.parse(readFileSync(runtimeCurrentPath, "utf8"))); } catch { return null; }
}

function readRollbackState() {
  try {
    const value = JSON.parse(readFileSync(updateRollbackPath, "utf8")) as UpdateRollbackState;
    if (!value?.before || !value.after || typeof value.after.core !== "string" || typeof value.after.compatibility !== "string") return null;
    const core = value.before.core === null ? null : validatedRuntimePointer(value.before.core);
    if (value.before.core !== null && !core) return null;
    const compatibility = value.before.compatibility;
    if (compatibility !== null && (typeof compatibility.current !== "string" || !Number.isInteger(compatibility.failures))) return null;
    return { ...value, before: { core, compatibility } };
  } catch {
    return null;
  }
}

function writeRollbackState(
  before: UpdateRollbackState["before"],
  after = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version },
  phase: "applying" | "ready" | "rolling_back" = "ready",
) {
  writeJsonAtomic(updateRollbackPath, {
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
  const targetCoreVersion = transaction.before.core?.current ?? coreVersion;
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
  const targetCoreVersion = transaction.before.core?.current ?? coreVersion;
  if (transaction.before.core && !existsSync(transaction.before.core.executable)) throw new Error("rollback_core_unavailable");
  const targetCompatibilityVersion = transaction.before.compatibility?.current ?? bundledCompatibility.version;
  if (targetCompatibilityVersion !== bundledCompatibility.version) {
    validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, targetCompatibilityVersion, "manifest.json"), "utf8")), targetCoreVersion);
  }
}

function completeRollback(transaction: UpdateRollbackState) {
  validateRollbackTarget(transaction);
  restorePointerPair(transaction.before);
  if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
  return rollbackResult(transaction);
}

function settleInterruptedUpdateTransaction() {
  const transaction = readRollbackState();
  if (transaction?.phase === "rolling_back") return completeRollback(transaction);
  if (transaction?.phase !== "applying") return null;
  if (effectiveCoreVersion() === transaction.after.core && activeCompatibility().version === transaction.after.compatibility) {
    writeRollbackState(transaction.before, transaction.after, "ready");
    return null;
  }
  restorePointerPair(transaction.before);
  if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
  return null;
}

function recoverInterruptedUpdateTransaction() {
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
  return pointer && compareVersions(pointer.current, coreVersion) > 0 ? pointer.executable : currentCoreEntrypoint();
}

export function activeCoreCommand(args: string[]) {
  return coreInvocation(activeCoreExecutable(), args);
}

function effectiveCoreVersion() {
  const managed = readRuntimePointer()?.current;
  return managed && compareVersions(managed, coreVersion) > 0 ? managed : coreVersion;
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
  return { ...gatewayUpdateState, currentVersion: effectiveCoreVersion(), coreUpdateSupported: coreUpdatesSupported };
}

export function recordGatewayUpdateActivation(status: "activating" | "success" | "error", error: string | null = null, updates: { core: string | null; compatibility: string | null } = { core: null, compatibility: null }, ownerPid: number | null = null, updateId: string | null = null, targetRuntimeGeneration: number | null = null) {
  writeJsonAtomic(updateActivationPath, { status, error, coreVersion: updates.core, compatibilityVersion: updates.compatibility, ownerPid, updateId, targetRuntimeGeneration, updatedAt: new Date().toISOString() });
  gatewayUpdateState = status === "error"
    ? { ...getGatewayUpdateState(), status: "error", error: `update_activation_failed:${error || "unknown"}` }
    : { ...getGatewayUpdateState(), status: status === "activating" ? "restarting" : "current", error: null };
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
    gatewayUpdateState = { status: available ? "available" : "current", currentVersion: effectiveCoreVersion(), latestVersion, checkedAt, error: null, channel };
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

export function installGatewayUpdate() {
  if (gatewayInstallPromise) return gatewayInstallPromise;
  const channel = selectedUpdateChannel();
  const promise = checkGatewayUpdate(channel).then(state => {
    if (state.status === "current") {
      return {
        channel,
        core: { updated: false, reason: "core_current", version: state.currentVersion },
        compatibility: { updated: false, reason: "compatibility_current", version: activeCompatibility().version },
        runtimeSessionHandoff: null,
      };
    }
    if (state.status !== "available") throw new Error(state.error || "update_not_available");
    gatewayUpdateState = { ...getGatewayUpdateState(), status: "installing", error: null };
    return updateAll(channel);
  }).then(result => {
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
  try { return rollbackAllUpdatesUnlocked(); } finally { releaseUpdateOperationLock(lock); }
}

export function rollbackActivatedUpdate(expected: { core: string | null; compatibility: string | null }) {
  const lock = acquireUpdateOperationLock();
  try {
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

async function updateCompatibilityUnlocked(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
  const manifest = payload ?? await fetchUpdateManifest(channel);
  const asset = manifest.compatibility;
  if (!asset) return { updated: false, reason: "compatibility_update_unavailable", version: activeCompatibility().version };
  if (compareVersions(effectiveCoreVersion(), asset.minimumCoreVersion ?? "0.0.0") < 0) throw new Error("compatibility_core_incompatible");
  if (compareVersions(asset.version, activeCompatibility().version) <= 0) return { updated: false, reason: "compatibility_current", version: activeCompatibility().version };
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  const compatibility = validateCompatibility(JSON.parse(content.toString("utf8")), effectiveCoreVersion());
  if (compatibility.version !== asset.version || compatibility.minimumCoreVersion !== asset.minimumCoreVersion) throw new Error("compatibility_manifest_mismatch");
  ensureDirectories();
  requireStorageCapacity(compatibilityVersionsPath, content.length * 2);
  const directory = join(compatibilityVersionsPath, compatibility.version);
  mkdirSync(directory, { recursive: true });
  const target = join(directory, "manifest.json");
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(compatibility), { mode: 0o600 });
  renameSync(temporary, target);
  const current = activeCompatibility().version;
  if (compareVersions(compatibility.version, current) <= 0) return { updated: false, reason: "compatibility_current", version: current };
  writeCompatibilityPointer({ current: compatibility.version, previous: current, failures: 0, updatedAt: new Date().toISOString() });
  return { updated: true, previous: current, version: compatibility.version };
}

export async function updateCompatibility(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
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

async function updateCoreUnlocked(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
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
    const validation = spawnSync(validationInvocation.command, validationInvocation.args, { encoding: "utf8", windowsHide: true, timeout: 15000, env: { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" } });
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
    writeJsonAtomic(runtimeCurrentPath, { current: manifest.core.version, previous: previous?.current ?? coreVersion, executable, updatedAt: new Date().toISOString() } satisfies RuntimePointer);
    return { updated: true, previous: previous?.current ?? coreVersion, version: manifest.core.version, pendingRestart: true };
  } finally {
    try { rmSync(stagingDirectory, { recursive: true, force: true }); } catch {}
  }
}

export async function updateCore(payload?: UpdatePayload, channel: UpdateChannel = selectedUpdateChannel()) {
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

export async function updateAll(channel: UpdateChannel = selectedUpdateChannel()) {
  return withUpdateOperationLock(async () => {
    const before = { core: readRuntimePointer(), compatibility: readCompatibilityPointer() };
    const check = await checkForUpdates(channel);
    if ("error" in check || !check.checked) throw new Error("error" in check ? check.error : "update_check_failed");
    if (!check.core?.available && !check.compatibility?.available) {
      return {
        channel,
        core: { updated: false, reason: "core_current", version: effectiveCoreVersion() },
        compatibility: { updated: false, reason: "compatibility_current", version: activeCompatibility().version },
        runtimeSessionHandoff: null,
      };
    }
    const manifest = await fetchUpdateManifest(channel);
    const plannedAfter = {
      core: manifest.core && coreUpdatesSupported && manifest.core.assets[platformAssetKey()] && compareVersions(manifest.core.version, effectiveCoreVersion()) > 0
        ? manifest.core.version
        : effectiveCoreVersion(),
      compatibility: manifest.compatibility && compareVersions(manifest.compatibility.version, activeCompatibility().version) > 0
        ? manifest.compatibility.version
        : activeCompatibility().version,
    };
    writeRollbackState(before, plannedAfter, "applying");
    try {
      const core = await updateCoreUnlocked(manifest, channel);
      const compatibility = await updateCompatibilityUnlocked(manifest, channel);
      const actualAfter = { core: effectiveCoreVersion(), compatibility: activeCompatibility().version };
      if (actualAfter.core !== plannedAfter.core || actualAfter.compatibility !== plannedAfter.compatibility) throw new Error("update_transaction_version_mismatch");
      if (core.updated || compatibility.updated) writeRollbackState(before, actualAfter, "ready");
      else if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      return { channel, core, compatibility, runtimeSessionHandoff: manifest.runtimeSessionHandoff || null };
    } catch (error) {
      restorePointerPair(before);
      if (existsSync(updateRollbackPath)) unlinkSync(updateRollbackPath);
      throw error;
    }
  });
}

export function rollbackCompatibilityUpdate(expectedVersion?: string | null) {
  const pointer = readCompatibilityPointer();
  if (expectedVersion && pointer?.current !== expectedVersion) return { rolledBack: false };
  const previous = activeCompatibility().version;
  const compatibility = rollbackCompatibility(expectedVersion);
  return { rolledBack: true, previous, version: compatibility.version };
}

export function maybeDelegateToActiveCore() {
  if (!coreUpdatesSupported || process.env.BETTER_CODEX_DISABLE_DELEGATION === "1") return null;
  const pointer = readRuntimePointer();
  if (!pointer || compareVersions(pointer.current, coreVersion) <= 0 || resolve(pointer.executable) === currentCoreEntrypoint()) return null;
  if (!existsSync(pointer.executable)) {
    unlinkSync(runtimeCurrentPath);
    return null;
  }
  const invocation = coreInvocation(pointer.executable, process.argv.slice(2));
  const environment = { ...process.env };
  if (isSea()) environment.BETTER_CODEX_LAUNCHER_PATH = process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath;
  else {
    delete environment.BETTER_CODEX_LAUNCHER_PATH;
    environment.BETTER_CODEX_BASE_ENTRYPOINT = process.env.BETTER_CODEX_BASE_ENTRYPOINT ?? currentCoreEntrypoint();
  }
  const child = spawnSync(invocation.command, invocation.args, { stdio: "inherit", windowsHide: true, env: environment });
  if (child.error) {
    rollbackCorePointer(pointer);
    return null;
  }
  if (process.argv[2] === "runtime" && child.status !== 0) {
    rollbackCorePointer(pointer);
    return null;
  }
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
