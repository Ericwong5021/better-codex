import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Store } from "../src/db.js";

test("repeated readiness probes read the database without running integrity scans", t => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-db-health-"));
  const store = new Store(join(directory, "test.db"));
  try {
    const prepare = store.db.prepare.bind(store.db);
    t.mock.method(store.db, "prepare", (sql: string) => {
      assert.doesNotMatch(sql, /\b(?:quick_check|integrity_check)\b/i, "a readiness poll must not scan every database page");
      return prepare(sql);
    });
    for (let i = 0; i < 10; i += 1) assert.equal(store.health().ok, true);

    // A successful startup check must not hide a later dependency failure.
    store.db.exec("DROP TABLE thread_action_queue");
    assert.throws(() => store.health(), /no such table/);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("readiness rejects a database whose schema no longer matches the running core", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-db-schema-"));
  const store = new Store(join(directory, "test.db"));
  try {
    assert.equal(store.health().ok, true);
    store.db.exec("DELETE FROM schema_migrations");
    assert.equal(store.health().ok, false);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
