/** Opt-in acceptance harness. Uses an isolated Runtime and browser, never an installed profile. */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { DatabaseSync } from "node:sqlite";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { chromium, expect } from "@playwright/test";
import { startRuntimeFixture } from "../test/e2e/fixtures/runtime.js";

const { values } = parseArgs({ options: {
  "task-id": { type: "string" }, "parent-thread-id": { type: "string" }, "evidence-dir": { type: "string" },
} });
if (!values["task-id"] || !values["evidence-dir"]) throw new Error("Provide --task-id and --evidence-dir; task identity is explicitly caller-declared.");
const evidenceDir = resolve(values["evidence-dir"]);
mkdirSync(evidenceDir, { recursive: true });
assert.ok(existsSync("dist/cli.js"), "Run npm run build first");
const runtime = await startRuntimeFixture({ mcpAllowReports: true });
const env = { ...Object.fromEntries(Object.entries(process.env).filter((item): item is [string, string] => item[1] !== undefined)),
  BETTER_CODEX_HOME: runtime.workspacePath, BETTER_CODEX_PEER_HOME: runtime.workspacePath,
  BETTER_CODEX_TOKEN: runtime.token, BETTER_CODEX_DISABLE_DELEGATION: "1", BETTER_CODEX_SCHEDULER: "",
  CODEX_HOME: join(runtime.workspacePath, "codex") };
const transport = new StdioClientTransport({ command: process.execPath, args: [resolve("dist/cli.js"), "mcp"], cwd: process.cwd(), env, stderr: "pipe" });
const client = new Client({ name: "better-codex-self-report-acceptance", version: "1.0.0" });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let appPage: Awaited<ReturnType<NonNullable<typeof browser>["newPage"]>> | undefined;
const notifications: number[] = [];
const requests: string[] = [];
const browserTools: Array<{ name: string; method: string; path: string }> = [];
const proof: Record<string, unknown> = { real_stdio: true, isolated_runtime: true, browser_host: "controlled MCP Apps harness; not live ChatGPT/Codex",
  task_identity: "caller-declared current delegated task; no platform creator verification", task_id: values["task-id"] };
