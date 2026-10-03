import { expect, test } from "@playwright/test";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startRuntimeFixture, type RuntimeFixture } from "../fixtures/runtime.js";
import type { ExternalObservation } from "../../../src/external-observations.js";
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOYQAAAAASUVORK5CYII=", "base64");
let runtime: RuntimeFixture, home: string, avatar: string, profiles: string, source: ExternalObservation | null;
let identity: { provider: string; account_id: string; host_id: string; thread_id: string };
async function api(path: string, method = "GET", body?: unknown) {
  const response = await fetch(runtime.baseUrl + path, { method, headers: { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); expect(response.ok, JSON.stringify(data)).toBeTruthy(); return data;
}
test.beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), "creator-ui-")); avatar = join(home, "dot.png"); profiles = join(home, "profiles.json");
  if (process.env.BETTER_CODEX_TEST_DOT_AVATAR) copyFileSync(process.env.BETTER_CODEX_TEST_DOT_AVATAR, avatar); else writeFileSync(avatar, tinyPng);
  chmodSync(avatar, 0o600);
  source = process.env.BETTER_CODEX_TEST_DOT_SNAPSHOT ? JSON.parse(readFileSync(process.env.BETTER_CODEX_TEST_DOT_SNAPSHOT, "utf8")) : null;
  identity = source ? { provider: source.provider, account_id: source.account_id, host_id: source.host_id, thread_id: source.thread_id }
    : { provider: "codex", account_id: "synthetic", host_id: "synthetic", thread_id: "mapped-ui-task" };
  writeFileSync(profiles, JSON.stringify({ schema_version: 1, profiles: [{ id: "dot-current", name: "dot", avatar_file: avatar }], mappings: [{ ...identity, profile_id: "dot-current" }] }), { mode: 0o600 });
  runtime = await startRuntimeFixture({ mcpAllowReports: true, taskCreatorProfilesFile: profiles });
  const input = { schema_version: 1, ...identity, sequence: source?.sequence || 1, item_id: "avatar-preview-import", reported_at: source?.reported_at || new Date().toISOString(),
    state: source?.task_result === "reported_complete" ? "completed" : "running", title: source?.title || "dot 任务 · 隔离示例", description: source?.description || "头像来自用户明确指定的来源映射", project_id: null, parent_thread_id: source?.parent_thread_id || null, creator_name: source?.creator.name || "dot", message: null };
  await api("/api/external-observations/report", "POST", input);
  await api("/api/external-observations/report", "POST", { ...input, thread_id: "unknown-ui-task", sequence: 1, item_id: "unknown-preview", reported_at: new Date().toISOString(), title: "身份未知 · 隔离示例", state: "running" });
  const workspace = join(runtime.workspacePath, "project"); mkdirSync(workspace);
  const project = await api("/api/projects", "POST", { name: "界面审核", workspace_path: workspace });
  const issue = await api("/api/issues", "POST", { project_id: project.id, title: "用户任务 · 隔离示例", description: "创建者 Alice，当前执行者 Bob，两个身份独立保留", agent_enabled: false, ai_enrich: false });
  await api(`/api/issues/${issue.id}`, "PATCH", { version: issue.version, creator_user_id: "alice", user_assigned: true, assignee_user_id: "bob" });
});
test.afterAll(async () => { await runtime?.stop(); if (home) rmSync(home, { recursive: true, force: true }); });
test("real private dot image and imported observation use the shared creator display; handoff and unknown remain distinct", async ({ page }, info) => {
  await page.setViewportSize({ width: 2048, height: 1152 });
  await page.route("**/api/bootstrap**", async route => {
    const response = await route.fetch(); const data = await response.json();
    // Synthetic users only: exercise existing shared local/Relay user profile contract.
    data.users = [{ id: "alice", name: "Alice", initials: "AL", color: "#5076F0" }, { id: "bob", name: "Bob", initials: "BO", color: "#5076F0" }];
    await route.fulfill({ response, json: data });
  });
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  const dot = page.locator('[data-card-creator="profile:dot-current"]');
  await expect(dot).toHaveAttribute("aria-label", "创建者：dot"); await expect(dot).toHaveAttribute("title", /用户指定.*平台身份未验证/);
  await expect(dot.locator('[data-creator-name]')).toHaveCount(0);
  await expect(dot.locator('.better-codex-creator-initials')).toBeHidden();
  const image = dot.locator("img"); await expect(image).toBeVisible();
  const dimensions = await image.evaluate((node: HTMLImageElement) => ({ width: node.naturalWidth, height: node.naturalHeight, loaded: node.complete }));
  expect(dimensions.loaded).toBeTruthy(); expect(dimensions.width).toBe(process.env.BETTER_CODEX_TEST_DOT_AVATAR ? 512 : 1);
  const dotCard = dot.locator("xpath=ancestor::article");
  await expect(dotCard.locator("[data-external-source],.better-codex-chip-row")).toHaveCount(0);
  await expect(dotCard).not.toContainText("只读观测"); await expect(dotCard).not.toContainText("创建者未验证");
  const user = page.locator('[data-card-creator="user:alice"]'); await expect(user).toHaveAttribute("aria-label", "创建者：Alice"); await expect(user.locator("img")).toBeVisible();
  await expect(user.locator('[data-creator-name]')).toHaveCount(0);
  await expect(user.locator("xpath=ancestor::article").locator(".better-codex-card-executor")).toContainText("Bob");
  await expect(page.locator('[data-card-creator="unknown"]')).toHaveCount(1);
  await expect(page.locator('[data-card-creator="unknown"] img')).toHaveCount(0);
  await user.locator("xpath=ancestor::article").click();
  const native = page.locator('#better-codex-dialog');
  await expect(native.locator('.better-codex-dialog-head-actions [data-detail-creator="user:alice"]')).toContainText("创建者：Alice");
  const nativeWidth = await native.evaluate(node => getComputedStyle(node).width);
  await page.keyboard.press("Escape"); await expect(native).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("creator-avatars-review.png"), fullPage: true });
  await dotCard.click(); const detail = page.locator("#better-codex-dialog.is-external-observation");
  await expect(detail.locator('.better-codex-dialog-head-actions [data-detail-creator="profile:dot-current"]')).toContainText("创建者：dot");
  await expect(detail.locator('.better-codex-dialog-head-actions [data-detail-creator]')).toHaveAttribute("title", /平台身份未验证/);
  expect(await detail.evaluate(node => getComputedStyle(node).width)).toBe(nativeWidth);
  await expect(detail.locator('input,textarea,[contenteditable="true"],[type="submit"],[data-dialog-start-now],[data-dialog-stop]')).toHaveCount(0);
  await expect(detail).toContainText("用户指定的本地映射"); await expect(detail).toContainText("当前执行者"); await expect(detail).toContainText("来源范围");
  await page.screenshot({ path: info.outputPath("creator-source-detail.png"), fullPage: true });
  const headerCreator = detail.locator('[data-detail-creator="profile:dot-current"]');
  await headerCreator.locator("img").evaluate((node: HTMLImageElement) => { node.src = "data:image/png;base64,AA=="; });
  await expect(headerCreator.locator("img")).toHaveCount(0);
  await expect(headerCreator.locator(".better-codex-creator-initials")).toBeVisible();
  await expect(headerCreator).toContainText("创建者：dot");
  await page.keyboard.press("Escape");
  const first = (await api("/api/external-observations")).observations.find((item: ExternalObservation) => item.thread_id === identity.thread_id);
  await api("/api/external-observations/report", "POST", { schema_version: 1, ...identity, sequence: first.sequence + 1, item_id: "synthetic-handoff-preview", reported_at: new Date().toISOString(),
    state: "waiting_user", title: first.title, description: first.description, project_id: null, parent_thread_id: first.parent_thread_id, creator_name: "Bob", executor_name: "Bob", message: "隔离合成转交：当前执行者变为 Bob，创建者保持 dot" });
  await expect(dotCard.locator("[data-card-creator]")).toHaveAttribute("aria-label", "创建者：dot"); await expect(dotCard.locator(".better-codex-card-executor")).toContainText("Bob");
  await expect(dotCard.locator("[data-card-creator]")).toHaveAttribute("title", /当前执行者：Bob/);
  // Real browser decode failure falls back without changing the creator's name.
  await image.evaluate((node: HTMLImageElement) => { node.src = "data:image/png;base64,AA=="; });
  await expect(dot.locator("img")).toHaveCount(0); await expect(dot.locator(".better-codex-creator-initials")).toBeVisible();
  await page.setViewportSize({ width: 500, height: 850 }); await page.screenshot({ path: info.outputPath("creator-avatars-narrow.png"), fullPage: true });
  writeFileSync(info.outputPath("creator-avatar-proof.json"), JSON.stringify({ real_private_avatar: !!process.env.BETTER_CODEX_TEST_DOT_AVATAR, image_dimensions: dimensions,
    observation_source: source ? "read-only snapshot imported into isolated Runtime; not live synchronization" : "synthetic", task_id: identity.thread_id,
    user_profiles: "synthetic Alice/Bob", unknown_not_mapped: true, creator_executor_separate: true, browser_decode_fallback: true, installed_runtime_modified: false }, null, 2));
});
