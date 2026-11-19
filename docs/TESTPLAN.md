# Testplan HCLoader (Windows-Abnahme bis v0.10.0)

Gedacht für den Test auf einem echten Windows-PC und in Windows Sandbox. Alles, was auf Linux nur simuliert
oder gar nicht prüfbar war, steht hier. Jede Zeile: Aktion → erwartetes Ergebnis. Haken setzen mit `- [x]`.
Schlägt etwas fehl: Abschnitt 5 «Fehler melden».

## 1. Vorbereitung

- [ ] **Windows 10/11 64-bit**, ohne Adminrechte testen (nichts darf Adminrechte verlangen).
- [ ] **Variante A Installer:** `HCLoader-Setup-<version>.exe` vom GitHub-Release laden (SmartScreen: «Weitere Informationen» → «Trotzdem ausführen»).
- [ ] **Variante B Portable:** `HCLoader-portable-<version>-win64.zip` → Rechtsklick Eigenschaften → «Zulassen» → nach `C:\Tools\` entpacken → `HCLoader\HCLoader.cmd`.
- [ ] **Windows Sandbox** (für «frisches System», ohne WebView2): Netzwerk aktiviert lassen, Setup-Datei per Ordnerfreigabe hineinkopieren. Alles in der Sandbox ist nach dem Schliessen weg.
- [ ] **Zweiter, normaler PC mit WebView2** für alles mit Aufgabenplanung, Credential Manager, Toasts, Plex/Jellyfin (Sandbox ist dafür ungeeignet).
- [ ] **Testdaten bereit:** YouTube-Mix `https://www.youtube.com/watch?v=QeD-amb0vA0`; ein SoundCloud-Set, ein Mixcloud-Link (`mixcloud.com/<user>/<mix>`), ein hearthis.at-Link (`hearthis.at/<user>/`); ein echter Festival-Timetable (Text); zwei Uploads desselben Sets (z.B. YouTube und Mixcloud); ein kleiner Kanal (< 50 Videos).
- [ ] **Zeitbedarf grob:** Kerntests ca. 30 Min., Rest ca. 3,5 bis 4 Std. (verteilbar, Downloads laufen nebenbei).
- [ ] Ordner `%APPDATA%\HCLoader\` und den Musikordner vor dem Test notieren (Logs unter `%APPDATA%\HCLoader\logs\`).

## 2. Zuerst das Wichtigste (10 Kerntests, ca. 30 Min.)

- [ ] **K1 Installation:** Installer mit Standardwerten ausführen → Installation ohne Adminabfrage, Eintrag im Startmenü, Ende ohne Fehlermeldung.
- [ ] **K2 Start:** HCLoader aus dem Startmenü starten → Fenster öffnet in ca. wenigen Sekunden, dunkles Theme, Navigation und Statusleiste sichtbar, keine weisse/leere Seite.
- [ ] **K3 Sprache:** Einstellungen › Allgemein › Sprache auf Deutsch, dann Englisch → alle Texte wechseln sofort, kein Text abgeschnitten.
- [ ] **K4 Suche:** Entdecken → «hardstyle mix» suchen → Trefferliste mit Dauer/Kanal; Filter (Dauer, Keywords) reduzieren die Liste sichtbar.
- [ ] **K5 Download:** Test-URL (QeD-amb0vA0) in die Warteschlange → Fortschritt läuft, am Ende Status «fertig», MP3 liegt im Musikordner.
- [ ] **K6 Tags/Ordner:** Datei im Explorer prüfen → Ordner nach Muster (Genre/Plattform), Dateiname ohne Sonderzeichen, Eigenschaften › Details zeigen Titel, Interpret, Genre, Cover.
- [ ] **K7 Player:** Bibliothek → Set abspielen → Ton kommt, Lautstärke regelbar, Kapitel-Sprungmarken/Trackliste klickbar, Pause/Weiter funktioniert.
- [ ] **K8 Update-Prüfung:** Einstellungen › Wartung › «Nach Updates suchen» → Meldung «aktuell» bzw. Dialog mit Highlights; Release Notes lassen sich blättern.
- [ ] **K9 Neustart:** App schliessen und neu starten → Einstellungen, Bibliothek und Fensterzustand bleiben erhalten; ein zweiter Start bringt das vorhandene Fenster nach vorn (keine zweite Instanz).
- [ ] **K10 Deinstallation:** Windows-Einstellungen › Apps › HCLoader deinstallieren → Programmordner und geplante Aufgabe weg, **Daten (`%APPDATA%\HCLoader\`) und Musik bleiben**.

## 3. Pro Version

### v0.1.0 bis v0.2.1 (Grundfunktionen, Sprachen, Installer, Update-Notes)
- [ ] Download unterbrechen (App während Download schliessen) → nach Neustart bleibt der Eintrag in der Warteschlange, kein doppelter Download, keine Reste (`.part`) nach spätestens 7 Tagen.
- [ ] Pausen/Limits: mehrere Downloads in Folge → deutliche Pausen zwischen den Titeln, nie zwei Downloads gleichzeitig.
- [ ] Dasselbe Video nochmals hinzufügen → wird als «schon vorhanden» erkannt, kein zweiter Download.
- [ ] Genre in der Bibliothek ändern → Datei wird in den neuen Genre-Ordner verschoben, Tag aktualisiert.
- [ ] Neu taggen und Löschen im Menü → Datei und Eintrag verhalten sich wie beschriftet; «Im Ordner zeigen» öffnet Explorer mit markierter Datei.
- [ ] Ordnerdialog («Ordner wählen») öffnet nativ und übernimmt den Pfad; sehr langer Pfad → klare Meldung statt Absturz.
- [ ] Windows-Sprache auf Deutsch/Französisch stellen, Einstellung «Systemsprache» → App startet in dieser Sprache; Installer-Sprache passt.
- [ ] «Protokoll kopieren» in der Log-Ansicht → Text liegt in der Zwischenablage.
- [ ] Datums-Felder (Von/Bis) und Jahr-Auswahl in Entdecken bedienbar (WebView2-Darstellung).
- [ ] Datenbankfehler provozieren (`hcloader.db` kurz sperren/unlesbar machen) → verständliche MessageBox statt stillem Abbruch.

### v0.3.0 (Festivals und Serien)
- [ ] Set mit Titel «Defqon.1 2024 … Red Stage» laden → Festival, Jahr, Bühne erkannt; Album-Tag = «Defqon.1 2024».
- [ ] Festival-Badge anklicken, Zuordnung korrigieren → Datei wird sofort neu getaggt (Eigenschaften › Details prüfen).
- [ ] «Gruppieren nach Festival» → Kacheln mit Jahres-Zeitleiste; Plex/Jellyfin zeigt das Festival als Album (falls vorhanden).

### v0.4.0 (Alles einlesen, Aufgabenplanung, Gedrosselter Betrieb)
- [ ] Watchlist: kleinen Kanal hinzufügen → «Alles einlesen (einmal)» → Bestätigung mit Schätzung (Anfragen/Zeit), danach Fortschritt «Lese … n / ~m» an der Quelle.
- [ ] Einlesen abbrechen, App neu starten, fortsetzen → macht an der Stelle weiter, Eintrag-Zahl steigt nicht doppelt.
- [ ] Einstellungen › Zeitplan › «Windows-Aufgabe anlegen» → Aufgabe `HCLoader` erscheint in der Aufgabenplanung (`taskschd.msc`), läuft täglich, Benutzerkontext.
- [ ] Aufgabe manuell «Ausführen» (App geschlossen) → kein sichtbares Fenster, Log zeigt Lauf, neue Sets im Eingang.
- [ ] Aufgabe läuft, während die GUI offen ist → kein Doppellauf (globaler Mutex), App zeigt Hinweis oder wartet.
- [ ] Aufgabe in der GUI ändern und entfernen → Aufgabenplanung folgt; nächster Lauf wird in der GUI angezeigt.
- [ ] YouTube-Playlist mit «neueste zuletzt» einlesen → Obergrenze 2000 gilt, Hinweis sichtbar.
- [ ] Bei YouTube-429/Bot-Check (falls auftretend) → sofortiger Backoff in der Statusleiste, keine Wiederholungsschleife.

### v0.5.0 / v0.5.1 (Festival-Sammler, WebView2)
- [ ] **Sandbox ohne WebView2, Installer:** Setup mit Internet ausführen → Statustext «WebView2 wird installiert», danach startet die App; ohne Internet: Installation läuft durch, Hinweis mit Download-Seite, `setup.log` nennt jeden Schritt.
- [ ] **Sandbox ohne WebView2, Portable:** `HCLoader.cmd` starten → verständliche Meldung mit Link zu Microsofts Download-Seite, kein kaputtes Fenster.
- [ ] Mit WebView2 vorhanden: Installer überspringt die Installation ohne Meldung.
- [ ] Sammler: Edition (z.B. Defqon.1 2024) anlegen → «Aus Organisator-Playlist füllen» oder **Timetable-Text einfügen (Beta)** mit einem echten Timetable → Vorschau korrekt (Künstler, Bühne, Zeit), erst nach Bestätigung importiert.
- [ ] Fehlende Sets: zuerst Treffer aus der Bibliothek (kostenlos), danach einzelne Suchen, übers Stundenfenster verteilt; nur angehakte, bestätigte Sets landen in der Warteschlange.
- [ ] Heruntergeladene Sets tragen Edition, Bühne und Set-Typ aus der Checkliste.

### v0.6.0 (Trackliste)
- [ ] Bibliothek › Tracks → Künstler/Titel suchen → Liste der Sets mit Zeitstempel; Klick spielt das Set ab dieser Stelle.
- [ ] Beim ersten Öffnen: Bestand wird einmalig eingelesen (Fortschritt, Abbrechen); «Neu lesen» liest nur Neues.
- [ ] «Meistgespielte Tracks» (Top 20) zeigt plausible Werte; Set löschen → Tracks verschwinden aus Suche und Top-Liste.
- [ ] Externer Player-Modus: Zeitstempel-Klick öffnet die Datei im Standardplayer (`os.startfile`) und nennt die Sprungstelle.
- [ ] Beschädigte MP3 (Datei abschneiden) → Tracklisten-Panel zeigt Meldung, kein Absturz.

### v0.7.0 (Lautstärke, Wellenform, Merkfunktion)
- [ ] **Web Audio mit `file:`-URLs:** Player spielt lokales Set mit Lautstärke-Badge (Gain, z.B. «+3 dB») → Ton hörbar, deutlich anders laut bei einem sehr leisen und einem sehr lauten Set.
- [ ] **Stille-Fallback:** Falls das Set stumm bleibt, schaltet der Player nach ca. 1,5 s auf einfache Wiedergabe an derselben Stelle um (Badge weg, nur Absenken möglich). Fehler = dauerhaft stumm.
- [ ] Pfade mit `#`, `%`, `[ ]`, Umlauten im Dateinamen abspielen → Ton kommt (WebView2-`file:`-Handling).
- [ ] Wellenform-Seekbar: Hover zeigt Trackname, Klick/Ziehen springt; mit «Effekte reduzieren» keine Animation.
- [ ] Einstellungen › Wiedergabe › «N neue analysieren» → Fortschritt, Abbrechen möglich; danach ReplayGain-Tags in den Dateieigenschaften/foobar (Audio unverändert).
- [ ] Set mitten drin schliessen, erneut öffnen → Angebot «Fortsetzen»; «Weiterhören»-Zeile in der Bibliothek zeigt bis zu 5 Sets.
- [ ] Sleep-Timer (15 Min. oder «Ende des Sets») → Ausblenden der letzten 10 s, Wiedergabe stoppt.
- [ ] Während eine Datei analysiert wird, Neu taggen/Löschen → bei Sperre klare Meldung, Wiederholen klappt (akzeptierte Grenze).

