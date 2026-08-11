import { expect, test } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../../../src/db.js";
import { createHubServer } from "../../../src/hub-server.js";
import { SyncClient } from "../../../src/sync-client.js";

test("remote shared Web UI follows local changes and remains read-only @critical", async ({ page }) => {
  test.setTimeout(90_000);
  const directory = mkdtempSync(join(tmpdir(), "better-codex-selfhost-e2e-"));
  const adminToken = "selfhost-e2e-admin-token-" + "x".repeat(40);
  const local = new Store(join(directory, "local.db"));
  const hub = createHubServer({ host: "127.0.0.1", port: 0, database: join(directory, "hub.db"), adminToken });
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
    const issue = local.createIssue({ projectId: project.id, title: "Visible remotely", description: "Read-only projection", status: "todo" });
    await client.syncNow();
    await page.goto(`${baseUrl}/web`);
    await page.locator("#web-token").fill(adminToken);
    await page.locator("#web-connect-form button[type=submit]").click();
    await expect(page.getByText("Visible remotely")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-better-codex-read-only", "true");
    await expect(page.locator("[data-add-status]").first()).toBeHidden();

    const current = local.getIssue(issue.id)!;
    local.updateIssue(issue.id, current.version, { title: "Live remote update" });
    await client.syncNow();
    await expect(page.getByText("Live remote update")).toBeVisible({ timeout: 10_000 });
    const mutation = await page.evaluate(async () => {
      try {
        await window.betterCodexHost.request({ path: "/api/issues", method: "POST", body: "{}" });
        return "allowed";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    });
    expect(mutation).toBe("remote_read_only");
  } finally {
    client.stop();
    local.close();
    await page.close();
    await new Promise<void>(resolve => hub.server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
