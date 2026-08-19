import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { isSea } from "node:sea";
import { appIconIcns, appIconIco } from "./brand-assets.js";
import { betterCodexHome, betterCodexProfile, ensureDirectories, launchIntegrationStatePath, logPath, peerBetterCodexHome, sourceProcessArguments } from "./config.js";

type WindowsOwnedShortcut = {
  path: string;
};

type WindowsLegacyShortcut = {
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
  ownershipToken?: string;
  shortcuts?: Array<WindowsOwnedShortcut | WindowsLegacyShortcut>;
};

const developmentProfile = betterCodexProfile === "development";
const launcherDisplayName = developmentProfile ? "Better Codex Dev" : "Better Codex";
const MAC_BUNDLE_ID = developmentProfile ? "com.better-codex.launcher.dev" : "com.better-codex.launcher";
const MAC_OWNERSHIP_FILE = ".better-codex-owner";
const WINDOWS_SHORTCUT_NAME = `${launcherDisplayName}.lnk`;
const WINDOWS_LAUNCHER_SCRIPT_NAME = `${launcherDisplayName} Launcher.vbs`;

function macLauncherPath() {
  return `/Applications/${launcherDisplayName}.app`;
}

function legacyMacLauncherPaths() {
  if (developmentProfile) return [];
  return [
    "/Applications/Better Codex Launcher.app",
    join(homedir(), "Applications", "Better Codex Launcher.app"),
  ];
}

function allowedMacLauncherPaths() {
  return [macLauncherPath(), ...legacyMacLauncherPaths()];
}

