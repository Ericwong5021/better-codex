import assert from "node:assert/strict";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { assertPreviewPromotion, compareReleaseVersions, readVerifiedManifest, readVerifiedPreviewManifest, stableJson } from "../scripts/preview-feed.mjs";

function signedManifest(version: string, privateKey: KeyObject, channel = "preview") {
  const payload = {
    schemaVersion: 1,
    channel,
    generatedAt: "2026-08-10T00:00:00.000Z",
    compatibility: { version: "0.3.10" },
    core: { version, assets: {} },
  };
  return { payload, signature: sign(null, Buffer.from(stableJson(payload)), privateKey).toString("base64") };
}

test("Preview feed ordering follows Beta promotion SemVer", () => {
  assert.ok(compareReleaseVersions("0.4.2-beta.1", "0.4.1") > 0);
  assert.ok(compareReleaseVersions("0.4.2", "0.4.2-beta.2") > 0);
  assert.ok(compareReleaseVersions("0.4.2", "0.4.3-beta.1") < 0);
});

test("Preview feed promotion is signed and monotonic", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-preview-feed-"));
  try {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const keyPath = join(directory, "key.pem");
    const currentPath = join(directory, "current.json");
    const promotedPath = join(directory, "promoted.json");
    const downgradePath = join(directory, "downgrade.json");
    writeFileSync(keyPath, publicKey.export({ type: "spki", format: "pem" }));
    writeFileSync(currentPath, JSON.stringify(signedManifest("0.4.2-beta.2", privateKey)));
    writeFileSync(promotedPath, JSON.stringify(signedManifest("0.4.2", privateKey)));
    writeFileSync(downgradePath, JSON.stringify(signedManifest("0.4.1", privateKey)));

    assert.equal(assertPreviewPromotion(currentPath, promotedPath, keyPath).core.version, "0.4.2");
    assert.equal(readVerifiedManifest(currentPath, keyPath, "preview").channel, "preview");
    assert.throws(() => readVerifiedManifest(currentPath, keyPath, "stable"), /preview_feed_manifest_invalid/);
    assert.throws(() => assertPreviewPromotion(currentPath, downgradePath, keyPath), /preview_feed_core_downgrade/);
    const tampered = JSON.parse(readFileSync(promotedPath, "utf8"));
    tampered.payload.core.version = "9.9.9";
    writeFileSync(promotedPath, JSON.stringify(tampered));
    assert.throws(() => readVerifiedPreviewManifest(promotedPath, keyPath), /preview_feed_signature_invalid/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
