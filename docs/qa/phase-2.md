# QA Phase 2 – GUI-Grundgerüst

Ergebnis: **BESTANDEN** (Windows-only-Punkte offen, siehe unten)

## Befunde pro Kriterium
| Prüfung | Beleg |
|---|---|
| `ruff check .` | All checks passed |
| `ruff format --check .` | 60 files already formatted |
| `pytest -q` | alle Tests grün (ca. 361) |
| `scripts/ui_screenshots.py --out /tmp/claude-0/qa2-shots` | Exit 0, 32 Screenshots; alle 10 Settings-Tabs vorhanden (Allgemein, Filter & Keywords, Genres, Download & Qualität, Ablage & Tags, Schonung, Netzwerk & PO-Token, Zeitplan, Darstellung, Wartung) |
| (a) Fenster/Theme/Navigation/Statusleiste/Einstellungen | Theme, Navigation, Statusleiste und alle Tabs im Live-Lauf sichtbar (`/tmp/claude-0/qa2/live-*.png`). Fenster selbst: nur unter Windows prüfbar |
| Validierung | Live: `results_count=500` -> Feldfehler "Darf höchstens 100 sein" (`live-02-validation.png`); `max_sleep_interval < sleep_interval` -> "Muss grösser oder gleich dem minimalen Intervall sein" |
| (b) Settings änderbar + nach Neustart erhalten | Live-Bridge-Test (`/tmp/claude-0/qa2/live.py`): echte `app.api.Api` mit Temp-`HCLOADER_HOME` hinter Fake-`window.pywebview.api` in Chromium. 25 Felder aus allen 10 Tabs per UI geändert (Selects, Zahlen, Toggles, Chips, Genre hinzufügen), gespeichert, `config.yaml` geschrieben, Browser zu, neue Api + neuer Browser: alle 25 Werte + Chip + Genre "QA Genre" in der UI wieder sichtbar. 35 Checks, 0 Fehler |
| Zusatz Backend-Roundtrip | Weitere Schlüssel (audio_format=original, limits, po_token_mode=off/port, task_time, reduce_effects, exclude_keywords, path_template etc.) per `save_settings` -> neue Api: 0 Abweichungen |
| (c) Statusleiste echte Versionen | Live: yt-dlp `2026.10.26` == `binaries.status()`; Deno "fehlt" == `deno_ok=False` (PO-Token "Fehler", Detail "Deno fehlt (bin/deno.exe)"); ffmpeg "OK" == `ffmpeg_ok=True`; nach Neustart "Heute 0 / 30" spiegelt neues Tageslimit. Kein Mock-Badge im Live-Modus |
| Schema-Abdeckung | Alle 48 Schlüssel aus `docs/settings-schema.md` = Felder in `app/core/config.py` = Einträge in `ui/js/views/settings.js` (keine fehlenden/überzähligen) |
| Smoke mit echtem YouTube | Von Phase 2 nicht verlangt, nicht ausgeführt |

## Mängel
Keine blockierenden. Hinweise:
- Im Container fehlt Deno, daher PO-Token-Status "Fehler" in der Statusleiste (korrekte Anzeige, Umgebungsbedingt).
- `schedule.task_scheduler_enabled`/Aufgabenplanung im Live-Lauf nicht getestet (Windows).

## Nur unter Windows prüfbar
- Echtes pywebview-/WebView2-Fenster (Titel, Mindestgrösse, Hintergrundfarbe)
- Windows-Aufgabenplanung (schtasks: anlegen/ändern/entfernen)
- Single-Instance-Fokus (zweiter Start bringt Fenster nach vorn)
- Nativer Ordnerdialog (`pick_folder`)
