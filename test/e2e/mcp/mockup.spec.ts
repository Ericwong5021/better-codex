import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let production: RuntimeFixture;
let child: ChildProcess;
let sequence = 0;
let html = "";
let stderr = "";
const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void }>();
const calls: any[] = [];
function call(method: string, params = {}) {
  const id = ++sequence;
  return new Promise<any>((resolve, reject) => { pending.set(id, { resolve, reject }); child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
}
test.beforeAll(async () => {
  production = await startRuntimeFixture();
  child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "mcp", "--mockup"], {
    cwd: process.cwd(), env: { ...process.env, BETTER_CODEX_HOME: production.workspacePath, BETTER_CODEX_DB: production.databasePath, BETTER_CODEX_TOKEN: production.token }, stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr!.on("data", chunk => { stderr += String(chunk); });
  createInterface({ input: child.stdout! }).on("line", line => {
    const reply = JSON.parse(line); const item = pending.get(reply.id); if (!item) return;
    pending.delete(reply.id); if (reply.error) item.reject(new Error(reply.error.message)); else item.resolve(reply.result);
  });
  child.on("exit", () => { for (const item of pending.values()) item.reject(new Error("mockup_fixture_exited: " + stderr)); pending.clear(); });
  await call("initialize", { protocolVersion: "2026-01-26", capabilities: {}, clientInfo: { name: "mockup-e2e", version: "1" } });
  child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  html = (await call("resources/read", { uri: "ui://better-codex-mockup/board.html" })).contents[0].text;
  expect(html).not.toContain(production.token);
});
test.afterAll(async () => {
  if (child?.exitCode === null && child.signalCode === null) await new Promise<void>(resolve => { child.once("exit", () => resolve()); child.kill("SIGTERM"); });
  await production?.stop();
});
async function openMockup(page: Page) {
  await page.exposeFunction("mockupFixtureCall", async (message: any) => { calls.push(message); return call(message.method, message.params); });
  await page.route("http://mockup-host.test/**", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body style="margin:0"><iframe id="app" src="http://mockup-app.test/board" sandbox="allow-scripts allow-same-origin allow-forms allow-downloads" style="border:0;width:100vw;height:100vh"></iframe><script>const frame=document.getElementById('app');window.addEventListener('message',async event=>{if(event.source!==frame.contentWindow||event.data?.jsonrpc!=='2.0'||event.data.id===undefined)return;const message=event.data;let result;if(message.method==='ui/initialize'){result={protocolVersion:'2026-01-26',hostCapabilities:{serverTools:{}},hostContext:{theme:'light'}};}else{result=await window.mockupFixtureCall(message);}frame.contentWindow.postMessage({jsonrpc:'2.0',id:message.id,result},'*');});</script></body></html>` }));
  await page.route("http://mockup-app.test/**", route => route.fulfill({ contentType: "text/html", headers: { "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src data:; media-src data:;" }, body: html }));
  await page.goto("http://mockup-host.test/");
  const frame = page.frameLocator("#app"); await expect(frame.locator("#better-codex-board")).toBeVisible();
  await expect(frame.locator("[data-better-codex-mockup]")).toBeVisible(); return frame;
}
async function settings(frame: ReturnType<Page["frameLocator"]>) {
  await frame.locator(".better-codex-auto-dispatch-help").click();
  const dialog = frame.locator("#better-codex-auto-dispatch-help-dialog"); await dialog.locator('[data-help-view="settings"]').click(); return dialog;
}

test("Mockup plugin retains bilingual task/agent/project UI and import/export/reset without touching production", async ({ page }) => {
  const before = readFileSync(production.databasePath);
  const frame = await openMockup(page);
  await expect(frame.locator(".better-codex-card").first()).toBeVisible();
  await frame.locator("#better-codex-agents-entry").click(); await expect(frame.locator("#better-codex-agents")).toBeVisible();
  await frame.locator("#better-codex-projects-entry").click(); await expect(frame.locator("#better-codex-projects")).toBeVisible();
  await frame.locator("#better-codex-entry").click();
  let dialog = await settings(frame);
  await dialog.locator('[data-language="en"]').click();
  dialog = frame.locator("#better-codex-auto-dispatch-help-dialog");
  await expect(dialog.locator('[data-language="en"]')).toHaveAttribute("aria-checked", "true");
  await dialog.locator("[data-mockup-menu-toggle]").click();
  const downloadPromise = page.waitForEvent("download"); await dialog.locator("[data-mockup-export]").click();
  const download = await downloadPromise; const path = await download.path(); expect(path).toBeTruthy();
  const state = JSON.parse(readFileSync(path!, "utf8")); expect(state.project.name).toBe("Better Codex Desktop");
  state.issues = [{...state.issues[0], title:"Imported from plugin"}];
  await dialog.locator("[data-mockup-import-input]").setInputFiles({name:"mockup.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(state))});
  await dialog.locator("[data-help-close]").click();
  await expect(frame.getByText("Imported from plugin",{exact:true})).toBeVisible();
  dialog = await settings(frame); await dialog.locator("[data-mockup-menu-toggle]").click(); await dialog.locator("[data-mockup-reset]").click();
  const confirm = frame.locator("#better-codex-confirm"); await expect(confirm).toBeVisible(); await confirm.getByRole("button",{name:"Reset",exact:true}).click();
  await dialog.locator("[data-help-close]").click(); await expect(frame.getByText("Imported from plugin",{exact:true})).toHaveCount(0);
  dialog = await settings(frame); await dialog.locator('[data-language="zh-CN"]').click();
  await expect(frame.locator('[data-language="zh-CN"]')).toHaveAttribute("aria-checked","true");
  expect(calls.some(call => call.params?.name === "mockup_command" && call.params.arguments.method === "PUT")).toBe(true);
  expect(calls.some(call => call.params?.name?.startsWith("runtime_") || call.params?.name === "board_launch")).toBe(false);
  expect(readFileSync(production.databasePath).equals(before)).toBe(true);
});
