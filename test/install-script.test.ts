import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const installerPath = new URL("../scripts/install.ps1", import.meta.url);
const betaInstallerPath = new URL("../scripts/install-beta.ps1", import.meta.url);
const source = readFileSync(installerPath, "utf8");
const betaSource = existsSync(betaInstallerPath) ? readFileSync(betaInstallerPath, "utf8") : "";
const shellSource = readFileSync(new URL("../scripts/install.sh", import.meta.url), "utf8");
const betaShellSource = readFileSync(new URL("../scripts/install-beta.sh", import.meta.url), "utf8");
const previewPromotionSource = readFileSync(new URL("../scripts/promote-preview-feed.sh", import.meta.url), "utf8");

test("Windows installer captures native stderr without turning progress into a terminating error", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Invoke-NativeCapture"
}, $true)
if (-not $function) { throw "Invoke-NativeCapture is missing" }
Invoke-Expression $function.Extent.Text

$ErrorActionPreference = "Stop"
$success = Invoke-NativeCapture $env:ComSpec @("/d", "/c", "echo payload & echo installing_runtime 1>&2 & exit /b 0")
$failure = Invoke-NativeCapture $env:ComSpec @("/d", "/c", "echo actual_failure 1>&2 & exit /b 7")

if ($success.ExitCode -ne 0) { throw "success exit code was $($success.ExitCode)" }
if ($success.Output -notmatch "installing_runtime") { throw "success stderr was not captured" }
if ($success.Stdout -notmatch "payload") { throw "success stdout was not captured separately" }
if ($success.Stdout -match "installing_runtime") { throw "stderr leaked into stdout" }
if ($success.Stderr -notmatch "installing_runtime") { throw "stderr was not captured separately" }
if ($failure.ExitCode -ne 7) { throw "failure exit code was $($failure.ExitCode)" }
if ($failure.Output -notmatch "actual_failure") { throw "failure stderr was not captured" }
if ($ErrorActionPreference -ne "Stop") { throw "ErrorActionPreference was not restored" }
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("all installer commands that merge native stderr use the compatibility wrapper", () => {
  assert.match(source, /function Invoke-NativeCapture/);
  assert.match(source, /Invoke-BetterCodexCapture \$executable \$setupArguments/);
});

test("installers require Node interactively before replacing a legacy executable", () => {
  assert.match(source, /Install Node\.js LTS now\? \[Y\/n\]/);
  assert.match(source, /OpenJS\.NodeJS\.LTS/);
  assert.match(source, /https:\/\/nodejs\.org\/en\/download/);
  assert.match(source, /if \(-not \(Ensure-Node\)\) \{ exit 1 \}/);
  assert.match(shellSource, /Install Node\.js now\? \[Y\/n\]/);
  assert.match(shellSource, /brew install node/);
  assert.match(shellSource, /https:\/\/nodejs\.org\/en\/download/);
});

test("Windows Node dependency rejection exits before attempting package installation", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
foreach ($name in @("Get-NodeVersion", "Ensure-Node")) {
  $function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  if (-not $function) { throw "$name is missing" }
  Invoke-Expression $function.Extent.Text
}
$MinimumNodeVersion = "22.5.0"
$NodeDownloadUrl = "https://nodejs.org/en/download"
$script:NodeExecutable = ""
function Get-NodeExecutables { return @() }
function Read-Host { param([string]$Prompt) return "n" }
function Write-Step { param([string]$Message) }
function Write-Ok { param([string]$Message) }
if (Ensure-Node) { throw "Node rejection was ignored" }
if ($script:NodeExecutable) { throw "Node executable changed after rejection" }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows legacy migration removes the EXE only after the new bundle passes diagnostics", () => {
  const installBundle = source.indexOf("Copy-Item -Force $packagedExecutable $bundlePath");
  const diagnostics = source.indexOf("Invoke-BetterCodexCapture $executable $doctorArguments", installBundle);
  const removeLegacy = source.indexOf("Remove-Item -LiteralPath $legacyExecutable -Force", diagnostics);
  assert.ok(installBundle >= 0 && diagnostics > installBundle && removeLegacy > diagnostics);
  assert.doesNotMatch(source, /@\("uninstall"\)/);
});

