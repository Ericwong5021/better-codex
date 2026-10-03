import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const version = "0.4.19-local.mcp.1";
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
function fixture(body = "") {
  const home = mkdtempSync(join(tmpdir(), "better-codex-local-test-"));
  const runtime = join(home, "runtime");
  mkdirSync(join(runtime, "versions", "0.4.18"), { recursive: true });
  mkdirSync(join(runtime, "compatibility"), { recursive: true });
  mkdirSync(join(home, "run"), { recursive: true });
  const old = join(runtime, "versions", "0.4.18", "better-codex.cjs");
  writeFileSync(old, "old immutable core");
  const pointer = Buffer.from(JSON.stringify({ current: "0.4.18", previous: "0.4.17", executable: old, updatedAt: "original" }, null, 2) + "\n");
  const compatibility = Buffer.from('{ "current": "0.4.18", "previous": null, "failures": 0 }\n');
  writeFileSync(join(runtime, "current.json"), pointer);
  writeFileSync(join(runtime, "compatibility", "current.json"), compatibility);
  writeFileSync(join(home, "better-codex.db"), "business database sentinel");
  const executable = join(home, "package.cjs");
  writeFileSync(executable, `${body}\nconsole.log(JSON.stringify({core:${JSON.stringify(version)}}));\n`);
  const options = { executable, version, sha256: hash(readFileSync(executable)) };
  return { home, runtime, old, pointer, compatibility, options, cleanup: () => rmSync(home, { recursive: true, force: true }) };
}
function invoke(home: string, expression: string) {
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `const activation = await import('./src/local-core-activation.ts'); try { console.log(JSON.stringify(${expression})); } catch (error) { console.error(error.message); process.exitCode = 1; }`], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: join(home, "peer"), BETTER_CODEX_PROFILE: "development", CODEX_HOME: join(home, "original-codex"), BETTER_CODEX_DB: join(home, "better-codex.db"), OPENAI_API_KEY: "test-must-not-reach-validation" },
  });
}
function activate(f: ReturnType<typeof fixture>, options = f.options) { return invoke(f.home, `activation.activateLocalCore(${JSON.stringify(options)})`); }
function selected(f: ReturnType<typeof fixture>) {
  const result = activate(f);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as { operation_id: string; pendingRestart: boolean; executable: string };
}
function unchanged(f: ReturnType<typeof fixture>) {
  assert.deepEqual(readFileSync(join(f.runtime, "current.json")), f.pointer);
  assert.deepEqual(readFileSync(join(f.runtime, "compatibility", "current.json")), f.compatibility);
  assert.equal(readFileSync(f.old, "utf8"), "old immutable core");
  assert.equal(readFileSync(join(f.home, "better-codex.db"), "utf8"), "business database sentinel");
  assert.equal(existsSync(join(f.home, "run", "runtime.lock")), false);
  assert.equal(existsSync(join(f.runtime, "update.json.lock")), false);
}

test("local selection copies verified bytes, records exact backups, and retains a live Host", () => {
  const f = fixture();
  try {
    const host = Buffer.from(JSON.stringify({ pid: process.pid, instanceId: "host-preserved" }));
    writeFileSync(join(f.home, "run", "session-host.lock"), host);
    const result = selected(f);
    assert.equal(result.pendingRestart, true);
    assert.deepEqual(readFileSync(result.executable), readFileSync(f.options.executable));
    assert.deepEqual(readFileSync(join(f.home, "run", "session-host.lock")), host);
    assert.equal(readFileSync(f.old, "utf8"), "old immutable core");
    assert.deepEqual(readFileSync(join(f.runtime, "local-core-activations", result.operation_id, "core.before")), f.pointer);
    assert.deepEqual(readFileSync(join(f.runtime, "local-core-activations", result.operation_id, "compatibility.before")), f.compatibility);
    const journal = JSON.parse(readFileSync(join(f.runtime, "local-core-activation.json"), "utf8"));
    assert.equal(journal.trust, "explicit-local-sha256");
    assert.equal(journal.phase, "selected");
    assert.equal(journal.lastAuthorityGeneration, 0);
    assert.equal(existsSync(join(f.home, "run", "runtime.lock")), false);
  } finally { f.cleanup(); }
});

