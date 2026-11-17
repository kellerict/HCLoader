; HCLoader - per-user Windows installer (Inno Setup 6).
;
; Packs the portable build (scripts\build_portable.ps1 -> dist\HCLoader) without portable.txt and
; without data\, so the installed copy keeps its user data in %APPDATA%\HCLoader
; (app\core\config.py app_home). Built and smoke-tested by .github\workflows\portable.yml,
; see docs\RELEASING.md and docs\decisions.md "Installer (Inno Setup)".
;
;   ISCC.exe /DAppVersion=0.1.0 /DSourceDir=C:\...\HCLoader /DOutputDir=C:\...\out
;            /DMaxRelPath=180 installer\HCLoader.iss
;
;   AppVersion   required, = app\__init__.py __version__
;   SourceDir    the built app folder (default ..\dist\HCLoader)
;   OutputDir    where HCLoader-Setup-<AppVersion>.exe goes (default ..\dist\installer)
;   MaxRelPath   longest relative path in SourceDir (scripts\portable_tools.py longest); the
;                installer refuses target folders where folder + 1 + MaxRelPath > 259 (MAX_PATH)
;
; Keep this file ASCII (ISCC reads files without BOM as ANSI).

#ifndef AppVersion
  #error Define AppVersion: ISCC /DAppVersion=x.y.z installer\HCLoader.iss
#endif
#ifndef AppVersionNumeric
  #define AppVersionNumeric AppVersion
#endif
#ifndef SourceDir
  #define SourceDir "..\dist\HCLoader"
#endif
#ifndef OutputDir
  #define OutputDir "..\dist\installer"
#endif
#ifndef MaxRelPath
  #define MaxRelPath "0"
#endif

#define AppName "HCLoader"
; = app\main.py APP_USER_MODEL_ID (taskbar grouping, own icon)
#define AppUserModelID "HCLoader.App"
; = app\core\scheduler.py TASK_NAME
#define TaskName "HCLoader-Watchlist"
#define AppRepoUrl "https://github.com/kellerict/HCLoader"

