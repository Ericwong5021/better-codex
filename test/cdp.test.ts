import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { requiresCodexRestartForLaunch, windowsCodexPackageProcessPowerShell } from "../src/cdp.js";

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
  assert.match(navigation, /__betterCodexInjection__\?\.openThread/);
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

test("Windows shortcut offers to restart every running Codex instance", () => {
  assert.equal(requiresCodexRestartForLaunch(true, "win32"), true);
  assert.equal(requiresCodexRestartForLaunch(false, "win32"), false);
  assert.equal(requiresCodexRestartForLaunch(true, "darwin"), false);
});

test("Windows launch detects Codex without starting PowerShell or probing CDP", () => {
  const start = source.indexOf("export function codexProcessRunning()");
  const end = source.indexOf("export type CodexRestartChoice", start);
  const branch = source.slice(start, end);
  assert.match(branch, /tasklist\.exe/);
  assert.match(branch, /IMAGENAME eq ChatGPT\.exe/);
  assert.doesNotMatch(branch, /Get-CimInstance/);
});

test("every main target scan has a total deadline and candidate cap", () => {
  assert.match(source, /const cdpTargetScanTimeoutMs = 30_000/);
  assert.match(source, /const cdpTargetCandidateLimit = 32/);
  assert.match(source, /deadlineAt: options\.deadlineAt \?\? Date\.now\(\) \+ cdpTargetScanTimeoutMs/);
  assert.match(source, /\.slice\(0, cdpTargetCandidateLimit\)/);
});

test("CDP injection trusts only the installed Codex listener and same-port loopback sockets", () => {
  assert.match(source, /function assertTrustedCdpListener\(port: number\)/);
  assert.match(source, /Get-NetTCPConnection -State Listen/);
  assert.match(source, /GetOwnerSid/);
  assert.match(source, /OpenAI\.Codex_/);
  assert.match(source, /\/usr\/sbin\/lsof/);
  assert.match(source, /function debuggerUrlAllowed/);
  assert.match(source, /\["127\.0\.0\.1", "::1", "localhost"\]/);
  assert.match(source, /Number\(url\.port\) === port/);
  assert.match(source, /redirect: "error"/);
  assert.match(source, /if \(verifyListener\) assertTrustedCdpListener\(port\)/);
});

test("macOS restart quits only the installed Desktop app by Bundle ID", () => {
  assert.match(source, /function desktopApplicationBundleId\(application: string\)/);
  assert.match(source, /tell application id/);
  assert.match(source, /return running/);
  assert.doesNotMatch(source, /const names = \["ChatGPT", "Codex"\]/);
  assert.doesNotMatch(source, /\/usr\/bin\/killall/);
});

test("launcher choice exposes distinct service reset and Codex restart actions", () => {
  assert.match(source, /function codexProcessRunning\(\)/);
  assert.match(source, /function chooseCodexRestartAction\(\)/);
  assert.match(source, /showNativeChoiceDialog\(/);
  assert.match(source, /reset-runtime/);
  assert.match(source, /restart-codex/);
  assert.match(source, /重置服务/);
  assert.match(source, /重启Codex/);
  assert.match(nativeDialogSource, /Add-Type -AssemblyName System\.Windows\.Forms/);
  assert.match(nativeDialogSource, /DialogResult\]::No/);
  assert.match(nativeDialogSource, /DialogResult\]::Yes/);
  assert.doesNotMatch(source, /confirmQuit/);
});

test("native restart choice uses Better Codex branding on Windows and macOS", () => {
  assert.match(nativeDialogSource, /appIconIco/);
  assert.match(nativeDialogSource, /AppIcon\.ico/);
  assert.match(nativeDialogSource, /\$form\.Icon = \$dialogIcon/);
  assert.match(nativeDialogSource, /\$form\.ShowIcon = \$true/);
  assert.match(nativeDialogSource, /appIconIcns/);
  assert.match(nativeDialogSource, /AppIcon\.icns/);
  assert.match(nativeDialogSource, /with icon \(POSIX file/);
});

test("Windows restart choice uses standard Windows dialog chrome and two explicit actions", () => {
  assert.match(nativeDialogSource, /AutoScaleMode.*Dpi/);
  assert.match(nativeDialogSource, /SystemFonts\]::MessageBoxFont/);
  assert.match(nativeDialogSource, /SystemColors\]::Control/);
  assert.match(nativeDialogSource, /FlatStyle.*System/);
  assert.match(nativeDialogSource, /UseVisualStyleBackColor = \$true/);
  assert.match(nativeDialogSource, /AccessibleName/);
  assert.match(nativeDialogSource, /FormBorderStyle.*FixedDialog/);
  assert.match(nativeDialogSource, /\$form\.ControlBox = \$true/);
  assert.match(nativeDialogSource, /Write-Output 'primary'/);
  assert.match(nativeDialogSource, /Write-Output 'secondary'/);
  assert.match(nativeDialogSource, /\$secondary\.Focus\(\)/);
  assert.match(nativeDialogSource, /default button \$\{secondary\}/);
  assert.doesNotMatch(nativeDialogSource, /\$form\.CancelButton = \$secondary/);
  assert.doesNotMatch(nativeDialogSource, /GraphicsPath/);
  assert.doesNotMatch(nativeDialogSource, /Set-RoundedRegion/);
  assert.doesNotMatch(nativeDialogSource, /Add_Paint/);
  assert.doesNotMatch(nativeDialogSource, /\$close = New-Object System\.Windows\.Forms\.Button/);
});
