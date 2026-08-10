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

function Invoke-NativeCapture([string]$Executable, [string[]]$Arguments, [int]$TimeoutMilliseconds = 120000) {
  $process = $null
  $jobHandle = [IntPtr]::Zero
  $jobAssigned = $false
  try {
    if (-not ("BetterCodexProcessJob" -as [type])) {
      Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class BetterCodexProcessJob {
  private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

  [StructLayout(LayoutKind.Sequential)]
  private struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
    public long PerProcessUserTimeLimit;
    public long PerJobUserTimeLimit;
    public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize;
    public UIntPtr MaximumWorkingSetSize;
    public uint ActiveProcessLimit;
    public UIntPtr Affinity;
    public uint PriorityClass;
    public uint SchedulingClass;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct IO_COUNTERS {
    public ulong ReadOperationCount;
    public ulong WriteOperationCount;
    public ulong OtherOperationCount;
    public ulong ReadTransferCount;
    public ulong WriteTransferCount;
    public ulong OtherTransferCount;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
    public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
    public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit;
    public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed;
    public UIntPtr PeakJobMemoryUsed;
  }

  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
  private static extern IntPtr CreateJobObject(IntPtr securityAttributes, string name);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool TerminateJobObject(IntPtr job, uint exitCode);

  [DllImport("kernel32.dll", SetLastError = true)]
  private static extern bool SetInformationJobObject(IntPtr job, int informationClass, ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION information, uint informationLength);

  [DllImport("kernel32.dll")]
  private static extern bool CloseHandle(IntPtr handle);

  public static IntPtr Create() {
    IntPtr job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) return IntPtr.Zero;
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION information = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
    information.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if (!SetInformationJobObject(job, 9, ref information, (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION)))) {
      CloseHandle(job);
      return IntPtr.Zero;
    }
    return job;
  }
  public static bool Assign(IntPtr job, IntPtr process) { return AssignProcessToJobObject(job, process); }
  public static bool Terminate(IntPtr job, uint exitCode) { return TerminateJobObject(job, exitCode); }
  public static void Close(IntPtr job) { if (job != IntPtr.Zero) CloseHandle(job); }
}
"@
    }
    $quotedArguments = @($Arguments | ForEach-Object {
      $argument = [string]$_
      if (-not $argument) { return '""' }
      if ($argument -notmatch '[\s"]') { return $argument }
      $escaped = [regex]::Replace($argument, '(\\*)"', '$1$1\"')
      $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
      return '"' + $escaped + '"'
    }) -join " "
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Executable
    $startInfo.Arguments = $quotedArguments
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    if (-not $process.Start()) { throw "Unable to start $Executable." }
    $jobHandle = [BetterCodexProcessJob]::Create()
    if ($jobHandle -ne [IntPtr]::Zero) {
      $jobAssigned = [BetterCodexProcessJob]::Assign($jobHandle, $process.Handle)
    }
    # Drain both streams while the process runs so a noisy child cannot block on a full pipe.
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $timedOut = -not $process.WaitForExit($TimeoutMilliseconds)
    if ($timedOut) {
      if ($jobAssigned) {
        $null = [BetterCodexProcessJob]::Terminate($jobHandle, 124)
      } else {
        try {
          $taskkillPath = [IO.Path]::Combine($env:SystemRoot, "System32", "taskkill.exe")
          if (-not (Test-Path -LiteralPath $taskkillPath -PathType Leaf)) { throw "System taskkill.exe is unavailable." }
          $taskkillStart = [Diagnostics.ProcessStartInfo]::new()
          $taskkillStart.FileName = $taskkillPath
          $taskkillStart.Arguments = "/PID $($process.Id) /T /F"
          $taskkillStart.UseShellExecute = $false
          $taskkillStart.CreateNoWindow = $true
          $taskkill = [Diagnostics.Process]::Start($taskkillStart)
          if ($taskkill) {
            $null = $taskkill.WaitForExit(2000)
            $taskkill.Dispose()
          }
        } catch {}
      }
      try { if (-not $process.HasExited) { $process.Kill() } } catch {}
      if (-not $process.WaitForExit(2000)) { throw "$Executable did not terminate after timing out." }
    }
    $process.WaitForExit()
    $stdout = try { if ($stdoutTask.Wait(2000)) { $stdoutTask.Result } else { "" } } catch { "" }
    $stderr = try { if ($stderrTask.Wait(2000)) { $stderrTask.Result } else { "" } } catch { "" }
    $output = (@($stdout, $stderr) | Where-Object { $_ }) -join [Environment]::NewLine
    $exitCode = if ($timedOut) { 124 } else { $process.ExitCode }
    return [PSCustomObject]@{ Output = $output; Stdout = $stdout; Stderr = $stderr; ExitCode = $exitCode; TimedOut = $timedOut }
  } finally {
    if ($jobHandle -ne [IntPtr]::Zero) { [BetterCodexProcessJob]::Close($jobHandle) }
    if ($process) { $process.Dispose() }
  }
}

