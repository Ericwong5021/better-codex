param(
  [string]$Repository = "Ericwong5021/better-codex",
  [string]$Version = "",
  [string]$BinDirectory = "$env:LOCALAPPDATA\BetterCodex\bin",
  [switch]$NoService
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$UpdateKeySha256 = "1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e"

function Write-Step([string]$Message) {
  Write-Host "[Better Codex] $Message"
}

function Write-Ok([string]$Message) {
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Invoke-NativeCapture([string]$Executable, [string[]]$Arguments) {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    # Windows PowerShell 5.1 promotes redirected native stderr to error records.
    # Keep progress output capturable and use the process exit code as the authority.
    $ErrorActionPreference = "Continue"
    $output = (& $Executable @Arguments 2>&1 | Out-String)
    $exitCode = $LASTEXITCODE
    return [PSCustomObject]@{ Output = $output; ExitCode = $exitCode }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
}

function Resolve-ReleaseTag([string]$RepositoryName, [string]$RequestedVersion) {
  $candidate = if ($RequestedVersion) { $RequestedVersion } elseif ($env:BETTER_CODEX_VERSION) { $env:BETTER_CODEX_VERSION } else { "" }
  if ($candidate -and $candidate -ne "latest") {
    if ($candidate.StartsWith("v")) { return $candidate }
    return "v$candidate"
  }
  Write-Step "Resolving latest release..."
  $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $request = [System.Net.HttpWebRequest]::Create("https://github.com/$RepositoryName/releases/latest?better_codex_cache_bust=$cacheBust")
  $request.Method = "HEAD"
  $request.AllowAutoRedirect = $false
  $request.UserAgent = "better-codex-installer"
  try {
    $response = $request.GetResponse()
  } catch [System.Net.WebException] {
    $response = $_.Exception.Response
  }
  if (-not $response) { throw "Unable to resolve the latest Better Codex release." }
  try {
    $location = $response.Headers["Location"]
  } finally {
    $response.Close()
  }
  if (-not $location) { throw "Unable to resolve the latest Better Codex release." }
  $tag = (($location.TrimEnd("/") -split "/")[-1]).Split("?")[0]
  if (-not $tag) { throw "Unable to resolve the latest Better Codex release." }
  return $tag
}

function Get-InstalledVersion([string]$Executable) {
  if (-not (Test-Path $Executable)) { return $null }
  try {
    $versions = (& $Executable version --json 2>$null | Out-String | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { return $null }
    $core = if ($versions.core) { [string]$versions.core } else { $null }
    $managed = if ($versions.managedCore) { [string]$versions.managedCore } else { $null }
    if ($managed -and $core) {
      try {
        if ([System.Version]$managed -ge [System.Version]$core) { return $managed }
      } catch {
        if ($managed -eq $Version.TrimStart("v")) { return $managed }
      }
    }
    return $core
  } catch {
    return $null
  }
}

function Get-PackagedCoreVersion([string]$Executable, [string]$ValidationHome) {
  $previousHome = $env:BETTER_CODEX_HOME
  $previousDelegation = $env:BETTER_CODEX_DISABLE_DELEGATION
  try {
    $env:BETTER_CODEX_HOME = $ValidationHome
    $env:BETTER_CODEX_DISABLE_DELEGATION = "1"
    $versions = (& $Executable version --json 2>$null | Out-String | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0 -or -not $versions.core) { return $null }
    return [string]$versions.core
  } catch {
    return $null
  } finally {
    if ($null -eq $previousHome) { Remove-Item Env:BETTER_CODEX_HOME -ErrorAction SilentlyContinue } else { $env:BETTER_CODEX_HOME = $previousHome }
    if ($null -eq $previousDelegation) { Remove-Item Env:BETTER_CODEX_DISABLE_DELEGATION -ErrorAction SilentlyContinue } else { $env:BETTER_CODEX_DISABLE_DELEGATION = $previousDelegation }
  }
}

function Test-VersionAtLeast([string]$Current, [string]$Target) {
  if (-not $Current -or -not $Target) { return $false }
  try {
    $currentVersion = [System.Version]($Current.TrimStart("v"))
    $targetVersion = [System.Version]($Target.TrimStart("v"))
    return $currentVersion -ge $targetVersion
  } catch {
    return $Current.TrimStart("v") -eq $Target.TrimStart("v")
  }
}

function Invoke-ExistingUpgrade([string]$Executable, [string]$TargetVersion) {
  try {
    $updateResult = Invoke-NativeCapture $Executable @("update")
    if ($updateResult.ExitCode -ne 0) { return $false }
    $updatedVersion = Get-InstalledVersion $Executable
    if (-not (Test-VersionAtLeast $updatedVersion $TargetVersion)) { return $false }
    if (-not $NoService) {
      $restartResult = Invoke-NativeCapture $Executable @("service", "restart")
      if ($restartResult.ExitCode -ne 0) { return $false }
      Start-Sleep -Milliseconds 800
      $injectResult = Invoke-NativeCapture $Executable @("inject", "--launch")
      if ($injectResult.ExitCode -ne 0) { return $false }
      $launcherResult = Invoke-NativeCapture $Executable @("launcher", "install")
      if ($launcherResult.ExitCode -ne 0) { return $false }
      $doctor = (& $Executable doctor | Out-String | ConvertFrom-Json)
      if (-not $doctor.ok) { return $false }
    }
    Write-Ok "Better Codex upgraded to v$updatedVersion"
    return $true
  } catch {
    return $false
  }
}

function Test-InstallationReady([string]$Executable) {
  if ($NoService) { return $true }
  try {
    $launcherResult = Invoke-NativeCapture $Executable @("launcher", "install")
    if ($launcherResult.ExitCode -ne 0) { return $false }
    $doctor = (& $Executable doctor 2>$null | Out-String | ConvertFrom-Json)
    return [bool]$doctor.ok
  } catch {
    return $false
  }
}

if (-not [Environment]::Is64BitOperatingSystem) { throw "Better Codex requires 64-bit Windows." }

$executable = Join-Path $BinDirectory "better-codex.exe"
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
$skillDirectory = Join-Path $codexHome "skills\better-codex"
$issueSkillDirectory = Join-Path $codexHome "skills\better-codex-issue"
$betterCodexHome = if ($env:BETTER_CODEX_HOME) { [IO.Path]::GetFullPath($env:BETTER_CODEX_HOME) } else { Join-Path $env:USERPROFILE ".better-codex" }
$updatePublicKeyPath = Join-Path $betterCodexHome "update-public-key.pem"
$lockHasher = [Security.Cryptography.SHA256]::Create()
$lockHash = $lockHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($betterCodexHome))
$lockHasher.Dispose()
$lockId = -join ($lockHash[0..11] | ForEach-Object { $_.ToString("x2") })
$lockName = "Local\BetterCodexInstaller-$lockId"
$installMutex = [Threading.Mutex]::new($false, $lockName)
$installLockAcquired = $false
try {
  try { $installLockAcquired = $installMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $installLockAcquired = $true }
  if (-not $installLockAcquired) { throw "Another Better Codex installation is already running." }
$localArchive = if ($env:BETTER_CODEX_ARCHIVE) { [IO.Path]::GetFullPath($env:BETTER_CODEX_ARCHIVE) } else { $null }
if (-not $localArchive) { $Version = Resolve-ReleaseTag $Repository $Version }
$targetVersion = if ($Version) { $Version.TrimStart("v") } else { "" }
$installedVersion = Get-InstalledVersion $executable

if (-not $localArchive -and $installedVersion -and (Test-VersionAtLeast $installedVersion $targetVersion) -and (Test-Path (Join-Path $skillDirectory "SKILL.md")) -and (Test-Path $updatePublicKeyPath)) {
  try {
    $updateCheck = (& $executable update check 2>$null | Out-String | ConvertFrom-Json)
    if ($updateCheck.checked -and -not (($updateCheck.core.available) -or ($updateCheck.compatibility.available))) {
      if (Test-InstallationReady $executable) {
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
        Write-Ok "Better Codex is up to date (v$installedVersion)"
        return
      }
    }
  } catch {
    Write-Step "Live update check unavailable; continuing with upgrade..."
  }
}

if (-not $localArchive -and $installedVersion) {
  Write-Step "Better Codex v$installedVersion is installed; upgrading to v$targetVersion..."
  $updateCheck = $null
  try {
    $updateCheck = (& $executable update check 2>$null | Out-String | ConvertFrom-Json)
    if ((Test-VersionAtLeast $installedVersion $targetVersion) -and $updateCheck.checked -and -not (($updateCheck.core.available) -or ($updateCheck.compatibility.available)) -and (Test-InstallationReady $executable)) {
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
      Write-Ok "Better Codex is up to date (v$installedVersion)"
      return
    }
  } catch {
    Write-Step "Live update check unavailable; continuing with upgrade..."
  }
  if ((Test-Path (Join-Path $skillDirectory "SKILL.md")) -and (Test-Path $updatePublicKeyPath) -and (Invoke-ExistingUpgrade $executable $targetVersion)) {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
    return
  }
  Write-Step "Automatic upgrade unavailable; continuing with full installation..."
}

$workDirectory = Join-Path ([IO.Path]::GetTempPath()) ("better-codex-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $workDirectory | Out-Null
try {
  if ($localArchive) {
    $archive = $localArchive
    $name = [IO.Path]::GetFileName($archive)
    $checksums = if ($env:BETTER_CODEX_CHECKSUMS) { [IO.Path]::GetFullPath($env:BETTER_CODEX_CHECKSUMS) } else { Join-Path ([IO.Path]::GetDirectoryName($archive)) "checksums.txt" }
    $publicKey = if ($env:BETTER_CODEX_UPDATE_PUBLIC_KEY_FILE) { [IO.Path]::GetFullPath($env:BETTER_CODEX_UPDATE_PUBLIC_KEY_FILE) } else { "" }
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw "Local Better Codex archive not found: $archive" }
    if (-not (Test-Path -LiteralPath $checksums -PathType Leaf)) { throw "Local Better Codex checksums not found: $checksums" }
    Write-Step "Installing from local package $name..."
  } else {
    $tag = $Version
    $number = $tag.TrimStart("v")
    $name = "better-codex-cli-$number-win32-amd64.zip"
    $base = "https://github.com/$Repository/releases/download/$tag"
    $archive = Join-Path $workDirectory $name
    $checksums = Join-Path $workDirectory "checksums.txt"
    $publicKey = Join-Path $workDirectory "update-public-key.pem"
    Write-Step "Downloading $name..."
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $archive
    Write-Step "Downloading checksums and update key..."
    Invoke-WebRequest -UseBasicParsing -Uri "$base/checksums.txt" -OutFile $checksums
    Invoke-WebRequest -UseBasicParsing -Uri "$base/update-public-key.pem" -OutFile $publicKey
  }
  Write-Step "Verifying SHA-256 checksum..."
  $expected = ((Get-Content $checksums | Where-Object { $_ -match [regex]::Escape($name) }) -split "\s+")[0]
  if (-not $expected) { throw "No checksum found for $name." }
  $actual = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant()
  if ($actual -ne $expected.ToLowerInvariant()) { throw "Checksum mismatch for $name." }
  Write-Step "Extracting package..."
  Expand-Archive -LiteralPath $archive -DestinationPath $workDirectory -Force
  if (-not $publicKey -and (Test-Path -LiteralPath (Join-Path $workDirectory "update-public-key.pem") -PathType Leaf)) {
    $publicKey = Join-Path $workDirectory "update-public-key.pem"
  }
  if (-not $publicKey -or -not (Test-Path -LiteralPath $publicKey -PathType Leaf)) { throw "Update public key is missing." }
  $normalizedPublicKey = [IO.File]::ReadAllText($publicKey).Replace("`r`n", "`n")
  $publicKeyHasher = [Security.Cryptography.SHA256]::Create()
  try {
    $actualPublicKey = -join ($publicKeyHasher.ComputeHash([Text.UTF8Encoding]::new($false).GetBytes($normalizedPublicKey)) | ForEach-Object { $_.ToString("x2") })
  } finally {
    $publicKeyHasher.Dispose()
  }
  if ($actualPublicKey -ne $UpdateKeySha256) { throw "Update public key mismatch." }
  $packagedExecutable = Join-Path $workDirectory "better-codex.exe"
  $packagedSkill = Join-Path $workDirectory "skills\better-codex"
  if (-not (Test-Path $packagedExecutable)) { throw "Better Codex executable is missing from the package." }
  if (-not (Test-Path (Join-Path $packagedSkill "SKILL.md"))) { throw "Better Codex skill is missing from the package." }
  $packagedVersion = Get-PackagedCoreVersion $packagedExecutable (Join-Path $workDirectory "validation-home")
  if (-not $packagedVersion) { throw "Unable to read the packaged Better Codex version." }
  if ($targetVersion -and $packagedVersion -ne $targetVersion) { throw "Package version $packagedVersion does not match target v$targetVersion. Installation cancelled." }
  if (-not $targetVersion) { $targetVersion = $packagedVersion }
  $backupDirectory = Join-Path $workDirectory "previous"
  New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
  $backupExecutable = Join-Path $backupDirectory "better-codex.exe"
  $backupSkill = Join-Path $backupDirectory "better-codex-skill"
  $backupIssueSkill = Join-Path $backupDirectory "better-codex-issue-skill"
  $backupUpdateKey = Join-Path $backupDirectory "update-public-key.pem"
  $hadExecutable = Test-Path $executable
  $hadSkill = Test-Path $skillDirectory
  $hadIssueSkill = Test-Path $issueSkillDirectory
  $hadUpdateKey = Test-Path $updatePublicKeyPath
  $previousService = if ($hadExecutable) { try { & $executable service status 2>$null | Out-String | ConvertFrom-Json } catch { $null } } else { $null }
  $previousInjectionEnabled = -not (Test-Path (Join-Path $betterCodexHome "run\injection.json")) -or ((Get-Content (Join-Path $betterCodexHome "run\injection.json") -Raw | ConvertFrom-Json).enabled -eq $true)
  if ($hadExecutable) { Copy-Item -Force $executable $backupExecutable }
  if ($hadSkill) { Copy-Item -Recurse -Force $skillDirectory $backupSkill }
  if ($hadIssueSkill) { Copy-Item -Recurse -Force $issueSkillDirectory $backupIssueSkill }
  if ($hadUpdateKey) { Copy-Item -Force $updatePublicKeyPath $backupUpdateKey }
  try {
  $codexProcesses = if ($NoService) { @() } else { @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object { $_.CommandLine -notmatch "--type=" -and $_.ExecutablePath -like "*\WindowsApps\OpenAI.Codex_*" }) }
  if (@($codexProcesses).Count -gt 0) {
    $choice = Read-Host "Codex is currently running. Quit Codex and continue installation? [Y/n]"
    if ($choice -and $choice -notin @("y", "Y")) {
      Write-Output "Installation cancelled."
      return
    }
    $codexProcesses | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
    Write-Step "Stopping Codex..."
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      if (-not (Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object { $_.CommandLine -notmatch "--type=" -and $_.ExecutablePath -like "*\WindowsApps\OpenAI.Codex_*" })) { break }
      Start-Sleep -Milliseconds 250
    }
    if (Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object { $_.CommandLine -notmatch "--type=" -and $_.ExecutablePath -like "*\WindowsApps\OpenAI.Codex_*" }) { throw "Codex did not quit. Quit it manually and run the installer again." }
  }
  Write-Step "Installing executable to $BinDirectory..."
  New-Item -ItemType Directory -Force -Path $BinDirectory | Out-Null
  if ((Test-Path $executable) -and -not $NoService) {
    & $executable disable 2>$null | Out-Null
    & $executable service stop 2>$null | Out-Null
    Start-Sleep -Milliseconds 800
  }
  Copy-Item -Force $packagedExecutable $executable
  Write-Step "Installing Better Codex skill to $skillDirectory..."
  New-Item -ItemType Directory -Force -Path (Join-Path $skillDirectory "agents") | Out-Null
  Copy-Item -Force (Join-Path $packagedSkill "SKILL.md") (Join-Path $skillDirectory "SKILL.md")
  Copy-Item -Force (Join-Path $packagedSkill "agents\openai.yaml") (Join-Path $skillDirectory "agents\openai.yaml")
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
  New-Item -ItemType Directory -Force -Path $betterCodexHome | Out-Null
  Copy-Item -Force $publicKey $updatePublicKeyPath
  Write-Step "Verifying executable..."
  & $executable version
  if ($LASTEXITCODE -ne 0) { throw "Better Codex executable verification failed." }
  if (-not $NoService) {
    Write-Step "Registering runtime and injecting Better Codex..."
    $setupResult = Invoke-NativeCapture $executable @("setup", "--yes")
    if ($setupResult.ExitCode -ne 0) {
      Write-Host ($setupResult.Output.TrimEnd())
      throw "Better Codex setup failed with exit code $($setupResult.ExitCode)."
    }
    Write-Step "Running installation diagnostics..."
    $doctor = $null
    $doctorOutput = $null
    for ($attempt = 1; $attempt -le 8; $attempt++) {
      $doctorResult = Invoke-NativeCapture $executable @("doctor")
      $doctorOutput = $doctorResult.Output
      $doctorExitCode = $doctorResult.ExitCode
      try {
        $doctor = $doctorOutput | ConvertFrom-Json
      } catch {
        Write-Host ($doctorOutput.TrimEnd())
        throw "Better Codex diagnostics returned invalid output."
      }
      if ($doctor.ok) { break }
      $reason = $doctor.checks.injection.error
      if (-not $reason -and $doctorExitCode -ne 0) { $reason = "exit code $doctorExitCode" }
      if (-not $reason) { $reason = "not ready" }
      Write-Step "Diagnostics pending ($attempt/8): $reason. Retrying..."
      Start-Sleep -Seconds 2
    }
    if (-not $doctor.ok) {
      Write-Host ($doctorOutput.TrimEnd())
      throw "Better Codex installation verification failed."
    }
  }
  $readyVersion = Get-InstalledVersion $executable
  if (-not $readyVersion -or -not (Test-VersionAtLeast $readyVersion $targetVersion)) {
    $displayVersion = if ($readyVersion) { $readyVersion } else { "unknown" }
    throw "Installed Better Codex version $displayVersion does not match target v$targetVersion."
  }
  if ($env:BETTER_CODEX_SKIP_PATH_UPDATE -ne "1") {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($null -eq $userPath) { $userPath = "" }
    if (-not (($userPath -split ";") -contains $BinDirectory)) {
      [Environment]::SetEnvironmentVariable("Path", (($userPath.TrimEnd(";") + ";" + $BinDirectory).TrimStart(";")), "User")
    }
  }
  Write-Ok "Better Codex v$targetVersion is ready"
  } catch {
    if ((Test-Path $executable) -and -not $NoService) {
      & $executable disable 2>$null | Out-Null
      & $executable service stop 2>$null | Out-Null
      if (-not $hadExecutable) {
        & $executable service uninstall 2>$null | Out-Null
        & $executable launcher uninstall 2>$null | Out-Null
      }
      Start-Sleep -Milliseconds 800
    }
    if ($hadExecutable) { Copy-Item -Force $backupExecutable $executable } else { Remove-Item -Force -ErrorAction SilentlyContinue $executable }
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $skillDirectory
    if ($hadSkill) { Copy-Item -Recurse -Force $backupSkill $skillDirectory }
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
    if ($hadIssueSkill) { Copy-Item -Recurse -Force $backupIssueSkill $issueSkillDirectory }
    if ($hadUpdateKey) { Copy-Item -Force $backupUpdateKey $updatePublicKeyPath } else { Remove-Item -Force -ErrorAction SilentlyContinue $updatePublicKeyPath }
    if ($hadExecutable -and -not $NoService) {
      if ($previousService.installed) {
        & $executable service install 2>$null | Out-Null
        if ($previousService.running) { & $executable service start 2>$null | Out-Null } else { & $executable service stop 2>$null | Out-Null }
      } else {
        & $executable service uninstall 2>$null | Out-Null
      }
      if ($previousInjectionEnabled) { & $executable enable 2>$null | Out-Null } else { & $executable disable 2>$null | Out-Null }
    }
    throw
  }
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $workDirectory
}
} finally {
  if ($installLockAcquired) { $installMutex.ReleaseMutex() }
  $installMutex.Dispose()
}
