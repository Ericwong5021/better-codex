import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Store } from "../src/db.js";
import { normalizeModelCatalog, resolveSchedulerModel, resolveSchedulerReasoningEffort } from "../src/model-catalog.js";

const models = [
  { model: "catalog-default", displayName: "Catalog default", isDefault: true },
  { model: "user-default", displayName: "User default" },
  { model: "another-default", displayName: "Another default" },
  { model: "economy-model", displayName: "GPT Luna", defaultReasoningEffort: "low", supportedReasoningEfforts: [{ reasoningEffort: "low" }] },
  { model: "manual-model", displayName: "Manual model", defaultReasoningEffort: "low", supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }] },
];

test("scheduler defaults prefer Luna by ID or display name, then the user default without pinning a model", () => {
  const catalog = normalizeModelCatalog({ data: models });
  assert.equal(resolveSchedulerModel(catalog, "", "user-default"), "economy-model");
  assert.equal(resolveSchedulerModel(catalog, "manual-model", "user-default"), "manual-model");
  assert.equal(resolveSchedulerModel(catalog, "removed-manual-model", "user-default"), "removed-manual-model");
  const noLuna = catalog.filter(model => model.id !== "economy-model");
  assert.equal(resolveSchedulerModel(noLuna, "", "user-default"), "user-default");
  assert.equal(resolveSchedulerModel(noLuna, "", "默认模型"), "catalog-default");
  assert.equal(resolveSchedulerModel([], "", "默认模型"), "");
  assert.equal(resolveSchedulerModel([], "", "user-default"), "user-default");
  assert.equal(resolveSchedulerModel([{ ...catalog[0], id: "GPT-Next-LUNA" }], "", "user-default"), "GPT-Next-LUNA");
  assert.equal(resolveSchedulerReasoningEffort(catalog, "economy-model", "high"), "low");
  assert.equal(resolveSchedulerReasoningEffort(catalog, "manual-model", "medium"), "medium");
});

test("scheduler model and normalized reasoning settings persist atomically", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-scheduler-store-"));
  const path = join(home, "fixture.db");
  let store = new Store(path);
  try {
    assert.equal(store.getSchedulerModel(), "");
    assert.equal(store.getSchedulerModel("user-default"), "user-default");
    store.setSchedulerModel("manual-model", "low");
    assert.throws(() => store.setSchedulerModel("another-model", "\0"), /invalid_scheduler_reasoning_effort/);
    assert.equal(store.getSchedulerModel(), "manual-model");
    assert.equal(store.getSchedulerReasoningEffort(), "low");
    store.close();
    store = new Store(path);
    assert.equal(store.getSchedulerModel(), "manual-model");
    assert.equal(store.getSchedulerReasoningEffort(), "low");
  } finally { store.close(); rmSync(home, { recursive: true, force: true }); }
});

