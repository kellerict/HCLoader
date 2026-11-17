' HCLoader starten (Portable-Version), ohne Konsolenfenster.
' Startet python\pythonw.exe -X utf8 -m app.main relativ zum Ort dieser Datei;
' Arbeitsverzeichnis = App-Ordner. Zusaetzliche Argumente werden durchgereicht.
Option Explicit
Dim fso, sh, root, pyw, args, i
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
pyw = fso.BuildPath(root, "python\pythonw.exe")
If Not fso.FileExists(pyw) Then
  MsgBox "Python fehlt: " & pyw & vbCrLf & vbCrLf & _
    "Bitte das ZIP vollstaendig entpacken und HCLoader.vbs im entpackten Ordner starten.", _
    vbCritical, "HCLoader"
  WScript.Quit 1
End If
' Unterbrochenes App-Update (Journal des Updaters): erst die alte Version aus _previous
' wiederherstellen; das Skript startet HCLoader danach selbst neu.
Dim upd
upd = fso.BuildPath(root, "data\update")
If fso.FileExists(fso.BuildPath(upd, "in_progress.json")) And fso.FileExists(fso.BuildPath(upd, "apply_update.ps1")) Then
  sh.Run "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & _
    fso.BuildPath(upd, "apply_update.ps1") & """ -Manifest """ & fso.BuildPath(upd, "manifest.json") & _
    """ -Recover -Restart", 0, False
  WScript.Quit 0
End If
If Not fso.FileExists(fso.BuildPath(root, "app\main.py")) Then
  MsgBox "Programmdateien fehlen: " & fso.BuildPath(root, "app"), vbCritical, "HCLoader"
  WScript.Quit 1
End If
sh.CurrentDirectory = root
args = ""
For i = 0 To WScript.Arguments.Count - 1
  args = args & " """ & WScript.Arguments(i) & """"
Next
sh.Run """" & pyw & """ -X utf8 -m app.main" & args, 1, False
