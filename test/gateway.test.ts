import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import test from "node:test";
import { Store } from "../src/db.js";

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
    const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json() as { database: { schemaVersion: number } };
    assert.equal(health.database.schemaVersion, 4);

    const bootstrap = await (await request("/api/bootstrap")).json() as { projects: Array<{ external_id: string | null; created_at: string }>; agents: Array<{ id: string; name: string; is_default?: boolean }>; appearance: unknown };
    assert.equal(
      bootstrap.projects.find(project => project.external_id === "codex-source-project")?.created_at,
      new Date(codexProjectCreatedAt).toISOString(),
    );
    assert.deepEqual(bootstrap.appearance, {
      theme: "system",
      light: { accent: "#339cff", contrast: 45, ink: "#1a1c1f", surface: "#ffffff" },
      dark: { accent: "#007acc", contrast: 50, ink: "#d4d4d4", surface: "#1e1e1e" },
    });
    assert.deepEqual(bootstrap.agents[0], {
      id: "",
      role: "codex",
      name: "Codex",
      description: "",
      instructions: "使用 Codex 默认配置承接并执行 Better Codex Issue。",
      model: "默认模型",
      reasoning_effort: "默认推理等级",
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

    const projectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Gateway" }) });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json() as { id: string };
    const targetProjectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Gateway target" }) });
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
    const restoredLegacy = await restoredLegacyResponse.json() as { version: number; agent_enabled: boolean; session_owned: boolean; session_thread_id: string };
    assert.equal(restoredLegacy.version, legacyIssue.version);
    assert.equal(restoredLegacy.agent_enabled, legacyIssue.agent_enabled);
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
      session_owned: boolean;
      session_thread_id: string;
      run_thread_id: string;
    };
    assert.equal(importedIssue.thread_id, importedThreadId);
    assert.equal(importedIssue.agent_enabled, true);
    assert.equal(importedIssue.agent_id, null);
    assert.equal(importedIssue.needs_attention, false);
    assert.equal(importedIssue.pending_actor, "user");
    assert.equal(importedIssue.session_owned, true);
    assert.equal(importedIssue.session_thread_id, importedThreadId);
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

    const issueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify({ project_id: project.id, title: "Round trip" }) });
    assert.equal(issueResponse.status, 201);
    const issue = await issueResponse.json() as { id: string; version: number };
    const listedIssues = await (await request("/api/issues")).json() as Array<{ id: string; reply_status: string }>;
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
    const restoredResponse = await request(`/api/issues/${issue.id}`);
    assert.equal(restoredResponse.status, 200);
    const restored = await restoredResponse.json() as { status: string; project_id: string; thread_id: string | null };
    assert.equal(restored.status, "in_progress");
    assert.equal(restored.project_id, targetProject.id);
    assert.equal(restored.thread_id, null);
    const restoredAgents = await (await request("/api/agents")).json() as Array<{ id: string; avatar: string }>;
    assert.equal(restoredAgents.find(agent => agent.id === optionalAgent.id)?.avatar, "icon:reviewer");
  } finally {
    await stopGateway(gateway);
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
