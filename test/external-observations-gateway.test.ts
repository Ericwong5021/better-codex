import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { startRuntimeFixture } from "./e2e/fixtures/runtime.js";
import { writeExternalReport } from "../src/external-reporter.js";
import { externalReportFileName, type ExternalObservation, type ExternalObservationCapability } from "../src/external-observations.js";

test("Runtime integrates read-only external observations, existing events, bootstrap and durable replay fencing", { timeout: 45_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "external-observation-api-"));
  const input = { provider: "codex", account_id: "synthetic-account", host_id: "synthetic-host", thread_id: "synthetic-gateway-thread", state: "running" as const,
    title: "Synthetic gateway observation", description: "Only a fixture report", project_id: null, parent_thread_id: "declared-parent", creator_name: "dot", message: "Synthetic start message" };
  const first = await writeExternalReport(directory, input);
  const runtime = await startRuntimeFixture({ externalReportsDirectory: directory });
  const streamController = new AbortController();
  const headers = { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" };
  const request = (path: string, init: RequestInit = {}) => fetch(`${runtime.baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  type Collection = { observations: ExternalObservation[]; capability: ExternalObservationCapability };
  async function waitForSequence(sequence: number) {
    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      const value = await (await request("/api/external-observations")).json() as Collection;
      if (value.observations[0]?.sequence === sequence && value.capability.connected) return value;
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error(`external_sequence_${sequence}_timeout`);
  }
  try {
    assert.equal((await fetch(`${runtime.baseUrl}/api/external-observations`)).status, 401);
    assert.equal((await request("/api/external-observations", { method: "POST", body: JSON.stringify(first) })).status, 405);
    assert.equal((await request("/api/external-observations/missing")).status, 404);
    const collection = await waitForSequence(1);
    assert.equal(collection.capability.enabled, true); assert.equal(collection.capability.mode, "opt_in_reporter");
    const id = collection.observations[0].id;
    assert.equal(collection.observations[0].creator.verification, "unknown");
    const bootstrap = await (await request("/api/bootstrap")).json() as { external_observations: ExternalObservation[]; external_observation_capability: ExternalObservationCapability };
    assert.equal(bootstrap.external_observations[0].id, id); assert.equal(bootstrap.external_observation_capability.enabled, true);
    const stream = await request("/api/events", { signal: streamController.signal });
    const reader = stream.body!.getReader();
    const change = (async () => {
      while (true) {
        const next = await reader.read();
        if (next.done) throw new Error("event_stream_closed");
        if (new TextDecoder().decode(next.value).includes("event: change")) return;
      }
    })();
    const second = await writeExternalReport(directory, { ...input, state: "completed", message: "Synthetic result, awaiting acceptance" });
    assert.equal(second.sequence, 2);
    await waitForSequence(2); await change;
    const detail = await (await request(`/api/external-observations/${id}`)).json() as { observation: ExternalObservation; messages: { text: string }[] };
    assert.equal(detail.observation.task_result, "reported_complete"); assert.equal(detail.observation.acceptance_state, "unknown");
    assert.equal(detail.messages.length, 2); assert.equal(detail.messages[1].text, "Synthetic result, awaiting acceptance");
    const database = new DatabaseSync(runtime.databasePath, { readOnly: true });
    try {
      for (const table of ["issues", "session_commands", "issue_sessions"]) assert.equal((database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count, 0, `${table} stays empty`);
    } finally { database.close(); }
    await reader.cancel(); streamController.abort();
    await runtime.restart(); await waitForSequence(2);
    const stale = { ...first, item_id: "different-item-old-sequence", state: "failed" as const };
    writeFileSync(join(directory, externalReportFileName(stale)), JSON.stringify(stale), { mode: 0o600 });
    await new Promise(resolve => setTimeout(resolve, 1300));
    const restored = await (await request(`/api/external-observations/${id}`)).json() as { observation: ExternalObservation; messages: unknown[] };
    assert.equal(restored.observation.sequence, 2); assert.equal(restored.observation.task_result, "reported_complete"); assert.equal(restored.messages.length, 2);
  } finally { streamController.abort(); await runtime.stop(); rmSync(directory, { recursive: true, force: true }); }
});

test("external reports are disabled unless explicitly configured", { timeout: 20_000 }, async () => {
  const runtime = await startRuntimeFixture();
  try {
    const response = await fetch(`${runtime.baseUrl}/api/external-observations`, { headers: { authorization: `Bearer ${runtime.token}` } });
    const body = await response.json() as { observations: unknown[]; capability: ExternalObservationCapability };
    assert.equal(response.status, 200); assert.equal(body.capability.enabled, false); assert.equal(body.capability.connected, false);
    assert.deepEqual(body.observations, []);
  } finally { await runtime.stop(); }
});
