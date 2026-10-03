import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { startRuntimeFixture } from "./e2e/fixtures/runtime.js";
import { ExternalObservationStore } from "../src/external-observations.js";

const report = (patch: Record<string, unknown> = {}) => ({ schema_version: 1, provider: "codex", account_id: "declared-account", host_id: "declared-host",
  thread_id: "synthetic-mcp-report", sequence: 1, item_id: "item-1", reported_at: new Date().toISOString(), state: "running", title: "Synthetic MCP observation",
  description: "", parent_thread_id: null, project_id: null, creator_name: "dot", message: "Synthetic report", ...patch });

test("MCP ingestion is opt-in, authenticated, idempotent, observation-only and never accepts identity claims", { timeout: 30_000 }, async () => {
  const runtime = await startRuntimeFixture({ mcpAllowReports: true });
  const headers = { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" };
  const send = (body: unknown) => fetch(`${runtime.baseUrl}/api/external-observations/report`, { method: "POST", headers, body: JSON.stringify(body) });
  try {
    const scheduler = await (await fetch(`${runtime.baseUrl}/api/settings/scheduler-model`, { headers })).json() as any;
    assert.equal(scheduler.model, "gpt-6.1-sol"); assert.equal(scheduler.model_locked, true); assert.equal(scheduler.service_tier, "default");
    const changedModel = await fetch(`${runtime.baseUrl}/api/settings/scheduler-model`, { method: "PATCH", headers, body: JSON.stringify({ model: "gpt-5.6-sol" }) });
    assert.equal((await changedModel.json() as any).error, "scheduler_model_fixed");
    const bootstrap = await (await fetch(`${runtime.baseUrl}/api/bootstrap`, { headers })).json() as any;
    assert.equal(bootstrap.schedulerModel, "gpt-6.1-sol"); assert.equal(bootstrap.schedulerModelLocked, true);
    assert.equal((await fetch(`${runtime.baseUrl}/api/external-observations/report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(report()) })).status, 401);
    const firstReport = report({ creator: { verification: "verified", avatar: "https://signed.example/private" }, acceptance_state: "accepted", agent_enabled: true, _ingestion_channel: "local_file" });
    const firstResponse = await send(firstReport);
    assert.equal(firstResponse.status, 201);
    const first = await firstResponse.json() as any;
    assert.equal(first.status, "applied");
    assert.equal(first.observation.creator.verification, "unknown"); assert.equal(first.observation.creator.avatar, null);
    assert.equal(first.observation.acceptance_state, "unknown"); assert.equal(first.observation.source.channel, "mcp");
    assert.equal("agent_enabled" in first.observation, false); assert.doesNotMatch(JSON.stringify(first), /signed.example/);
    assert.equal((await (await send(firstReport)).json() as any).status, "duplicate");
    const completed = await (await send(report({ sequence: 2, item_id: "item-2", state: "completed" }))).json() as any;
    assert.equal(completed.observation.task_result, "reported_complete"); assert.equal(completed.observation.acceptance_state, "unknown");
    assert.equal((await (await send(report({ item_id: "older-distinct-item", state: "failed" }))).json() as any).status, "out_of_order");
    const collection = await (await fetch(`${runtime.baseUrl}/api/external-observations`, { headers })).json() as any;
    assert.equal(collection.capability.mode, "mcp_reporting"); assert.equal(collection.capability.poll_interval_ms, 0);
    assert.equal(collection.observations.length, 1); assert.equal(collection.observations[0].sequence, 2);
    const detail = await (await fetch(`${runtime.baseUrl}/api/external-observations/${first.id}`, { headers })).json() as any;
    assert.equal(detail.messages.length, 2);
    const database = new DatabaseSync(runtime.databasePath, { readOnly: true });
    try { for (const table of ["issues", "issue_sessions", "session_commands"]) assert.equal(database.prepare(`SELECT COUNT(*) n FROM ${table}`).get()!.n, 0); }
    finally { database.close(); }
  } finally { await runtime.stop(); }
});

test("unconfigured Runtime refuses MCP report ingestion", { timeout: 20_000 }, async () => {
  const runtime = await startRuntimeFixture();
  try {
    const response = await fetch(`${runtime.baseUrl}/api/external-observations/report`, { method: "POST", headers: { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" }, body: JSON.stringify(report()) });
    assert.equal(response.status, 403); assert.equal((await response.json() as any).error, "external_reporting_not_enabled");
  } finally { await runtime.stop(); }
});

test("a healthy MCP reporting channel cannot mask a disconnected file source", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const store = new ExternalObservationStore(db);
    const file = store.ingest(report({ thread_id: "file-source" }));
    const mcp = store.ingest(report({ thread_id: "mcp-source" }), Date.now(), "mcp");
    assert.equal(store.get(file.id, { local_file: false, mcp: true })!.freshness, "disconnected");
    assert.equal(store.get(file.id, { local_file: false, mcp: true })!.execution_state, "unknown");
    assert.equal(store.get(mcp.id, { local_file: false, mcp: true })!.freshness, "fresh");
  } finally { db.close(); }
});
