@echo off
rem HCLoader starten - ohne bleibendes Konsolenfenster, alle Pfade relativ zu diesem Ordner.
rem Die App laesst sich deshalb samt Ordner beliebig verschieben (USB-Stick, anderes Laufwerk).
rem Fuer die Fehlersuche mit sichtbarer Ausgabe: HCLoader-Konsole.cmd
if not exist "%~dp0python\pythonw.exe" (
  echo Python fehlt: "%~dp0python\pythonw.exe" - ZIP vollstaendig entpacken.
  pause
  exit /b 1
)
cd /d "%~dp0"
rem Unterbrochenes App-Update (Journal des Updaters): erst die alte Version aus _previous
rem wiederherstellen; das Skript startet HCLoader danach selbst neu.
if exist "%~dp0data\update\in_progress.json" if exist "%~dp0data\update\apply_update.ps1" (
  start "" powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0data\update\apply_update.ps1" -Manifest "%~dp0data\update\manifest.json" -Recover -Restart
  exit /b 0
)
start "" "%~dp0python\pythonw.exe" -X utf8 -m app.main %*
exit /b 0
