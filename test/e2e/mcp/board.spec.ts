import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let runtime: RuntimeFixture;
let child: ChildProcess;
let sequence = 0;
let mcpHtml = "";
let stderr = "";
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
const calls: any[] = [];
let startRuntimeAction = async () => { await runtime.resume(); };
function call(method: string, params = {}) {
  const id = ++sequence;
  return new Promise<any>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

test.beforeAll(async () => {
  runtime = await startRuntimeFixture();
  child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
    import {startMcpAppServer} from "./src/mcp-app.ts";
    let sequence = 0;
    const pending = new Map();
    process.on("message", message => {
      if (message?.type !== "fixture-start-result") return;
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error)); else request.resolve({ ready: true });
    });
    const startRuntime = () => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error("fixture_start_timeout")); }, 20000);
      pending.set(id, { resolve, reject, timer });
      process.send({ type: "fixture-start", id });
    });
    await startMcpAppServer({ensureRuntime:async()=>{}, startRuntime});
    process.disconnect();
  `], {
    cwd: process.cwd(), env: { ...process.env, BETTER_CODEX_HOME: runtime.workspacePath, BETTER_CODEX_DB: runtime.databasePath, BETTER_CODEX_TOKEN: runtime.token, CODEX_HOME: join(runtime.workspacePath, "codex") }, stdio: ["pipe", "pipe", "pipe", "ipc"],
  });
  child.on("message", async (message: any) => {
    if (message?.type !== "fixture-start") return;
    let error: string | undefined;
    try { await startRuntimeAction(); } catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
    if (child.connected) child.send({ type: "fixture-start-result", id: message.id, ...(error ? { error } : {}) });
  });
  child.stderr!.on("data", chunk => { stderr += String(chunk); });
  createInterface({ input: child.stdout! }).on("line", line => {
    const reply = JSON.parse(line);
    const item = pending.get(reply.id);
    if (!item) return;
    pending.delete(reply.id);
    if (reply.error) item.reject(new Error(reply.error.message)); else item.resolve(reply.result);
  });
  child.on("exit", () => { for (const item of pending.values()) item.reject(new Error("mcp_fixture_exited: " + stderr)); pending.clear(); });
  await call("initialize", { protocolVersion: "2026-01-26", capabilities: {}, clientInfo: {name:"fixture",version:"1"} });
  child.stdin!.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"}) + "\n");
  const resource = await call("resources/read", { uri: "ui://better-codex/board.html" });
  mcpHtml = resource.contents[0].text;
  expect(mcpHtml).not.toContain(runtime.token);
});

test.afterAll(async () => {
  child?.kill("SIGTERM");
  await runtime?.stop();
});

async function openPlugin(page: Page, options: { textMessages?: boolean } = {}) {
  calls.length = 0;
  const entry = await call("tools/call", { name: "board", arguments: {} });
  await page.exposeFunction("mcpFixtureCall", async (message: any) => {
    calls.push(message);
    return await call(message.method, message.params);
  });
  await page.exposeFunction("mcpFixtureMessage", async (message: any) => {
    calls.push(message);
    return { isError: true };
  });
  const hostCapabilities = { serverTools: {}, ...(options.textMessages ? { message: { text: {} } } : {}) };
  await page.route("http://mcp-host.test/**", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><iframe id="app" src="http://mcp-app.test/board" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" style="border:0;width:100vw;height:100vh"></iframe><script>const frame=document.getElementById('app');window.addEventListener('message',async event=>{if(event.source!==frame.contentWindow||event.data?.jsonrpc!=='2.0')return;const message=event.data;if(message.id===undefined)return;let result;if(message.method==='ui/initialize'){result={protocolVersion:'2026-01-26',hostCapabilities:${JSON.stringify(hostCapabilities)},hostContext:{theme:'light'}};}else if(message.method==='ui/message'){result=await window.mcpFixtureMessage(message);}else{result=await window.mcpFixtureCall(message);}frame.contentWindow.postMessage({jsonrpc:'2.0',id:message.id,result},'*');if(message.method==='ui/initialize')frame.contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:${JSON.stringify(entry)}},'*');});</script></body></html>` }));
  await page.route("http://mcp-app.test/**", route => route.fulfill({ contentType: "text/html; charset=utf-8", headers: { "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src data:; media-src data:;" }, body: mcpHtml }));
  await page.goto("http://mcp-host.test/");
  const frame = page.frameLocator("#app");
  await expect(frame.locator("#better-codex-board")).toBeVisible();
  return frame;
}

