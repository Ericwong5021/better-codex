import { expect, test } from "@playwright/test";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";

let runtime: RuntimeFixture;
test.beforeAll(async () => { runtime = await startRuntimeFixture(); });
test.afterAll(async () => { await runtime?.stop(); });

for (const locale of ["zh-CN", "en-US"]) {
  test(`settings omit Dot configuration in ${locale}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ locale });
    try {
      const page = await context.newPage();
      await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
      await page.locator(".better-codex-auto-dispatch-help").click();
      const dialog = page.locator("#better-codex-auto-dispatch-help-dialog");
      await expect(dialog.locator('[data-help-view="dots"], [data-help-page="dots"], [data-dots-setup]')).toHaveCount(0);
      await dialog.locator('[data-help-view="settings"]').click();
      await expect(dialog.locator('[data-help-page="settings"]')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("settings-without-dot.png") });
      await page.keyboard.press("Escape");
      await page.locator(".better-codex-auto-dispatch-help").click();
      await expect(dialog.locator('[data-help-view="dots"], [data-help-page="dots"], [data-dots-setup]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}
