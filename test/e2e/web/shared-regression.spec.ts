import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let runtime: RuntimeFixture;

async function openAuthenticatedPage(browser: Browser, options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  return { context, page };
}

async function patchIssue(page: Page, id: string, version: number, title: string) {
  try {
    const value = await page.evaluate(async input => await (window as any).betterCodexHost.request({
      path: `/api/issues/${encodeURIComponent(input.id)}`,
      method: "PATCH",
      body: JSON.stringify({ version: input.version, title: input.title }),
    }), { id, version, title });
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

test.beforeAll(async () => {
  runtime = await startRuntimeFixture();
});

test.afterAll(async () => {
  await runtime?.stop();
});

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus && runtime) {
    await testInfo.attach("runtime.log", { body: runtime.output(), contentType: "text/plain" });
  }
});

test("synchronizes two browser contexts and rejects a stale write", async ({ browser }) => {
  const first = await openAuthenticatedPage(browser, { locale: "zh-CN" });
  const second = await openAuthenticatedPage(browser, { locale: "zh-CN" });
  const title = `双窗口同步 ${Date.now()}`;
  const project = await first.page.evaluate(async workspacePath => await (window as any).betterCodexHost.request({
    path: "/api/projects",
    method: "POST",
    body: JSON.stringify({ name: "Web E2E Project", workspace_path: workspacePath }),
  }), runtime.workspacePath);
  const issue = await first.page.evaluate(async input => await (window as any).betterCodexHost.request({
    path: "/api/issues",
    method: "POST",
    body: JSON.stringify({ project_id: input.projectId, title: input.title, description: "SSE live update", status: "todo" }),
  }), { projectId: project.id, title });

  const secondCard = second.page.locator(`[data-issue-id]:has(.better-codex-card-title:text-is("${title}"))`);
  await expect(secondCard).toBeVisible();
  await second.page.locator("#better-codex-search").fill("双窗口同步");
  await expect(secondCard).toBeVisible();
  await second.page.locator("#better-codex-search").fill("不存在的任务");
  await expect(secondCard).toHaveCount(0);
  await second.page.locator("#better-codex-search").fill("");
  await expect(secondCard).toBeVisible();
  const [left, right] = await Promise.all([
    patchIssue(first.page, issue.id, issue.version, `${title} A`),
    patchIssue(second.page, issue.id, issue.version, `${title} B`),
  ]);
  expect([left.ok, right.ok].filter(Boolean)).toHaveLength(1);
  expect([left, right].find(result => !result.ok)?.error).toContain("version_conflict");
  await expect(second.page.locator(`[data-issue-id="${issue.id}"]`)).toContainText(new RegExp(`${title} [AB]`));
  await first.context.close();
  await second.context.close();
});