test("Windows legacy EXE migration bypasses the incompatible in-place core updater", () => {
  assert.match(source, /\$legacyNodeMigration = \(Test-Path -LiteralPath \$legacyExecutable -PathType Leaf\)/);
  assert.match(source, /if \(\$legacyNodeMigration\) \{\s*Write-Step "Migrating the legacy executable to the Node\.js bundle\.\.\."\s*\} elseif \(\(Test-Path \(Join-Path \$skillDirectory "SKILL\.md"\)\)/);
});

test("Windows rollback does not overwrite an unchanged legacy executable", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Restore-PreviousExecutable"
}, $true)
if (-not $function) { throw "Restore-PreviousExecutable is missing" }
Invoke-Expression $function.Extent.Text

$directory = Join-Path ([IO.Path]::GetTempPath()) ("better-codex-rollback-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $directory | Out-Null
$backup = Join-Path $directory "backup.exe"
$target = Join-Path $directory "better-codex.exe"
[IO.File]::WriteAllText($backup, "backup")
[IO.File]::WriteAllText($target, "original")
$lock = [IO.File]::Open($target, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
try {
  Restore-PreviousExecutable $true $false $backup $target
  if ([IO.File]::ReadAllText($backup) -ne "backup") { throw "backup changed unexpectedly" }
} finally {
  $lock.Dispose()
}
if ([IO.File]::ReadAllText($target) -ne "original") { throw "unchanged legacy executable was overwritten" }
Restore-PreviousExecutable $true $true $backup $target
if ([IO.File]::ReadAllText($target) -ne "backup") { throw "changed executable was not restored" }
Remove-Item -Recurse -Force $directory
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows launcher pins the Node executable that passed dependency validation", () => {
  const copyLauncher = source.indexOf("Copy-Item -Force $packagedLauncher $launcherPath");
  const pinNode = source.indexOf('$launcherNode = $script:NodeExecutable.Replace("%", "%%")', copyLauncher);
  const verifyBundle = source.indexOf('Invoke-BetterCodexCapture $executable @("version")', pinNode);
  assert.ok(copyLauncher >= 0 && pinNode > copyLauncher && verifyBundle > pinNode);
  assert.match(source, /%~dp0better-codex\.cjs/);
});

test("installers preserve the selected Preview lane during a legacy full migration", () => {
  assert.match(source, /runtime\\channel\.json/);
  assert.match(source, /@\("update", "check", "--channel", "preview"\)/);
  assert.match(source, /Unable to resolve the signed Beta release; the existing installation was left unchanged/);
  assert.match(shellSource, /runtime\/channel\.json/);
  assert.match(shellSource, /resolve_preview_version/);
  assert.match(shellSource, /PRESERVE_PREVIEW_LANE=1/);
  assert.match(shellSource, /Unable to resolve the signed Beta release; the existing installation was left unchanged/);
});

test("macOS Beta bootstrap resolves the signed Preview release before installation", () => {
  assert.match(betaShellSource, /BETTER_CODEX_CHANNEL=preview/);
  assert.doesNotMatch(betaShellSource, /better-codex" update/);
  assert.match(shellSource, /BETTER_CODEX_CHANNEL/);
  assert.match(shellSource, /releases\/download\/preview\/update-manifest\.json/);
  assert.match(shellSource, /crypto\.verify/);
  assert.match(shellSource, /"darwin-\$ARCH"/);
});

test("Windows installer maps an explicit Beta target to the Preview channel", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
foreach ($name in @("Get-DesiredUpdateChannel", "Set-InstalledUpdateChannel")) {
  $function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  if (-not $function) { throw "$name is missing" }
  Invoke-Expression $function.Extent.Text
}
if ((Get-DesiredUpdateChannel "0.4.1-beta.3" $false) -ne "preview") { throw "Beta did not select Preview" }
if ((Get-DesiredUpdateChannel "0.4.1" $false) -ne "stable") { throw "release did not select Stable" }
if ((Get-DesiredUpdateChannel "0.4.1" $true) -ne "preview") { throw "persisted Preview lane was not preserved" }
$script:CapturedArguments = @()
function Invoke-BetterCodexCapture {
  param([string]$Entrypoint, [string[]]$Arguments, [int]$TimeoutMilliseconds)
  $script:CapturedArguments = @($Arguments)
  return [pscustomobject]@{ ExitCode = 0; Stdout = '{"channel":"preview","previous":"stable"}' }
}
Set-InstalledUpdateChannel "better-codex.exe" "preview"
if (($script:CapturedArguments -join " ") -ne "update channel preview") { throw "Preview channel command was not issued" }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows Beta bootstrap accepts Beta and promoted release versions from the Preview feed", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  assert.ok(betaSource, "scripts/install-beta.ps1 is missing");
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_BETA_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Get-PreviewReleaseVersion"
}, $true)
if (-not $function) { throw "Get-PreviewReleaseVersion is missing" }
Invoke-Expression $function.Extent.Text

