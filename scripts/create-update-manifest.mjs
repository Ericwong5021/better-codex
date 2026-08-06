import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { bundledCompatibility } from "../dist/compatibility.js";

const output = resolve(process.argv[2] || "release");
const tag = process.env.GITHUB_REF_NAME || `v${bundledCompatibility.minimumCoreVersion}`;
const repository = process.env.GITHUB_REPOSITORY || "Ericwong5021/better-codex";
const releaseBaseUrl = process.env.BETTER_CODEX_RELEASE_BASE_URL?.replace(/\/$/, "") || `https://github.com/${repository}/releases/download/${tag}`;
const channel = process.env.BETTER_CODEX_UPDATE_CHANNEL || "stable";
const privatePem = process.env.BETTER_CODEX_UPDATE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!privatePem) throw new Error("update_private_key_required");
if (!["stable", "preview"].includes(channel)) throw new Error("update_channel_invalid");

const stableJson = value => Array.isArray(value)
  ? `[${value.map(stableJson).join(",")}]`
  : value && typeof value === "object"
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
    : JSON.stringify(value);

const digest = content => createHash("sha256").update(content).digest("hex");
const releaseUrl = name => `${releaseBaseUrl}/${name}`;

await mkdir(output, { recursive: true });
const compatibilityName = `better-codex-compatibility-${bundledCompatibility.version}.json`;
const compatibilityContent = Buffer.from(JSON.stringify(bundledCompatibility));
await writeFile(join(output, compatibilityName), compatibilityContent, { mode: 0o644 });

const files = await readdir(output);
const assets = {};
let coreVersion = "";
for (const name of files.filter(name => /^better-codex-core-/.test(name))) {
  const match = name.match(/^better-codex-core-(\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?)-(darwin|win32)-(arm64|amd64)(?:\.exe)?$/);
  if (!match) throw new Error(`core_asset_name_invalid_${name}`);
  coreVersion ||= match[1];
  if (coreVersion !== match[1]) throw new Error("core_asset_version_mismatch");
  const content = await readFile(join(output, name));
  assets[`${match[2]}-${match[3]}`] = { url: releaseUrl(name), sha256: digest(content) };
}
if (!coreVersion || Object.keys(assets).length === 0) throw new Error("core_assets_unavailable");

const payload = {
  schemaVersion: 1,
  channel,
  generatedAt: new Date().toISOString(),
  compatibility: {
    version: bundledCompatibility.version,
    minimumCoreVersion: bundledCompatibility.minimumCoreVersion,
    url: releaseUrl(compatibilityName),
    sha256: digest(compatibilityContent),
  },
  core: { version: coreVersion, assets },
};
const key = createPrivateKey(privatePem);
const signature = sign(null, Buffer.from(stableJson(payload)), key).toString("base64");
await writeFile(join(output, "update-manifest.json"), JSON.stringify({ payload, signature }), { mode: 0o644 });
await writeFile(join(output, "update-public-key.pem"), createPublicKey(key).export({ type: "spki", format: "pem" }), { mode: 0o644 });
await chmod(join(output, "update-public-key.pem"), 0o644);
console.log(JSON.stringify({ manifest: join(output, "update-manifest.json"), compatibility: compatibilityName, coreVersion, assets: Object.keys(assets) }));
