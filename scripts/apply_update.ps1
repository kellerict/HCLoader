<#
.SYNOPSIS
  Spielt ein vorbereitetes HCLoader-Update ein (PowerShell 5.1). Wird von der App gestartet.
.DESCRIPTION
  Ablauf (docs/decisions.md "Selbst-Update"):
    1. warten, bis der App-Prozess (-WaitPid) beendet ist (Timeout -WaitSeconds)
    2. betroffene Programmteile (manifest.items: app, ui, scripts, Top-Level-Dateien) nach
       <App>\_previous\ verschieben, das Staging an ihre Stelle kopieren
    3. falls noetig: pip install -r requirements.txt (vorher Kopie von site-packages) und
       fetch_binaries.ps1 -BinDir (vorher Kopie des bgutil-Providers)
    4. Ergebnis nach <data>\update\result.json, Protokoll nach <data>\logs\update.log,
       Lock-Datei update.lock entfernen, App neu starten (-Restart)
  Bei einem Fehler wird alles aus _previous\ zurueckgeholt (Rollback).
  Nie angefasst: data\, portable.txt, python\, .venv\, bin\ (ausser Provider), licenses\, .git\.
  Nur ASCII in dieser Datei (PowerShell 5.1 liest Skripte ohne BOM als ANSI).
.PARAMETER Manifest
  <data>\update\manifest.json (geschrieben von app\core\selfupdate.py).
.PARAMETER WaitPid
  Prozess-ID der App; das Skript wartet auf ihr Ende.
.PARAMETER Restart
  Nach dem Update (oder Rollback) die App neu starten.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Manifest,
    [int]$WaitPid = 0,
    [int]$WaitSeconds = 180,
    [switch]$Restart
)

$ErrorActionPreference = 'Stop'
# Started as Windows PowerShell 5.1 from a PowerShell 7 console, PSModulePath still lists the
# PowerShell 7 module folders; 5.1 then fails to load e.g. Microsoft.PowerShell.Archive.
if ($PSVersionTable.PSVersion.Major -lt 6) {
    $env:PSModulePath = (($env:PSModulePath -split ';') | Where-Object { $_ -and $_ -notmatch '\\PowerShell\\' }) -join ';'
}
$ProgressPreference = 'SilentlyContinue'

$m = Get-Content -LiteralPath $Manifest -Raw -Encoding UTF8 | ConvertFrom-Json
$Root = [string]$m.app_root
$Staging = [string]$m.staging
$Prev = Join-Path $Root '_previous'
$LogFile = [string]$m.log
$ResultFile = [string]$m.result
$LockFile = [string]$m.lock
$Utf8 = New-Object Text.UTF8Encoding $false

New-Item -ItemType Directory -Path (Split-Path -Parent $LogFile) -Force | Out-Null

function Write-Log([string]$Text) {
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Text
    try { [IO.File]::AppendAllText($LogFile, $line + "`r`n", $Utf8) } catch { }
}

function Get-LongPath([string]$Path) {
    # extended-length prefix: no 260-character limit (deep node_modules, site-packages)
    $full = [IO.Path]::GetFullPath($Path)
    if ($full.StartsWith('\\')) { return $full }
    return '\\?\' + $full
}