function Manifest([string]$Version, [string]$Channel = "preview", [bool]$IncludeWindows = $true) {
  $assets = if ($IncludeWindows) { @{ "win32-amd64" = @{ url = "https://example.invalid/core"; sha256 = ("a" * 64) } } } else { @{} }
  return (@{ payload = @{ schemaVersion = 1; channel = $Channel; core = @{ version = $Version; assets = $assets }; installers = @{ windows = @{ url = "https://example.invalid/install.ps1"; sha256 = ("b" * 64) } } }; signature = "signed" } | ConvertTo-Json -Depth 8 -Compress)
}
if ((Get-PreviewReleaseVersion (Manifest "0.4.1-beta.5")) -ne "0.4.1-beta.5") { throw "Beta version was not selected" }
if ((Get-PreviewReleaseVersion (Manifest "0.4.1")) -ne "0.4.1") { throw "promoted release was not selected" }
try { Get-PreviewReleaseVersion (Manifest "0.4.1-beta.5" "stable"); throw "stable feed was accepted" } catch { if ($_.Exception.Message -eq "stable feed was accepted") { throw } }
try { Get-PreviewReleaseVersion (Manifest "0.4.1-beta.5" "preview" $false); throw "missing Windows asset was accepted" } catch { if ($_.Exception.Message -eq "missing Windows asset was accepted") { throw } }
exit 0
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_BETA_INSTALLER_TEST_PATH: betaInstallerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows Beta bootstrap invokes the versioned installer in the Preview lane", () => {
  assert.match(betaSource, /releases\/download\/preview\/update-manifest\.json/);
  assert.match(betaSource, /crypto\.verify/);
  assert.match(betaSource, /Get-NormalizedSha256/);
  assert.match(betaSource, /payload\?\.installers\?\.windows/);
  assert.match(betaSource, /Get-FileHash -LiteralPath \$installerPath -Algorithm SHA256/);
  assert.match(betaSource, /if \(\$installerContent -match '\\\[switch\\\]\\\$SkipBanner'\)/);
  assert.match(betaSource, /\$installerBlock -Repository \$Repository -Version \(\"v\" \+ \[string\]\$verified\.version\) -Preview -SkipBanner/);
  assert.match(source, /\[switch\]\$Preview/);
  assert.match(source, /\[switch\]\$SkipBanner/);
  assert.match(source, /\$preservePreviewLane = \[bool\]\$Preview/);
});

test("Windows installers show one static branded banner with a plain-output fallback", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  assert.match(source, /function Show-BetterCodexBanner/);
  assert.match(betaSource, /function Show-BetterCodexBanner/);
  assert.match(source, /BETTER CODEX/);
  assert.match(source, /\$env:NO_COLOR/);
  assert.match(source, /IsOutputRedirected/);
  assert.match(source, /\$logo = "  >_ BETTER CODEX"/);
  assert.match(source, /ForegroundColor Cyan/);
  assert.match(betaSource, /\$logo = "  >_ BETTER CODEX"/);
  assert.doesNotMatch(source, /\$palette|\$frameCount|\$frameDelayMs|\$durationMs/);
  assert.doesNotMatch(betaSource, /\$palette|\$frameCount|\$frameDelayMs|\$durationMs/);
  assert.match(source, /if \(-not \$SkipBanner\) \{ Show-BetterCodexBanner \}/);
  assert.match(betaSource, /Show-BetterCodexBanner/);

  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Show-BetterCodexBanner" }, $true)
if (-not $function) { throw "Show-BetterCodexBanner is missing" }
Invoke-Expression $function.Extent.Text
$env:NO_COLOR = "1"
Show-BetterCodexBanner
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^\s*>_ BETTER CODEX\s*$/m);
  assert.doesNotMatch(result.stdout, /\u001b\[/);
});

