import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { passwordHash } from "../src/hub-auth.js";
import { createHubServer } from "../src/hub-server.js";
import { HubStore, restoreHubBackup } from "../src/hub-store.js";
import { syncProtocolVersion, type IssueProjection, type ProjectProjection, type SyncPushRequest } from "../src/sync-contract.js";

function listen(server: ReturnType<typeof createHubServer>["server"]) {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("address_unavailable"));
      resolve(address.port);
    });
  });
}

function close(server: ReturnType<typeof createHubServer>["server"]) {
  return new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

function statusForHost(port: number, host: string) {
  return new Promise<number>((resolve, reject) => {
    const request = httpRequest({ host: "127.0.0.1", port, path: "/healthz", headers: { host } }, response => {
      response.resume();
      response.once("end", () => resolve(response.statusCode || 0));
    });
    request.once("error", reject);
    request.end();
  });
}

test("Hub Web login separates bootstrap credentials and enforces cookie, Origin, Host, CSRF, and rate limits", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-security-"));
  const adminToken = "bootstrap-" + "a".repeat(64);
  const webUsername = "test-admin";
  const webPassword = "web-password-" + "b".repeat(32);
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken, webUsername, webPassword });
  const port = await listen(hub.server);
  const base = `http://127.0.0.1:${port}`;
  const origin = base;
  try {
    const page = await fetch(`${base}/web`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /data-better-codex-remote="true"/);
    assert.equal(page.headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");

    const noOrigin = await fetch(`${base}/web/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: webUsername, password: webPassword }) });
    assert.equal(noOrigin.status, 403);

    const bootstrapLogin = await fetch(`${base}/web/session`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ username: webUsername, password: adminToken }) });
    assert.equal(bootstrapLogin.status, 401);

    assert.equal(await statusForHost(port, "attacker.example"), 403);

    const login = await fetch(`${base}/web/session`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ username: webUsername, password: webPassword }) });
    assert.equal(login.status, 200);
    const loginBody = await login.json() as { csrf_token: string; expires_at: string; token?: string };
    assert.equal(loginBody.token, undefined);
    assert.ok(loginBody.csrf_token.length >= 32);
    assert.ok(Date.parse(loginBody.expires_at) - Date.now() > 11 * 60 * 60_000);
    const setCookie = login.headers.get("set-cookie") || "";
    assert.match(setCookie, /^better_codex_session=[^;]+;/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.match(setCookie, /Max-Age=43200/);
    assert.match(setCookie, /Secure/);
    const cookie = setCookie.split(";", 1)[0];

    const session = await fetch(`${base}/web/session`, { headers: { cookie } });
    assert.equal(session.status, 200);

    const noCsrf = await fetch(`${base}/api/issues`, { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: "{}" });
    assert.equal(noCsrf.status, 403);
    assert.deepEqual(await noCsrf.json(), { error: "csrf_invalid" });

    hub.store.setWebPasswordHash(passwordHash("rotated-password-" + "c".repeat(32)));
    const revoked = await fetch(`${base}/web/session`, { headers: { cookie } });
    assert.equal(revoked.status, 401);
  } finally {
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }

  const limitedDirectory = mkdtempSync(join(tmpdir(), "better-codex-hub-rate-"));
  const limited = createHubServer({ host: "127.0.0.1", port: 0, database: join(limitedDirectory, "hub.db"), adminToken, webUsername, webPassword });
  const limitedPort = await listen(limited.server);
  try {
    for (let index = 0; index < 5; index += 1) {
      const response = await fetch(`http://127.0.0.1:${limitedPort}/web/session`, { method: "POST", headers: { origin: `http://127.0.0.1:${limitedPort}`, "content-type": "application/json" }, body: JSON.stringify({ username: webUsername, password: "wrong-password-value" }) });
      assert.equal(response.status, 401);
    }
    const blocked = await fetch(`http://127.0.0.1:${limitedPort}/web/session`, { method: "POST", headers: { origin: `http://127.0.0.1:${limitedPort}`, "content-type": "application/json" }, body: JSON.stringify({ username: webUsername, password: webPassword }) });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  } finally {
    await close(limited.server);
    rmSync(limitedDirectory, { recursive: true, force: true });
  }
});

