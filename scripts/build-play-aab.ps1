param(
  [string]$OutputName = "samsam-baekgwa-play-release.aab"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$AndroidDir = Join-Path $RepoRoot "android"
$PropsPath = Join-Path $AndroidDir "keystores\samsam-upload-key.properties"

if (-not (Test-Path -LiteralPath $PropsPath)) {
  throw "Release signing properties not found: $PropsPath"
}

$props = @{}
Get-Content -LiteralPath $PropsPath | ForEach-Object {
  $line = $_.Trim()
  if ($line.Length -eq 0 -or $line.StartsWith("#")) {
    return
  }

  $parts = $line.Split("=", 2)
  if ($parts.Length -eq 2) {
    $props[$parts[0].Trim()] = $parts[1].Trim()
  }
}

$required = @(
  "SAMSAM_UPLOAD_STORE_FILE",
  "SAMSAM_UPLOAD_STORE_PASSWORD",
  "SAMSAM_UPLOAD_KEY_ALIAS",
  "SAMSAM_UPLOAD_KEY_PASSWORD"
)

foreach ($key in $required) {
  if (-not $props.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($props[$key])) {
    throw "Missing signing property: $key"
  }
}

$env:SAMSAM_UPLOAD_STORE_FILE = $props["SAMSAM_UPLOAD_STORE_FILE"]
$env:SAMSAM_UPLOAD_STORE_PASSWORD = $props["SAMSAM_UPLOAD_STORE_PASSWORD"]
$env:SAMSAM_UPLOAD_KEY_ALIAS = $props["SAMSAM_UPLOAD_KEY_ALIAS"]
$env:SAMSAM_UPLOAD_KEY_PASSWORD = $props["SAMSAM_UPLOAD_KEY_PASSWORD"]

Push-Location -LiteralPath $AndroidDir
try {
  & .\gradlew.bat --project-cache-dir ..\.gradle-cache-company --no-daemon --no-parallel :app:bundleRelease
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle bundleRelease failed with exit code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

$SourceAab = Join-Path $AndroidDir "app\build\outputs\bundle\release\app-release.aab"
$TargetAab = Join-Path $RepoRoot $OutputName

if (-not (Test-Path -LiteralPath $SourceAab)) {
  throw "AAB was not created: $SourceAab"
}

Copy-Item -LiteralPath $SourceAab -Destination $TargetAab -Force
Get-Item -LiteralPath $TargetAab | Select-Object FullName, Length, LastWriteTime
