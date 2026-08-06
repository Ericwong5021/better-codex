import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/launch-integration.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");

test("macOS launcher is named Better Codex.app and delegates to launch", () => {
  assert.match(source, /\/Applications\/Better Codex\.app/);
  assert.match(source, /Better Codex Launcher\.app/);
  assert.match(source, /stableCommand\.map\(shellSingleQuoted\)\.join\(" "\)\} launch/);
  assert.match(source, /com\.better-codex\.launcher/);
  assert.match(source, /CFBundleDisplayName<\/key><string>Better Codex<\/string>/);
});

test("Windows creates owned Better Codex shortcuts instead of rewriting Codex shortcuts", () => {
  assert.match(source, /Better Codex\.lnk/);
  assert.match(source, /Join-Path \$desktop/);
  assert.match(source, /Join-Path \$startMenu/);
  assert.match(source, /\$shortcut\.TargetPath = \$launcher/);
  assert.match(source, /\$shortcut\.Arguments = \$launchArguments/);
  assert.match(source, /\$shortcut\.Description = 'Better Codex'/);
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
});

test("launcher serializes concurrent Codex restarts and keeps migration guards", () => {
  assert.match(cliSource, /mkdirSync\(launchLockPath/);
  assert.match(cliSource, /return print\(await withLaunchLock/);
  assert.match(cliSource, /owner\.token === token/);
  assert.match(cliSource, /renameSync\(launchLockPath, stalePath\)/);
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
  assert.match(source, /migrateLegacyMacLauncher/);
});
