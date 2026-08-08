import { spawn, spawnSync } from "node:child_process";
import { createHash, verify } from "node:crypto";
import { chmodSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isSea } from "node:sea";
import { activeCompatibility, bundledCompatibility, compareVersions, coreVersion, readCompatibilityPointer, rollbackCompatibility, validateCompatibility, writeCompatibilityPointer } from "./compatibility.js";
import { compatibilityVersionsPath, ensureDirectories, runtimeCurrentPath, runtimeVersionsPath, updateActivationPath, updatePublicKeyPath, updateStatePath } from "./config.js";

type UpdateAsset = {
  version: string;
  minimumCoreVersion?: string;
  url: string;
  sha256: string;
};

type UpdatePayload = {
  schemaVersion: 1;
  channel: "stable" | "preview";
  generatedAt: string;
  compatibility: UpdateAsset | null;
  core: {
    version: string;
    assets: Record<string, Omit<UpdateAsset, "version">>;
  } | null;
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
};

type ActivationState = {
  status?: string;
  error?: string | null;
  updatedAt?: string;
  coreVersion?: string | null;
  compatibilityVersion?: string | null;
  core?: boolean;
  compatibility?: boolean;
  ownerPid?: number | null;
};

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
  try {
    const value = JSON.parse(readFileSync(updateActivationPath, "utf8")) as ActivationState;
    if (value.status === "activating") {
      const startedAt = Date.parse(value.updatedAt || "");
      if (Number.isFinite(startedAt) && Date.now() - startedAt <= 120_000) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null };
      if (Number.isInteger(value.ownerPid) && value.ownerPid && processAlive(value.ownerPid)) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null };
      const lock = acquireActivationRecoveryLock();
      if (!lock) return { status: "restarting", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: null };
      try {
        const current = JSON.parse(readFileSync(updateActivationPath, "utf8")) as ActivationState;
        if (current.status !== "activating" || current.updatedAt !== value.updatedAt) return persistedActivationState();
        if (!current.coreVersion && current.core) current.coreVersion = readRuntimePointer()?.current ?? null;
        if (!current.compatibilityVersion && current.compatibility) current.compatibilityVersion = readCompatibilityPointer()?.current ?? null;
        writeJsonAtomic(updateActivationPath, current);
        if (current.coreVersion) rollbackCoreUpdate(current.coreVersion);
        if (current.compatibilityVersion) rollbackCompatibilityUpdate(current.compatibilityVersion);
        writeJsonAtomic(updateActivationPath, { ...current, status: "error", error: "update_activation_interrupted", ownerPid: null, updatedAt: new Date().toISOString() });
        return { status: "error", currentVersion: coreVersion, latestVersion: null, checkedAt: current.updatedAt ?? null, error: "update_activation_failed:update_activation_interrupted" };
      } finally {
        releaseActivationRecoveryLock(lock);
      }
    }
    if (value.status === "error") return { status: "error", currentVersion: coreVersion, latestVersion: null, checkedAt: value.updatedAt ?? null, error: `update_activation_failed:${value.error || "unknown"}` };
  } catch {}
  return { status: "idle", currentVersion: coreVersion, latestVersion: null, checkedAt: null, error: null };
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
let gatewayCheckPromise: Promise<GatewayUpdateState> | null = null;
let gatewayInstallPromise: Promise<Awaited<ReturnType<typeof updateAll>>> | null = null;

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

function manifestUrl(channel: "stable" | "preview") {
  const configured = process.env.BETTER_CODEX_UPDATE_MANIFEST_URL;
  if (configured) return httpsUrl(configured);
  const release = channel === "stable" ? "latest/download" : "download/preview";
  return new URL(`https://github.com/Ericwong5021/better-codex/releases/${release}/update-manifest.json`);
}

