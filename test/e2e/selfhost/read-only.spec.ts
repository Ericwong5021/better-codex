import { expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../../src/db.js";
import { createHubServer } from "../../../src/hub-server.js";
import { SyncClient } from "../../../src/sync-client.js";

test("remote shared Web UI shows pending, acknowledgement, conflict, and resubmission @critical", async ({ page }) => {
  test.setTimeout(90_000);
  const directory = mkdtempSync(join(tmpdir(), "better-codex-selfhost-e2e-"));
  const adminToken = "selfhost-e2e-admin-token-" + "x".repeat(40);
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken, webPassword: adminToken, secureCookies: false });
  await new Promise<void>((resolve, reject) => {
    hub.server.once("error", reject);
    hub.server.listen(0, "127.0.0.1", resolve);
  });
  const address = hub.server.address();
  if (!address || typeof address === "string") throw new Error("hub_address_unavailable");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("Playwright Runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: baseUrl, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));

  try {
    const project = local.createProject({ name: "Public board", workspacePath: join(directory, "secret") });
    const agent = local.createAgentProfile({ name: "Remote Agent", name_en: "Remote Agent", description: "Visible agent directory", instructions: "local only", model: "gpt-test", reasoning_effort: "medium" });
    const issue = local.createIssue({ projectId: project.id, title: "Visible remotely", description: "Writable projection", status: "todo" });
    const xssTitle = '<img src="x" onerror="window.__betterCodexXss=true">';
    local.createIssue({ projectId: project.id, title: xssTitle, status: "todo" });
    await client.syncNow();
    await page.goto(`${baseUrl}/web`);
    await page.locator("#web-username").fill("admin");
    await page.locator("#web-token").fill(adminToken);
    await page.locator("#web-connect-form button[type=submit]").click();
    await expect(page.locator("#better-codex-board").getByText("Visible remotely")).toBeVisible();
    await page.locator("#better-codex-agents-entry").click();
    await expect(page.locator("#better-codex-agents").getByText("Remote Agent").first()).toBeVisible();
    await page.locator("#better-codex-entry").click();
    await expect(page.getByText(xssTitle)).toBeVisible();
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(await page.evaluate(() => Boolean((window as typeof window & { __betterCodexXss?: boolean }).__betterCodexXss))).toBe(false);
    await expect(page.locator("html")).not.toHaveAttribute("data-better-codex-read-only", "true");

    const pending = await page.evaluate(async ({ issueId, version }) => window.betterCodexHost.request({ path: `/api/issues/${issueId}`, method: "PATCH", body: JSON.stringify({ version, title: "Pending remote update" }) }), { issueId: issue.id, version: issue.version });
    expect(pending.remote_pending).toBe(true);
    await expect(page.getByText("Pending remote update")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-run="remote-pending"]')).toBeVisible();
    expect(local.getIssue(issue.id)?.title).toBe("Visible remotely");
    await client.syncNow();
    await expect(page.getByText("Pending remote update")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-run="remote-pending"]')).toHaveCount(0);
    expect(local.getIssue(issue.id)?.title).toBe("Pending remote update");

    const applied = local.getIssue(issue.id)!;
    local.updateIssue(issue.id, applied.version, { title: "Local conflict winner" });
    await page.evaluate(async ({ issueId, version }) => window.betterCodexHost.request({ path: `/api/issues/${issueId}`, method: "PATCH", body: JSON.stringify({ version, title: "Stale remote update" }) }), { issueId: issue.id, version: applied.version });
    await client.syncNow();
    await expect(page.getByText("Local conflict winner")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-run="remote-conflict"]')).toBeVisible();
    expect(local.getIssue(issue.id)?.title).toBe("Local conflict winner");

    const latest = local.getIssue(issue.id)!;
    await page.evaluate(async ({ issueId, version }) => window.betterCodexHost.request({ path: `/api/issues/${issueId}`, method: "PATCH", body: JSON.stringify({ version, title: "Conflict resolved remotely" }) }), { issueId: issue.id, version: latest.version });
    await client.syncNow();
    await expect(page.getByText("Conflict resolved remotely")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-run="remote-conflict"]')).toHaveCount(0);

    const assignable = local.getIssue(issue.id)!;
    await page.evaluate(async ({ issueId, version, agentId }) => window.betterCodexHost.request({ path: `/api/issues/${issueId}`, method: "PATCH", body: JSON.stringify({ version, agent_enabled: true, agent_id: agentId, user_assigned: false }) }), { issueId: issue.id, version: assignable.version, agentId: agent.id });
    await client.syncNow();
    const assigned = local.getIssue(issue.id)!;
    expect(assigned.agent_id).toBe(agent.id);
    const started = await page.evaluate(async ({ issueId, current }) => window.betterCodexHost.request({ path: `/api/issues/${issueId}/start`, method: "POST", body: JSON.stringify({ version: current.version, project_id: current.project_id, title: current.title, description: current.description, status: current.status, priority: current.priority, labels: current.labels, agent_id: current.agent_id }) }), { issueId: issue.id, current: assigned });
    expect(started.remote_pending).toBe(true);
    await client.syncNow();
    expect(local.listManualStartQueue()).toContain(issue.id);
    const completed = local.getIssue(issue.id)!;
    local.updateIssue(issue.id, completed.version, { status: "done" });
    await client.syncNow();
    await expect(page.locator("article").filter({ hasText: "Conflict resolved remotely" }).locator('[data-run="completed"]')).toBeVisible({ timeout: 10_000 });
  } finally {
    client.stop();
    local.close();
    await page.close();
    await new Promise<void>(resolve => hub.server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("two browser contexts cannot both commit the same base revision", async ({ browser }) => {
  test.setTimeout(90_000);
  const directory = mkdtempSync(join(tmpdir(), "better-codex-selfhost-two-contexts-"));
  const adminToken = "selfhost-two-context-admin-" + "y".repeat(40);
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken, webPassword: adminToken, secureCookies: false });
  await new Promise<void>((resolve, reject) => {
    hub.server.once("error", reject);
    hub.server.listen(0, "127.0.0.1", resolve);
  });
  const address = hub.server.address();
  if (!address || typeof address === "string") throw new Error("hub_address_unavailable");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pairing = hub.store.createPairingCode();
  const device = hub.store.pairDevice("Two-context Runtime", pairing.pairing_code);
  const client = new SyncClient(local, 60_000, () => ({ enabled: true, hub_url: baseUrl, device_id: device.device_id, device_name: device.device_name, device_token: device.device_token, created_at: new Date().toISOString() }));
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const first = await firstContext.newPage();
  const second = await secondContext.newPage();
  try {
    const project = local.createProject({ name: "Concurrent board", workspacePath: directory });
    const issue = local.createIssue({ projectId: project.id, title: "Concurrent original" });
    await client.syncNow();
    for (const page of [first, second]) {
      await page.goto(`${baseUrl}/web`);
      await page.locator("#web-username").fill("admin");
      await page.locator("#web-token").fill(adminToken);
      await page.locator("#web-connect-form button[type=submit]").click();
      await expect(page.getByText("Concurrent original")).toBeVisible();
    }
    await Promise.all([
      first.evaluate(async ({ id, version }) => window.betterCodexHost.request({ path: `/api/issues/${id}`, method: "PATCH", body: JSON.stringify({ version, title: "First browser" }) }), { id: issue.id, version: issue.version }),
      second.evaluate(async ({ id, version }) => window.betterCodexHost.request({ path: `/api/issues/${id}`, method: "PATCH", body: JSON.stringify({ version, title: "Second browser" }) }), { id: issue.id, version: issue.version }),
    ]);
    await client.syncNow();
    const finalIssue = local.getIssue(issue.id)!;
    expect(["First browser", "Second browser"]).toContain(finalIssue.title);
    expect(finalIssue.version).toBe(issue.version + 1);
    await expect(first.locator('[data-run="remote-conflict"]')).toBeVisible({ timeout: 10_000 });
    await expect(second.locator('[data-run="remote-conflict"]')).toBeVisible({ timeout: 10_000 });
  } finally {
    client.stop();
    local.close();
    await firstContext.close();
    await secondContext.close();
    await new Promise<void>(resolve => hub.server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
