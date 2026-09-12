import { canonicalUpdateJson as stableJson, updateVersionAllowed } from "./update-policy.js";
import { verify } from "node:crypto";
import { compareVersions } from "./compatibility.js";
import { coreVersion } from "./version.js";

export type StableManifest = {
  payload?: {
    schemaVersion?: number;
    channel?: string;
    generatedAt?: string;
    core?: { version?: string } | null;
  };
  signature?: string;
};

export type ReleaseChannel = "stable" | "preview";

export type ReleaseUpdateState = {
  status: "current" | "available" | "error";
  currentVersion: string;
  latestVersion: string | null;
  checkedAt: string;
  error: string | null;
  channel: ReleaseChannel;
  manifest?: StableManifest;
};

const updatePublicKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEALYPId82AFoqMpxFFXsRAidsSGaeuqTWHFqP3BZoyBeM=
-----END PUBLIC KEY-----`;

export async function checkRelease(channel: ReleaseChannel): Promise<ReleaseUpdateState> {
  const checkedAt = new Date().toISOString();
  try {
    const release = channel === "stable" ? "latest/download" : "download/preview";
    const response = await fetch(`https://github.com/Ericwong5021/better-codex/releases/${release}/update-manifest.json`, {
      headers: { "cache-control": "no-cache", pragma: "no-cache" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`update_http_${response.status}`);
    const manifest = await response.json() as StableManifest;
    const payload = manifest.payload;
    if (!payload || payload.schemaVersion !== 1 || payload.channel !== channel || !Number.isFinite(Date.parse(payload.generatedAt || "")) || typeof payload.core?.version !== "string" || !updateVersionAllowed(payload.core.version, channel) || typeof manifest.signature !== "string") throw new Error("update_manifest_invalid");
    if (!verify(null, Buffer.from(stableJson(payload)), updatePublicKey, Buffer.from(manifest.signature, "base64"))) throw new Error("update_signature_invalid");
    const latestVersion = payload.core.version;
    return {
      status: compareVersions(latestVersion, coreVersion) > 0 ? "available" : "current",
      currentVersion: coreVersion,
      latestVersion,
      manifest,
      checkedAt,
      error: null,
      channel,
    };
  } catch (error) {
    return {
      status: "error",
      currentVersion: coreVersion,
      latestVersion: null,
      checkedAt,
      error: error instanceof Error ? error.message : "update_check_failed",
      channel,
    };
  }
}
