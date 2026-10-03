import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { desktopBridgeIdentityMatches, legacyInjectorIdentityMatches } from "../src/desktop-process.js";

const record = { pid: 431, processStartedAt: 123000, profile: "development", home: "/tmp/dev", command: "/usr/bin/node /app/cli.js watch-desktop-bridge 9222", instanceId: "bridge-instance" };
const observed = { pid: record.pid, startedAt: record.processStartedAt, profile: record.profile, home: record.home, command: record.command };

test("bridge process authority fences PID reuse, another profile, and command replacement", () => {
  assert.equal(desktopBridgeIdentityMatches(record, observed), true);
  for (const mutation of [{ startedAt: 124000 }, { profile: "stable" }, { home: "/tmp/stable" }, { command: "/usr/bin/node other.js" }, { pid: 432 }]) {
    assert.equal(desktopBridgeIdentityMatches(record, { ...observed, ...mutation }), false);
  }
  assert.equal(desktopBridgeIdentityMatches(null, observed), false);
});

test("legacy migration requires command, profile, and contemporaneous start evidence", () => {
  const legacy = { command: "/usr/bin/node /app/cli.js watch-inject 9222", executable: "/app/cli.js", startedAt: 123000, pidFileWrittenAt: 123750, recordedProfile: "development", profile: "development", observedHome: "/tmp/dev", home: "/tmp/dev" };
  assert.equal(legacyInjectorIdentityMatches(legacy), true);
  for (const mutation of [{ startedAt: 125000 }, { startedAt: 100000 }, { startedAt: null }, { recordedProfile: "stable" }, { observedHome: "/tmp/other" }, { observedHome: null }, { recordedProfile: undefined }, { executable: "/other/cli.js" }, { command: "unrelated worker" }]) {
    assert.equal(legacyInjectorIdentityMatches({ ...legacy, ...mutation }), false);
  }
});

test("retired injection commands report retirement without starting Runtime", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-retired-injection-"));
  try {
    for (const command of ["inject", "eject", "enable", "disable", "refresh-injection", "watch-inject"]) {
      const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", command], { cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 10000, env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_PROFILE: "development", BETTER_CODEX_DISABLE_DELEGATION: "1" } });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /page_injection_retired/);
      assert.equal(existsSync(join(home, "run", "runtime.json")), false);
      assert.equal(existsSync(join(home, "run", "desktop-bridge.json")), false);
    }
  } finally { rmSync(home, { recursive: true, force: true }); }
});


test("isolated Runtime preflight cannot attach, restart, or observe production CDP", async () => {
  const original = process.env.BETTER_CODEX_DISABLE_DESKTOP_BRIDGE;
  process.env.BETTER_CODEX_DISABLE_DESKTOP_BRIDGE = "1";
  try {
    const bridge = await import("../src/cdp.js");
    const status = await bridge.cdpStatus(1);
    assert.equal(status.available, false);
    assert.equal(status.disabled, true);
    assert.equal(status.compatibility?.state, "disabled");
    assert.deepEqual(status.targets, []);
    await assert.rejects(() => bridge.cdpConnectDesktopBridge(1, 1, "unused", true), /desktop_bridge_disabled/);
    await assert.rejects(() => bridge.cdpRestartAndConnectDesktopBridge(1, 1, "unused"), /desktop_bridge_disabled/);
    await assert.rejects(() => bridge.watchDesktopBridge(1, "unused"), /desktop_bridge_disabled/);
    assert.deepEqual(await bridge.cdpCleanupLegacyInjection(1, { profile: "development" }), []);
  } finally {
    if (original === undefined) delete process.env.BETTER_CODEX_DISABLE_DESKTOP_BRIDGE;
    else process.env.BETTER_CODEX_DISABLE_DESKTOP_BRIDGE = original;
  }
});