function macBundleIdentifier(infoPath: string) {
  try {
    return execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", infoPath], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function windowsOwnedShortcutRoots() {
  const script = `@(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
) | Where-Object { $_ } | Select-Object -Unique | ConvertTo-Json -Compress`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
  const value = output ? JSON.parse(output) as string[] | string : [];
  return (Array.isArray(value) ? value : [value]).map(root => resolve(root));
}

function windowsLegacyShortcutRoots() {
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
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}\\`);
}

function isLegacyWindowsShortcut(shortcut: WindowsOwnedShortcut | WindowsLegacyShortcut): shortcut is WindowsLegacyShortcut {
  return "targetPath" in shortcut && typeof shortcut.targetPath === "string";
}

function isLegacyWindowsState(state: LaunchIntegrationState) {
  return state.platform === "win32" && Boolean(state.shortcuts?.some(isLegacyWindowsShortcut));
}

function backupDirectoryPath() {
  return resolve(join(dirname(launchIntegrationStatePath), "shortcut-backups"));
}

function validateState(value: unknown): LaunchIntegrationState {
  if (!value || typeof value !== "object") throw new Error("launch_integration_state_invalid");
  const state = value as LaunchIntegrationState;
  if (!["darwin", "win32"].includes(state.platform) || typeof state.launcher !== "string") throw new Error("launch_integration_state_invalid");
  if (state.platform !== process.platform) throw new Error("launch_integration_state_invalid");
  if (state.launcherArguments && (!Array.isArray(state.launcherArguments) || state.launcherArguments.some(argument => typeof argument !== "string"))) {
    throw new Error("launch_integration_state_invalid");
  }
  if (state.platform === "darwin" && !allowedMacLauncherPaths().includes(state.appPath ?? "")) throw new Error("launch_integration_state_invalid");
  if (state.platform === "win32") {
    if (!Array.isArray(state.shortcuts)) throw new Error("launch_integration_state_invalid");
    if (isLegacyWindowsState(state)) validateLegacyWindowsState(state);
    else validateOwnedWindowsState(state);
  }
  return state;
}

function validateOwnedWindowsState(state: LaunchIntegrationState) {
  const roots = windowsOwnedShortcutRoots().filter(existsSync).map(root => realpathSync.native(root));
  for (const shortcut of state.shortcuts ?? []) {
    if (!shortcut || typeof shortcut !== "object" || typeof shortcut.path !== "string") throw new Error("launch_integration_state_invalid");
    if (isLegacyWindowsShortcut(shortcut)) throw new Error("launch_integration_state_invalid");
    const shortcutPath = resolve(shortcut.path);
    if (basename(shortcutPath).toLowerCase() !== WINDOWS_SHORTCUT_NAME.toLowerCase() || !shortcutPath.toLowerCase().endsWith(".lnk")) {
      throw new Error("launch_integration_state_invalid");
    }
    if (existsSync(shortcutPath)) {
      if (lstatSync(shortcutPath).isSymbolicLink() || !roots.some(root => pathWithin(realpathSync.native(shortcutPath), root))) {
        throw new Error("launch_integration_state_invalid");
      }
    } else {
      const parent = dirname(shortcutPath);
      if (!existsSync(parent) || lstatSync(parent).isSymbolicLink() || !roots.some(root => pathWithin(realpathSync.native(parent), root))) {
        throw new Error("launch_integration_state_invalid");
      }
    }
  }
}

function validateLegacyWindowsState(state: LaunchIntegrationState) {
  const backupDirectory = backupDirectoryPath();
  if (!existsSync(backupDirectory) || lstatSync(backupDirectory).isSymbolicLink()) throw new Error("launch_integration_state_invalid");
  const canonicalBackupDirectory = realpathSync.native(backupDirectory);
  const roots = windowsLegacyShortcutRoots().filter(existsSync).map(root => realpathSync.native(root));
  for (const shortcut of state.shortcuts ?? []) {
    if (!shortcut || typeof shortcut !== "object" || !isLegacyWindowsShortcut(shortcut)) throw new Error("launch_integration_state_invalid");
    for (const key of ["path", "targetPath", "arguments", "workingDirectory", "description", "iconLocation"] as const) {
      if (typeof shortcut[key] !== "string") throw new Error("launch_integration_state_invalid");
    }
    const shortcutPath = resolve(shortcut.path);
    if (!shortcutPath.toLowerCase().endsWith(".lnk")) throw new Error("launch_integration_state_invalid");
    if (existsSync(shortcutPath)) {
      if (lstatSync(shortcutPath).isSymbolicLink() || !roots.some(root => pathWithin(realpathSync.native(shortcutPath), root))) {
        throw new Error("launch_integration_state_invalid");
      }
    }
    if (shortcut.backupPath) {
      const backup = resolve(shortcut.backupPath);
      if (dirname(backup) !== backupDirectory || !backup.toLowerCase().endsWith(".lnk")) throw new Error("launch_integration_state_invalid");
      if (existsSync(backup) && (lstatSync(backup).isSymbolicLink() || dirname(realpathSync.native(backup)) !== canonicalBackupDirectory)) {
        throw new Error("launch_integration_state_invalid");
      }
    }
  }
}

function launcherCommand() {
  const sourceArgs = sourceProcessArguments([]);
  const command = process.env.BETTER_CODEX_LAUNCHER_PATH
    ? [resolve(process.env.BETTER_CODEX_LAUNCHER_PATH)]
    : isSea()
      ? [resolve(process.execPath)]
      : sourceArgs ? [resolve(process.execPath), ...sourceArgs] : null;
  if (!command) throw new Error("launcher_requires_file_entrypoint");
  if (process.platform !== "win32") return command;

  ensureDirectories();
  const scriptPath = join(betterCodexHome, WINDOWS_LAUNCHER_SCRIPT_NAME);
  const commandLine = command.map(value => `"${value.replace(/"/g, "\"\"")}"`).join(" ");
  writeFileSync(scriptPath, `Option Explicit
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Environment("Process")("BETTER_CODEX_PROFILE") = "${betterCodexProfile}"
shell.Environment("Process")("BETTER_CODEX_HOME") = "${betterCodexHome.replace(/"/g, "\"\"")}"
shell.Environment("Process")("BETTER_CODEX_PEER_HOME") = "${peerBetterCodexHome.replace(/"/g, "\"\"")}"
shell.Run "${commandLine.replace(/"/g, '""')}" & " launch", 0, False
`, { mode: 0o600 });
  return [join(process.env.SystemRoot ?? "C:\\Windows", "System32", "wscript.exe"), scriptPath];
}

