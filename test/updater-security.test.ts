import assert from "node:assert/strict";
import test from "node:test";
import { validateUpdatePayloadForTest } from "../src/updater.js";

function updatePayload(version: string, channel: "stable" | "preview" = "stable") {
  return {
    schemaVersion: 1,
    channel,
    generatedAt: "2026-08-10T00:00:00.000Z",
    compatibility: null,
    core: {
      version,
      assets: {},
    },
  };
}

test("stable update manifests accept stable managed directory versions", () => {
  assert.equal(validateUpdatePayloadForTest(updatePayload("1.2.3"), "stable").core?.version, "1.2.3");
  assert.throws(() => validateUpdatePayloadForTest(updatePayload("1.2.3-beta.4"), "stable"), /update_prerelease_not_allowed/);
});

test("preview update manifests accept beta and promoted stable versions", () => {
  assert.equal(validateUpdatePayloadForTest(updatePayload("1.2.3-beta.4", "preview"), "preview").core?.version, "1.2.3-beta.4");
  assert.equal(validateUpdatePayloadForTest(updatePayload("1.2.3", "preview"), "preview").core?.version, "1.2.3");
});

test("update manifests reject core versions that can escape the managed runtime directory", () => {
  for (const version of ["../1.2.3", "..\\1.2.3", "1.2.3/child", "1.2.3\\child", "1.2.3\nchild", " 1.2.3"]) {
    assert.throws(() => validateUpdatePayloadForTest(updatePayload(version), "stable"), /update_core_invalid/);
  }
});