test("supports English, dark theme, mobile viewport, and keyboard dismissal", async ({ browser }) => {
  test.setTimeout(60_000);
  const { context, page } = await openAuthenticatedPage(browser, {
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#better-codex-entry")).toContainText("Task board");
  await expect(page.locator("#better-codex-scheduled-entry")).toBeHidden();
  await page.locator("#better-codex-more-entry").click();
  await expect(page.locator("#better-codex-scheduled-mobile-entry")).toContainText("Scheduled");
  await page.locator("#better-codex-scheduled-mobile-entry").click();
  await expect(page.locator("#better-codex-panel")).toHaveAttribute("data-surface", "scheduled");
  await expect(page.locator("#better-codex-more-entry")).toHaveAttribute("aria-current", "page");
  await page.locator("#better-codex-entry").click();
  await page.locator("#better-codex-more-entry").click();
  await expect(page.locator("#better-codex-theme-entry")).toContainText("Switch to light theme");
  await page.locator("#better-codex-theme-entry").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.locator("#better-codex-more-entry").click();
  await page.locator("#better-codex-usage-entry").click();
  await expect(page.locator("#web-usage")).toBeVisible();
  await expect(page.locator("#web-usage-close")).toBeVisible();
  await page.locator("#web-usage-close").click();
  await expect(page.locator("#web-usage")).toBeHidden();
  await expect(page.locator(".web-sidebar")).toBeVisible();
  await page.locator("#better-codex-agents-entry").click();
  await expect(page.locator(".better-codex-agent-directory")).toBeVisible();
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#better-codex-board")).toBeVisible();
  await page.locator(".better-codex-create-primary").click();
  await expect(page.locator("#better-codex-dialog")).toBeVisible();
  const issueDialogStructure = await page.locator("#better-codex-dialog").evaluate(dialog => {
    const editor = dialog.querySelector<HTMLElement>(".better-codex-dialog-editor");
    const properties = dialog.querySelector<HTMLElement>(".better-codex-dialog-properties");
    if (!editor || !properties) throw new Error("issue_dialog_structure_missing");
    const dialogStyle = getComputedStyle(dialog);
    const editorStyle = getComputedStyle(editor);
    const propertiesStyle = getComputedStyle(properties);
    return {
      editorBorder: editorStyle.borderTopWidth,
      editorFont: editorStyle.fontFamily,
      editorResize: editorStyle.resize,
      propertiesDisplay: propertiesStyle.display,
      dialogFont: dialogStyle.fontFamily,
    };
  });
  expect(issueDialogStructure).toEqual({
    editorBorder: "0px",
    editorFont: issueDialogStructure.dialogFont,
    editorResize: "none",
    propertiesDisplay: "flex",
    dialogFont: issueDialogStructure.dialogFont,
  });
  await page.getByRole("button", { name: "Switch to manual" }).click();
  await expect(page.locator(".better-codex-manual-title")).toBeVisible();
  const manualDialogStructure = await page.locator("#better-codex-dialog").evaluate(dialog => {
    const title = dialog.querySelector<HTMLElement>(".better-codex-manual-title");
    const editor = dialog.querySelector<HTMLElement>(".better-codex-dialog-editor");
    if (!title || !editor) throw new Error("manual_dialog_structure_missing");
    const dialogStyle = getComputedStyle(dialog);
    const titleStyle = getComputedStyle(title);
    const editorStyle = getComputedStyle(editor);
    return {
      dialogFont: dialogStyle.fontFamily,
      editorBorder: editorStyle.borderTopWidth,
      editorFont: editorStyle.fontFamily,
      titleBorder: titleStyle.borderTopWidth,
      titleFont: titleStyle.fontFamily,
    };
  });
  expect(manualDialogStructure).toEqual({
    dialogFont: manualDialogStructure.dialogFont,
    editorBorder: "0px",
    editorFont: manualDialogStructure.dialogFont,
    titleBorder: "0px",
    titleFont: manualDialogStructure.dialogFont,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#better-codex-dialog")).toHaveCount(0);
  await page.locator("#better-codex-more-entry").click();
  await page.locator("#better-codex-projects-entry").click();
  await expect(page.locator("#better-codex-panel")).toHaveAttribute("data-surface", "projects");
  await page.locator(".better-codex-project-actions .better-codex-button").click();
  await expect(page.locator("#better-codex-project-dialog")).toBeVisible();
  const projectDialogStructure = await page.locator("#better-codex-project-dialog").evaluate(dialog => {
    const form = dialog.querySelector("form");
    const input = dialog.querySelector("input");
    if (!form || !input) throw new Error("project_dialog_structure_missing");
    const dialogStyle = getComputedStyle(dialog);
    const formStyle = getComputedStyle(form);
    const inputStyle = getComputedStyle(input);
    return {
      border: dialogStyle.borderTopWidth,
      dialogFont: dialogStyle.fontFamily,
      formPadding: formStyle.paddingTop,
      inputBorder: inputStyle.borderTopWidth,
      inputFont: inputStyle.fontFamily,
    };
  });
  expect(projectDialogStructure).toEqual({
    border: "0px",
    dialogFont: projectDialogStructure.dialogFont,
    formPadding: "24px",
    inputBorder: "0px",
    inputFont: projectDialogStructure.dialogFont,
  });
  await page.keyboard.press("Escape");
  await expect(page.locator("#better-codex-project-dialog")).toHaveCount(0);
  await context.close();
});

test("renders Codex turn failures as inline warnings without a Better Codex error report", async ({ browser }) => {
  const { context, page } = await openAuthenticatedPage(browser, { locale: "zh-CN" });
  const title = `模型调用失败 ${Date.now()}`;
  const project = await page.evaluate(async workspacePath => await (window as any).betterCodexHost.request({
    path: "/api/projects",
    method: "POST",
    body: JSON.stringify({ name: "Conversation warning project", workspace_path: workspacePath }),
  }), runtime.workspacePath);
  const issue = await page.evaluate(async input => await (window as any).betterCodexHost.request({
    path: "/api/issues",
    method: "POST",
    body: JSON.stringify({ project_id: input.projectId, title: input.title, status: "todo" }),
  }), { projectId: project.id, title });
  const timestamp = new Date().toISOString();
  const database = new DatabaseSync(runtime.databasePath);
  database.prepare("INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at) VALUES (?, 'local', ?, 'idle', '', '', ?, ?)").run(issue.id, randomUUID(), timestamp, timestamp);
  database.prepare("INSERT INTO issue_replies (issue_id, request_id, status, message, error, started_at, finished_at) VALUES (?, ?, 'failed', ?, ?, ?, ?)").run(issue.id, randomUUID(), "请继续完成任务", "Selected model is at capacity. Please try a different model.", timestamp, timestamp);
  database.close();
  await page.reload();
  await page.locator(`[data-issue-id]:has(.better-codex-card-title:text-is("${title}"))`).click();
  const feedback = page.locator("[data-conversation-feedback]");
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute("data-tone", "warning");
  await expect(feedback).toContainText("回复未完成");
  await expect(page.locator("#better-codex-error-dialog")).toHaveCount(0);
  await context.close();
});

test("preserves project planning scroll across live updates", async ({ browser }) => {
  const { context, page } = await openAuthenticatedPage(browser, { viewport: { width: 390, height: 844 } });
  const project = await page.evaluate(async workspacePath => await (window as any).betterCodexHost.request({
    path: "/api/projects",
    method: "POST",
    body: JSON.stringify({ name: "Planning scroll project", workspace_path: workspacePath }),
  }), runtime.workspacePath);
  const timestamp = new Date().toISOString();
  const item = (index: number) => ({ id: `milestone-${index}`, title: `里程碑 ${index}`, detail: "保持当前阅读位置", status: "confirmed", source: "user", target_date: null, dependencies: [], evidence: [] });
  const plan = { summary: "规划滚动位置回归", outcomes: [], milestones: Array.from({ length: 16 }, (_, index) => item(index + 1)), workstreams: [], risks: [], decisions: [], open_questions: [], delivery: [], evidence: [] };
  const database = new DatabaseSync(runtime.databasePath);
  database.prepare("INSERT INTO project_planning_sessions (project_id, thread_id, agent_id, status, last_error, created_at, updated_at) VALUES (?, NULL, NULL, 'ready', NULL, ?, ?)").run(project.id, timestamp, timestamp);
  database.prepare("INSERT INTO project_plan_revisions (id, project_id, revision, plan_json, source_message_id, created_at) VALUES (?, ?, 1, ?, ?, ?)").run(randomUUID(), project.id, JSON.stringify(plan), randomUUID(), timestamp);
  database.close();
  await page.goto(`${runtime.baseUrl}/web/projects/${encodeURIComponent(project.id)}#token=${encodeURIComponent(runtime.token)}`);
  await page.locator('.better-codex-project-dashboard-tabs [data-project-dashboard-view="planning"]').click();
  const planScroll = page.locator(".better-codex-project-plan-scroll");
  await expect(planScroll).toBeVisible();
  const previousScrollTop = await planScroll.evaluate(element => {
    element.scrollTop = Math.min(420, element.scrollHeight - element.clientHeight);
    return element.scrollTop;
  });
  expect(previousScrollTop).toBeGreaterThan(0);
  await page.evaluate(async projectId => await (window as any).betterCodexHost.request({
    path: "/api/issues",
    method: "POST",
    body: JSON.stringify({ project_id: projectId, title: "Trigger planning refresh", status: "blocked" }),
  }), project.id);
  await expect(page.locator(".better-codex-project-health")).toHaveAttribute("data-tone", "danger");
  await expect.poll(() => planScroll.evaluate(element => element.scrollTop)).toBe(previousScrollTop);
  await context.close();
});

test("recovers after a Runtime restart with a new Web session", async ({ page }) => {
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  const project = await page.evaluate(async workspacePath => await (window as any).betterCodexHost.request({
    path: "/api/projects",
    method: "POST",
    body: JSON.stringify({ name: "Notification restart project", workspace_path: workspacePath }),
  }), runtime.workspacePath);
  const issue = await page.evaluate(async projectId => await (window as any).betterCodexHost.request({
    path: "/api/issues",
    method: "POST",
    body: JSON.stringify({ project_id: projectId, title: "Runtime restart notification", status: "todo" }),
  }), project.id);
  await page.evaluate(cachedIssue => {
    const key = `${cachedIssue.id}:${cachedIssue.updated_at}:${cachedIssue.status}`;
    const profile = (window as any).__betterCodexInjection__?.profile || "stable";
    localStorage.setItem(`better-codex-completion-notices:${profile}`, JSON.stringify([{ key, issue: cachedIssue, createdAt: Date.now(), duration: 0 }]));
  }, issue);
  await page.reload();
  const notice = page.locator(".better-codex-completion-notice", { hasText: "Runtime restart notification" });
  await expect(notice).toBeVisible();
  await expect(notice.locator(".better-codex-completion-close")).toBeVisible();
  await notice.locator("[data-completion-menu-toggle]").click();
  await notice.locator("[data-completion-suppress]").click();
  await expect(notice).toBeVisible();
  await runtime.restart();
  await expect(page.locator("#web-connect")).toBeVisible({ timeout: 15_000 });
  await page.locator("#web-token").fill(runtime.token);
  await page.locator('#web-connect button[type="submit"]').click();
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  await expect(notice).toBeVisible();
  await notice.locator(".better-codex-completion-layout").click();
  await expect(page.locator("#better-codex-dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const profile = (window as any).__betterCodexInjection__?.profile || "stable";
    return localStorage.getItem(`better-codex-completion-notices:${profile}`);
  })).toBe("[]");
});
