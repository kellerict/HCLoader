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
;   Command line: /UPDATECHECK=0 unticks "Check for updates at startup" (also for /VERYSILENT).
;
;   MaxRelPath   longest relative path in SourceDir (scripts\portable_tools.py longest); the
;                installer refuses target folders where folder + 1 + MaxRelPath > 259 (MAX_PATH)
;   WebView2Bootstrapper  Microsoft's Evergreen Bootstrapper MicrosoftEdgeWebview2Setup.exe
;                (default installer\redist\, not in Git; portable.yml downloads it from Microsoft
;                and checks its Authenticode signature). Packed, never installed: extracted to
;                {tmp} and run only when the WebView2 Runtime is missing.
;   Command line: /WEBVIEW2DRYRUN=1 treats the runtime as missing, extracts the bootstrapper and
;                logs it without starting it (CI smoke of that path).
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
#ifndef WebView2Bootstrapper
  #define WebView2Bootstrapper AddBackslash(SourcePath) + "redist\MicrosoftEdgeWebview2Setup.exe"
#endif
#if !FileExists(WebView2Bootstrapper)
  #error WebView2 bootstrapper missing: download MicrosoftEdgeWebview2Setup.exe (https://go.microsoft.com/fwlink/p/?LinkId=2124703) to installer\redist\ or pass /DWebView2Bootstrapper=<path> (see .github\workflows\portable.yml)
#endif
#define WebView2Setup "MicrosoftEdgeWebview2Setup.exe"
; end-user download page of the Evergreen runtime (= app\core\webview2.py DOWNLOAD_URL)
#define WebView2Url "https://developer.microsoft.com/microsoft-edge/webview2/consumer/"

#define AppName "HCLoader"
; = app\main.py APP_USER_MODEL_ID (taskbar grouping, own icon)
#define AppUserModelID "HCLoader.App"
; = app\core\scheduler.py TASK_NAME
#define TaskName "HCLoader-Watchlist"
#define AppRepoUrl "https://github.com/kellerict/HCLoader"
#define PrivacyUrl AppRepoUrl + "/blob/main/CODE_SIGNING.md#privacy-policy"
; = app\core\config.py INSTALLER_DEFAULTS: read by the app only while no config.yaml exists
#define InstallerDefaults "installer-defaults.json"

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
; upgrade over a running copy: the Restart Manager closes HCLoader. The filter names the files of
; {app} that Setup checks for being in use (file names, wildcards): only the app's own executables,
; so RM only ever touches processes running python\python(w).exe or bin\deno.exe of this copy
; (GUI, headless run, bgutil server), never something that merely has a DLL/.pyd open. CI passes
; /NOCLOSEAPPLICATIONS (docs\decisions.md "Installer-Smoke als eigener Job").
CloseApplications=yes
CloseApplicationsFilter=python.exe,pythonw.exe,deno.exe
RestartApplications=no
SetupLogging=yes

[Languages]
; English and German texts below; the other languages get the translated Inno wizard and the
; English custom texts (this file stays ASCII). Only languages HCLoader itself speaks.
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"
Name: "pt"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "nl"; MessagesFile: "compiler:Languages\Dutch.isl"
Name: "fi"; MessagesFile: "compiler:Languages\Finnish.isl"
Name: "nb"; MessagesFile: "compiler:Languages\Norwegian.isl"
; not shipped by every Inno Setup 6 release
#if FileExists(AddBackslash(CompilerPath) + "Languages/Swedish.isl")
Name: "sv"; MessagesFile: "compiler:Languages\Swedish.isl"
#endif