for (const textMessages of [true, false]) {
  test(`Dot settings stay unavailable with host message capability ${textMessages}`, async ({ page }) => {
    const frame = await openPlugin(page, { textMessages });
    await frame.locator(".better-codex-auto-dispatch-help").click();
    const settings = frame.locator("#better-codex-auto-dispatch-help-dialog");
    await expect(settings.locator('[data-help-view="dots"], [data-help-page="dots"], [data-dots-setup]')).toHaveCount(0);
    await settings.locator('[data-help-view="settings"]').click();
    await expect(settings.locator('[data-help-page="settings"]')).toBeVisible();
    expect(calls.filter(message => message.method === "ui/message")).toHaveLength(0);
  });
}

async function createSeedIssue(title: string) {
  const headers = { authorization: "Bearer " + runtime.token, "content-type": "application/json" };
  const projects = await fetch(runtime.baseUrl + "/api/projects", { headers }).then(response => response.json()) as any[];
  let project = projects[0];
  if (!project) {
    const created = await fetch(runtime.baseUrl + "/api/projects", { method: "POST", headers, body: JSON.stringify({ name: "插件验证项目", workspace_path: runtime.workspacePath }) });
    expect(created.ok).toBe(true);
    project = await created.json();
  }
  const response = await fetch(runtime.baseUrl + "/api/issues", { method: "POST", headers, body: JSON.stringify({ project_id: project.id, title, description: "验证实时更新及持久化", status: "todo" }) });
  expect(response.ok).toBe(true);
  return await response.json();
}

test("sandboxed MCP page manages persistent tasks and shows live Runtime changes", async ({ page }) => {
  const frame = await openPlugin(page);
  await expect(frame.locator(".better-codex-column")).toHaveCount(7);
  await frame.locator(".better-codex-create-primary").click();
  const editor = frame.locator("#better-codex-dialog");
  await editor.locator("[data-dialog-switch]").click();
  await editor.locator('[name="title"]').fill("插件任务测试");
  await editor.locator('[name="description"]').fill("MCP 隔离页面写入同一个本地 Runtime");
  await editor.locator(".better-codex-submit").click();
  const card = frame.locator('[data-issue-id]:has(.better-codex-card-title:text-is("插件任务测试"))');
  await expect(card).toBeVisible();
  await expect(card).not.toHaveClass(/is-remote-pending/);
  await card.click();
  await editor.locator('[name="title"]').fill("插件任务已编辑");
  await editor.locator(".better-codex-submit").click();
  await expect(frame.getByText("插件任务已编辑", { exact: true })).toBeVisible();
  const persisted = await fetch(runtime.baseUrl + "/api/issues", { headers: { authorization: "Bearer " + runtime.token } }).then(response => response.json()) as any[];
  expect(persisted.some(issue => issue.title === "插件任务已编辑")).toBe(true);
  await createSeedIssue("另一窗口的任务");
  await expect(frame.getByText("另一窗口的任务", { exact: true })).toBeVisible();
  expect(calls.some(message => message.params?.name === "runtime_command" && message.params.arguments.commandId)).toBe(true);
  expect(calls.some(message => message.params?.name === "sidebar")).toBe(false);
  await page.screenshot({ path: "test-results/mcp-plugin-board.png" });
});

test("full app navigation, settings and reload stay inside the plugin", async ({ page }) => {
  await createSeedIssue("刷新后保留的任务");
  const frame = await openPlugin(page);
  await frame.locator("#better-codex-agents-entry").click();
  await expect(frame.locator("#better-codex-agents")).toBeVisible();
  await frame.locator("#better-codex-projects-entry").click();
  await expect(frame.locator("#better-codex-projects")).toBeVisible();
  await frame.locator("#better-codex-entry").click();
  await expect(frame.locator("#better-codex-board")).toBeVisible();
  await frame.locator(".better-codex-auto-dispatch-help").click();
  const settings = frame.locator("#better-codex-auto-dispatch-help-dialog");
  await settings.locator('[data-help-view="settings"]').click();
  await expect(settings.locator('[data-help-page="settings"]')).toBeVisible();
  await settings.locator('[data-help-view="remote"]').click();
  await expect(settings.locator('[data-help-page="remote"]')).toBeVisible();
  await settings.locator('[data-help-close]').click();
  await expect(page).toHaveURL("http://mcp-host.test/");
  await expect(frame.locator("#web-connect")).not.toBeVisible();
  await page.reload();
  await expect(frame.locator("#better-codex-board")).toBeVisible();
  await expect(frame.getByText("刷新后保留的任务", { exact: true })).toBeVisible();
});

test("plugin event transport reconnects after the Runtime restarts", async ({ page }) => {
  const frame = await openPlugin(page);
  await runtime.restart();
  await createSeedIssue("服务重启后同步的任务");
  await expect(frame.getByText("服务重启后同步的任务", { exact: true })).toBeVisible();
  expect(stderr).not.toContain("unexpected_sidebar_activation");
});

