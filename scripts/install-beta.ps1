param(
  [string]$Repository = "Ericwong5021/better-codex"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$UpdateKeySha256 = "1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e"

function Show-BetterCodexBanner {
  $logo = "  >_ BETTER CODEX"
  $colorEnabled = -not [Console]::IsOutputRedirected -and -not $env:NO_COLOR -and $env:TERM -ne "dumb"
  Write-Host ""
  if ($colorEnabled) {
    Write-Host $logo -ForegroundColor Cyan
  } else {
    Write-Host $logo
  }
  Write-Host ""
}

function Get-RemoteText([string]$Uri) {
  $request = [System.Net.HttpWebRequest]::Create($Uri)
  $request.Method = "GET"
  $request.AllowAutoRedirect = $true
  $request.UserAgent = "better-codex-beta-installer"
  $request.Timeout = 60000
  $request.ReadWriteTimeout = 60000
  $response = $request.GetResponse()
  try {
    $reader = [IO.StreamReader]::new($response.GetResponseStream(), [Text.UTF8Encoding]::new($false), $true)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  } finally {
    $response.Close()
  }
}

function Get-PreviewReleaseVersion([string]$ManifestContent) {
  try { $manifest = $ManifestContent | ConvertFrom-Json } catch { throw "The Better Codex Preview feed returned invalid JSON." }
  if ($manifest.payload.schemaVersion -ne 1 -or $manifest.payload.channel -ne "preview" -or -not $manifest.signature) {
    throw "The Better Codex Preview feed is invalid."
  }
  $version = [string]$manifest.payload.core.version
  if ($version -notmatch '^\d+\.\d+\.\d+(?:-beta\.[1-9]\d*)?$') {
    throw "The Better Codex Preview feed contains an invalid version."
  }
  $windowsAsset = $manifest.payload.core.assets.PSObject.Properties["win32-amd64"]
  if (-not $windowsAsset -or -not $windowsAsset.Value.url -or ([string]$windowsAsset.Value.sha256 -notmatch '^[a-fA-F0-9]{64}$')) {
    throw "The Better Codex Preview feed does not contain a valid Windows package."
  }
  $installer = $manifest.payload.installers.windows
  if (-not $installer -or -not $installer.url -or ([string]$installer.sha256 -notmatch '^[a-fA-F0-9]{64}$')) {
    throw "The Better Codex Preview feed does not contain a signed Windows installer."
  }
  return $version
}

function Get-CompatibleNode {
  $candidates = @(
    $(try { (Get-Command node.exe -ErrorAction Stop).Source } catch { $null }),
    $(if ($env:ProgramFiles) { Join-Path $env:ProgramFiles "nodejs\node.exe" } else { $null }),
    $(if (${env:ProgramFiles(x86)}) { Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe" } else { $null })
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -Unique
  foreach ($candidate in $candidates) {
    try {
      $version = (& $candidate --version 2>$null).Trim().TrimStart("v")
      if ($LASTEXITCODE -eq 0 -and [version]$version -ge [version]"22.5.0") { return $candidate }
    } catch {}
  }
  return $null
}

function Ensure-CompatibleNode {
  $node = Get-CompatibleNode
  if ($node) { return $node }
  $choice = Read-Host "Better Codex requires Node.js v22.5.0 or later. Install Node.js LTS now? [Y/n]"
  if ($choice -and $choice -notin @("y", "Y")) { throw "Node.js is required to verify the signed Preview feed." }
  $winget = try { (Get-Command winget.exe -ErrorAction Stop).Source } catch { $null }
  if (-not $winget) { throw "Windows Package Manager is required to install Node.js securely." }
  & $winget install --id OpenJS.NodeJS.LTS --exact --source winget --accept-package-agreements --accept-source-agreements --disable-interactivity --force
  if ($LASTEXITCODE -ne 0) { throw "Node.js installation failed." }
  $env:Path = @([Environment]::GetEnvironmentVariable("Path", "Machine"), [Environment]::GetEnvironmentVariable("Path", "User")) -join ";"
  $node = Get-CompatibleNode
  if (-not $node) { throw "Node.js v22.5.0 or later was not detected after installation." }
  return $node
}

function Get-NormalizedSha256([string]$Content) {
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($Content.Replace("`r", ""))
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant() } finally { $sha.Dispose() }
}

if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Invalid Better Codex repository name." }
Show-BetterCodexBanner
$node = Ensure-CompatibleNode
$workDirectory = Join-Path ([IO.Path]::GetTempPath()) ("better-codex-beta-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $workDirectory | Out-Null
try {
  $cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  Write-Host "[Better Codex] Resolving and verifying the current Beta release..."
  $manifestContent = Get-RemoteText "https://github.com/$Repository/releases/download/preview/update-manifest.json?better_codex_cache_bust=$cacheBust"
  $null = Get-PreviewReleaseVersion $manifestContent
  $publicKeyContent = Get-RemoteText "https://raw.githubusercontent.com/$Repository/main/assets/update-public-key.pem?better_codex_cache_bust=$cacheBust"
  if ((Get-NormalizedSha256 $publicKeyContent) -ne $UpdateKeySha256) { throw "The Better Codex update key does not match the pinned key." }
  $manifestPath = Join-Path $workDirectory "update-manifest.json"
  $publicKeyPath = Join-Path $workDirectory "update-public-key.pem"
  [IO.File]::WriteAllText($manifestPath, $manifestContent, [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($publicKeyPath, $publicKeyContent, [Text.UTF8Encoding]::new($false))
  $verifyScript = @'
const fs = require("fs"), crypto = require("crypto");
const [manifestPath, keyPath] = process.argv.slice(1);
const stableJson = value => Array.isArray(value) ? `[${value.map(stableJson).join(",")}]` : value && typeof value === "object" ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}` : JSON.stringify(value);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const payload = manifest.payload, installer = payload?.installers?.windows, version = payload?.core?.version;
if (payload?.schemaVersion !== 1 || payload?.channel !== "preview" || !/^\d+\.\d+\.\d+(?:-beta\.[1-9]\d*)?$/.test(version || "") || typeof installer?.url !== "string" || !installer.url.startsWith("https://") || !/^[a-f0-9]{64}$/i.test(installer.sha256 || "")) process.exit(1);
if (!crypto.verify(null, Buffer.from(stableJson(payload)), fs.readFileSync(keyPath), Buffer.from(manifest.signature || "", "base64"))) process.exit(1);
process.stdout.write(JSON.stringify({ version, url: installer.url, sha256: installer.sha256.toLowerCase() }));
'@
  $verifiedJson = & $node -e $verifyScript $manifestPath $publicKeyPath
  if ($LASTEXITCODE -ne 0 -or -not $verifiedJson) { throw "The Better Codex Preview feed signature is invalid." }
  $verified = $verifiedJson | ConvertFrom-Json
  $installerPath = Join-Path $workDirectory "install.ps1"
  $installerContent = Get-RemoteText ([string]$verified.url)
  [IO.File]::WriteAllText($installerPath, $installerContent, [Text.UTF8Encoding]::new($false))
  if ((Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$verified.sha256) { throw "The Better Codex Windows installer checksum is invalid." }
  $installerBlock = [scriptblock]::Create($installerContent)
  if ($installerContent -match '\[switch\]\$SkipBanner') {
    & $installerBlock -Repository $Repository -Version ("v" + [string]$verified.version) -Preview -SkipBanner
  } else {
    & $installerBlock -Repository $Repository -Version ("v" + [string]$verified.version) -Preview
  }
} finally {
  Remove-Item -LiteralPath $workDirectory -Recurse -Force -ErrorAction SilentlyContinue
}