### v0.8.0 (DJs, Playlists)
- [ ] Bibliothek › DJs → DJ-Seite öffnen → Statistik, Sets nach Festival/Jahr, Top-Tracks; «Alle abspielen» spielt nacheinander.
- [ ] Alias «HH» → Headhunterz zusammenführen, b2b-Set zählt für beide Künstler; «Mark With a K» bleibt ein Name.
- [ ] «Zur Watchlist hinzufügen» → Bestätigung, danach Eintrag (eigener Kanal bzw. «live set»-Suche); nichts wird automatisch geladen.
- [ ] **Playlist-Export M3U8 auf USB/Handy:** Festival-Edition exportieren nach USB-Stick (anderes Laufwerk) → Datei öffnet in VLC/Handy-Player; relative Pfade funktionieren nach Verschieben des Musikordners, Pfade auf anderem Laufwerk sind absolut (Dialog nennt die Zahl).
- [ ] Dateien mit `#` im Namen in der M3U8 (`.\#1 …`) → Player liest sie als Titel, nicht als Kommentar.
- [ ] Überschreiben-Frage beim zweiten Export; im Explorer gelöschte Playlist wird nicht automatisch neu angelegt.
- [ ] «Nach Downloads aktualisieren» einschalten, ein Download → gespeicherte Playlist hat den neuen Eintrag (auch nach geplantem Lauf).