[Setup]
; fixed forever: identifies the installation for upgrades and the uninstaller
AppId={{363DD978-CFF7-4D2A-B9B1-F9D6073903A4}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppName}
AppPublisherURL={#AppRepoUrl}
AppSupportURL={#AppRepoUrl}/issues
AppUpdatesURL={#AppRepoUrl}/releases
VersionInfoVersion={#AppVersionNumeric}
VersionInfoProductName={#AppName}
VersionInfoDescription={#AppName} Setup
; per user, no admin rights, no UAC prompt
PrivilegesRequired=lowest
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
DirExistsWarning=no
UsedUserAreasWarning=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputDir={#OutputDir}
OutputBaseFilename=HCLoader-Setup-{#AppVersion}
SetupIconFile=..\ui\img\hcloader.ico
UninstallDisplayIcon={app}\ui\img\hcloader.ico
UninstallDisplayName={#AppName}
WizardStyle=modern
Compression=lzma2/max
SolidCompression=yes
; upgrade over a running copy: the Restart Manager closes HCLoader (python\pythonw.exe and its DLLs)
CloseApplications=yes
CloseApplicationsFilter=*.exe,*.dll,*.pyd
RestartApplications=no
SetupLogging=yes

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"

[CustomMessages]
en.PathTooLong=The folder%n%n%1%n%nis too long: some files of HCLoader would exceed the Windows path limit of 260 characters. Please choose a folder with at most %2 characters, e.g. the default folder.
de.PathTooLong=Der Ordner%n%n%1%n%nist zu lang: einige Dateien von HCLoader wuerden die Windows-Pfadgrenze von 260 Zeichen ueberschreiten. Bitte einen Ordner mit hoechstens %2 Zeichen waehlen, z.B. den vorgeschlagenen.
en.PortableDir=The folder%n%n%1%n%ncontains a portable copy of HCLoader (portable.txt or data). Install into another folder; the portable copy and its data stay as they are.
de.PortableDir=Der Ordner%n%n%1%n%nenthaelt eine Portable-Version von HCLoader (portable.txt oder data). Bitte in einen anderen Ordner installieren; die Portable-Version und ihre Daten bleiben unveraendert.
en.DirNotEmpty=The folder%n%n%1%n%nis not empty and does not contain an earlier HCLoader installation. Please choose an empty or new folder (the uninstaller removes the whole folder).
de.DirNotEmpty=Der Ordner%n%n%1%n%nist nicht leer und enthaelt keine fruehere HCLoader-Installation. Bitte einen leeren oder neuen Ordner waehlen (die Deinstallation entfernt den ganzen Ordner).
en.AppComment=Find, filter and save hardstyle, hardcore and uptempo mixes
de.AppComment=Hardstyle-, Hardcore- und Uptempo-Mixes finden, filtern und speichern

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[InstallDelete]
; upgrade: replace the program folders completely (no stale modules or packages of the old
; version); also old update backups of the self-update. User data is not in {app}.
Type: filesandordirs; Name: "{app}\python"
Type: filesandordirs; Name: "{app}\app"
Type: filesandordirs; Name: "{app}\ui"
Type: filesandordirs; Name: "{app}\scripts"
Type: filesandordirs; Name: "{app}\bin"
Type: filesandordirs; Name: "{app}\licenses"
Type: filesandordirs; Name: "{app}\_previous"
Type: filesandordirs; Name: "{app}\_previous-*"

[Files]
; the portable build minus the portable marker and any user data of a test run
Source: "{#SourceDir}\*"; DestDir: "{app}"; Excludes: "\portable.txt,\data,\data\*,__pycache__,*.pyc"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#AppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: "-X utf8 -m app.main"; WorkingDir: "{app}"; IconFilename: "{app}\ui\img\hcloader.ico"; Comment: "{cm:AppComment}"; AppUserModelID: "{#AppUserModelID}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\python\pythonw.exe"; Parameters: "-X utf8 -m app.main"; WorkingDir: "{app}"; IconFilename: "{app}\ui\img\hcloader.ico"; Comment: "{cm:AppComment}"; AppUserModelID: "{#AppUserModelID}"; Tasks: desktopicon

[Run]
Filename: "{app}\python\pythonw.exe"; Parameters: "-X utf8 -m app.main"; WorkingDir: "{app}"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; everything in the app folder, also what was created later (_previous* of the self-update,
; __pycache__, packages updated by pip). Never %APPDATA%\HCLoader (settings, DB, library).
Type: filesandordirs; Name: "{app}"

[Code]
const
  MaxRelPath = {#MaxRelPath};
  MaxPathLen = 259;

function IsHCLoaderDir(const Dir: String): Boolean;
begin
  Result := FileExists(AddBackslash(Dir) + 'app\main.py');
end;

function IsDirEmpty(const Dir: String): Boolean;
var
  FindRec: TFindRec;
begin
  Result := True;
  if FindFirst(AddBackslash(Dir) + '*', FindRec) then
  begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') then
        begin
          Result := False;
          Break;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;
end;

// '' = the folder is fine, else the message for the user
function CheckTargetDir(Dir: String): String;
begin
  Result := '';
  Dir := RemoveBackslashUnlessRoot(Dir);
  if (MaxRelPath > 0) and (Length(Dir) + 1 + MaxRelPath > MaxPathLen) then
    Result := FmtMessage(CustomMessage('PathTooLong'), [Dir, IntToStr(MaxPathLen - 1 - MaxRelPath)])
  else if FileExists(AddBackslash(Dir) + 'portable.txt') or DirExists(AddBackslash(Dir) + 'data') then
    Result := FmtMessage(CustomMessage('PortableDir'), [Dir])
  else if DirExists(Dir) and (not IsHCLoaderDir(Dir)) and (not IsDirEmpty(Dir)) then
    Result := FmtMessage(CustomMessage('DirNotEmpty'), [Dir]);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Msg: String;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    Msg := CheckTargetDir(WizardDirValue);
    if Msg <> '' then
    begin
      MsgBox(Msg, mbError, MB_OK);
      Result := False;
    end;
  end;
end;

// also for silent installs (/DIR=...): a non-empty result aborts Setup
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := CheckTargetDir(ExpandConstant('{app}'));
end;

// Uninstall: stop HCLoader processes started from the app folder (GUI, headless run, bgutil
// server) and delete the scheduled task of app\core\scheduler.py if it starts this copy (a
// portable copy may own a task with the same name). Errors are ignored.
procedure CleanupBeforeUninstall();
var
  AppDir, Script: String;
  ResultCode: Integer;
begin
  AppDir := RemoveBackslashUnlessRoot(ExpandConstant('{app}'));
  StringChangeEx(AppDir, '''', '''''', True);
  Script :=
    '$d = (''' + AppDir + ''').TrimEnd([char]92).ToLowerInvariant(); ' +
    'Get-Process -Name pythonw,python,deno -ErrorAction SilentlyContinue | ' +
    'Where-Object { $_.Path -and $_.Path.ToLowerInvariant().StartsWith($d + [char]92) } | ' +
    'Stop-Process -Force -ErrorAction SilentlyContinue; ' +
    'foreach ($t in @(Get-ScheduledTask -TaskName ''{#TaskName}'' -ErrorAction SilentlyContinue)) { ' +
    'foreach ($a in @($t.Actions)) { ' +
    '$e = ([string]$a.Execute).Trim([char]34).ToLowerInvariant(); ' +
    '$w = ([string]$a.WorkingDirectory).Trim([char]34).TrimEnd([char]92).ToLowerInvariant(); ' +
    'if ($e.StartsWith($d + [char]92) -or ($w -eq $d)) { ' +
    '$t | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue; break } } }';
  if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "' + Script + '"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Log('Cleanup before uninstall: PowerShell could not be started');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    CleanupBeforeUninstall();
end;
