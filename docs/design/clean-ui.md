# Vorschlag «cleaner» – HCLoader UI

Stand: Vorschlag auf einer Kopie von `ui/` (v0.10.2). An der App selbst wurde nichts geändert, nichts committet.

- Vergleichsbilder (links «Heute», rechts «Vorschlag»): `/tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/compare/`
- Geänderte Kopie: `/tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/`
- Kern ist ein zusätzliches Stylesheet `css/clean.css` (ca. 190 Zeilen, zuletzt geladen) plus fünf kleine Markup-Eingriffe.
- Gerendert im Mock-Modus, 1440×900, Sprache en, ohne JS-Fehler und ohne externe Requests.

## Leitlinien

- **Identität bleibt:** Farben, Bebas Neue, Rot-Akzent, Genre-Farben, Scanlines/Glow, Navigation, Seitentitel.
- **Flächenstufen statt Rahmen:** Kacheln, Karten, Zeilenwerkzeuge und Sekundär-Buttons verlieren den 1-px-Rahmen. Rahmen bleiben nur, wo sie etwas bedeuten (aktiver Download, Fehler, Auswahl, Fokus).
- **Ruhigere Etiketten:** Tabellenköpfe, Feld- und Kachel-Etiketten in Inter 12 px statt gesperrter Mono-Versalien. Versalien bleiben der Display-Schrift (Titel, Buttons) vorbehalten.
- **Eine Primäraktion je Ansicht:** nur noch der rote Button ist gefüllt; alles andere tritt zurück.
- **Abstandsraster** 4/8/12/16/24/32 als CSS-Variablen (`--s1` … `--s6`), Trennlinien als Haarlinie (`--hair`).

## Änderungen je Ansicht

### Global: Seitenleiste und Statusleiste (in jedem Bild sichtbar)
- Statusleiste: Deno, ffmpeg und PO-Token werden zu einem Eintrag «System OK» zusammengefasst, solange alles grün ist. Bei Warnung oder Fehler erscheinen die Einzelwerte wieder wie heute. Grund: fünf grüne Punkte sagen dasselbe wie einer.
- «Backoff none» wird ausgeblendet; der Eintrag erscheint nur, wenn ein Backoff läuft.
- Statusleiste in Inter und gedämpft statt Mono mit hellen Werten – sie soll nur auffallen, wenn etwas nicht stimmt.
- Seitenleiste unten: «Today 3 / 25» und «Next check» entfallen, weil beides bereits in der Statusleiste steht. Der Mock-Hinweis bleibt.

### 01 Discover (mit Filtern)
- Include-/Exclude-Stichwörter liegen hinter einer aufklappbaren Zeile «Keywords · 12 include · 13 exclude». Grund: die zwei Tag-Wände füllten das Panel und schoben «Display» unter den Bildrand; jetzt passt das ganze Panel ohne Scrollen.
- Kartenstatus («New», «In inbox») als Punkt mit Text statt Kästchen in Versalien.
- Die vier Karten-Werkzeuge ohne Rahmen; der Download-Button wird beim Überfahren weiterhin rot.
- «Select all» tritt hinter «Download selection» zurück.

### 02 Discover – Quellenmenü
- Keine eigene Änderung, das Menü ist bereits sauber. Sichtbar sind nur die globalen Punkte.

### 03 Inbox
- «In inbox» auf jeder Karte entfällt – im Eingang ist das auf allen Karten dieselbe Aussage.
- Quellen-Chips ohne Rahmen; der aktive Chip behält die rote Unterkante.
- «Ignore all» als ruhiger Sekundär-Button neben der Primäraktion «Download all».

### 04 Watchlist
- Pro Zeile statt fünf gerahmter Buttons nur noch «Check» und ein «⋯»-Menü mit Alles einlesen, Bearbeiten, Löschen. Grund: 11 Zeilen × 5 Buttons waren der unruhigste Teil der Ansicht; Löschen ist dadurch auch weniger leicht versehentlich zu treffen.
- Zeilenwerkzeuge gedämpft, voll sichtbar in der Zeile unter der Maus oder mit Fokus.
- Tabellenkopf ruhig, Trennlinien heller, «(default)» abgedunkelt.

### 05 Downloads
- Kennzahl-Kacheln ohne Rahmen.
- Wartende Einträge ohne Rahmen; nur der aktive (grün) und der fehlgeschlagene (rot) Eintrag bleiben gerahmt, damit der Blick dorthin geht.
- «Cancel» und die Pfeile als ruhige Textaktionen.

