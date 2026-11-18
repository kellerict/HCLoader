# Helpers for the installer smoke (portable.yml, job installer-smoke). Dot-sourced by every step:
#   . (Join-Path $env:GITHUB_WORKSPACE '.github\scripts\installer_smoke.ps1')
# CI only, never shipped (build_portable.ps1 copies scripts\ by an explicit list). ASCII only
# (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#
# Rules (docs/decisions.md "Installer-Smoke ohne Haenger" and "Installer-Smoke als eigener Job"):
# - every external process runs bounded (Invoke-Bounded): no Start-Process -Wait (PS 5.1 waits for
#   the whole process tree) and no bare call of an executable;
# - the cwd is never inside the install folder, children get an empty file as stdin (no inherited
#   runner pipe), and after each call every process left in the install folder is killed by path;
# - setup and uninstaller run with /NOCLOSEAPPLICATIONS /NORESTART: the Restart Manager must never
#   touch runner processes, and nothing may trigger a reboot.

$ErrorActionPreference = 'Continue'
# outside the runner's work and temp folders: no runner file is ever inside {app}
$Dir = Join-Path $env:SystemDrive 'hcl-smoke\HCLoader'
$Tmp = Join-Path $env:RUNNER_TEMP 'hcl-smoke-f'
$Artifacts = Join-Path $env:RUNNER_TEMP 'hcl-artifacts'
$Py = Join-Path $Dir 'python\python.exe'
$TaskName = 'HCLoader-Watchlist'   # app/core/scheduler.py TASK_NAME
$Lnk = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\HCLoader.lnk'
$Data = Join-Path $env:APPDATA 'HCLoader'
$Preset = Join-Path $Dir 'installer-defaults.json'
New-Item -ItemType Directory -Path $Tmp -Force | Out-Null
$StdIn = Join-Path $Tmp 'stdin-empty.txt'
if (-not (Test-Path $StdIn)) { New-Item -ItemType File -Path $StdIn -Force | Out-Null }
Set-Location $env:RUNNER_TEMP
Remove-Item Env:HCLOADER_HOME -ErrorAction SilentlyContinue   # app_home must resolve itself

function Write-Mark([string]$Text) {
  Write-Host ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $Text)
}

function Find-Artifact([string]$Filter) {
  $f = Get-ChildItem -Path $Artifacts -Recurse -Filter $Filter -File -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $f) { throw "Artefakt fehlt: $Filter in $Artifacts" }
  return $f.FullName
}

function Show-Tail([string]$Path, [int]$Lines = 40) {
  if ($Path -and (Test-Path $Path)) {
    Write-Host "----- $Path (last $Lines lines) -----"
    try { Get-Content -Path $Path -Tail $Lines -ErrorAction Stop | ForEach-Object { Write-Host "    $_" } }
    catch { Write-Host "    (not readable: $_)" }
  }
}

function Show-Diag([string[]]$Logs = @()) {
  Write-Host '----- processes (unins|_iu|setup|python|deno|HCLoader|powershell) -----'
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'unins|_iu|setup|python|deno|hcloader|powershell|is-' } |
    ForEach-Object { Write-Host ("    {0,6}  {1,-28} {2}" -f $_.Id, $_.Name, $_.Path) }
  try {
    Get-CimInstance -ClassName Win32_Process -OperationTimeoutSec 15 -ErrorAction Stop |
      Where-Object { $_.Name -match 'unins|_iu|setup|python|deno|hcloader|powershell|is-' } |
      ForEach-Object { Write-Host ("    {0,6} <- {1,6}  {2}" -f $_.ProcessId, $_.ParentProcessId, $_.CommandLine) }
  }
  catch { Write-Host "    (no command lines: $_)" }
  $recent = @(Get-ChildItem -Path $Tmp -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 0 -and $_.Extension -ne '.py' } |
      Sort-Object LastWriteTime | Select-Object -Last 6 | ForEach-Object { $_.FullName })
  foreach ($l in @($Logs) + $recent) { Show-Tail $l 60 }
}

function Stop-Tree([int]$Id) {
  $k = Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', "$Id", '/T', '/F') -NoNewWindow -PassThru -RedirectStandardInput $StdIn
  if (-not $k.WaitForExit(30000)) { Write-Host "    taskkill /PID $Id still running after 30 s" }
}

