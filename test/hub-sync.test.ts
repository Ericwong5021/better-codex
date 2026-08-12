import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { issueStatuses, Store } from "../src/db.js";
import { createHubServer } from "../src/hub-server.js";
import { HubStore } from "../src/hub-store.js";
import { SyncClient } from "../src/sync-client.js";
import { normalizeHubUrl } from "../src/sync-config.js";
import { syncProtocolVersion, type SyncPushRequest } from "../src/sync-contract.js";

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

function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("address_unavailable"));
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

async function stopChild(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>(resolve => child.once("exit", () => resolve())),
    new Promise<void>(resolve => setTimeout(resolve, 5000)),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

test("Hub URLs require HTTPS except loopback development", () => {
  assert.equal(normalizeHubUrl("https://board.example.com/"), "https://board.example.com");
  assert.equal(normalizeHubUrl("http://127.0.0.1:4318"), "http://127.0.0.1:4318");
  assert.throws(() => normalizeHubUrl("http://board.example.com"), /hub_https_required/);
  assert.throws(() => normalizeHubUrl("https://token@board.example.com"), /invalid_hub_url/);
});

test("read-only Hub mirrors only the safe projection with durable idempotent sync", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-sync-"));
  const local = new Store(join(directory, "local.db"));
  const adminToken = "a".repeat(64);
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken });
  const port = await listen(hub.server);
  const code = hub.store.createPairingCode();
  const paired = hub.store.pairDevice("primary desktop", code.pairing_code);
  const configuration = {
    enabled: true as const,
    hub_url: `http://127.0.0.1:${port}`,
    device_id: paired.device_id,
    device_name: paired.device_name,
    device_token: paired.device_token,
    created_at: new Date().toISOString(),
  };
  const client = new SyncClient(local, 60_000, () => configuration);

  try {
    const project = local.createProject({ name: "Remote", workspacePath: join(directory, "private-workspace") });
    const agent = local.createAgentProfile({ name: "Remote Agent", name_en: "Remote Agent", description: "Visible directory", instructions: "private instructions", model: "private-model", reasoning_effort: "high", sandbox_mode: "danger-full-access" });
    const issue = local.createIssue({ projectId: project.id, title: "Safe projection", description: "Visible", threadId: "private-thread", workspacePath: join(directory, "private-workspace") });
    const first = await client.syncNow();
    assert.equal(first.last_error, null);
    const board = hub.store.board();
    assert.equal(board.issues.find(item => item.id === issue.id)?.title, "Safe projection");
    assert.equal(board.agents.find(item => item.id === agent.id)?.name, "Remote Agent");
    assert.equal(board.runtime?.health_state, "online");
    assert.doesNotMatch(JSON.stringify(board), /private-workspace|private-thread|private instructions|private-model|workspace_path|thread_id|reply_draft|instructions|sandbox_mode/);

    const revision = board.revision;
    local.updateIssue(issue.id, issue.version, { title: "Incremental update" });
    const entry = local.listSyncQueue(100).find(item => item.entity_id === issue.id)!;
    await client.syncNow();
    assert.equal(hub.store.board().issues.find(item => item.id === issue.id)?.title, "Incremental update");
    assert.ok(hub.store.board().revision > revision);

    const duplicate: SyncPushRequest = {
      protocol_version: syncProtocolVersion,
      core_version: "0.4.2",
      device_id: paired.device_id,
      runtime: { ...hub.store.board().runtime!, last_seen_at: new Date().toISOString(), health_state: "online" },
      changes: [{ ...entry, projection: local.syncProjection(entry.entity_type, entry.entity_id) }],
    };
    const beforeDuplicate = hub.store.board().revision;
    hub.store.push(paired.device_id, duplicate);
    assert.equal(hub.store.board().revision, beforeDuplicate);

    const archived = local.archiveIssue(issue.id, local.getIssue(issue.id)!.version);
    local.deleteArchivedIssue(issue.id, archived.version);
    await client.syncNow();
    assert.equal(hub.store.board().issues.some(item => item.id === issue.id), false);

    hub.store.clearProjection();
    local.rebuildSyncQueue();
    await client.syncNow();
    assert.equal(hub.store.board().projects.some(item => item.id === project.id), true);
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("pairing codes are single-use and a second active writer is rejected", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-lease-"));
  const store = new HubStore(join(directory, "hub.db"));
  try {
    const firstCode = store.createPairingCode();
    const first = store.pairDevice("first", firstCode.pairing_code);
    assert.throws(() => store.pairDevice("repeat", firstCode.pairing_code), /invalid_pairing_code/);
    const secondCode = store.createPairingCode();
    const second = store.pairDevice("second", secondCode.pairing_code);
    const request = (deviceId: string): SyncPushRequest => ({
      protocol_version: syncProtocolVersion,
      core_version: "0.4.2",
      device_id: deviceId,
      runtime: { device_id: deviceId, device_name: deviceId, protocol_version: syncProtocolVersion, core_version: "0.4.2", last_seen_at: new Date().toISOString(), last_sync_at: null, queue_depth: 0, health_state: "online" },
      changes: [],
    });
    store.push(first.device_id, request(first.device_id));
    assert.throws(() => store.push(second.device_id, request(second.device_id)), /writer_lease_conflict/);
    assert.throws(() => store.push(first.device_id, { ...request(first.device_id), protocol_version: "sync/v3" as never }), /incompatible_protocol/);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("offline local writes survive Runtime and Hub restarts", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-offline-"));
  const database = join(directory, "hub.db");
  const localDatabase = join(directory, "local.db");
  const adminToken = "c".repeat(64);
  let local = new Store(localDatabase);
  let hub = createHubServer({ host: "127.0.0.1", port: 0, database, adminToken });
  let port = await listen(hub.server);
  const code = hub.store.createPairingCode();
  const paired = hub.store.pairDevice("restartable", code.pairing_code);
  const configuration = { enabled: true as const, hub_url: `http://127.0.0.1:${port}`, device_id: paired.device_id, device_name: paired.device_name, device_token: paired.device_token, created_at: new Date().toISOString() };
  let client = new SyncClient(local, 60_000, () => configuration);
  try {
    const project = local.createProject({ name: "Offline", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Before outage" });
    await client.syncNow();
    await close(hub.server);
    const current = local.getIssue(issue.id)!;
    local.updateIssue(issue.id, current.version, { title: "Written while offline" });
    const failed = await client.syncNow();
    assert.ok(failed.last_error);
    assert.ok(local.syncQueueStatus().pending > 0);
    client.stop();
    local.close();

    local = new Store(localDatabase);
    client = new SyncClient(local, 60_000, () => configuration);
    hub = createHubServer({ host: "127.0.0.1", port: 0, database, adminToken });
    port = await listen(hub.server);
    configuration.hub_url = `http://127.0.0.1:${port}`;
    const recovered = await client.syncNow();
    assert.equal(recovered.last_error, null);
    assert.equal(local.syncQueueStatus().pending, 0);
    assert.equal(hub.store.board().issues.find(item => item.id === issue.id)?.title, "Written while offline");
  } finally {
    client.stop();
    local.close();
    if (hub.server.listening) await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the real Runtime service pushes API writes to the Hub", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-runtime-sync-"));
  const home = join(directory, "home");
  const codexHome = join(directory, "codex");
  mkdirSync(home, { recursive: true });
  mkdirSync(codexHome, { recursive: true });
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "e".repeat(64) });
  const hubPort = await listen(hub.server);
  const code = hub.store.createPairingCode();
  const paired = hub.store.pairDevice("Runtime process", code.pairing_code);
  writeFileSync(join(home, "sync-credentials.json"), JSON.stringify({ enabled: true, hub_url: `http://127.0.0.1:${hubPort}`, device_id: paired.device_id, device_name: paired.device_name, device_token: paired.device_token, created_at: new Date().toISOString() }), { mode: 0o600 });
  const runtimePort = await availablePort();
  const runtimeToken = "runtime-sync-token";
  const output: string[] = [];
  const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve"], {
    cwd: process.cwd(),
    env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DB: join(home, "better-codex.db"), BETTER_CODEX_PORT: String(runtimePort), BETTER_CODEX_TOKEN: runtimeToken, CODEX_HOME: codexHome },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", chunk => output.push(String(chunk)));
  child.stderr?.on("data", chunk => output.push(String(chunk)));
  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`http://127.0.0.1:${runtimePort}${path}`, { ...options, headers: { authorization: `Bearer ${runtimeToken}`, "content-type": "application/json", ...(options.headers ?? {}) } });
    const value = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(String(value.error ?? response.statusText));
    return value;
  };
  try {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${runtimePort}/health`);
        if (response.ok) break;
      } catch {}
      if (child.exitCode !== null) throw new Error(`runtime_exited_${child.exitCode}\n${output.join("")}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const project = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Runtime integration", workspace_path: join(directory, "private-workspace") }) });
    await request("/api/issues", { method: "POST", body: JSON.stringify({ project_id: project.id, title: "Runtime synchronized issue", description: "From API", status: "todo", priority: "medium", workspace_path: join(directory, "private-workspace") }) });
    const syncDeadline = Date.now() + 10_000;
    while (Date.now() < syncDeadline && !hub.store.board().issues.some(issue => issue.title === "Runtime synchronized issue")) await new Promise(resolve => setTimeout(resolve, 100));
    const serialized = JSON.stringify(hub.store.board());
    assert.match(serialized, /Runtime synchronized issue/);
    assert.doesNotMatch(serialized, /private-workspace|workspace_path/);
  } finally {
    await stopChild(child);
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("5000 issues complete first projection within the acceptance budget", { skip: process.platform === "win32" ? "reference performance gate runs on Unix CI" : false }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-hub-scale-"));
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "d".repeat(64) });
  const port = await listen(hub.server);
  const code = hub.store.createPairingCode();
  const paired = hub.store.pairDevice("scale", code.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: `http://127.0.0.1:${port}`, device_id: paired.device_id, device_name: paired.device_name, device_token: paired.device_token, created_at: new Date().toISOString() }));
  try {
    const project = local.createProject({ name: "Scale", workspacePath: directory });
    for (let index = 0; index < 5000; index += 1) local.createIssue({ projectId: project.id, title: `Scale issue ${index + 1}`, status: issueStatuses[index % issueStatuses.length] });
    const started = Date.now();
    const result = await client.syncNow();
    const elapsed = Date.now() - started;
    assert.equal(result.last_error, null);
    assert.equal(hub.store.board().issues.length, 5000);
    assert.ok(elapsed < 30_000, `first projection took ${elapsed}ms`);
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("remote commands stay pending until local acknowledgement and remain idempotent", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-remote-command-"));
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "f".repeat(64) });
  const port = await listen(hub.server);
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("command runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: `http://127.0.0.1:${port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));
  try {
    const project = local.createProject({ name: "Commands", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Local title" });
    await client.syncNow();
    const command = hub.store.createRemoteCommand({ command_id: "update-once", operation: "issue.update", entity_id: issue.id, base_revision: issue.version, payload: { title: "Pending title" } });
    assert.equal(command.status, "pending");
    assert.equal(local.getIssue(issue.id)?.title, "Local title");
    assert.equal(hub.store.board().issues.find(item => item.id === issue.id)?.remote_state?.status, "pending");
    assert.equal(hub.store.board().issues.find(item => item.id === issue.id)?.title, "Pending title");
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.title, "Pending title");
    assert.equal(hub.store.remoteCommand(command.command_id)?.status, "applied");
    const appliedVersion = local.getIssue(issue.id)!.version;
    const duplicate = hub.store.createRemoteCommand({ command_id: "update-once", operation: "issue.update", entity_id: issue.id, base_revision: issue.version, payload: { title: "Pending title" } });
    assert.equal(duplicate.status, "applied");
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.version, appliedVersion);
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("stale and out-of-order remote commands preserve local data and expose conflict", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-command-conflict-"));
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "g".repeat(64) });
  const port = await listen(hub.server);
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("conflict runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: `http://127.0.0.1:${port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));
  try {
    const project = local.createProject({ name: "Conflicts", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Original" });
    await client.syncNow();
    local.updateIssue(issue.id, issue.version, { title: "Local wins" });
    hub.store.createRemoteCommand({ command_id: "stale-command", operation: "issue.update", entity_id: issue.id, base_revision: issue.version, payload: { title: "Remote stale" } });
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.title, "Local wins");
    assert.equal(hub.store.remoteCommand("stale-command")?.status, "conflict");
    assert.equal(hub.store.board().issues.find(item => item.id === issue.id)?.remote_state?.status, "conflict");
    const current = local.getIssue(issue.id)!;
    hub.store.createRemoteCommand({ command_id: "resolved-command", operation: "issue.update", entity_id: issue.id, base_revision: current.version, payload: { title: "Remote resolved" } });
    await new Promise(resolve => setTimeout(resolve, 2));
    hub.store.createRemoteCommand({ command_id: "out-of-order-command", operation: "issue.update", entity_id: issue.id, base_revision: current.version, payload: { priority: "high" } });
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.title, "Remote resolved");
    assert.equal(local.getIssue(issue.id)?.priority, "medium");
    assert.equal(hub.store.remoteCommand("resolved-command")?.status, "applied");
    assert.equal(hub.store.remoteCommand("out-of-order-command")?.status, "conflict");
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("active runs reject remote mutations without changing ownership", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-command-active-run-"));
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "h".repeat(64) });
  const port = await listen(hub.server);
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("active runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: `http://127.0.0.1:${port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));
  try {
    const project = local.createProject({ name: "Active", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Running", agentEnabled: true, workspacePath: directory });
    assert.ok(local.claimNextIssue(issue.id));
    await client.syncNow();
    const running = local.getIssue(issue.id)!;
    assert.equal(running.active_run_status, "claimed");
    assert.throws(() => hub.store.createRemoteCommand({ operation: "issue.archive", entity_id: issue.id, base_revision: running.version, payload: {} }), /issue_execution_running/);
    assert.equal(local.getIssue(issue.id)?.active_run_status, "claimed");
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("pending remote commands survive a Hub restart and apply after Runtime reconnects", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-command-restart-"));
  const database = join(directory, "hub.db");
  const local = new Store(join(directory, "local.db"));
  let hub = createHubServer({ host: "127.0.0.1", port: 0, database, adminToken: "i".repeat(64) });
  let port = await listen(hub.server);
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("restart command runtime", pairing.pairing_code);
  const configuration = { enabled: true as const, hub_url: `http://127.0.0.1:${port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() };
  const client = new SyncClient(local, 60_000, () => configuration);
  try {
    const project = local.createProject({ name: "Restart", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Before restart" });
    await client.syncNow();
    hub.store.createRemoteCommand({ command_id: "restart-pending", operation: "issue.update", entity_id: issue.id, base_revision: issue.version, payload: { title: "After restart" } });
    await close(hub.server);
    hub = createHubServer({ host: "127.0.0.1", port: 0, database, adminToken: "i".repeat(64) });
    port = await listen(hub.server);
    configuration.hub_url = `http://127.0.0.1:${port}`;
    assert.equal(hub.store.remoteCommand("restart-pending")?.status, "pending");
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.title, "After restart");
    assert.equal(hub.store.remoteCommand("restart-pending")?.status, "applied");
  } finally {
    client.stop();
    local.close();
    if (hub.server.listening) await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});

test("remote create, move, archive, and restore apply through the local Store", async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-command-crud-"));
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken: "j".repeat(64) });
  const port = await listen(hub.server);
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("crud runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: `http://127.0.0.1:${port}`, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));
  try {
    const project = local.createProject({ name: "Remote CRUD", workspacePath: directory });
    const agent = local.createAgentProfile({ name: "Remote executor", name_en: "Remote executor", description: "", instructions: "local only", model: "gpt-test", reasoning_effort: "medium" });
    await client.syncNow();
    const created = hub.store.createRemoteCommand({ command_id: "remote-create", operation: "issue.create", base_revision: null, payload: { project_id: project.id, title: "Created remotely", status: "todo", priority: "low", labels: ["remote"], agent_enabled: true, agent_id: agent.id } });
    const retried = hub.store.createRemoteCommand({ command_id: "remote-create", operation: "issue.create", base_revision: null, payload: { project_id: project.id, title: "Created remotely", status: "todo", priority: "low", labels: ["remote"], agent_enabled: true, agent_id: agent.id } });
    assert.equal(retried.entity_id, created.entity_id);
    await client.syncNow();
    let issue = local.getIssue(created.entity_id)!;
    assert.equal(issue.title, "Created remotely");
    assert.equal(issue.agent_id, agent.id);
    assert.equal(issue.agent_enabled, true);
    hub.store.createRemoteCommand({ command_id: "remote-start", operation: "issue.start", entity_id: issue.id, base_revision: issue.version, payload: { title: issue.title, status: issue.status, priority: issue.priority, labels: issue.labels, agent_id: agent.id } });
    await client.syncNow();
    issue = local.getIssue(issue.id)!;
    assert.equal(local.listManualStartQueue().includes(issue.id), true);
    assert.equal(hub.store.remoteCommand("remote-start")?.status, "applied");
    local.dequeueManualStart(issue.id);
    hub.store.createRemoteCommand({ operation: "issue.move", entity_id: issue.id, base_revision: issue.version, payload: { status: "in_progress" } });
    await client.syncNow();
    issue = local.getIssue(issue.id)!;
    assert.equal(issue.status, "in_progress");
    hub.store.createRemoteCommand({ operation: "issue.archive", entity_id: issue.id, base_revision: issue.version, payload: {} });
    await client.syncNow();
    issue = local.getIssue(issue.id)!;
    assert.ok(issue.archived_at);
    hub.store.createRemoteCommand({ operation: "issue.restore", entity_id: issue.id, base_revision: issue.version, payload: {} });
    await client.syncNow();
    assert.equal(local.getIssue(issue.id)?.archived_at, null);
  } finally {
    client.stop();
    local.close();
    await close(hub.server);
    rmSync(directory, { recursive: true, force: true });
  }
});
