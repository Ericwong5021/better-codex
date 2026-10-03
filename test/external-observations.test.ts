import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { Store } from "../src/db.js";
import { ExternalObservationStore, externalObservationId, externalReportFileName, normalizeExternalReport, type ExternalReport } from "../src/external-observations.js";
import { ExternalReportWatcher } from "../src/external-report-watcher.js";
import { writeExternalReport } from "../src/external-reporter.js";

const baseReport = (patch: Partial<ExternalReport> = {}): ExternalReport => ({ schema_version: 1, provider: "codex", account_id: "synthetic-account", host_id: "synthetic-host", thread_id: "synthetic-thread", sequence: 1, item_id: "synthetic-item-1", reported_at: new Date().toISOString(), state: "running", title: "Synthetic observed task", description: "", project_id: null, parent_thread_id: "declared-parent", creator_name: "dot", message: null, ...patch });

test("external observations persist separately; never allocate owned Issues or commands", () => {
  const home = mkdtempSync(join(tmpdir(), "external-observation-store-"));
  const store = new Store(join(home, "runtime.db"));
  try {
    const external = new ExternalObservationStore(store.db);
    external.ingest({ ...baseReport(), agent_enabled: true, creator: { verification: "verified", avatar: "https://signed.example/secret" } });
    assert.equal(store.listIssues().length, 0);
    assert.equal((store.db.prepare("SELECT COUNT(*) AS count FROM session_commands").get() as { count: number }).count, 0);
    const observation = external.list(true)[0];
    assert.equal(observation.creator.name, "dot"); assert.equal(observation.creator.verification, "unknown");
    assert.equal(observation.creator.avatar, null); assert.equal(observation.acceptance_state, "unknown");
    assert.equal("agent_enabled" in observation, false); assert.doesNotMatch(JSON.stringify(observation), /signed.example/);
  } finally { store.close(); rmSync(home, { recursive: true, force: true }); }
});

test("deduplication and sequence watermarks survive database close/reopen", () => {
  const home = mkdtempSync(join(tmpdir(), "external-observation-restart-"));
  const file = join(home, "runtime.db");
  let db = new DatabaseSync(file);
  try {
    let external = new ExternalObservationStore(db);
    const report = baseReport({ sequence: 10, item_id: "item-10", state: "waiting_user" });
    assert.equal(external.ingest(report).status, "applied");
    assert.equal(external.ingest({ ...report, sequence: 11, state: "running" }).status, "duplicate");
    db.close(); db = new DatabaseSync(file); external = new ExternalObservationStore(db);
    assert.equal(external.ingest(baseReport({ sequence: 9, item_id: "item-9" })).status, "out_of_order");
    assert.equal(external.ingest({ ...report, item_id: "other-item-same-sequence" }).status, "out_of_order");
    assert.equal(external.list(true)[0].sequence, 10);
    assert.equal(external.list(true)[0].execution_state, "waiting_user");
    assert.equal(external.messages(externalObservationId(report)).length, 1);
    assert.equal(external.ingest(baseReport({ sequence: 11, item_id: "item-11", state: "completed" })).status, "applied");
    assert.equal(external.list(true)[0].task_result, "reported_complete");
  } finally { db.close(); rmSync(home, { recursive: true, force: true }); }
});

test("namespace key separates provider, account, host and thread without using titles", () => {
  const base = baseReport();
  const id = externalObservationId(base);
  assert.equal(externalObservationId({ ...base, title: "Renamed" } as ExternalReport), id);
  for (const key of ["provider", "account_id", "host_id", "thread_id"] as const) assert.notEqual(externalObservationId({ ...base, [key]: "different" }), id);
});

test("freshness is independent of reported execution and task result; idle never means done", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const external = new ExternalObservationStore(db);
    const now = Date.now();
    external.ingest(baseReport({ state: "idle", reported_at: new Date(now).toISOString() }), now);
    assert.equal(external.list(true, now)[0].task_result, "unknown");
    external.ingest(baseReport({ sequence: 2, item_id: "item-2", state: "completed", reported_at: new Date(now).toISOString() }), now);
    const stale = external.list(true, now + 30_000)[0];
    assert.equal(stale.execution_state, "unknown"); assert.equal(stale.reported_execution_state, "idle");
    assert.equal(stale.freshness, "stale"); assert.equal(stale.task_result, "reported_complete");
    assert.equal(stale.acceptance_state, "unknown");
    assert.equal(external.list(false, now)[0].freshness, "disconnected");
    assert.equal(external.list(false, now)[0].execution_state, "unknown");
  } finally { db.close(); }
});