test("Windows installer distinguishes current, update, repair, and upgrade states", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
foreach ($name in @("Compare-SemVer", "Test-VersionAtLeast", "Get-InstallAction")) {
  $function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  if (-not $function) { throw "$name is missing" }
  Invoke-Expression $function.Extent.Text
}
if ((Get-InstallAction "0.4.2-beta.2" "0.4.2-beta.2" $true $false $true) -ne "current") { throw "current state was misclassified" }
if ((Get-InstallAction "0.4.2-beta.2" "0.4.2-beta.2" $true $true $false) -ne "update") { throw "update state was misclassified" }
if ((Get-InstallAction "0.4.2-beta.2" "0.4.2-beta.2" $false $false $false) -ne "repair") { throw "repair state was misclassified" }
if ((Get-InstallAction "0.4.2-beta.1" "0.4.2-beta.2" $false $false $false) -ne "upgrade") { throw "upgrade state was misclassified" }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(source, /Better Codex v\$installedVersion is already up to date/);
  assert.match(source, /Checking and repairing Better Codex v\$installedVersion/);
  assert.match(source, /Applying available updates to Better Codex v\$installedVersion/);
  assert.match(source, /Upgrading Better Codex from v\$installedVersion to v\$targetVersion/);
  assert.doesNotMatch(source, /is installed; upgrading to/);
});

