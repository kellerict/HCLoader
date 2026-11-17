<#
.SYNOPSIS
  Spielt ein vorbereitetes HCLoader-Update ein (PowerShell 5.1). Wird von der App gestartet.
.DESCRIPTION
  Ablauf (docs/decisions.md "Selbst-Update"):
    1. warten, bis der App-Prozess (-WaitPid) beendet ist (Timeout -WaitSeconds), danach den
       Lauf-Lock (Named Mutex "run") holen: ein Headless-Lauf der Aufgabenplanung wird abgewartet
    2. Rename-Probe aller betroffenen Eintraege: ist einer gesperrt (Virenscanner, Explorer),
       wird ohne jede Aenderung abgebrochen und die alte Version gestartet
    3. Journal <data>\update\in_progress.json schreiben, betroffene Programmteile
       (manifest.items) nach <App>\_previous\ umbenennen, das Staging an ihre Stelle kopieren
    4. falls noetig: pip install -r requirements.txt (vorher Kopie von site-packages) und
       fetch_binaries.ps1 -BinDir (vorher Kopie des bgutil-Providers)
    5. Ergebnis nach <data>\update\result.json, Protokoll nach <data>\logs\update.log,
       Journal und Lock-Datei update.lock entfernen, App neu starten (-Restart)
  Bei einem Fehler wird alles aus _previous\ zurueckgeholt (Rollback). Stirbt das Skript mitten
  im Austausch (Strom, Kill), bleibt das Journal liegen; der naechste Start (HCLoader.cmd/.vbs,
  app.main oder dieses Skript) ruft das Skript mit -Recover auf und stellt aus _previous\ wieder
  her. _previous\ wird nur geloescht, wenn der letzte Lauf ok war; sonst bleibt es als
  _previous-<Zeitstempel> erhalten.
  Nie angefasst: data\, portable.txt, python\, .venv\, bin\ (ausser Provider), licenses\, .git\.
  Nur ASCII in dieser Datei (PowerShell 5.1 liest Skripte ohne BOM als ANSI).
.PARAMETER Manifest
  <data>\update\manifest.json (geschrieben von app\core\selfupdate.py).
.PARAMETER WaitPid
  Prozess-ID der App; das Skript wartet auf ihr Ende.
.PARAMETER Restart
  Nach dem Update (oder Rollback) die App neu starten.
.PARAMETER Recover
  Nur ein unterbrochenes Update (Journal in_progress.json) aus _previous\ zuruecksetzen.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Manifest,
    [int]$WaitPid = 0,
    [int]$WaitSeconds = 180,
    [int]$RunLockSeconds = 1800,
    [switch]$Restart,
    [switch]$Recover
)

$ErrorActionPreference = 'Stop'
# Started as Windows PowerShell 5.1 from a PowerShell 7 console, PSModulePath still lists the
# PowerShell 7 module folders; 5.1 then fails to load e.g. Microsoft.PowerShell.Archive.
if ($PSVersionTable.PSVersion.Major -lt 6) {
    $env:PSModulePath = (($env:PSModulePath -split ';') | Where-Object { $_ -and $_ -notmatch '\\PowerShell\\' }) -join ';'
}
$ProgressPreference = 'SilentlyContinue'
$Utf8 = New-Object Text.UTF8Encoding $false

# Fallback paths from the manifest location (<data>\update\manifest.json), so that a broken
# manifest still leaves a log, a result.json and no stale update.lock (Review n7).
$ManifestPath = $PSCmdlet.GetUnresolvedProviderPathFromPSPath($Manifest)
$UpdateDir = Split-Path -Parent $ManifestPath
$LogFile = Join-Path (Join-Path (Split-Path -Parent $UpdateDir) 'logs') 'update.log'
$ResultFile = Join-Path $UpdateDir 'result.json'
$LockFile = Join-Path $UpdateDir 'update.lock'
$JournalFile = Join-Path $UpdateDir 'in_progress.json'
$m = $null
$Root = ''
$Staging = ''
$Prev = ''

function Write-Log([string]$Text) {
    $line = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Text
    try { [IO.File]::AppendAllText($LogFile, $line + "`r`n", $Utf8) } catch { }
    # sign of life: pip/fetch may take longer than the 30 min after which the app treats the
    # lock as stale (Review n10)
    try { if (Test-Path -LiteralPath $LockFile) { [IO.File]::SetLastWriteTime($LockFile, (Get-Date)) } } catch { }
}

