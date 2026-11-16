<#
.SYNOPSIS
  Baut die Portable-Version von HCLoader (PowerShell 5.1): dist\HCLoader\ und optional das ZIP.
.DESCRIPTION
  Ergebnis: ein Ordner, der ohne installiertes Python und ohne git laeuft und sich verschieben
  laesst (USB-Stick, anderes Laufwerk):
    HCLoader\
      python\                 Windows-embeddable-Python (amd64) + pip + Pakete aus requirements.txt
      app\ ui\ scripts\run_watchlist.pyw
      bin\                    deno.exe, ffmpeg.exe, ffprobe.exe, bgutil-pot-provider\ (via fetch_binaries.ps1)
      licenses\ THIRD_PARTY_LICENSES.txt
      HCLoader.vbs  HCLoader-Konsole.cmd  Verknuepfung-erstellen.cmd  portable.txt
  Benutzerdaten landen beim ersten Start in HCLoader\data\ (portable.txt, docs/decisions.md).
  Braucht Internet (python.org, bootstrap.pypa.io, PyPI, GitHub, gyan.dev). Kein Admin noetig.
.PARAMETER PythonVersion
  '3.12' (Default) = neueste 3.12.x, fuer die python.org ein embeddable-Paket anbietet.
  Security-Releases (3.12.11 ff.) haben keine Windows-Binaries und werden uebersprungen.
  Oder exakt, z.B. '3.12.10'.
.PARAMETER PythonSha256
  Optional: erwartete SHA256 des embeddable-ZIPs (python.org veroeffentlicht Sigstore-Signaturen,
  aber keine .sha256-Datei). Ohne Angabe wird die berechnete Pruefsumme nur ausgegeben.
.PARAMETER OutDir
  Ausgabeordner (Default: <Repo>\dist). Der Build liegt in <OutDir>\HCLoader.
.PARAMETER Zip
  Zusaetzlich <OutDir>\HCLoader-portable-<version>-win64.zip erzeugen.
.PARAMETER Force
  Einen vorhandenen Build auch dann loeschen, wenn darin schon Benutzerdaten (data\) liegen.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build_portable.ps1 -Zip
