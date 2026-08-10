import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { windowsCodexPackageProcessPowerShell } from "../src/cdp.js";

const source = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");
const nativeDialogSource = readFileSync(new URL("../src/native-dialog.ts", import.meta.url), "utf8");

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
  assert.match(source, /if \(error instanceof Error && error\.message\.startsWith\("codex_incompatible_"\)\) values = await waitForTargets\(port\);/);
  assert.doesNotMatch(source, /stableCount\s*>=\s*4/);
  assert.doesNotMatch(source, /stableCount/);
  assert.match(source, /setTimeout\(resolve, 150\)/);
  assert.match(source, /settleMs = message\.startsWith\("codex_incompatible_"\) \|\| message\.startsWith\("cdp_unavailable_"\) \? 200 : 500/);
});

test("injector does not open a second debugger against already attached targets", () => {
  assert.match(source, /trustIds\?: Set<string>/);
  assert.match(source, /mainTargets\(port, \{ trustIds: new Set\(attached\.keys\(\)\) \}\)/);
  assert.match(source, /discovered\.filter\(target => boundedOptions\.trustIds!\.has\(target\.id\)\)/);
  assert.match(source, /if \(boundedOptions\.trustIds\?\.has\(target\.id\)\)/);
});

test("bridge allows settings and mockup updates", () => {
  assert.match(source, /settings\\\/auto-dispatch/);
  assert.match(source, /mockup\\\/\(\?:state\|reset\)/);
  assert.match(source, /\["GET", "POST", "PUT", "PATCH", "DELETE"\]/);
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

test("Windows restart terminates the complete installed Codex package process tree", () => {
  const helperStart = source.indexOf("export function windowsCodexPackageProcessPowerShell");
  const start = source.indexOf("async function quitCodex()");
  const end = source.indexOf('if (process.platform !== "darwin")', start);
  assert.ok(helperStart >= 0 && start > helperStart && end > start, "quitCodex Windows implementation is missing");
  const windowsQuit = source.slice(helperStart, end);
  assert.match(windowsQuit, /Get-CimInstance Win32_Process -Filter \\\"Name = 'ChatGPT\.exe'\\\"/);
  assert.match(windowsQuit, /ExecutablePath -notlike \\\"\*\\\\WindowsApps\\\\OpenAI\.Codex_\*\\\"/);
  assert.match(windowsQuit, /SessionId/);
  assert.match(windowsQuit, /GetOwnerSid/);
  assert.match(windowsQuit, /Stop-Process -Id \$_.ProcessId/);
  assert.match(windowsQuit, /\$processes = @\(\$\{ownedPackageProcesses\}\)/);
  assert.match(windowsQuit, /windowsCodexPackageProcessPowerShell\("stop"\)/);
  assert.match(windowsQuit, /windowsCodexPackageProcessPowerShell\("count"\)/);
  assert.doesNotMatch(windowsQuit, /CommandLine -notmatch/);
  assert.doesNotMatch(windowsQuit, /Get-Process -Name 'ChatGPT','Codex'/);
});

test("Windows restart process-count command is valid PowerShell", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const command = windowsCodexPackageProcessPowerShell("count");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout.trim(), /^\d+$/);
});

test("every main target scan has a total deadline and candidate cap", () => {
  assert.match(source, /const cdpTargetScanTimeoutMs = 30_000/);
  assert.match(source, /const cdpTargetCandidateLimit = 32/);
  assert.match(source, /deadlineAt: options\.deadlineAt \?\? Date\.now\(\) \+ cdpTargetScanTimeoutMs/);
  assert.match(source, /\.slice\(0, cdpTargetCandidateLimit\)/);
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
  assert.match(source, /showNativeChoiceDialog\(/);
  assert.match(nativeDialogSource, /Add-Type -AssemblyName System\.Windows\.Forms/);
  assert.match(nativeDialogSource, /DialogResult\]::No/);
  assert.match(nativeDialogSource, /DialogResult\]::Yes/);
  assert.match(source, /options\.confirmQuit && codexProcessRunning\(\) && !confirmCodexQuit\(\)/);
  assert.match(source, /codex_quit_cancelled/);
});