### v0.9.0 (Statistik, Toasts, Plex/Jellyfin)
- [ ] **Statistik** (Ctrl+6) → Summen, Monatsdiagramm, Genres, Top-Festivals/DJs plausibel zur Bibliothek; Zeitraum-Filter wirkt; ohne Netz funktionsfähig; Bestand wird einmalig im Hintergrund vermessen.
- [ ] **Toast:** Einstellungen › Benachrichtigungen › «Test senden» → Windows-Benachrichtigung mit Name/Icon «HCLoader» erscheint (PowerShell 5.1).
- [ ] **hcloader://-Klick:** auf Toast klicken, App offen → springt zur passenden Ansicht (Eingang/Downloads/Bibliothek).
- [ ] Wie oben, aber App **geschlossen** (geplanter Lauf findet neue Sets) → Klick startet HCLoader direkt im Eingang.
- [ ] Ruhezeiten einstellen → in dieser Zeit kein Toast, danach eine Sammelmeldung; mehrere Downloads ergeben nur einen Toast.
- [ ] Nach Deinstallation sind die Registry-Schlüssel `HKCU\Software\Classes\hcloader` und `…\AppUserModelId\HCLoader.App` entfernt.
- [ ] **Credential Manager:** Plex-Token bzw. Jellyfin-Key eingeben → «Verbindung testen» ok → Eintrag `HCLoader/media_server/<typ>` in Windows-Anmeldeinformationen; **nicht** in `config.yaml` und nicht im Log.
- [ ] «Zugangsdaten vergessen» → Eintrag aus dem Credential Manager verschwunden.
- [ ] **Echter Plex/Jellyfin:** Bibliothek wählen, Zielordner wie der Server ihn sieht (NAS/Docker), Download → Server scannt nur den neuen Ordner; «Jetzt scannen» funktioniert; falscher Pfad → Fallback auf vollen Scan oder verständliche Meldung.

