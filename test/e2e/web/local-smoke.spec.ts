import { expect, test, type Locator, type Page } from "@playwright/test";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let runtime: RuntimeFixture;

async function dragCard(page: Page, source: Locator, target: Locator) {
  const sourceHandle = await source.elementHandle();
  if (!sourceHandle) throw new Error("drag_source_missing");
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await sourceHandle.dispatchEvent("dragstart", { dataTransfer });
  await target.dispatchEvent("dragover", { dataTransfer });
  await target.dispatchEvent("drop", { dataTransfer });
  await sourceHandle.dispatchEvent("dragend", { dataTransfer });
  await dataTransfer.dispose();
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

test("rejects an invalid token and accepts the local runtime token", async ({ page }) => {
  await page.goto(`${runtime.baseUrl}/web`);
  const connect = page.locator("#web-connect");
  await expect(connect).toBeVisible();
  await page.locator("#web-token").fill("invalid-token");
  await connect.locator('button[type="submit"]').click();
  await expect(page.locator("#web-connect-error")).toBeVisible();
  await page.locator("#web-token").fill(runtime.token);
  await connect.locator('button[type="submit"]').click();
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  await expect(page).toHaveURL(`${runtime.baseUrl}/web`);
});

test("creates, edits, moves, archives, and restores an issue", async ({ page }) => {
  test.setTimeout(90_000);
  const originalTitle = `Web 自动化 ${Date.now()}`;
  const editedTitle = `${originalTitle} 已编辑`;
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  await expect(page).toHaveURL(`${runtime.baseUrl}/web`);

  await page.locator(".better-codex-create-primary").click();
  const editor = page.locator("#better-codex-dialog");
  await expect(editor).toBeVisible();
  await expect(editor.locator("[data-dialog-expand]")).toHaveCount(0);
  await editor.locator('[name="prompt"]').fill("/");
  const semanticMenu = editor.locator("[data-semantic-menu]");
  await expect(semanticMenu).toBeVisible();
  const semanticMenuGeometry = await editor.evaluate(dialog => {
    const menu = dialog.querySelector<HTMLElement>("[data-semantic-menu]");
    const form = dialog.querySelector("form");
    if (!menu || !form) throw new Error("semantic_menu_geometry_missing");
    return {
      dialogBottom: dialog.getBoundingClientRect().bottom,
      dialogOverflow: getComputedStyle(dialog).overflow,
      formOverflow: getComputedStyle(form).overflow,
      menuBottom: menu.getBoundingClientRect().bottom,
    };
  });
  expect(semanticMenuGeometry.dialogOverflow).toBe("visible");
  expect(semanticMenuGeometry.formOverflow).toBe("visible");
  expect(semanticMenuGeometry.menuBottom).toBeGreaterThan(semanticMenuGeometry.dialogBottom);
  await editor.locator('[name="prompt"]').fill("");
  await expect(semanticMenu).toBeHidden();
  await editor.locator("[data-dialog-switch]").click();
  await expect(editor.locator("[data-dialog-expand]")).toBeVisible();
  await editor.locator('[name="title"]').fill(originalTitle);
  await editor.locator('[name="description"]').fill("通过 Playwright 在独立临时数据库中创建");
  await editor.locator(".better-codex-submit").click();

  const card = page.locator(`[data-issue-id]:has(.better-codex-card-title:text-is("${originalTitle}"))`);
  await expect(card).toHaveCount(1);
  await expect(card).toBeVisible();
  await expect(card).not.toHaveClass(/is-remote-pending/, { timeout: 60_000 });
  await card.click();
  await expect(editor).toBeVisible();
  await editor.locator('[name="title"]').fill(editedTitle);
  await editor.locator('[name="description"]').fill("编辑后的描述");
  await editor.locator('[data-dialog-select-toggle="status"]').click();
  await editor.locator('[data-dialog-select-option="status"][data-dialog-select-value="todo"]').click();
  await editor.locator('[data-dialog-select-toggle="priority"]').click();
  await editor.locator('[data-dialog-select-option="priority"][data-dialog-select-value="high"]').click();
  await editor.locator('[name="labels"]').fill("web-e2e, smoke");
  await editor.locator(".better-codex-submit").click();

  const editedCard = page.locator(`[data-issue-id]:has(.better-codex-card-title:text-is("${editedTitle}"))`);
  await expect(page.locator('.better-codex-column[data-status="todo"]', { has: editedCard })).toBeVisible();
  await expect(editedCard).toContainText("编辑后的描述");
  await expect(editedCard).toContainText("web-e2e");
  await expect(editedCard.locator('[data-priority="high"]')).toBeVisible();
  await dragCard(page, editedCard, page.locator('.better-codex-column[data-status="done"] .better-codex-cards'));
  await expect(page.locator('.better-codex-column[data-status="done"]', { has: editedCard })).toBeVisible();
  await dragCard(page, editedCard, page.locator('.better-codex-column[data-status="archive"]'));
  await expect(editedCard).toHaveCount(0);

  await page.locator("[data-archive-open]").click();
  const archive = page.locator("#better-codex-archive-dialog");
  await expect(archive).toBeVisible();
  await expect(archive.getByText(editedTitle, { exact: true })).toBeVisible();
  await archive.locator("[data-archive-restore]").click();
  await expect(archive.getByText(editedTitle, { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(archive).toHaveCount(0);
  const restoredCard = page.locator(`[data-issue-id]:has(.better-codex-card-title:text-is("${editedTitle}"))`);
  await expect(restoredCard).toBeVisible();
  await page.reload();
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  await expect(restoredCard).toBeVisible();
});