async function download(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow", cache: "no-store", headers: { "cache-control": "no-cache", pragma: "no-cache" } });
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

function validatePayload(value: unknown, channel: "stable" | "preview") {
  if (!value || typeof value !== "object") throw new Error("update_manifest_invalid");
  const payload = value as UpdatePayload;
  if (payload.schemaVersion !== 1 || payload.channel !== channel || !Number.isFinite(Date.parse(payload.generatedAt))) throw new Error("update_manifest_invalid");
  if (payload.compatibility) {
    if (typeof payload.compatibility.version !== "string" || typeof payload.compatibility.minimumCoreVersion !== "string") throw new Error("update_compatibility_invalid");
    validateUpdateAsset(payload.compatibility);
  }
  if (payload.core) {
    if (typeof payload.core.version !== "string" || !payload.core.assets || typeof payload.core.assets !== "object") throw new Error("update_core_invalid");
    Object.values(payload.core.assets).forEach(validateUpdateAsset);
  }
  return payload;
}

export async function fetchUpdateManifest(channel: "stable" | "preview" = "stable") {
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

function readRuntimePointer() {
  try {
    const value = JSON.parse(readFileSync(runtimeCurrentPath, "utf8")) as RuntimePointer;
    if (typeof value.current !== "string" || typeof value.executable !== "string") return null;
    const executable = resolve(value.executable);
    const relation = relative(resolve(runtimeVersionsPath), executable);
    if (!relation || relation.startsWith("..") || isAbsolute(relation)) return null;
    return { ...value, executable };
  } catch {
    return null;
  }
}

export function activeCoreExecutable() {
  return readRuntimePointer()?.executable ?? process.execPath;
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
  return { ...gatewayUpdateState, currentVersion: effectiveCoreVersion() };
}

export function recordGatewayUpdateActivation(status: "activating" | "success" | "error", error: string | null = null, updates: { core: string | null; compatibility: string | null } = { core: null, compatibility: null }, ownerPid: number | null = null) {
  writeJsonAtomic(updateActivationPath, { status, error, coreVersion: updates.core, compatibilityVersion: updates.compatibility, ownerPid, updatedAt: new Date().toISOString() });
  gatewayUpdateState = status === "error"
    ? { ...getGatewayUpdateState(), status: "error", error: `update_activation_failed:${error || "unknown"}` }
    : { ...getGatewayUpdateState(), status: status === "activating" ? "restarting" : "current", error: null };
}

export function checkGatewayUpdate() {
  if (gatewayCheckPromise) return gatewayCheckPromise;
  getGatewayUpdateState();
  if (["installing", "restarting"].includes(gatewayUpdateState.status)) return Promise.resolve(getGatewayUpdateState());
  gatewayUpdateState = { ...getGatewayUpdateState(), status: "checking", error: null };
  const promise = checkForUpdates().then(result => {
    const checkedAt = new Date().toISOString();
    if (!result.checked || !("core" in result)) {
      gatewayUpdateState = { ...getGatewayUpdateState(), status: "error", checkedAt, error: "error" in result ? result.error : "update_check_failed" };
      return getGatewayUpdateState();
    }
    const available = Boolean(result.core?.available || result.compatibility?.available);
    const latestVersion = result.core?.available
      ? result.core.version
      : result.compatibility?.available
        ? result.compatibility.version
        : effectiveCoreVersion();
    gatewayUpdateState = { status: available ? "available" : "current", currentVersion: effectiveCoreVersion(), latestVersion, checkedAt, error: null };
    return getGatewayUpdateState();
  }).finally(() => {
    if (gatewayCheckPromise === promise) gatewayCheckPromise = null;
  });
  gatewayCheckPromise = promise;
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
  const promise = checkGatewayUpdate().then(state => {
    if (state.status === "current") {
      return {
        channel: "stable" as const,
        core: { updated: false, reason: "core_current", version: state.currentVersion },
        compatibility: { updated: false, reason: "compatibility_current", version: activeCompatibility().version },
      };
    }
    if (state.status !== "available") throw new Error(state.error || "update_not_available");
    gatewayUpdateState = { ...getGatewayUpdateState(), status: "installing", error: null };
    return updateAll();
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
  const child = spawn(executable, ["runtime"], { stdio: "ignore", windowsHide: true, env: environment });
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
  const executable = join(runtimeVersionsPath, pointer.previous, process.platform === "win32" ? "better-codex.exe" : "better-codex");
  if (!existsSync(executable)) {
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

export function activeVersions() {
  return {
    core: coreVersion,
    compatibility: activeCompatibility().version,
    managedCore: readRuntimePointer()?.current ?? null,
  };
}

export async function checkForUpdates(channel: "stable" | "preview" = "stable") {
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

export async function updateCompatibility(payload?: UpdatePayload, channel: "stable" | "preview" = "stable") {
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
  const directory = join(compatibilityVersionsPath, compatibility.version);
  mkdirSync(directory, { recursive: true });
  const target = join(directory, "manifest.json");
  const temporary = `${target}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(compatibility), { mode: 0o600 });
  renameSync(temporary, target);
  const current = activeCompatibility().version;
  writeCompatibilityPointer({ current: compatibility.version, previous: current, failures: 0, updatedAt: new Date().toISOString() });
  return { updated: true, previous: current, version: compatibility.version };
}

export async function updateCore(payload?: UpdatePayload, channel: "stable" | "preview" = "stable") {
  if (!isSea()) return { updated: false, reason: "core_update_requires_binary", version: coreVersion };
  const manifest = payload ?? await fetchUpdateManifest(channel);
  if (!manifest.core || compareVersions(manifest.core.version, effectiveCoreVersion()) <= 0) return { updated: false, reason: "core_current", version: effectiveCoreVersion() };
  const asset = manifest.core.assets[platformAssetKey()];
  if (!asset) throw new Error("core_asset_unavailable");
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  ensureDirectories();
  const directory = join(runtimeVersionsPath, manifest.core.version);
  mkdirSync(directory, { recursive: true });
  const executable = join(directory, process.platform === "win32" ? "better-codex.exe" : "better-codex");
  const temporary = process.platform === "win32" ? `${executable}.${process.pid}.tmp.exe` : `${executable}.${process.pid}.tmp`;
  writeFileSync(temporary, content, { mode: 0o755 });
  if (process.platform !== "win32") chmodSync(temporary, 0o755);
  const validation = spawnSync(temporary, ["version", "--json"], { encoding: "utf8", windowsHide: true, timeout: 15000, env: { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" } });
  if (validation.status !== 0) throw new Error("core_validation_failed");
  const version = JSON.parse(validation.stdout) as { core?: string };
  if (version.core !== manifest.core.version) throw new Error("core_version_mismatch");
  await validateCoreRuntime(temporary);
  renameSync(temporary, executable);
  const previous = readRuntimePointer();
  writeJsonAtomic(runtimeCurrentPath, { current: manifest.core.version, previous: previous?.current ?? coreVersion, executable, updatedAt: new Date().toISOString() } satisfies RuntimePointer);
  return { updated: true, previous: previous?.current ?? coreVersion, version: manifest.core.version, pendingRestart: true };
}

export async function updateAll(channel: "stable" | "preview" = "stable") {
  const check = await checkForUpdates(channel);
  if ("error" in check || !check.checked) throw new Error("error" in check ? check.error : "update_check_failed");
  if (!check.core?.available && !check.compatibility?.available) {
    return {
      channel,
      core: { updated: false, reason: "core_current", version: effectiveCoreVersion() },
      compatibility: { updated: false, reason: "compatibility_current", version: activeCompatibility().version },
    };
  }
  const manifest = await fetchUpdateManifest(channel);
  const core = await updateCore(manifest, channel);
  try {
    const compatibility = await updateCompatibility(manifest, channel);
    return { channel, core, compatibility };
  } catch (error) {
    if (core.updated) {
      const pointer = readRuntimePointer();
      if (pointer?.current === core.version) rollbackCorePointer(pointer);
    }
    throw error;
  }
}

export function rollbackCompatibilityUpdate(expectedVersion?: string | null) {
  const pointer = readCompatibilityPointer();
  if (expectedVersion && pointer?.current !== expectedVersion) return { rolledBack: false };
  const previous = activeCompatibility().version;
  const compatibility = rollbackCompatibility(expectedVersion);
  return { rolledBack: true, previous, version: compatibility.version };
}

export function maybeDelegateToActiveCore() {
  if (!isSea() || process.env.BETTER_CODEX_DISABLE_DELEGATION === "1") return null;
  const pointer = readRuntimePointer();
  if (!pointer || pointer.current === coreVersion || resolve(pointer.executable) === resolve(process.execPath)) return null;
  if (!existsSync(pointer.executable)) {
    unlinkSync(runtimeCurrentPath);
    return null;
  }
  const child = spawnSync(pointer.executable, process.argv.slice(2), { stdio: "inherit", windowsHide: true, env: { ...process.env, BETTER_CODEX_LAUNCHER_PATH: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath } });
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
