<#
.SYNOPSIS
  Holt deno, ffmpeg/ffprobe und den bgutil-PO-Token-Provider nach bin\ (PowerShell 5.1).
.DESCRIPTION
  Idempotent: Vorhandenes wird uebersprungen. Mit -Force wird alles neu geholt.
  Der Provider wird in genau der Version geklont, die als pip-Plugin im venv installiert ist.
  Voraussetzung: venv existiert (scripts\setup.ps1 legt es an) und Internetzugang.
  Portable-Build (scripts\build_portable.ps1): -BinDir, -Python (eingebettetes Python statt venv)
  und -LicenseDir (Lizenztexte von ffmpeg) zeigen in den Build-Ordner.
#>
[CmdletBinding()]
param(
    [switch]$Force,
    [string]$BinDir = '',
    [string]$Python = '',
    [string]$LicenseDir = ''
)

$ErrorActionPreference = 'Stop'
# Started as Windows PowerShell 5.1 from a PowerShell 7 console, PSModulePath still lists the
# PowerShell 7 module folders; 5.1 then fails to load e.g. Microsoft.PowerShell.Archive.
if ($PSVersionTable.PSVersion.Major -lt 6) {
    $env:PSModulePath = (($env:PSModulePath -split ';') | Where-Object { $_ -and $_ -notmatch '\\PowerShell\\' }) -join ';'
}
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$RepoRoot = Split-Path -Parent $PSScriptRoot
if (-not $BinDir) { $BinDir = Join-Path $RepoRoot 'bin' }
$VenvPython = $Python
if (-not $VenvPython) { $VenvPython = Join-Path $RepoRoot '.venv\Scripts\python.exe' }

$DenoUrl = 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip'
$DenoShaUrl = "$DenoUrl.sha256sum"
$FfmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
$FfmpegShaUrl = "$FfmpegUrl.sha256"
$ProviderRepo = 'https://github.com/Brainicism/bgutil-ytdlp-pot-provider'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }

function Expand-ZipFile([string]$Path, [string]$Destination) {
    # .NET instead of Expand-Archive: no module dependency, works in PS 5.1 and 7.
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $root = [IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        foreach ($entry in $zip.Entries) {
            $target = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $entry.FullName))
            if (-not $target.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Ungueltiger Pfad im ZIP: $($entry.FullName)"
            }
            if ($entry.FullName.EndsWith('/') -or $entry.FullName.EndsWith('\')) {
                New-Item -ItemType Directory -Path $target -Force | Out-Null
                continue
            }
            New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
        }
    }
    finally { $zip.Dispose() }
}

function Invoke-Native([string]$Exe, [string[]]$Arguments, [string]$What) {
    # git/deno write progress to stderr. Under PS 5.1 with ErrorActionPreference=Stop this can
    # become a terminating error (redirected hosts, CI), so only the exit code decides.
    $old = $ErrorActionPreference
    $code = 1
    try {
        $ErrorActionPreference = 'Continue'
        & $Exe @Arguments | Out-Host
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $old }
    if ($code -ne 0) { throw "$What fehlgeschlagen (Exitcode $code)" }
}

