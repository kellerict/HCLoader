@echo off
rem HCLoader mit sichtbarer Konsole starten (Fehlersuche). Die Ausgabe bleibt am Ende stehen.
rem Weitere Argumente werden durchgereicht, z.B.:  HCLoader-Konsole.cmd --headless --run-watchlist
setlocal
cd /d "%~dp0"
if not exist "%~dp0python\python.exe" (
  echo Python fehlt: "%~dp0python\python.exe" - ZIP vollstaendig entpacken.
  pause
  exit /b 1
)
chcp 65001 >nul
rem -X utf8: PYTHON*-Variablen wirken im eingebetteten Python nicht (._pth = isolierter Modus)
"%~dp0python\python.exe" -X utf8 -m app.main %*
set "RC=%ERRORLEVEL%"
echo.
echo HCLoader beendet (Exitcode %RC%). Protokolle: "%~dp0data\logs"
echo Taste druecken zum Schliessen ...
pause >nul
exit /b %RC%