test("local rollback restores byte-exact pointers without touching business data", () => {
  const f = fixture();
  try {
    const result = selected(f);
    const wrong = invoke(f.home, `activation.rollbackLocalCore('00000000-0000-0000-0000-000000000000')`);
    assert.match(wrong.stderr, /operation_mismatch/);
    const rollback = invoke(f.home, `activation.rollbackLocalCore(${JSON.stringify(result.operation_id)})`);
    assert.equal(rollback.status, 0, rollback.stderr);
    unchanged(f);
    assert.equal(existsSync(result.executable), true);
  } finally { f.cleanup(); }
});

test("path traversal, invalid hashes, bad bytes and mismatched package versions do not publish", () => {
  const f = fixture();
  try {
    for (const invalid of ["../0.4.19", "0.4.19/child", "0.4.19\\child", "0.4.19\n", " 0.4.19"]) {
      assert.match(activate(f, { ...f.options, version: invalid }).stderr, /version_invalid/);
    }
    assert.match(activate(f, { ...f.options, sha256: "invalid" }).stderr, /sha256_invalid/);
    assert.match(activate(f, { ...f.options, sha256: "0".repeat(64) }).stderr, /artifact_hash_mismatch/);
    assert.match(activate(f, { ...f.options, version: "0.4.20-local.1" }).stderr, /version_mismatch/);
    unchanged(f);
  } finally { f.cleanup(); }
});

test("immutable version conflicts reject replacement even when the existing pointer differs", () => {
  const f = fixture();
  try {
    const existing = join(f.runtime, "versions", version, "better-codex.cjs");
    mkdirSync(join(f.runtime, "versions", version));
    writeFileSync(existing, "do not overwrite");
    assert.match(activate(f).stderr, /version_conflict/);
    assert.equal(readFileSync(existing, "utf8"), "do not overwrite");
    unchanged(f);
  } finally { f.cleanup(); }
});

test("corrupt managed pointers cannot hash arbitrary files or traverse symlink directories", () => {
  for (const attack of ["arbitrary", "traversal", "symlink-directory"]) {
    const f = fixture();
    try {
      const pointer = JSON.parse(f.pointer.toString());
      if (attack === "arbitrary") pointer.executable = join(f.home, "better-codex.db");
      if (attack === "traversal") pointer.current = "../outside";
      if (attack === "symlink-directory") {
        const original = join(f.runtime, "versions", "0.4.18");
        const elsewhere = join(f.home, "elsewhere");
        mkdirSync(elsewhere);
        writeFileSync(join(elsewhere, "better-codex.cjs"), "secret sentinel");
        rmSync(original, { recursive: true });
        symlinkSync(elsewhere, original, "dir");
      }
      writeFileSync(join(f.runtime, "current.json"), JSON.stringify(pointer));
      const before = readFileSync(join(f.runtime, "current.json"));
      assert.match(activate(f).stderr, /source_pointer_invalid/);
      assert.deepEqual(readFileSync(join(f.runtime, "current.json")), before);
      assert.equal(existsSync(join(f.runtime, "local-core-activation.json")), false);
    } finally { f.cleanup(); }
  }
});

test("empty, oversized and symlink source artifacts are rejected before execution", () => {
  for (const attack of ["empty", "oversized", "symlink"]) {
    const f = fixture();
    try {
      if (attack === "empty") truncateSync(f.options.executable, 0);
      if (attack === "oversized") truncateSync(f.options.executable, 256 * 1024 * 1024 + 1);
      if (attack === "symlink") {
        rmSync(f.options.executable);
        symlinkSync(f.old, f.options.executable);
      }
      assert.match(activate(f).stderr, /artifact_invalid/);
      unchanged(f);
    } finally { f.cleanup(); }
  }
});

test("validation receives isolated homes and no production database or provider credentials", () => {
  const f = fixture("if (process.env.OPENAI_API_KEY || process.env.BETTER_CODEX_DB || process.env.CODEX_HOME.includes('original-codex') || !process.env.HOME.includes('local-validation') || process.env.BETTER_CODEX_DISABLE_DELEGATION !== '1') process.exit(2);");
  try { selected(f); assert.equal(existsSync(join(f.home, "original-codex")), false); } finally { f.cleanup(); }
});

