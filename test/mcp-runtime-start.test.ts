import assert from "node:assert/strict";
import test from "node:test";
import { createMcpRuntimeStarter, type McpRuntimeStartDependencies } from "../src/mcp-runtime-start.js";
import type { RuntimeState } from "../src/runtime-state.js";

const state: RuntimeState = {
  pid: 123, port: 4318, instanceId: "runtime-start-test", version: "1.2.3", generation: 8,
  startedAt: new Date().toISOString(), processStartedAt: new Date().toISOString(),
  handoffUpdateId: null, handoffRecovery: false, handoffHostReplacement: false,
};
const ready = { stdout: JSON.stringify({ runtime: "ready", instanceId: state.instanceId, version: state.version, token: "must-stay-private", home: "/private/home" }), stderr: "" };

function fixture(overrides: McpRuntimeStartDependencies = {}) {
  const diagnostics: Record<string, unknown>[] = [];
  const start = createMcpRuntimeStarter({
    installationCommand: () => ["/stable/node", "/stable/launcher.cjs"],
    execute: async () => ready,
    environment: { PATH: "/test/bin", BETTER_CODEX_PROFILE: "stable", BETTER_CODEX_HOME: "/wrong/home" },
    profile: "development", home: "/test/home", readRuntimeState: () => state,
    diagnostic: fields => { diagnostics.push(fields); },
    ...overrides,
  });
  return { start, diagnostics };
}

test("MCP startup uses the stable installation entrypoint and fixed desktop start arguments", async () => {
  let calls = 0;
  const { start } = fixture({ execute: async (file, args, options) => {
    calls++;
    assert.equal(file, "/stable/node");
    assert.deepEqual(args, ["/stable/launcher.cjs", "desktop", "start"]);
    assert.equal(options.shell, false);
    assert.equal(options.timeout, 75_000);
    assert.equal(options.encoding, "utf8");
    assert.equal(options.windowsHide, true);
    assert.equal(options.env?.BETTER_CODEX_PROFILE, "development");
    assert.equal(options.env?.BETTER_CODEX_HOME, "/test/home");
    assert.equal(options.env?.PATH, "/test/bin");
    return ready;
  } });
  // Tool input is not part of this API and cannot become executable arguments.
  assert.deepEqual(await Reflect.apply(start, undefined, [{ command: "echo unsafe", args: ["--refresh"] }]), { ready: true });
  assert.equal(calls, 1);
});

test("concurrent MCP startup clicks share one pending operation", async () => {
  let calls = 0;
  let finish!: (result: typeof ready) => void;
  const { start } = fixture({ execute: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = start();
  const second = start();
  assert.equal(first, second);
  assert.equal(calls, 1);
  finish(ready);
  assert.deepEqual(await first, { ready: true });
  assert.deepEqual(await second, { ready: true });
});

test("startup requires verified ready JSON and retains dependency errors", async () => {
  for (const [stdout, message] of [
    ["not-json", "mcp_runtime_start_invalid_response"],
    [JSON.stringify({ runtime: "degraded", error: "database_not_ready" }), "database_not_ready"],
    [JSON.stringify({ runtime: "stopped" }), "runtime_not_ready"],
    [JSON.stringify({ ok: true }), "runtime_not_ready"],
  ]) {
    const { start, diagnostics } = fixture({ execute: async () => ({ stdout, stderr: "" }) });
    await assert.rejects(start(), error => error instanceof Error && error.message === message);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].phase, "verify_ready");
    assert.equal(diagnostics[0].outcome, "not_ready");
    assert.equal(diagnostics[0].error, message);
  }
});

test("timeout and launch failures retain identity diagnostics and allow retry", async () => {
  for (const failure of [new Error("mcp_runtime_start_timeout"), new Error("desktop_exit_update_in_progress"), new Error("spawn ENOENT")]) {
    let calls = 0;
    const { start, diagnostics } = fixture({ execute: async () => {
      if (++calls === 1) throw failure;
      return ready;
    } });
    await assert.rejects(start(), error => error === failure);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].profile, "development");
    assert.equal(diagnostics[0].home, "/test/home");
    assert.equal(diagnostics[0].runtime_instance_id, state.instanceId);
    assert.equal(diagnostics[0].runtime_pid, state.pid);
    assert.equal(diagnostics[0].runtime_generation, state.generation);
    assert.equal(diagnostics[0].phase, "launch");
    assert.equal(diagnostics[0].outcome, "unknown");
    assert.equal(diagnostics[0].error, failure.message);
    assert.deepEqual(await start(), { ready: true });
    assert.equal(calls, 2);
  }
});

test("scheduler startup is rejected before installation lookup or execution", async () => {
  const { start, diagnostics } = fixture({
    environment: { BETTER_CODEX_SCHEDULER: "1" },
    installationCommand: () => { throw new Error("must_not_resolve"); },
    execute: async () => { throw new Error("must_not_execute"); },
    readRuntimeState: () => { throw new Error("must_not_inspect"); },
  });
  await assert.rejects(start(), /mcp_scheduler_access_denied/);
  assert.equal(diagnostics[0].phase, "admission");
  assert.equal(diagnostics[0].outcome, "rejected");
  assert.equal(diagnostics[0].runtime_instance_id, null);
});

test("an unavailable installation never invokes an executor and remains retryable", async () => {
  let lookups = 0;
  const failure = new Error("installation_base_entrypoint_required");
  const { start } = fixture({ installationCommand: () => {
    if (++lookups === 1) throw failure;
    return ["/stable/node", "/stable/launcher.cjs"];
  } });
  await assert.rejects(start(), error => error === failure);
  assert.deepEqual(await start(), { ready: true });
});

test("the asynchronous executor parses CLI output and preserves a real CLI failure", async () => {
  const starter = (source: string) => createMcpRuntimeStarter({
    installationCommand: () => [process.execPath, "-e", source, "--"],
    environment: {}, profile: "development", home: "/unused-fixture-home",
    readRuntimeState: () => null, diagnostic: () => {},
  });
  assert.deepEqual(await starter(`
    if (JSON.stringify(process.argv.slice(1)) !== '["desktop","start"]') process.exit(2);
    process.stdout.write(JSON.stringify({ runtime: "ready" }));
  `)(), { ready: true });
  await assert.rejects(starter(`
    process.stderr.write("storage_not_ready\\n");
    process.exitCode = 1;
  `)(), error => error instanceof Error && error.message === "storage_not_ready");
});
