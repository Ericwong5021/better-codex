import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { windowsSessionHostProcessPowerShell } from "../src/session-host-client.js";

test("Windows Session Host discovery excludes its own query and retains a matching process", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1 and Win32_Process" : false,
  timeout: 30_000,
}, async () => {
  // Only a marker-bearing fixture is launched; it never starts a Session Host.
  const fixture = spawn(process.execPath, [
    "-e", "process.send('ready'); setInterval(() => {}, 1000)", "better-codex", "session-host",
  ], { stdio: ["ignore", "ignore", "pipe", "ipc"], windowsHide: true });
  try {
    await once(fixture, "message");
    const result = spawnSync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command", windowsSessionHostProcessPowerShell(),
    ], { encoding: "utf8", windowsHide: true, timeout: 20_000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.ok(result.pid > 0, "query must run in a real PowerShell process");
    const parsed = result.stdout.trim() ? JSON.parse(result.stdout) : [];
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    assert.ok(processes.some(row => Number(row.ProcessId) === fixture.pid), "matching fixture must remain discoverable");
    assert.ok(!processes.some(row => Number(row.ProcessId) === result.pid), "query must not discover its own PowerShell process");
  } finally {
    if (fixture.pid && fixture.exitCode === null && fixture.signalCode === null) {
      const exited = once(fixture, "exit");
      fixture.kill();
      await exited;
    }
  }
});
