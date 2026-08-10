param(
  [string]$Repository = "Ericwong5021/better-codex"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "Continue"
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()

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
  return $version
}

if ($Repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Invalid Better Codex repository name." }
$cacheBust = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Write-Host "[Better Codex] Resolving the current Beta release..."
$manifestUrl = "https://github.com/$Repository/releases/download/preview/update-manifest.json?better_codex_cache_bust=$cacheBust"
$version = Get-PreviewReleaseVersion (Get-RemoteText $manifestUrl)
$installerUrl = "https://github.com/$Repository/releases/download/v$version/install.ps1?better_codex_cache_bust=$cacheBust"
$installer = Get-RemoteText $installerUrl
& ([scriptblock]::Create($installer)) -Repository $Repository -Version "v$version" -Preview
