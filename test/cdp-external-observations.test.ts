import assert from "node:assert/strict";
import test from "node:test";
import { cdpBridgeRequestAllowed } from "../src/cdp.js";

test("desktop bridge admits external observation reads without report/mutation authority", () => {
  const detail = `/api/external-observations/external-${"a".repeat(64)}`;
  for (const path of ["/api/external-observations", "/api/external-observations?locale=zh-CN", detail, `${detail}?locale=en`]) {
    assert.equal(cdpBridgeRequestAllowed(path, "GET"), true);
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(cdpBridgeRequestAllowed(path, method), false);
  }
  for (const path of ["/api/external-observations/report", "/api/external-observations/../report", "/api/external-observations/external-a", "/api/external-observations#fragment", "/api/external-observations-other"]) assert.equal(cdpBridgeRequestAllowed(path, "GET"), false);
  assert.equal(cdpBridgeRequestAllowed("/api/bootstrap?locale=en", "GET"), false);
  assert.equal(cdpBridgeRequestAllowed("/api/issues", "POST"), false);
  assert.equal(cdpBridgeRequestAllowed("/api/issues", "TRACE"), false);
});


test("native bridge cannot mutate product data or call production Mockup APIs", () => {
  for (const path of ["/api/bootstrap", "/api/projects", "/api/issues", "/api/agents", "/api/settings/auto-dispatch", "/api/mockup/reset", "/api/update/install"]) {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) assert.equal(cdpBridgeRequestAllowed(path, method), false);
  }
  assert.equal(cdpBridgeRequestAllowed("/api/issues/from-thread?thread_id=thread-1", "GET"), true);
  assert.equal(cdpBridgeRequestAllowed("/api/issues/issue-1/session-handoff", "POST"), true);
  assert.equal(cdpBridgeRequestAllowed("/api/session-relay/poll", "POST"), true);
  assert.equal(cdpBridgeRequestAllowed("/api/session-relay/commands/command-1/complete", "POST"), true);
  assert.equal(cdpBridgeRequestAllowed("/api/session-relay/commands/../complete", "POST"), false);
});
