import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const installer = readFileSync(new URL("../scripts/install.sh", import.meta.url), "utf8");
const start = installer.indexOf('run_with_timeout 10 "$BIN_DIR/better-codex" version\n');
const end = installer.indexOf('\nREADY_VERSION="$(installed_version', start);
assert.ok(start >= 0 && end > start, "installer finalization section is missing");
const finalization = installer.slice(start, end);
const shellOnly = { skip: process.platform === "win32" };

function finalize(options: { status?: string; failure?: string; bundled?: boolean; live?: boolean; background?: boolean } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-bundled-node-test-"));
  const bin = join(directory, "bin");
  const log = join(directory, "commands.jsonl");
  const executable = join(bin, "better-codex");
  mkdirSync(bin);
  writeFileSync(log, "");
  writeFileSync(executable, `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.INSTALL_TEST_LOG, JSON.stringify(args) + '\\n');
const command = args.join(' ');
if (command === process.env.INSTALL_TEST_FAILURE) {
  console.error('mock command failed: ' + command);
  process.exit(7);
}
if (command === 'service status') process.stdout.write(process.env.INSTALL_TEST_STATUS);
else if (command === 'desktop status') console.log(JSON.stringify({ runtime: 'ready' }));
else console.log(JSON.stringify({ ok: true }));
`);
  chmodSync(executable, 0o755);
  try {
    const result = spawnSync("/bin/bash", ["-c", `set -euo pipefail
run_with_timeout() { shift; "$@"; }
${finalization}`], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        ...process.env,
        BIN_DIR: bin,
        WORK_DIR: directory,
        WITH_SERVICE: "1",
        LIVE_UPGRADE_COMPLETED: options.live === false ? "0" : "1",
        PRESERVE_CODEX: "1",
        BETTER_CODEX_BUNDLED_NODE: options.bundled === false ? "" : "/mock/bundled-node",
        BETTER_CODEX_BACKGROUND_SETUP: options.background ? "1" : "0",
        INSTALL_TEST_LOG: log,
        INSTALL_TEST_STATUS: options.status ?? JSON.stringify({ installed: true, configurationMatches: false }),
        INSTALL_TEST_FAILURE: options.failure ?? "",
      },
    });
    const commands = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as string[]);
    return { ...result, commands };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const repairCommands = [
  ["version"], ["launcher", "install"], ["service", "status"],
  ["desktop", "stop"], ["mcp", "install"], ["service", "repair"], ["desktop", "start"],
];

test("live DMG installation repairs a changed Node service entrypoint before final diagnostics", shellOnly, () => {
  const result = finalize();
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, [...repairCommands, ["doctor", "--allow-pending-injection"]]);
});

test("live DMG installation leaves a matching service running", shellOnly, () => {
  const result = finalize({ status: JSON.stringify({ installed: true, configurationMatches: true }) });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, [["version"], ["launcher", "install"], ["service", "status"], ["doctor", "--allow-pending-injection"]]);
});

test("service migration is limited to live updates that install bundled Node", shellOnly, () => {
  const withoutNode = finalize({ bundled: false });
  assert.equal(withoutNode.status, 0, withoutNode.stderr);
  assert.deepEqual(withoutNode.commands, [["version"], ["launcher", "install"], ["doctor", "--allow-pending-injection"]]);
  const offline = finalize({ live: false });
  assert.equal(offline.status, 0, offline.stderr);
  assert.deepEqual(offline.commands, [["version"], ["setup", "--yes", "--preserve-codex"], ["doctor", "--allow-pending-injection"]]);
});

test("unreadable or invalid service status fails without stopping tasks or claiming readiness", shellOnly, () => {
  for (const options of [
    { failure: "service status" },
    { status: "invalid-json" },
    { status: JSON.stringify({ installed: true }) },
    { status: JSON.stringify({ installed: true, configurationMatches: "false" }) },
    { status: JSON.stringify({ installed: false, configurationMatches: false }) },
  ]) {
    const result = finalize(options);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unable to read|install_service_status_invalid/);
    assert.deepEqual(result.commands, [["version"], ["launcher", "install"], ["service", "status"]]);
  }
});

test("failed migration commands remain visible and halt the installation sequence", shellOnly, () => {
  for (const command of ["launcher install", "desktop stop", "mcp install", "service repair", "desktop start"]) {
    const result = finalize({ failure: command });
    assert.equal(result.status, 7, result.stderr);
    assert.match(result.stderr, /mock command failed/);
    const index = repairCommands.findIndex(args => args.join(" ") === command);
    assert.deepEqual(result.commands, repairCommands.slice(0, index + 1));
  }
});

test("background DMG migration requires Runtime readiness after service repair", shellOnly, () => {
  const result = finalize({ background: true });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, [...repairCommands, ["desktop", "status"]]);
  const failed = finalize({ background: true, failure: "desktop status" });
  assert.notEqual(failed.status, 0);
  assert.deepEqual(failed.commands, [...repairCommands, ["desktop", "status"]]);
});