function shellSingleQuoted(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function powershellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function windowsArgument(value: string) {
  if (value && !/[\s"]/.test(value)) return value;
  let quoted = '"';
  let backslashes = 0;
  for (const character of value) {
    if (character === "\\") {
      backslashes += 1;
      continue;
    }
    if (character === '"') {
      quoted += "\\".repeat(backslashes * 2 + 1) + character;
      backslashes = 0;
      continue;
    }
    quoted += "\\".repeat(backslashes) + character;
    backslashes = 0;
  }
  return quoted + "\\".repeat(backslashes * 2) + '"';
}

export function windowsArgumentForTest(value: string) {
  return windowsArgument(value);
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

function writeMacAppIcon(resources: string) {
  mkdirSync(resources, { recursive: true, mode: 0o700 });
  writeFileSync(join(resources, "AppIcon.icns"), appIconIcns());
}

function writeWindowsAppIcon() {
  ensureDirectories();
  const path = join(betterCodexHome, "AppIcon.ico");
  writeFileSync(path, appIconIco());
  return path;
}

function macLauncherScript(command: string[]) {
  return `#!/bin/sh
BETTER_CODEX_PROFILE=${shellSingleQuoted(betterCodexProfile)} BETTER_CODEX_HOME=${shellSingleQuoted(betterCodexHome)} BETTER_CODEX_PEER_HOME=${shellSingleQuoted(peerBetterCodexHome)} ${command.map(shellSingleQuoted).join(" ")} launch >>${shellSingleQuoted(join(logPath, "launcher.log"))} 2>&1 &
exit 0
`;
}

function legacyMacLauncherScript(command: string[]) {
  return `#!/bin/sh
${command.map(shellSingleQuoted).join(" ")} launch >>${shellSingleQuoted(join(logPath, "launcher.log"))} 2>&1 &
exit 0
`;
}

export function macLauncherOwnershipScripts(command: string[]) {
  return developmentProfile ? [macLauncherScript(command)] : [macLauncherScript(command), legacyMacLauncherScript(command)];
}

function assertOwnedMacApp(appPath: string, state: LaunchIntegrationState | null) {
  const contents = join(appPath, "Contents");
  const info = join(contents, "Info.plist");
  const identified = existsSync(info) && !lstatSync(info).isSymbolicLink() && macBundleIdentifier(info) === MAC_BUNDLE_ID;
  if (lstatSync(appPath).isSymbolicLink() || !existsSync(contents) || lstatSync(contents).isSymbolicLink() || !identified) {
    throw new Error("mac_launcher_path_occupied");
  }
  if (state?.platform !== "darwin" || !state.appPath || resolve(state.appPath) !== resolve(appPath)) throw new Error("mac_launcher_path_occupied");
  const marker = join(contents, "Resources", MAC_OWNERSHIP_FILE);
  if (state.ownershipToken && existsSync(marker) && !lstatSync(marker).isSymbolicLink() && readFileSync(marker, "utf8") === state.ownershipToken) return;
  const executable = join(contents, "MacOS", "better-codex-launcher");
  if (!state.ownershipToken && existsSync(executable) && !lstatSync(executable).isSymbolicLink()) {
    const scriptContents = readFileSync(executable, "utf8");
    if (macLauncherOwnershipScripts([state.launcher, ...(state.launcherArguments ?? [])]).includes(scriptContents)) return;
  }
  throw new Error("mac_launcher_path_occupied");
}

function migrateLegacyMacLauncher(appPath: string, previous: LaunchIntegrationState | null) {
  if (existsSync(appPath)) return false;
  for (const legacyAppPath of legacyMacLauncherPaths()) {
    if (!existsSync(legacyAppPath)) continue;
    assertOwnedMacApp(legacyAppPath, previous);
    renameSync(legacyAppPath, appPath);
    return true;
  }
  return false;
}

function installMacLauncher(command: string[], previous: LaunchIntegrationState | null) {
  const appPath = macLauncherPath();
  const migrated = migrateLegacyMacLauncher(appPath, previous);
  const ownedState = migrated && previous ? { ...previous, appPath } : previous;
  if (existsSync(appPath)) assertOwnedMacApp(appPath, ownedState);
  const existingContents = join(appPath, "Contents");
  const stableCommand = betterCodexProfile === "stable" && existsSync(appPath) && previous?.platform === "darwin" && resolve(previous.launcher) === resolve(command[0])
    ? [previous.launcher, ...(previous.launcherArguments ?? [])]
    : command;
  const [launcher, ...launcherArguments] = stableCommand;
  const expectedScript = macLauncherScript(stableCommand);
  const ownershipToken = ownedState?.ownershipToken ?? randomUUID();
  if (existsSync(appPath)) {
    const existingExecutable = join(existingContents, "MacOS", "better-codex-launcher");
    if (!existsSync(existingExecutable) || lstatSync(existingExecutable).isSymbolicLink()) {
      throw new Error("mac_launcher_replacement_required");
    }
    writeFileSync(existingExecutable, expectedScript, { mode: 0o755 });
    chmodSync(existingExecutable, 0o755);
    const resources = join(existingContents, "Resources");
    writeMacAppIcon(resources);
    writeFileSync(join(resources, MAC_OWNERSHIP_FILE), ownershipToken, { mode: 0o600 });
    try {
      execFileSync("/usr/bin/touch", [appPath]);
      execFileSync("/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister", ["-f", appPath], { stdio: "ignore" });
    } catch {
    }
    return { platform: "darwin", launcher, launcherArguments, appPath, ownershipToken } satisfies LaunchIntegrationState;
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
<key>CFBundleDisplayName</key><string>${launcherDisplayName}</string>
<key>CFBundleExecutable</key><string>better-codex-launcher</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundleIdentifier</key><string>${MAC_BUNDLE_ID}</string>
<key>CFBundleName</key><string>${launcherDisplayName}</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>
`);
    const executable = join(macos, "better-codex-launcher");
    writeFileSync(executable, expectedScript);
    chmodSync(executable, 0o755);
    writeMacAppIcon(resources);
    writeFileSync(join(resources, MAC_OWNERSHIP_FILE), ownershipToken, { mode: 0o600 });
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
  return { platform: "darwin", launcher, launcherArguments, appPath, ownershipToken } satisfies LaunchIntegrationState;
}

function restoreLegacyWindowsShortcuts(state: LaunchIntegrationState) {
  const payload = Buffer.from(JSON.stringify(state.shortcuts ?? []), "utf8").toString("base64");
  const expectedArguments = [...(state.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ");
  const backupDirectory = backupDirectoryPath();
  const script = `$ErrorActionPreference = "Continue"
$launcher = ${powershellLiteral(state.launcher)}
$launchArguments = ${powershellLiteral(expectedArguments)}
$backupDirectory = ${powershellLiteral(backupDirectory)}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(payload)}))
$items = @(ConvertFrom-Json -InputObject $json)
if ($items.Count -eq 1 -and $items[0] -is [Array]) { $items = @($items[0]) }
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('StartMenu'),
  (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
$canonicalRoots = @($roots | ForEach-Object { (Resolve-Path -LiteralPath $_).Path.TrimEnd('\\') })
$canonicalBackupDirectory = if (Test-Path -LiteralPath $backupDirectory) { (Resolve-Path -LiteralPath $backupDirectory).Path.TrimEnd('\\') } else { '' }
function Test-ManagedShortcut([string]$path) {
  try {
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    foreach ($root in $canonicalRoots) {
      if ($resolved.StartsWith($root + '\\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
  } catch {}
  return $false
}
function Test-ManagedBackup([string]$path) {
  try {
    if (-not $canonicalBackupDirectory) { return $false }
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
  if (-not $item.targetPath) { continue }
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

function cleanupLegacyWindowsBackups() {
  rmSync(backupDirectoryPath(), { recursive: true, force: true });
}

function installWindowsShortcuts(command: string[], previous: LaunchIntegrationState | null) {
  if (previous && isLegacyWindowsState(previous)) {
    const result = restoreLegacyWindowsShortcuts(previous);
    if (result.pending > 0) throw new Error(`shortcut_restore_incomplete_${result.pending}`);
    cleanupLegacyWindowsBackups();
  }
  const [launcher, ...launcherArguments] = command;
  const target = launcher;
  const targetArguments = [...launcherArguments, "launch"].map(windowsArgument).join(" ");
  const script = `$ErrorActionPreference = "Stop"
$launcher = ${powershellLiteral(target)}
$launchArguments = ${powershellLiteral(targetArguments)}
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs'
if (-not (Test-Path -LiteralPath $startMenu)) { New-Item -ItemType Directory -Path $startMenu -Force | Out-Null }
$paths = @(
  (Join-Path $desktop ${powershellLiteral(WINDOWS_SHORTCUT_NAME)}),
  (Join-Path $startMenu ${powershellLiteral(WINDOWS_SHORTCUT_NAME)})
) | Where-Object { $_ }
$iconLocation = ${powershellLiteral(`${writeWindowsAppIcon()},0`)}
$shell = New-Object -ComObject WScript.Shell
$created = @()
foreach ($path in $paths) {
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $launcher
  $shortcut.Arguments = $launchArguments
  $shortcut.WorkingDirectory = [IO.Path]::GetDirectoryName($launcher)
$shortcut.Description = ${powershellLiteral(launcherDisplayName)}
  $shortcut.IconLocation = $iconLocation
  $shortcut.Save()
  $created += [pscustomobject]@{ path = $path }
}
@($created) | ConvertTo-Json -Depth 3 -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
  }).trim();
  const shortcuts = output ? JSON.parse(output) as WindowsOwnedShortcut[] | WindowsOwnedShortcut : [];
  return {
    platform: "win32",
    launcher: target,
    launcherArguments,
    shortcuts: Array.isArray(shortcuts) ? shortcuts : [shortcuts],
  } satisfies LaunchIntegrationState;
}

function removeOwnedWindowsShortcuts(state: LaunchIntegrationState) {
  const payload = Buffer.from(JSON.stringify(state.shortcuts ?? []), "utf8").toString("base64");
  const expectedArguments = [...(state.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ");
  const script = `$ErrorActionPreference = "Continue"
$launcher = ${powershellLiteral(state.launcher)}
$launchArguments = ${powershellLiteral(expectedArguments)}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(payload)}))
$items = @(ConvertFrom-Json -InputObject $json)
if ($items.Count -eq 1 -and $items[0] -is [Array]) { $items = @($items[0]) }
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
$canonicalRoots = @($roots | ForEach-Object { (Resolve-Path -LiteralPath $_).Path.TrimEnd('\\') })
function Test-OwnedShortcut([string]$path) {
  try {
    if ([IO.Path]::GetFileName($path) -ne ${powershellLiteral(WINDOWS_SHORTCUT_NAME)}) { return $false }
    $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { return $false }
    $resolved = (Resolve-Path -LiteralPath $path -ErrorAction Stop).Path
    foreach ($root in $canonicalRoots) {
      if ([IO.Path]::GetDirectoryName($resolved).Equals($root, [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
  } catch {}
  return $false
}
$shell = New-Object -ComObject WScript.Shell
$removed = 0
$pending = 0
foreach ($item in $items) {
  $path = [string]$item.path
  if (-not (Test-Path -LiteralPath $path)) { continue }
  if (-not (Test-OwnedShortcut $path)) { $pending += 1; continue }
  try {
    $shortcut = $shell.CreateShortcut($path)
    if ([IO.Path]::GetFullPath([string]$shortcut.TargetPath) -ne [IO.Path]::GetFullPath($launcher) -or [string]$shortcut.Arguments -ne $launchArguments) {
      $pending += 1
      continue
    }
    Remove-Item -LiteralPath $path -Force -ErrorAction Stop
    $removed += 1
  } catch { $pending += 1 }
}
[pscustomobject]@{ removed = $removed; pending = $pending } | ConvertTo-Json -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
  return JSON.parse(output) as { removed: number; pending: number };
}

function windowsShortcutStatus(state: LaunchIntegrationState) {
  const payload = Buffer.from(JSON.stringify(state.shortcuts ?? []), "utf8").toString("base64");
  const expectedArguments = [...(state.launcherArguments ?? []), "launch"].map(windowsArgument).join(" ");
  const script = `$ErrorActionPreference = "Continue"
$launcher = ${powershellLiteral(state.launcher)}
$launchArguments = ${powershellLiteral(expectedArguments)}
$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(${powershellLiteral(payload)}))
$items = @(ConvertFrom-Json -InputObject $json)
if ($items.Count -eq 1 -and $items[0] -is [Array]) { $items = @($items[0]) }
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

export function uninstallLaunchIntegration() {
  const state = readState();
  if (!state) return { uninstalled: true, restored: 0, removed: null };
  let restored = 0;
  let removed: string | null = null;
  if (state.platform === "win32" && process.platform === "win32") {
    if (isLegacyWindowsState(state)) {
      const result = restoreLegacyWindowsShortcuts(state);
      restored = result.restored;
      if (result.pending > 0) throw new Error(`shortcut_restore_incomplete_${result.pending}`);
      cleanupLegacyWindowsBackups();
    } else {
      const result = removeOwnedWindowsShortcuts(state);
      if (result.pending > 0) throw new Error(`shortcut_remove_incomplete_${result.pending}`);
      removed = result.removed > 0 ? WINDOWS_SHORTCUT_NAME : null;
    }
  }
  if (state.platform === "darwin" && state.appPath && process.platform === "darwin") {
    const appPath = state.appPath;
    if (existsSync(appPath)) {
      assertOwnedMacApp(appPath, state);
      rmSync(appPath, { recursive: true, force: true });
      removed = appPath;
    }
  }
  rmSync(launchIntegrationStatePath, { force: true });
  return { uninstalled: true, restored, removed };
}

export function launchIntegrationStatus() {
  const state = readState();
  if (!state) return { installed: false, platform: process.platform };
  if (state.platform === "win32" && process.platform === "win32") {
    if (isLegacyWindowsState(state)) {
      return { installed: true, ...state, shortcutCount: state.shortcuts?.length ?? 0, legacy: true };
    }
    const shortcuts = windowsShortcutStatus(state);
    return { installed: shortcuts.healthy > 0, ...state, shortcutCount: state.shortcuts?.length ?? 0, ...shortcuts };
  }
  let installed = false;
  if (state.platform === "darwin" && state.appPath && existsSync(state.appPath)) {
    try {
      assertOwnedMacApp(state.appPath, state);
      installed = true;
    } catch {}
  }
  return { installed, ...state, shortcutCount: state.shortcuts?.length ?? undefined };
}