test("Preview feed publication exposes and verifies the fixed Beta installer endpoint", () => {
  assert.match(previewPromotionSource, /cp scripts\/install-beta\.ps1 "\$WORK\/install\.ps1"/);
  assert.match(previewPromotionSource, /gh release upload preview "\$WORK\/install\.ps1"/);
  assert.doesNotMatch(previewPromotionSource, /install-beta\.ps1#install\.ps1/);
  assert.match(previewPromotionSource, /gh release download preview --pattern install\.ps1/);
  assert.match(previewPromotionSource, /cmp .*install-beta\.ps1.*install\.ps1/);
  const verifyInstaller = previewPromotionSource.lastIndexOf('cmp scripts/install-beta.ps1 "$WORK/published-installer/install.ps1"');
  const removeLegacyAsset = previewPromotionSource.indexOf("gh release delete-asset preview install-beta.ps1 --yes");
  assert.ok(verifyInstaller >= 0 && removeLegacyAsset > verifyInstaller, "legacy asset cleanup must follow fixed endpoint verification");
});

test("every successful installer path persists its inferred update channel", () => {
  assert.match(source, /function Set-InstalledUpdateChannel/);
  assert.equal((source.match(/Set-InstalledUpdateChannel \$[A-Za-z]+ \$desiredChannel/g) ?? []).length, 4);
  const upgradeFunction = source.indexOf("function Invoke-ExistingUpgrade");
  const upgradeChannel = source.indexOf("Set-InstalledUpdateChannel $Executable $desiredChannel", upgradeFunction);
  const upgradeUpdate = source.indexOf('@("update")', upgradeFunction);
  assert.ok(upgradeFunction >= 0 && upgradeChannel > upgradeFunction && upgradeUpdate > upgradeChannel);
  const windowsReady = source.indexOf("$readyVersion = Get-InstalledVersion $executable");
  const windowsChannel = source.indexOf("Set-InstalledUpdateChannel $executable $desiredChannel", windowsReady);
  const windowsLegacyRemoval = source.indexOf("Removing the verified legacy executable", windowsReady);
  assert.ok(windowsReady >= 0 && windowsChannel > windowsReady && windowsLegacyRemoval > windowsChannel);
  assert.match(source, /if \(\$hadChannel\) \{ Copy-Item -Force \$channelPath \$backupChannel \}/);
  assert.match(source, /Copy-Item -Force \$backupChannel \$channelPath/);

  assert.match(shellSource, /desired_update_channel\(\)/);
  assert.match(shellSource, /-beta\\\.\[1-9\]\[0-9\]\*\$/);
  assert.match(shellSource, /set_installed_channel\(\)/);
  assert.equal((shellSource.match(/set_installed_channel "[^"]+" "\$DESIRED_CHANNEL"/g) ?? []).length, 4);
  const macReady = shellSource.indexOf('READY_VERSION="$(installed_version "$BIN_DIR/better-codex"');
  const macChannel = shellSource.indexOf('set_installed_channel "$BIN_DIR/better-codex" "$DESIRED_CHANNEL"', macReady);
  assert.ok(macReady >= 0 && macChannel > macReady);
  assert.match(shellSource, /cp -p "\$CHANNEL_PATH" "\$BACKUP_DIR\/channel.json"/);
  assert.match(shellSource, /cp -p "\$BACKUP_DIR\/channel.json" "\$CHANNEL_PATH"/);
});

test("Windows installer bounds a native command that never exits", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Invoke-NativeCapture"
}, $true)
if (-not $function) { throw "Invoke-NativeCapture is missing" }
Invoke-Expression $function.Extent.Text

$watch = [Diagnostics.Stopwatch]::StartNew()
$result = Invoke-NativeCapture "powershell.exe" @("-NoProfile", "-NonInteractive", "-Command", "Start-Process powershell.exe -NoNewWindow -ArgumentList '-NoProfile','-NonInteractive','-Command','Start-Sleep -Seconds 30'; Start-Sleep -Seconds 30") 250
$watch.Stop()

if (-not $result.TimedOut) { throw "hung command was not reported as timed out" }
if ($result.ExitCode -ne 124) { throw "timeout exit code was $($result.ExitCode)" }
if ($watch.ElapsedMilliseconds -gt 5000) { throw "timeout took $($watch.ElapsedMilliseconds)ms" }
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows timeout terminates the complete native process job", () => {
  assert.match(source, /TerminateJobObject/);
  assert.match(source, /JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
  assert.match(source, /SetInformationJobObject/);
});

test("Windows installer preserves background children after a successful launcher command", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
$function = $ast.Find({
  param($node)
  $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq "Invoke-NativeCapture"
}, $true)
if (-not $function) { throw "Invoke-NativeCapture is missing" }
Invoke-Expression $function.Extent.Text

$childPid = $null
try {
  $parentCommand = '$child = Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(''-NoProfile'',''-NonInteractive'',''-Command'',''Start-Sleep -Seconds 30'') -PassThru; Write-Output $child.Id; exit 0'
  $result = Invoke-NativeCapture "powershell.exe" @("-NoProfile", "-NonInteractive", "-Command", $parentCommand) 5000 $true
  if ($result.ExitCode -ne 0) { throw "launcher command failed with $($result.ExitCode)" }
  $childPid = [int]$result.Stdout.Trim()
  Start-Sleep -Milliseconds 250
  if (-not (Get-Process -Id $childPid -ErrorAction SilentlyContinue)) { throw "background child was killed after its launcher exited" }
} finally {
  if ($childPid) { Stop-Process -Id $childPid -Force -ErrorAction SilentlyContinue }
}
`;

  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows installer opts persistent runtime commands out of success-time job cleanup", () => {
  assert.match(source, /Invoke-BetterCodexCapture \$executable \$setupArguments 120000 \$true/);
  assert.match(source, /Invoke-BetterCodexCapture \$Executable @\("service", "restart"\) 30000 \$true/);
  assert.match(source, /Invoke-BetterCodexCapture \$Executable @\("inject", "--launch"\) 60000 \$true/);
  assert.match(source, /Invoke-BetterCodexCapture \$executable @\("service", "install"\) 10000 \$true/);
  assert.match(source, /Invoke-BetterCodexCapture \$executable @\("service", "start"\) 10000 \$true/);
  assert.match(source, /Invoke-BetterCodexCapture \$executable @\("enable"\) 30000 \$true/);
});

test("Windows timeout fallback uses the trusted system taskkill executable", () => {
  assert.match(source, /\[IO\.Path\]::Combine\(\$env:SystemRoot, "System32", "taskkill\.exe"\)/);
  assert.doesNotMatch(source, /\.FileName\s*=\s*"taskkill\.exe"/);
});

test("Windows installer compares Beta and release versions using SemVer", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const script = String.raw`
$source = Get-Content -Raw -LiteralPath $env:BETTER_CODEX_INSTALLER_TEST_PATH
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
foreach ($name in @("Compare-SemVer", "Test-VersionAtLeast")) {
  $function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  if (-not $function) { throw "$name is missing" }
  Invoke-Expression $function.Extent.Text
}
if (-not (Test-VersionAtLeast "0.4.2-beta.1" "0.4.1")) { throw "next Beta must be newer than the current release" }
if (-not (Test-VersionAtLeast "0.4.2" "0.4.2-beta.2")) { throw "promoted release must be newer than its Beta" }
if (Test-VersionAtLeast "0.4.2" "0.4.3-beta.1") { throw "stable must not downgrade a newer Beta" }
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, BETTER_CODEX_INSTALLER_TEST_PATH: installerPath.pathname.replace(/^\/(.:)/, "$1") },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("Windows installer preserves Codex while refreshing Better Codex", () => {
  const preserve = source.indexOf("$preserveCodex = @($codexProcesses).Count -gt 0");
  const disable = source.indexOf('Invoke-BetterCodexCapture $executable @("disable")', preserve);
  const setup = source.indexOf('@("setup", "--yes", "--preserve-codex")', disable);

  assert.ok(preserve >= 0, "running Codex detection is missing");
  assert.ok(disable > preserve, "helpers must stop before replacement");
  assert.ok(setup > disable, "preserved Codex setup is missing");
  assert.match(source, /function Get-CodexProcesses/);
  assert.match(source, /ExecutablePath -notlike "\*\\WindowsApps\\OpenAI\.Codex_\*"/);
  assert.match(source, /\.SessionId -ne \$sessionId/);
  assert.match(source, /GetOwnerSid/);
  assert.doesNotMatch(source, /Codex is currently running\. Quit Codex/);
  assert.doesNotMatch(source, /Stop-Process -Id \$_\.ProcessId -Force -ErrorAction SilentlyContinue/);
  assert.doesNotMatch(source, /& \$executable disable/);
});

test("Windows installer aborts before mutation when previous service state is unknown", () => {
  const status = source.indexOf('Invoke-BetterCodexCapture $executable @("service", "status")');
  const mutation = source.indexOf("$previousInjectionEnabled", status);
  assert.ok(status >= 0 && mutation > status, "previous service status probe is missing");
  assert.match(source.slice(status, mutation), /throw "Unable to read the existing Better Codex service state/);
});

test("Windows release downloads have hard time limits", () => {
  const downloads = source.split(/\r?\n/).filter(line => line.includes("Invoke-WebRequest") && line.includes("-OutFile"));
  assert.ok(downloads.length >= 3, "release downloads are missing");
  for (const line of downloads) assert.match(line, /-TimeoutSec 300/);
});

test("remote installers authenticate checksums before extracting bundles", () => {
  const windowsSignature = source.indexOf("Assert-ChecksumsSignature $checksums $publicKey $checksumSignature");
  const windowsExtract = source.indexOf("Expand-Archive");
  assert.ok(windowsSignature >= 0 && windowsExtract > windowsSignature);
  assert.match(source, /checksums\.sig/);
  const macSignature = shellSource.indexOf("verify_checksums_signature ||");
  const macExtract = shellSource.indexOf('tar -xzf "$ARCHIVE"');
  assert.ok(macSignature >= 0 && macExtract > macSignature);
  assert.match(shellSource, /checksums\.sig/);
});

test("macOS installer bounds upgrade, setup, diagnostics, and rollback commands", () => {
  assert.match(shellSource, /run_with_timeout\(\)/);
  assert.match(shellSource, /run_with_timeout 600 "\$EXISTING_BINARY" update/);
  assert.match(shellSource, /run_with_timeout 120 "\$BIN_DIR\/better-codex" setup \$SETUP_ARGUMENTS/);
  assert.match(shellSource, /run_with_timeout 20 "\$BIN_DIR\/better-codex" doctor/);
  assert.match(shellSource, /run_with_timeout 30 "\$BIN_DIR\/better-codex" enable/);
  assert.match(shellSource, /run_with_timeout 10 "\$BIN_DIR\/better-codex" disable/);
  assert.doesNotMatch(shellSource, /^\s*"\$EXISTING_BINARY" (?:disable|update|inject|launcher|service)/m);
  assert.doesNotMatch(shellSource, /^\s*"\$BIN_DIR\/better-codex" (?:disable|doctor|enable|launcher|service|setup|version)/m);
  assert.match(shellSource, /kill -TERM -- "-\$child_pid"/);
  assert.match(shellSource, /kill -KILL -- "-\$child_pid"/);
});

test("macOS timeout state uses a private temporary directory", () => {
  assert.match(shellSource, /mktemp -d "\$\{TMPDIR:-\/tmp\}\/better-codex-timeout\.XXXXXX"/);
  assert.doesNotMatch(shellSource, /marker="\$\{TMPDIR:-\/tmp\}\/better-codex-timeout-\$\$-/);
});

test("macOS installer cancellation terminates the active command group before rollback", () => {
  assert.match(shellSource, /trap 'interrupt_install 130' INT/);
  assert.match(shellSource, /trap 'interrupt_install 143' TERM/);
  assert.match(shellSource, /kill -TERM -- "-\$ACTIVE_COMMAND_GROUP"/);
  assert.match(shellSource, /ACTIVE_COMMAND_GROUP="\$child_pid"/);
  assert.match(shellSource, /terminate_active_command\s+exit "\$status"/);
});

test("macOS installer compares Beta and release versions using SemVer", {
  skip: process.platform === "win32" && !existsSync("C:\\Program Files\\Git\\bin\\bash.exe") ? "bash is unavailable" : false,
}, () => {
  const start = shellSource.indexOf("version_at_least() {");
  const end = shellSource.indexOf("\nrun_with_timeout()", start);
  assert.ok(start >= 0 && end > start, "version_at_least function is missing");
  const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash";
  const script = `${shellSource.slice(start, end)}
version_at_least 0.4.2-beta.1 0.4.1
version_at_least 0.4.2 0.4.2-beta.2
! version_at_least 0.4.2 0.4.3-beta.1`;
  const result = spawnSync(bash, ["-c", script], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("macOS timeout helper terminates a command that never exits", {
  skip: process.platform === "win32" && !existsSync("C:\\Program Files\\Git\\bin\\bash.exe") ? "bash is unavailable" : false,
}, () => {
  const start = shellSource.indexOf("run_with_timeout() {");
  const end = shellSource.indexOf("\ninstalled_version()", start);
  assert.ok(start >= 0 && end > start, "run_with_timeout function is missing");
  const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "/bin/bash";
  const script = `${shellSource.slice(start, end)}\nrun_with_timeout 1 sh -c 'sleep 30 & wait'\nstatus=$?\n[ "$status" -eq 124 ]`;
  const result = spawnSync(bash, ["-c", script], { encoding: "utf8", timeout: 5_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("macOS installer aborts before mutation when previous service state is unknown", () => {
  const status = shellSource.indexOf('PREVIOUS_SERVICE_STATUS="$(run_with_timeout 10');
  const mutation = shellSource.indexOf("INSTALL_MUTATED=0", status);
  assert.ok(status >= 0 && mutation > status, "previous service state capture is missing");
  const capture = shellSource.slice(status, mutation);
  assert.doesNotMatch(capture, /\|\| true/);
  assert.match(capture, /Unable to read the existing Better Codex service state/);
});

test("macOS installer preserves pretty-printed service state for rollback", () => {
  assert.match(shellSource, /grep -Eq '\"installed\"\[\[:space:\]\]\*:\[\[:space:\]\]\*true'/);
  assert.match(shellSource, /grep -Eq '\"running\"\[\[:space:\]\]\*:\[\[:space:\]\]\*true'/);
  assert.doesNotMatch(shellSource, /grep -q '\"(?:installed|running)\":true'/);
});

test("macOS release resolution and downloads have hard time limits", () => {
  const curlLines = shellSource.split(/\r?\n/).filter(line => line.includes("curl "));
  assert.ok(curlLines.length >= 4, "release curl calls are missing");
  for (const line of curlLines) {
    assert.match(line, /--connect-timeout/);
    assert.match(line, /--max-time/);
  }
});
