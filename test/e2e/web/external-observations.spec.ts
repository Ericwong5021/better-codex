import { expect, test } from "@playwright/test";
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";
import { writeExternalReport } from "../../../src/external-reporter.js";
import { externalObservationId, externalReportFileName } from "../../../src/external-observations.js";

let runtime: RuntimeFixture;
let directory: string;
const input = { provider: "codex", account_id: "synthetic-account", host_id: "synthetic-host", thread_id: "synthetic-ui-thread",
  title: "合成测试 · dot 上报", description: "用同一张任务卡同步执行观测", project_id: null, parent_thread_id: null,
  creator_name: "dot", message: "合成测试消息", state: "running" as const };

test.beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), "external-board-e2e-"));
  const avatar = join(directory, "dot.png"), profiles = join(directory, "profiles.json");
  if (process.env.BETTER_CODEX_TEST_DOT_AVATAR) copyFileSync(process.env.BETTER_CODEX_TEST_DOT_AVATAR, avatar);
  else writeFileSync(avatar, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOYQAAAAASUVORK5CYII=", "base64"), {mode: 0o600});
  const {chmodSync} = await import("node:fs"); chmodSync(avatar, 0o600);
  writeFileSync(profiles, JSON.stringify({schema_version: 1, profiles: [{id: "dot-current", name: "dot", avatar_file: avatar}],
    mappings: [{provider: input.provider, account_id: input.account_id, host_id: input.host_id, thread_id: "repeat-style", profile_id: "dot-current"}]}), {mode: 0o600});
  runtime = await startRuntimeFixture({ externalReportsDirectory: directory, taskCreatorProfilesFile: profiles });
});
test.afterAll(async () => { await runtime?.stop(); if (directory) rmSync(directory, { recursive: true, force: true }); });

test("external conversation folds repeated bodies while retaining records, focus and live updates", async ({ page }, info) => {
  const title = "本次安装验证 · 主动上报";
  const repeated = "继续当前安装验收，正在验证真实桌面看板的状态刷新。";
  const report = (message: string) => writeExternalReport(directory, { ...input, thread_id: "repeat-style", title, state: "completed",
    description: "验证本机插件的安装与任务上报。", message });
  await report("真实 Codex app-server 宿主已发现并调用本地插件，正在验证状态更新。");
  await report("本机插件安装与主动上报通路已通过。此为当前验证任务的完成声明，仍待人工验收。");
  for (let i = 0; i < 4; i++) await report(repeated);
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await page.locator('[data-issue-id^="external-"]', { hasText: title }).click();
  const detail = page.locator("#better-codex-dialog.is-external-observation");
  await expect(detail.locator("[data-external-message-id]")).toHaveCount(6);
  await expect(detail.locator("[data-external-report-group]")).toHaveCount(3);
  const sourceAvatars = detail.locator('[data-external-report-avatar="dot-current"] img');
  await expect(sourceAvatars).toHaveCount(3);
  const sizes = await sourceAvatars.evaluateAll(nodes => nodes.map(node => ({ loaded: (node as HTMLImageElement).complete, width: (node as HTMLImageElement).naturalWidth })));
  expect(sizes.every(size => size.loaded && size.width === (process.env.BETTER_CODEX_TEST_DOT_AVATAR ? 512 : 1))).toBe(true);
  const repeat = detail.locator("[data-external-repeat] > button");
  await expect(repeat).toHaveAttribute("aria-expanded", "false");
  await expect(repeat).toContainText("4");
  await repeat.focus(); await page.keyboard.press("Enter");
  await expect(detail.locator(".better-codex-external-repeat-records li")).toHaveCount(4);
  await expect(detail.locator(".better-codex-external-repeat-records")).toBeVisible();
  await report(repeated);
  await expect(repeat).toContainText("5");
  await expect(repeat).toHaveAttribute("aria-expanded", "true");
  await expect(repeat).toBeFocused();
  await expect(detail.locator("[data-external-message-id]")).toHaveCount(7);
  await page.keyboard.press("Space");
  await expect(repeat).toHaveAttribute("aria-expanded", "false");
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    for (const width of [1440, 500]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await detail.evaluate(node => {
        const bounds = node.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: innerWidth, height: innerHeight, overflow: node.scrollWidth > node.clientWidth };
      });
      expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.right).toBeLessThanOrEqual(geometry.width);
      expect(geometry.top).toBeGreaterThanOrEqual(0); expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
      expect(geometry.overflow).toBe(false);
      if (width === 1440) expect(geometry.bottom - geometry.top).toBeLessThan(700);
      await expect(detail.locator("[data-external-report-group]").first()).toBeVisible();
      expect(await detail.locator(".better-codex-external-detail-body").evaluate(node => node.getBoundingClientRect().height)).toBeGreaterThan(100);
      const body = detail.locator(".better-codex-external-detail-body");
      await body.evaluate(node => { node.scrollTop = 0; });
      await page.mouse.move(0, 0); await repeat.blur(); await page.waitForTimeout(200);
      await page.screenshot({ path: info.outputPath(`external-conversation-${theme}-${width}.png`) });
    }
  }
  const firstAvatar = detail.locator('[data-external-report-avatar="dot-current"]').first();
  await firstAvatar.locator("img").evaluate((node: HTMLImageElement) => { node.src = "data:image/png;base64,AA=="; });
  await expect(firstAvatar.locator("img")).toHaveCount(0);
  await expect(firstAvatar.locator("svg")).toBeVisible();
  await expect(detail.locator('[data-detail-creator="profile:dot-current"]')).toContainText("创建者：dot");
  // The same text separated by another event starts a separate visible bubble.
  await report("状态刷新已恢复，准备继续验收。");
  await report(repeated);
  await expect(detail.locator("[data-external-report-group]")).toHaveCount(5);
  await expect(detail.locator("[data-external-message-id]")).toHaveCount(9);
  await page.keyboard.press("Escape"); await expect(detail).toHaveCount(0);
});

