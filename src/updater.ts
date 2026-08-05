import { spawnSync } from "node:child_process";
import { createHash, verify } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isSea } from "node:sea";
import { activeCompatibility, bundledCompatibility, compareVersions, coreVersion, readCompatibilityPointer, rollbackCompatibility, validateCompatibility, writeCompatibilityPointer } from "./compatibility.js";
import { compatibilityVersionsPath, ensureDirectories, runtimeCurrentPath, runtimeVersionsPath, updatePublicKeyPath, updateStatePath } from "./config.js";

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
  const tag = channel === "stable" ? "latest" : "preview";
  return new URL(`https://github.com/Ericwong5021/better-codex/releases/${tag}/download/update-manifest.json`);
}

async function download(url: URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "follow" });
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
      core: manifest.core ? { version: manifest.core.version, available: Boolean(coreAsset) && compareVersions(manifest.core.version, coreVersion) > 0 } : null,
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
  if (compareVersions(coreVersion, asset.minimumCoreVersion ?? "0.0.0") < 0) throw new Error("compatibility_core_incompatible");
  if (compareVersions(asset.version, activeCompatibility().version) <= 0) return { updated: false, reason: "compatibility_current", version: activeCompatibility().version };
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  const compatibility = validateCompatibility(JSON.parse(content.toString("utf8")));
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
  if (!manifest.core || compareVersions(manifest.core.version, coreVersion) <= 0) return { updated: false, reason: "core_current", version: coreVersion };
  const asset = manifest.core.assets[platformAssetKey()];
  if (!asset) throw new Error("core_asset_unavailable");
  const content = await download(httpsUrl(asset.url));
  verifyDigest(content, asset.sha256);
  ensureDirectories();
  const directory = join(runtimeVersionsPath, manifest.core.version);
  mkdirSync(directory, { recursive: true });
  const executable = join(directory, process.platform === "win32" ? "better-codex.exe" : "better-codex");
  const temporary = `${executable}.${process.pid}.tmp`;
  writeFileSync(temporary, content, { mode: 0o755 });
  if (process.platform !== "win32") chmodSync(temporary, 0o755);
  const validation = spawnSync(temporary, ["version", "--json"], { encoding: "utf8", windowsHide: true, timeout: 15000, env: { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" } });
  if (validation.status !== 0) throw new Error("core_validation_failed");
  const version = JSON.parse(validation.stdout) as { core?: string };
  if (version.core !== manifest.core.version) throw new Error("core_version_mismatch");
  renameSync(temporary, executable);
  const previous = readRuntimePointer();
  writeJsonAtomic(runtimeCurrentPath, { current: manifest.core.version, previous: previous?.current ?? coreVersion, executable, updatedAt: new Date().toISOString() } satisfies RuntimePointer);
  return { updated: true, previous: previous?.current ?? coreVersion, version: manifest.core.version, pendingRestart: true };
}

export async function updateAll(channel: "stable" | "preview" = "stable") {
  const manifest = await fetchUpdateManifest(channel);
  const core = await updateCore(manifest, channel);
  const compatibility = await updateCompatibility(manifest, channel);
  return { channel, core, compatibility };
}

export function rollbackCompatibilityUpdate() {
  const previous = activeCompatibility().version;
  const compatibility = rollbackCompatibility();
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
  const child = spawnSync(pointer.executable, process.argv.slice(1), { stdio: "inherit", windowsHide: true, env: { ...process.env, BETTER_CODEX_LAUNCHER_PATH: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath } });
  if (child.error) {
    unlinkSync(runtimeCurrentPath);
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