test("Runtime settings API unlocks selection, validates live models and preserves choices across restart", { timeout: 30000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-scheduler-api-"));
  const codex = join(home, "codex");
  mkdirSync(codex);
  const config = join(codex, "config.toml");
  const catalogPath = join(home, "catalog.json");
  writeFileSync(config, 'model = "user-default"\n');
  writeFileSync(catalogPath, JSON.stringify({ data: models }));
  const token = "isolated-scheduler-settings-fixture";
  let child: ChildProcess | undefined;
  let base = "";
  async function start() {
    let output = "";
    // Stub the existing Host RPC boundary in this subprocess, never production discovery.
    child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
      const {IssueWorker}=await import('./src/worker.ts');
      const {readFileSync}=await import('node:fs');
      IssueWorker.prototype.semanticRequest=async function(method){
        if(method!=='model/list')throw Error('unexpected_fixture_semantic_method');
        const value=JSON.parse(readFileSync(process.env.SCHEDULER_TEST_CATALOG,'utf8'));
        if(value.error)throw Error(value.error);
        return {result:value};
      };
      IssueWorker.prototype.sessionHostStatus=function(){return {connected:true,host:{instanceId:'fixture-catalog-host'}};};
      const {ensureDirectories}=await import('./src/config.ts');ensureDirectories();
      const {startServer}=await import('./src/server.ts');startServer();
    `], { cwd: process.cwd(), env: { ...process.env, BETTER_CODEX_HOME: home, CODEX_HOME: codex,
      BETTER_CODEX_PORT: "0", BETTER_CODEX_TOKEN: token, BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
      BETTER_CODEX_DISABLE_DELEGATION: "1", SCHEDULER_TEST_CATALOG: catalogPath }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout!.on("data", chunk => { output += chunk; });
    child.stderr!.on("data", chunk => { output += chunk; });
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw Error(output);
      const match = output.match(/listening on (http:\/\/127\.0\.0\.1:\d+)/);
      if (match && (await fetch(match[1] + "/readyz").catch(() => null))?.ok) { base = match[1]; return; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw Error("scheduler_fixture_start_timeout: " + output);
  }
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit"); child.kill("SIGTERM");
      const timeout = setTimeout(() => child?.kill("SIGKILL"), 3000);
      await exited; clearTimeout(timeout);
    }
  }
  async function request(path: string, body?: unknown) {
    const response = await fetch(base + path, { method: body === undefined ? "GET" : "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, value: await response.json() as Record<string, unknown> };
  }
  try {
    await start();
    const initial = await request("/api/settings/scheduler-model");
    assert.equal(initial.status, 200, JSON.stringify(initial.value));
    assert.equal(initial.value.model, "economy-model");
    assert.equal(initial.value.model_locked, false);
    assert.equal(initial.value.reasoning_effort, "low");
    assert.equal((await request("/api/bootstrap")).value.schedulerModelLocked, false);
    await stop();
    writeFileSync(catalogPath, JSON.stringify({ data: models.filter(model => model.model !== "economy-model") }));
    await start();
    assert.equal((await request("/api/settings/scheduler-model")).value.model, "user-default");
    assert.equal((await request("/api/agents/default", { model: "another-default", reasoning_effort: "medium" })).status, 200);
    assert.equal((await request("/api/settings/scheduler-model")).value.model, "another-default");
    await stop();
    writeFileSync(config, "");
    await start();
    assert.equal((await request("/api/settings/scheduler-model")).value.model, "catalog-default");
    await stop();
    writeFileSync(config, 'model = "user-default"\n');
    writeFileSync(catalogPath, JSON.stringify({ data: models }));
    await start();
    const selected = await request("/api/settings/scheduler-model", { model: "manual-model" });
    assert.equal(selected.status, 200);
    assert.equal(selected.value.model, "manual-model");
    assert.equal(selected.value.reasoning_effort, "low");
    assert.equal((await request("/api/settings/scheduler-model", { model: "missing-model" })).value.error, "invalid_model");
    assert.equal((await request("/api/settings/scheduler-reasoning-effort", { reasoning_effort: "high" })).value.error, "invalid_scheduler_reasoning_effort");
    assert.equal((await request("/api/settings/scheduler-reasoning-effort", { reasoning_effort: "medium" })).status, 200);
    await stop();
    writeFileSync(config, 'model = "another-default"\n');
    await start();
    const retained = await request("/api/settings/scheduler-model");
    assert.equal(retained.value.model, "manual-model");
    assert.equal(retained.value.reasoning_effort, "medium");
    const bootstrap = (await request("/api/bootstrap")).value;
    assert.equal(bootstrap.schedulerModel, "manual-model");
    assert.equal(bootstrap.schedulerReasoningEffort, "medium");
    await stop();
    writeFileSync(catalogPath, JSON.stringify({ error: "fixture_catalog_unavailable" }));
    await start();
    const unavailable = (await request("/api/bootstrap")).value;
    assert.equal(unavailable.schedulerModel, "manual-model");
    assert.equal(unavailable.agentModelCatalogError, "fixture_catalog_unavailable");
    assert.equal((await request("/api/settings/scheduler-model", { model: "user-default" })).value.error, "fixture_catalog_unavailable");
  } finally { await stop(); rmSync(home, { recursive: true, force: true }); }
});
