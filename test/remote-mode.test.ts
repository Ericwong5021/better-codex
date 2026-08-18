import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { disableProjectionSync, readRemoteMode } from "../src/remote-mode.js";

test("relay is the default remote mode and projection remains an explicit rollback", () => {
  const previous = process.env.BETTER_CODEX_REMOTE_MODE;
  try {
    delete process.env.BETTER_CODEX_REMOTE_MODE;
    assert.equal(readRemoteMode(), "relay");
    process.env.BETTER_CODEX_REMOTE_MODE = "projection";
    assert.equal(readRemoteMode(), "projection");
    process.env.BETTER_CODEX_REMOTE_MODE = "invalid";
    assert.throws(() => readRemoteMode(), /invalid_remote_mode/);
  } finally {
    if (previous === undefined) delete process.env.BETTER_CODEX_REMOTE_MODE;
    else process.env.BETTER_CODEX_REMOTE_MODE = previous;
  }
});

test("relay mode removes projection triggers without deleting legacy tables", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-remote-mode-"));
  const file = join(directory, "runtime.db");
  const database = new DatabaseSync(file);
  try {
    database.exec(`
      CREATE TABLE projects (id TEXT PRIMARY KEY);
      CREATE TABLE sync_outbox (entity_id TEXT);
      CREATE TRIGGER sync_project_insert AFTER INSERT ON projects BEGIN INSERT INTO sync_outbox (entity_id) VALUES (NEW.id); END;
    `);
    database.close();
    disableProjectionSync(file);
    const check = new DatabaseSync(file);
    try {
      check.prepare("INSERT INTO projects (id) VALUES (?)").run("project-1");
      assert.equal((check.prepare("SELECT COUNT(*) AS value FROM sync_outbox").get() as { value: number }).value, 0);
      assert.equal((check.prepare("SELECT COUNT(*) AS value FROM sqlite_master WHERE type = 'table' AND name = 'sync_outbox'").get() as { value: number }).value, 1);
    } finally {
      check.close();
    }
  } finally {
    try { database.close(); } catch {}
    rmSync(directory, { recursive: true, force: true });
  }
});
