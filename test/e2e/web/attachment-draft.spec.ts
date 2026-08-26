import { expect, test, type Browser } from "@playwright/test";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let runtime: RuntimeFixture;

async function openAuthenticatedPage(browser: Browser) {
  const context = await browser.newContext({ locale: "zh-CN" });
  const page = await context.newPage();
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await expect(page.locator("#better-codex-panel")).toBeVisible();
  return { context, page };
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

test("restores image attachment preview after closing and reopening a create draft", async ({ browser }) => {
  test.setTimeout(120_000);
  const { context, page } = await openAuthenticatedPage(browser);
  await page.locator(".better-codex-create-primary").click();
  await page.locator("#better-codex-dialog form").evaluate(form => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="), character => character.charCodeAt(0));
    const file = new File([bytes], "draft-preview.png", { type: "image/png" });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    form.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }));
  });
  const previewTrigger = page.locator('[data-dialog-preview][aria-label*="draft-preview.png"]');
  await expect(previewTrigger).toBeVisible();
  await page.locator("#better-codex-dialog [data-dialog-close]").click();
  await expect(page.locator("#better-codex-dialog")).toHaveCount(0);

  await page.locator(".better-codex-create-primary").click();
  await expect(previewTrigger).toBeVisible();
  await previewTrigger.click();
  await expect(page.locator("#better-codex-attachment-dialog img")).toBeVisible();
  await expect(page.locator("#better-codex-attachment-title")).toHaveText("draft-preview.png");
  await context.close();
});
