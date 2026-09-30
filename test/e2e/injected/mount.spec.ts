import { expect, test, type Page } from "@playwright/test";
import { injectionScript } from "../../../src/dom.js";

const navigation = `<aside data-app-navigation-rail><div><button data-sidebar-destination="tasks" aria-label="Tasks"><span>Tasks</span></button><button data-sidebar-destination="better-codex" aria-label="Better Codex"><span>Better Codex</span></button></div></aside>`;
const content = `<main><div id="surface"><div data-app-shell-main-content-layout><div class="app-shell-main-content-frame">Native content</div></div></div></main>`;

async function installFixture(page: Page, markup: string) {
  await page.route("http://injected.test/**", route => route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><style>html,body{margin:0;height:100%}aside{position:fixed;width:64px;height:100%;z-index:50}main{margin-left:64px;height:600px}main>div,[data-app-shell-main-content-layout]{height:100%}.fixed{position:fixed;inset:0}.app-shell-main-content-frame{height:100%}</style></head><body>${navigation}${markup}</body></html>` }));
  await page.goto("http://injected.test/fixture");
  await page.evaluate(() => {
    (window as any).betterCodexHost = {
      capabilities: { nativeThreads: false, codexSemantics: false },
      subscribe: () => () => {},
      request: async ({ path }: { path: string }) => {
        const agents = [{ id: "codex", name: "Codex", is_default: true, avatar: "", model: "gpt-5.6-sol" }];
        if (path.startsWith("/api/bootstrap")) return { locale: "en", agents, projects: [], user: { id: "fixture", name: "Fixture" }, agentModelCatalog: [], agentReasoningEfforts: [], autoDispatch: false };
        if (path.startsWith("/api/agents")) return agents;
        if (path.startsWith("/api/projects")) return [];
        if (path.startsWith("/api/issues")) return [];
        if (path.startsWith("/api/update")) return { status: "current", supported: false };
        return {};
      },
    };
  });
  await page.evaluate(injectionScript(4317, "fixture-token", "install", "en", "codex"));
  await expect(page.locator("#better-codex-entry")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__betterCodexInjection__.ready())).toBe(true);
}

test("a fixed MCP container containing the product panel must remain visible", async ({ page }) => {
  await installFixture(page, `<div class="fixed inset-0">${content}<webview title="Better Codex"></webview></div><div id="external-mcp" class="fixed inset-0" style="left:64px;z-index:100;background:white"><webview title="Better Codex"></webview></div>`);
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#better-codex-panel")).toBeVisible({ timeout: 3000 });
  await expect(page.locator("#better-codex-board")).toBeVisible();
  await expect(page.locator("#external-mcp")).toBeHidden();
  await page.locator('#better-codex-panel [data-view="assigned"]').click();
  await expect(page.locator('#better-codex-panel [data-view="assigned"]')).toHaveClass(/is-active/);
  for (const [entry, surface, contentId, buttons] of [
    ["agents", "agents", "agents", ".better-codex-agent-actions button"],
    ["projects", "projects", "projects", ".better-codex-project-actions button"],
    ["", "issues", "board", "[data-view=all]"],
  ]) {
    await page.locator(entry ? `#better-codex-${entry}-entry` : "#better-codex-entry").click();
    await expect(page.locator("#better-codex-panel")).toHaveAttribute("data-surface", surface);
    await expect(page.locator(`#better-codex-${contentId}`)).toBeVisible();
    await expect(page.locator(`#better-codex-panel ${buttons}`).first()).toBeVisible();
  }
  await expect.poll(() => page.evaluate(() => (window as any).__betterCodexInjection__.ready())).toBe(true);
});

test("route remount restores old hiding ownership and retains interactive project components", async ({ page }) => {
  await installFixture(page, content);
  await page.locator("#better-codex-projects-entry").click();
  await expect(page.locator(".better-codex-project-refresh")).toBeVisible();
  await page.evaluate(() => {
    const layout = document.querySelector("#surface > [data-app-shell-main-content-layout]")!;
    if (layout.getAttribute("data-better-codex-native-hidden") !== "true") throw new Error("fixture_old_layout_not_hidden");
    layout.removeAttribute("data-app-shell-main-content-layout");
    layout.innerHTML = '<div id="next-surface" style="height:100%"><div data-app-shell-main-content-layout><div class="app-shell-main-content-frame">New native content</div></div></div>';
  });
  await expect(page.locator("#next-surface > #better-codex-panel")).toBeVisible();
  await expect(page.locator("#surface")).not.toHaveAttribute("data-better-codex-page-host", "true");
  await expect(page.locator("#next-surface")).toHaveAttribute("data-better-codex-page-host", "true");
  await expect(page.locator(".better-codex-project-refresh")).toBeVisible();
  await page.locator(".better-codex-project-refresh").click();
  await page.locator("#better-codex-entry").click();
  await page.locator('#better-codex-panel [data-view="assigned"]').click();
  await expect(page.locator('#better-codex-panel [data-view="assigned"]')).toHaveClass(/is-active/);
  await page.getByRole("button", { name: "Tasks", exact: true }).click();
  await expect(page.locator("#better-codex-panel")).toBeHidden();
  await expect(page.getByText("New native content", { exact: true })).toBeVisible();
  await expect(page.locator("[data-better-codex-native-hidden], [data-better-codex-page-host], [data-better-codex-external-mcp-host-hidden]")).toHaveCount(0);
});

