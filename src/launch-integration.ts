import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { isSea } from "node:sea";
import { ensureDirectories, launchIntegrationStatePath, logPath } from "./config.js";

type WindowsShortcutBackup = {
  path: string;
  backupPath?: string;
  targetPath: string;
  arguments: string;
  workingDirectory: string;
  description: string;
  iconLocation: string;
};

type LaunchIntegrationState = {
  platform: string;
  launcher: string;
  launcherArguments?: string[];
  appPath?: string;
  shortcuts?: WindowsShortcutBackup[];
};

function macLauncherPath() {
  return "/Applications/Better Codex Launcher.app";
}

function legacyMacLauncherPath() {
  return join(homedir(), "Applications", "Better Codex Launcher.app");
}

function macBundleIdentifier(infoPath: string) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", infoPath], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function windowsShortcutRoots() {
  const script = `@(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('StartMenu'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ } | Select-Object -Unique | ConvertTo-Json -Compress`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
  const value = output ? JSON.parse(output) as string[] | string : [];
  return (Array.isArray(value) ? value : [value]).map(root => resolve(root));
}

function pathWithin(path: string, root: string) {
  const normalizedPath = path.toLowerCase();
  const normalizedRoot = root.toLowerCase().replace(/[\\/]+$/, "");
  return normalizedPath.startsWith(`${normalizedRoot}\\`);
}

function validateState(value: unknown): LaunchIntegrationState {
  if (!value || typeof value !== "object") throw new Error("launch_integration_state_invalid");
  const state = value as LaunchIntegrationState;
  if (!["darwin", "win32"].includes(state.platform) || typeof state.launcher !== "string") throw new Error("launch_integration_state_invalid");
  if (state.platform !== process.platform) throw new Error("launch_integration_state_invalid");
  if (state.launcherArguments && (!Array.isArray(state.launcherArguments) || state.launcherArguments.some(argument => typeof argument !== "string"))) {
    throw new Error("launch_integration_state_invalid");
  }
  if (state.platform === "darwin" && ![macLauncherPath(), legacyMacLauncherPath()].includes(state.appPath ?? "")) throw new Error("launch_integration_state_invalid");
  if (state.platform === "win32") {
    if (!Array.isArray(state.shortcuts)) throw new Error("launch_integration_state_invalid");
    const backupDirectory = resolve(join(dirname(launchIntegrationStatePath), "shortcut-backups"));
    if (!existsSync(backupDirectory) || lstatSync(backupDirectory).isSymbolicLink()) throw new Error("launch_integration_state_invalid");
    const canonicalBackupDirectory = realpathSync.native(backupDirectory);
    const roots = windowsShortcutRoots().filter(existsSync).map(root => realpathSync.native(root));
    for (const shortcut of state.shortcuts) {
      if (!shortcut || typeof shortcut !== "object") throw new Error("launch_integration_state_invalid");
      for (const key of ["path", "targetPath", "arguments", "workingDirectory", "description", "iconLocation"] as const) {
        if (typeof shortcut[key] !== "string") throw new Error("launch_integration_state_invalid");
      }
      const shortcutPath = resolve(shortcut.path);
      if (!shortcutPath.toLowerCase().endsWith(".lnk")) {
        throw new Error("launch_integration_state_invalid");
      }
      if (existsSync(shortcutPath)) {
        if (lstatSync(shortcutPath).isSymbolicLink() || !roots.some(root => pathWithin(realpathSync.native(shortcutPath), root))) throw new Error("launch_integration_state_invalid");
      }
      if (shortcut.backupPath) {
        const backup = resolve(shortcut.backupPath);
        if (dirname(backup) !== backupDirectory || !backup.toLowerCase().endsWith(".lnk")) throw new Error("launch_integration_state_invalid");
        if (existsSync(backup) && (lstatSync(backup).isSymbolicLink() || dirname(realpathSync.native(backup)) !== canonicalBackupDirectory)) throw new Error("launch_integration_state_invalid");
      }
    }
  }
  return state;
}

