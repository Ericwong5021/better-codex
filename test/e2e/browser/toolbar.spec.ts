import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { buildSync } from "esbuild";
import { writeFileSync } from "node:fs";
import { browserUiScript } from "../../../src/browser-ui.js";

// Build only in memory: UI verification must never refresh an installed UI.
const bundle = buildSync({
  entryPoints: ["src/ui/browser-entry.ts"], bundle: true, write: false,
  format: "iife", globalName: "BetterCodexUI", platform: "browser",
}).outputFiles[0].text;
const configuredInjection = browserUiScript(4317, "fixture-token", "en");
const install = configuredInjection.slice(configuredInjection.lastIndexOf("\nBetterCodexUI.install("));

async function openBoard(page: Page) {
  // This is a controlled host-style collision, not a recording of private native DOM.
  await page.route("http://toolbar.test/**", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><style>
    html,body{margin:0;height:100%;font-family:Arial,sans-serif;background:#fff}
    #native-chrome{position:fixed;inset:0 0 auto;height:35px;background:#f7f7f7}
    aside{position:fixed;left:0;top:35px;bottom:0;width:324px;background:#f7f7f7;z-index:50}
    aside button{display:block;border:0;background:transparent;padding:12px 20px;font:inherit}
    main{position:absolute;inset:0;height:100%;background:#fff}
    #native-main{left:324px;top:35px;height:calc(100% - 35px)}
    #surface,[data-app-shell-main-content-layout],.app-shell-main-content-frame{height:100%}
    @media(max-width:900px){aside{width:64px}aside button{padding:12px 4px;font-size:10px}#native-main{left:64px}}
  </style></head><body><div id="native-chrome"></div><aside data-app-action-sidebar-section><div><button data-sidebar-destination="tasks" aria-label="Tasks"><span>Tasks</span></button><button data-sidebar-destination="better-codex" aria-label="Better Codex"><span>Better Codex</span></button></div></aside><main id="native-main" data-better-codex-web-surface><div id="surface"><div data-app-shell-main-content-layout><div class="app-shell-main-content-frame native-frame-layout">Native content</div></div></div></main></body></html>` }));
  await page.goto("http://toolbar.test/fixture");
  await page.evaluate(() => {
    (window as any).fixtureIssues = [];
    (window as any).fixtureRequests = [];
    (window as any).fixtureIssueReads = 0;
    (window as any).betterCodexHost = {
      capabilities: { nativeThreads: false, codexSemantics: false }, subscribe: () => () => {},
      request: async ({ path, method }: { path: string; method?: string }) => {
        (window as any).fixtureRequests.push({ path, method: method || "GET" });
        const agents = [{ id: "codex", name: "Codex", is_default: true, avatar: "", model: "gpt-5.6-sol" }];
        if (path.startsWith("/api/bootstrap")) return { locale: "en", agents, projects: [], user: { id: "fixture", name: "Fixture" }, agentModelCatalog: [], agentReasoningEfforts: [], autoDispatch: false, schedulerModel: "gpt-6.1-sol", schedulerModelLocked: true };
        if (path.startsWith("/api/agents")) return agents;
        if (path.startsWith("/api/issues")) { (window as any).fixtureIssueReads++; return (window as any).fixtureIssues; }
        if (path.startsWith("/api/projects") || path.startsWith("/api/external-observations")) return [];
        if (path.startsWith("/api/update")) return { status: "current", supported: false };
        return {};
      },
    };
  });
  await page.evaluate(bundle + install);
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#better-codex-board .better-codex-column")).toHaveCount(7);
}

const columnStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"];

async function expectColumnControls(page: Page) {
  await expect(page.locator('#better-codex-board [data-add-status]')).toHaveCount(6);
  await expect(page.locator('#better-codex-board [data-archive-open]')).toHaveCount(1);
  for (const status of columnStatuses) {
    await expect(page.locator(`#better-codex-board [data-status="${status}"] [data-add-status="${status}"]`)).toBeVisible();
    await expect(page.locator(`#better-codex-board [data-status="${status}"] .better-codex-column-title > span:last-child`)).toHaveText(/^\d+$/);
  }
}

test("column controls survive repeated removal of the retained closed panel", async ({ page }) => {
  await page.setViewportSize({ width: 2558, height: 1320 });
  await openBoard(page);
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => {
      (window as any).__betterCodexUI__.close();
      document.getElementById("better-codex-panel")!.remove();
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => (window as any).__betterCodexUI__.open("issues"));
    await expectColumnControls(page);
  }
  for (const status of columnStatuses) {
    await page.locator(`#better-codex-board [data-add-status="${status}"]`).click();
    await expect(page.locator('#better-codex-dialog [name="prompt"]')).toBeVisible();
    // Agent creation intentionally hides status; manual mode exposes the
    // clicked column's initial selection without submitting a task.
    await page.locator('#better-codex-dialog').getByRole("button", { name: "Switch to manual" }).click();
    await expect(page.locator('#better-codex-dialog [name="status"]')).toHaveValue(status);
    await page.locator('#better-codex-dialog [data-dialog-close]').click();
    await expect(page.locator('#better-codex-dialog')).toHaveCount(0);
  }
  await page.locator('#better-codex-board [data-archive-open]').click();
  await expect(page.locator('#better-codex-archive-dialog')).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('#better-codex-archive-dialog')).toHaveCount(0);
  await expectColumnControls(page);
  expect(await page.evaluate(() => (window as any).fixtureRequests.filter((request: any) => request.method !== "GET"))).toEqual([]);
});

test("column controls survive background count changes and view filtering", async ({ page }) => {
  await page.setViewportSize({ width: 2558, height: 1320 });
  await openBoard(page);
  await expectColumnControls(page);
  const reads = await page.evaluate(() => (window as any).fixtureIssueReads);
  await page.evaluate(() => {
    (window as any).fixtureIssues = [{ id: "fixture-count-change", identifier: "FIXTURE-1", title: "Controlled count change", description: "", status: "todo", priority: "none", agent_enabled: false, user_assigned: false, labels: [], updated_at: new Date().toISOString() }];
  });
  // Allow the real background polling path to replace the changed header.
  await expect(page.locator('#better-codex-board [data-status="todo"] .better-codex-column-title > span:last-child')).toHaveText("1");
  expect(await page.evaluate(() => (window as any).fixtureIssueReads)).toBeGreaterThan(reads);
  await expectColumnControls(page);
  await page.locator('[data-view="assigned"]').click();
  await expect(page.locator('#better-codex-board [data-status="todo"] .better-codex-column-title > span:last-child')).toHaveText("0");
  await expectColumnControls(page);
  await page.locator('[data-view="all"]').click();
  await expect(page.locator('#better-codex-board [data-status="todo"] .better-codex-column-title > span:last-child')).toHaveText("1");
  await page.evaluate(() => { (window as any).fixtureIssues = []; });
  await expect(page.locator('#better-codex-board [data-status="todo"] .better-codex-column-title > span:last-child')).toHaveText("0");
  await expectColumnControls(page);
});

async function recordLayout(page: Page, info: TestInfo) {
  await page.screenshot({ path: info.outputPath("toolbar.png") });
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().toJSON();
    const tab = document.querySelector('[data-view="all"]')!;
    const box = tab.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    const controls = ['[data-view="all"]', '[data-view="assigned"]', '[data-view="unassigned"]', '#better-codex-search', '#better-codex-filter', '#better-codex-create-toggle'].map(selector => ({ selector, ...rect(selector) }));
    return { panel: rect("#better-codex-panel"), toolbar: rect(".better-codex-toolbar"), board: rect("#better-codex-board"), controls, tabReceivesPointer: tab.contains(hit), ready: (window as any).__betterCodexUI__.ready() };
  });
  writeFileSync(info.outputPath("toolbar-geometry.json"), JSON.stringify(geometry, null, 2));
  await info.attach("toolbar-geometry", { body: JSON.stringify(geometry, null, 2), contentType: "application/json" });
  return geometry;
}

