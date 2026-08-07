import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");

test("injector reacts to renderer target changes instead of waiting for its fallback sweep", () => {
  assert.ok(source.includes('connection.send("Target.setDiscoverTargets", { discover: true })'));
  assert.ok(source.includes('connection.on("Target.targetCreated", wake)'));
  assert.ok(source.includes('connection.on("Target.targetInfoChanged", wake)'));
  assert.ok(source.includes('connection.on("Target.targetDestroyed", wake)'));
  assert.ok(source.includes("await Promise.race([activity, new Promise<void>(resolve => setTimeout(resolve, settleMs))]"));
});

test("injection waits for the first capable renderer without a multi-second stability hold", () => {
  assert.match(source, /async function waitForTargets\(port: number\)/);
  assert.match(source, /if \(values\.length > 0\) return values;/);
  assert.doesNotMatch(source, /stableCount\s*>=\s*4/);
  assert.doesNotMatch(source, /stableCount/);
  assert.match(source, /setTimeout\(resolve, 150\)/);
  assert.match(source, /settleMs = message\.startsWith\("codex_incompatible_"\) \|\| message\.startsWith\("cdp_unavailable_"\) \? 200 : 500/);
});

test("injector does not open a second debugger against already attached targets", () => {
  assert.match(source, /trustIds\?: Set<string>/);
  assert.match(source, /mainTargets\(port, \{ trustIds: new Set\(attached\.keys\(\)\) \}\)/);
  assert.match(source, /if \(options\.trustIds\?\.has\(target\.id\)\)/);
});

test("bridge allows auto-dispatch settings updates", () => {
  assert.match(source, /settings\\\/auto-dispatch/);
  assert.match(source, /\["GET", "POST", "PATCH", "DELETE"\]/);
});

test("thread navigation opens a sidebar row or falls back to the native route", () => {
  const compatibility = readFileSync(new URL("../src/compatibility.ts", import.meta.url), "utf8");
  const navigation = compatibility.slice(compatibility.indexOf("export function navigationExpression"), compatibility.indexOf("export function readCompatibilityStatus"));

  assert.match(navigation, /const deadline = Date\.now\(\) \+ 10000/);
  assert.match(navigation, /if \(current\.active === expected\)/);
  assert.match(navigation, /window\.postMessage\(\{ type: navigation\.messageType/);
  assert.match(navigation, /location\.pathname\.match/);
  assert.match(navigation, /thread_open_timeout/);
  assert.match(navigation, /threadRoutePrefix/);
});

test("Windows restart only terminates the Codex Desktop main process", () => {
  assert.match(source, /Get-CimInstance Win32_Process -Filter \\\"Name = 'ChatGPT\.exe'\\\"/);
  assert.match(source, /CommandLine -notmatch \\\"--type=\\\"/);
  assert.match(source, /Stop-Process -Id \$_.ProcessId/);
  assert.doesNotMatch(source, /Get-Process -Name 'ChatGPT','Codex'/);
});

test("macOS restart quits only the installed Desktop app by Bundle ID", () => {
  assert.match(source, /function desktopApplicationBundleId\(application: string\)/);
  assert.match(source, /tell application id/);
  assert.match(source, /return running/);
  assert.doesNotMatch(source, /const names = \["ChatGPT", "Codex"\]/);
  assert.doesNotMatch(source, /\/usr\/bin\/killall/);
});

test("launch restart asks before terminating Codex", () => {
  assert.match(source, /function codexProcessRunning\(\)/);
  assert.match(source, /function confirmCodexQuit\(\)/);
  assert.match(source, /MessageBoxButtons\]::YesNo/);
  assert.match(source, /buttons \{\"取消\", \"继续\"\}/);
  assert.match(source, /options\.confirmQuit && codexProcessRunning\(\) && !confirmCodexQuit\(\)/);
  assert.match(source, /codex_quit_cancelled/);
});
