import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { requireStorageCapacity, storageHealth } from "../src/storage-health.js";

const gibibyte = 1024 ** 3;
const database = join(tmpdir(), "better-codex-storage-test.db");

test("fixed storage reserves admit large disks below five percent without weakening low-space protection", t => {
  let freeBytes = 6 * gibibyte;
  let totalBytes = 1024 * gibibyte;
  t.mock.method(fs, "statfsSync", () => ({
    type: 0, bsize: 1024, blocks: totalBytes / 1024,
    bfree: freeBytes / 1024, bavail: freeBytes / 1024, files: 0, ffree: 0,
  }));
  syncBuiltinESMExports();
  try {
    for (const capacity of [100, 1024, 10000]) {
      totalBytes = capacity * gibibyte;
      const health = storageHealth(database);
      assert.equal(health.ok, true);
      assert.equal(health.degraded, false);
      assert.equal(health.free_ratio, freeBytes / totalBytes);
      assert.equal(requireStorageCapacity(database, 10 * 1024 ** 2).degraded, false);
    }

    freeBytes = 5 * gibibyte;
    assert.equal(storageHealth(database).degraded, false);
    assert.doesNotThrow(() => requireStorageCapacity(database, 0));

    freeBytes -= 1024;
    assert.equal(storageHealth(database).ok, true);
    assert.equal(storageHealth(database).degraded, true);
    assert.throws(() => requireStorageCapacity(database, 0), /insufficient_disk_space/);

    freeBytes = 2 * gibibyte;
    assert.equal(storageHealth(database).ok, true);
    assert.equal(storageHealth(database).degraded, true);
    freeBytes -= 1024;
    assert.equal(storageHealth(database).ok, false);

    freeBytes = 6 * gibibyte;
    assert.doesNotThrow(() => requireStorageCapacity(database, 4 * gibibyte));
    assert.throws(() => requireStorageCapacity(database, 4 * gibibyte + 1024), /insufficient_disk_space/);
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
});
