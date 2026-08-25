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
const installers = {};
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
if (channel === "stable" && coreVersion.includes("-")) throw new Error("stable_channel_prerelease_forbidden");
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== `v${coreVersion}`) throw new Error("release_tag_version_mismatch");
for (const [platform, name] of [["windows", "install.ps1"], ["macos", "install.sh"]]) {
  if (!files.includes(name)) continue;
  const content = await readFile(join(output, name));
  installers[platform] = { url: releaseUrl(name), sha256: digest(content) };
}

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
  installers,
  runtimeSessionHandoff: {
    protocol: "session-host/v2",
    requiredCapabilities: ["durable_deliveries", "runtime_handoff"],
  },
};
const key = createPrivateKey(privatePem);
const publicKey = createPublicKey(key).export({ type: "spki", format: "pem" });
const pinnedPublicKey = await readFile(resolve("assets/update-public-key.pem"), "utf8");
if (publicKey.trim() !== pinnedPublicKey.trim()) throw new Error("update_public_key_mismatch");
const signature = sign(null, Buffer.from(stableJson(payload)), key).toString("base64");
await writeFile(join(output, "update-manifest.json"), JSON.stringify({ payload, signature }), { mode: 0o644 });
await writeFile(join(output, "update-public-key.pem"), publicKey, { mode: 0o644 });
await chmod(join(output, "update-public-key.pem"), 0o644);
try {
  const checksums = await readFile(join(output, "checksums.txt"));
  await writeFile(join(output, "checksums.sig"), `${sign(null, checksums, key).toString("base64")}\n`, { mode: 0o644 });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
console.log(JSON.stringify({ manifest: join(output, "update-manifest.json"), compatibility: compatibilityName, coreVersion, assets: Object.keys(assets) }));