test("waiting input, approval and failure remain precise execution states", () => {
  const db = new DatabaseSync(":memory:");
  try {
    const external = new ExternalObservationStore(db);
    for (const [index, state] of (["waiting_user", "waiting_approval", "failed"] as const).entries()) {
      external.ingest(baseReport({ sequence: index + 1, item_id: `item-${index}`, state }));
      assert.equal(external.list(true)[0].execution_state, state); assert.equal(external.list(true)[0].task_result, "unknown");
    }
  } finally { db.close(); }
});

test("malformed, future-dated and oversized reports are rejected before persistence", () => {
  for (const patch of [{ sequence: 0 }, { state: "done" }, { creator_name: "x".repeat(161) }, { reported_at: new Date(Date.now() + 60_000).toISOString() }, { thread_id: "" }, { message: "x".repeat(20_001) }]) {
    assert.throws(() => normalizeExternalReport({ ...baseReport(), ...patch }), /invalid_external_/);
  }
});

test("atomic reporter and resident watcher replay journal messages, dedupe and persist restart watermark", async () => {
  const home = mkdtempSync(join(tmpdir(), "external-observation-journal-"));
  const spool = join(home, "spool");
  const db = new DatabaseSync(join(home, "runtime.db"));
  const external = new ExternalObservationStore(db);
  let watcher = new ExternalReportWatcher(external, { directory: spool });
  try {
    const first = await writeExternalReport(spool, baseReport({ message: "First real-shaped synthetic report" }));
    const second = await writeExternalReport(spool, baseReport({ item_id: "second-item", state: "waiting_approval", message: "Approval required" }));
    assert.equal(first.sequence, 1); assert.equal(second.sequence, 2);
    await watcher.poll();
    assert.equal(external.list(true)[0].sequence, 2); assert.equal(external.messages(externalObservationId(first)).length, 2);
    await watcher.poll(); assert.equal(external.messages(externalObservationId(first)).length, 2);
    await watcher.stop(); watcher = new ExternalReportWatcher(external, { directory: spool });
    await watcher.poll(); assert.equal(external.list(true)[0].sequence, 2);
    const third = await writeExternalReport(spool, baseReport({ item_id: "third-item", state: "completed" }));
    await watcher.poll(); assert.equal(external.list(true)[0].task_result, "reported_complete");
    assert.equal(external.messages(externalObservationId(third)).length, 3);
    rmSync(spool, { recursive: true }); await watcher.poll();
    assert.equal(watcher.capability().connected, false);
    assert.equal(external.list(false)[0].task_result, "reported_complete");
  } finally { await watcher.stop(); db.close(); rmSync(home, { recursive: true, force: true }); }
});

test("watcher rejects forged filenames before ingest and will not follow report symlinks", async () => {
  const home = mkdtempSync(join(tmpdir(), "external-observation-safety-"));
  const db = new DatabaseSync(":memory:"); const external = new ExternalObservationStore(db);
  const watcher = new ExternalReportWatcher(external, { directory: home });
  try {
    const report = baseReport();
    writeFileSync(join(home, externalReportFileName(report)), JSON.stringify({ ...report, thread_id: "forged-thread" }), { mode: 0o600 });
    const other = baseReport({ thread_id: "linked-thread" });
    symlinkSync(join(home, externalReportFileName(report)), join(home, externalReportFileName(other)));
    await watcher.poll(); assert.equal(external.list(true).length, 0); assert.equal(watcher.capability().rejected_reports, 1);
    await watcher.poll(); assert.equal(watcher.capability().rejected_reports, 1, "unchanged invalid file does not spam repeated errors");
    chmodSync(home, 0o777); await watcher.poll();
    assert.equal(watcher.capability().connected, false); assert.equal(watcher.capability().error, "external_spool_permissions");
  } finally { chmodSync(home, 0o700); await watcher.stop(); db.close(); rmSync(home, { recursive: true, force: true }); }
});

test("writer lock fails visibly rather than taking over an uncertain writer", async () => {
  const home = mkdtempSync(join(tmpdir(), "external-observation-lock-"));
  try {
    const report = baseReport(); writeFileSync(join(home, `${externalObservationId(report)}.lock`), "", { mode: 0o600 });
    await assert.rejects(writeExternalReport(home, report), /external_report_writer_locked/);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