test("external detail has readable formatted content and keeps toolbar after close", async ({ page }, info) => {
  const title = "详情排版回归";
  await writeExternalReport(directory, { ...input, thread_id: "formatted-detail", title,
    description: "## 验证步骤\n\n- **检查详情**\n- 保留 `thread_id`\n\n```js\nconst ready = true;\n```",
    message: "### 完成记录\n\n1. 格式已检查\n2. 工具栏仍可操作\n\n![no fetch](https://example.invalid/tracker.png)\n\n<script>alert(1)</script>\n\n" + Array.from({ length: 30 }, (_, i) => `记录段落 ${i + 1}。`).join("\n\n") });
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  const card = page.locator('[data-issue-id^="external-"]', { hasText: title });
  await card.click();
  const detail = page.locator("#better-codex-dialog.is-external-observation");
  await expect(detail.locator('.better-codex-dialog-head-actions [data-detail-creator="unknown"]')).toContainText("创建者：未知创建者");
  await expect(detail.locator('[data-creator-name]')).not.toContainText("dot");
  await expect(detail.locator('[data-external-report-avatar] img')).toHaveCount(0);
  await expect(detail.locator('input,textarea,[contenteditable="true"],[type="submit"],[data-dialog-start-now],[data-dialog-stop]')).toHaveCount(0);
  await expect(detail.getByRole("heading", { name: "验证步骤" })).toBeVisible();
  await expect(detail.locator(".better-codex-external-description li")).toHaveCount(2);
  await expect(detail.locator(".better-codex-external-description pre code")).toContainText("const ready = true;");
  await expect(detail.locator(".better-codex-external-message ol li")).toHaveCount(2);
  await expect(detail.locator("script, .better-codex-markdown img")).toHaveCount(0);
  await detail.locator(".better-codex-external-metadata > button").click();
  await expect(detail.locator(".better-codex-external-fields")).toBeVisible();
  await expect(detail).toContainText("创建者未验证");
  await detail.locator('[data-dialog-expand]').click();
  await expect(detail).toHaveAttribute('data-expanded', 'true');
  await detail.locator('[data-dialog-expand]').click();
  await expect(detail).toHaveAttribute('data-expanded', 'false');
  for (const width of [1440, 500]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await detail.evaluate(node => {
      const head = node.querySelector(".better-codex-external-detail-head")!.getBoundingClientRect();
      const body = node.querySelector(".better-codex-external-detail-body")!;
      const bounds = body.getBoundingClientRect();
      return { headerBottom: head.bottom, bodyTop: bounds.top, bottom: bounds.bottom, dialogBottom: node.getBoundingClientRect().bottom, viewport: innerHeight, horizontalOverflow: body.scrollWidth > body.clientWidth, scrollable: body.scrollHeight > body.clientHeight };
    });
    expect(geometry.bodyTop).toBeGreaterThanOrEqual(geometry.headerBottom);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.bottom).toBeLessThanOrEqual(geometry.dialogBottom);
    expect(geometry.scrollable).toBe(true);
    expect(geometry.horizontalOverflow).toBe(false);
    const body = detail.locator('.better-codex-external-detail-body');
    await body.evaluate(node => { node.scrollTop = 180; });
    const scroll = await body.evaluate(node => node.scrollTop);
    expect(scroll).toBeGreaterThan(0);
    // The clock-triggered observation render must retain the user's position
    // and expanded provenance while the close/expand controls remain mounted.
    await page.waitForTimeout(5500);
    expect(await body.evaluate(node => node.scrollTop)).toBe(scroll);
    await expect(detail.locator('.better-codex-external-metadata > button')).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({ path: info.outputPath(`formatted-detail-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(page.locator("#better-codex-search")).toBeVisible();
  await expect(page.locator('#better-codex-board [data-add-status]')).toHaveCount(6);
  await expect(page.locator('#better-codex-board [data-archive-open]')).toHaveCount(1);
  await page.locator('[data-view="assigned"]').click();
  await expect(page.locator('[data-view="assigned"]')).toHaveClass(/is-active/);
});

test("opt-in reports share the existing board and remain observation-only across live updates and expiry", async ({ page }, info) => {
  test.setTimeout(90_000);
  const first = await writeExternalReport(directory, input);
  const writes: string[] = [];
  page.on("request", request => { if (/\/api\/(issues|external-observations|session)/.test(request.url()) && request.method() !== "GET") writes.push(request.method() + " " + new URL(request.url()).pathname); });
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  const card = page.locator(`[data-issue-id="${externalObservationId(input)}"]`);
  await expect(card).toHaveCount(1);
  await expect(page.locator('[data-status="in_progress"]', { has: card })).toBeVisible();
  await expect(page.locator(".better-codex-toolbar")).toBeVisible();
  await expect(card).toHaveAttribute("draggable", "false");
  await expect(card.locator("[data-card-creator]")).toHaveAttribute("aria-label", "创建者：未知创建者");
  await expect(card.locator("[data-creator-name]")).toHaveCount(0);
  await expect(card.locator("[data-external-source]")).toHaveCount(0);

  await card.click();
  const detail = page.locator("#better-codex-dialog.is-external-observation");
  await expect(detail).toContainText("自动发现尚未接通");
  await expect(detail).toContainText("合成测试消息");
  await expect(detail.locator("input,textarea,[contenteditable=true]")).toHaveCount(0);
  await expect(detail.locator("[data-dialog-close]")).toHaveCount(1);
  await expect(detail.locator("[data-dialog-expand]")).toHaveCount(1);
  await writeExternalReport(directory, { ...input, state: "waiting_user", message: "<script>throw new Error('unsafe')</script> 等待用户" });
  await expect(detail).toContainText("等待用户 · 自报");
  await expect(detail.locator("script")).toHaveCount(0);
  await expect(detail.locator("[data-external-message-id]")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(page.locator('[data-status="blocked"]', { has: card })).toBeVisible();

  await page.locator("#better-codex-filter").click();
  await page.locator('[data-filter-category="source"]').hover();
  await page.locator(".better-codex-filter-submenu").getByText("Better Codex 任务", { exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.locator(".better-codex-filter-submenu").getByText("Better Codex 任务", { exact: true }).click();
  await page.locator("#better-codex-filter").click();
  await expect(card).toHaveCount(1);

  await writeExternalReport(directory, { ...input, state: "completed", message: "自报结果；仍需人工验收" });
  await expect(page.locator('[data-status="in_review"]', { has: card })).toBeVisible();
  await expect(page.locator('[data-status="done"] [data-issue-id^="external-"]')).toHaveCount(0);
  // A distinct item with an old sequence cannot roll the snapshot back or add a duplicate.
  const old = { ...first, item_id: "out-of-order-item", state: "failed" as const };
  writeFileSync(join(directory, externalReportFileName(old)), JSON.stringify(old), { mode: 0o600 });
  await card.click();
  await expect(detail.locator("[data-external-message-id]")).toHaveCount(3);
  await expect(detail).toContainText("自报完成 · 待验收");
  await page.keyboard.press("Escape");

  await writeExternalReport(directory, { ...input, state: "running", message: "合成测试新一轮执行" });
  await expect(page.locator('[data-status="in_progress"]', { has: card })).toBeVisible();
  // Simulate the browser losing its Runtime: its last cached record must expire independently.
  await page.context().setOffline(true);
  await expect(page.locator('[data-status="unknown"]', { has: card })).toBeVisible({ timeout: 40_000 });
  await expect(card).toContainText("当前状态未知");
  await page.screenshot({ path: info.outputPath("external-offline-unknown.png") });
  await page.context().setOffline(false);
  await writeExternalReport(directory, { ...input, state: "running", message: "合成测试恢复连接" });
  await expect(page.locator('[data-status="in_progress"]', { has: card })).toBeVisible();
  await expect(card).toHaveCount(1);
  expect(writes).toEqual([]);
  const db = new DatabaseSync(runtime.databasePath, { readOnly: true });
  try { for (const table of ["issues", "issue_sessions", "session_commands"]) expect(db.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n).toBe(0); }
  finally { db.close(); }
});