function Get-CodexProcesses {
  $sessionId = [Diagnostics.Process]::GetCurrentProcess().SessionId
  $ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  return @(Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" | Where-Object {
    if ($_.SessionId -ne $sessionId -or $_.ExecutablePath -notlike "*\WindowsApps\OpenAI.Codex_*") { return $false }
    try { return (Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid -ErrorAction Stop).Sid -eq $ownerSid } catch { return $false }
  })
}

function Compare-SemVer([string]$LeftVersion, [string]$RightVersion) {
  $pattern = '^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$'
  $leftMatch = [regex]::Match($LeftVersion, $pattern)
  $rightMatch = [regex]::Match($RightVersion, $pattern)
  if (-not $leftMatch.Success -or -not $rightMatch.Success) { throw "Invalid semantic version." }
  for ($index = 1; $index -le 3; $index++) {
    $leftNumber = [UInt64]$leftMatch.Groups[$index].Value
    $rightNumber = [UInt64]$rightMatch.Groups[$index].Value
    if ($leftNumber -lt $rightNumber) { return -1 }
    if ($leftNumber -gt $rightNumber) { return 1 }
  }
  $leftPre = $leftMatch.Groups[4].Value
  $rightPre = $rightMatch.Groups[4].Value
  if (-not $leftPre -or -not $rightPre) {
    if ($leftPre -eq $rightPre) { return 0 }
    return $(if ($leftPre) { -1 } else { 1 })
  }
  $leftParts = @($leftPre -split '\.')
  $rightParts = @($rightPre -split '\.')
  for ($index = 0; $index -lt [Math]::Max($leftParts.Count, $rightParts.Count); $index++) {
    if ($index -ge $leftParts.Count) { return -1 }
    if ($index -ge $rightParts.Count) { return 1 }
    $leftPart = $leftParts[$index]
    $rightPart = $rightParts[$index]
    if ($leftPart -eq $rightPart) { continue }
    $leftNumeric = $leftPart -match '^\d+$'
    $rightNumeric = $rightPart -match '^\d+$'
    if ($leftNumeric -and $rightNumeric) {
      if ([UInt64]$leftPart -lt [UInt64]$rightPart) { return -1 }
      return 1
    }
    if ($leftNumeric -ne $rightNumeric) { return $(if ($leftNumeric) { -1 } else { 1 }) }
    return $(if ([string]::CompareOrdinal($leftPart, $rightPart) -lt 0) { -1 } else { 1 })
  }
  return 0
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
  $request.Timeout = 30000
  $request.ReadWriteTimeout = 30000
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
    $result = Invoke-NativeCapture $Executable @("version", "--json") 10000
    if ($result.ExitCode -ne 0) { return $null }
    $versions = $result.Stdout | ConvertFrom-Json
    $core = if ($versions.core) { [string]$versions.core } else { $null }
    $managed = if ($versions.managedCore) { [string]$versions.managedCore } else { $null }
    if ($managed -and $core) {
      try { if ((Compare-SemVer $managed $core) -ge 0) { return $managed } } catch {}
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
    $result = Invoke-NativeCapture $Executable @("version", "--json") 10000
    if ($result.ExitCode -ne 0) { return $null }
    $versions = $result.Stdout | ConvertFrom-Json
    if (-not $versions.core) { return $null }
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
  try { return (Compare-SemVer $Current $Target) -ge 0 } catch { return $false }
}

function Invoke-ExistingUpgrade([string]$Executable, [string]$TargetVersion) {
  try {
    $updateResult = Invoke-NativeCapture $Executable @("update") 600000
    if ($updateResult.ExitCode -ne 0) { return $false }
    $updatedVersion = Get-InstalledVersion $Executable
    if (-not (Test-VersionAtLeast $updatedVersion $TargetVersion)) { return $false }
    if (-not $NoService) {
      $restartResult = Invoke-NativeCapture $Executable @("service", "restart") 30000
      if ($restartResult.ExitCode -ne 0) { return $false }
      Start-Sleep -Milliseconds 800
      $injectResult = Invoke-NativeCapture $Executable @("inject", "--launch") 60000
      if ($injectResult.ExitCode -ne 0) { return $false }
      $launcherResult = Invoke-NativeCapture $Executable @("launcher", "install") 15000
      if ($launcherResult.ExitCode -ne 0) { return $false }
      $doctorResult = Invoke-NativeCapture $Executable @("doctor") 20000
      if ($doctorResult.ExitCode -ne 0) { return $false }
      $doctor = $doctorResult.Stdout | ConvertFrom-Json
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
    $launcherResult = Invoke-NativeCapture $Executable @("launcher", "install") 15000
    if ($launcherResult.ExitCode -ne 0) { return $false }
    $doctorResult = Invoke-NativeCapture $Executable @("doctor") 20000
    if ($doctorResult.ExitCode -ne 0) { return $false }
    $doctor = $doctorResult.Stdout | ConvertFrom-Json
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
    $updateCheckResult = Invoke-NativeCapture $executable @("update", "check") 20000
    if ($updateCheckResult.ExitCode -ne 0) { throw "Update check failed." }
    $updateCheck = $updateCheckResult.Stdout | ConvertFrom-Json
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
    $updateCheckResult = Invoke-NativeCapture $executable @("update", "check") 20000
    if ($updateCheckResult.ExitCode -ne 0) { throw "Update check failed." }
    $updateCheck = $updateCheckResult.Stdout | ConvertFrom-Json
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
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$name" -OutFile $archive -TimeoutSec 300
    Write-Step "Downloading checksums and update key..."
    Invoke-WebRequest -UseBasicParsing -Uri "$base/checksums.txt" -OutFile $checksums -TimeoutSec 300
    Invoke-WebRequest -UseBasicParsing -Uri "$base/update-public-key.pem" -OutFile $publicKey -TimeoutSec 300
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
  $previousService = if ($hadExecutable -and -not $NoService) {
    try {
      $statusResult = Invoke-NativeCapture $executable @("service", "status") 10000
      if ($statusResult.ExitCode -ne 0) { throw "status_exit_$($statusResult.ExitCode)" }
      $statusResult.Stdout | ConvertFrom-Json
    } catch {
      throw "Unable to read the existing Better Codex service state; no installation changes were made."
    }
  } else { $null }
  $previousInjectionEnabled = -not (Test-Path (Join-Path $betterCodexHome "run\injection.json")) -or ((Get-Content (Join-Path $betterCodexHome "run\injection.json") -Raw | ConvertFrom-Json).enabled -eq $true)
  if ($hadExecutable) { Copy-Item -Force $executable $backupExecutable }
  if ($hadSkill) { Copy-Item -Recurse -Force $skillDirectory $backupSkill }
  if ($hadIssueSkill) { Copy-Item -Recurse -Force $issueSkillDirectory $backupIssueSkill }
  if ($hadUpdateKey) { Copy-Item -Force $updatePublicKeyPath $backupUpdateKey }
  try {
  $codexProcesses = if ($NoService) { @() } else { @(Get-CodexProcesses) }
  if (@($codexProcesses).Count -gt 0) {
    $choice = Read-Host "Codex is currently running. Quit Codex and continue installation? [Y/n]"
    if ($choice -and $choice -notin @("y", "Y")) {
      Write-Output "Installation cancelled."
      return
    }
  }
  if ((Test-Path $executable) -and -not $NoService) {
    Write-Step "Stopping the existing Better Codex helpers..."
    $disableResult = Invoke-NativeCapture $executable @("disable") 10000
    if ($disableResult.TimedOut) { Write-Step "The existing injection did not respond; continuing with process cleanup..." }
    $serviceStopResult = Invoke-NativeCapture $executable @("service", "stop") 10000
    if ($serviceStopResult.TimedOut) { Write-Step "The existing runtime did not stop in time; continuing with process cleanup..." }
  }
  if (@($codexProcesses).Count -gt 0) {
    Write-Step "Stopping Codex..."
    @(Get-CodexProcesses) | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
      if (@(Get-CodexProcesses).Count -eq 0) { break }
      Start-Sleep -Milliseconds 250
    }
    if (@(Get-CodexProcesses).Count -gt 0) { throw "Codex did not quit completely. Quit it manually and run the installer again." }
  }
  Write-Step "Installing executable to $BinDirectory..."
  New-Item -ItemType Directory -Force -Path $BinDirectory | Out-Null
  if ($hadExecutable -and -not $NoService) { Start-Sleep -Milliseconds 800 }
  Copy-Item -Force $packagedExecutable $executable
  Write-Step "Installing Better Codex skill to $skillDirectory..."
  New-Item -ItemType Directory -Force -Path (Join-Path $skillDirectory "agents") | Out-Null
  Copy-Item -Force (Join-Path $packagedSkill "SKILL.md") (Join-Path $skillDirectory "SKILL.md")
  Copy-Item -Force (Join-Path $packagedSkill "agents\openai.yaml") (Join-Path $skillDirectory "agents\openai.yaml")
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $issueSkillDirectory
  New-Item -ItemType Directory -Force -Path $betterCodexHome | Out-Null
  Copy-Item -Force $publicKey $updatePublicKeyPath
  Write-Step "Verifying executable..."
  $versionResult = Invoke-NativeCapture $executable @("version") 10000
  if ($versionResult.Output) { Write-Host ($versionResult.Output.TrimEnd()) }
  if ($versionResult.ExitCode -ne 0) { throw "Better Codex executable verification failed." }
  if (-not $NoService) {
    Write-Step "Registering runtime and injecting Better Codex..."
    $setupResult = Invoke-NativeCapture $executable @("setup", "--yes") 120000
    if ($setupResult.ExitCode -ne 0) {
      Write-Host ($setupResult.Output.TrimEnd())
      throw "Better Codex setup failed with exit code $($setupResult.ExitCode)."
    }
    Write-Step "Running installation diagnostics..."
    $doctor = $null
    $doctorOutput = $null
    for ($attempt = 1; $attempt -le 8; $attempt++) {
      $doctorResult = Invoke-NativeCapture $executable @("doctor") 20000
      $doctorOutput = $doctorResult.Output
      $doctorExitCode = $doctorResult.ExitCode
      try {
        $doctor = $doctorResult.Stdout | ConvertFrom-Json
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
      $null = Invoke-NativeCapture $executable @("disable") 10000
      $null = Invoke-NativeCapture $executable @("service", "stop") 10000
      if (-not $hadExecutable) {
        $null = Invoke-NativeCapture $executable @("service", "uninstall") 10000
        $null = Invoke-NativeCapture $executable @("launcher", "uninstall") 10000
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
        $null = Invoke-NativeCapture $executable @("service", "install") 10000
        if ($previousService.running) { $null = Invoke-NativeCapture $executable @("service", "start") 10000 } else { $null = Invoke-NativeCapture $executable @("service", "stop") 10000 }
      } else {
        $null = Invoke-NativeCapture $executable @("service", "uninstall") 10000
      }
      if ($previousInjectionEnabled) { $null = Invoke-NativeCapture $executable @("enable") 30000 } else { $null = Invoke-NativeCapture $executable @("disable") 10000 }
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
