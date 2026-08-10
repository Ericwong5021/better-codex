import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function versionParts(value) {
  const match = String(value).replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error("preview_feed_version_invalid");
  return { core: match.slice(1, 4).map(Number), prerelease: match[4] ? match[4].split(".") : [] };
}

export function compareReleaseVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] < b.core[index] ? -1 : 1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length ? -1 : 1;
  }
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) < Number(y) ? -1 : 1;
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function readVerifiedManifest(path, publicKeyPath, expectedChannel) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (!manifest?.payload || manifest.payload.channel !== expectedChannel || typeof manifest.signature !== "string") throw new Error("preview_feed_manifest_invalid");
  const publicKey = createPublicKey(readFileSync(publicKeyPath, "utf8"));
  if (!verify(null, Buffer.from(stableJson(manifest.payload)), publicKey, Buffer.from(manifest.signature, "base64"))) throw new Error("preview_feed_signature_invalid");
  return manifest.payload;
}

export function readVerifiedPreviewManifest(path, publicKeyPath) {
  return readVerifiedManifest(path, publicKeyPath, "preview");
}

export function assertPreviewPromotion(currentPath, candidatePath, publicKeyPath) {
  const current = readVerifiedPreviewManifest(currentPath, publicKeyPath);
  const candidate = readVerifiedPreviewManifest(candidatePath, publicKeyPath);
  for (const component of ["core", "compatibility"]) {
    const currentVersion = current[component]?.version;
    const candidateVersion = candidate[component]?.version;
    if (currentVersion && !candidateVersion) throw new Error(`preview_feed_${component}_removed`);
    if (currentVersion && candidateVersion && compareReleaseVersions(candidateVersion, currentVersion) < 0) throw new Error(`preview_feed_${component}_downgrade`);
  }
  return candidate;
}

function main(args) {
  const [command, ...values] = args;
  if (command === "verify" && values.length === 2) return readVerifiedPreviewManifest(values[0], values[1]);
  if (command === "verify-channel" && values.length === 3 && ["stable", "preview"].includes(values[0])) return readVerifiedManifest(values[1], values[2], values[0]);
  if (command === "promote" && values.length === 3) return assertPreviewPromotion(values[0], values[1], values[2]);
  if (command === "newer" && values.length === 2) {
    if (compareReleaseVersions(values[0], values[1]) <= 0) throw new Error("preview_version_must_exceed_stable");
    return { candidate: values[0], stable: values[1] };
  }
  throw new Error("Usage: preview-feed.mjs verify <manifest> <public-key> | verify-channel <stable|preview> <manifest> <public-key> | promote <current> <candidate> <public-key> | newer <candidate> <stable>");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(main(process.argv.slice(2)))); } catch (error) {
    console.error(error instanceof Error ? error.message : "preview_feed_failed");
    process.exit(1);
  }
}
