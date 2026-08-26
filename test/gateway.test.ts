import assert from "node:assert/strict";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createConnection, type Socket } from "node:net";
import test from "node:test";
import { Store } from "../src/db.js";
import { sessionHostProtocolVersion, type SessionHostServerMessage } from "../src/session-host-protocol.js";

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function startGateway(home: string, port: number, token: string, mockup = false) {
  return spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve", ...(mockup ? ["--mockup"] : [])], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_CODEX_HOME: home,
      CODEX_HOME: home,
      BETTER_CODEX_PORT: String(port),
      BETTER_CODEX_TOKEN: token,
      BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForGateway(port: number, process: ChildProcess) {
  let output = "";
  process.stderr?.on("data", chunk => { output += String(chunk); });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(output || `gateway_exit_${process.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(output || "gateway_start_timeout");
}

async function stopGateway(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await new Promise<void>(resolve => process.once("exit", () => resolve()));
}

function openSocket(path: string) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = createConnection(path);
    socket.once("connect", () => resolve(socket));
    socket.once("error", reject);
  });
}

function readSocketMessage(socket: Socket) {
  return new Promise<SessionHostServerMessage>((resolve, reject) => {
    let output = "";
    const data = (chunk: Buffer) => {
      output += String(chunk);
      const newline = output.indexOf("\n");
      if (newline < 0) return;
      cleanup();
      try { resolve(JSON.parse(output.slice(0, newline)) as SessionHostServerMessage); }
      catch (error) { reject(error); }
    };
    const error = (cause: Error) => { cleanup(); reject(cause); };
    const close = () => { cleanup(); reject(new Error("session_host_socket_closed")); };
    const cleanup = () => {
      socket.off("data", data);
      socket.off("error", error);
      socket.off("close", close);
    };
    socket.on("data", data);
    socket.once("error", error);
    socket.once("close", close);
  });
}

test("gateway completes the issue workflow and survives restart", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-gateway-test-"));
  const port = await availablePort();
  const token = "gateway-test-token";
  const codexProjectCreatedAt = 1_784_254_152_692;
  writeFileSync(join(home, ".codex-global-state.json"), JSON.stringify({
    "local-projects": {
      "codex-source-project": {
        id: "codex-source-project",
        name: "Synced from Codex",
        rootPaths: [home],
        createdAt: codexProjectCreatedAt,
        updatedAt: codexProjectCreatedAt,
      },
    },
  }));
  const legacyThreadId = "019fec06-788f-7af3-a031-76b546904f11";
  const seedStore = new Store(join(home, "better-codex.db"));
  const seedProject = seedStore.createProject({ name: "Legacy imports", workspacePath: home });
  const legacyIssue = seedStore.createIssue({ projectId: seedProject.id, title: "Legacy imported chat", threadId: legacyThreadId, workspacePath: home });
  seedStore.close();
  let gateway = startGateway(home, port, token);
  const request = async (path: string, options: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  try {
    await waitForGateway(port, gateway);
    const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json() as { generation: number; database: { schemaVersion: number } };
    assert.equal(health.database.schemaVersion, 22);
    assert.equal(health.generation, 1);
    const firstRuntime = JSON.parse(readFileSync(join(home, "run", "runtime.json"), "utf8")) as { generation: number; instanceId: string };
    const firstAuthority = JSON.parse(readFileSync(join(home, "run", "runtime-authority.json"), "utf8")) as { generation: number; runtimeInstanceId: string; status: string };
    assert.equal(firstRuntime.generation, 1);
    assert.deepEqual(firstAuthority, { ...firstAuthority, generation: 1, runtimeInstanceId: firstRuntime.instanceId, status: "claimed" });

    const bootstrap = await (await request("/api/bootstrap")).json() as { projects: Array<{ external_id: string | null; created_at: string }>; agents: Array<{ id: string; name: string; is_default?: boolean }>; appearance: unknown };
    assert.equal(
      bootstrap.projects.find(project => project.external_id === "codex-source-project")?.created_at,
      new Date(codexProjectCreatedAt).toISOString(),
    );
    assert.deepEqual(bootstrap.appearance, {
      theme: "system",
      light: { accent: "#339cff", contrast: 45, ink: "#1a1c1f", surface: "#ffffff", uiFont: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' },
      dark: { accent: "#007acc", contrast: 50, ink: "#d4d4d4", surface: "#1e1e1e", uiFont: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' },
    });
    assert.deepEqual(bootstrap.agents[0], {
      id: "",
      role: "codex",
      name: "Codex",
      description: "",
      instructions: "使用 Codex 默认配置承接并执行 Better Codex Issue。",
      model: "默认模型",
      reasoning_effort: "默认推理等级",
      service_tier: "default",
      sandbox_mode: "workspace-write",
      max_concurrency: 5,
      version: 1,
      created_at: "",
      updated_at: "",
      is_default: true,
      avatar: "",
    });

    const avatar = "data:image/webp;base64,UklGRg==";
    const defaultAgentResponse = await request("/api/agents/default", {
      method: "PATCH",
      body: JSON.stringify({ model: "gpt-5.6-luna", reasoning_effort: "high", avatar }),
    });
    assert.equal(defaultAgentResponse.status, 200);
    const defaultAgent = await defaultAgentResponse.json() as { model: string; reasoning_effort: string };
    assert.equal(defaultAgent.model, "gpt-5.6-luna");
    assert.equal(defaultAgent.reasoning_effort, "high");
    assert.equal((defaultAgent as { avatar: string }).avatar, avatar);

    const optionalAgentResponse = await request("/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: "Optional fields", description: "", instructions: "", model: "gpt-5.4-mini", reasoning_effort: "medium", avatar }),
    });
    assert.equal(optionalAgentResponse.status, 201);
    const optionalAgent = await optionalAgentResponse.json() as { id: string; avatar: string };
    assert.equal(optionalAgent.avatar, avatar);

    const invalidAvatarResponse = await request(`/api/agents/${optionalAgent.id}/avatar`, {
      method: "PATCH",
      body: JSON.stringify({ avatar: "https://example.com/avatar.png" }),
    });
    assert.equal(invalidAvatarResponse.status, 400);
    assert.deepEqual(await invalidAvatarResponse.json(), { error: "invalid_agent_avatar" });

    const iconAvatarResponse = await request(`/api/agents/${optionalAgent.id}/avatar`, {
      method: "PATCH",
      body: JSON.stringify({ avatar: "icon:reviewer" }),
    });
    assert.equal(iconAvatarResponse.status, 200);
    assert.equal(((await iconAvatarResponse.json()) as { avatar: string }).avatar, "icon:reviewer");

    const preflight = await fetch(`http://127.0.0.1:${port}/api/bootstrap`, {
      method: "OPTIONS",
      headers: {
        origin: "app://-",
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
        "access-control-request-private-network": "true",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "app://-");
    assert.equal(preflight.headers.get("access-control-allow-private-network"), "true");

    const projectWorkspace = join(home, "gateway-project");
    const targetProjectWorkspace = join(home, "gateway-target-project");
    mkdirSync(projectWorkspace);
    mkdirSync(targetProjectWorkspace);
    const projectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Gateway", workspace_path: projectWorkspace }) });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json() as { id: string };
    const targetProjectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Gateway target", workspace_path: targetProjectWorkspace }) });
    assert.equal(targetProjectResponse.status, 201);
    const targetProject = await targetProjectResponse.json() as { id: string };

    const legacyLookupResponse = await request(`/api/issues/from-thread?thread_id=${legacyThreadId}`);
    assert.equal(legacyLookupResponse.status, 200);
    const legacyLookup = await legacyLookupResponse.json() as { id: string; version: number; agent_enabled: boolean; session_owned: boolean };
    assert.equal(legacyLookup.id, legacyIssue.id);
    assert.equal(legacyLookup.version, legacyIssue.version);
    assert.equal(legacyLookup.agent_enabled, false);
    assert.equal(legacyLookup.session_owned, false);
    const restoredLegacyResponse = await request("/api/issues/from-thread", {
      method: "POST",
      body: JSON.stringify({ thread_id: legacyThreadId }),
    });
    assert.equal(restoredLegacyResponse.status, 200);
    const restoredLegacy = await restoredLegacyResponse.json() as { version: number; agent_enabled: boolean; status: string; reply_status: string; session_owned: boolean; session_thread_id: string };
    assert.equal(restoredLegacy.version, legacyIssue.version + 1);
    assert.equal(restoredLegacy.agent_enabled, legacyIssue.agent_enabled);
    assert.equal(restoredLegacy.status, "in_review");
    assert.equal(restoredLegacy.reply_status, "succeeded");
    assert.equal(restoredLegacy.session_owned, true);
    assert.equal(restoredLegacy.session_thread_id, legacyThreadId);

    const importedThreadId = "019fec06-788f-7af3-a031-76b546904fe5";
    const importedTurnId = "019fec06-788f-7af3-a031-76b546904fe8";
    const importedSessionDirectory = join(home, "sessions", "2026", "08", "11");
    mkdirSync(importedSessionDirectory, { recursive: true });
    writeFileSync(join(importedSessionDirectory, `rollout-2026-08-11T10-00-00-${importedThreadId}.jsonl`), [
      JSON.stringify({ type: "session_meta", payload: { cwd: home } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-11T10:00:01.000Z", payload: { type: "user_message", message: "Keep this context" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-11T10:00:02.000Z", payload: { type: "agent_message", phase: "final_answer", message: "Context retained" } }),
      "",
    ].join("\n"), "utf8");
    const missingImportResponse = await request(`/api/issues/from-thread?thread_id=${importedThreadId}`);
    assert.equal(missingImportResponse.status, 404);
    const importedResponse = await request("/api/issues/from-thread", {
      method: "POST",
      body: JSON.stringify({ project_id: project.id, title: "Imported native chat", thread_id: `local:${importedThreadId}` }),
    });
    assert.equal(importedResponse.status, 201);
    const importedIssue = await importedResponse.json() as {
      id: string;
      thread_id: string;
      agent_enabled: boolean;
      agent_id: string | null;
      needs_attention: boolean;
      pending_actor: string;
      status: string;
      reply_status: string;
      session_owned: boolean;
      session_thread_id: string;
      session_status: string;
      run_thread_id: string;
    };
    assert.equal(importedIssue.thread_id, importedThreadId);
    assert.equal(importedIssue.agent_enabled, true);
    assert.equal(importedIssue.agent_id, null);
    assert.equal(importedIssue.needs_attention, true);
    assert.equal(importedIssue.pending_actor, "user");
    assert.equal(importedIssue.status, "in_review");
    assert.equal(importedIssue.reply_status, "succeeded");
    assert.equal(importedIssue.session_owned, true);
    assert.equal(importedIssue.session_thread_id, importedThreadId);
    assert.equal(importedIssue.session_status, "idle");
    assert.equal(importedIssue.run_thread_id, importedThreadId);
    const importedConversation = await (await request(`/api/issues/${importedIssue.id}/conversation`)).json() as {
      found: boolean;
      messages: Array<{ markdown: string }>;
    };
    assert.equal(importedConversation.found, true);
    assert.deepEqual(importedConversation.messages.map(message => message.markdown), ["Keep this context", "Context retained"]);
    const importedReply = await request(`/api/issues/${importedIssue.id}/reply`, {
      method: "POST",
      body: JSON.stringify({ request_id: "imported-reply", message: "Continue here" }),
    });
    assert.equal(importedReply.status, 202);
    const importedRelayPoll = await request("/api/session-relay/poll", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", app_session_id: "app-test", capability: "ready" }),
    });
    const importedRelay = await importedRelayPoll.json() as { command: { id: string; kind: string; thread_id: string; payload: { message: string } } };
    assert.equal(importedRelay.command.kind, "turn");
    assert.equal(importedRelay.command.thread_id, importedThreadId);
    assert.equal(importedRelay.command.payload.message, "Continue here");
    const importedRelayComplete = await request(`/api/session-relay/commands/${importedRelay.command.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", result: { thread_id: importedThreadId, turn_id: importedTurnId } }),
    });
    assert.equal(importedRelayComplete.status, 200);
    const importedRelayEvent = await request("/api/session-relay/events", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", method: "turn/completed", params: { threadId: importedThreadId, turn: { id: importedTurnId, status: "completed", items: [] } } }),
    });
    assert.equal(importedRelayEvent.status, 200);
    const resolvedImportResponse = await request(`/api/issues/from-thread?thread_id=${importedThreadId}`);
    assert.equal(resolvedImportResponse.status, 200);
    assert.equal(((await resolvedImportResponse.json()) as { id: string }).id, importedIssue.id);
    const replayedImportResponse = await request("/api/issues/from-thread", {
      method: "POST",
      body: JSON.stringify({ project_id: targetProject.id, title: "Duplicate import", thread_id: importedThreadId }),
    });
    assert.equal(replayedImportResponse.status, 200);
    assert.equal(((await replayedImportResponse.json()) as { id: string }).id, importedIssue.id);

    const runningThreadId = "019fec06-788f-7af3-a031-76b546904fe9";
    const runningTurnId = "019fec06-788f-7af3-a031-76b546904fea";
    writeFileSync(join(importedSessionDirectory, `rollout-2026-08-11T10-10-00-${runningThreadId}.jsonl`), [
      JSON.stringify({ type: "session_meta", payload: { cwd: home } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-11T10:10:01.000Z", payload: { type: "task_started", turn_id: runningTurnId } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-11T10:10:02.000Z", payload: { type: "agent_message", phase: "commentary", message: "Still working" } }),
      "",
    ].join("\n"), "utf8");
    const runningImportResponse = await request("/api/issues/from-thread", {
      method: "POST",
      body: JSON.stringify({ project_id: project.id, title: "Running native chat", thread_id: runningThreadId }),
    });
    assert.equal(runningImportResponse.status, 201);
    const runningIssue = await runningImportResponse.json() as {
      id: string;
      status: string;
      reply_status: string;
      needs_attention: boolean;
      pending_actor: string;
      session_status: string;
      session_active_turn_id: string;
    };
    assert.equal(runningIssue.status, "in_progress");
    assert.equal(runningIssue.reply_status, "running");
    assert.equal(runningIssue.needs_attention, false);
    assert.equal(runningIssue.pending_actor, "agent");
    assert.equal(runningIssue.session_status, "active");
    assert.equal(runningIssue.session_active_turn_id, runningTurnId);
    const runningCompleteEvent = await request("/api/session-relay/events", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", method: "turn/completed", params: { threadId: runningThreadId, turn: { id: runningTurnId, status: "completed", items: [] } } }),
    });
    assert.equal(runningCompleteEvent.status, 200);
    const completedRunningIssue = await (await request(`/api/issues/${runningIssue.id}`)).json() as { status: string; reply_status: string; session_status: string };
    assert.equal(completedRunningIssue.status, "in_review");
    assert.equal(completedRunningIssue.reply_status, "succeeded");
    assert.equal(completedRunningIssue.session_status, "idle");

    const createRequest = { project_id: project.id, title: "Round trip", request_id: "gateway-create-round-trip" };
    const issueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify(createRequest) });
    assert.equal(issueResponse.status, 201);
    const issue = await issueResponse.json() as { id: string; version: number };
    const replayedIssueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify(createRequest) });
    assert.equal(replayedIssueResponse.status, 200);
    assert.equal((await replayedIssueResponse.json() as { id: string }).id, issue.id);
    const conflictedIssueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify({ ...createRequest, title: "Different" }) });
    assert.equal(conflictedIssueResponse.status, 409);
    const deletedCreateRequest = { project_id: project.id, title: "Deleted idempotent create", request_id: "gateway-create-deleted" };
    const deletedIssueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify(deletedCreateRequest) });
    const deletedIssue = await deletedIssueResponse.json() as { id: string; version: number };
    const deletedIssueArchive = await request(`/api/issues/${deletedIssue.id}/archive`, { method: "POST", body: JSON.stringify({ version: deletedIssue.version }) });
    const deletedIssueArchived = await deletedIssueArchive.json() as { version: number };
    assert.equal((await request(`/api/issues/${deletedIssue.id}`, { method: "DELETE", body: JSON.stringify({ version: deletedIssueArchived.version }) })).status, 200);
    assert.equal((await request("/api/issues", { method: "POST", body: JSON.stringify(deletedCreateRequest) })).status, 404);
    const listedIssues = await (await request("/api/issues")).json() as Array<{ id: string; reply_status: string }>;
    assert.equal(listedIssues.filter(item => item.id === issue.id).length, 1);
    assert.equal(listedIssues.find(item => item.id === issue.id)?.reply_status, "idle");
    const directIssue = await (await request(`/api/issues/${issue.id}`)).json() as { reply_status: string };
    assert.equal(directIssue.reply_status, "idle");

    const nativeProjectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Native", workspace_path: home }) });
    const nativeProject = await nativeProjectResponse.json() as { id: string };
    const nativeIssueResponse = await request("/api/issues", {
      method: "POST",
      body: JSON.stringify({ project_id: nativeProject.id, title: "Native thread", description: "Implement it", status: "todo", agent_enabled: true, workspace_path: home }),
    });
    const nativeIssue = await nativeIssueResponse.json() as { id: string; version: number; session_thread_id: string | null };
    assert.equal(nativeIssue.session_thread_id, null);
    const nativeStart = await request(`/api/issues/${nativeIssue.id}/start`, { method: "POST", body: JSON.stringify({ version: nativeIssue.version }) });
    assert.equal(nativeStart.status, 202);
    const relayPoll = await request("/api/session-relay/poll", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", app_session_id: "app-test", capability: "ready" }),
    });
    const relay = await relayPoll.json() as { leader: boolean; command: { id: string; kind: string; payload: { message: string } } };
    assert.equal(relay.leader, true);
    assert.equal(relay.command.kind, "start");
    assert.equal(relay.command.payload.message, "Implement it");
    const nativeThreadId = "019fec06-788f-7af3-a031-76b546904fe6";
    const nativeTurnId = "019fec06-788f-7af3-a031-76b546904fe7";
    const relayComplete = await request(`/api/session-relay/commands/${relay.command.id}/complete`, {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", result: { thread_id: nativeThreadId, turn_id: nativeTurnId } }),
    });
    assert.equal(relayComplete.status, 200);
    const linkedIssue = await (await request(`/api/issues/${nativeIssue.id}`)).json() as { session_owned: boolean; session_thread_id: string; session_active_turn_id: string };
    assert.equal(linkedIssue.session_owned, true);
    assert.equal(linkedIssue.session_thread_id, nativeThreadId);
    assert.equal(linkedIssue.session_active_turn_id, nativeTurnId);
    const retryEvent = await request("/api/session-relay/events", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", method: "error", params: { threadId: nativeThreadId, turnId: nativeTurnId, willRetry: true, error: { kind: "stream", code: "responseStreamDisconnected", httpStatusCode: 502, message: "stream disconnected" } } }),
    });
    assert.equal(retryEvent.status, 200);
    const retryingIssue = await (await request(`/api/issues/${nativeIssue.id}`)).json() as { status: string; session_retry: { kind: string; count: number; http_status: number } };
    assert.equal(retryingIssue.status, "in_progress");
    assert.deepEqual({ kind: retryingIssue.session_retry.kind, count: retryingIssue.session_retry.count, http_status: retryingIssue.session_retry.http_status }, { kind: "stream", count: 1, http_status: 502 });
    const progressEvent = await request("/api/session-relay/events", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", method: "item/started", params: { threadId: nativeThreadId, turnId: nativeTurnId, item: { type: "commandExecution" } } }),
    });
    assert.equal(progressEvent.status, 200);
    assert.equal(((await (await request(`/api/issues/${nativeIssue.id}`)).json()) as { session_retry: unknown }).session_retry, null);
    const relayEvent = await request("/api/session-relay/events", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", method: "turn/completed", params: { threadId: nativeThreadId, turn: { id: nativeTurnId, status: "interrupted", items: [] } } }),
    });
    assert.equal(relayEvent.status, 200);
    const interruptedIssue = await (await request(`/api/issues/${nativeIssue.id}`)).json() as { status: string; latest_run_status: string; session_status: string; session_active_turn_id: string | null };
    assert.equal(interruptedIssue.status, "in_progress");
    assert.equal(interruptedIssue.latest_run_status, "interrupted");
    assert.equal(interruptedIssue.session_status, "interrupted");
    assert.equal(interruptedIssue.session_active_turn_id, null);

    const stuckIssueResponse = await request("/api/issues", {
      method: "POST",
      body: JSON.stringify({ project_id: nativeProject.id, title: "Stuck before thread", status: "todo", agent_enabled: true, workspace_path: home }),
    });
    const stuckIssue = await stuckIssueResponse.json() as { id: string; version: number };
    const stuckStart = await request(`/api/issues/${stuckIssue.id}/start`, { method: "POST", body: JSON.stringify({ version: stuckIssue.version }) });
    assert.equal(stuckStart.status, 202);
    const stuckRelay = await request("/api/session-relay/poll", {
      method: "POST",
      body: JSON.stringify({ relay_id: "relay-test", app_session_id: "app-test", capability: "ready" }),
    });
    assert.equal(((await stuckRelay.json()) as { command: { kind: string } }).command.kind, "start");
    const stuckCurrent = await (await request(`/api/issues/${stuckIssue.id}`)).json() as { version: number; active_run_status: string };
    assert.equal(stuckCurrent.active_run_status, "claimed");
    const stuckArchiveResponse = await request(`/api/issues/${stuckIssue.id}/archive`, { method: "POST", body: JSON.stringify({ version: stuckCurrent.version }) });
    assert.equal(stuckArchiveResponse.status, 200);
    const stuckArchived = await stuckArchiveResponse.json() as { version: number; archived_at: string; active_run_status: string | null };
    assert.ok(stuckArchived.archived_at);
    assert.equal(stuckArchived.active_run_status, null);
    const stuckDeleteResponse = await request(`/api/issues/${stuckIssue.id}`, { method: "DELETE", body: JSON.stringify({ version: stuckArchived.version }) });
    assert.equal(stuckDeleteResponse.status, 200);

    const invalidResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: "false" }) });
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), { error: "invalid_pinned" });

    const updatedResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, project_id: targetProject.id, status: "in_progress" }) });
    assert.equal(updatedResponse.status, 200);
    const updated = await updatedResponse.json() as { project_id: string };
    assert.equal(updated.project_id, targetProject.id);
    const staleResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, title: "Stale" }) });
    assert.equal(staleResponse.status, 409);
    assert.deepEqual(await staleResponse.json(), { error: "version_conflict" });

    await stopGateway(gateway);
    gateway = startGateway(home, port, token);
    await waitForGateway(port, gateway);
    const secondHealth = await (await fetch(`http://127.0.0.1:${port}/health`)).json() as { generation: number; instanceId: string };
    assert.equal(secondHealth.generation, 2);
    assert.notEqual(secondHealth.instanceId, firstRuntime.instanceId);
    const restoredResponse = await request(`/api/issues/${issue.id}`);
    assert.equal(restoredResponse.status, 200);
    const restored = await restoredResponse.json() as { status: string; project_id: string; thread_id: string | null };
    assert.equal(restored.status, "in_progress");
    assert.equal(restored.project_id, targetProject.id);
    assert.equal(restored.thread_id, null);
    const replayedAfterRestart = await request("/api/issues", { method: "POST", body: JSON.stringify(createRequest) });
    assert.equal(replayedAfterRestart.status, 200);
    assert.equal((await replayedAfterRestart.json() as { id: string }).id, issue.id);
    const restoredAgents = await (await request("/api/agents")).json() as Array<{ id: string; avatar: string }>;
    assert.equal(restoredAgents.find(agent => agent.id === optionalAgent.id)?.avatar, "icon:reviewer");
  } finally {
    await stopGateway(gateway);
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("session host handoff fences stale Runtime generations", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-session-handoff-"));
  const token = "session-host-handoff-token";
  const socketPath = process.platform === "win32" ? "\\\\.\\pipe\\better-codex-session-host-development" : join(home, "run", "session-host");
  const host = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "session-host"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_CODEX_HOME: home,
      BETTER_CODEX_PROFILE: "development",
      BETTER_CODEX_TOKEN: token,
      BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let source: Socket | undefined;
  let target: Socket | undefined;
  try {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      try {
        source = await openSocket(socketPath);
        break;
      } catch {
        if (host.exitCode !== null) throw new Error(`session_host_exit_${host.exitCode}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    assert.ok(source);
    const capabilities = { durable_deliveries: true, runtime_handoff: true };
    const sourceAckPromise = readSocketMessage(source);
    source.write(`${JSON.stringify({ type: "hello", protocol_version: sessionHostProtocolVersion, token, runtime_instance_id: "runtime-source", runtime_generation: 1, runtime_version: "1.0.0", profile: "development", handoff_update_id: null, capabilities })}\n`);
    const sourceAck = await sourceAckPromise;
    assert.equal(sourceAck.type, "hello_ack");
    const updateId = "019fec06-788f-7af3-a031-76b546904fb0";
    const startedPromise = readSocketMessage(source);
    source.write(`${JSON.stringify({ type: "begin_handoff", request_id: "handoff-start", update_id: updateId, target_runtime_generation: 2, target_version: "1.1.0", deadline_at: new Date(Date.now() + 60_000).toISOString() })}\n`);
    const started = await startedPromise;
    assert.equal(started.type, "handoff_response");
    if (started.type === "handoff_response") {
      assert.equal(started.ok, true);
      assert.equal(started.handoff?.target_runtime_generation, 2);
    }

    const stale = await openSocket(socketPath);
    stale.on("error", () => {});
    const staleClosed = once(stale, "close");
    stale.write(`${JSON.stringify({ type: "hello", protocol_version: sessionHostProtocolVersion, token, runtime_instance_id: "runtime-stale", runtime_generation: 1, runtime_version: "1.0.0", profile: "development", handoff_update_id: null, capabilities })}\n`);
    await staleClosed;

    target = await openSocket(socketPath);
    const targetAckPromise = readSocketMessage(target);
    target.write(`${JSON.stringify({ type: "hello", protocol_version: sessionHostProtocolVersion, token, runtime_instance_id: "runtime-target", runtime_generation: 2, runtime_version: "1.1.0", profile: "development", handoff_update_id: updateId, capabilities })}\n`);
    const targetAck = await targetAckPromise;
    assert.equal(targetAck.type, "hello_ack");
    const completedPromise = readSocketMessage(target);
    target.write(`${JSON.stringify({ type: "complete_handoff", request_id: "handoff-complete", update_id: updateId })}\n`);
    const completed = await completedPromise;
    assert.equal(completed.type, "handoff_response");
    if (completed.type === "handoff_response") {
      assert.equal(completed.ok, true);
      assert.equal(completed.handoff, null);
    }
    target.write(`${JSON.stringify({ type: "shutdown", token })}\n`);
    await Promise.race([once(host, "exit"), new Promise((_, reject) => setTimeout(() => reject(new Error("session_host_stop_timeout")), 5000))]);
  } finally {
    source?.destroy();
    target?.destroy();
    if (host.exitCode === null) host.kill("SIGTERM");
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("session host keeps an active App Server turn alive across Runtime handoff", { timeout: 45_000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-session-continuity-"));
  const token = "session-host-continuity-token";
  const socketPath = process.platform === "win32" ? "\\\\.\\pipe\\better-codex-session-host-development" : join(home, "run", "session-host");
  const fakeCodexScript = join(home, process.platform === "win32" ? "app-server" : "fake-codex.cjs");
  const fakeCodex = process.platform === "win32" ? join(home, "fake-codex.exe") : fakeCodexScript;
  const threadId = "019fec06-788f-7af3-a031-76b546904f81";
  const turnId = "019fec06-788f-7af3-a031-76b546904f82";
  writeFileSync(fakeCodexScript, `#!/usr/bin/env node
const readline = require("node:readline");
const { basename } = require("node:path");
if (process.argv.includes("--version")) { console.log("codex-fake 1.0.0"); process.exit(0); }
if (!process.argv.some(value => basename(value) === "app-server")) process.exit(2);
const send = value => process.stdout.write(JSON.stringify(value) + "\\n");
const input = readline.createInterface({ input: process.stdin });
input.on("line", line => {
  const message = JSON.parse(line);
  if (message.id === undefined) return;
  if (message.method === "initialize") return send({ id: message.id, result: {} });
  if (message.method === "thread/start") return send({ id: message.id, result: { thread: { id: "${threadId}" } } });
  if (message.method === "thread/name/set") return send({ id: message.id, result: {} });
  if (message.method === "turn/start") {
    send({ id: message.id, result: { turn: { id: "${turnId}", status: "inProgress" } } });
    send({ method: "turn/started", params: { threadId: "${threadId}", turn: { id: "${turnId}", status: "inProgress" } } });
    setTimeout(() => {
      send({ method: "item/completed", params: { threadId: "${threadId}", turnId: "${turnId}", item: { type: "agentMessage", text: "continued after Runtime restart" } } });
      send({ method: "turn/completed", params: { threadId: "${threadId}", turn: { id: "${turnId}", status: "completed", items: [{ type: "agentMessage", text: "continued after Runtime restart" }] } } });
    }, 1800);
    return;
  }
  send({ id: message.id, result: {} });
});
`, { mode: 0o700 });
  if (process.platform === "win32") copyFileSync(process.execPath, fakeCodex);
  else chmodSync(fakeCodex, 0o700);
  const hostArguments = process.platform === "win32"
    ? ["--import", import.meta.resolve("tsx"), join(process.cwd(), "src", "cli.ts"), "session-host"]
    : ["--import", "tsx", "src/cli.ts", "session-host"];
  const host = spawn(process.execPath, hostArguments, {
    cwd: process.platform === "win32" ? home : process.cwd(),
    env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_PROFILE: "development", BETTER_CODEX_TOKEN: token, BETTER_CODEX_CODEX_PATH: fakeCodex },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let hostOutput = "";
  host.stderr?.on("data", chunk => { hostOutput += String(chunk); });
  let source: Socket | undefined;
  let target: Socket | undefined;
  const diagnosticState: Record<string, unknown> = { phase: "starting", source_polls: 0, target_polls: 0, status_responses: 0, completed_event: false, last_message: null, last_delivery: null, snapshot: null };
  const diagnosticTimer = setTimeout(() => process.stderr.write(`SESSION_HANDOFF_TEST_DIAGNOSTIC ${JSON.stringify(diagnosticState)}\n`), 25_000);
  const queue = (socket: Socket) => {
    const values: SessionHostServerMessage[] = [];
    const waiters: Array<(value: SessionHostServerMessage) => void> = [];
    let output = "";
    socket.on("data", chunk => {
      output += String(chunk);
      const lines = output.split(/\r?\n/);
      output = lines.pop() || "";
      for (const line of lines) {
        const value = JSON.parse(line) as SessionHostServerMessage;
        const waiter = waiters.shift();
        if (waiter) waiter(value); else values.push(value);
      }
    });
    return () => new Promise<SessionHostServerMessage>((resolve, reject) => {
      const value = values.shift();
      if (value) return resolve(value);
      const timer = setTimeout(() => reject(new Error("session_host_message_timeout")), 10_000);
      waiters.push(message => { clearTimeout(timer); resolve(message); });
    });
  };
  try {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      try { source = await openSocket(socketPath); break; }
      catch { if (host.exitCode !== null) throw new Error(`session_host_exit_${host.exitCode}`); await new Promise(resolve => setTimeout(resolve, 50)); }
    }
    assert.ok(source, hostOutput || "session_host_start_timeout");
    diagnosticState.phase = "source_connected";
    const sourceNext = queue(source);
    const capabilities = { durable_deliveries: true, runtime_handoff: true };
    source.write(`${JSON.stringify({ type: "hello", protocol_version: sessionHostProtocolVersion, token, runtime_instance_id: "runtime-source", runtime_generation: 1, runtime_version: "1.0.0", profile: "development", handoff_update_id: null, capabilities })}\n`);
    assert.equal((await sourceNext()).type, "hello_ack");
    diagnosticState.phase = "source_authenticated";
    let dispatched = false;
    let sourceSnapshot: Extract<SessionHostServerMessage, { type: "handoff_response" }>["snapshot"] | null = null;
    const updateId = "019fec06-788f-7af3-a031-76b546904f83";
    while (!sourceSnapshot) {
      const message = await sourceNext();
      diagnosticState.last_message = message.type;
      if (message.type === "poll_request") {
        diagnosticState.source_polls = Number(diagnosticState.source_polls) + 1;
        const command = dispatched ? null : { id: "command-long-turn", kind: "start", thread_id: null, turn_id: null, payload: { workspace_path: home, input: [{ type: "text", text: "run long turn" }] } };
        dispatched = true;
        source.write(`${JSON.stringify({ type: "poll_response", request_id: message.request_id, result: { leader: true, acquired: true, expires_at: new Date(Date.now() + 10_000).toISOString(), previous_relay_id: null, command, thread_ids: command ? [] : [threadId], active_turns: [] } })}\n`);
      }
      if (message.type === "delivery") {
        diagnosticState.last_delivery = message.kind;
        source.write(`${JSON.stringify({ type: "delivery_ack", delivery_id: message.delivery_id, host_instance_id: message.host_instance_id, sequence: message.sequence, payload_hash: message.payload_hash })}\n`);
        if (message.kind === "fail") throw new Error(`session_host_command_failed:${JSON.stringify(message.payload)}`);
        if (message.kind === "event" && message.payload.method === "turn/started") source.write(`${JSON.stringify({ type: "begin_handoff", request_id: "continuity-handoff", update_id: updateId, target_runtime_generation: 2, target_version: "1.1.0", deadline_at: new Date(Date.now() + 60_000).toISOString() })}\n`);
      }
      if (message.type === "handoff_response" && message.request_id === "continuity-handoff") sourceSnapshot = message.snapshot;
    }
    diagnosticState.phase = "source_handoff_ready";
    assert.equal(sourceSnapshot.active_turns.length, 1);
    assert.ok(sourceSnapshot.app_server_pid);
    source.destroy();

    target = await openSocket(socketPath);
    diagnosticState.phase = "target_connected";
    const targetNext = queue(target);
    target.write(`${JSON.stringify({ type: "hello", protocol_version: sessionHostProtocolVersion, token, runtime_instance_id: "runtime-target", runtime_generation: 2, runtime_version: "1.1.0", profile: "development", handoff_update_id: updateId, capabilities })}\n`);
    assert.equal((await targetNext()).type, "hello_ack");
    diagnosticState.phase = "target_authenticated";
    let targetSnapshot = sourceSnapshot;
    let completedEvent = false;
    let statusSequence = 0;
    const statusTimer = setInterval(() => target?.write(`${JSON.stringify({ type: "handoff_status_request", request_id: `continuity-status-${++statusSequence}` })}\n`), 100);
    while (!completedEvent || targetSnapshot.active_turns.length || targetSnapshot.queued_deliveries) {
      const message = await targetNext();
      diagnosticState.phase = "target_draining";
      diagnosticState.last_message = message.type;
      if (message.type === "poll_request") {
        diagnosticState.target_polls = Number(diagnosticState.target_polls) + 1;
        target.write(`${JSON.stringify({ type: "poll_response", request_id: message.request_id, result: { leader: true, acquired: true, expires_at: new Date(Date.now() + 10_000).toISOString(), previous_relay_id: null, command: null, thread_ids: [threadId], active_turns: completedEvent ? [] : [{ thread_id: threadId, turn_id: turnId }] } })}\n`);
      }
      if (message.type === "delivery") {
        if (message.kind === "event" && message.payload.method === "turn/completed") completedEvent = true;
        diagnosticState.completed_event = completedEvent;
        diagnosticState.last_delivery = message.kind === "event" ? `${message.kind}:${String(message.payload.method || "")}` : message.kind;
        target.write(`${JSON.stringify({ type: "delivery_ack", delivery_id: message.delivery_id, host_instance_id: message.host_instance_id, sequence: message.sequence, payload_hash: message.payload_hash })}\n`);
      }
      if (message.type === "handoff_response" && message.request_id.startsWith("continuity-status-")) {
        targetSnapshot = message.snapshot;
        diagnosticState.status_responses = Number(diagnosticState.status_responses) + 1;
        diagnosticState.snapshot = targetSnapshot;
      }
    }
    clearInterval(statusTimer);
    diagnosticState.phase = "target_drained";
    assert.equal(targetSnapshot.host_instance_id, sourceSnapshot.host_instance_id);
    assert.equal(targetSnapshot.app_server_pid, sourceSnapshot.app_server_pid);
    assert.equal(targetSnapshot.app_server_started_at, sourceSnapshot.app_server_started_at);
    target.write(`${JSON.stringify({ type: "complete_handoff", request_id: "continuity-complete", update_id: updateId })}\n`);
    diagnosticState.phase = "handoff_completing";
    while (true) {
      const message = await targetNext();
      diagnosticState.last_message = message.type;
      if (message.type === "handoff_response" && message.request_id === "continuity-complete") { assert.equal(message.ok, true); break; }
      if (message.type === "poll_request") target.write(`${JSON.stringify({ type: "poll_response", request_id: message.request_id, result: { leader: true, acquired: true, expires_at: new Date(Date.now() + 10_000).toISOString(), previous_relay_id: null, command: null, thread_ids: [threadId], active_turns: [] } })}\n`);
    }
    target.write(`${JSON.stringify({ type: "shutdown", token })}\n`);
    diagnosticState.phase = "host_stopping";
    await Promise.race([once(host, "exit"), new Promise((_, reject) => setTimeout(() => reject(new Error("session_host_stop_timeout")), 5000))]);
    diagnosticState.phase = "complete";
  } finally {
    clearTimeout(diagnosticTimer);
    source?.destroy();
    target?.destroy();
    if (host.exitCode === null) host.kill("SIGTERM");
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("mockup thread imports stay inside mockup issue routing", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-mockup-gateway-test-"));
  const port = await availablePort();
  const token = "mockup-gateway-test-token";
  const threadId = "019fec06-788f-7af3-a031-76b546904f77";
  const gateway = startGateway(home, port, token, true);
  const request = async (path: string, options: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  try {
    await waitForGateway(port, gateway);
    for (const path of ["/web", "/api/relay/status", "/api/remote-access/status", "/api/session-relay/poll", "/api/sync/status", "/api/update"]) {
      const response = await request(path, path.endsWith("/poll") ? { method: "POST", body: "{}" } : {});
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "mockup_action_not_supported" });
    }
    const bootstrap = await (await request("/api/bootstrap")).json() as { projects: Array<{ id: string }> };
    const missing = await request(`/api/issues/from-thread?thread_id=${threadId}`);
    assert.equal(missing.status, 404);
    const createdResponse = await request("/api/issues/from-thread", {
      method: "POST",
      body: JSON.stringify({ project_id: bootstrap.projects[0].id, title: "Mockup native chat", thread_id: threadId }),
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as { id: string; thread_id: string; session_owned: boolean };
    assert.match(created.id, /^mockup-/);
    assert.equal(created.thread_id, threadId);
    assert.equal(created.session_owned, true);
    const resolved = await request(`/api/issues/from-thread?thread_id=${threadId}`);
    assert.equal(resolved.status, 200);
    assert.equal(((await resolved.json()) as { id: string }).id, created.id);
    const opened = await request(`/api/issues/${created.id}`);
    assert.equal(opened.status, 200);
  } finally {
    await stopGateway(gateway);
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("active mockup injection lease does not pause production issue dispatch", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-mockup-isolation-test-"));
  const port = await availablePort();
  const token = "mockup-isolation-test-token";
  const gateway = startGateway(home, port, token);
  const request = async (path: string, options: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  try {
    await waitForGateway(port, gateway);
    const runtimeBefore = JSON.parse(readFileSync(join(home, "run", "runtime.json"), "utf8")) as { instanceId: string; generation: number; pid: number };
    writeFileSync(join(home, "run", "mockup-session.json"), JSON.stringify({ pid: process.pid, token: "active-mockup", mockup_home: join(home, "mockup"), restore_injection: true, started_at: new Date().toISOString() }));
    const projectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Production while mockup runs", workspace_path: home }) });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json() as { id: string };
    const issueResponse = await request("/api/issues", {
      method: "POST",
      body: JSON.stringify({ project_id: project.id, title: "Production dispatch", description: "Keep production dispatch active", status: "todo", agent_enabled: true, workspace_path: home }),
    });
    assert.equal(issueResponse.status, 201);
    const issue = await issueResponse.json() as { id: string; version: number };
    const startResponse = await request(`/api/issues/${issue.id}/start`, { method: "POST", body: JSON.stringify({ version: issue.version }) });
    assert.equal(startResponse.status, 202);
    const started = await startResponse.json() as { active_run_status: string };
    assert.equal(started.active_run_status, "claimed");
    const store = new Store(join(home, "better-codex.db"));
    try {
      const command = store.getActiveSessionCommand(issue.id);
      assert.equal(command?.kind, "start");
      assert.equal(command?.status, "pending");
    } finally {
      store.close();
    }
    const runtimeAfter = JSON.parse(readFileSync(join(home, "run", "runtime.json"), "utf8")) as { instanceId: string; generation: number; pid: number };
    assert.deepEqual(runtimeAfter, runtimeBefore);
  } finally {
    await stopGateway(gateway);
    rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
