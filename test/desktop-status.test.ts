import assert from "node:assert/strict";
import test from "node:test";
import { desktopStatus } from "../src/desktop-status.js";
import type { RuntimeState } from "../src/runtime-state.js";

const state: RuntimeState = {
  pid: 123, port: 4317, instanceId: "runtime-one", version: "1.2.3", generation: 4,
  startedAt: new Date().toISOString(), processStartedAt: new Date().toISOString(),
  handoffUpdateId: null, handoffRecovery: false, handoffHostReplacement: false,
};
const healthy = { ...state, ok: true, runtime_identity: { ok: true }, desktop: { state: "waiting_window" } };
function reply(body: unknown, status = 200): typeof fetch {
  return (async (url, options) => {
    assert.equal(url, "http://127.0.0.1:4317/readyz");
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal);
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

test("menu bar reports Runtime readiness separately from a closed Codex window", async () => {
  const value = await desktopStatus(state, true, reply(healthy));
  assert.equal(value.runtime, "ready");
  assert.equal(value.desktop, "waiting_window");
  assert.equal(value.instanceId, state.instanceId);
});

test("a process that answers but has failed dependencies is never shown as ready", async () => {
  const value = await desktopStatus(state, true, reply({ ...healthy, ok: false, database: { ok: false } }, 503));
  assert.equal(value.runtime, "degraded");
  assert.equal(value.error, "database_not_ready");
});

test("menu bar rejects a stale process identity or an unverified Runtime lock", async () => {
  for (const override of [{ pid: 124 }, { instanceId: "replacement" }, { generation: 5 }, { version: "1.2.4" }]) {
    const value = await desktopStatus(state, true, reply({ ...healthy, ...override }));
    assert.equal(value.runtime, "unavailable");
    assert.equal(value.error, "runtime_identity_mismatch");
  }
  assert.equal((await desktopStatus(state, true, reply({ ...healthy, runtime_identity: { ok: false } }))).runtime, "degraded");
});

test("stopped Runtime does not make requests or start any services", async () => {
  const request = (() => { throw new Error("must_not_call"); }) as typeof fetch;
  const value = await desktopStatus(null, false, request);
  assert.equal(value.runtime, "stopped");
  assert.equal(value.desktop, "disabled");
  assert.equal(value.pid, null);
});

test("transport failure clears readiness instead of retaining the previous green state", async () => {
  const request = (async () => { throw new Error("connection_refused"); }) as typeof fetch;
  const value = await desktopStatus(state, true, request);
  assert.equal(value.runtime, "unavailable");
  assert.equal(value.error, "connection_refused");
});