test("a Runtime that starts during isolated validation fences final publication", () => {
  const f = fixture();
  try {
    writeFileSync(f.options.executable, `require('node:fs').writeFileSync(${JSON.stringify(join(f.home, "run", "runtime.json"))}, JSON.stringify({pid:process.ppid,port:9999,instanceId:'appeared'})); console.log(JSON.stringify({core:${JSON.stringify(version)}}));`);
    f.options.sha256 = hash(readFileSync(f.options.executable));
    assert.match(activate(f).stderr, /runtime_running/);
    unchanged(f);
    const journal = JSON.parse(readFileSync(join(f.runtime, "local-core-activation.json"), "utf8"));
    assert.equal(journal.phase, "staged");
    const repeat = activate(f);
    assert.match(repeat.stderr, /recovery_required/);
    const rollback = invoke(f.home, `activation.rollbackLocalCore(${JSON.stringify(journal.operationId)})`);
    assert.equal(rollback.status, 0, rollback.stderr);
    unchanged(f);
  } finally { f.cleanup(); }
});

test("running Runtime, malformed state and pending signed updates fail closed", () => {
  for (const [relative, value, error] of [
    ["run/runtime.json", JSON.stringify({ pid: process.pid, port: 9999, instanceId: "existing" }), "runtime_running"],
    ["run/runtime.json", "broken JSON", "state_invalid"],
    ["run/runtime.lock", JSON.stringify({ pid: process.pid, instanceId: "other" }), "runtime_lock_present"],
    ["run/runtime-authority.json", JSON.stringify({ generation: 9, status: "reserved", updateId: "pending" }), "authority_active"],
    ["runtime/update-activation.json", JSON.stringify({ status: "activating" }), "update_pending"],
    ["runtime/update-activation.json", JSON.stringify({ status: "error", stage: "recovery_failed" }), "update_pending"],
    ["runtime/rollback.json", JSON.stringify({ phase: "staged" }), "update_pending"],
    ["run/update-client.json", "{}", "update_receipt_pending"],
  ]) {
    const f = fixture();
    try {
      writeFileSync(join(f.home, relative), value);
      assert.match(activate(f).stderr, new RegExp(error));
      assert.deepEqual(readFileSync(join(f.runtime, "current.json")), f.pointer);
      assert.equal(readFileSync(join(f.home, relative), "utf8"), value);
      assert.equal(existsSync(join(f.runtime, "update.json.lock")), false);
    } finally { f.cleanup(); }
  }
});

test("an existing official update lock is preserved and blocks local activation", () => {
  const f = fixture();
  try {
    const lock = '{"pid":1,"token":"official-update"}';
    writeFileSync(join(f.runtime, "update.json.lock"), lock);
    assert.match(activate(f).stderr, /coordinator_busy/);
    assert.equal(readFileSync(join(f.runtime, "update.json.lock"), "utf8"), lock);
    assert.deepEqual(readFileSync(join(f.runtime, "current.json")), f.pointer);
  } finally { f.cleanup(); }
});

test("rollback recovers interrupted publishing and rejects changed authority generations", () => {
  const f = fixture();
  try {
    const selectedResult = selected(f);
    const path = join(f.runtime, "local-core-activation.json");
    const journal = JSON.parse(readFileSync(path, "utf8"));
    journal.phase = "publishing";
    writeFileSync(path, JSON.stringify(journal));
    writeFileSync(join(f.home, "run", "runtime-authority.json"), JSON.stringify({ generation: 1, status: "claimed", runtimePid: 2147483647, updateId: null }));
    assert.match(invoke(f.home, `activation.rollbackLocalCore(${JSON.stringify(selectedResult.operation_id)})`).stderr, /rollback_superseded/);
    rmSync(join(f.home, "run", "runtime-authority.json"));
    assert.equal(invoke(f.home, `activation.rollbackLocalCore(${JSON.stringify(selectedResult.operation_id)})`).status, 0);
    unchanged(f);
  } finally { f.cleanup(); }
});