test("Hub backup and restore preserve paired devices, password state, and pending commands", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-backup-"));
  const database = join(directory, "hub.db");
  const backup = join(directory, "snapshot.db");
  const restored = join(directory, "restored.db");
  const store = new HubStore(database);
  try {
    store.setWebPasswordHash(passwordHash("backup-password-" + "d".repeat(32)));
    const code = store.createPairingCode();
    const device = store.pairDevice("backup runtime", code.pairing_code);
    const timestamp = new Date().toISOString();
    const project: ProjectProjection = { id: "project-1", name: "Backup", identifier_prefix: "BKP", created_at: timestamp, updated_at: timestamp, local_revision: 1 };
    const issue: IssueProjection = { id: "issue-1", identifier: "BKP-1", project_id: project.id, title: "Before backup", description: "", status: "todo", priority: "medium", labels: [], sort_order: 0, pinned: false, archived_at: null, assigned: false, agent_enabled: false, agent_id: null, user_assigned: false, pending_actor: "user", active_run: false, needs_attention: false, created_at: timestamp, updated_at: timestamp, local_revision: 1 };
    const push: SyncPushRequest = {
      protocol_version: syncProtocolVersion,
      core_version: "0.4.2",
      device_id: device.device_id,
      runtime: { device_id: device.device_id, device_name: device.device_name, protocol_version: syncProtocolVersion, core_version: "0.4.2", last_seen_at: timestamp, last_sync_at: null, queue_depth: 0, health_state: "online" },
      changes: [
        { event_id: "event-project", entity_type: "project", entity_id: project.id, operation: "upsert", projection: project, changed_at: timestamp },
        { event_id: "event-issue", entity_type: "issue", entity_id: issue.id, operation: "upsert", projection: issue, changed_at: timestamp },
      ],
    };
    store.push(device.device_id, push);
    const command = store.createRemoteCommand({ command_id: "backup-command", operation: "issue.update", entity_id: issue.id, base_revision: 1, payload: { title: "Pending after restore" } });
    store.backup(backup);
    assert.equal(command.status, "pending");
  } finally {
    store.close();
  }

  restoreHubBackup(restored, backup);
  const recovered = new HubStore(restored);
  try {
    assert.equal(recovered.health().ok, true);
    assert.equal(recovered.devices().length, 1);
    assert.match(recovered.webPasswordHash() || "", /^scrypt\$/);
    assert.equal(recovered.remoteCommand("backup-command")?.status, "pending");
    assert.equal(recovered.board().issues.find(issue => issue.id === "issue-1")?.title, "Pending after restore");
  } finally {
    recovered.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Hub migration creates an integrity-checked backup before changing an older schema", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-migration-"));
  const database = join(directory, "hub.db");
  const legacy = new DatabaseSync(database);
  legacy.exec("CREATE TABLE hub_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO hub_migrations VALUES (2, 'legacy'); CREATE TABLE legacy_marker (value TEXT NOT NULL); INSERT INTO legacy_marker VALUES ('preserved');");
  legacy.close();
  const migrated = new HubStore(database);
  try {
    assert.equal(migrated.health().ok, true);
  } finally {
    migrated.close();
  }
  const backups = readdirSync(join(directory, "backups")).filter(name => name.startsWith("before-hub-v3-") && name.endsWith(".db"));
  assert.equal(backups.length, 1);
  const snapshot = new DatabaseSync(join(directory, "backups", backups[0]), { readOnly: true });
  try {
    assert.equal((snapshot.prepare("SELECT value FROM legacy_marker").get() as { value: string }).value, "preserved");
    assert.equal((snapshot.prepare("PRAGMA quick_check").get() as { quick_check: string }).quick_check, "ok");
  } finally {
    snapshot.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("expired pairing codes and revoked device tokens stop working immediately", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-revoke-"));
  const store = new HubStore(join(directory, "hub.db"));
  try {
    const expired = store.createPairingCode();
    store.db.prepare("UPDATE pairing_codes SET expires_at = ?").run(new Date(0).toISOString());
    assert.throws(() => store.pairDevice("expired", expired.pairing_code), /invalid_pairing_code/);
    const current = store.createPairingCode();
    const device = store.pairDevice("revoked", current.pairing_code);
    assert.equal(store.deviceForToken(device.device_token)?.id, device.device_id);
    store.revokeDevice(device.device_id);
    assert.equal(store.deviceForToken(device.device_token), null);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