### 06 Bibliothek – Liste
- Vier Kennzahl-Kästen werden zu einer Zeile: «83 Mixes · 103.8 h · 13.7 GB» plus Genre-Balken mit Legende. Spart rund 50 px Höhe; eine Tabellenzeile mehr ist sichtbar.
- Tracks / DJs / Collector stehen als ruhige Tabs direkt beim Titel; rechts bleiben Suche und Ansichtsumschalter. Grund: drei gerahmte Buttons neben dem Suchfeld wirkten wie Aktionen, sind aber Unteransichten.
- Genre in der Tabelle als Farbpunkt mit Text (wie in der Watchlist) statt als farbige Plakette; weiterhin anklickbar zum Ändern.
- Dateipfad unter dem Titel entfällt (bleibt über den Ordner-Button und die Suche erreichbar); CUE- und Festival-Tags ohne Rahmen.
- «2 missing» und «Re-uploads (1)» als ruhige Hinweis-Chips in normaler Schrift.

### 07 Bibliothek – Festivals
- Nur die gemeinsamen Punkte (Kennzahlen-Zeile, Tabs, Kacheln ohne Rahmen). Die Farbkante der Kacheln bleibt.

### 08 Bibliothek – DJs
- «Festivals: 2», «b2b: 1», «aka HH» als eine Textzeile mit Trennpunkten statt drei gerahmter Mini-Tags.
- Karten ohne Rahmen.

### 09 Bibliothek – DJ-Seite
- Kennzahlen als Zeile statt vier Kästen; Set- und Track-Zeilen ohne Rahmen.
- «Export M3U» und «Add to watchlist» treten hinter «Play all» zurück.

### 10 Bibliothek – Tracks
- Nur Ranglisten-Zeilen ohne Rahmen. Sonst unverändert.

### 11 Bibliothek – Collector (Übersicht)
- Nur Karten ohne Rahmen und ruhigere Etiketten. Sonst unverändert.

### 12 Bibliothek – Collector-Checkliste
- Quellen-Werkzeuge (Import, Paste, Shipped, Add row) als ruhige Textaktionen; dadurch passen sie mit den drei Filtern auf eine Zeile statt zwei.
- Status-Plaketten mit getönter Fläche statt Rahmen; «Missing» bleibt gestrichelt als einziger auffälliger Zustand.
- Zeilenwerkzeuge ohne Rahmen und gedämpft.

### 13 Log
- Fehlerbehebung: der Titel «Run history» wurde abgeschnitten («RUN HISTO…»); jetzt weicht die Zusammenfassung daneben aus.
- Lauf-Karten ohne Rahmen (Farbkante bleibt). Das Live-Log selbst ist unverändert.

### 14 Statistik
- Nur Rahmen der Kacheln und Karten entfernt, Kachel-Etiketten ruhig. Diagramme unverändert.

### 15/16 Einstellungen (Tab-Liste, «General», «Download & quality»)
- Die 17 Tabs sind in fünf Gruppen gegliedert: App · Find & sort · Download · Sources & servers · System. Grund: eine flache Liste mit 17 Einträgen muss man jedes Mal ganz lesen.
- «Reset» erscheint nur noch, wenn ein Wert vom Standard abweicht (dann in Gelb), sonst erst beim Überfahren der Zeile. Bisher stand in jeder Zeile ein Reset, der nichts tat.
- «Reset tab» und «Discard» als ruhige Textaktionen neben «Save».
- Feld-Trennlinien heller. Label, Hilfe und Standardwert-Anzeige bleiben (SPEC §10.1).

## Unverändert gelassen

- Navigation links, Logo, Seitentitel mit roter Unterkante, Genre-Chips in Discover, Suchleiste.
- Quellenmenü in Discover.
- Karten-Thumbnails mit Genre-Plakette, Plattform-Badge und Dauer.
- Live-Log (Schrift, Farben, Level-Filter).
- Statistik-Diagramme, Festival-Kacheln (Inhalt), Collector-Übersicht, Tracks-Suche.
- Mini-Player, Dialoge, Toasts, Menüs, alle Effekte (`body.reduced` und `prefers-reduced-motion` wirken wie bisher).

## Offene Punkte / bewusst nicht geprüft

- Geprüft sind nur die 16 gezeigten Zustände in Englisch. Nicht geprüft: die übrigen Einstellungs-Tabs, Dialoge, Rasteransicht der Bibliothek, Player, Fehler-/Backoff-Zustände, die anderen 18 Sprachen, das Mindestfenster 1100×700 und der Modus «Effekte reduzieren».
- Die neuen Texte («System», «Keywords», «include/exclude», Gruppentitel der Einstellungen, «More») sind in der Kopie fest auf Englisch eingetragen und müssen beim Einbau in die Sprachkataloge.
- Das «⋯»-Menü der Watchlist ist in der Kopie funktionsfähig, aber als Abkürzung gebaut (versteckte Buttons); beim Einbau gehört es direkt an die bestehenden Handler.
- Das Ausblenden des Dateipfads in der Bibliothek ist Geschmackssache; wer den Pfad oft liest, lässt diese eine Regel weg.