# processes whose executable lies in the install folder (GUI, headless run, deno, uninstaller)
function Get-AppProcesses {
  $d = $Dir.TrimEnd('\').ToLowerInvariant() + '\'
  @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.ToLowerInvariant().StartsWith($d) })
}

# waits up to Seconds for processes in the install folder to end, then kills them (warning)
function Stop-AppProcesses([string]$Why, [int]$Seconds = 15) {
  $deadline = (Get-Date).AddSeconds($Seconds)
  while (((Get-AppProcesses).Count -gt 0) -and ((Get-Date) -lt $deadline)) { Start-Sleep -Milliseconds 500 }
  $left = Get-AppProcesses
  foreach ($p in $left) {
    Write-Host ("::warning::{0}: process left in the install folder, killed: {1} {2} {3}" -f $Why, $p.Id, $p.Name, $p.Path)
    Stop-Tree $p.Id
  }
}

# starts File with ArgList (quote paths yourself), waits at most Seconds, returns the exit code
function Invoke-Bounded([string]$What, [string]$File, [string[]]$ArgList, [int]$Seconds, [string[]]$Logs = @()) {
  $n = [guid]::NewGuid().ToString('N').Substring(0, 8)
  $out = Join-Path $Tmp "out-$n.txt"
  $err = Join-Path $Tmp "err-$n.txt"
  Write-Mark "> $What (max $Seconds s)"
  $p = Start-Process -FilePath $File -ArgumentList $ArgList -WorkingDirectory $env:RUNNER_TEMP -NoNewWindow -PassThru `
    -RedirectStandardInput $StdIn -RedirectStandardOutput $out -RedirectStandardError $err
  $null = $p.Handle   # PS 5.1: keeps ExitCode readable after the exit
  if (-not $p.WaitForExit($Seconds * 1000)) {
    Write-Host "::error::$What still running after $Seconds s"
    Show-Diag (@($out, $err) + $Logs)
    Stop-Tree $p.Id
    Stop-AppProcesses $What 0
    throw "$($What): timeout after $Seconds s (process tree killed)"
  }
  $p.WaitForExit()
  foreach ($f in @($out, $err)) { if ((Test-Path $f) -and (Get-Item $f).Length -gt 0) { Get-Content -Path $f | ForEach-Object { Write-Host "    $_" } } }
  Stop-AppProcesses $What
  Write-Mark "< $($What): exit code $($p.ExitCode)"
  return $p.ExitCode
}

function Invoke-Py([string]$What, [string]$Code, [string[]]$Extra = @(), [int]$Seconds = 180) {
  $f = Join-Path $Tmp ("py-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + ".py")
  Set-Content -Path $f -Value $Code -Encoding ASCII
  $rc = Invoke-Bounded $What $Py (@('-X', 'utf8', "`"$f`"") + $Extra) $Seconds
  if ($rc -ne 0) { Show-Diag; throw "$($What): exit code $rc" }
}

function Invoke-Setup([string]$Log, [string[]]$Extra = @()) {
  $exe = Find-Artifact 'HCLoader-Setup-*.exe'
  Stop-AppProcesses 'before setup' 0
  $rc = Invoke-Bounded 'Setup' $exe (@('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/NOCLOSEAPPLICATIONS', '/CURRENTUSER', "/DIR=`"$Dir`"", "/LOG=`"$Log`"") + $Extra) 300 @($Log)
  Show-Tail $Log 25
  if ($rc -ne 0) { Show-Diag @($Log); throw "Setup fehlgeschlagen (Exitcode $rc)" }
}

# runs Body as one smoke phase: log group with timestamps, every error -> ::error:: + exit 1
function Invoke-SmokeStep([string]$Name, [scriptblock]$Body) {
  Write-Host "::group::$Name"
  Write-Mark "start: $Name (install folder $Dir)"
  $ok = $true
  try { . $Body }
  catch { $ok = $false; $msg = "$_" }
  Write-Mark "end: $Name"
  Write-Host '::endgroup::'
  if (-not $ok) {
    Write-Host "::error::Smoke (f) $($Name): $msg"
    exit 1
  }
  Write-Mark "ok: $Name"
  exit 0
}
