import assert from "node:assert/strict";
import test from "node:test";
import type { ExternalObservation } from "../src/external-observations.js";
import { externalObservationCard, externalObservationPresentation, externalMatchesSearch, externalMessageGroups } from "../src/ui/features/board/external-model.js";

const now = Date.parse("2026-10-01T12:00:00Z");
const record: ExternalObservation = {
  id: "external-test", provider: "dot", account_id: "local-opt-in", host_id: "fixture", thread_id: "thread-test",
  title: "审查任务", description: "记录来源与执行状态", project_id: null, parent_thread_id: null,
  execution_state: "running", reported_execution_state: "running", task_result: "unknown", acceptance_state: "unknown",
  freshness: "fresh", reported_at: new Date(now).toISOString(), observed_at: new Date(now).toISOString(), updated_at: new Date(now).toISOString(),
  sequence: 1, source: { kind: "task_reporter", attribution: "declared" }, creator: { name: "dot", verification: "unknown", avatar: null },
};
const connection = { connected: true, receivedAt: now };

test("repeat presentation preserves original records and only folds contiguous identical messages", () => {
  const message = (sequence: number, text = "状态上报", role: "agent" | "system" = "agent") => ({ item_id: `report-${sequence}`, sequence, role, text, created_at: new Date(now + sequence * 1000).toISOString() });
  const messages = [message(1), message(2), message(3, "状态上报", "system"), message(4), message(5, "状态变化"), message(6), message(8), message(9, "状态上报 ")];
  const before = JSON.stringify(messages);
  const groups = externalMessageGroups(messages);
  assert.deepEqual(groups.map(group => group.messages.length), [2, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(groups.flatMap(group => group.messages), messages);
  assert.equal(groups[0].key, "report-1");
  assert.equal(groups[0].messages[0], messages[0]);
  assert.equal(JSON.stringify(messages), before);
  assert.deepEqual(externalMessageGroups([]), []);
});

test("external running, wait and failure are observations; completion awaits acceptance", () => {
  assert.equal(externalObservationPresentation(record, connection, now).status, "in_progress");
  for (const execution_state of ["waiting_user", "waiting_approval", "failed"] as const) {
    const view = externalObservationPresentation({ ...record, execution_state }, connection, now);
    assert.equal(view.status, "blocked"); assert.equal(view.execution, execution_state);
  }
  const complete = externalObservationPresentation({ ...record, execution_state: "idle", task_result: "reported_complete" }, connection, now);
  assert.equal(complete.status, "in_review"); assert.equal(complete.resultReady, true);
});

test("stale, disconnected and idle observations never become failed or todo", () => {
  for (const view of [
    externalObservationPresentation(record, { ...connection, connected: false }, now),
    externalObservationPresentation(record, connection, now + 30_001),
    externalObservationPresentation({ ...record, freshness: "stale" }, connection, now),
    externalObservationPresentation({ ...record, execution_state: "idle" }, connection, now),
  ]) assert.equal(view.status, "unknown");
  const completedStale = externalObservationPresentation({ ...record, task_result: "reported_complete" }, connection, now + 30_001);
  assert.equal(completedStale.status, "in_review");
  assert.equal(completedStale.execution, "unknown");
  assert.equal(completedStale.fresh, false);
});

test("observation card has no executable thread binding or asserted creator", () => {
  const card = externalObservationCard(record, connection, now);
  assert.equal(card.thread_id, null); assert.equal(card.run_thread_id, null);
  assert.equal(card.agent_enabled, false); assert.equal(card.session_owned, false); assert.equal(card.creator_user_id, null);
  assert.equal(card.external_observation.thread_id, record.thread_id);
  assert.match(card.external_presentation.sourceLabel, /自报/);
  assert.ok(externalMatchesSearch(record, "DOT")); assert.ok(externalMatchesSearch(record, "thread-test"));
  assert.equal(externalMatchesSearch(record, "unrelated"), false);
});