for (const viewport of [{ width: 2048, height: 1057 }, { width: 1260, height: 800 }, { width: 1024, height: 768 }, { width: 800, height: 800 }, { width: 500, height: 800 }, { width: 360, height: 800 }]) {
  test(`toolbar survives reserved host space at ${viewport.width}px`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await openBoard(page);
    const geometry = await recordLayout(page, info);
    expect(geometry.board.top).toBeGreaterThanOrEqual(geometry.toolbar.bottom);
    if (viewport.width > 600) expect(geometry.tabReceivesPointer).toBe(true);
    expect(geometry.ready).toBe(true);
    for (const control of geometry.controls.filter(control => control.width > 0)) {
      expect(control.left, control.selector).toBeGreaterThanOrEqual(geometry.panel.left);
      expect(control.right, control.selector).toBeLessThanOrEqual(geometry.panel.right);
      expect(control.bottom, control.selector).toBeLessThanOrEqual(geometry.toolbar.bottom);
    }
    await expect(page.locator("#better-codex-panel")).not.toHaveClass(/native-frame-layout/);
    if (viewport.width > 600) {
      await page.locator('[data-view="assigned"]').click();
      await expect(page.locator('[data-view="assigned"]')).toHaveClass(/is-active/);
    }
    await page.locator("#better-codex-search").fill("fixture");
    await page.locator("#better-codex-filter").click();
    await expect(page.locator(".better-codex-filter-menu")).toBeVisible();
    await page.locator("#better-codex-filter").click();
    if (viewport.width > 600) {
      await page.locator("#better-codex-create-toggle").click();
      await expect(page.locator('[data-create-menu-toggle="true"]')).toHaveAttribute("aria-expanded", "true");
    } else {
      await page.locator(".better-codex-create-primary").click();
      await expect(page.locator("#better-codex-dialog")).toBeVisible();
    }
  });
}

