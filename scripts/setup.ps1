<#
.SYNOPSIS
  Erstinstallation von HCLoader (PowerShell 5.1): venv, Abhaengigkeiten, Binaries, Desktop-Verknuepfung.
.DESCRIPTION
  Idempotent. -Force legt venv-Pakete/Binaries/Verknuepfung neu an (venv bleibt bestehen,
  Pakete werden aktualisiert). -Dev installiert zusaetzlich requirements-dev.txt.
#>
[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$Dev,
    [switch]$SkipBinaries,
    [switch]$NoShortcut
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }

$VenvDir = Join-Path $RepoRoot '.venv'
$VenvPython = Join-Path $VenvDir 'Scripts\python.exe'
$VenvPythonW = Join-Path $VenvDir 'Scripts\pythonw.exe'

# --- venv ------------------------------------------------------------------
if (Test-Path $VenvPython) {
    Write-Step 'venv vorhanden'
}
else {
    Write-Step 'Lege venv an ...'
    $created = $false
    $versionCheck = 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)'
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        # Prefer 3.13, then 3.12, then the newest installed Python 3 if it is >= 3.12.
        foreach ($sel in @('-3.13', '-3.12', '-3')) {
            & py $sel -c $versionCheck 2>$null
            if ($LASTEXITCODE -ne 0) { continue }
            & py $sel -m venv $VenvDir
            if ($LASTEXITCODE -eq 0) { $created = $true; break }
        }
    }
    if (-not $created) {
        $python = Get-Command python -ErrorAction SilentlyContinue
        if (-not $python) { throw 'Python 3.12+ nicht gefunden (py -3 oder python im PATH).' }
        & python -c $versionCheck
        if ($LASTEXITCODE -ne 0) { throw 'Python 3.12 oder neuer wird benoetigt.' }
        & python -m venv $VenvDir
        if ($LASTEXITCODE -ne 0) { throw 'venv konnte nicht angelegt werden.' }
    }
}

# --- Pakete ----------------------------------------------------------------
Write-Step 'Installiere Abhaengigkeiten ...'
& $VenvPython -m pip install --upgrade pip
if ($LASTEXITCODE -ne 0) { throw 'pip-Update fehlgeschlagen' }
$pipArgs = @('-m', 'pip', 'install', '-r', (Join-Path $RepoRoot 'requirements.txt'))
if ($Dev) { $pipArgs += @('-r', (Join-Path $RepoRoot 'requirements-dev.txt')) }
& $VenvPython @pipArgs
if ($LASTEXITCODE -ne 0) { throw 'pip install fehlgeschlagen' }

# --- Binaries --------------------------------------------------------------
if ($SkipBinaries) {
    Write-Step 'Binaries uebersprungen (-SkipBinaries)'
}
else {
    $fetch = Join-Path $PSScriptRoot 'fetch_binaries.ps1'
    if ($Force) { & $fetch -Force } else { & $fetch }
}

# --- Desktop-Verknuepfung --------------------------------------------------
if ($NoShortcut) {
    Write-Step 'Verknuepfung uebersprungen (-NoShortcut)'
}
else {
    $desktop = [Environment]::GetFolderPath('Desktop')
    $lnk = Join-Path $desktop 'HCLoader.lnk'
    if ((Test-Path $lnk) -and -not $Force) {
        Write-Step 'Desktop-Verknuepfung vorhanden - uebersprungen'
    }
    else {
        Write-Step 'Erstelle Desktop-Verknuepfung ...'
        $shell = New-Object -ComObject WScript.Shell
        $sc = $shell.CreateShortcut($lnk)
        $sc.TargetPath = $VenvPythonW
        $sc.Arguments = '-m app.main'
        $sc.WorkingDirectory = $RepoRoot
        $sc.Description = 'HCLoader'
        $sc.Save()
    }
}

Write-Step 'Installation abgeschlossen. Start: .\.venv\Scripts\python -m app.main'
