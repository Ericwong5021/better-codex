import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { macLauncherOwnershipScripts, windowsArgumentForTest } from "../src/launch-integration.js";

const source = readFileSync(new URL("../src/launch-integration.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");

test("macOS launcher is named Better Codex.app and delegates to launch", () => {
  assert.match(source, /launcherDisplayName = developmentProfile \? "Better Codex Dev" : "Better Codex"/);
  assert.match(source, /`\/Applications\/\$\{launcherDisplayName\}\.app`/);
  assert.match(source, /Better Codex Launcher\.app/);
  assert.match(source, /BETTER_CODEX_PROFILE=\$\{shellSingleQuoted\(betterCodexProfile\)\}/);
  assert.match(source, /BETTER_CODEX_HOME=\$\{shellSingleQuoted\(betterCodexHome\)\}/);
  assert.match(source, /BETTER_CODEX_PEER_HOME=\$\{shellSingleQuoted\(peerBetterCodexHome\)\}/);
  assert.match(source, /com\.better-codex\.launcher/);
  assert.match(source, /CFBundleDisplayName<\/key><string>\$\{launcherDisplayName\}<\/string>/);
  const ownershipScripts = macLauncherOwnershipScripts(["/tmp/better-codex"]);
  assert.equal(ownershipScripts.length, 2);
  assert.match(ownershipScripts[0], /BETTER_CODEX_PROFILE=/);
  assert.doesNotMatch(ownershipScripts[1], /BETTER_CODEX_PROFILE=/);
});

test("Windows creates owned Better Codex shortcuts instead of rewriting Codex shortcuts", () => {
  assert.match(source, /WINDOWS_SHORTCUT_NAME = `\$\{launcherDisplayName\}\.lnk`/);
  assert.match(source, /WINDOWS_LAUNCHER_SCRIPT_NAME = `\$\{launcherDisplayName\} Launcher\.vbs`/);
  assert.match(source, /Join-Path \$desktop/);
  assert.match(source, /Join-Path \$startMenu/);
  assert.match(source, /\$shortcut\.TargetPath = \$launcher/);
  assert.match(source, /\$shortcut\.Arguments = \$launchArguments/);
  assert.match(source, /\$shortcut\.Description = \$\{powershellLiteral\(launcherDisplayName\)\}/);
  assert.match(source, /Remove-Item -LiteralPath \$path/);
  assert.match(source, /shortcut_restore_incomplete_/);
  assert.match(source, /shortcut_remove_incomplete_/);
  assert.match(source, /restoreLegacyWindowsShortcuts/);
  assert.match(source, /isLegacyWindowsState/);
  assert.match(source, /mac_launcher_path_occupied/);
  assert.match(source, /join\(logPath, "launcher\.log"\)/);
  assert.match(source, /healthy = \$healthy; drifted = \$drifted; missing = \$missing/);
  assert.doesNotMatch(source, /looksLikeCodex|ownedByPrevious/);
  assert.match(source, /windowsLegacyShortcutRoots/);
  assert.match(source, /wscript\.exe/);
  assert.match(source, /shell\.Run/);
  assert.match(source, /BETTER_CODEX_PROFILE/);
  assert.match(source, /BETTER_CODEX_HOME/);
  assert.match(source, /BETTER_CODEX_PEER_HOME/);
});

test("Windows shortcut arguments preserve quotes, empty values, and trailing backslashes", () => {
  assert.equal(windowsArgumentForTest("plain"), "plain");
  assert.equal(windowsArgumentForTest(""), '""');
  assert.equal(windowsArgumentForTest("C:\\Program Files\\Better Codex\\"), '"C:\\Program Files\\Better Codex\\\\"');
  assert.equal(windowsArgumentForTest('value"quoted'), '"value\\"quoted"');
  assert.equal(windowsArgumentForTest('value\\"quoted'), '"value\\\\\\"quoted"');
});

test("macOS and Windows launchers use the Better Codex brand icon", () => {
  assert.match(source, /writeMacAppIcon/);
  assert.match(source, /writeWindowsAppIcon/);
  assert.match(source, /appIconIcns/);
  assert.match(source, /appIconIco/);
  assert.match(source, /AppIcon\.icns/);
  assert.match(source, /AppIcon\.ico/);
  assert.match(source, /\$shortcut\.IconLocation = \$iconLocation/);
  assert.doesNotMatch(source, /macCodexApplication|Codex\.exe.*,0/);
});

test("launcher serializes concurrent Codex restarts and keeps migration guards", () => {
  assert.match(cliSource, /mkdirSync\(launchLockPath/);
  assert.match(cliSource, /return print\(await withLaunchLock/);
  assert.match(cliSource, /owner\.token === token/);
  assert.match(cliSource, /renameSync\(launchLockPath, stalePath\)/);
  assert.match(cliSource, /const switchedFrom = await deactivatePeerInstance\(\)/);
  assert.match(source, /validateState/);
  assert.match(source, /macBundleIdentifier\(info\) === MAC_BUNDLE_ID/);
  assert.match(source, /temporaryApp/);
  assert.match(source, /windowsOwnedShortcutRoots/);
  assert.match(source, /windowsLegacyShortcutRoots/);
  assert.doesNotMatch(source, /CommonDesktopDirectory|CommonStartMenu/);
  assert.match(source, /realpathSync\.native/);
  assert.match(source, /Test-OwnedShortcut/);
  assert.match(source, /Test-ManagedBackup/);
  assert.match(source, /mac_launcher_replacement_required/);
  assert.match(source, /previous\?\.platform === "darwin"/);
  assert.match(source, /betterCodexProfile === "stable" && existsSync\(appPath\)/);
  assert.match(source, /migrateLegacyMacLauncher/);
});

test("shortcut launch opens the current Codex and supports an explicit restart", () => {
  assert.match(cliSource, /openedCurrentCodex: true/);
  assert.match(cliSource, /async function restartRuntime\(\)/);
  assert.match(cliSource, /restarted: true/);
  assert.match(cliSource, /const codexRunning = process\.platform === "win32" \? windowsCodexRunning : codexProcessRunning\(\) \|\| current\.available \|\| current\.targets\.length > 0/);
  assert.match(cliSource, /codexStarted: true/);
  assert.match(cliSource, /await cdpRestartAndInject\(cdpPort, activeRuntimePort\(\), accessToken\(\), \{ confirmQuit: false \}\)/);
  assert.match(cliSource, /includes\("--restart"\)/);
  assert.match(cliSource, /latestIntent\.restart === true/);
});

test("Windows shortcut routes every running Codex through restart confirmation", () => {
  const policy = cliSource.indexOf("requiresCodexRestartForLaunch(codexRunning)");
  const switchedProfileReuse = cliSource.indexOf("if (switchedFrom && !restartRequested)", policy);
  const ordinaryReuse = cliSource.indexOf("if (!restartRequested)", switchedProfileReuse);
  const restart = cliSource.indexOf("await cdpRestartAndInject", ordinaryReuse);
  assert.ok(policy >= 0 && switchedProfileReuse > policy && ordinaryReuse > switchedProfileReuse && restart > ordinaryReuse);
});

test("Windows shortcut checks only the Codex process before asking to restart", () => {
  assert.match(cliSource, /const explicitRestartRequested = latestIntent\.restart === true/);
  assert.match(cliSource, /const restartRequested = explicitRestartRequested \|\| requiresCodexRestartForLaunch\(codexRunning\)/);
  const launch = cliSource.indexOf("if (command === \"launch\")");
  const processDiscovery = cliSource.indexOf('const windowsCodexRunning = process.platform === "win32" && codexProcessRunning()', launch);
  const confirmation = cliSource.indexOf("windowsCodexRunning && !explicitRestartRequested && !confirmCodexRestart()", processDiscovery);
  const platformDiscovery = cliSource.indexOf('const current = process.platform === "win32" ? { available: false, targets: [] } : await cdpStatus(cdpPort)', confirmation);
  const peerDeactivation = cliSource.indexOf("await deactivatePeerInstance()", confirmation);
  const runtimeRestart = cliSource.indexOf("await restartRuntime()", confirmation);
  assert.ok(processDiscovery >= 0 && confirmation > processDiscovery && platformDiscovery > confirmation && peerDeactivation > platformDiscovery && runtimeRestart > peerDeactivation);
  assert.match(cliSource, /cancelled: true/);
});

test("shortcut launch restores the bridge when keeping the current Codex", () => {
  const start = cliSource.indexOf("if (!restartRequested) {");
  const end = cliSource.indexOf("return { launched: true, restarted: false, openedCurrentCodex: true, injection }", start);
  assert.ok(start >= 0 && end > start);
  const branch = cliSource.slice(start, end);
  assert.match(branch, /setInjectionEnabled\(true\)/);
  assert.match(branch, /cdpInject\(cdpPort, activeRuntimePort\(\), accessToken\(\), true\)/);
  assert.match(branch, /startInjector\(cdpPort\)/);
});

test("injector pid validation checks the process command", () => {
  assert.match(cliSource, /function isInjectorProcess\(pid: number\)/);
  assert.match(cliSource, /processAlive\(pid\) && isInjectorProcess\(pid\)/);
});

test("launcher coalesces clicks to the latest profile intent and leases the shared lock", () => {
  assert.match(cliSource, /recordLaunchIntent/);
  assert.match(cliSource, /latestIntent\?\.token !== intent\.token/);
  assert.match(cliSource, /superseded: true/);
  assert.match(cliSource, /nextLaunchIntentSequence/);
  assert.match(cliSource, /markLaunchIntentProcessed/);
  assert.match(cliSource, /utimesSync\(launchLockPath/);
  assert.match(cliSource, /leaseExpired/);
  assert.match(cliSource, /identityMismatch/);
});