[CustomMessages]
; without prefix = every language (English); de. overrides it for German
PathTooLong=The folder%n%n%1%n%nis too long: some files of HCLoader would exceed the Windows path limit of 260 characters. Please choose a folder with at most %2 characters, e.g. the default folder.
PortableDir=The folder%n%n%1%n%ncontains a portable copy of HCLoader (portable.txt or data). Install into another folder; the portable copy and its data stay as they are.
DirNotEmpty=The folder%n%n%1%n%nis not empty and does not contain an earlier HCLoader installation. Please choose an empty or new folder (the uninstaller removes the whole folder).
AppComment=Find, filter and save hardstyle, hardcore and uptempo mixes
PrivacyCaption=Privacy and network access
PrivacyDescription=Which systems HCLoader contacts and how to switch it off.
PrivacyText=HCLoader sends no telemetry, has no analytics and needs no account.%n%nYouTube and SoundCloud are only contacted when you search, download or run a watchlist check (manually or on a schedule you set up).%n%nAt each start HCLoader can check GitHub for a new HCLoader version and PyPI for yt-dlp updates (at most once a day). These requests contain only the usual connection data (IP address, program version). You can change this later in Settings > Maintenance.
PrivacyUpdateCheck=Check for updates at startup (GitHub, PyPI)
PrivacyLink=Privacy policy (CODE_SIGNING.md)
PrivacyExisting=HCLoader is already set up for this user: the existing setting stays as it is. Change it in Settings > Maintenance.
de.PathTooLong=Der Ordner%n%n%1%n%nist zu lang: einige Dateien von HCLoader wuerden die Windows-Pfadgrenze von 260 Zeichen ueberschreiten. Bitte einen Ordner mit hoechstens %2 Zeichen waehlen, z.B. den vorgeschlagenen.
de.PortableDir=Der Ordner%n%n%1%n%nenthaelt eine Portable-Version von HCLoader (portable.txt oder data). Bitte in einen anderen Ordner installieren; die Portable-Version und ihre Daten bleiben unveraendert.
de.DirNotEmpty=Der Ordner%n%n%1%n%nist nicht leer und enthaelt keine fruehere HCLoader-Installation. Bitte einen leeren oder neuen Ordner waehlen (die Deinstallation entfernt den ganzen Ordner).
de.AppComment=Hardstyle-, Hardcore- und Uptempo-Mixes finden, filtern und speichern
de.PrivacyCaption=Datenschutz und Netzwerkzugriffe
de.PrivacyDescription=Welche Dienste HCLoader kontaktiert und wie man es abschaltet.
de.PrivacyText=HCLoader sendet keine Telemetrie, hat keine Analyse und braucht kein Konto.%n%nYouTube und SoundCloud werden nur kontaktiert, wenn Sie suchen, herunterladen oder eine Watchlist-Pruefung starten (von Hand oder nach einem von Ihnen eingerichteten Zeitplan).%n%nBei jedem Start kann HCLoader auf GitHub nach einer neuen HCLoader-Version und auf PyPI nach yt-dlp-Updates suchen (hoechstens einmal pro Tag). Diese Anfragen enthalten nur die ueblichen Verbindungsdaten (IP-Adresse, Programmversion). Spaeter aenderbar unter Einstellungen > Wartung.
de.PrivacyUpdateCheck=Beim Start nach Updates suchen (GitHub, PyPI)
de.PrivacyLink=Datenschutzerklaerung (CODE_SIGNING.md)
de.PrivacyExisting=HCLoader ist fuer diesen Benutzer bereits eingerichtet: die bestehende Einstellung bleibt unveraendert. Aendern unter Einstellungen > Wartung.

; WebView2 Runtime step: texts in every installer language (UTF-8, so in an extra file)
#include "webview2-messages.isi"

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
; Microsoft's Evergreen Bootstrapper, unmodified and signed by Microsoft: only extracted to {tmp}
; when needed (InstallWebView2), never copied to {app}
Source: "{#WebView2Bootstrapper}"; DestName: "{#WebView2Setup}"; Flags: dontcopy

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
  // documented detection key of the Evergreen WebView2 Runtime (value pv)
  WebView2Key = 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';

var
  PrivacyPage: TInputOptionWizardPage;

// '1' = check for updates at startup. Order: /UPDATECHECK=0|1, the choice of an earlier
// install, default on. Review v0.2.0 m5: 0/false/no/off (any case) switch it off, 1/true/yes/on
// switch it on, anything else is logged and ignored.
function DefaultUpdateCheck(): String;
var
  Param: String;
begin
  Param := Lowercase(Trim(ExpandConstant('{param:UPDATECHECK|}')));
  if (Param = '0') or (Param = 'false') or (Param = 'no') or (Param = 'off') then
    Result := '0'
  else if (Param = '1') or (Param = 'true') or (Param = 'yes') or (Param = 'on') then
    Result := '1'
  else
  begin
    if Param <> '' then
      Log('Unknown /UPDATECHECK value ignored: ' + Param);
    Result := GetPreviousData('UpdateCheck', '1');
  end;
end;