#>
[CmdletBinding()]
param(
    [string]$PythonVersion = '3.12',
    [string]$PythonSha256 = '',
    [string]$OutDir = '',
    [switch]$Zip,
    [switch]$Force
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
if (-not $OutDir) { $OutDir = Join-Path $RepoRoot 'dist' }
$Dist = Join-Path $OutDir 'HCLoader'
$PyDir = Join-Path $Dist 'python'
$Py = Join-Path $PyDir 'python.exe'
$BinDir = Join-Path $Dist 'bin'
$LicDir = Join-Path $Dist 'licenses'
$Templates = Join-Path $PSScriptRoot 'portable'
$PyFtp = 'https://www.python.org/ftp/python'
$GetPipUrl = 'https://bootstrap.pypa.io/get-pip.py'

function Write-Step([string]$Text) { Write-Host "==> $Text" -ForegroundColor Cyan }

function Remove-Tree([string]$Path) {
    # Remove-Item fails on paths > 260 characters (deep node_modules). rmdir with the
    # extended-length prefix \\?\ has no such limit.
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $full = [IO.Path]::GetFullPath($Path)
    if (-not $full.StartsWith('\\')) { $full = '\\?\' + $full }
    cmd.exe /d /c "rmdir /s /q `"$full`"" | Out-Null
    if (Test-Path -LiteralPath $Path) { throw "Ordner konnte nicht entfernt werden: $Path" }
}

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

function Invoke-Native {
    # Runs a native program; output goes to the console. PS 5.1: with ErrorActionPreference=Stop
    # stderr lines of native programs can turn into terminating errors, so 'Continue' while it
    # runs and only the exit code decides.
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory = $true)][string]$What
    )
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
    $path = Join-Path ([IO.Path]::GetTempPath()) ('hcloader_portable_' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $path | Out-Null
    return $path
}

function Test-Url([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing
        return ($r.StatusCode -eq 200)
    }
    catch { return $false }
}

function Resolve-PythonVersion([string]$Spec) {
    if ($Spec -match '^\d+\.\d+\.\d+$') { return $Spec }
    if ($Spec -notmatch '^\d+\.\d+$') { throw "PythonVersion '$Spec': erwartet z.B. 3.12 oder 3.12.10" }
    $html = [string](Invoke-WebRequest -Uri "$PyFtp/" -UseBasicParsing).Content
    $pattern = 'href="(' + [regex]::Escape($Spec) + '\.\d+)/"'
    $found = @([regex]::Matches($html, $pattern) | ForEach-Object { $_.Groups[1].Value })
    $versions = @($found | Sort-Object -Property { [version]$_ } -Descending -Unique)
    foreach ($v in $versions) {
        if (Test-Url "$PyFtp/$v/python-$v-embed-amd64.zip") { return $v }
        Write-Host "    ${v}: kein embeddable-Paket (Security-Release ohne Windows-Binaries)" -ForegroundColor DarkGray
    }
    throw "Kein Windows-embeddable-Paket fuer Python $Spec.x auf python.org gefunden"
}

function Copy-TextFile([string]$Source, [string]$Destination) {
    # Starter/Marker always with CRLF and ASCII, whatever git did with the line endings
    $text = [IO.File]::ReadAllText($Source)
    $text = ($text -replace "`r`n", "`n") -replace "`n", "`r`n"
    [IO.File]::WriteAllText($Destination, $text, [Text.Encoding]::ASCII)
}

# --- Version / Ausgabeordner ------------------------------------------------
$verLine = Select-String -Path (Join-Path $RepoRoot 'pyproject.toml') -Pattern '^version\s*=\s*"([^"]+)"' |
    Select-Object -First 1
if (-not $verLine) { throw 'Version in pyproject.toml nicht gefunden' }
$AppVersion = $verLine.Matches[0].Groups[1].Value
Write-Step "HCLoader $AppVersion - Portable-Build nach $Dist"

if (Test-Path $Dist) {
    if ((Test-Path (Join-Path $Dist 'data')) -and -not $Force) {
        throw "$Dist\data existiert (Benutzerdaten eines Testlaufs?). Sichern oder mit -Force neu bauen."
    }
    Write-Step 'Entferne alten Build ...'
    Remove-Tree $Dist
}
New-Item -ItemType Directory -Path $Dist -Force | Out-Null

$tmp = New-TempDir
try {
    # --- Python (embeddable) ------------------------------------------------
    $PyVer = Resolve-PythonVersion $PythonVersion
    $embedUrl = "$PyFtp/$PyVer/python-$PyVer-embed-amd64.zip"
    Write-Step "Lade Python $PyVer (embeddable, amd64) ..."
    $embedZip = Join-Path $tmp 'python-embed.zip'
    Invoke-WebRequest -Uri $embedUrl -OutFile $embedZip -UseBasicParsing
    $hash = (Get-FileHash -Path $embedZip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($PythonSha256) {
        if ($hash -ne $PythonSha256.Trim().ToLowerInvariant()) {
            throw "SHA256 von $embedUrl stimmt nicht: erwartet $PythonSha256, erhalten $hash"
        }
        Write-Host '    SHA256 geprueft' -ForegroundColor DarkGray
    }
    else {
        Write-Host "    SHA256 $hash (nicht verifiziert - mit -PythonSha256 pruefbar)" -ForegroundColor Yellow
    }
    Expand-ZipFile -Path $embedZip -Destination $PyDir
    if (-not (Test-Path $Py)) { throw "python.exe fehlt nach dem Entpacken ($PyDir)" }

    # ._pth: replaces sys.path completely and implies isolated mode (no PYTHON* variables,
    # no user site, script folder not on sys.path). '..' = app folder -> 'python -m app.main'.
    $pth = Get-ChildItem -Path $PyDir -Filter 'python3*._pth' | Select-Object -First 1
    if (-not $pth) { throw "python3xx._pth nicht gefunden ($PyDir)" }
    $stem = [IO.Path]::GetFileNameWithoutExtension($pth.Name)
    $pthLines = @(
        "$stem.zip",
        '.',
        'Lib\site-packages',
        '..',
        '',
        '# HCLoader portable: ".." = App-Ordner (python -m app.main), site fuer pip-Pakete',
        'import site'
    )
    Set-Content -Path $pth.FullName -Value $pthLines -Encoding ASCII
    New-Item -ItemType Directory -Path (Join-Path $PyDir 'Lib\site-packages') -Force | Out-Null

    # --- pip + Abhaengigkeiten ------------------------------------------------
    Write-Step 'Installiere pip (get-pip.py) ...'
    $getPip = Join-Path $tmp 'get-pip.py'
    Invoke-WebRequest -Uri $GetPipUrl -OutFile $getPip -UseBasicParsing
    Invoke-Native -Exe $Py -Arguments @($getPip, '--no-warn-script-location') -What 'get-pip.py'

    $pipBase = @('-m', 'pip', 'install', '--no-warn-script-location', '--disable-pip-version-check')
    # pip's default build isolation passes its build tools via PYTHONPATH, which the ._pth
    # mode ignores -> sdists (proxy_tools, a pywebview dependency) would not build. So
    # setuptools/wheel go into the embedded Python and sdists build without isolation.
    Write-Step 'Installiere setuptools/wheel ...'
    Invoke-Native -Exe $Py -Arguments ($pipBase + @('--upgrade', 'setuptools', 'wheel')) -What 'setuptools'
    Write-Step 'Installiere Abhaengigkeiten (requirements.txt) ...'
    $req = Join-Path $RepoRoot 'requirements.txt'
    Invoke-Native -Exe $Py -Arguments ($pipBase + @('--prefer-binary', '--no-build-isolation', '-r', $req)) -What 'pip install'
    Invoke-Native -Exe $Py -Arguments @('-c', 'import webview, yt_dlp, mutagen, pydantic, ruamel.yaml, clr_loader, pythonnet') -What 'Import-Test'

    # --- App-Code ---------------------------------------------------------
    Write-Step 'Kopiere App-Code ...'
    foreach ($dir in @('app', 'ui')) {
        Copy-Item -Path (Join-Path $RepoRoot $dir) -Destination (Join-Path $Dist $dir) -Recurse -Force
    }
    Get-ChildItem -Path (Join-Path $Dist 'app') -Directory -Recurse -Filter '__pycache__' |
        Remove-Item -Recurse -Force
    $scriptsOut = Join-Path $Dist 'scripts'
    New-Item -ItemType Directory -Path $scriptsOut -Force | Out-Null
    Copy-Item -Path (Join-Path $PSScriptRoot 'run_watchlist.pyw') -Destination $scriptsOut -Force
    foreach ($f in @('config.example.yaml', 'README.md', 'CHANGELOG.md', 'pyproject.toml', 'requirements.txt')) {
        Copy-Item -Path (Join-Path $RepoRoot $f) -Destination (Join-Path $Dist $f) -Force
    }
    foreach ($f in @('HCLoader.vbs', 'HCLoader-Konsole.cmd', 'Verknuepfung-erstellen.cmd', 'portable.txt')) {
        Copy-TextFile (Join-Path $Templates $f) (Join-Path $Dist $f)
    }

    # --- Binaries (deno, ffmpeg, bgutil-Provider) ---------------------------
    Write-Step 'Hole Binaries (fetch_binaries.ps1) ...'
    & (Join-Path $PSScriptRoot 'fetch_binaries.ps1') -BinDir $BinDir -Python $Py -LicenseDir (Join-Path $LicDir 'ffmpeg')
    $providerGit = Join-Path $BinDir 'bgutil-pot-provider\.git'
    if (Test-Path $providerGit) { Remove-Item -Path $providerGit -Recurse -Force }
    # deno links npm packages with symlinks/junctions holding absolute paths -> real copies
    Write-Step 'Loese Links in node_modules auf (verschiebbar machen) ...'
    Invoke-Native -Exe $Py -Arguments @((Join-Path $PSScriptRoot 'materialize_links.py'), $BinDir) -What 'Links aufloesen'

    # --- Lizenzen -------------------------------------------------------------
    Write-Step 'Lege Lizenztexte bei ...'
    foreach ($sub in @('python', 'deno', 'bgutil-ytdlp-pot-provider', 'fonts', 'ffmpeg')) {
        New-Item -ItemType Directory -Path (Join-Path $LicDir $sub) -Force | Out-Null
    }
    $pyLicense = Join-Path $PyDir 'LICENSE.txt'
    if (Test-Path $pyLicense) {
        Copy-Item -Path $pyLicense -Destination (Join-Path $LicDir 'python\LICENSE.txt') -Force
    }
    else {
        Write-Host '    WARNUNG: LICENSE.txt fehlt im embeddable-Paket - lade von python.org' -ForegroundColor Yellow
        $short = ($PyVer -split '\.')[0..1] -join '.'
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/python/cpython/$short/LICENSE" -OutFile (Join-Path $LicDir 'python\LICENSE.txt') -UseBasicParsing
    }
    $denoVer = ''
    $denoOut = & (Join-Path $BinDir 'deno.exe') --version | Select-Object -First 1
    if ($denoOut -match '^deno\s+(\S+)') { $denoVer = $Matches[1] }
    $denoLicense = Join-Path $LicDir 'deno\LICENSE.md'
    $denoRef = 'main'
    if ($denoVer) { $denoRef = "v$denoVer" }
    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/denoland/deno/$denoRef/LICENSE.md" -OutFile $denoLicense -UseBasicParsing
    }
    catch {
        Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/denoland/deno/main/LICENSE.md' -OutFile $denoLicense -UseBasicParsing
    }
    $bgLicense = Join-Path $BinDir 'bgutil-pot-provider\LICENSE'
    if (Test-Path $bgLicense) {
        Copy-Item -Path $bgLicense -Destination (Join-Path $LicDir 'bgutil-ytdlp-pot-provider\LICENSE') -Force
    }
    else { Write-Host '    WARNUNG: LICENSE des bgutil-Providers fehlt' -ForegroundColor Yellow }
    Copy-Item -Path (Join-Path $RepoRoot 'ui\fonts\OFL-*.txt') -Destination (Join-Path $LicDir 'fonts') -Force
    $ffInfo = & (Join-Path $BinDir 'ffmpeg.exe') -hide_banner -version | Out-String
    Set-Content -Path (Join-Path $LicDir 'ffmpeg\BUILDINFO.txt') -Value $ffInfo -Encoding UTF8
    if (-not (Get-ChildItem -Path (Join-Path $LicDir 'ffmpeg') -Filter 'LICENSE*')) {
        Write-Host '    WARNUNG: LICENSE von ffmpeg nicht im Archiv gefunden' -ForegroundColor Yellow
    }
    Invoke-Native -Exe $Py -Arguments @(
        (Join-Path $PSScriptRoot 'collect_licenses.py'),
        (Join-Path $PyDir 'Lib\site-packages'),
        $LicDir,
        (Join-Path $Templates 'THIRD_PARTY_LICENSES.header.txt'),
        (Join-Path $Dist 'THIRD_PARTY_LICENSES.txt')
    ) -What 'Lizenzen sammeln'

    # --- Build-Info, Pfadlaengen ------------------------------------------------
    $commit = ''
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $old = $ErrorActionPreference
        try {
            $ErrorActionPreference = 'Continue'
            $commit = [string](& git -C $RepoRoot rev-parse --short HEAD 2>$null)
        }
        catch { $commit = '' }
        finally { $ErrorActionPreference = $old }
    }
    $buildInfo = @(
        "HCLoader $AppVersion (Portable, win64)",
        "Python $PyVer embeddable amd64 (SHA256 $hash)",
        "Deno $denoVer",
        "Commit $commit",
        ('Gebaut ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
    )
    Set-Content -Path (Join-Path $Dist 'BUILD.txt') -Value $buildInfo -Encoding ASCII

    # Explorer cannot extract paths longer than 260 characters. Show the longest relative path:
    # the folder the user unpacks to must leave room for it.
    $tools = Join-Path $PSScriptRoot 'portable_tools.py'
    $rel = [int](& $Py $tools 'longest' $Dist)
    $color = 'DarkGray'
    if ($rel -gt 180) { $color = 'Yellow' }
    Write-Host "    Laengster Pfad im Build: $rel Zeichen ab HCLoader\" -ForegroundColor $color
}
finally {
    Remove-Item -Path $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

# --- ZIP -----------------------------------------------------------------
if ($Zip) {
    $zipPath = Join-Path $OutDir "HCLoader-portable-$AppVersion-win64.zip"
    if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }
    Write-Step "Erzeuge $zipPath ..."
    # Python zipfile instead of .NET ZipFile/Compress-Archive: long paths (> 260), dot files,
    # '/' as separator, 'HCLoader/' as top folder.
    Invoke-Native -Exe $Py -Arguments @((Join-Path $PSScriptRoot 'portable_tools.py'), 'zip', $Dist, $zipPath) -What 'ZIP erzeugen'
    $sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Host "    $sizeMb MB" -ForegroundColor DarkGray
    if ($env:GITHUB_OUTPUT) {
        Add-Content -Path $env:GITHUB_OUTPUT -Value "zip=$zipPath" -Encoding ASCII
        Add-Content -Path $env:GITHUB_OUTPUT -Value "version=$AppVersion" -Encoding ASCII
    }
}

Write-Step "Fertig: $Dist (Start: HCLoader.vbs)"
