import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("Dot producer retains offline events, fences changed retries and requires committed readback", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "bc-dot-outbox-"));
  const directory = join(root, "outbox");
  const script = resolve("plugins/better-codex/skills/dot-reporting/scripts/outbox.py");
  const invoke = (...args: string[]) => {
    const child = spawnSync("python3", [script, ...args, "--directory", directory], { encoding: "utf8" });
    assert.ifError(child.error);
    return { code: child.status, value: JSON.parse(child.status === 0 ? child.stdout : child.stderr) };
  };
  const save = (name: string, value: unknown) => { const path = join(root, name); writeFileSync(path, JSON.stringify(value)); return path; };
  const report = { schema_version: 2, provider: "dot", account_id: "declared-account", host_id: "cloud",
    source_task_id: "stable-task", source_run_id: "run-1", run_number: 1, event_id: "event-1", sequence: 1, version: 1,
    title: "Offline fixture", state: "running", reported_at: new Date().toISOString() };
  try {
    const reportFile = save("report.json", report);
    assert.equal(invoke("enqueue", "--report", reportFile).value.status, "pending");
    // Each invocation is a new producer process: a restart cannot lose or regenerate the event.
    assert.deepEqual(invoke("next").value.report, report);
    assert.equal(invoke("enqueue", "--report", reportFile).value.reused, true);
    const before = readFileSync(join(directory, "queue.json"), "utf8");
    assert.equal(invoke("enqueue", "--report", save("changed.json", { ...report, title: "Changed" })).value.error, "outbox_event_id_conflict");
    assert.equal(readFileSync(join(directory, "queue.json"), "utf8"), before);
    assert.equal(invoke("enqueue", "--report", save("old.json", { ...report, event_id: "event-old" })).value.error, "outbox_non_monotonic_event");
    const receipt = { status: "duplicate", id: "external-fixture", observation: { ...report } };
    const event = { event_id: report.event_id, task_id: receipt.id, outcome: "applied", sequence: 1, source_version: 1,
      source_run_id: "run-1", state: "running", cursor: 7, observed_at: new Date().toISOString() };
    const receiptFile = save("receipt.json", receipt);
    const eventsFile = save("events.json", { events: [{ ...event, outcome: "stale_run" }] });
    assert.equal(invoke("ack", "--event-id", report.event_id, "--receipt", receiptFile, "--events", eventsFile).value.error, "outbox_application_not_confirmed");
    assert.equal(invoke("status").value.pending, 1);
    save("events.json", { events: [{ ...event, task_id: "another-task" }] });
    assert.equal(invoke("ack", "--event-id", report.event_id, "--receipt", receiptFile, "--events", eventsFile).code, 1);
    save("events.json", { events: [event] });
    save("receipt.json", { ...receipt, observation: { ...report, source_task_id: "another-task" } });
    assert.equal(invoke("ack", "--event-id", report.event_id, "--receipt", receiptFile, "--events", eventsFile).value.error, "outbox_receipt_identity_mismatch");
    save("receipt.json", receipt);
    assert.equal(invoke("ack", "--event-id", report.event_id, "--receipt", receiptFile, "--events", eventsFile).value.status, "confirmed");
    assert.equal(invoke("next").value.status, "empty");
    assert.deepEqual(invoke("status").value, { pending: 0, confirmed: 1 });
    assert.equal(invoke("enqueue", "--report", reportFile).value.status, "confirmed");
  } finally { rmSync(root, { recursive: true, force: true }); }
});
