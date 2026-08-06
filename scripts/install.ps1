param(
  [string]$Repository = "Ericwong5021/better-codex",
  [string]$Version = "v0.3.5",
  [string]$BinDirectory = "$env:LOCALAPPDATA\BetterCodex\bin",
  [switch]$NoService
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()

function Write-Step([string]$Message) {
  Write-Host "[Better Codex] $Message"
}

if (-not [Environment]::Is64BitOperatingSystem) { throw "Better Codex requires 64-bit Windows." }

$codexProcesses = @(Get-Process -Name "ChatGPT", "Codex" -ErrorAction SilentlyContinue)
if ($codexProcesses.Count -gt 0) {
  $choice = Read-Host "Codex is currently running. Quit Codex and continue installation? [Y/n]"
  if ($choice -and $choice -notin @("y", "Y")) {
    Write-Output "Installation cancelled."
    return
  }
  $codexProcesses | Stop-Process -Force
  Write-Step "Stopping Codex..."
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (-not (Get-Process -Name "ChatGPT", "Codex" -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 250
  }
  if (Get-Process -Name "ChatGPT", "Codex" -ErrorAction SilentlyContinue) { throw "Codex did not quit. Quit it manually and run the installer again." }
}

$workDirectory = Join-Path ([IO.Path]::GetTempPath()) ("better-codex-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $workDirectory | Out-Null
try {
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
  Write-Step "Verifying SHA-256 checksum..."
  $expected = ((Get-Content $checksums | Where-Object { $_ -match [regex]::Escape($name) }) -split "\s+")[0]
  if (-not $expected) { throw "No checksum found for $name." }
  $actual = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLowerInvariant()
  if ($actual -ne $expected.ToLowerInvariant()) { throw "Checksum mismatch for $name." }
  Write-Step "Extracting package..."
  Expand-Archive -LiteralPath $archive -DestinationPath $workDirectory -Force
  Write-Step "Installing executable to $BinDirectory..."
  New-Item -ItemType Directory -Force -Path $BinDirectory | Out-Null
  $executable = Join-Path $BinDirectory "better-codex.exe"
  if (Test-Path $executable) {
    & $executable disable 2>$null | Out-Null
    & $executable service stop 2>$null | Out-Null
    Start-Sleep -Milliseconds 800
  }
  Copy-Item -Force (Join-Path $workDirectory "better-codex.exe") $executable
  $homeDirectory = Join-Path $env:USERPROFILE ".better-codex"
  New-Item -ItemType Directory -Force -Path $homeDirectory | Out-Null
  Copy-Item -Force $publicKey (Join-Path $homeDirectory "update-public-key.pem")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (($userPath -split ";") -contains $BinDirectory)) {
    [Environment]::SetEnvironmentVariable("Path", (($userPath.TrimEnd(";") + ";" + $BinDirectory).TrimStart(";")), "User")
  }
  Write-Step "Verifying executable..."
  & $executable version
  if ($LASTEXITCODE -ne 0) { throw "Better Codex executable verification failed." }
  if (-not $NoService) {
    Write-Step "Registering runtime and injecting Better Codex..."
    & $executable setup --yes 2>&1 | ForEach-Object { Write-Host "[Better Codex] $_" }
    $setupExitCode = $LASTEXITCODE
    if ($setupExitCode -ne 0) { throw "Better Codex setup failed with exit code $setupExitCode." }
    Write-Step "Running installation diagnostics..."
    $doctor = $null
    for ($attempt = 1; $attempt -le 8; $attempt++) {
      $doctor = (& $executable doctor | Out-String | ConvertFrom-Json)
      if ($doctor.ok) { break }
      $reason = $doctor.checks.injection.error
      if (-not $reason) { $reason = "not ready" }
      Write-Step "Diagnostics pending ($attempt/8): $reason. Retrying..."
      Start-Sleep -Seconds 2
    }
    $doctor | ConvertTo-Json -Depth 8
    if (-not $doctor.ok) { throw "Better Codex installation verification failed." }
  }
  Write-Step "Installation completed: $executable"
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $workDirectory
}
