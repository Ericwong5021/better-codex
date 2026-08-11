import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareReleaseVersions } from "./release-version.mjs";

export { compareReleaseVersions };

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
