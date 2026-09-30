import { expect, test } from "@playwright/test";
import { buildSync } from "esbuild";

const ownershipBundle = buildSync({
  entryPoints: ["src/ui/core/ownership.ts"],
  bundle: true,
  write: false,
  format: "iife",
  globalName: "TestOwnership",
  platform: "browser",
}).outputFiles[0].text;

test("moving a mounted component preserves it; removing it disposes it once", async ({ page }) => {
  await page.setContent('<main><div id="old-surface"></div><div id="new-surface"></div></main>');
  await page.addScriptTag({ content: ownershipBundle });
  await page.evaluate(() => {
    const scope = window as any;
    const panel = document.createElement("section");
    panel.id = "moving-panel";
    const button = document.createElement("button");
    button.dataset.bcComponent = "button";
    button.textContent = "创建任务";
    panel.append(button);
    document.querySelector("#old-surface")!.append(panel);
    scope.destroyCalls = 0;
    scope.pressCalls = 0;
    button.onclick = () => { scope.pressCalls += 1; };
    scope.TestOwnership.registerOwnedComponent(button, {
      element: button,
      update() {},
      destroy() { scope.destroyCalls += 1; button.remove(); },
    });
    new MutationObserver(scope.TestOwnership.destroyRemovedComponents).observe(document.querySelector("main")!, { childList: true, subtree: true });
    document.querySelector("#new-surface")!.append(panel);
  });
  await expect(page.getByRole("button", { name: "创建任务" })).toBeVisible();
  await page.getByRole("button", { name: "创建任务" }).click();
  expect(await page.evaluate(() => ({ destroyed: (window as any).destroyCalls, pressed: (window as any).pressCalls }))).toEqual({ destroyed: 0, pressed: 1 });
  await page.locator("#moving-panel").evaluate(panel => panel.remove());
  await expect.poll(() => page.evaluate(() => (window as any).destroyCalls)).toBe(1);
});