function launcherCommand() {
  if (process.env.BETTER_CODEX_LAUNCHER_PATH) return [resolve(process.env.BETTER_CODEX_LAUNCHER_PATH)];
  if (isSea()) return [resolve(process.execPath)];
  return [resolve(process.execPath), ...process.execArgv, resolve(process.argv[1])];
}

function shellSingleQuoted(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function powershellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function windowsArgument(value: string) {
  return /[\s"]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

function readState(): LaunchIntegrationState | null {
  if (!existsSync(launchIntegrationStatePath)) return null;
  try {
    return validateState(JSON.parse(readFileSync(launchIntegrationStatePath, "utf8")));
  } catch {
    throw new Error("launch_integration_state_invalid");
  }
}

function writeState(state: LaunchIntegrationState) {
  ensureDirectories();
  writeFileSync(launchIntegrationStatePath, JSON.stringify(state, null, 2), { mode: 0o600 });
}

function macCodexApplication() {
  return ["/Applications/Codex.app", "/Applications/ChatGPT.app"].find(existsSync) ?? null;
}

function macIcon(application: string | null) {
  if (!application) return null;
  const resources = join(application, "Contents", "Resources");
  for (const name of ["AppIcon.icns", "app.icns", "electron.icns"]) {
    const path = join(resources, name);
    if (existsSync(path)) return path;
  }
  return null;
}

function installMacLauncher(command: string[], previous: LaunchIntegrationState | null) {
  const appPath = macLauncherPath();
  const legacyAppPath = legacyMacLauncherPath();
  if (!existsSync(appPath) && existsSync(legacyAppPath)) {
    const legacyContents = join(legacyAppPath, "Contents");
    const legacyInfo = join(legacyContents, "Info.plist");
    if (lstatSync(legacyAppPath).isSymbolicLink() || !existsSync(legacyContents) || lstatSync(legacyContents).isSymbolicLink() || !existsSync(legacyInfo) || lstatSync(legacyInfo).isSymbolicLink() || macBundleIdentifier(legacyInfo) !== "com.better-codex.launcher") throw new Error("mac_launcher_path_occupied");
    renameSync(legacyAppPath, appPath);
  }
  const existingContents = join(appPath, "Contents");
  const existingInfo = join(existingContents, "Info.plist");
  if (existsSync(appPath) && (lstatSync(appPath).isSymbolicLink() || !existsSync(existingContents) || lstatSync(existingContents).isSymbolicLink() || !existsSync(existingInfo) || lstatSync(existingInfo).isSymbolicLink() || macBundleIdentifier(existingInfo) !== "com.better-codex.launcher")) throw new Error("mac_launcher_path_occupied");
  const stableCommand = existsSync(appPath) && previous?.platform === "darwin"
    ? [previous.launcher, ...(previous.launcherArguments ?? [])]
    : command;
  const [launcher, ...launcherArguments] = stableCommand;
  const expectedScript = `#!/bin/sh
${stableCommand.map(shellSingleQuoted).join(" ")} launch >>${shellSingleQuoted(join(logPath, "launcher.log"))} 2>&1 &
exit 0
`;
  if (existsSync(appPath)) {
    const existingExecutable = join(existingContents, "MacOS", "better-codex-launcher");
    if (!existsSync(existingExecutable) || lstatSync(existingExecutable).isSymbolicLink() || readFileSync(existingExecutable, "utf8") !== expectedScript) {
      throw new Error("mac_launcher_replacement_required");
    }
    try {
      execFileSync("/usr/bin/touch", [appPath]);
      execFileSync("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", ["-f", appPath], { stdio: "ignore" });
    } catch {
    }
    return { platform: "darwin", launcher, launcherArguments, appPath } satisfies LaunchIntegrationState;
  }
  const temporaryApp = `${appPath}.tmp.${randomUUID()}`;
  const contents = join(temporaryApp, "Contents");
  const macos = join(contents, "MacOS");
  const resources = join(contents, "Resources");
  try {
    mkdirSync(macos, { recursive: true, mode: 0o700 });
    mkdirSync(resources, { recursive: true, mode: 0o700 });
    writeFileSync(join(contents, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDevelopmentRegion</key><string>en</string>
<key>CFBundleDisplayName</key><string>Better Codex</string>
<key>CFBundleExecutable</key><string>better-codex-launcher</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundleIdentifier</key><string>com.better-codex.launcher</string>
<key>CFBundleName</key><string>Better Codex</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>
`);
    const executable = join(macos, "better-codex-launcher");
    writeFileSync(executable, expectedScript);
    chmodSync(executable, 0o755);
    const icon = macIcon(macCodexApplication());
    if (icon) copyFileSync(icon, join(resources, "AppIcon.icns"));
    renameSync(temporaryApp, appPath);
  } catch (error) {
    rmSync(temporaryApp, { recursive: true, force: true });
    throw error;
  }
  try {
    execFileSync("/usr/bin/touch", [appPath]);
    execFileSync("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", ["-f", appPath], { stdio: "ignore" });
  } catch {
  }
  return { platform: "darwin", launcher, launcherArguments, appPath } satisfies LaunchIntegrationState;
}

function windowsInstallScript(command: string[], previousState: LaunchIntegrationState | null, backupDirectory: string) {
  const [launcher, ...launcherArguments] = command;
  const argumentsValue = [...launcherArguments, "launch"].map(windowsArgument).join(" ");
  const existing = previousState?.platform === "win32" ? previousState.shortcuts ?? [] : [];
  const previousLauncher = previousState?.platform === "win32" ? previousState.launcher : "";
  const previousArguments = previousState?.platform === "win32"
    ? [...(previousState.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ")
    : "";
  const previous = Buffer.from(JSON.stringify(existing), "utf8").toString("base64");
  return `$ErrorActionPreference = "Stop"
$launcher = ${powershellLiteral(launcher)}
$launchArguments = ${powershellLiteral(argumentsValue)}
$previousLauncher = ${powershellLiteral(previousLauncher)}
$previousArguments = ${powershellLiteral(previousArguments)}
$backupDirectory = ${powershellLiteral(backupDirectory)}
$previousJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(previous)}))
$backups = @()
if ($previousJson) { $backups = @($previousJson | ConvertFrom-Json) }
$known = @{}
foreach ($item in $backups) { $known[[string]$item.path] = $item }
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('StartMenu'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
$canonicalRoots = @($roots | ForEach-Object { (Resolve-Path -LiteralPath $_).Path.TrimEnd('\') })
$canonicalBackupDirectory = (Resolve-Path -LiteralPath $backupDirectory).Path.TrimEnd('\')
function Test-ManagedShortcut([string]$path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    foreach ($root in $canonicalRoots) {
      if ($resolved.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
  } catch {}
  return $false
}
function Test-ManagedBackup([string]$path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    return [IO.Path]::GetDirectoryName($resolved).Equals($canonicalBackupDirectory, [StringComparison]::OrdinalIgnoreCase)
  } catch { return $false }
}
$shell = New-Object -ComObject WScript.Shell
foreach ($root in $roots) {
  foreach ($file in Get-ChildItem -LiteralPath $root -Filter '*.lnk' -File -Recurse -ErrorAction SilentlyContinue) {
    try {
      if (-not (Test-ManagedShortcut $file.FullName)) { continue }
      $shortcut = $shell.CreateShortcut($file.FullName)
      $target = [string]$shortcut.TargetPath
      $arguments = [string]$shortcut.Arguments
      $iconLocation = [string]$shortcut.IconLocation
      $looksLikeCodex = ($file.BaseName -match '^Codex$' -or
        $target -match '(?i)[\\/]Codex\.exe$' -or
        $arguments -match '(?i)OpenAI\.Codex_[A-Za-z0-9]+!App(?:$|\s)')
      $ownedByPrevious = $known.ContainsKey($file.FullName) -and $previousLauncher -and $target -and
        [IO.Path]::GetFullPath($target) -eq [IO.Path]::GetFullPath($previousLauncher) -and $arguments -eq $previousArguments
      if (-not $looksLikeCodex -and -not $ownedByPrevious) { continue }
      if ($target -and [IO.Path]::GetFullPath($target) -eq [IO.Path]::GetFullPath($launcher) -and $arguments -eq $launchArguments) { continue }
      if (-not $ownedByPrevious) {
        $backupPath = Join-Path $backupDirectory (([guid]::NewGuid().ToString()) + '.lnk')
        Copy-Item -LiteralPath $file.FullName -Destination $backupPath -Force
        $replacement = [pscustomobject]@{
          path = $file.FullName
          backupPath = $backupPath
          targetPath = $target
          arguments = $arguments
          workingDirectory = [string]$shortcut.WorkingDirectory
          description = [string]$shortcut.Description
          iconLocation = $iconLocation
        }
        if ($known.ContainsKey($file.FullName)) {
          $oldBackup = [string]$known[$file.FullName].backupPath
          if ($oldBackup -and $oldBackup -ne $backupPath -and (Test-ManagedBackup $oldBackup)) { Remove-Item -LiteralPath $oldBackup -Force -ErrorAction SilentlyContinue }
        }
        $known[$file.FullName] = $replacement
      }
      $shortcut.TargetPath = $launcher
      $shortcut.Arguments = $launchArguments
      $shortcut.WorkingDirectory = [IO.Path]::GetDirectoryName($launcher)
      $shortcut.Description = 'Launch Codex with Better Codex injection'
      if ($iconLocation) { $shortcut.IconLocation = $iconLocation }
      elseif ($target -and (Test-Path -LiteralPath $target)) { $shortcut.IconLocation = "$target,0" }
      $shortcut.Save()
    } catch {
      # System-wide shortcuts may not be writable without elevation.
    }
  }
}
@($known.Values) | ConvertTo-Json -Depth 4 -Compress
`;
}

function installWindowsShortcuts(command: string[], previous: LaunchIntegrationState | null) {
  const [launcher, ...launcherArguments] = command;
  const backupDirectory = join(dirname(launchIntegrationStatePath), "shortcut-backups");
  mkdirSync(backupDirectory, { recursive: true });
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", windowsInstallScript(command, previous, backupDirectory)], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  const shortcuts = output ? JSON.parse(output) as WindowsShortcutBackup[] | WindowsShortcutBackup : [];
  return { platform: "win32", launcher, launcherArguments, shortcuts: Array.isArray(shortcuts) ? shortcuts : [shortcuts] } satisfies LaunchIntegrationState;
}

function windowsShortcutStatus(state: LaunchIntegrationState) {
  const payload = Buffer.from(JSON.stringify(state.shortcuts ?? []), "utf8").toString("base64");
  const expectedArguments = [...(state.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ");
  const script = `$ErrorActionPreference = "Continue"
$launcher = ${powershellLiteral(state.launcher)}
$launchArguments = ${powershellLiteral(expectedArguments)}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(payload)}))
$items = @($json | ConvertFrom-Json)
$shell = New-Object -ComObject WScript.Shell
$healthy = 0
$drifted = 0
$missing = 0
foreach ($item in $items) {
  if (-not (Test-Path -LiteralPath $item.path)) { $missing += 1; continue }
  try {
    $shortcut = $shell.CreateShortcut([string]$item.path)
    if ([IO.Path]::GetFullPath([string]$shortcut.TargetPath) -eq [IO.Path]::GetFullPath($launcher) -and [string]$shortcut.Arguments -eq $launchArguments) { $healthy += 1 }
    else { $drifted += 1 }
  } catch { $drifted += 1 }
}
[pscustomobject]@{ healthy = $healthy; drifted = $drifted; missing = $missing } | ConvertTo-Json -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
  return JSON.parse(output) as { healthy: number; drifted: number; missing: number };
}

export function installLaunchIntegration() {
  const command = launcherCommand();
  const previous = readState();
  let state: LaunchIntegrationState;
  if (process.platform === "darwin") state = installMacLauncher(command, previous);
  else if (process.platform === "win32") state = installWindowsShortcuts(command, previous);
  else return { installed: false, platform: process.platform, reason: "launch_integration_unsupported" };
  writeState(state);
  return { installed: true, ...state, shortcutCount: state.shortcuts?.length ?? undefined };
}

function restoreWindowsShortcuts(state: LaunchIntegrationState) {
  const payload = Buffer.from(JSON.stringify(state.shortcuts ?? []), "utf8").toString("base64");
  const expectedArguments = [...(state.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ");
  const backupDirectory = join(dirname(launchIntegrationStatePath), "shortcut-backups");
  const script = `$ErrorActionPreference = "Continue"
$launcher = ${powershellLiteral(state.launcher)}
$launchArguments = ${powershellLiteral(expectedArguments)}
$backupDirectory = ${powershellLiteral(backupDirectory)}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(payload)}))
$items = @($json | ConvertFrom-Json)
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('StartMenu'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
$canonicalRoots = @($roots | ForEach-Object { (Resolve-Path -LiteralPath $_).Path.TrimEnd('\') })
$canonicalBackupDirectory = (Resolve-Path -LiteralPath $backupDirectory).Path.TrimEnd('\')
function Test-ManagedShortcut([string]$path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    foreach ($root in $canonicalRoots) {
      if ($resolved.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
  } catch {}
  return $false
}
function Test-ManagedBackup([string]$path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    return [IO.Path]::GetDirectoryName($resolved).Equals($canonicalBackupDirectory, [StringComparison]::OrdinalIgnoreCase)
  } catch { return $false }
}
$shell = New-Object -ComObject WScript.Shell
$restored = 0
$pending = 0
foreach ($item in $items) {
  if (-not (Test-ManagedShortcut ([string]$item.path))) { continue }
  try {
    $shortcut = $shell.CreateShortcut([string]$item.path)
    if ([IO.Path]::GetFullPath([string]$shortcut.TargetPath) -ne [IO.Path]::GetFullPath($launcher) -or [string]$shortcut.Arguments -ne $launchArguments) { continue }
    if ($item.backupPath -and (Test-ManagedBackup ([string]$item.backupPath))) {
      Copy-Item -LiteralPath $item.backupPath -Destination $item.path -Force -ErrorAction Stop
      $restored += 1
      continue
    }
    $shortcut.TargetPath = [string]$item.targetPath
    $shortcut.Arguments = [string]$item.arguments
    $shortcut.WorkingDirectory = [string]$item.workingDirectory
    $shortcut.Description = [string]$item.description
    $shortcut.IconLocation = [string]$item.iconLocation
    $shortcut.Save()
    $restored += 1
  } catch { $pending += 1 }
}
[pscustomobject]@{ restored = $restored; pending = $pending } | ConvertTo-Json -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
  return JSON.parse(output) as { restored: number; pending: number };
}

export function uninstallLaunchIntegration() {
  const state = readState();
  if (!state) return { uninstalled: true, restored: 0, removed: null };
  let restored = 0;
  let removed: string | null = null;
  if (state.platform === "win32" && process.platform === "win32") {
    const result = restoreWindowsShortcuts(state);
    restored = result.restored;
    if (result.pending > 0) throw new Error(`shortcut_restore_incomplete_${result.pending}`);
  }
  if (state.platform === "darwin" && state.appPath && process.platform === "darwin") {
    const appPath = state.appPath;
    const contents = join(appPath, "Contents");
    const info = join(contents, "Info.plist");
    if (existsSync(appPath) && !lstatSync(appPath).isSymbolicLink() && existsSync(contents) && !lstatSync(contents).isSymbolicLink() && existsSync(info) && !lstatSync(info).isSymbolicLink() && macBundleIdentifier(info) === "com.better-codex.launcher") {
      rmSync(appPath, { recursive: true, force: true });
      removed = appPath;
    }
  }
  if (state.platform === "win32") rmSync(join(dirname(launchIntegrationStatePath), "shortcut-backups"), { recursive: true, force: true });
  rmSync(launchIntegrationStatePath, { force: true });
  return { uninstalled: true, restored, removed };
}

export function launchIntegrationStatus() {
  const state = readState();
  if (!state) return { installed: false, platform: process.platform };
  if (state.platform === "win32" && process.platform === "win32") {
    const shortcuts = windowsShortcutStatus(state);
    return { installed: shortcuts.healthy > 0, ...state, shortcutCount: state.shortcuts?.length ?? 0, ...shortcuts };
  }
  const installed = state.platform === "darwin"
    ? Boolean(state.appPath && existsSync(state.appPath))
    : false;
  return { installed, ...state, shortcutCount: state.shortcuts?.length ?? undefined };
}