test("a stopped Runtime starts from the plugin recovery button and preserves tasks", async ({ page }) => {
  const issue = await createSeedIssue("一键启动后保留的任务");
  const frame = await openPlugin(page);
  await expect(frame.getByText(issue.title, { exact: true })).toBeVisible();
  let releaseStart!: () => void;
  const startGate = new Promise<void>(resolve => { releaseStart = resolve; });
  startRuntimeAction = async () => { await startGate; await runtime.resume(); };
  try {
    await runtime.pause();
    const recovery = frame.locator("#better-codex-recovery");
    const startButton = recovery.getByRole("button", { name: "启动并重连", exact: true });
    await expect(recovery).toBeVisible();
    await expect(recovery.getByRole("heading", { name: "Better Codex 服务未连接", exact: true })).toBeVisible();
    await expect(startButton).toBeEnabled();
    await page.screenshot({ path: "test-results/mcp-runtime-stopped-recovery.png" });
    await expect(recovery).toBeVisible();
    await startButton.click();
    const busyButton = recovery.getByRole("button", { name: "正在启动并连接…", exact: true });
    await expect(busyButton).toBeDisabled();
    await expect(recovery.locator("[data-recovery-status]")).toHaveText("正在启动并连接…");
    expect(calls.filter(message => message.params?.name === "runtime_start")).toHaveLength(1);
    expect(calls.find(message => message.params?.name === "runtime_start").params.arguments).toEqual({});
    await page.screenshot({ path: "test-results/mcp-runtime-starting.png" });
    releaseStart();
    await expect(recovery).toBeHidden();
    await expect(frame.getByText(issue.title, { exact: true })).toBeVisible();
    const persisted = await fetch(runtime.baseUrl + "/api/issues/" + issue.id, { headers: { authorization: "Bearer " + runtime.token } }).then(response => response.json());
    expect(persisted.id).toBe(issue.id);
    expect(persisted.title).toBe(issue.title);
    await page.screenshot({ path: "test-results/mcp-runtime-started-reconnected.png" });
  } finally {
    releaseStart();
    startRuntimeAction = async () => { await runtime.resume(); };
    await runtime.resume();
  }
});

test("a failed plugin startup stays visible and can be retried", async ({ page }) => {
  const issue = await createSeedIssue("启动失败重试后保留的任务");
  const frame = await openPlugin(page);
  startRuntimeAction = async () => { throw new Error("fixture_start_failed"); };
  try {
    await runtime.pause();
    const recovery = frame.locator("#better-codex-recovery");
    const startButton = recovery.getByRole("button", { name: "启动并重连", exact: true });
    await expect(recovery).toBeVisible();
    await startButton.click();
    await expect(recovery.locator("[data-recovery-status]")).toHaveText("启动未完成，请重试或使用手动启动。");
    await expect(recovery).toBeVisible();
    await expect(startButton).toBeEnabled();
    await expect(recovery.locator("[data-recovery-error]")).toHaveText("fixture_start_failed");
    await page.screenshot({ path: "test-results/mcp-runtime-start-failed.png" });
    startRuntimeAction = async () => { await runtime.resume(); };
    await startButton.click();
    await expect(recovery).toBeHidden();
    await expect(frame.getByText(issue.title, { exact: true })).toBeVisible();
    expect(calls.filter(message => message.params?.name === "runtime_start")).toHaveLength(2);
  } finally {
    startRuntimeAction = async () => { await runtime.resume(); };
    await runtime.resume();
  }
});

test("plugin uploads files and restores image previews through the real Runtime", async ({ page }) => {
  const frame = await openPlugin(page);
  await frame.locator(".better-codex-create-primary").click();
  const editor = frame.locator("#better-codex-dialog");
  const chooserPromise = page.waitForEvent("filechooser");
  await editor.locator("[data-dialog-attach]").click();
  const chooser = await chooserPromise;
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==";
  await chooser.setFiles([
    { name: "requirements.txt", mimeType: "text/plain", buffer: Buffer.from("MCP attachment test") },
    { name: "preview.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") },
  ]);
  await expect(editor.locator(".better-codex-attachment-chip")).toHaveCount(2);
  await expect(editor.locator(".better-codex-attachment-preview")).toHaveAttribute("src", /^data:image\/png;base64,/);
  await editor.locator("[data-dialog-close]").click();
  await frame.locator(".better-codex-create-primary").click();
  await expect(editor.locator(".better-codex-attachment-chip")).toHaveCount(2);
  await editor.locator('[data-dialog-preview][aria-label*="preview.png"]').click();
  await expect(frame.locator("#better-codex-attachment-dialog img")).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect(frame.locator("#better-codex-attachment-title")).toHaveText("preview.png");
  expect(calls.some(message => message.params?.name === "runtime_command" && message.params.arguments.path.startsWith("/api/issues/attachments"))).toBe(true);
});
