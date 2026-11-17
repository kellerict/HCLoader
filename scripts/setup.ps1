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
# Started as Windows PowerShell 5.1 from a PowerShell 7 console, PSModulePath still lists the
# PowerShell 7 module folders; 5.1 then fails to load e.g. Microsoft.PowerShell.Archive.
if ($PSVersionTable.PSVersion.Major -lt 6) {
    $env:PSModulePath = (($env:PSModulePath -split ';') | Where-Object { $_ -and $_ -notmatch '\\PowerShell\\' }) -join ';'
}
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step([string]$Text) {
    # elapsed time since the first step, so long runs visibly progress
    if (-not $script:HclClock) { $script:HclClock = [Diagnostics.Stopwatch]::StartNew() }
    $t = $script:HclClock.Elapsed
    Write-Host ('==> [{0:00}:{1:00}] {2}' -f [int][math]::Floor($t.TotalMinutes), $t.Seconds, $Text) -ForegroundColor Cyan
}

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
            # PS 5.1: redirected stderr of a native command becomes a terminating error under
            # ErrorActionPreference=Stop, so probe with a local 'Continue' and catch everything.
            $probeOk = $false
            $oldEap = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                & py $sel -c $versionCheck 2>$null | Out-Null
                $probeOk = ($LASTEXITCODE -eq 0)
            }
            catch { $probeOk = $false }
            finally { $ErrorActionPreference = $oldEap }
            if (-not $probeOk) { continue }
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
        $icon = Join-Path $RepoRoot 'ui\img\hcloader.ico'
        if (Test-Path $icon) { $sc.IconLocation = $icon }
        $sc.Description = 'HCLoader'
        $sc.Save()
    }
}

Write-Step 'Installation abgeschlossen. Start: .\.venv\Scripts\python -m app.main'
