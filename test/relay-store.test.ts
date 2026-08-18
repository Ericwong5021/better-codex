import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { RelayStore, restoreRelayBackup } from "../src/relay-store.js";

test("relay backups preserve devices without introducing business tables", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-relay-backup-"));
  const database = join(directory, "relay.db");
  const restored = join(directory, "restored.db");
  const store = new RelayStore(database);
  try {
    const pairing = store.createPairingCode();
    const device = store.pairDevice("Runtime backup", pairing.pairing_code);
    const backup = store.backup();
    store.close();
    restoreRelayBackup(restored, backup.backup);
    const check = new RelayStore(restored);
    try {
      assert.equal(check.devices()[0].id, device.device_id);
      assert.deepEqual(check.tableNames(), ["relay_audit", "relay_devices", "relay_settings", "relay_web_sessions", "sqlite_sequence"]);
    } finally {
      check.close();
    }
  } finally {
    try { store.close(); } catch {}
    rmSync(directory, { recursive: true, force: true });
  }
});
