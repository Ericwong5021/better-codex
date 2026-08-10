import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Store } from "../src/db.js";
import { createHubServer } from "../src/hub-server.js";
import { SyncClient } from "../src/sync-client.js";
import { normalizeHubUrl } from "../src/sync-config.js";
import { hubWebHtml } from "../src/hub-web.js";
import type { HubBoard } from "../src/sync-contract.js";

function listen(server: ReturnType<typeof createHubServer>["server"]) {
  return new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || !address) return reject(new Error("address_unavailable"));
      resolve(address.port);
    });
  });
}

function close(server: ReturnType<typeof createHubServer>["server"]) {
  return new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

test("Hub URLs require HTTPS except for loopback development", () => {
  assert.equal(normalizeHubUrl("https://board.example.com/"), "https://board.example.com");
  assert.equal(normalizeHubUrl("http://127.0.0.1:4318"), "http://127.0.0.1:4318");
  assert.throws(() => normalizeHubUrl("http://board.example.com"), /hub_https_required/);
  assert.throws(() => normalizeHubUrl("https://token@board.example.com"), /invalid_hub_url/);
});

test("remote board ships valid inline JavaScript and keeps credentials in session storage", () => {
  const html = hubWebHtml();
  const script = html.match(/<script>([\s\S]+)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
  assert.match(script, /sessionStorage/);
  assert.doesNotMatch(script, /localStorage/);
});

test("Hub mirrors the safe projection and applies remote commands through the local authority", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-sync-"));
  const local = new Store(join(directory, "local.db"));
  const adminToken = "a".repeat(64);
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken });
  const port = await listen(hub.server);
  const paired = hub.store.pairDevice("test desktop");
  const client = new SyncClient(local, 60_000, () => ({
    enabled: true,
    hub_url: `http://127.0.0.1:${port}`,
    device_id: paired.device_id,
    device_name: paired.device_name,
    device_token: paired.device_token,
    created_at: new Date().toISOString(),
  }));

  try {
    const project = local.createProject({ name: "Remote", workspacePath: join(directory, "private-workspace") });
    const issue = local.createIssue({
      projectId: project.id,
      title: "Safe projection",
      description: "Visible description",
      status: "todo",
      priority: "medium",
      threadId: "local:private-thread",
      workspacePath: join(directory, "private-workspace"),
    });

    const first = await client.syncNow();
    assert.equal(first.last_error, null);
    let board = hub.store.board();
    const mirrored = board.issues.find(item => item.payload.id === issue.id);
    assert.ok(mirrored);
    const serialized = JSON.stringify(mirrored);
    assert.doesNotMatch(serialized, /private-workspace|private-thread|thread_id|workspace_path/);

    hub.store.createCommand({ operation: "update", entity_id: issue.id, revision: mirrored.revision, patch: { status: "in_progress", title: "Edited remotely" } });
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.status, "in_progress");
    assert.equal(local.getIssue(issue.id)?.title, "Edited remotely");
    board = hub.store.board();
    assert.equal(board.issues.find(item => item.payload.id === issue.id)?.pending, false);

    const beforeConflict = board.issues.find(item => item.payload.id === issue.id)!;
    hub.store.createCommand({ operation: "update", entity_id: issue.id, revision: beforeConflict.revision, patch: { priority: "urgent" } });
    const current = local.getIssue(issue.id)!;
    local.updateIssue(issue.id, current.version, { priority: "low" });
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.priority, "low");
    assert.match(hub.store.board().conflicts[0]?.error ?? "", /sync_conflict:priority/);

    const created = hub.store.createCommand({ operation: "create", patch: { project_id: project.id, title: "Created remotely", status: "backlog", priority: "high" } });
    hub.store.createCommand({ operation: "update", entity_id: created.entity_id, revision: created.revision, patch: { title: "Edited before desktop reconnects" } });
    await client.syncNow();
    assert.equal(local.getIssue(created.entity_id)?.title, "Edited before desktop reconnects");
    const createdView = hub.store.board().issues.find(item => item.payload.id === created.entity_id);
    assert.equal(createdView?.pending, false);
    assert.match(createdView?.payload.identifier ?? "", /^[A-Z0-9]+-\d+$/);
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Hub HTTP endpoints separate admin and device credentials", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-auth-"));
  const adminToken = "b".repeat(64);
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken });
  const port = await listen(hub.server);
  const base = `http://127.0.0.1:${port}`;
  try {
    assert.equal((await fetch(`${base}/healthz`)).status, 200);
    assert.equal((await fetch(`${base}/api/v1/board`)).status, 401);
    const pairResponse = await fetch(`${base}/api/v1/pair`, { method: "POST", headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" }, body: JSON.stringify({ name: "HTTP test" }) });
    assert.equal(pairResponse.status, 201);
    const pair = await pairResponse.json() as { device_token: string };
    assert.equal((await fetch(`${base}/api/v1/board`, { headers: { authorization: `Bearer ${pair.device_token}` } })).status, 401);
    assert.equal((await fetch(`${base}/api/v1/sync/pull?cursor=0`, { headers: { authorization: `Bearer ${pair.device_token}` } })).status, 200);
    const pushResponse = await fetch(`${base}/api/v1/sync/push`, {
      method: "POST",
      headers: { authorization: `Bearer ${pair.device_token}`, "content-type": "application/json" },
      body: JSON.stringify({ changes: [{
        event_id: "privacy-event",
        entity_type: "agent",
        entity_id: "agent-1",
        operation: "upsert",
        changed_at: new Date().toISOString(),
        projection: { id: "agent-1", name: "Safe", name_en: "Safe", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), instructions: "must-not-persist", sandbox_mode: "danger-full-access" },
      }] }),
    });
    assert.equal(pushResponse.status, 200);
    const boardResponse = await fetch(`${base}/api/v1/board`, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.equal(boardResponse.status, 200);
    const board = await boardResponse.json() as HubBoard;
    assert.deepEqual(board.issues, []);
    assert.doesNotMatch(JSON.stringify(board.agents), /must-not-persist|sandbox_mode|instructions/);
  } finally {
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});
