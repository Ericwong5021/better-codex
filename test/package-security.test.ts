import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, verify } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { javascriptStringLiteral } from "../scripts/javascript-literal.mjs";
import { canonicalUpdateJson } from "../src/update-policy.js";

const packageSource = readFileSync(new URL("../scripts/package.mjs", import.meta.url), "utf8");

test("bundle packaging uses an explicitly safe JavaScript string serializer", () => {
  assert.match(packageSource, /javascriptStringLiteral\(icns\)/);
  assert.match(packageSource, /javascriptStringLiteral\(ico\)/);
  assert.match(packageSource, /javascriptStringLiteral\(logo\)/);
  assert.doesNotMatch(packageSource, /JSON\.stringify\((?:icns|ico|logo)\)/);
});

test("release packaging ships a Node bundle without copying or injecting the Node executable", () => {
  assert.match(packageSource, /define: \{ __BETTER_CODEX_PACKAGED__: "true" \}/);
  assert.match(packageSource, /better-codex\.cjs/);
  assert.doesNotMatch(packageSource, /copyFile\(process\.execPath/);
  assert.doesNotMatch(packageSource, /experimental-sea-config|NODE_SEA_BLOB|postject/);
});

test("JavaScript string serialization preserves content without raw code-breaking characters", () => {
  const value = '</script> "quoted" \\ path\u2028next\u2029last';
  const literal = javascriptStringLiteral(value);
  assert.equal(JSON.parse(literal), value);
  assert.doesNotMatch(literal, /<|>|(?<!\\)\/(?:script)|\u2028|\u2029/u);
});

test("stable and preview manifests sign the same immutable release source", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-signed-source-"));
  try {
    for (const name of ["scripts", "dist", "assets", "release"]) mkdirSync(join(directory, name));
    copyFileSync(new URL("../scripts/create-update-manifest.mjs", import.meta.url), join(directory, "scripts", "manifest.mjs"));
    writeFileSync(join(directory, "package.json"), '{"type":"module"}');
    writeFileSync(join(directory, "dist", "compatibility.js"), 'export const bundledCompatibility = { version: "1.0.0", minimumCoreVersion: "1.0.0" };');
    writeFileSync(join(directory, "release", "better-codex-core-1.0.0-darwin-arm64"), "core fixture");
    const commit = "0123456789abcdef0123456789abcdef01234567";
    const source = commit + "\n";
    writeFileSync(join(directory, "release", "source-commit.txt"), source);
    const keys = generateKeyPairSync("ed25519");
    writeFileSync(join(directory, "assets", "update-public-key.pem"), keys.publicKey.export({ type: "spki", format: "pem" }));
    for (const channel of ["stable", "preview"]) {
      const result = spawnSync(process.execPath, [join(directory, "scripts", "manifest.mjs"), join(directory, "release")], { cwd: directory, encoding: "utf8", env: { ...process.env, GITHUB_REF_NAME: "v1.0.0", BETTER_CODEX_UPDATE_CHANNEL: channel, BETTER_CODEX_UPDATE_PRIVATE_KEY: String(keys.privateKey.export({ type: "pkcs8", format: "pem" })) } });
      assert.equal(result.status, 0, result.stderr);
      const manifest = JSON.parse(readFileSync(join(directory, "release", "update-manifest.json"), "utf8"));
      assert.equal(manifest.payload.channel, channel);
      assert.equal(manifest.payload.source.commit, commit);
      assert.equal(manifest.payload.source.sha256, createHash("sha256").update(source).digest("hex"));
      assert.equal(verify(null, Buffer.from(canonicalUpdateJson(manifest.payload)), keys.publicKey, Buffer.from(manifest.signature, "base64")), true);
      manifest.payload.source.commit = "f".repeat(40);
      assert.equal(verify(null, Buffer.from(canonicalUpdateJson(manifest.payload)), keys.publicKey, Buffer.from(manifest.signature, "base64")), false);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