function Get-LongPath([string]$Path) {
    # extended-length prefix: no 260-character limit (deep node_modules, site-packages)
    $full = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
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

function Invoke-Retry([scriptblock]$RetryAction, [string]$RetryWhat, [int]$RetryTries = 5, [int]$RetryPause = 2) {
    # locks of a virus scanner or the indexer are usually gone after a few seconds. The block
    # sees the caller's variables (dynamic scope); the parameter names here are unique.
    for ($retryNo = 1; $retryNo -le $RetryTries; $retryNo++) {
        try { & $RetryAction; return }
        catch {
            if ($retryNo -ge $RetryTries) { throw }
            Write-Log ("  {0}: Versuch {1} fehlgeschlagen ({2}), neuer Versuch" -f $RetryWhat, $retryNo, $_.Exception.Message)
            Start-Sleep -Seconds $RetryPause
        }
    }
}

function Rename-Entry([string]$From, [string]$To) {
    # same volume (both below the app folder) -> a rename, atomic per entry
    $item = Get-Item -LiteralPath $From -Force
    if ($item.PSIsContainer) { [IO.Directory]::Move((Get-LongPath $From), (Get-LongPath $To)) }
    else { [IO.File]::Move((Get-LongPath $From), (Get-LongPath $To)) }
}

function Move-Entry([string]$From, [string]$To) {
    # rename; another volume (a venv elsewhere): copy, then remove the source if possible
    try { Rename-Entry $From $To }
    catch {
        $item = Get-Item -LiteralPath $From -Force
        if (-not $item.PSIsContainer) { throw }
        Write-Log "  Umbenennen nicht moeglich, kopiere: $From"
        Copy-Tree $From $To
        try { Remove-Tree $From } catch { Write-Log ('  Quelle bleibt liegen: ' + $_.Exception.Message) }
    }
}

function Test-Renamable([string]$Path) {
    # Review M4: rename there and back before anything is changed. A locked entry (open file
    # inside a folder) cannot be renamed; then nothing is touched at all.
    $probe = $Path + '.hcprobe'
    if (Test-Path -LiteralPath $probe) { throw "Rest einer frueheren Probe vorhanden: $probe" }
    try { Rename-Entry $Path $probe }
    catch { return $false }
    Invoke-Retry { Rename-Entry $probe $Path } "Probe zuruecknehmen ($Path)" 10 1
    return $true
}

function Copy-Tree([string]$From, [string]$To) {
    # robocopy: long paths, exit codes 0-7 = success
    $old = $ErrorActionPreference
    $code = 16
    try {
        $ErrorActionPreference = 'Continue'
        $out = robocopy.exe $From $To /E /COPY:DAT /R:5 /W:2 /NFL /NDL /NJH /NJS /NP 2>&1
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

function Save-Journal([hashtable]$Journal) {
    # Review m2: what has been changed so far; written BEFORE each change
    $json = $Journal | ConvertTo-Json -Depth 4
    $tmp = $JournalFile + '.tmp'
    [IO.File]::WriteAllText($tmp, $json, $Utf8)
    Move-Item -LiteralPath $tmp -Destination $JournalFile -Force
}

function Read-LastResult {
    # result.json of the last run (the app renames it to result.last.json when it reads it)
    foreach ($name in @('result.json', 'result.last.json')) {
        $p = Join-Path $UpdateDir $name
        if (Test-Path -LiteralPath $p) {
            try { return (Get-Content -LiteralPath $p -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { return $null }
        }
    }
    return $null
}

function Clear-Previous {
    # Review m2: _previous is the only good copy after a failed rollback -> deleted only if the
    # last run was ok (or changed nothing); otherwise kept as _previous-<timestamp>
    if (-not (Test-Path -LiteralPath $Prev)) { return }
    $last = Read-LastResult
    $safe = $false
    if ($last) {
        # `unchanged` is no proof: the run before it may have left the only good copy here
        if ($last.ok -or $last.rolled_back) { $safe = $true }
    }
    if ($safe) { Remove-Tree $Prev; return }
    $keep = $Prev + '-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
    Write-Log "Letzter Lauf nicht sauber beendet - Sicherung bleibt erhalten: $keep"
    Rename-Entry $Prev $keep
}

function Invoke-Rollback([string[]]$Moved, [string[]]$Placed, [string]$SiteBackup, [string]$ProviderBackup) {
    # Review M4: every name in $Moved was registered BEFORE its rename; whatever lies in
    # _previous\<name> is the old version and replaces the current entry
    foreach ($name in @($Placed + $Moved | Select-Object -Unique)) {
        if (-not $name) { continue }
        $dst = Join-Path $Root $name
        $old = Join-Path $Prev $name
        $probe = $dst + '.hcprobe'
        if (Test-Path -LiteralPath $old) {
            if (Test-Path -LiteralPath $dst) { Invoke-Retry { Remove-Tree $dst } "Entfernen $name" }
            Invoke-Retry { Move-Entry $old $dst } "Zurueckholen $name"
        }
        elseif (($Placed -contains $name) -and -not ($Moved -contains $name)) {
            # new entry of the update (did not exist before)
            if (Test-Path -LiteralPath $dst) { Invoke-Retry { Remove-Tree $dst } "Entfernen $name" }
        }
        if ((-not (Test-Path -LiteralPath $dst)) -and (Test-Path -LiteralPath $probe)) {
            Rename-Entry $probe $dst
        }
    }
    if ($SiteBackup -and (Test-Path -LiteralPath $SiteBackup)) {
        $site = [string]$m.site_packages
        Invoke-Retry { Remove-Tree $site } 'Entfernen site-packages'
        Move-Entry $SiteBackup $site
    }
    if ($ProviderBackup -and (Test-Path -LiteralPath $ProviderBackup)) {
        $provider = Join-Path ([string]$m.bin_dir) 'bgutil-pot-provider'
        Invoke-Retry { Remove-Tree $provider } 'Entfernen Provider'
        Move-Entry $ProviderBackup $provider
    }
}

function Test-UpdaterAlive($Journal) {
    # the updater that wrote the journal still runs (a second start must not interfere)
    $id = 0
    try { $id = [int]$Journal.pid } catch { $id = 0 }
    if ($id -le 0 -or $id -eq $PID) { return $false }
    $p = Get-Process -Id $id -ErrorAction SilentlyContinue
    return [bool]($p -and $p.ProcessName -match 'powershell')
}

function Get-RunMutex {
    # Review m3: the download-run lock of app\core\locks.py (named mutex, Global\ then Local\).
    # Same semantics as Python: the mutex is never owned; it is "taken" while any handle is
    # open (CreateMutex reports an existing name). Returns @{ Mutex; Created } or $null.
    foreach ($name in @($m.run_lock_mutexes)) {
        if (-not $name) { continue }
        try {
            $created = $false
            $mx = New-Object Threading.Mutex($false, [string]$name, [ref]$created)
            return @{ Mutex = $mx; Created = $created }
        }
        catch { Write-Log "  Mutex $name nicht verfuegbar: $($_.Exception.Message)" }
    }
    return $null
}

function Start-App {
    if (-not $m) { return }
    $pyw = [string]$m.pythonw
    if (-not (Test-Path -LiteralPath $pyw)) { Write-Log "Neustart nicht moeglich: $pyw fehlt"; return }
    # Review m8: same interpreter flags as HCLoader.cmd (UTF-8 mode)
    Write-Log "Starte HCLoader neu: $pyw -X utf8 -m app.main"
    Start-Process -FilePath $pyw -ArgumentList @('-X', 'utf8', '-m', 'app.main') -WorkingDirectory $Root | Out-Null
}

$appStopped = $true
$keepLock = $false
$unchanged = $true   # until the first change (journal written): a failure changes nothing
$recovered = $false
$recovering = $false
$moved = New-Object System.Collections.ArrayList     # items renamed to _previous (registered first)
$placed = New-Object System.Collections.ArrayList    # items copied from staging (registered first)
$siteBackup = ''
$providerBackup = ''
$runMutex = $null
$haveMutex = $false
$writeResult = $true
$journal = @{ pid = $PID; moved = @(); placed = @(); site_backup = ''; provider_backup = '' }
$result = @{ ok = $false; from_version = ''; to_version = ''; rolled_back = $false; unchanged = $true; error = '' }

try {
    # Review n7: the manifest is parsed inside try (a broken one still leaves log + result)
    New-Item -ItemType Directory -Path (Split-Path -Parent $LogFile) -Force | Out-Null
    $m = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $Root = [string]$m.app_root
    $Staging = [string]$m.staging
    $Prev = Join-Path $Root '_previous'
    if ($m.log) { $LogFile = [string]$m.log }
    if ($m.result) { $ResultFile = [string]$m.result }
    if ($m.lock) { $LockFile = [string]$m.lock }
    New-Item -ItemType Directory -Path (Split-Path -Parent $LogFile) -Force | Out-Null
    $result['from_version'] = [string]$m.from_version
    $result['to_version'] = [string]$m.to_version
    if ($Recover) { Write-Log '=== Wiederherstellung nach unterbrochenem Update ===' }
    else { Write-Log ('=== Update {0} -> {1} ({2}) ===' -f $m.from_version, $m.to_version, $m.mode) }

    # --- 1. wait for the app ------------------------------------------------------------
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

    # --- 2. an updater that is still alive is never disturbed (second start, -Recover) -------
    if (Test-Path -LiteralPath $JournalFile) {
        $j = Get-Content -LiteralPath $JournalFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if (Test-UpdaterAlive $j) {
            Write-Log 'Ein anderer Updater arbeitet noch - nichts zu tun'
            $keepLock = $true
            $writeResult = $false
            $Restart = $false
            throw 'Updater laeuft bereits'
        }
    }
    elseif ($Recover) {
        # an updater may be just before its first change (no journal yet): leave it alone
        Write-Log 'Kein unterbrochenes Update gefunden'
        $keepLock = $true
        $Restart = $false
        $writeResult = $false
        $result['ok'] = $true
        throw 'nichts zu tun'
    }

    # --- 3. download-run lock: a scheduled headless run finishes first (Review m3) -----------
    # Holding our own handle while files are swapped keeps a scheduled headless run from
    # starting (its CreateMutex sees the name -> "busy").
    $deadline = (Get-Date).AddSeconds($RunLockSeconds)
    $waitLogged = $false
    while ($true) {
        $rm = Get-RunMutex
        if (-not $rm) { break }                       # no mutex possible: nothing to wait for
        if ($rm.Created) { $runMutex = $rm.Mutex; $haveMutex = $true; break }
        $rm.Mutex.Dispose()                           # someone else holds the name
        if ((Get-Date) -gt $deadline) {
            throw 'Ein Download-Lauf ist noch aktiv - Update nicht eingespielt, naechster Versuch beim naechsten Beenden'
        }
        if (-not $waitLogged) {
            Write-Log "Ein Download-Lauf (z.B. geplante Watchlist-Pruefung) ist aktiv - warte bis $RunLockSeconds s ..."
            $waitLogged = $true
        }
        Start-Sleep -Seconds 5
    }

    # --- 4. an interrupted earlier run is repaired first (Review m2) -----------------------
    if (Test-Path -LiteralPath $JournalFile) {
        $j = Get-Content -LiteralPath $JournalFile -Raw -Encoding UTF8 | ConvertFrom-Json
        Write-Log 'Unterbrochenes Update gefunden - stelle die alte Version aus _previous wieder her ...'
        $recovering = $true
        try {
            Invoke-Rollback ([string[]]@($j.moved)) ([string[]]@($j.placed)) ([string]$j.site_backup) ([string]$j.provider_backup)
        }
        catch {
            # the journal stays for the next attempt; never start a half-swapped installation
            $Restart = $false
            throw ('Wiederherstellung fehlgeschlagen: ' + $_.Exception.Message + " - Sicherung liegt in $Prev")
        }
        Remove-Item -LiteralPath $JournalFile -Force
        $recovered = $true
        $result['rolled_back'] = $true
        $result['recovered'] = $true
        Write-Log 'Wiederherstellung abgeschlossen - alte Version wiederhergestellt'
        $unchanged = $true   # the prepared update itself was not applied: it stays ready
        throw 'Ein frueheres Update war unterbrochen und wurde zurueckgesetzt - die alte Version laeuft wieder'
    }

    # --- 5. checks (nothing changed yet) -------------------------------------------------
    if (-not (Test-Path -LiteralPath (Join-Path $Root 'app\__init__.py'))) { throw "App-Ordner ungueltig: $Root" }
    if (Test-Path -LiteralPath (Join-Path $Root '.git')) { throw 'Git-Checkout - bitte git pull und setup.ps1 verwenden' }
    if (-not (Test-Path -LiteralPath (Join-Path $Staging 'app\__init__.py'))) { throw "Staging unvollstaendig: $Staging" }
    $protected = @($m.protected)
    foreach ($i in @($m.items)) {
        $name = [string]$i
        if (-not $name -or $name.Contains('\') -or $name.Contains('/') -or $name.Contains('..') -or $name.Contains(':')) { throw "Ungueltiger Eintrag im Manifest: $name" }
        if ($protected -contains $name) { throw "Geschuetzter Eintrag im Manifest: $name" }
    }
    # Review M4: rename probe of every entry before anything is touched (a probe left over
    # by a crash between the two renames is renamed back first)
    foreach ($i in @($m.items)) {
        $name = [string]$i
        $dst = Join-Path $Root $name
        if ((-not (Test-Path -LiteralPath $dst)) -and (Test-Path -LiteralPath ($dst + '.hcprobe'))) {
            Write-Log "  Probe-Rest zurueckbenannt: $name"
            Rename-Entry ($dst + '.hcprobe') $dst
        }
        if (-not (Test-Path -LiteralPath (Join-Path $Staging $name))) { continue }
        if ((Test-Path -LiteralPath $dst) -and -not (Test-Renamable $dst)) {
            throw "Datei gesperrt ($name, z.B. Virenscanner oder Explorer) - Update nicht eingespielt, naechster Versuch beim naechsten Beenden"
        }
    }
    Clear-Previous
    New-Item -ItemType Directory -Path $Prev -Force | Out-Null

    # --- 6. swap the program files ---------------------------------------------------------
    Save-Journal $journal
    $unchanged = $false
    foreach ($i in @($m.items)) {
        $name = [string]$i
        $src = Join-Path $Staging $name
        $dst = Join-Path $Root $name
        if (-not (Test-Path -LiteralPath $src)) { continue }
        if (Test-Path -LiteralPath $dst) {
            # registered BEFORE the rename: the rollback always knows about it (Review M4)
            [void]$moved.Add($name)
            $journal['moved'] = @($moved)
            Save-Journal $journal
            Rename-Entry $dst (Join-Path $Prev $name)
        }
        [void]$placed.Add($name)
        $journal['placed'] = @($placed)
        Save-Journal $journal
        Copy-Entry $src $dst
        Write-Log "  ersetzt: $name"
    }

    # --- 7. Python packages (only if requirements.txt changed) ----------------------------
    if ($m.requirements_changed) {
        $site = [string]$m.site_packages
        if ($site -and (Test-Path -LiteralPath $site)) {
            Write-Log "Sichere site-packages ($site) ..."
            $backup = Join-Path $Prev 'site-packages'
            Copy-Tree $site $backup
            $siteBackup = $backup   # only a complete copy may be restored
            $journal['site_backup'] = $siteBackup
            Save-Journal $journal
        }
        Invoke-Logged ([string]$m.python) ([string[]]@($m.pip_args)) 'pip install -r requirements.txt'
    }

    # --- 8. binaries (only if the fetch script or the packages changed) ---------------------
    if ($m.binaries_changed) {
        $provider = Join-Path ([string]$m.bin_dir) 'bgutil-pot-provider'
        if (Test-Path -LiteralPath $provider) {
            $backup = Join-Path $Prev 'bgutil-pot-provider'
            Copy-Tree $provider $backup
            $providerBackup = $backup
            $journal['provider_backup'] = $providerBackup
            Save-Journal $journal
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
    $result['unchanged'] = $false
    Remove-Item -LiteralPath $JournalFile -Force -ErrorAction SilentlyContinue
    Write-Log ('Update erfolgreich: {0}' -f $m.to_version)
}
catch {
    $err = $_.Exception.Message
    if (-not $result['ok']) {
        $result['error'] = $err
        $result['unchanged'] = $unchanged
        if ($writeResult) { Write-Log "FEHLER: $err" }
        if ($unchanged -and -not $recovering -and $writeResult) { Write-Log 'Nichts geaendert - die installierte Version bleibt' }
    }
    if ($appStopped -and -not $unchanged -and $m) {
        Write-Log 'Rollback ...'
        try {
            Invoke-Rollback ([string[]]@($moved)) ([string[]]@($placed)) $siteBackup $providerBackup
            Remove-Item -LiteralPath $JournalFile -Force -ErrorAction SilentlyContinue
            $result['rolled_back'] = $true
            Write-Log 'Rollback abgeschlossen - alte Version wiederhergestellt'
        }
        catch {
            # the journal stays: the next start (HCLoader.cmd / app.main) tries again
            $result['rolled_back'] = $false
            $result['error'] = $err + ' / Rollback fehlgeschlagen: ' + $_.Exception.Message
            $Restart = $false   # never start a half-swapped installation
            Write-Log ('Rollback FEHLGESCHLAGEN: ' + $_.Exception.Message + " - Sicherung liegt in $Prev, naechster Start versucht es erneut")
        }
    }
}
finally {
    if ($runMutex) { try { $runMutex.Dispose() } catch { } }   # never owned: closing frees the name
    if ($writeResult) {
        try { Write-Result $result } catch { Write-Log ('result.json nicht schreibbar: ' + $_.Exception.Message) }
    }
    if (-not $keepLock -and (Test-Path -LiteralPath $LockFile)) { Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue }
}

if ($Restart -and $appStopped -and $m) { Start-App }
if ($result['ok']) { exit 0 }
exit 1