function data(result: any): any { assert.equal(Boolean(result.isError), false, JSON.stringify(result.content)); return result.structuredContent; }
try {
  await client.connect(transport, { timeout: 15_000 });
  proof.server = client.getServerVersion();
  const projectResponse = await fetch(`${runtime.baseUrl}/api/projects/ensure`, { method: "POST",
    headers: { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" },
    body: JSON.stringify({ external_id: "mcp-local-acceptance", name: "MCP 本地验收", workspace_path: runtime.workspacePath }) });
  assert.equal(projectResponse.status, 200);
  const project = await projectResponse.json() as { id: string };
  const task = data(await client.callTool({ name: "tasks_create", arguments: {
    request_id: "local-mcp-acceptance-owned-001", project_id: project.id, title: "MCP 工具创建 · 未执行", description: "工具保存的 owned task；未分配智能体，也未创建执行线程。",
  } })).task;
  assert.equal(task.agent_enabled, false); assert.equal(task.thread_id, null);
  const report = { schema_version: 1, provider: "codex", account_id: "self-declared-local-poc", host_id: "durable-declared",
    thread_id: values["task-id"], parent_thread_id: values["parent-thread-id"] || null, project_id: project.id, creator_name: "dot",
    title: "本任务 · MCP 上报链路验证", description: "当前 dot 委派任务主动报告此集成验证步骤；创建者为自报，未自动发现远程任务。",
    sequence: 1, item_id: "mcp-real-local-start-001", reported_at: new Date().toISOString(), state: "running",
    message: "正在实测：编译后的标准 MCP stdio → 独立 Runtime → 现有看板与 MCP App。" };
  const first = data(await client.callTool({ name: "external_observations_report", arguments: report }));
  const observationId = first.id;
  assert.equal(first.observation.creator.verification, "unknown"); assert.equal(first.observation.creator.avatar, null);
  const initial = await client.callTool({ name: "board", arguments: {} }); data(initial);
  const resource = await client.readResource({ uri: "ui://better-codex/board.html" });
  const html = String(resource.contents[0].text);
  assert.match(html, /"bridgeToken":""/); assert.ok(!html.includes(runtime.token));
  browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: "zh-CN" });
  appPage = page;
  // tsx keeps function names in serialized callbacks; this helper belongs only to the controlled host harness.
  await page.addInitScript("window.__name = fn => fn;");
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  proof.browser_errors = browserErrors;
  await page.exposeFunction("mcpHarnessRequest", async (message: any) => {
    requests.push(message.method);
    if (message.method === "tools/call") {
      browserTools.push({ name: message.params.name, method: message.params.arguments.method || "GET", path: message.params.arguments.path });
      return await client.callTool(message.params);
    }
    if (message.method === "resources/subscribe") return await client.subscribeResource(message.params);
    if (message.method === "resources/unsubscribe") return await client.unsubscribeResource(message.params);
    if (message.method === "resources/read") return await client.readResource(message.params);
    return {};
  });
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, async notification => {
    notifications.push(Date.now());
    await page.evaluate(notification => document.querySelector("iframe")?.contentWindow?.postMessage({ jsonrpc: "2.0", ...notification }, "*"), notification).catch(() => {});
  });
  await page.route("http://mcp-local.test/**", route => route.fulfill({ contentType: "text/html",
    body: route.request().url().endsWith("/board") ? html : "<!doctype html><html><body style='margin:0'></body></html>" }));
  await page.goto("http://mcp-local.test/host");
  await page.evaluate(initial => {
    window.addEventListener("message", async event => {
      const message = event.data;
      if (!message?.jsonrpc || !event.source) return;
      const reply = (result: unknown) => (event.source as Window).postMessage({ jsonrpc: "2.0", id: message.id, result }, "*");
      if (message.method === "ui/initialize") reply({ protocolVersion: "2026-01-26", hostInfo: { name: "controlled-acceptance-host", version: "1.0.0" },
        hostCapabilities: { serverTools: {}, experimental: { "openai/resource": {} } }, hostContext: { theme: "light", locale: "zh-CN", displayMode: "inline" } });
      else if (message.method === "ui/notifications/initialized") (event.source as Window).postMessage({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: initial }, "*");
      else if (message.id !== undefined) {
        try { reply(await (window as any).mcpHarnessRequest(message)); }
        catch (error) { (event.source as Window).postMessage({ jsonrpc: "2.0", id: message.id, error: { code: -32603, message: String(error) } }, "*"); }
      }
    });
    const iframe = document.createElement("iframe"); iframe.src = "/board"; iframe.style.cssText = "width:100vw;height:100vh;border:0"; document.body.append(iframe);
  }, initial);
  const frame = page.frameLocator("iframe");
  const external = frame.locator(`[data-issue-id="${observationId}"]`);
  await expect(external).toBeVisible();
  await expect(frame.locator(`[data-issue-id="${task.id}"]`)).toBeVisible();
  await expect(frame.locator('[data-status="in_progress"]', { has: external })).toBeVisible();
  await expect(frame.locator(".better-codex-create-split")).toBeHidden();
  await expect.poll(() => requests.includes("resources/subscribe")).toBe(true);
  await page.screenshot({ path: join(evidenceDir, "mcp-real-running.png") });
  const startedAt = Date.now();
  const final = data(await client.callTool({ name: "external_observations_report", arguments: { ...report, sequence: 2, item_id: "mcp-real-local-complete-002",
    reported_at: new Date().toISOString(), state: "completed", message: "本项接入验证已完成：真实标准 MCP stdio 已连接；主动上报已持久化；同一看板可见 owned task 与独立观测卡。完成声明仍需人工验收。" } }));
  proof.report_roundtrip_ms = Date.now() - startedAt;
  assert.equal(final.observation.acceptance_state, "unknown");
  await expect(frame.locator('[data-status="in_review"]', { has: external })).toBeVisible();
  proof.report_to_mcp_app_visible_ms = Date.now() - startedAt;
  await expect(frame.locator('[data-status="done"] [data-issue-id^="external-"]')).toHaveCount(0);
  await page.screenshot({ path: join(evidenceDir, "mcp-real-completed.png") });
  await external.click();
  await expect(frame.locator(".better-codex-external-detail")).toContainText("尚未人工验收");
  await page.screenshot({ path: join(evidenceDir, "mcp-real-detail.png") });
  const webPage = await browser.newPage({ viewport: { width: 1440, height: 960 }, locale: "zh-CN" });
  await webPage.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await expect(webPage.locator(`[data-issue-id="${observationId}"]`)).toBeVisible();
  await expect(webPage.locator(`[data-issue-id="${task.id}"]`)).toBeVisible();
  await webPage.screenshot({ path: join(evidenceDir, "web-real-completed.png") });
  const duplicate = data(await client.callTool({ name: "external_observations_report", arguments: report }));
  assert.equal(duplicate.status, "duplicate");
  const detail = data(await client.callTool({ name: "external_observations_get", arguments: { id: observationId } }));
  assert.equal(detail.messages.length, 2); assert.equal(detail.observation.sequence, 2);
  const db = new DatabaseSync(runtime.databasePath, { readOnly: true });
  try { proof.database_counts = Object.fromEntries(["issues", "external_observations", "issue_sessions", "session_commands"].map(table => [table, Number(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n)])); }
  finally { db.close(); }
  assert.deepEqual(proof.database_counts, { issues: 1, external_observations: 1, issue_sessions: 0, session_commands: 0 });
  proof.resource_notifications = notifications.length; assert.ok(notifications.length >= 1);
  proof.browser_tool_calls = browserTools;
  proof.no_browser_mutations = browserTools.every(call => call.name === "board_api_request" && call.method === "GET");
  assert.equal(proof.no_browser_mutations, true);
  proof.creator = final.observation.creator; proof.acceptance_state = final.observation.acceptance_state;
  proof.result = "passed";
  writeFileSync(join(evidenceDir, "mcp-real-report-proof.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
} catch (error) {
  proof.result = "failed";
  proof.browser_tool_calls = browserTools;
  if (appPage) {
    await appPage.screenshot({ path: join(evidenceDir, "mcp-failure.png") }).catch(() => {});
    proof.browser_text = await appPage.frames()[1]?.evaluate(() => document.body.innerText).catch(() => "unavailable");
  }
  writeFileSync(join(evidenceDir, "mcp-failure-proof.json"), JSON.stringify(proof, null, 2));
  console.error(JSON.stringify(proof));
  throw error;
} finally {
  await browser?.close(); await client.close(); await transport.close(); await runtime.stop();
}
