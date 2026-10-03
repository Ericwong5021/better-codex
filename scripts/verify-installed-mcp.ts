/** Explicit installed-host acceptance. No inference, no native-session takeover. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { McpRuntimeClient } from "../src/mcp-runtime-client.js";

const { values } = parseArgs({ options: { "allow-installed": { type: "boolean" }, "task-id": { type: "string" }, "parent-thread-id": { type: "string" }, "evidence-dir": { type: "string" }, "require-avatar-sha256": { type: "string" } } });
if (!values["allow-installed"] || !values["task-id"] || !values["evidence-dir"]) throw new Error("Explicit --allow-installed, --task-id and --evidence-dir required");
const evidenceDir = resolve(values["evidence-dir"]); mkdirSync(evidenceDir, { recursive: true });
const child = spawn("codex", ["app-server"], { cwd: process.cwd(), env: process.env, stdio: ["pipe", "pipe", "pipe"] });
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const serverRequests: string[] = [];
const notices: string[] = [];
let counter = 0;
const lines = createInterface({ input: child.stdout });
lines.on("line", line => {
  let message: any; try { message = JSON.parse(line); } catch { return; }
  if (message.method && message.id !== undefined) {
    serverRequests.push(message.method);
    child.stdin.write(JSON.stringify({ id: message.id, error: { code: -32603, message: "Unexpected approval/elicitation in bounded installation check" } }) + "\n");
    return;
  }
  if (message.method) { notices.push(message.method); return; }
  const request = pending.get(message.id); if (!request) return;
  clearTimeout(request.timer); pending.delete(message.id);
  if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
});
child.stderr.on("data", () => {}); // Do not collect unrelated connector logging or personal configuration.
child.on("exit", code => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error(`acceptance_app_server_exit_${code}`)); } pending.clear(); });
const rpc = (method: string, params: unknown) => new Promise<any>((resolve, reject) => {
  const id = ++counter;
  pending.set(id, { resolve, reject, timer: setTimeout(() => { pending.delete(id); reject(new Error(`acceptance_timeout:${method}`)); }, 45_000) });
  child.stdin.write(JSON.stringify({ id, method, params }) + "\n");
});
function data(result: any) { assert.equal(result.isError === true, false, JSON.stringify(result.content)); return result.structuredContent; }
const client = new McpRuntimeClient();
const proof: any = { kind: "installed Codex 0.159.3 app-server host; not controlled MCP harness", inference_calls: 0, task_identity: "caller-declared current verification task; no automatic discovery", task_id: values["task-id"] };
try {
  const initial = await rpc("initialize", { clientInfo: { name: "better-codex-install-acceptance", version: "1.0.0" }, capabilities: { experimentalApi: true, explicitGatewayOauth: true } });
  child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
  proof.host = { userAgent: initial.userAgent };
  const thread = await rpc("thread/start", { cwd: process.cwd(), model: "gpt-6.1-sol", serviceTier: "default", ephemeral: true, sandbox: "read-only", approvalPolicy: "on-request" });
  proof.thread_configuration = { model: thread.model, serviceTier: thread.serviceTier, ephemeral: thread.thread?.ephemeral };
  assert.equal(thread.model, "gpt-6.1-sol"); assert.equal(thread.serviceTier, "default");
  const threadId = thread.thread.id;
  const inventory = await rpc("mcpServerStatus/list", { threadId, limit: 100, detail: "full" });
  const servers = inventory.data.filter((item: any) => /better.codex/i.test(item.name + " " + (item.pluginId || "")));
  proof.servers = servers.map((item: any) => ({ name: item.name, pluginId: item.pluginId, authStatus: item.authStatus, runtimeStatus: item.runtimeStatus, serverInfo: item.serverInfo, tools: Object.keys(item.tools), toolsError: item.toolsError }));
  const server = servers.find((item: any) => item.pluginId && Object.values(item.tools).some((tool: any) => tool.name === "external_observations_report"));
  assert.ok(server, "Installed portable plugin must expose report tool in real Codex host");
  const call = (tool: string, args: unknown = {}) => rpc("mcpServer/tool/call", { server: server.name, threadId, tool, arguments: args });
  if (values["require-avatar-sha256"]) {
    const bootstrap = data(await call("board_api_request", { path: "/api/bootstrap" })).data;
    const profile = bootstrap.task_creator_profiles?.find((item: any) => item.id === "dot-current");
    assert.ok(profile?.avatar?.startsWith("data:image/png;base64,"), "Installed host must receive the configured private avatar");
    const bytes = Buffer.from(profile.avatar.slice("data:image/png;base64,".length), "base64");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sha256, values["require-avatar-sha256"]);
    proof.avatar_profile = { local_profile_id: profile.id, name: profile.name, png_sha256: sha256, bytes: bytes.length, platform_verified: false };
  }
  const tasks = data(await call("tasks_list", {})); proof.task_query = { successful: true, count: tasks.tasks.length };
  const before = await client.listTasks();
  const existingReports = await client.listExternalObservations();
  const existing = existingReports.observations.find(item => item.thread_id === values["task-id"] && item.account_id === "declared-install-verification");
  const firstSequence = (existing?.sequence || 0) + 1;
  const report = { schema_version: 1, provider: "codex", account_id: "declared-install-verification", host_id: "local-codex-plugin",
    thread_id: values["task-id"], parent_thread_id: values["parent-thread-id"] || null, project_id: null, creator_name: "dot",
    title: "本次安装验证 · 主动上报", description: "当前委派任务验证已安装的本机插件；创建者仅为自报，不表示自动发现所有 dots 任务。",
    sequence: firstSequence, item_id: `installed-mcp-running-${firstSequence}`, reported_at: new Date().toISOString(), state: "running", message: "真实 Codex app-server 宿主已发现并调用本地插件，正在验证状态更新。" };
  const start = Date.now();
  const first = data(await call("external_observations_report", report));
  assert.equal(first.status, "applied"); assert.equal(first.observation.creator.verification, "unknown"); assert.equal(first.observation.creator.avatar, null);
  const duplicate = data(await call("external_observations_report", report)); assert.equal(duplicate.status, "duplicate");
  const board = data(await call("board", {}));
  assert.ok(board.external_observations.some((item: any) => item.id === first.id));
  const resource = await rpc("mcpServer/resource/read", { server: server.name, threadId, uri: "ui://better-codex/board.html" });
  proof.app_resource = { successful: true, contents: resource.contents?.map((item: any) => ({ uri: item.uri, mimeType: item.mimeType, bytes: item.text?.length || 0 })) };
  const completed = data(await call("external_observations_report", { ...report, sequence: firstSequence + 1, item_id: `installed-mcp-complete-${firstSequence + 1}`, reported_at: new Date().toISOString(), state: "completed", message: "本机插件安装与主动上报通路已通过。此为当前验证任务的完成声明，仍待人工验收。" }));
  assert.equal(completed.observation.task_result, "reported_complete"); assert.equal(completed.observation.acceptance_state, "unknown");
  const external = await client.listExternalObservations(); const own = external.observations.filter(item => item.id === first.id);
  assert.equal(own.length, 1); assert.equal(own[0].sequence, firstSequence + 1);
  const after = await client.listTasks(); assert.deepEqual(after, before);
  assert.equal(serverRequests.length, 0, `unexpected host authorization gate: ${serverRequests.join(",")}`);
  proof.report = { id: first.id, ingestion: first.status, duplicate: duplicate.status, sequence: firstSequence + 1, task_result: own[0].task_result, acceptance_state: own[0].acceptance_state, creator_verification: own[0].creator.verification, elapsed_ms: Date.now() - start, owned_tasks_unchanged: true };
  proof.notifications = [...new Set(notices)].filter(name => /mcp|thread\/started/.test(name)); proof.ok = true;
  writeFileSync(join(evidenceDir, "installed-host-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  proof.ok = false; proof.error = error instanceof Error ? error.message : String(error); proof.authorization_requests = serverRequests;
  writeFileSync(join(evidenceDir, "installed-host-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  throw error;
} finally {
  client.close(); lines.close(); child.stdin.end();
  if (child.exitCode === null) { const timer = setTimeout(() => child.kill("SIGTERM"), 1000); await new Promise<void>(resolve => child.once("exit", () => { clearTimeout(timer); resolve(); })); }
}
