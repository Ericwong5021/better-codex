import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import test from "node:test";

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

function startGateway(home: string, port: number, token: string) {
  return spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve"], {
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
