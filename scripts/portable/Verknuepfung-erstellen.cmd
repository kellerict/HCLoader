@echo off
rem Legt auf dem Desktop die Verknuepfung "HCLoader (Portable)" auf den AKTUELLEN Ort an.
rem Nach dem Verschieben des Ordners erneut ausfuehren (die alte Verknuepfung wird ersetzt).
setlocal
set "HCL_ROOT=%~dp0"
if "%HCL_ROOT:~-1%"=="\" set "HCL_ROOT=%HCL_ROOT:~0,-1%"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $r=$env:HCL_ROOT; $d=[Environment]::GetFolderPath('Desktop'); $l=Join-Path $d 'HCLoader (Portable).lnk'; $s=(New-Object -ComObject WScript.Shell).CreateShortcut($l); $s.TargetPath=(Join-Path $r 'python\pythonw.exe'); $s.Arguments='-m app.main'; $s.WorkingDirectory=$r; $s.IconLocation=(Join-Path $r 'ui\img\hcloader.ico'); $s.Description='HCLoader (Portable)'; $s.Save(); Write-Host ('Verknuepfung angelegt: ' + $l)"
if errorlevel 1 (
  echo Verknuepfung konnte nicht angelegt werden.
  pause
  exit /b 1
)
pause
