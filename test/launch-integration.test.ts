import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/launch-integration.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");

test("macOS launcher delegates to the injection-aware launch command", () => {
  assert.match(source, /Better Codex Launcher\.app/);
  assert.match(source, /stableCommand\.map\(shellSingleQuoted\)\.join\(" "\)\} launch/);
  assert.match(source, /com\.better-codex\.launcher/);
});

test("Windows shortcut integration is reversible and preserves shortcut metadata", () => {
  for (const property of ["targetPath", "arguments", "workingDirectory", "description", "iconLocation"]) {
    assert.ok(source.includes(property));
  }
  assert.match(source, /\$shortcut\.TargetPath = \$launcher/);
  assert.match(source, /\$shortcut\.Arguments = \$launchArguments/);
  assert.match(source, /Copy-Item -LiteralPath \$file\.FullName -Destination \$backupPath/);
  assert.match(source, /Copy-Item -LiteralPath \$item\.backupPath -Destination \$item\.path/);
  assert.doesNotMatch(source, /\(Codex\|ChatGPT\)/);
  assert.match(source, /shortcut_restore_incomplete_/);
  assert.match(source, /mac_launcher_path_occupied/);
  assert.match(source, /join\(logPath, "launcher\.log"\)/);
  assert.match(source, /ownedByPrevious/);
  assert.match(source, /healthy = \$healthy; drifted = \$drifted; missing = \$missing/);
  assert.match(source, /GetFullPath\(\[string\]\$shortcut\.TargetPath\).*GetFullPath\(\$launcher\)/s);
});

test("launcher serializes concurrent Codex restarts", () => {
  assert.match(cliSource, /mkdirSync\(launchLockPath/);
  assert.match(cliSource, /return print\(await withLaunchLock/);
  assert.match(cliSource, /owner\.token === token/);
  assert.match(cliSource, /renameSync\(launchLockPath, stalePath\)/);
  assert.match(source, /validateState/);
  assert.match(source, /macBundleIdentifier\(info\) === "com\.better-codex\.launcher"/);
  assert.match(source, /temporaryApp/);
  assert.match(source, /windowsShortcutRoots/);
  assert.doesNotMatch(source, /CommonDesktopDirectory|CommonStartMenu/);
  assert.match(source, /realpathSync\.native/);
  assert.match(source, /Test-ManagedShortcut/);
  assert.match(source, /Test-ManagedBackup/);
  assert.match(source, /mac_launcher_replacement_required/);
  assert.match(source, /previous\?\.platform === "darwin"/);
});