test("ready detects a hidden or overlapping issue toolbar", async ({ page }) => {
  await openBoard(page);
  const states = await page.evaluate(() => {
    const injection = (window as any).__betterCodexUI__;
    const toolbar = document.querySelector<HTMLElement>(".better-codex-toolbar")!;
    const board = document.getElementById("better-codex-board")!;
    toolbar.hidden = true;
    const hidden = injection.ready();
    toolbar.hidden = false;
    board.style.cssText = "position:absolute;inset:0";
    const covered = injection.ready();
    board.style.cssText = "";
    return { hidden, covered, restored: injection.ready() };
  });
  expect(states).toEqual({ hidden: false, covered: false, restored: true });
});

test("menu stays interactive after replacing the host mount", async ({ page }) => {
  await openBoard(page);
  await page.evaluate(() => {
    const surface = document.querySelector("[data-better-codex-web-surface]")!;
    const replacement = surface.cloneNode(false) as HTMLElement;
    replacement.id = "next-surface";
    surface.replaceWith(replacement);

  });
  await expect(page.locator("#next-surface > #better-codex-panel")).toBeVisible();
  await page.locator('[data-view="assigned"]').click();
  await expect(page.locator('[data-view="assigned"]')).toHaveClass(/is-active/);
  await expect.poll(() => page.evaluate(() => (window as any).__betterCodexUI__.ready())).toBe(true);
});

test("toolbar survives the host removing the retained closed panel", async ({ page }) => {
  await openBoard(page);
  // A native route can remove the old mount after the user leaves Board.
  // The injection keeps this panel for its next open; cleanup must do so too.
  await page.evaluate(() => {
    (window as any).__betterCodexUI__.close();
    document.getElementById("better-codex-panel")!.remove();
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => (window as any).__betterCodexUI__.open("issues"));
  await expect(page.locator('[data-view="all"]')).toBeVisible();
  await expect(page.locator("#better-codex-search")).toBeVisible();
  await page.locator('[data-view="assigned"]').click();
  await expect(page.locator('[data-view="assigned"]')).toHaveClass(/is-active/);
  await expect.poll(() => page.evaluate(() => (window as any).__betterCodexUI__.ready())).toBe(true);
});

test("ready preserves the intentionally hidden toolbar in narrow agent creation", async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 800 });
  await openBoard(page);
  await page.locator("#better-codex-agents-entry").click();
  await page.locator(".better-codex-agent-actions button").click();
  await expect(page.locator('[data-agent-form="create"]')).toBeVisible();
  await expect(page.locator(".better-codex-toolbar")).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__betterCodexUI__.ready())).toBe(true);
});

test("fixed scheduler model remains truthful when the catalog is unavailable", async ({ page }) => {
  await openBoard(page);
  await page.locator(".better-codex-auto-dispatch-help").click();
  await expect(page.locator("[data-setting-scheduler-model-label]")).toHaveText("gpt-6.1-sol");
  await expect(page.locator("[data-setting-scheduler-model]")).toBeDisabled();
  await expect(page.locator("[data-setting-scheduler-reasoning]")).toBeEnabled();
});