function Remove-Tree([string]$Path) {
    # Remove-Item fails on paths > 260 characters. rmdir with \\?\ has no such limit.
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -LiteralPath $Path -Force
    if (-not $item.PSIsContainer) {
        Remove-Item -LiteralPath $Path -Force
        return
    }
    $full = Get-LongPath $Path
    cmd.exe /d /c "rmdir /s /q `"$full`"" | Out-Null
    if (Test-Path -LiteralPath $Path) { throw "Ordner konnte nicht entfernt werden: $Path" }
}

function Move-Entry([string]$From, [string]$To) {
    # same volume (both below the app folder) -> a rename, fast and atomic per entry
    # (a venv on another drive: fall back to copy + remove)
    $item = Get-Item -LiteralPath $From -Force
    try {
        if ($item.PSIsContainer) { [IO.Directory]::Move((Get-LongPath $From), (Get-LongPath $To)) }
        else { [IO.File]::Move((Get-LongPath $From), (Get-LongPath $To)) }
    }
    catch {
        if (-not $item.PSIsContainer) { throw }
        Write-Log "  Verschieben nicht moeglich, kopiere: $From"
        Copy-Tree $From $To
        Remove-Tree $From
    }
}

function Copy-Tree([string]$From, [string]$To) {
    # robocopy: long paths, exit codes 0-7 = success
    $old = $ErrorActionPreference
    $code = 16
    try {
        $ErrorActionPreference = 'Continue'
        $out = robocopy.exe $From $To /E /COPY:DAT /R:2 /W:1 /NFL /NDL /NJH /NJS /NP 2>&1
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $old }
    if ($code -ge 8) {
        foreach ($l in @($out)) { Write-Log ('  robocopy: ' + $l) }
        throw "Kopieren fehlgeschlagen (robocopy $code): $From -> $To"
    }
}

function Copy-Entry([string]$From, [string]$To) {
    $item = Get-Item -LiteralPath $From -Force
    if ($item.PSIsContainer) { Copy-Tree $From $To }
    else { Copy-Item -LiteralPath $From -Destination $To -Force }
}

function Invoke-Logged([string]$Exe, [string[]]$Arguments, [string]$What) {
    # native program; stderr must not become a terminating error (PS 5.1), exit code decides
    Write-Log ("> $What")
    $old = $ErrorActionPreference
    $code = 1
    try {
        $ErrorActionPreference = 'Continue'
        & $Exe @Arguments 2>&1 | ForEach-Object { Write-Log ('  ' + $_) }
        $code = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $old }
    if ($code -ne 0) { throw "$What fehlgeschlagen (Exitcode $code)" }
}

function Write-Result([hashtable]$Data) {
    $Data['finished'] = (Get-Date).ToString('o')
    $Data['log'] = $LogFile
    $json = $Data | ConvertTo-Json -Depth 4
    $tmp = $ResultFile + '.tmp'
    [IO.File]::WriteAllText($tmp, $json, $Utf8)
    Move-Item -LiteralPath $tmp -Destination $ResultFile -Force
}

function Start-App {
    $pyw = [string]$m.pythonw
    if (-not (Test-Path -LiteralPath $pyw)) { Write-Log "Neustart nicht moeglich: $pyw fehlt"; return }
    Write-Log "Starte HCLoader neu: $pyw -m app.main"
    Start-Process -FilePath $pyw -ArgumentList @('-m', 'app.main') -WorkingDirectory $Root | Out-Null
}

Write-Log ('=== Update {0} -> {1} ({2}) ===' -f $m.from_version, $m.to_version, $m.mode)

$appStopped = $true
$moved = New-Object System.Collections.ArrayList     # items moved to _previous
$placed = New-Object System.Collections.ArrayList    # items copied from staging
$siteBackup = ''
$providerBackup = ''
$result = @{ ok = $false; from_version = [string]$m.from_version; to_version = [string]$m.to_version; rolled_back = $false; error = '' }

try {
    # --- 1. wait for the app ----------------------------------------------------
    if ($WaitPid -gt 0) {
        $p = Get-Process -Id $WaitPid -ErrorAction SilentlyContinue
        if ($p) {
            Write-Log "Warte auf das Ende von HCLoader (PID $WaitPid) ..."
            if (-not $p.WaitForExit($WaitSeconds * 1000)) {
                $appStopped = $false
                throw "HCLoader wurde nicht innert $WaitSeconds s beendet - Update nicht eingespielt"
            }
        }
    }
    Start-Sleep -Seconds 1   # file handles of the old process

    # --- 2. checks --------------------------------------------------------------
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'app\__init__.py'))) { throw "App-Ordner ungueltig: $Root" }
    if (Test-Path -LiteralPath (Join-Path $Root '.git')) { throw 'Git-Checkout - bitte git pull und setup.ps1 verwenden' }
    if (-not (Test-Path -LiteralPath (Join-Path $Staging 'app\__init__.py'))) { throw "Staging unvollstaendig: $Staging" }
    $protected = @($m.protected)
    foreach ($i in @($m.items)) {
        $name = [string]$i
        if (-not $name -or $name.Contains('\') -or $name.Contains('/') -or $name.Contains('..') -or $name.Contains(':')) { throw "Ungueltiger Eintrag im Manifest: $name" }
        if ($protected -contains $name) { throw "Geschuetzter Eintrag im Manifest: $name" }
    }

    # --- 3. swap the program files --------------------------------------------------
    Remove-Tree $Prev
    New-Item -ItemType Directory -Path $Prev -Force | Out-Null
    foreach ($i in @($m.items)) {
        $name = [string]$i
        $src = Join-Path $Staging $name
        $dst = Join-Path $Root $name
        if (-not (Test-Path -LiteralPath $src)) { continue }
        if (Test-Path -LiteralPath $dst) {
            Move-Entry $dst (Join-Path $Prev $name)
            [void]$moved.Add($name)
        }
        [void]$placed.Add($name)
        Copy-Entry $src $dst
        Write-Log "  ersetzt: $name"
    }

    # --- 4. Python packages (only if requirements.txt changed) --------------------
    if ($m.requirements_changed) {
        $site = [string]$m.site_packages
        if ($site -and (Test-Path -LiteralPath $site)) {
            Write-Log "Sichere site-packages ($site) ..."
            $siteBackup = Join-Path $Prev 'site-packages'
            Copy-Tree $site $siteBackup
        }
        Invoke-Logged ([string]$m.python) ([string[]]@($m.pip_args)) 'pip install -r requirements.txt'
    }

    # --- 5. binaries (only if the fetch script or the packages changed) ---------------
    if ($m.binaries_changed) {
        $provider = Join-Path ([string]$m.bin_dir) 'bgutil-pot-provider'
        if (Test-Path -LiteralPath $provider) {
            $providerBackup = Join-Path $Prev 'bgutil-pot-provider'
            Copy-Tree $provider $providerBackup
        }
        $fetch = Join-Path $Root 'scripts\fetch_binaries.ps1'
        Write-Log '> fetch_binaries.ps1'
        & $fetch -BinDir ([string]$m.bin_dir) -Python ([string]$m.python) *>&1 | ForEach-Object { Write-Log ('  ' + $_) }
        if ($m.materialize_links) {
            $git = Join-Path $provider '.git'
            if (Test-Path -LiteralPath $git) { Remove-Tree $git }
            Invoke-Logged ([string]$m.python) @((Join-Path $Root 'scripts\materialize_links.py'), ([string]$m.bin_dir)) 'Links aufloesen'
        }
    }

    $result['ok'] = $true
    Write-Log ('Update erfolgreich: {0}' -f $m.to_version)
}
catch {
    $err = $_.Exception.Message
    $result['error'] = $err
    Write-Log "FEHLER: $err"
    if ($appStopped -and ($placed.Count -gt 0 -or $moved.Count -gt 0)) {
        Write-Log 'Rollback ...'
        try {
            foreach ($name in $placed) {
                $dst = Join-Path $Root $name
                if (Test-Path -LiteralPath $dst) { Remove-Tree $dst }
            }
            foreach ($name in $moved) {
                Move-Entry (Join-Path $Prev $name) (Join-Path $Root $name)
            }
            if ($siteBackup -and (Test-Path -LiteralPath $siteBackup)) {
                $site = [string]$m.site_packages
                Remove-Tree $site
                Move-Entry $siteBackup $site
            }
            if ($providerBackup -and (Test-Path -LiteralPath $providerBackup)) {
                $provider = Join-Path ([string]$m.bin_dir) 'bgutil-pot-provider'
                Remove-Tree $provider
                Move-Entry $providerBackup $provider
            }
            $result['rolled_back'] = $true
            Write-Log 'Rollback abgeschlossen - alte Version wiederhergestellt'
        }
        catch {
            $result['rolled_back'] = $false
            $result['error'] = $err + ' / Rollback fehlgeschlagen: ' + $_.Exception.Message
            Write-Log ('Rollback FEHLGESCHLAGEN: ' + $_.Exception.Message + " - Sicherung liegt in $Prev")
        }
    }
}
finally {
    try { Write-Result $result } catch { Write-Log ('result.json nicht schreibbar: ' + $_.Exception.Message) }
    if (Test-Path -LiteralPath $LockFile) { Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue }
}

if ($Restart -and $appStopped) { Start-App }
if ($result['ok']) { exit 0 }
exit 1
