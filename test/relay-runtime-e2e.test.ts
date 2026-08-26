import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createRelayServer } from "../src/relay-server.js";

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

function startRuntime(home: string, port: number, token: string) {
  const builtCli = join(process.cwd(), "dist", "cli.js");
  const arguments_ = existsSync(builtCli) ? [builtCli, "serve"] : ["--import", "tsx", "src/cli.ts", "serve"];
  return spawn(process.execPath, arguments_, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_CODEX_HOME: home,
      BETTER_CODEX_DB: join(home, "better-codex.db"),
      BETTER_CODEX_PORT: String(port),
      BETTER_CODEX_TOKEN: token,
      BETTER_CODEX_REMOTE_MODE: "relay",
      BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
      CODEX_HOME: join(home, "codex"),
    },
    detached: process.platform !== "win32",
    stdio: "ignore",
  });
}

async function stopRuntime(child: ChildProcess) {
  if (process.platform !== "win32" && child.pid) {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  } else if (child.exitCode === null) {
    child.kill("SIGTERM");
  }
  if (child.exitCode !== null) return;
  await Promise.race([
    once(child, "exit"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("runtime_stop_timeout")), 5000)),
  ]);
}

async function waitFor(check: () => boolean | Promise<boolean>, process?: ChildProcess, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  let output = "";
  process?.stderr?.on("data", chunk => { output += String(chunk); });
  while (Date.now() < deadline) {
    if (process && process.exitCode !== null) throw new Error(output || `runtime_exit_${process.exitCode}`);
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(output || "condition_timeout");
}

test("public Relay drives the real Runtime and recovers without storing business data", { timeout: 120_000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-relay-runtime-"));
  mkdirSync(join(home, "codex"));
  const relay = createRelayServer({ host: "127.0.0.1", port: 0, database: ":memory:", adminToken: "e".repeat(64), webUsername: "admin", webPassword: "relay-password-123", secureCookies: false, heartbeatIntervalMs: 1000, reconnectGraceMs: 250 });
  relay.server.listen(0, "127.0.0.1");
  await once(relay.server, "listening");
  const relayAddress = relay.server.address();
  assert.ok(relayAddress && typeof relayAddress === "object");
  const base = `http://127.0.0.1:${relayAddress.port}`;
  const pairing = relay.store.createPairingCode();
  const device = relay.store.pairDevice("Real Runtime", pairing.pairing_code);
  writeFileSync(join(home, "relay-credentials.json"), JSON.stringify({ enabled: true, relay_url: base, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }), { mode: 0o600 });
  const runtimePort = await availablePort();
  const runtimeToken = "real-runtime-relay-token";
  let runtime = startRuntime(home, runtimePort, runtimeToken);

  try {
    await waitFor(async () => {
      try {
        const status = await fetch(`http://127.0.0.1:${runtimePort}/api/relay/status`, { headers: { authorization: `Bearer ${runtimeToken}` } }).then(response => response.json()) as { last_error?: string | null };
        if (status.last_error) throw new Error(status.last_error);
      } catch (error) {
        if (error instanceof Error && !error.message.includes("fetch failed")) throw error;
      }
      return relay.runtime() !== null;
    }, runtime, 40_000);
    const login = await fetch(`${base}/relay/session`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ username: "admin", password: "relay-password-123" }) });
    assert.equal(login.status, 200);
    const session = await login.json() as { csrf_token: string };
    const cookie = String(login.headers.get("set-cookie") || "").split(";")[0];
    let sequence = 0;
    const request = (path: string, options: RequestInit = {}) => {
      const method = String(options.method || "GET").toUpperCase();
      const headers = new Headers(options.headers);
      headers.set("cookie", cookie);
      if (!["GET", "HEAD"].includes(method)) {
        headers.set("origin", base);
        headers.set("x-csrf-token", session.csrf_token);
        headers.set("x-better-codex-request-id", `relay-e2e-${++sequence}`);
        headers.set("content-type", "application/json");
      }
      return fetch(`${base}${path}`, { ...options, headers });
    };

    const eventController = new AbortController();
    const eventResponse = await request("/api/events", { signal: eventController.signal });
    assert.equal(eventResponse.status, 200);
    assert.match(eventResponse.headers.get("content-type") || "", /text\/event-stream/);
    const eventReader = eventResponse.body?.getReader();
    assert.ok(eventReader);
    const ready = new TextDecoder().decode((await eventReader.read()).value);
    assert.match(ready, /event: ready/);

    const projectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Relay E2E", workspace_path: home }) });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json() as { id: string };
    const change = new TextDecoder().decode((await eventReader.read()).value);
    assert.match(change, /event: change/);
    eventController.abort();
    await eventReader.cancel().catch(() => {});

    const attachmentData = Buffer.from("relay attachment payload").toString("base64");
    const cachedAttachmentResponse = await request("/api/issues/attachments", { method: "POST", body: JSON.stringify({ files: [{ name: "proof.txt", type: "text/plain", data: `data:text/plain;base64,${attachmentData}` }] }) });
    assert.equal(cachedAttachmentResponse.status, 201, await cachedAttachmentResponse.clone().text());
    const cachedAttachment = (await cachedAttachmentResponse.json() as { attachments: Array<{ name: string; path: string; type: string }> }).attachments[0];
    assert.equal(cachedAttachment.name, "proof.txt");
    assert.equal(cachedAttachment.type, "text/plain");
    assert.equal(readFileSync(cachedAttachment.path, "utf8"), "relay attachment payload");
    const issueBody = JSON.stringify({ project_id: project.id, title: "Relay issue", description: `Created through public Relay\n\nAttached files:\n- ${cachedAttachment.path}`, request_id: "relay-business-create-1" });
    const issueHeaders = { origin: base, cookie, "x-csrf-token": session.csrf_token, "x-better-codex-request-id": "relay-e2e-idempotent-1", "content-type": "application/json" };
    const issueResponse = await fetch(`${base}/api/issues`, { method: "POST", headers: issueHeaders, body: issueBody });
    assert.equal(issueResponse.status, 202);
    assert.equal((await issueResponse.json() as { queued: boolean }).queued, true);
    let issue: { id: string; version: number; description: string } | undefined;
    await waitFor(async () => {
      const response = await request("/api/issues");
      if (response.status !== 200) return false;
      issue = (await response.json() as Array<{ id: string; version: number; title: string; description: string }>).find(item => item.title === "Relay issue");
      return Boolean(issue);
    }, runtime);
    assert.ok(issue);
    const issueAttachmentPath = issue.description.split("\n").find(line => line.startsWith("- "))?.slice(2) || "";
    assert.equal(issueAttachmentPath, cachedAttachment.path);
    assert.equal(readFileSync(issueAttachmentPath, "utf8"), "relay attachment payload");
    assert.equal(readdirSync(join(home, "attachments")).length, 1);
    const replay = await fetch(`${base}/api/issues`, { method: "POST", headers: issueHeaders, body: issueBody });
    assert.equal(replay.status, 201);
    assert.equal(((await replay.json()) as { id: string }).id, issue.id);
    assert.equal(readdirSync(join(home, "attachments")).length, 1);
    const conflict = await fetch(`${base}/api/issues`, { method: "POST", headers: issueHeaders, body: JSON.stringify({ ...JSON.parse(issueBody), title: "Changed" }) });
    assert.equal(conflict.status, 409);

    const draftAttachmentData = Buffer.from("relay reply draft attachment").toString("base64");
    const cachedDraftResponse = await request("/api/issues/attachments", { method: "POST", body: JSON.stringify({ files: [{ name: "reply-draft.txt", type: "text/plain", data: `data:text/plain;base64,${draftAttachmentData}` }] }) });
    assert.equal(cachedDraftResponse.status, 201, await cachedDraftResponse.clone().text());
    const cachedDraftAttachment = (await cachedDraftResponse.json() as { attachments: Array<{ name: string; path: string; type: string }> }).attachments[0];
    const draftResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, reply_draft: "Remote reply draft", reply_draft_attachments: [cachedDraftAttachment] }) });
    assert.equal(draftResponse.status, 200);
    const draftedIssue = await draftResponse.json() as { version: number; reply_draft: string; reply_draft_attachments: Array<{ name: string; path: string; type: string }> };
    assert.equal(draftedIssue.reply_draft, "Remote reply draft");
    assert.equal(draftedIssue.reply_draft_attachments.length, 1);
    assert.equal(draftedIssue.reply_draft_attachments[0].name, "reply-draft.txt");
    assert.equal(draftedIssue.reply_draft_attachments[0].type, "text/plain");
    assert.equal(readFileSync(draftedIssue.reply_draft_attachments[0].path, "utf8"), "relay reply draft attachment");

    const agentResponse = await request("/api/agents", { method: "POST", body: JSON.stringify({ name: "Relay Agent", description: "Publicly managed", instructions: "Keep changes scoped", model: "gpt-test", reasoning_effort: "medium", sandbox_mode: "workspace-write" }) });
    assert.equal(agentResponse.status, 201);
    const agent = await agentResponse.json() as { id: string; version: number };
    const updatedAgentResponse = await request(`/api/agents/${agent.id}`, { method: "PATCH", body: JSON.stringify({ version: agent.version, name: "Relay Agent Updated", description: "Publicly managed", instructions: "Keep changes scoped", model: "gpt-test", reasoning_effort: "medium", sandbox_mode: "workspace-write" }) });
    assert.equal(updatedAgentResponse.status, 200);

    const updatedIssueResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: draftedIssue.version, status: "in_progress", priority: "high" }) });
    assert.equal(updatedIssueResponse.status, 200);
    const updatedIssue = await updatedIssueResponse.json() as { version: number; status: string };
    assert.equal(updatedIssue.status, "in_progress");
    const archivedResponse = await request(`/api/issues/${issue.id}/archive`, { method: "POST", body: JSON.stringify({ version: updatedIssue.version }) });
    assert.equal(archivedResponse.status, 200);
    const archived = await archivedResponse.json() as { version: number; archived_at: string };
    assert.ok(archived.archived_at);
    const restoredResponse = await request(`/api/issues/${issue.id}/unarchive`, { method: "POST", body: JSON.stringify({ version: archived.version }) });
    assert.equal(restoredResponse.status, 200);

    await stopRuntime(runtime);
    await waitFor(() => relay.runtime() === null, undefined, 5000);
    await waitFor(async () => {
      const health = await fetch(`${base}/healthz`).then(response => response.json()) as { runtime: { state: string } };
      return health.runtime.state === "offline";
    }, undefined, 5000);
    const offline = await request(`/api/issues/${issue.id}`);
    assert.equal(offline.status, 503);
    const offlineBody = await offline.json() as { error: string; trace_id: string };
    assert.equal(offlineBody.error, "runtime_offline");
    assert.match(offlineBody.trace_id, /^[0-9a-f-]{36}$/);

    runtime = startRuntime(home, runtimePort, runtimeToken);
    await waitFor(() => relay.runtime() !== null, runtime, 40_000);
    const recovered = await request(`/api/issues/${issue.id}`);
    assert.equal(recovered.status, 200);
    const recoveredIssue = await recovered.json() as { id: string; reply_draft: string; reply_draft_attachments: Array<{ name: string; path: string }> };
    assert.equal(recoveredIssue.id, issue.id);
    assert.equal(recoveredIssue.reply_draft, "Remote reply draft");
    assert.equal(recoveredIssue.reply_draft_attachments[0].name, "reply-draft.txt");
    assert.equal(readFileSync(recoveredIssue.reply_draft_attachments[0].path, "utf8"), "relay reply draft attachment");
    assert.deepEqual(relay.store.tableNames(), ["relay_audit", "relay_commands", "relay_devices", "relay_settings", "relay_web_sessions", "relay_web_users", "sqlite_sequence"]);
  } finally {
    await stopRuntime(runtime).catch(() => {});
    await relay.close();
    rmSync(home, { recursive: true, force: true });
  }
});