### v0.10.0 (Re-Uploads, Mixcloud, hearthis.at)
- [ ] **Fingerprint/Re-Upload:** zwei echte Uploads desselben Sets (anderer Kanal/Plattform) nacheinander laden → zweiter trägt Tag **RE-UPLOAD?**, Chip «Re-Uploads (n)», Toast/Hinweis in Downloads.
- [ ] Aktionen prüfen: «Beide behalten», «Als gleichen Mix verknüpfen», «Original zeigen», «Neuere Datei löschen» (danach nie wieder geladen), «Rückgängig».
- [ ] «Neuere Datei löschen» bei fehlendem/gesperrtem Original → Menü erklärt warum, bietet «Original fehlt – diese Kopie behalten».
- [ ] Zwei verschiedene Sets mit gleichem Intro-Track → **kein** Treffer.
- [ ] «Neue Dateien fingerprinten» auf bestehender Bibliothek → Fortschritt, Abbrechen, Fortsetzen; PC bleibt bedienbar (niedrige Priorität); Löschen während Berechnung klappt unter Windows.
- [ ] Optional «Vor dem Download prüfen» einschalten → Treffer nach Länge/Titel gehen in den Eingang statt in die Warteschlange.
- [ ] **Mixcloud:** Suche, Nutzer in Watchlist, Download eines Mixes → Datei `[mc-…]`, Tag `MIXCLOUD_ID`; Select-Upload als «nicht ladbar».
- [ ] **hearthis.at:** Suche, Nutzer/Set in Watchlist, Download → Datei `[ht-…]`, MP3 unverändert; Lossless-Originale übersprungen.
- [ ] Eigene Drosselung: Einstellungen › Weitere Quellen: Backoff einer Plattform auslösen (z.B. Limit auf 1 setzen) → andere Plattformen laufen weiter.
- [ ] Statistik zeigt alle vier Quellen; Platform-Schalter in Entdecken und gespeicherten Suchen vorhanden.

