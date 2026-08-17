import { expect, test, type Browser, type Page } from "@playwright/test";
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
  const { context, page } = await openAuthenticatedPage(browser, {
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#better-codex-entry")).toContainText("Task board");
  await page.setViewportSize({ width: 900, height: 700 });
  await page.locator("#web-theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".web-sidebar")).toBeVisible();
  await page.locator("#better-codex-agents-entry").click();
  await expect(page.locator(".better-codex-agent-directory")).toBeVisible();
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#better-codex-board")).toBeVisible();
  await page.locator(".better-codex-create-primary").click();
  await expect(page.locator("#better-codex-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#better-codex-dialog")).toHaveCount(0);
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