## Aufwand für den Einbau (grob)

| Teil | Aufwand |
|---|---|
| `clean.css` in `theme.css` / `components.css` einarbeiten (Regeln ersetzen statt überschreiben) | ca. 3–4 Std. |
| Markup: Watchlist-Menü, Stichwort-Aufklapper, Tab-Gruppen, Statusleiste, Genre-Punkt | ca. 2–3 Std. |
| Sprachkataloge: ca. 10 neue Keys in `en` und `de`, übrige Sprachen nachziehen | ca. 1–2 Std. |
| Alle Screenshots neu erzeugen und durchsehen (inkl. `--reduced`, Mindestfenster, 2–3 Sprachen), Korrekturen | ca. 3–4 Std. |
| Tests anpassen (`ui_screenshots.py` klickt in der Watchlist `[data-act="bf"]` / Löschen direkt an) | ca. 1 Std. |
| **Total** | **ca. 1.5 Arbeitstage** |

Keine neue API-Methode nötig, keine Änderung auf der Python-Seite. Der Einbau lässt sich teilen: das reine CSS (Rahmen, Etiketten, Statusleiste) zuerst, die Markup-Punkte einzeln danach.

## Vergleichsbilder (nicht im Repo, nur Liste)

Je Bild links «Heute», rechts «Vorschlag», 1440×900, en, Mock-Modus.

- `compare/01-discover.png`
- `compare/02-discover-source-menu.png`
- `compare/03-inbox.png`
- `compare/04-watchlist.png`
- `compare/05-downloads.png`
- `compare/06-library-list.png`
- `compare/07-library-festivals.png`
- `compare/08-library-djs.png`
- `compare/09-library-dj-page.png`
- `compare/10-library-tracks.png`
- `compare/11-library-collector.png`
- `compare/12-library-collector-checklist.png`
- `compare/13-log.png`
- `compare/14-stats.png`
- `compare/15-settings-general.png`
- `compare/16-settings-download.png`

## Diff der Kopie gegen `ui/` (v0.10.2)

Vollständiger Diff (`diff -ruN ui <Kopie>/ui`), damit der Einbau auch ohne Scratchpad nachvollziehbar bleibt.