function New-TempDir {
    $path = Join-Path ([IO.Path]::GetTempPath()) ('hcloader_' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $path | Out-Null
    return $path
}

function Get-ExpectedSha256([string]$Url) {
    # Returns the 64 hex chars of the published checksum, or $null if it cannot be fetched.
    try {
        $content = (Invoke-WebRequest -Uri $Url -UseBasicParsing).Content
        if ($content -is [byte[]]) { $content = [Text.Encoding]::ASCII.GetString($content) }
        $m = [regex]::Match([string]$content, '(?i)\b[0-9a-f]{64}\b')
        if ($m.Success) { return $m.Value.ToLowerInvariant() }
    }
    catch { }
    return $null
}

function Get-Zip([string]$Url, [string]$TempDir, [string]$ShaUrl) {
    $zip = Join-Path $TempDir 'download.zip'
    Invoke-WebRequest -Uri $Url -OutFile $zip -UseBasicParsing
    if ($ShaUrl) {
        $expected = Get-ExpectedSha256 $ShaUrl
        if ($expected) {
            $actual = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($actual -ne $expected) { throw "SHA256 stimmt nicht ueberein ($Url): erwartet $expected, erhalten $actual" }
            Write-Host "    SHA256 geprueft ($Url)" -ForegroundColor DarkGray
        }
        else {
            Write-Host "    WARNUNG: keine Pruefsumme verfuegbar ($ShaUrl) - Download nicht verifiziert" -ForegroundColor Yellow
        }
    }
    $extract = Join-Path $TempDir 'x'
    Expand-ZipFile -Path $zip -Destination $extract
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
        $dir = Get-Zip $DenoUrl $tmp $DenoShaUrl
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
        $dir = Get-Zip $FfmpegUrl $tmp $FfmpegShaUrl
        $ff = Get-ChildItem -Path $dir -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
        $fp = Get-ChildItem -Path $dir -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1
        if (-not $ff -or -not $fp) { throw 'ffmpeg.exe/ffprobe.exe nicht im Archiv gefunden' }
        Copy-Item -Path $ff.FullName -Destination $FfmpegExe -Force
        Copy-Item -Path $fp.FullName -Destination $FfprobeExe -Force
        if ($LicenseDir) {
            # gyan.dev: <archiv>\ffmpeg-<ver>-essentials_build\{LICENSE, README.txt, bin\...}
            New-Item -ItemType Directory -Path $LicenseDir -Force | Out-Null
            $buildRoot = Split-Path -Parent (Split-Path -Parent $ff.FullName)
            Get-ChildItem -Path $buildRoot -File | Where-Object { $_.Name -match '^(LICENSE|COPYING|README)' } |
                ForEach-Object { Copy-Item -Path $_.FullName -Destination (Join-Path $LicenseDir $_.Name) -Force }
        }
    }
    finally { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

# --- bgutil PO-Token-Provider ----------------------------------------------
if (-not (Test-Path $VenvPython)) {
    throw "Python fehlt ($VenvPython). Zuerst scripts\setup.ps1 (venv) bzw. build_portable.ps1 ausfuehren."
}
$pipOut = & $VenvPython -m pip show bgutil-ytdlp-pot-provider
if ($LASTEXITCODE -ne 0) { throw "Plugin bgutil-ytdlp-pot-provider ist nicht installiert ($VenvPython)" }
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
        Invoke-Native 'git' @('-c', 'advice.detachedHead=false', 'clone', '--quiet', '--depth', '1', '--single-branch', '--branch', $Version, "$ProviderRepo.git", $ProviderDir) 'git clone'
    }
    else {
        Write-Host 'git nicht gefunden - lade Tag als ZIP' -ForegroundColor Yellow
        $tmp = New-TempDir
        try {
            $dir = Get-Zip "$ProviderRepo/archive/refs/tags/$Version.zip" $tmp $null
            $inner = Get-ChildItem -Path $dir -Directory | Select-Object -First 1
            # Copy (not Move): %TEMP% may be on another drive than the repo (Move-Item fails on PS 5.1)
            Copy-Item -Path $inner.FullName -Destination $ProviderDir -Recurse -Force
        }
        finally { Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue }
    }
    Write-Step 'deno install (Provider-Abhaengigkeiten) ...'
    Push-Location $ServerDir
    try {
        Invoke-Native $DenoExe @('install', '--allow-scripts=npm:canvas', '--frozen') 'deno install'
    }
    finally { Pop-Location }
    Set-Content -Path $VersionFile -Value $Version -Encoding ASCII
}

Write-Step 'Fertig.'
& $DenoExe --version
& $FfmpegExe -version | Select-Object -First 1
