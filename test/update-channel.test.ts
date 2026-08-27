import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
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

test("startup recovers a core and compatibility transaction interrupted between pointer commits", () => {
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
    const script = 'await import("./src/updater.ts"); console.log("recovered");';
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

test("startup completes a rollback interrupted between pointer restores", () => {
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
    const script = 'await import("./src/updater.ts"); console.log("recovered");';
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
  const compatibility = source.slice(source.indexOf("export async function updateCompatibility"), source.indexOf("async function updateCoreUnlocked"));
  const core = source.slice(source.indexOf("export async function updateCore"), source.indexOf("export async function updateAll"));
  const cli = readFileSync(join(root, "src", "cli.ts"), "utf8");
  const service = readFileSync(join(root, "src", "service.ts"), "utf8");
  const applyUpdate = cli.slice(cli.indexOf("async function applyUpdate"), cli.indexOf("async function withLaunchLock"));
  assert.match(compatibility, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCompatibilityUnlocked/);
  assert.match(core, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCoreUnlocked/);
  assert.match(source, /pendingCoreActivation\(\)[\s\S]*update_staged_core_manifest_mismatch[\s\S]*rollbackAllUpdates\(\)[\s\S]*update_staged_core_rollback_failed/);
  assert.match(server, /sendJson\(response, 202, \{ accepted: true, update_id: operation\.id, state: "STAGING"[\s\S]*void \(async \(\) => \{[\s\S]*const result = await installGatewayUpdate\(\)/);
  assert.match(server, /if \(installedCoreVersion !== coreVersion\) throw new Error\(`update_core_activation_required:/);
  assert.match(cli, /if \(operation\.status === "COMPLETED"\) \{[\s\S]*const runtime = await health\(\)/);
  assert.match(cli, /const \[command, \.\.\.expectedArgs\] = mcpCommand\(\)/);
  assert.match(service, /const managed = managedCoreCommand\(\["runtime"\]\)/);
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

test("packaged Node bundles install and activate a managed .cjs core", async () => {
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
const updater = await import("./src/updater.ts");
const result = await updater.updateCore({
  schemaVersion: 1,
  channel: "preview",
  generatedAt: new Date().toISOString(),
  compatibility: null,
  core: { version: "${nextVersion}", assets: { "${assetKey}": { url: "https://example.invalid/better-codex-core", sha256: "${createHash("sha256").update(core).digest("hex")}" } } },
}, "preview");
console.log(JSON.stringify(result));
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