### Selbst-Update (Updater, Phase 7a/8) und Migration
- [ ] **0.9.0 → 0.10.0:** alte Version installieren, Daten anlegen (Bibliothek, Watchlist), dann «Update installieren» → Fortschritt, Neustart in die neue Version, Datenbank-Migration lief (Backup `hcloader.db.bak…` im Datenordner), Bibliothek/Watchlist/Einstellungen unverändert.
- [ ] Update-Dialog listet übersprungene Versionen mit je eigenen Highlights, Links öffnen im Standardbrowser.
- [ ] Update, während eine Datei (z.B. `.pyd`) gesperrt ist → Rückfall auf die alte Version, App startet weiter (Rollback).
- [ ] Portable: Update in `C:\Tools\HCLoader` funktioniert und behält `config.yaml`; Integritätsprüfung (SHA256) schlägt bei manipuliertem Download an.
- [ ] Setup einer neueren Version über die laufende installieren → sauberes Überschreiben, Daten bleiben.

## 4. Bekannte Grenzen (akzeptiert, kein Fehler)

- Installer und Portable sind **nicht signiert**: SmartScreen-Warnung beim ersten Start.
- Portable kann WebView2 nicht selbst installieren (nur Meldung mit Link); Fixed-Version-Runtime braucht `HCLOADER_SKIP_WEBVIEW2_CHECK=1`.
- Timetable-Text-Import ist **Beta**: Vorschau immer prüfen.
- Erster YouTube-Zugriff kann durch Bot-Check/429 gebremst werden; das ist gewollt (Backoff statt Wiederholung).
- Neu taggen/Löschen einer Datei, die gerade analysiert/fingerprintet wird, kann einmalig scheitern; wiederholen.
- Der Lautstärke-Fallback kann nur absenken, nicht anheben (wenn Web Audio stumm bleibt).
- Relative M3U8-Pfade nutzen `\`; sehr alte Geräte/Player können das ablehnen (dann absolute Pfade wählen).
- Neue Uploads einer Auto-Download-Quelle landen beim Einlesen im Eingang (nicht direkt in der Warteschlange); der Index-Cursor kann bei gelöschten Videos Einträge überspringen.
- archive.org ist zurückgestellt (kein Support).
- Das Quell-ZIP für das Selbst-Update ist gross (ca. 90 MB), Update dauert entsprechend.
- Toasts brauchen Windows PowerShell 5.1 (Bestandteil von Windows); ohne wird nur geloggt.

## 5. Fehler melden

Bitte mitschicken:
- **Version** (Einstellungen › Wartung, oder Fenstertitel) und Variante (Installer/Portable, Windows-Version, Sandbox ja/nein).
- **Log:** Ordner `%APPDATA%\HCLoader\logs\` (letzte Datei `hcloader.log`); in der App «Protokoll kopieren». Keine Cookies/Tokens einfügen (sind nicht im Log, kurz gegenprüfen).
- **Screenshot** der Meldung oder Ansicht (Win+Shift+S) und kurz: Schritt-Nummer aus diesem Plan, erwartet vs. beobachtet.

Wohin: GitHub Issue im Repo `kellerict/HCLoader` oder die Liste direkt in der nächsten Claude-Session einfügen.
