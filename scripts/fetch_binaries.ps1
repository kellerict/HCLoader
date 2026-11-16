<#
.SYNOPSIS
  Holt deno, ffmpeg/ffprobe und den bgutil-PO-Token-Provider nach bin\ (PowerShell 5.1).
.DESCRIPTION
  Idempotent: Vorhandenes wird uebersprungen. Mit -Force wird alles neu geholt.
  Der Provider wird in genau der Version geklont, die als pip-Plugin im venv installiert ist.
  Voraussetzung: venv existiert (scripts\setup.ps1 legt es an) und Internetzugang.
#>
[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoRoot = Split-Path -Parent $PSScriptRoot
$BinDir = Join-Path $RepoRoot 'bin'
$VenvPython = Join-Path $RepoRoot '.venv\Scripts\python.exe'

$DenoUrl = 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip'
$FfmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$ProviderRepo = 'https://github.com/Brainicism/bgutil-ytdlp-pot-provider'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }

function New-TempDir {
    $path = Join-Path ([IO.Path]::GetTempPath()) ('hcloader_' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $path | Out-Null
    return $path
}

function Get-Zip([string]$Url, [string]$TempDir) {
    $zip = Join-Path $TempDir 'download.zip'
    Invoke-WebRequest -Uri $Url -OutFile $zip -UseBasicParsing
    $extract = Join-Path $TempDir 'x'
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    return $extract
}

New-Item -ItemType Directory -Path $BinDir -Force | Out-Null

# --- deno ------------------------------------------------------------------
$DenoExe = Join-Path $BinDir 'deno.exe'
if ((Test-Path $DenoExe) -and -not $Force) {
    Write-Step 'deno.exe vorhanden - uebersprungen'
}
else {
    Write-Step 'Lade deno ...'
    $tmp = New-TempDir
    try {
        $dir = Get-Zip $DenoUrl $tmp
        Copy-Item -Path (Join-Path $dir 'deno.exe') -Destination $DenoExe -Force
    }
    finally { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

# --- ffmpeg / ffprobe ------------------------------------------------------
$FfmpegExe = Join-Path $BinDir 'ffmpeg.exe'
$FfprobeExe = Join-Path $BinDir 'ffprobe.exe'
if ((Test-Path $FfmpegExe) -and (Test-Path $FfprobeExe) -and -not $Force) {
    Write-Step 'ffmpeg.exe/ffprobe.exe vorhanden - uebersprungen'
}
else {
    Write-Step 'Lade ffmpeg (gyan.dev, release essentials) ...'
    $tmp = New-TempDir
    try {
        $dir = Get-Zip $FfmpegUrl $tmp
        $ff = Get-ChildItem -Path $dir -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
        $fp = Get-ChildItem -Path $dir -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1
        if (-not $ff -or -not $fp) { throw 'ffmpeg.exe/ffprobe.exe nicht im Archiv gefunden' }
        Copy-Item -Path $ff.FullName -Destination $FfmpegExe -Force
        Copy-Item -Path $fp.FullName -Destination $FfprobeExe -Force
    }
    finally { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

# --- bgutil PO-Token-Provider ----------------------------------------------
if (-not (Test-Path $VenvPython)) {
    throw "venv fehlt ($VenvPython). Zuerst scripts\setup.ps1 ausfuehren."
}
$pipOut = & $VenvPython -m pip show bgutil-ytdlp-pot-provider
if ($LASTEXITCODE -ne 0) { throw 'Plugin bgutil-ytdlp-pot-provider ist im venv nicht installiert' }
$Version = ($pipOut | Where-Object { $_ -match '^Version:' } | Select-Object -First 1) -replace '^Version:\s*', ''
$Version = $Version.Trim()
if (-not $Version) { throw 'Plugin-Version konnte nicht ermittelt werden' }

$ProviderDir = Join-Path $BinDir 'bgutil-pot-provider'
$ServerDir = Join-Path $ProviderDir 'server'
$VersionFile = Join-Path $ProviderDir '.hcloader-version'
$installed = ''
if (Test-Path $VersionFile) { $installed = (Get-Content -Path $VersionFile -Raw).Trim() }

$ready = (Test-Path (Join-Path $ServerDir 'node_modules')) -and ($installed -eq $Version)
if ($ready -and -not $Force) {
    Write-Step "bgutil-Provider $Version vorhanden - uebersprungen"
}
else {
    Write-Step "Hole bgutil-Provider $Version ..."
    if (Test-Path $ProviderDir) { Remove-Item -Path $ProviderDir -Recurse -Force }
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        & git clone --depth 1 --single-branch --branch $Version "$ProviderRepo.git" $ProviderDir
        if ($LASTEXITCODE -ne 0) { throw 'git clone fehlgeschlagen' }
    }
    else {
        Write-Host 'git nicht gefunden - lade Tag als ZIP' -ForegroundColor Yellow
        $tmp = New-TempDir
        try {
            $dir = Get-Zip "$ProviderRepo/archive/refs/tags/$Version.zip" $tmp
            $inner = Get-ChildItem -Path $dir -Directory | Select-Object -First 1
            Move-Item -Path $inner.FullName -Destination $ProviderDir
        }
        finally { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    }
    Write-Step 'deno install (Provider-Abhaengigkeiten) ...'
    Push-Location $ServerDir
    try {
        & $DenoExe install --allow-scripts=npm:canvas --frozen
        if ($LASTEXITCODE -ne 0) { throw 'deno install fehlgeschlagen' }
    }
    finally { Pop-Location }
    Set-Content -Path $VersionFile -Value $Version -Encoding ASCII
}

Write-Step 'Fertig.'
& $DenoExe --version
& $FfmpegExe -version | Select-Object -First 1
