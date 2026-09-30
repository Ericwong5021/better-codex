import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const installer = readFileSync(new URL("../scripts/install.sh", import.meta.url), "utf8");
const definition = installer.slice(installer.indexOf("run_with_timeout() {"), installer.indexOf("\ninstalled_version() {"));

test("successful installer subprocess closes captured output without waiting for its watchdog", { skip: process.platform === "win32" }, () => {
  const started = Date.now();
  const result = spawnSync("/bin/bash", ["-c", `${definition}\nvalue="$(run_with_timeout 30 /bin/echo installed)"\nprintf '%s' "$value"`], { encoding: "utf8", timeout: 3000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "installed");
  assert.ok(Date.now() - started < 3000);
});

test("installer watchdog still terminates a command that exceeds its deadline", { skip: process.platform === "win32" }, () => {
  const result = spawnSync("/bin/bash", ["-c", `${definition}\nrun_with_timeout 0.1 /bin/sleep 30`], { encoding: "utf8", timeout: 4000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 124, result.stderr);
});
