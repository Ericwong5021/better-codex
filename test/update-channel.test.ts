import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
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
  try {
    const runtime = join(home, "runtime");
    mkdirSync(join(runtime, "compatibility"), { recursive: true });
    mkdirSync(join(runtime, "compatibility", "versions", "0.4.2-beta.1"), { recursive: true });
    mkdirSync(join(runtime, "versions", "0.4.2-beta.1"), { recursive: true });
    writeFileSync(join(runtime, "current.json"), JSON.stringify({
      current: "0.4.2-beta.1",
      previous: coreVersion,
      executable: join(runtime, "versions", "0.4.2-beta.1", process.platform === "win32" ? "better-codex.exe" : "better-codex"),
      updatedAt: new Date().toISOString(),
    }));
    writeFileSync(join(runtime, "compatibility", "current.json"), JSON.stringify({
      current: "0.4.2-beta.1",
      previous: "0.3.10",
      failures: 0,
      updatedAt: new Date().toISOString(),
    }));
    writeFileSync(join(runtime, "compatibility", "versions", "0.4.2-beta.1", "manifest.json"), JSON.stringify({
      ...bundledCompatibility,
      version: "0.4.2-beta.1",
      minimumCoreVersion: coreVersion,
    }));
    writeFileSync(join(runtime, "rollback.json"), JSON.stringify({
      before: { core: null, compatibility: null },
      after: { core: "0.4.2-beta.1", compatibility: "0.4.2-beta.1" },
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
  const compatibility = source.slice(source.indexOf("export async function updateCompatibility"), source.indexOf("async function updateCoreUnlocked"));
  const core = source.slice(source.indexOf("export async function updateCore"), source.indexOf("export async function updateAll"));
  assert.match(compatibility, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCompatibilityUnlocked/);
  assert.match(core, /writeRollbackState\(before, plannedAfter, "applying"\)[\s\S]*updateCoreUnlocked/);
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
