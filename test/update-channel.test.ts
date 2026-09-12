import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";
import test from "node:test";
import { bundledCompatibility, compareVersions, coreVersion } from "../src/compatibility.js";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1"));

function cliResult(home: string, args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
  });
}

function runCli(home: string, args: string[]) {
  const result = cliResult(home, args);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `cli_exit_${result.status}`);
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

function nextBetaVersion(version = coreVersion) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error(`invalid_test_version:${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}-beta.1`;
}

test("update channel selection persists without changing the shared home", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-channel-"));
  try {
    const preview = runCli(home, ["update", "channel", "preview"]);
    assert.equal(preview.channel, "preview");
    assert.equal(preview.previous, "stable");
    assert.equal(preview.changed, true);
    const state = JSON.parse(readFileSync(join(home, "runtime", "channel.json"), "utf8")) as { channel?: string };
    assert.equal(state.channel, "preview");

    const stable = runCli(home, ["update", "channel", "stable"]);
    assert.equal(stable.channel, "stable");
    assert.equal(stable.previous, "preview");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("gateway update state invalidates cached channel identity after a switch", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-gateway-channel-"));
  try {
    const script = [
      'const updater = await import("./src/updater.ts");',
      'updater.setUpdateChannel("preview");',
      'const preview = updater.getGatewayUpdateState();',
      'updater.setUpdateChannel("stable");',
      'const stable = updater.getGatewayUpdateState();',
      'console.log(JSON.stringify({ preview, stable }));',
    ].join("");
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const state = JSON.parse(result.stdout) as { preview: { channel?: string }; stable: { channel?: string; status?: string } };
    assert.equal(state.preview.channel, "preview");
    assert.equal(state.stable.channel, "stable");
    assert.equal(state.stable.status, "idle");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("release and beta versions only move forward automatically", () => {
  assert.ok(compareVersions("0.4.2-beta.1", "0.4.1") > 0);
  assert.ok(compareVersions("0.4.2-beta.2", "0.4.2-beta.1") > 0);
  assert.ok(compareVersions("0.4.2", "0.4.2-beta.2") > 0);
  assert.ok(compareVersions("0.4.2", "0.4.3-beta.1") < 0);
});

test("public rollback restores both managed core and compatibility pointers", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-rollback-"));
  const nextVersion = nextBetaVersion();
  try {
    const runtime = join(home, "runtime");
    mkdirSync(join(runtime, "compatibility"), { recursive: true });
    mkdirSync(join(runtime, "compatibility", "versions", nextVersion), { recursive: true });
    mkdirSync(join(runtime, "versions", nextVersion), { recursive: true });
    writeFileSync(join(runtime, "current.json"), JSON.stringify({
      current: nextVersion,
      previous: coreVersion,
      executable: join(runtime, "versions", nextVersion, process.platform === "win32" ? "better-codex.exe" : "better-codex"),
      updatedAt: new Date().toISOString(),
    }));
    writeFileSync(join(runtime, "compatibility", "current.json"), JSON.stringify({
      current: nextVersion,
      previous: "0.3.10",
      failures: 0,
      updatedAt: new Date().toISOString(),
    }));
    writeFileSync(join(runtime, "compatibility", "versions", nextVersion, "manifest.json"), JSON.stringify({
      ...bundledCompatibility,
      version: nextVersion,
      minimumCoreVersion: coreVersion,
    }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      before: { core: null, compatibility: null },
      after: { core: nextVersion, compatibility: nextVersion },
      updatedAt: new Date().toISOString(),
    }));

    const result = runCli(home, ["update", "rollback"]) as {
      rolledBack?: boolean;
      core?: { rolledBack?: boolean };
      compatibility?: { rolledBack?: boolean };
    };
    assert.equal(result.rolledBack, true);
    assert.equal(result.core?.rolledBack, true);
    assert.equal(result.compatibility?.rolledBack, true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("rollback validates the complete target before changing either pointer", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-rollback-preflight-"));
  try {
    const runtime = join(home, "runtime");
    const current = {
      current: "0.4.2-beta.1",
      previous: coreVersion,
      executable: join(runtime, "versions", "0.4.2-beta.1", process.platform === "win32" ? "better-codex.exe" : "better-codex"),
      updatedAt: new Date().toISOString(),
    };
    mkdirSync(join(runtime, "compatibility"), { recursive: true });
    mkdirSync(join(runtime, "versions", "0.4.2-beta.1"), { recursive: true });
    writeFileSync(join(runtime, "current.json"), JSON.stringify(current));
    writeFileSync(join(runtime, "compatibility", "current.json"), JSON.stringify({
      current: "0.4.2-beta.1",
      previous: "missing-compatibility",
      failures: 0,
      updatedAt: new Date().toISOString(),
    }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      before: {
        core: null,
        compatibility: { current: "missing-compatibility", previous: null, failures: 0, updatedAt: new Date().toISOString() },
      },
      after: { core: current.current, compatibility: bundledCompatibility.version },
      updatedAt: new Date().toISOString(),
    }));

    const result = cliResult(home, ["update", "rollback"]);
    assert.notEqual(result.status, 0);
    const preserved = JSON.parse(readFileSync(join(runtime, "current.json"), "utf8")) as { current?: string };
    assert.equal(preserved.current, current.current);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a stale activation failure cannot roll back a newer committed update", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-activation-race-"));
  try {
    const runtime = join(home, "runtime");
    const newerVersion = "0.4.2-beta.2";
    const olderVersion = "0.4.2-beta.1";
    const executable = join(runtime, "versions", newerVersion, process.platform === "win32" ? "better-codex.exe" : "better-codex");
    mkdirSync(join(runtime, "versions", newerVersion), { recursive: true });
    mkdirSync(join(runtime, "compatibility", "versions", newerVersion), { recursive: true });
    writeFileSync(executable, "newer");
    writeFileSync(join(runtime, "current.json"), JSON.stringify({ current: newerVersion, previous: olderVersion, executable, updatedAt: new Date().toISOString() }));
    writeFileSync(join(runtime, "compatibility", "current.json"), JSON.stringify({ current: newerVersion, previous: olderVersion, failures: 0, updatedAt: new Date().toISOString() }));
    writeFileSync(join(runtime, "compatibility", "versions", newerVersion, "manifest.json"), JSON.stringify({ ...bundledCompatibility, version: newerVersion, minimumCoreVersion: coreVersion }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      before: { core: null, compatibility: null },
      after: { core: newerVersion, compatibility: newerVersion },
      updatedAt: new Date().toISOString(),
    }));
    const script = [
      'const updater = await import("./src/updater.ts");',
      `console.log(JSON.stringify(updater.rollbackActivatedUpdate({ core: "${olderVersion}", compatibility: "${olderVersion}" })));`,
    ].join("");
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal((JSON.parse(result.stdout) as { reason?: string }).reason, "update_superseded");
    assert.equal((JSON.parse(readFileSync(join(runtime, "current.json"), "utf8")) as { current?: string }).current, newerVersion);
    assert.equal((JSON.parse(readFileSync(join(runtime, "compatibility", "current.json"), "utf8")) as { current?: string }).current, newerVersion);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("a committed Runtime authority cannot be reopened as rollback recovery", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-authority-commit-"));
  try {
    const updateId = "019fec06-788f-7af3-a031-76b546904fb0";
    const script = [
      'const { mkdirSync, writeFileSync } = await import("node:fs");',
      'const { dirname } = await import("node:path");',
      'const config = await import("./src/config.ts");',
      'const runtime = await import("./src/runtime-state.ts");',
      'mkdirSync(dirname(config.runtimeAuthorityPath), { recursive: true });',
      'const identity = { instanceId: "runtime-commit", generation: 7, processStartedAt: "2026-08-27T00:00:00.000Z" };',
      `writeFileSync(config.runtimeAuthorityPath, JSON.stringify({ generation: 7, status: "claimed", runtimeInstanceId: identity.instanceId, runtimePid: process.pid, processStartedAt: identity.processStartedAt, updateId: "${updateId}", targetVersion: "9.9.9", recovery: false, hostReplacement: false, updatedAt: new Date().toISOString() }));`,
      `runtime.completeRuntimeAuthorityHandoff(identity, "${updateId}", "committed");`,
      `runtime.completeRuntimeAuthorityHandoff(identity, "${updateId}", "committed");`,
      'let recoveryError = null;',
      `try { runtime.reserveRuntimeAuthorityRecovery("${updateId}", "1.0.0", 7); } catch (error) { recoveryError = error.message; }`,
      `console.log(JSON.stringify({ authority: runtime.runtimeAuthorityUpdateState("${updateId}", 7), recoveryError }));`,
    ].join("");
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const output = JSON.parse(result.stdout) as { authority: { state?: string; generation?: number }; recoveryError?: string };
    assert.deepEqual(output.authority, { state: "committed", generation: 7, runtimeInstanceId: "runtime-commit" });
    assert.equal(output.recoveryError, "runtime_authority_update_committed");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("only explicit recovery changes legacy pointers interrupted between commits", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-update-wal-"));
  try {
    const runtime = join(home, "runtime");
    const interruptedVersion = "0.4.2-beta.1";
    const executable = join(runtime, "versions", interruptedVersion, process.platform === "win32" ? "better-codex.exe" : "better-codex");
    mkdirSync(join(runtime, "versions", interruptedVersion), { recursive: true });
    mkdirSync(join(runtime, "compatibility"), { recursive: true });
    writeFileSync(executable, "interrupted");
    writeFileSync(join(runtime, "current.json"), JSON.stringify({ current: interruptedVersion, previous: coreVersion, executable, updatedAt: new Date().toISOString() }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      phase: "applying",
      before: { core: null, compatibility: null },
      after: { core: interruptedVersion, compatibility: interruptedVersion },
      updatedAt: new Date().toISOString(),
    }));
    const script = `
      const { readFileSync } = await import("node:fs");
      const { updateRollbackPath } = await import("./src/config.ts");
      const before = readFileSync(updateRollbackPath, "utf8");
      const updater = await import("./src/updater.ts");
      updater.getGatewayUpdateState();
      if (readFileSync(updateRollbackPath, "utf8") !== before) throw new Error("query_mutated_transaction");
      updater.recoverInterruptedUpdateTransaction();
      console.log("recovered");
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.throws(() => readFileSync(join(runtime, "current.json"), "utf8"), /ENOENT/);
    assert.throws(() => readFileSync(join(runtime, "rollback.json"), "utf8"), /ENOENT/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("only explicit recovery completes legacy rollback interrupted between restores", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-rollback-wal-"));
  try {
    const runtime = join(home, "runtime");
    const interruptedVersion = "0.4.2-beta.1";
    mkdirSync(join(runtime, "compatibility", "versions", interruptedVersion), { recursive: true });
    writeFileSync(join(runtime, "compatibility", "current.json"), JSON.stringify({ current: interruptedVersion, previous: bundledCompatibility.version, failures: 0, updatedAt: new Date().toISOString() }));
    writeFileSync(join(runtime, "compatibility", "versions", interruptedVersion, "manifest.json"), JSON.stringify({ ...bundledCompatibility, version: interruptedVersion, minimumCoreVersion: coreVersion }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      phase: "rolling_back",
      before: { core: null, compatibility: null },
      after: { core: interruptedVersion, compatibility: interruptedVersion },
      updatedAt: new Date().toISOString(),
    }));
    const script = `
      const { readFileSync } = await import("node:fs");
      const { updateRollbackPath } = await import("./src/config.ts");
      const before = readFileSync(updateRollbackPath, "utf8");
      const updater = await import("./src/updater.ts");
      updater.getGatewayUpdateState();
      if (readFileSync(updateRollbackPath, "utf8") !== before) throw new Error("query_mutated_transaction");
      updater.recoverInterruptedUpdateTransaction();
      console.log("recovered");
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.throws(() => readFileSync(join(runtime, "compatibility", "current.json"), "utf8"), /ENOENT/);
    assert.throws(() => readFileSync(join(runtime, "rollback.json"), "utf8"), /ENOENT/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("standalone core and compatibility updates enter the WAL before pointer mutation", () => {
  const source = readFileSync(join(root, "src", "updater.ts"), "utf8");
  const server = readFileSync(join(root, "src", "server.ts"), "utf8");
  const relayServer = readFileSync(join(root, "src", "relay-server.ts"), "utf8");
  const compatibility = source.slice(source.indexOf("export async function updateCompatibility"), source.indexOf("async function updateCoreUnlocked"));
  const core = source.slice(source.indexOf("export async function updateCore"), source.indexOf("export async function updateAll"));
  const cli = readFileSync(join(root, "src", "cli.ts"), "utf8");
  const service = readFileSync(join(root, "src", "service.ts"), "utf8");
  const applyUpdate = cli.slice(cli.indexOf("async function applyUpdate"), cli.indexOf("async function withLaunchLock"));
  const doctor = cli.slice(cli.indexOf("async function doctor"), cli.indexOf("async function uninstall"));
  const currentActivation = server.slice(server.indexOf("if (!updated)"), server.indexOf("if (updateRelaunchScheduled)"));
  assert.match(compatibility, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCompatibilityUnlocked/);
  assert.match(core, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCoreUnlocked/);
  assert.match(source, /pendingCoreActivation\(\)[\s\S]*update_previous_activation_pending/);
  assert.match(source, /writeRollbackState\(transaction.before, transaction.after, "rolling_back", transaction\)/);
  assert.match(server, /sendJson\(response, 202, \{ accepted: true, update_id: operation\.id, state: "STAGING"[\s\S]*void \(async \(\) => \{[\s\S]*const result = await installGatewayUpdate\(operation.id, requestedTargetVersion, channel\)/);
  assert.match(relayServer, /const updater = new HubUpdater\(options\.updaterDirectory, updateChannel\)/);
  assert.match(relayServer, /url\.pathname === "\/api\/update"[\s\S]*updater\.current\(String\(url\.searchParams\.get\("update_id"\)/);
  assert.match(relayServer, /url\.pathname === "\/api\/update\/check"[\s\S]*await updater\.check\(\)/);
  assert.match(relayServer, /url\.pathname === "\/api\/update\/install"[\s\S]*await updater\.install\(/);
  assert.ok(relayServer.indexOf('url.pathname === "/api/update/check"') < relayServer.indexOf('url.pathname.startsWith("/api/")'));
  assert.match(server, /if \(installedCoreVersion !== coreVersion\) throw new Error\(`update_core_activation_required:/);
  assert.match(currentActivation, /transitionUpdateOperation\(operation\.id, "COMPLETED"[\s\S]*recordGatewayUpdateActivation\("success"[\s\S]*update_current_confirmed/);
  assert.match(cli, /if \(operation\.status === "COMPLETED"\) \{[\s\S]*const runtime = await readiness\(\)/);
  assert.match(applyUpdate, /waitForRuntimeReady\(120_000\)[\s\S]*\/api\/update\/commit[\s\S]*runtimeAuthorityUpdateState\(updateId\)/);
  assert.match(server, /operation\.status === "SERVING_READY"[\s\S]*completeSessionHandoff\(updateId\)[\s\S]*transitionUpdateOperation\(updateId, "COMPLETED"\)/);
  assert.doesNotMatch(server.slice(server.indexOf('if \(!rollingBack && operation.status === "RECONCILING"'), server.indexOf("})().catch", server.indexOf('if \(!rollingBack && operation.status === "RECONCILING"'))), /transitionUpdateOperation\(updateId, "COMPLETED"\)/);
  assert.match(doctor, /runtime = await readiness\(\)[\s\S]*ok: false, ready: false/);
  assert.match(cli, /const \[command, \.\.\.expectedArgs\] = mcpCommand\(\)/);
  assert.doesNotMatch(service, /managedCoreCommand/);
  assert.match(service, /environment\.BETTER_CODEX_BASE_ENTRYPOINT = invocation\[1\]/);
  assert.match(service, /installationCommand\(\)/);
  const home = mkdtempSync(join(tmpdir(), "better-codex-service-entrypoint-"));
  try {
    const script = `
      import assert from "node:assert/strict";
      import { mkdirSync, writeFileSync } from "node:fs";
      import { join } from "node:path";
      import { installationCommand } from "./src/launch-integration.ts";
      import { servicePlist } from "./src/service.ts";
      const home = process.env.BETTER_CODEX_HOME;
      const base = join(home, "better-codex.cjs");
      const managed = join(home, "runtime", "versions", "99.0.0", "better-codex.cjs");
      mkdirSync(join(home, "runtime", "versions", "99.0.0"), { recursive: true });
      mkdirSync(join(home, "run"), { recursive: true });
      writeFileSync(base, "");
      writeFileSync(managed, "");
      process.execArgv = [];
      process.argv[1] = base;
      const original = servicePlist();
      writeFileSync(join(home, "runtime", "current.json"), JSON.stringify({ current: "99.0.0", previous: "0.4.12", executable: managed, updatedAt: new Date().toISOString() }));
      assert.equal(servicePlist(), original);
      process.argv[1] = managed;
      process.env.BETTER_CODEX_BASE_ENTRYPOINT = base;
      assert.deepEqual(installationCommand(), [process.execPath, base]);
      assert.equal(servicePlist(), original);
      writeFileSync(join(home, "runtime", "current.json"), JSON.stringify({ current: "0.4.12", previous: "99.0.0", executable: base, updatedAt: new Date().toISOString() }));
      assert.equal(servicePlist(), original);
      delete process.env.BETTER_CODEX_BASE_ENTRYPOINT;
      writeFileSync(join(home, "run", "launch-integration.json"), JSON.stringify({ platform: "darwin", launcher: process.execPath, launcherArguments: [base] }));
      assert.equal(servicePlist(), original);
      process.env.BETTER_CODEX_BASE_ENTRYPOINT = managed;
      assert.throws(() => servicePlist(), /installation_base_entrypoint_required/);
      process.env.BETTER_CODEX_BASE_ENTRYPOINT = join(home, "missing.cjs");
      assert.throws(() => servicePlist(), /installation_base_executable_missing/);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_BASE_ENTRYPOINT: "", BETTER_CODEX_LAUNCHER_PATH: "" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
  assert.doesNotMatch(server, /interrupt_running/);
  assert.doesNotMatch(applyUpdate, /stopSessionHostProcess\(\)/);
});

test("update and rollback operations refuse a live cross-process lock", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-update-lock-"));
  try {
    const runtime = join(home, "runtime");
    mkdirSync(runtime, { recursive: true });
    writeFileSync(join(runtime, "update.json.lock"), JSON.stringify({ pid: process.pid, token: "live-test-owner" }));
    const result = cliResult(home, ["update", "rollback"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /update_in_progress/);
    assert.equal(readFileSync(join(runtime, "update.json.lock"), "utf8"), JSON.stringify({ pid: process.pid, token: "live-test-owner" }));
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("failed core validation never creates a manifest-derived version directory", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-update-staging-"));
  const nextVersion = nextBetaVersion();
  const core = Buffer.from("process.exit(3);\n");
  try {
    const assetKey = `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}`;
    const script = `
globalThis.__BETTER_CODEX_PACKAGED__ = true;
const core = Buffer.from(${JSON.stringify(core.toString("base64"))}, "base64");
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => String(input instanceof Request ? input.url : input) === "https://example.invalid/untrusted-core"
  ? Promise.resolve(new Response(core, { status: 200 }))
  : originalFetch(input, init);
const updater = await import("./src/updater.ts");
try {
  await updater.updateCore({
    schemaVersion: 1,
    channel: "preview",
    generatedAt: new Date().toISOString(),
    compatibility: null,
    core: { version: "${nextVersion}", assets: { "${assetKey}": { url: "https://example.invalid/untrusted-core", sha256: "${createHash("sha256").update(core).digest("hex")}" } } },
  }, "preview");
  console.log("unexpected_success");
} catch (error) {
  console.log(error instanceof Error ? error.message : String(error));
}
`;
    const update = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
      timeout: 30_000,
    });
    assert.equal(update.status, 0, `${update.stdout}\n${update.stderr}`);
    assert.match(update.stdout, /core_validation_failed/);
    assert.equal(existsSync(join(home, "runtime", "versions", nextVersion)), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("packaged Node bundles stage signed artifacts and activate only the pinned pointer pair", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-bundle-update-"));
  const nextVersion = nextBetaVersion();
  const core = Buffer.from(`
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const args = process.argv.slice(2);
if (args[0] === "version") {
  console.log(JSON.stringify({ core: "${nextVersion}", compatibility: "${bundledCompatibility.version}", managedCore: null }));
} else if (args[0] === "runtime") {
  const instanceId = "bundle-update-health";
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true, pid: process.pid, instanceId }));
  });
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    const run = path.join(process.env.BETTER_CODEX_HOME, "run");
    fs.mkdirSync(run, { recursive: true });
    fs.writeFileSync(path.join(run, "runtime.json"), JSON.stringify({ pid: process.pid, port, instanceId }));
  });
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
} else {
  process.exit(2);
}
  `);
  try {
    const assetKey = `${process.platform}-${process.arch === "x64" ? "amd64" : process.arch}`;
    const script = `
globalThis.__BETTER_CODEX_PACKAGED__ = true;
const core = Buffer.from(${JSON.stringify(core.toString("base64"))}, "base64");
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => String(input instanceof Request ? input.url : input) === "https://example.invalid/better-codex-core"
  ? Promise.resolve(new Response(core, { status: 200 }))
  : originalFetch(input, init);
const fs = await import("node:fs");
const path = await import("node:path");
const assert = (await import("node:assert/strict")).default;
const crypto = await import("node:crypto");
const config = await import("./src/config.ts");
const runtime = await import("./src/runtime-state.ts");
const { canonicalUpdateJson } = await import("./src/update-policy.ts");
config.ensureDirectories();
process.argv[1] = path.join(config.betterCodexHome, "source.cjs");
fs.writeFileSync(process.argv[1], "preserved source fixture");
const keys = crypto.generateKeyPairSync("ed25519");
process.env.BETTER_CODEX_UPDATE_PUBLIC_KEY = keys.publicKey.export({ type: "spki", format: "pem" });
const updater = await import("./src/updater.ts");
const payload = {
  schemaVersion: 1,
  channel: "preview",
  generatedAt: new Date().toISOString(),
  compatibility: null,
  core: { version: "${nextVersion}", assets: { "${assetKey}": { url: "https://example.invalid/better-codex-core", sha256: "${createHash("sha256").update(core).digest("hex")}" } } },
};
const updateId = "019fec06-788f-7af3-a031-76b546904fa8";
const manifest = { payload, signature: crypto.sign(null, Buffer.from(canonicalUpdateJson(payload)), keys.privateKey).toString("base64") };
const result = await updater.updateAll("preview", { updateId, manifest });
assert.equal(fs.existsSync(config.runtimeCurrentPath), false);
assert.equal(fs.existsSync(config.compatibilityCurrentPath), false);
const staged = fs.readFileSync(config.updateRollbackPath, "utf8");
assert.equal(JSON.parse(staged).before.compatibility.current, "${bundledCompatibility.version}");
const identity = runtime.createRuntimeIdentity();
runtime.acquireRuntimeLock(identity);
const owner = runtime.claimRuntimeAuthority(identity);
const generation = runtime.reserveRuntimeAuthority(owner, updateId, payload.core.version);
updater.recordGatewayUpdateActivation("activating", null, { core: payload.core.version, compatibility: null }, process.pid, updateId, generation);
fs.writeFileSync(config.updateRollbackPath, JSON.stringify({ ...JSON.parse(staged), manifest: { ...manifest, signature: Buffer.alloc(64).toString("base64") } }));
assert.throws(() => updater.activateStagedUpdate(updateId), /update_staging_signature_invalid/);
assert.equal(fs.existsSync(config.runtimeCurrentPath), false);
fs.writeFileSync(config.updateRollbackPath, staged);
updater.activateStagedUpdate(updateId);
updater.verifyUpdatePointers(updateId, false);
assert.equal(JSON.parse(fs.readFileSync(config.compatibilityCurrentPath, "utf8")).current, "${bundledCompatibility.version}");
console.log(JSON.stringify(result.core));
`;
    const update = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
      timeout: 30_000,
    });
    assert.equal(update.status, 0, `${update.stdout}\n${update.stderr}`);
    assert.equal((JSON.parse(update.stdout) as { updated?: boolean }).updated, true);
    const pointer = JSON.parse(readFileSync(join(home, "runtime", "current.json"), "utf8")) as { current?: string; executable?: string };
    assert.equal(pointer.current, nextVersion);
    assert.equal(pointer.executable, join(home, "runtime", "versions", nextVersion, "better-codex.cjs"));
    assert.deepEqual(readFileSync(pointer.executable), core);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});


test("operation journals fence interrupted rollback, stale errors, and reused request keys", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-update-journal-"));
  try {
    const script = `
      import assert from "node:assert/strict";
      import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
      import { dirname, join } from "node:path";
      const config = await import("./src/config.ts");
      const { coreVersion, bundledCompatibility } = await import("./src/compatibility.ts");
      const runtime = await import("./src/runtime-state.ts");
      const updater = await import("./src/updater.ts");
      const updateId = "019fec06-788f-7af3-a031-76b546904fb0";
      const identity = { instanceId: "current-runtime", generation: 8, processStartedAt: new Date().toISOString() };
      mkdirSync(dirname(config.runtimeAuthorityPath), { recursive: true });
      writeFileSync(config.runtimeAuthorityPath, JSON.stringify({ generation: 8, status: "claimed", runtimeInstanceId: identity.instanceId, runtimePid: process.pid, processStartedAt: identity.processStartedAt, updateId, targetVersion: coreVersion, recovery: false }));
      const executable = join(config.runtimeVersionsPath, coreVersion, "better-codex.cjs");
      mkdirSync(dirname(executable), { recursive: true });
      writeFileSync(executable, "preserved source");
      const source = { current: coreVersion, previous: null, executable, updatedAt: new Date().toISOString() };
      writeFileSync(config.runtimeCurrentPath, JSON.stringify(source));
      const transaction = { schemaVersion: 2, updateId, sourceCoreVersion: coreVersion, phase: "applying", before: { core: source, compatibility: null }, after: { core: "99.0.0", compatibility: bundledCompatibility.version }, updatedAt: new Date().toISOString() };
      writeFileSync(config.updateRollbackPath, JSON.stringify(transaction));
      updater.recordGatewayUpdateActivation("activating", null, { core: "99.0.0", compatibility: null }, process.pid, updateId, 8);
      const before = readFileSync(config.updateRollbackPath, "utf8");
      updater.getGatewayUpdateState();
      updater.recoverInterruptedUpdateTransaction();
      assert.equal(readFileSync(config.updateRollbackPath, "utf8"), before);
      assert.throws(() => updater.rollbackActivatedUpdate({ core: "99.0.0", compatibility: null }, updateId), /update_rollback_intent_missing/);
      updater.prepareUpdateRollback(updateId, "target_crashed", 8);
      assert.equal(JSON.parse(readFileSync(config.updateRollbackPath, "utf8")).phase, "rolling_back");
      assert.throws(() => updater.rollbackActivatedUpdate({ core: "98.0.0", compatibility: null }, updateId), /update_superseded/);
      updater.rollbackActivatedUpdate({ core: "99.0.0", compatibility: null }, updateId);
      assert.equal(JSON.parse(readFileSync(config.updateRollbackPath, "utf8")).phase, "restored");
      assert.equal(JSON.parse(readFileSync(config.runtimeCurrentPath, "utf8")).current, coreVersion);
      updater.verifyUpdatePointers(updateId, true);
      assert.throws(() => updater.verifyUpdatePointers(updateId, false), /update_pointer_outcome_mismatch/);
      runtime.completeRuntimeAuthorityHandoff(identity, updateId, "committed");
      updater.recordGatewayUpdateActivation("success", null, { core: "99.0.0", compatibility: null }, null, updateId, 8);
      assert.throws(() => updater.recordGatewayUpdateActivation("error", "late_error", { core: "99.0.0", compatibility: null }, null, updateId, 8), /runtime_authority_update_committed/);
      assert.throws(() => updater.prepareUpdateRollback(updateId, "late_error", 8), /update_activation_authority_committed/);
      assert.equal(updater.getGatewayUpdateState().status, "current");
      const request = { updateId, targetVersion: "99.0.0", channel: "stable" };
      updater.bindGatewayUpdateRequest("request-key-123", request);
      updater.bindGatewayUpdateRequest("request-key-123", request);
      assert.deepEqual(updater.readGatewayUpdateRequest("request-key-123"), request);
      assert.throws(() => updater.bindGatewayUpdateRequest("request-key-123", { ...request, targetVersion: "100.0.0" }), /update_idempotency_conflict/);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
      cwd: root, encoding: "utf8", env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("VPS queue persists real operation identities across clients and rejects unknown IDs", async () => {
  const { HubUpdater } = await import("../src/hub-updater.js");
  const directory = mkdtempSync(join(tmpdir(), "better-codex-vps-queue-"));
  const id = "019fec06-788f-7af3-a031-76b546904faa";
  try {
    mkdirSync(join(directory, "operations"));
    writeFileSync(join(directory, "ready"), "");
    const operation = { schemaVersion: 2, id, idempotencyKey: "queue-test-key", channel: "preview", status: "installing", targetVersion: "v99.0.0", sourceVersion: coreVersion, stage: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), error: null };
    writeFileSync(join(directory, "request"), JSON.stringify(operation));
    writeFileSync(join(directory, "operations", `${id}.json`), JSON.stringify(operation));
    const first = new HubUpdater(directory, "preview");
    const received = await first.install("queue-test-key", "99.0.0");
    assert.equal(received.update_id, id);
    const second = new HubUpdater(directory, "preview");
    assert.equal((await second.install("queue-test-key", "99.0.0")).update_id, id);
    await assert.rejects(second.install("queue-test-key", "100.0.0"), /update_idempotency_conflict/);
    assert.throws(() => second.get("019fec06-788f-7af3-a031-76b546904fff"), /update_operation_not_found/);
    const queued = readFileSync(join(directory, "request"), "utf8");
    second.get(id);
    assert.equal(readFileSync(join(directory, "request"), "utf8"), queued);
    rmSync(join(directory, "request"));
    writeFileSync(join(directory, "state.json"), JSON.stringify({ ...operation, status: "error", stage: "error", recovery: "restored", currentVersion: coreVersion, error: "target_health_failed" }));
    assert.equal((await second.install("queue-test-key", "99.0.0")).operation?.status, "ROLLED_BACK");
    assert.equal(second.get(id).currentVersion, coreVersion);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("VPS executor resumes an interrupted operation once and preserves recovery evidence", { skip: process.platform === "win32" }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-vps-executor-"));
  const id = "019fec06-788f-7af3-a031-76b546904fae";
  const helper = join(root, "scripts", "selfhost-update-state.py");
  try {
    const operation = { schemaVersion: 2, id, idempotencyKey: "executor-test-key", channel: "preview", status: "installing", targetVersion: "v99.0.0", sourceVersion: coreVersion, stage: "interrupted", attempts: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), error: "executor_interrupted" };
    writeFileSync(join(directory, "request.running"), JSON.stringify(operation));
    const command = join(directory, "selfhost.sh");
    writeFileSync(command, 'set -eu\n[ "$BETTER_CODEX_UPDATER_RECOVER" = "1" ]\npython3 "$BETTER_CODEX_UPDATER_TEST_HELPER" progress restored 100 restored "$BETTER_CODEX_TEST_SOURCE_VERSION"\nexit 1\n');
    const environment = { ...process.env, BETTER_CODEX_UPDATER_DIRECTORY: directory, BETTER_CODEX_SELFHOST_DIR: directory, BETTER_CODEX_SELFHOST_EXECUTABLE: command, BETTER_CODEX_UPDATER_TEST_HELPER: helper, BETTER_CODEX_TEST_SOURCE_VERSION: coreVersion };
    const result = spawnSync("python3", [helper, "run"], { encoding: "utf8", env: environment });
    assert.equal(result.status, 0, result.stderr);
    const recovered = JSON.parse(readFileSync(join(directory, "operations", `${id}.json`), "utf8"));
    assert.equal(recovered.id, id);
    assert.equal(recovered.recovery, "restored");
    assert.equal(recovered.currentVersion, coreVersion);
    assert.equal(recovered.attempts, 2);
    assert.equal(existsSync(join(directory, "request.running")), false);
    writeFileSync(join(directory, "request.running"), JSON.stringify({ ...recovered, status: "installing", recovery: "pending" }));
    writeFileSync(join(directory, "operations", `${id}.json`), JSON.stringify({ ...recovered, status: "installing", recovery: "pending" }));
    const stopped = spawnSync("python3", [helper, "run"], { encoding: "utf8", env: environment });
    assert.equal(stopped.status, 0, stopped.stderr);
    const failed = JSON.parse(readFileSync(join(directory, "state.json"), "utf8"));
    assert.equal(failed.recovery, "failed");
    assert.equal(failed.error, "update_recovery_interrupted");
    assert.equal(existsSync(join(directory, "request.running")), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("interrupted activators retain one recovery owner and never reverse a commit decision", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-recovery-owner-"));
  try {
    const script = `
      import assert from "node:assert/strict";
      import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
      import { dirname, join } from "node:path";
      const config = await import("./src/config.ts");
      const updater = await import("./src/updater.ts");
      const updateId = "019fec06-788f-7af3-a031-76b546904fab";
      const executable = join(config.runtimeVersionsPath, "99.0.0", "better-codex.cjs");
      mkdirSync(dirname(executable), { recursive: true });
      writeFileSync(executable, "setTimeout(() => {}, 30000)");
      mkdirSync(dirname(config.runtimeAuthorityPath), { recursive: true });
      writeFileSync(config.runtimeAuthorityPath, JSON.stringify({ generation: 8, status: "claimed", runtimeInstanceId: "target", runtimePid: process.pid, processStartedAt: new Date().toISOString(), updateId, targetVersion: "99.0.0" }));
      const state = { schemaVersion: 2, updateId, stage: "committing", status: "activating", ownerPid: null, coreVersion: "99.0.0", sourceCoreVersion: "98.0.0", targetRuntimeGeneration: 8, updatedAt: new Date(Date.now() - 20000).toISOString() };
      writeFileSync(config.updateActivationPath, JSON.stringify(state));
      const owner = updater.recoverInterruptedActivation(process.pid);
      assert.ok(owner);
      try {
        assert.equal(updater.recoverInterruptedActivation(process.pid), null);
        const activation = updater.readGatewayUpdateActivationState(updateId);
        assert.equal(activation.stage, "committing");
        assert.equal(activation.ownerPid, owner);
        assert.equal(activation.recoveryAttempts, 1);
        assert.throws(() => updater.prepareUpdateRollback(updateId, "late_timeout", 8), /update_commit_outcome_pending/);
        assert.throws(() => updater.recordGatewayUpdateActivation("activating", "late_timeout", { core: "99.0.0", compatibility: null }, process.pid, updateId, 8), /update_commit_outcome_pending/);
      } finally { process.kill(owner, "SIGTERM"); }
      writeFileSync(config.updateActivationPath, JSON.stringify({ ...state, stage: "rolling_back", recoveryAttempts: 2 }));
      assert.equal(updater.recoverInterruptedActivation(process.pid), null);
      assert.equal(updater.readGatewayUpdateActivationState().stage, "recovery_failed");
      assert.equal(updater.recoverInterruptedActivation(process.pid), null);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: root, encoding: "utf8", timeout: 15_000, env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("desktop evidence expires across Runtime generations and invalid packages remain a separate failure", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-desktop-evidence-"));
  try {
    const script = `
      import assert from "node:assert/strict";
      import { mkdirSync, writeFileSync, rmSync } from "node:fs";
      import { dirname } from "node:path";
      const config = await import("./src/config.ts");
      const desktop = await import("./src/compatibility.ts");
      const runtime = await import("./src/runtime-state.ts");
      const identity = { ...runtime.createRuntimeIdentity(), port: 45678, generation: 1 };
      runtime.publishRuntimeState(identity);
      desktop.writeCompatibilityStatus({ compatible: true, reason: null, codexVersion: "1", targetId: "main", targetUrl: "app://-/index.html", capabilities: { sidebar: true, content: true, threads: true, projects: true }, documentId: 1 }, true);
      assert.equal(desktop.readCompatibilityStatus().state, "ready");
      runtime.publishRuntimeState({ ...identity, generation: 2 });
      const pending = desktop.readCompatibilityStatus();
      assert.equal(pending.state, "waiting_window");
      assert.equal(pending.runtimeGeneration, 2);
      assert.equal(pending.targetId, null);
      mkdirSync(dirname(config.compatibilityCurrentPath), { recursive: true });
      writeFileSync(config.compatibilityCurrentPath, "invalid-json");
      rmSync(config.compatibilityStatusPath);
      assert.equal(desktop.readCompatibilityStatus().state, "failed");
      assert.equal(desktop.readCompatibilityStatus().reason, "compatibility_package_invalid");
      rmSync(config.compatibilityCurrentPath);
      for (const url of ["app://-/detached-window.html?initialRoute=%2Fdetached-window", "app://-/index.html?initialRoute=%2Fglobal-dictation", "app://-/index.html?initialRoute=%2Favatar-overlay"]) assert.equal(desktop.targetAllowed({ url, title: "Codex", type: "page" }), false);
    `;
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], { cwd: root, encoding: "utf8", env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_DISABLE_DELEGATION: "1" } });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test("a killed VPS executor cannot overlap its surviving deployment child", { skip: process.platform === "win32" }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-vps-fencing-"));
  const id = "019fec06-788f-7af3-a031-76b546904faa";
  const helper = join(root, "scripts", "selfhost-update-state.py");
  const children: ReturnType<typeof spawn>[] = [];
  let workerPid: number | null = null;
  try {
    writeFileSync(join(directory, "request"), JSON.stringify({ schemaVersion: 2, id, targetVersion: "v99.0.0", status: "installing", stage: "queued", createdAt: new Date().toISOString() }));
    const command = join(directory, "selfhost.sh");
    writeFileSync(command, 'set -eu\nif [ "$BETTER_CODEX_UPDATER_RECOVER" = "0" ]; then\n  echo $$ > "$BETTER_CODEX_SELFHOST_DIR/child.pid"\n  while [ ! -f "$BETTER_CODEX_SELFHOST_DIR/release" ]; do sleep 0.05; done\nfi\npython3 "$BETTER_CODEX_TEST_HELPER" progress verified 100\n');
    const environment = { ...process.env, BETTER_CODEX_UPDATER_DIRECTORY: directory, BETTER_CODEX_SELFHOST_DIR: directory, BETTER_CODEX_SELFHOST_EXECUTABLE: command, BETTER_CODEX_TEST_HELPER: helper };
    const first = spawn("python3", [helper, "run"], { env: environment, stdio: "ignore" });
    children.push(first);
    const deadline = Date.now() + 10_000;
    while (!existsSync(join(directory, "child.pid"))) {
      assert.equal(first.exitCode, null);
      assert.ok(Date.now() < deadline, "deployment did not start");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    workerPid = Number(readFileSync(join(directory, "child.pid"), "utf8"));
    const exited = once(first, "exit");
    first.kill("SIGKILL");
    await exited;
    const second = spawn("python3", [helper, "run"], { env: environment, stdio: "ignore" });
    children.push(second);
    const completed = once(second, "exit");
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(second.exitCode, null);
    assert.equal(JSON.parse(readFileSync(join(directory, "state.json"), "utf8")).attempts, 1);
    writeFileSync(join(directory, "release"), "ready");
    const [code] = await completed;
    assert.equal(code, 0);
    workerPid = null;
    const state = JSON.parse(readFileSync(join(directory, "state.json"), "utf8"));
    assert.equal(state.id, id);
    assert.equal(state.stage, "complete");
    assert.equal(state.attempts, 2);
  } finally {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    if (workerPid) { try { process.kill(workerPid, "SIGKILL"); } catch {} }
    rmSync(directory, { recursive: true, force: true });
  }
});