test("ready requires connected navigation and a visible rendered active surface", async ({ page }) => {
  await installFixture(page, content);
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#better-codex-board")).toBeVisible();
  const states = await page.evaluate(() => {
    const injection = (window as any).__betterCodexInjection__;
    const panel = document.getElementById("better-codex-panel")!;
    const board = document.getElementById("better-codex-board")!;
    const entry = document.getElementById("better-codex-entry")!;
    const result = { visible: injection.ready(), hidden: true, missingSurface: true, missingNavigation: true, error: "" };
    panel.style.visibility = "hidden";
    result.hidden = injection.ready();
    result.error = injection.bootstrapError();
    panel.style.removeProperty("visibility");
    board.remove();
    result.missingSurface = injection.ready();
    panel.append(board);
    entry.remove();
    result.missingNavigation = injection.ready();
    return result;
  });
  expect(states).toEqual({ visible: true, hidden: false, missingSurface: false, missingNavigation: false, error: "injection_content_mount_unavailable" });
});

test("the first hidden or inert main does not capture the product panel", async ({ page }) => {
  await installFixture(page, `<div aria-hidden="true" inert style="display:none">${content.replace('id="surface"', 'id="inactive-surface"')}</div>${content}`);
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#surface > #better-codex-panel")).toBeVisible({ timeout: 3000 });
  await expect(page.locator("#better-codex-board")).toBeVisible();
});

test("without a known layout the panel fills main instead of a small native header", async ({ page }) => {
  await installFixture(page, '<main id="fallback-main"><header style="height:24px">Native heading</header><div style="height:576px">Native body</div></main>');
  await page.locator("#better-codex-entry").click();
  await expect(page.locator("#fallback-main > #better-codex-panel")).toBeVisible();
  const bounds = await page.locator("#better-codex-panel").boundingBox();
  expect(bounds?.height).toBeGreaterThan(500);
  await page.locator('#better-codex-panel [data-view="assigned"]').click();
  await expect(page.locator('#better-codex-panel [data-view="assigned"]')).toHaveClass(/is-active/);
});

for (const pinned of [true, false]) {
  test(`desktop surfaces preserve the native sidebar ${pinned ? "pinned" : "unpinned"} layout`, async ({ page }) => {
    await installFixture(page, `<style>body[data-sidebar-pinned="true"] main{margin-left:320px}#native-sidebar{position:fixed;left:64px;top:0;width:256px;height:600px}</style><nav id="native-sidebar">Native sidebar</nav>${content}`);
    await page.evaluate(pinned => {
      document.body.dataset.sidebarPinned = String(pinned);
      (window as any).nativeNavigations = [];
      window.addEventListener("message", event => {
        if (event.data?.type !== "navigate-to-route") return;
        (window as any).nativeNavigations.push(event.data.path);
        // The native MCP destination switches the shell to a full-width workspace.
        if (event.data.path.startsWith("/mcp-app/")) document.body.dataset.sidebarPinned = "false";
      });
    }, pinned);
    for (const entry of ["better-codex-entry", "better-codex-agents-entry", "better-codex-projects-entry"]) {
      await page.locator(`#${entry}`).click();
      await expect(page.locator("#better-codex-panel")).toBeVisible();
      await expect(page.locator("body")).toHaveAttribute("data-sidebar-pinned", String(pinned));
      expect(await page.evaluate(() => (window as any).nativeNavigations)).toEqual([]);
      expect((await page.locator("#better-codex-panel").boundingBox())?.x).toBe(pinned ? 320 : 64);
      await expect(page.getByText("Native content", { exact: true })).toBeHidden();
    }
    // Native sidebar changes remain authoritative while Better Codex is open.
    await page.evaluate(pinned => { document.body.dataset.sidebarPinned = String(!pinned); }, pinned);
    expect((await page.locator("#better-codex-panel").boundingBox())?.x).toBe(pinned ? 64 : 320);
    await page.getByRole("button", { name: "Tasks", exact: true }).click();
    await expect(page.getByText("Native content", { exact: true })).toBeVisible();
    await expect(page.locator("body")).toHaveAttribute("data-sidebar-pinned", String(!pinned));
  });
}