````diff
diff -ruN ui/css/clean.css /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/css/clean.css
--- ui/css/clean.css	1970-01-01 00:00:00.000000000 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/css/clean.css	2026-11-20 06:05:12.895122796 +0000
@@ -0,0 +1,219 @@
+/* =====================================================================
+   clean.css – Vorschlag «cleaner» (zuletzt geladen, überschreibt nur)
+   Leitlinien: Flächenstufen statt Rahmen · Abstandsraster 4/8/12/16/24/32 ·
+   Etiketten in Inter statt gesperrter Mono-Versalien · eine Primäraktion je Ansicht ·
+   Zeilenaktionen ohne Rahmen · ruhige Statusleiste.
+   Identität bleibt: Farben, Bebas Neue, Rot-Akzent, Genre-Farben, Effekte.
+   ===================================================================== */
+:root{
+  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
+  --hair:rgba(255,255,255,.055);      /* Trennlinie statt --line, wo eine Linie bleiben muss */
+  --surface:rgba(255,255,255,.03);    /* Flächenstufe 1 auf --bg */
+  --surface-2:rgba(255,255,255,.055); /* Flächenstufe 2 (Hover) */
+  --lbl:500 12px/16px var(--f-body);  /* ruhiges Etikett */
+}
+
+/* ---------- 1. Etiketten: Inter, normal geschrieben, nicht gesperrt ---------- */
+body th,
+body .lbl,
+body .stat .k,body .limit .k,
+body .lib-bar .bar-lbl,body .co-tools .bar-lbl,
+body .search-info .k,
+body .run-day{
+  font:var(--lbl);letter-spacing:0;text-transform:none;color:var(--muted);
+}
+body .nav-foot,body .logo small{letter-spacing:calc(1px * var(--ls))}
+
+/* ---------- 2. Buttons: Sekundäres tritt zurück ---------- */
+/* Icon-Buttons ohne Rahmen/Fläche – Fläche erst bei Hover/Fokus */
+body .iconbtn{border-color:transparent;background:transparent;color:var(--muted)}
+body .iconbtn:hover:not(:disabled),body .iconbtn:focus-visible{background:var(--surface-2);border-color:transparent;color:var(--text)}
+body .iconbtn.dl:hover:not(:disabled){background:var(--accent);color:#000}
+body .iconbtn.danger:hover:not(:disabled){background:var(--error-soft);color:var(--error)}
+body td.act .iconbtn.on{border-color:transparent;background:var(--acid-soft)}
+/* Zurück-Pfeil im Kopf darf seinen Rahmen behalten (Navigation, kein Zeilenwerkzeug) */
+body .view-head>.iconbtn{background:var(--surface);}
+/* Sekundär-Buttons: Fläche statt Rahmen */
+body .btn:not(.primary){border-color:transparent;background:var(--surface-2)}
+body .btn:not(.primary):hover:not(:disabled){background:rgba(255,255,255,.09);border-color:transparent}
+body .btn.ghost:not(.primary){background:transparent;color:var(--muted)}
+body .btn.ghost:not(.primary):hover:not(:disabled){background:var(--surface-2);color:var(--text)}
+body .btn.danger:hover:not(:disabled){background:var(--error-soft);box-shadow:none}
+/* Segmente und Auswahlfelder: ein Rahmen weniger */
+body .seg{border-color:transparent;background:var(--surface)}
+body .seg button{border-right-color:transparent}
+body .input,body .select{border-color:var(--hair);background-color:rgba(0,0,0,.35)}
+body .input:hover:not(:disabled),body .select:hover:not(:disabled){border-color:var(--line-2)}
+body .input:focus,body .select:focus{border-color:var(--accent)}
+
+/* ---------- 3. Kennzahl-Kacheln: keine Kästen ---------- */
+body .stat,body .limit{border-color:transparent;background:var(--surface)}
+body .limit.counting{border-color:transparent}
+
+/* ---------- 4. Tabellen ---------- */
+body th{padding:8px 12px;border-bottom-color:var(--hair)}
+body td{border-bottom-color:var(--hair)}
+body tbody tr:last-child td{border-bottom-color:transparent}
+body td.mono{font-size:12px}
+body th.num,body td.num{text-align:right}
+/* Zeilenwerkzeuge: gedämpft, voll sichtbar erst in der aktiven Zeile */
+body td.act .iconbtn,body td.act .btn{opacity:.55;transition:opacity var(--t-fast),background var(--t-fast),color var(--t-fast)}
+body tr:hover td.act .iconbtn:not(:disabled),body tr:focus-within td.act .iconbtn:not(:disabled),
+body tr:hover td.act .btn:not(:disabled),body tr:focus-within td.act .btn:not(:disabled),
+body td.act .iconbtn.play:not(:disabled),body td.act .iconbtn.on{opacity:1}
+body td.act .iconbtn:disabled,body td.act .btn:disabled{opacity:.25}
+
+/* ---------- 5. Karten (Entdecken, Eingang) ---------- */
+body .card{border-color:transparent;background:var(--panel)}
+body .card:hover{border-color:var(--accent-2)}
+body .card.sel{border-color:var(--accent)}
+/* Status als ruhiger Text mit Punkt statt Kästchen */
+body .cfoot .status{border:0;padding:0;background:none;font:500 12px/16px var(--f-body);letter-spacing:0;text-transform:none;display:inline-flex;align-items:center;gap:6px}
+body .cfoot .status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
+/* Im Eingang ist «In inbox» auf jeder Karte dieselbe Aussage */
+body #v-inbox .cfoot .status.st-inbox{visibility:hidden}
+body .cfoot{gap:2px}
+body .pbadge{border-color:transparent;background:rgba(0,0,0,.45)}
+body td .pbadge,body .cell-title .pbadge,body .dj-set .pbadge,body .qitem .pbadge{background:var(--surface-2)}
+
+/* ---------- 6. Entdecken ---------- */
+body .filters{border-right-color:var(--hair)}
+body .fgroup{margin-bottom:var(--s4)}
+/* Stichwörter: aufklappbar, zu = eine Zeile mit Zählern */
+.fdisc{margin:0 0 var(--s4);border-top:1px solid var(--hair);border-bottom:1px solid var(--hair)}
+.fdisc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:var(--s2);padding:10px 0;font:500 13px/18px var(--f-body);color:var(--text);outline:none}
+.fdisc>summary::-webkit-details-marker{display:none}
+.fdisc>summary::after{content:"";margin-left:auto;width:6px;height:6px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg) translate(-2px,-2px);transition:transform var(--t-med)}
+.fdisc[open]>summary::after{transform:rotate(-135deg) translate(-2px,-2px)}
+.fdisc>summary small{font:12px var(--f-body);color:var(--muted)}
+.fdisc>summary:hover span,.fdisc>summary:focus-visible span{color:var(--accent-hi)}
+.fdisc[open]{padding-bottom:var(--s3)}
+.fdisc[open]>summary small{display:none}
+/* Stichwort-Tags ohne Rahmen */
+body .tags{border-color:var(--hair);background:rgba(0,0,0,.35)}
+body .tags .tag{border-color:transparent}
+body .bulkbar .count,body .search-info{font-family:var(--f-body)}
+body #sel-all{color:var(--muted)}
+
+/* ---------- 7. Eingang ---------- */
+body .chip.src{border-color:transparent;background:var(--surface)}
+body .chip.src.on{border-color:transparent;background:var(--surface-2)}
+
+/* ---------- 8. Watchlist ---------- */
+body .wl-table td{padding-top:9px;padding-bottom:9px}
+body .wl-table .std{color:var(--dim)}
+body .wl-table td.act .btn[data-act=check]{background:transparent;color:var(--text)}
+body .wl-table td.act .btn[data-act=check]:hover:not(:disabled){background:var(--surface-2)}
+
+/* ---------- 9. Downloads ---------- */
+body .qitem{border-color:transparent}
+body .qitem.active{border-color:var(--acid)}
+body .qitem.failed{border-color:rgba(255,59,92,.4)}
+body .qitem .btn:not(.primary){background:transparent;color:var(--muted)}
+body .qitem .btn:not(.primary):hover:not(:disabled){background:var(--surface-2);color:var(--text)}
+body .section-label::after{background:var(--hair)}
+body .section-label .q-summary{font-family:var(--f-body)}
+
+/* ---------- 10. Bibliothek ---------- */
+/* Unteransichten als ruhige Tabs direkt am Titel, Suche + Ansicht rechts */
+body #v-library .view-head .actions:has(#lib-tools){flex:1;margin-left:var(--s5);gap:2px;min-width:0}
+body #v-library .view-head .actions:has(#lib-tools)>.btn.ghost{padding:6px 12px}
+body #v-library .view-head #lib-tools{margin-left:auto}
+/* Kennzahlen: eine Zeile statt vier Kästen */
+body .lib-top{padding-top:var(--s3)}
+body .lib-stats{display:flex;align-items:center;gap:var(--s5);padding:0 0 var(--s1)}
+body .lib-stats .stat{background:none;border:0;padding:0;display:flex;align-items:baseline;gap:var(--s2);flex:none}
+body .lib-stats .stat .k{order:2}
+body .lib-stats .stat .v{margin:0;font-size:22px;line-height:28px}
+body .lib-stats .stat .v small{font-size:13px}
+body .lib-stats .stat.genres{flex:1;min-width:0;display:grid;grid-template-columns:minmax(120px,1fr) auto;align-items:center;gap:var(--s4)}
+body .lib-stats .stat.genres .k{display:none}
+body .lib-stats .stat.genres .gbar{margin:0;height:4px}
+body .lib-stats .stat.genres .glist{margin:0;flex-wrap:nowrap}
+body .gstat{border-color:transparent}
+body .gstat:hover{border-color:transparent;background:var(--surface-2)}
+body .lib-bar{padding:var(--s3) 0}
+body .lib-bar .bar-sep{display:none}
+body .lib-bar .bar-group{margin-left:var(--s3)}
+body .chip.warnchip,body .chip.ruchip{border-color:transparent;background:var(--warn-soft);font:500 12px/20px var(--f-body);letter-spacing:0;text-transform:none}
+/* Zeilen: Genre als Punkt + Text (wie Watchlist), Zusatz-Tags ohne Rahmen, Pfad nur noch im Tooltip/Ordner-Button */
+body .lib-table .gtag{background:none!important;color:var(--text)!important;font:13px/18px var(--f-body);letter-spacing:0;text-transform:none;padding:2px 6px 2px 0;gap:7px}
+body .lib-table .gtag::before{content:"";width:8px;height:8px;border-radius:1px;background:var(--g,var(--muted));flex:none}
+body .lib-table .gtag.edit:hover:not(:disabled),body .lib-table .gtag.edit:focus-visible{box-shadow:none;filter:none;color:var(--accent-hi)}
+body .lib-table .gtag .gm{display:none}
+body .cue-tag,body .ftag{border-color:transparent;background:var(--surface-2)}
+body .lib-table .cell-title small>.lib-path,body .lib-table .cell-title small>span:last-child:not([class]){display:none}
+body .lib-table td{padding-top:9px;padding-bottom:9px}
+body .cl-card{border-color:transparent}
+/* Festival-Kacheln, DJs, Collector: Fläche statt Rahmen, Farbkante bleibt */
+body .fest-tile{border-color:transparent}
+body .dj-card{border-color:transparent}
+body .dj-card:hover,body .dj-card:focus-visible{border-color:transparent;background:var(--panel-2)}
+body .dj-tag{border:0;padding:0;font-size:11.5px}
+body .dj-tag+.dj-tag::before{content:"·";margin-right:6px;color:var(--dim)}
+body .dj-set{border-color:transparent;border-left-color:var(--line-2)}
+body .dj-set:hover{border-color:transparent;border-left-color:var(--accent);background:var(--panel-2)}
+body .co-card{border-color:transparent}
+body .co-stats .stat{border-color:transparent}
+body .co-stat.on{border-color:var(--c)}
+body .co-tools .btn{background:transparent;color:var(--muted);padding-left:8px;padding-right:8px}
+body .co-tools .btn:hover:not(:disabled){background:var(--surface-2);color:var(--text)}
+body .co-table .status,body #co-rows .status{border-style:solid;border-color:transparent;background:color-mix(in srgb,var(--c) 13%,transparent);font-size:10px}
+body #co-rows .status.cst-missing{background:none;border:1px dashed color-mix(in srgb,var(--c) 55%,transparent)}
+
+/* ---------- 11. Protokoll ---------- */
+body .run{border-color:transparent;background:var(--surface)}
+body .run:hover{border-color:transparent;background:var(--surface-2)}
+body .run.ok{border-left-color:var(--acid)} body .run.warn{border-left-color:var(--warn)} body .run.error{border-left-color:var(--error)} body .run.live{border-left-color:var(--info)}
+body .logcol+.logcol{border-left-color:var(--hair)}
+
+/* ---------- 12. Statistik ---------- */
+body .st-card{border-color:transparent}
+
+/* ---------- 13. Einstellungen ---------- */
+body .stabs{border-right-color:var(--hair);padding-top:var(--s2)}
+.stab-group{font:500 11px/16px var(--f-body);color:var(--dim);padding:var(--s4) 22px var(--s1)}
+.stab-group:first-child{padding-top:var(--s2)}
+body .stab{padding-top:6px;padding-bottom:6px}
+body .field{border-bottom-color:transparent;padding:var(--s3) 0}
+body .field+.field{border-top:1px solid var(--hair)}
+body .spane-body h4{margin-top:var(--s6)}
+body .spane-body h4::after{background:var(--hair)}
+/* «Reset» nur zeigen, wenn es etwas zurückzusetzen gibt (Wert ≠ Standard) – sonst erst bei Hover/Fokus */
+body .field .reset:disabled{opacity:0;transition:opacity var(--t-fast)}
+body .field:hover .reset:disabled,body .field:focus-within .reset:disabled{opacity:.35}
+body .field .reset:not(:disabled){color:var(--warn)}
+body .savebar{border-top-color:var(--hair)}
+body .savebar .btn:not(.primary){background:transparent;color:var(--muted)}
+
+/* ---------- 14. Seitenleiste + Statusleiste ---------- */
+/* Tageszähler/nächste Prüfung stehen schon in der Statusleiste – in der Seitenleiste nur noch der Mock-Hinweis */
+body .nav-foot{font-size:0;line-height:0;border-top-color:transparent;padding-top:0}
+body .nav-foot>*:not(.mock-flag),body .nav-foot br{display:none}
+body .nav-foot .mock-flag{font-size:11px;line-height:1.7}
+body .logo{border-bottom-color:var(--hair)}
+body nav{border-right-color:var(--hair)}
+body .view-head{border-bottom-color:var(--hair)}
+/* Statusleiste: Inter, gedämpft; Werkzeuge als ein «System OK», solange alles grün ist */
+body footer{font:12px/1 var(--f-body);letter-spacing:0;color:var(--dim);border-top-color:var(--hair);gap:var(--s5)}
+body footer b{color:var(--muted);font-weight:500}
+body footer .led{width:6px;height:6px;box-shadow:none}
+footer .sb-sys{display:none}
+footer:not(:has(#sb-ytdlp-led:is(.warn,.err,.off),#sb-deno-led:is(.warn,.err,.off),#sb-ffmpeg-led:is(.warn,.err,.off),#sb-pot-led:is(.warn,.err,.off))) .sb-sys{display:flex}
+footer:not(:has(#sb-ytdlp-led:is(.warn,.err,.off),#sb-deno-led:is(.warn,.err,.off),#sb-ffmpeg-led:is(.warn,.err,.off),#sb-pot-led:is(.warn,.err,.off))) .it:has(>#sb-deno-led,>#sb-ffmpeg-led,>#sb-pot-led){display:none}
+/* Backoff nur zeigen, wenn einer läuft */
+footer .it:has(>#sb-backoff-led.off){display:none}
+body footer .it.alert,body footer .it.alert b{color:var(--warn)}
+
+/* ---------- 15. Nachträge ---------- */
+/* Protokoll: Spaltentitel nie abschneiden – die Zusammenfassung weicht aus */
+body .colhead h3{flex:none;overflow:visible}
+body .colhead .colmeta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--f-body)}
+/* Statistik-Kacheln wie alle anderen Kennzahlen */
+body .st-kpi{border-color:transparent}
+body .st-kl{font:var(--lbl);letter-spacing:0;text-transform:none;color:var(--muted)}
+/* Track-Ranglisten (Tracks, DJ-Seite): Zeilen ohne Rahmen */
+body .tr-top-row{border-color:transparent}
+body .tr-top-row:hover,body .tr-top-row:focus-visible{border-color:transparent;background:var(--panel-2)}
+body .tr-top{border-bottom-color:var(--hair)}
+body .dj-tracks li{border-color:transparent}
diff -ruN ui/index.html /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/index.html
--- ui/index.html	2026-11-19 05:31:43.112398714 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/index.html	2026-11-20 05:59:37.995342909 +0000
@@ -15,6 +15,7 @@
 <link rel="stylesheet" href="css/theme.css">
 <link rel="stylesheet" href="css/components.css">
 <link rel="stylesheet" href="css/effects.css">
+<link rel="stylesheet" href="css/clean.css">
 </head>
 <body>
 
@@ -59,6 +60,7 @@
 
 <!-- Statusleiste -->
 <footer>
+  <span class="it sb-sys" id="sb-sys-it" title="yt-dlp · Deno · ffmpeg · PO token"><span class="led"></span>System <b>OK</b></span>
   <span class="it"><span class="led off" id="sb-ytdlp-led"></span>yt-dlp <b id="sb-ytdlp">–</b></span>
   <span class="it"><span class="led off" id="sb-deno-led"></span>Deno <b id="sb-deno">–</b></span>
   <span class="it"><span class="led off" id="sb-ffmpeg-led"></span>ffmpeg <b id="sb-ffmpeg">–</b></span>
diff -ruN ui/js/components.js /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/components.js
--- ui/js/components.js	2026-11-19 09:10:22.941468010 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/components.js	2026-11-20 06:02:31.583145298 +0000
@@ -252,7 +252,7 @@
   }, true);
   /** Genre-Badge. o: {edit: klickbar (data-act="genre"), manual: von Hand gesetzt, busy: wird gerade neu getaggt} */
   ui.gtag = (genre, o) => {
-    const opt = o || {}, style = `background:${HC.genres.color(genre)};color:${HC.genres.ink(genre)}`;
+    const opt = o || {}, style = `--g:${HC.genres.color(genre)};background:${HC.genres.color(genre)};color:${HC.genres.ink(genre)}`;
     const mark = opt.manual ? `<i class="gm" title="${esc(t('genre.manual'))}"></i>` : '';
     if (!opt.edit) return `<span class="gtag" style="${style}">${esc(genre)}${mark}</span>`;
     return `<button type="button" class="gtag edit${opt.busy ? ' busy' : ''}" data-act="genre" style="${style}" title="${esc(t(opt.manual ? 'genre.change_manual' : 'genre.change'))}" aria-haspopup="menu"${opt.busy ? ' disabled' : ''}>${opt.busy ? '<span class="spinner"></span>' : ''}${esc(genre)}${opt.manual && !opt.busy ? '<i class="gm"></i>' : ''}</button>`;
diff -ruN ui/js/views/discover.js /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/discover.js
--- ui/js/views/discover.js	2026-11-19 09:10:29.027318926 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/discover.js	2026-11-20 05:59:37.996292990 +0000
@@ -427,10 +427,12 @@
               <label><span>${t('discover.f_to')}</span><input class="input mono" id="f-to" type="date" min="${MIN_YEAR}-01-01"></label>
             </div>
             <p class="fhint" id="f-date-hint" hidden></p></div>
+          <details class="fdisc" id="f-kw"><summary><span>Keywords</span><small id="f-kw-n"></small></summary>
           ${['inc', 'exc'].map((k) => `<div class="fgroup"><label class="lbl">${t('discover.f_' + k)}</label>
             <div class="kwbox"><div id="t-${k}"></div><button type="button" class="kw-clear" id="c-${k}" data-kwclear="${k}" title="${util.esc(t('discover.kw_clear'))}" aria-label="${util.esc(t('discover.kw_clear'))}" hidden>${I.trash}</button></div>
             <div class="kw-suggs" id="s-${k}" data-key="${k}" aria-label="${util.esc(t('discover.kw_sugg_label'))}" hidden></div></div>`).join('')}
           <p class="fhint kw-hint">${t('discover.kw_session_hint')}</p>
+          </details>
           <div class="fgroup"><label class="lbl">${t('discover.f_show')}</label>
             <label class="check"><input type="checkbox" id="f-hide">${t('discover.f_hide')}</label>
             <label class="check"><input type="checkbox" id="f-blacklist">${t('discover.f_blacklist')}</label></div>
@@ -452,6 +454,8 @@
     const onKw = (key) => (list) => { f[key] = list; renderKw(key); renderGrid(); };
     incEd = ui.chips($('#t-inc', el), { list: f.inc, kind: 'inc', onChange: onKw('inc') });
     excEd = ui.chips($('#t-exc', el), { list: f.exc, kind: 'exc', onChange: onKw('exc') });
+    const kwN = () => { $('#f-kw-n', el).textContent = `${f.inc.length} include · ${f.exc.length} exclude`; };
+    kwN(); $('#f-kw', el).addEventListener('toggle', kwN); el.addEventListener('click', () => setTimeout(kwN, 0));
     syncControls();
 
     paintPlatform();
diff -ruN ui/js/views/settings.js /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/settings.js
--- ui/js/views/settings.js	2026-11-19 05:31:58.706388667 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/settings.js	2026-11-20 05:59:49.560605826 +0000
@@ -1370,9 +1370,16 @@
     paintChrome();
   }
   function paintChrome() {
-    $('#stabs', el).innerHTML = TABS.filter((tab) => !tab.hidden).map((tab) => {
+    const GROUPS = [['App', ['general', 'appearance', 'playback', 'notifications']], ['Find & sort', ['filters', 'genres', 'festivals', 'reupload']],
+      ['Download', ['download', 'storage', 'throttle', 'network', 'schedule']], ['Sources & servers', ['soundcloud', 'sources', 'mediaserver']], ['System', ['maintenance']]];
+    const gOf = (id) => GROUPS.findIndex((g) => g[1].includes(id));
+    const gPos = (id) => { const g = gOf(id); return g < 0 ? 999 : g * 100 + GROUPS[g][1].indexOf(id); };
+    let lastG = -1;
+    $('#stabs', el).innerHTML = TABS.filter((tab) => !tab.hidden).slice().sort((a, b) => gPos(a.id) - gPos(b.id)).map((tab) => {
+      const g = gOf(tab.id), head = g !== lastG && g >= 0 ? `<div class="stab-group">${GROUPS[g][0]}</div>` : '';
+      lastG = g;
       const nErr = errorsOf(tab).length, dirty = tabKeys(tab).some(isDirtyKey);
-      return `<div class="stab${tab.id === cur ? ' active' : ''}" data-tab="${tab.id}" tabindex="0" role="tab" aria-selected="${tab.id === cur}">${t('tabs.' + tab.id)}${nErr ? `<span class="mark err">${nErr}</span>` : dirty ? '<span class="mark dirty"></span>' : ''}</div>`;
+      return head + `<div class="stab${tab.id === cur ? ' active' : ''}" data-tab="${tab.id}" tabindex="0" role="tab" aria-selected="${tab.id === cur}">${t('tabs.' + tab.id)}${nErr ? `<span class="mark err">${nErr}</span>` : dirty ? '<span class="mark dirty"></span>' : ''}</div>`;
     }).join('');
     const n = dirtyKeys().length, nErr = Object.keys(errors).length;
     const bar = $('#savebar', el);
diff -ruN ui/js/views/watchlist.js /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/watchlist.js
--- ui/js/views/watchlist.js	2026-11-18 23:53:37.589285299 +0000
+++ /tmp/claude-0/-home-user-HCLoader/83c7e0d0-a7e1-570c-97af-fb075559cf61/scratchpad/ui-clean/ui/js/views/watchlist.js	2026-11-20 05:59:37.995976131 +0000
@@ -123,9 +123,8 @@
       <td class="num">${s.new_count ? `<button type="button" class="badge" data-act="inbox" title="${esc(t('watchlist.new_title'))}">${esc(s.new_count)}</button>` : '<span class="mono muted">–</span>'}</td>
       <td class="act">
         <button class="btn sm ghost" data-act="check" title="${esc(lock || t('watchlist.check_title'))}" ${lock ? 'disabled' : ''}>${t('watchlist.check')}</button>
-        ${bfButton(s)}
-        <button class="iconbtn" data-act="edit" title="${esc(t('common.edit'))}">${I.edit}</button>
-        <button class="iconbtn danger" data-act="del" title="${esc(t('common.delete'))}">${I.trash}</button>
+        <span class="row-more-src" hidden>${bfButton(s)}<button data-act="edit"></button><button data-act="del"></button></span>
+        <button class="iconbtn" data-act="more" title="More" aria-haspopup="menu">${I.more}</button>
       </td></tr>${bfRow(s)}`;
   }
 
@@ -468,6 +467,15 @@
           if (r) ui.toast(r.error || Object.values(r.errors || {})[0] || t('watchlist.form_error'), 'err');
         }
         setTimeout(() => render(), HC.fx.reduced() ? 0 : 180);
+      } else if (act === 'more') {
+        const src = b.parentElement.querySelector('.row-more-src');
+        const bf = src.querySelector('[data-act=bf]');
+        ui.menu(b, [
+          { label: t('backfill.action'), icon: I.layers, key: 'bf', disabled: bf.disabled, onClick: () => bf.click() },
+          { label: t('common.edit'), icon: I.edit, key: 'edit', onClick: () => src.querySelector('[data-act=edit]').click() },
+          'sep',
+          { label: t('common.delete'), icon: I.trash, key: 'del', danger: true, onClick: () => src.querySelector('[data-act=del]').click() },
+        ]);
       } else if (act === 'check') {
         check([s.id]);
       } else if (act === 'bf') {
````