// Upgrade / reinstall: the app already has a config.yaml, which always wins over
// installer-defaults.json (Review v0.2.0 m4) - the checkbox would have no effect, so it is hidden.
function HasUserConfig(): Boolean;
begin
  Result := FileExists(ExpandConstant('{userappdata}\HCLoader\config.yaml'));
end;

procedure PrivacyLinkClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExecAsOriginalUser('open', '{#PrivacyUrl}', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

// Privacy page after the folder page (SignPath Foundation: describe network access, show it
// during installation, offer to disable it).
procedure InitializeWizard();
var
  Link, Note: TNewStaticText;
  Below: Integer;
begin
  PrivacyPage := CreateInputOptionPage(wpSelectDir, CustomMessage('PrivacyCaption'),
    CustomMessage('PrivacyDescription'), CustomMessage('PrivacyText'), False, False);
  PrivacyPage.Add(CustomMessage('PrivacyUpdateCheck'));
  PrivacyPage.Values[0] := DefaultUpdateCheck() <> '0';
  PrivacyPage.CheckListBox.Height := ScaleY(28);
  Below := PrivacyPage.CheckListBox.Top + PrivacyPage.CheckListBox.Height + ScaleY(8);
  if HasUserConfig() then
  begin
    PrivacyPage.CheckListBox.Visible := False;
    Note := TNewStaticText.Create(PrivacyPage);
    Note.Parent := PrivacyPage.Surface;
    Note.AutoSize := False;
    Note.WordWrap := True;
    Note.Left := PrivacyPage.CheckListBox.Left;
    Note.Top := PrivacyPage.CheckListBox.Top;
    Note.Width := PrivacyPage.SurfaceWidth - Note.Left;
    Note.Height := ScaleY(40);
    Note.Caption := CustomMessage('PrivacyExisting');
    Below := Note.Top + Note.Height + ScaleY(8);
  end;
  Link := TNewStaticText.Create(PrivacyPage);
  Link.Parent := PrivacyPage.Surface;
  Link.Caption := CustomMessage('PrivacyLink');
  Link.Cursor := crHand;
  Link.Font.Color := clBlue;
  Link.Font.Style := [fsUnderline];
  Link.OnClick := @PrivacyLinkClick;
  Link.Left := PrivacyPage.CheckListBox.Left;
  Link.Top := Below;
end;

procedure RegisterPreviousData(PreviousDataKey: Integer);
begin
  if PrivacyPage.Values[0] then
    SetPreviousData(PreviousDataKey, 'UpdateCheck', '1')
  else
    SetPreviousData(PreviousDataKey, 'UpdateCheck', '0');
end;

// {app}\installer-defaults.json: the app applies it only when it creates a new config.yaml
// (app\core\config.py load_with_warnings); an existing user config always wins.
procedure WriteInstallerDefaults();
var
  Value: String;
begin
  if PrivacyPage.Values[0] then
    Value := 'true'
  else
    Value := 'false';
  if not SaveStringToFile(ExpandConstant('{app}\{#InstallerDefaults}'),
    '{"maintenance": {"check_app_updates_on_start": ' + Value +
    ', "check_updates_on_start": ' + Value + '}}' + #13#10, False) then
    Log('Could not write {#InstallerDefaults}');
end;

// WebView2 Runtime, as Microsoft documents the detection: pv (REG_SZ) of the client key per
// machine (64-bit Windows: WOW6432Node = HKLM32) or per user (HKCU); installed = not empty and
// not 0.0.0.0. HKLM64 covers the key without WOW6432Node.
function WebView2PvAt(const RootKey: Integer; const Where: String; var Version: String): Boolean;
var
  Value: String;
begin
  Result := False;
  if RegQueryStringValue(RootKey, WebView2Key, 'pv', Value) then
  begin
    Value := Trim(Value);
    Log('WebView2 ' + Where + ': pv=' + Value);
    if (Value <> '') and (Value <> '0.0.0.0') then
    begin
      Version := Value;
      Result := True;
    end;
  end;
end;

function FindWebView2(var Version: String): Boolean;
begin
  Result := WebView2PvAt(HKLM32, 'HKLM (WOW6432Node)', Version);
  if not Result then
    Result := WebView2PvAt(HKCU, 'HKCU', Version);
  if (not Result) and IsWin64 then
    Result := WebView2PvAt(HKLM64, 'HKLM', Version);
end;

// Installs the runtime with Microsoft's Evergreen Bootstrapper if it is missing. Without admin
// rights (PrivilegesRequired=lowest) the bootstrapper installs per user; it downloads the runtime,
// so it needs internet. A failure never aborts Setup: HCLoader is installed anyway, the user gets
// a hint with the download page (suppressed in silent mode) and the app explains it again at
// start (app\core\webview2.py).
procedure InstallWebView2();
var
  Version, Setup, Failure: String;
  ResultCode: Integer;
  DryRun: Boolean;
begin
  DryRun := ExpandConstant('{param:WEBVIEW2DRYRUN|0}') = '1';
  if DryRun then
    Log('WebView2 dry run: treated as missing (/WEBVIEW2DRYRUN=1)')
  else if FindWebView2(Version) then
  begin
    Log('WebView2 present, skipped (version ' + Version + ')');
    Exit;
  end
  else
    Log('WebView2 missing: running the Evergreen Bootstrapper');
  WizardForm.StatusLabel.Caption := CustomMessage('WebView2Installing');
  WizardForm.FilenameLabel.Caption := '';
  Failure := '';
  Setup := ExpandConstant('{tmp}\{#WebView2Setup}');
  try
    ExtractTemporaryFile('{#WebView2Setup}');
  except
    Failure := GetExceptionMessage;
  end;
  if (Failure = '') and not FileExists(Setup) then
    Failure := Setup;
  if (Failure = '') and DryRun then
  begin
    Log('WebView2 dry run: bootstrapper extracted to ' + Setup + ', not started');
    Exit;
  end;
  if Failure = '' then
  begin
    WizardForm.ProgressGauge.Style := npbstMarquee;
    try
      if not Exec(Setup, '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
        Failure := SysErrorMessage(ResultCode)
      else if ResultCode <> 0 then
        Failure := Format('%d / 0x%.8x', [ResultCode, ResultCode]);
    finally
      WizardForm.ProgressGauge.Style := npbstNormal;
    end;
  end;
  if Failure = '' then
  begin
    if FindWebView2(Version) then
      Log('WebView2 installed (version ' + Version + ')')
    else
      Log('WebView2 bootstrapper finished (exit code 0), but no pv value found yet');
  end
  else
  begin
    Log('WebView2 install failed: ' + Failure);
    SuppressibleMsgBox(FmtMessage(CustomMessage('WebView2Failed'), [Failure, '{#WebView2Url}']), mbInformation, MB_OK, IDOK);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    InstallWebView2();
    WriteInstallerDefaults();
  end;
end;

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
      // NextButtonClick also runs in silent mode: a plain MsgBox would wait for a click there
      SuppressibleMsgBox(Msg, mbError, MB_OK, IDOK);
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
// portable copy may own a task with the same name). Errors are ignored. Exec waits without a
// limit, so PowerShell bounds itself: the task part (CIM/Task Scheduler, can stall) runs in a job
// that is stopped after 60 s, so the uninstaller always finishes (docs\decisions.md
// "Installer-Smoke ohne Haenger").
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
    '$j = Start-Job -ArgumentList $d -ScriptBlock { param($d) ' +
    'foreach ($t in @(Get-ScheduledTask -TaskName ''{#TaskName}'' -ErrorAction SilentlyContinue)) { ' +
    'foreach ($a in @($t.Actions)) { ' +
    '$e = ([string]$a.Execute).Trim([char]34).ToLowerInvariant(); ' +
    '$w = ([string]$a.WorkingDirectory).Trim([char]34).TrimEnd([char]92).ToLowerInvariant(); ' +
    'if ($e.StartsWith($d + [char]92) -or ($w -eq $d)) { ' +
    '$t | Unregister-ScheduledTask -Confirm:$false -ErrorAction SilentlyContinue; break } } } }; ' +
    'if (-not (Wait-Job -Job $j -Timeout 60)) { Stop-Job -Job $j }; ' +
    'Remove-Job -Job $j -Force -ErrorAction SilentlyContinue; exit 0';
  if Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "' + Script + '"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    Log('Cleanup before uninstall: PowerShell exit code ' + IntToStr(ResultCode))
  else
    Log('Cleanup before uninstall: PowerShell could not be started');
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    CleanupBeforeUninstall();
end;
