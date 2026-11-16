# QA Phase 3 – Entdecken & Downloads

Ergebnis: **BESTANDEN** (Windows-only-Punkte offen, Smoke-Test extern blockiert)

## Befunde pro Kriterium
| Prüfung | Beleg |
|---|---|
| `ruff check .` | All checks passed |
| `ruff format --check .` | 64 files already formatted |
| `pytest -q` | alle grün (414 passed); `tests/test_integration_queue.py`: 10 passed in 2.4 s (echte Api/Queue/YtClient/Throttle/Tagging, nur `yt_dlp.YoutubeDL` gefakt) |
| `scripts/ui_screenshots.py --out /tmp/claude-0/qa3-shots` | Exit 0, 41 Screenshots; neu geprüft: discover-year-filter (Jahr 2013, Scope "Hardcore 2013", "Gesucht mit hardcore liveset gabber 2013"), downloads-sleep (Pause-Kachel 0:47 + Countdown), downloads-limit, downloads-backoff |
| Live-End-to-End (`/tmp/claude-0/qa3/live.py`, 14 Checks, 0 Fehler) | Echte `app.api.Api` (Temp-`HCLOADER_HOME`) hinter Fake-`window.pywebview.api` in Chromium; `yt_dlp.YoutubeDL` gefakt (10 Treffer, ungefähre Daten per `timestamp`; Download erzeugt MP3 + Thumbnail via ffmpeg). Events: Fake-Fenster mit `evaluate_js` -> `page.evaluate` (54 Events zugestellt, Event-Weiterleitung funktioniert) |
| Suche -> Karten | 9 sichtbare Karten (1 mit unbekanntem Datum) |
| Jahr-Filter 2013 | `#f-date`=Bestimmtes Jahr, 2013: bleiben 6 Karten: 3 ungefähr 2013, 1 ungefähr 2012 (±1 Toleranz), 1 mit "2013" im Titel trotz Datum 2022, 1 weiteres 2013. Ausgeblendet: 2020, 2018, Datum unbekannt; 2013 zu kurz (Mindestdauer). Hinweistext erklärt Toleranz. Backend-Probe: `filter_reason` "Ausserhalb des Zeitraums" / "Upload-Datum unbekannt" |
| Effektiver Suchbegriff | Erneute Suche mit Jahr: yt-dlp-URL `ytsearch30:hardcore mix 2013`; UI "Gesucht mit: hardcore mix **2013**", Scope-Tag "Suche ergänzt um 2013" (`live-03-effective.png`) |
| Auswahl -> sequenziell laden | 3 Karten gewählt ("Auswahl laden (3)"), Downloads-Ansicht: Fortschritt LADEN 50 % / 2.0 MB/s / ETA, Phasen download/convert gesehen; Pause-Countdown "Pause bis zum nächsten Download – weiter in 0:03" (`live-05-sleep.png`, `live-06-progress.png`). Genau einer zur Zeit, Reihenfolge a, b |
| Throttle sichtbar wirksam | sleep 3 s: Abstand zwischen Download-Starts 5.7 s / 8.9 s (>= 3 s); Kachel "Pause zw. Downloads 3–3 s". Lauf-Limit 2: nach 2 Downloads `blocked_code=run_limit`, Hinweis "Limit erreicht – 2/2 in diesem Lauf. 1 bleibt in der Warteschlange …" + "Neuen Lauf starten"; 3. wartet ("Wartet – Lauf-Limit"), startet auch nach 4 s nicht (`live-07-limit.png`). "Neuen Lauf starten" -> 3. lädt (`live-08-newrun.png`), Queue leer, Kachel Lauf 0/2 -> Heute 3 |
| Dateien auf Platte | `Hardcore/Partyraiser/2013/2013-06-15 - Hardcore Liveset 2013 - Partyraiser [vid2013aaaa].mp3`, `Uptempo/DJ Terror/2013/…`, `Hardcore/Old Skool/2013/…`; ID3 (mutagen): TIT2, TPE1/TPE2=Kanal, TALB, TDRC=2013-xx-xx, TCON=Genre, COMM=URL, APIC Cover |
| Suchlimit | `max_searches_per_hour=1` -> UI-Toast und direkter Api-Aufruf: "Limit «Suchen pro Stunde» erreicht (1/1) – wieder möglich ab 14:55" (`live-11-searchlimit.png`) |
| Smoke mit echtem YouTube | BLOCKIERT: Proxy sperrt YouTube; `MV_SMOKE_URL` nicht gesetzt; nicht umgangen. Von Phase 3 selbst nicht verlangt |

## Mängel
Keine blockierenden. Hinweise:
- Der Standard-Include-Filter (mix/set/liveset …) blendete beim ersten Testlauf Titel ohne Keyword aus ("Kein Include-Keyword") – korrekt, Testdaten angepasst.
- Im Container fehlt Deno (Statusleiste "fehlt"), umgebungsbedingt.
- Beim Wechsel der aktiven Zeile kann kurz ein ausblendendes Element mit "TAGGEN" neben der Pausen-Zeile stehen (Übergangsanimation, kosmetisch).

## Nur unter Windows prüfbar
- Darstellung des `<input type="date">` (Von/Bis) und Jahr-Stepper/Rad in WebView2
- Windows Job Object (Kindprozess-Beendigung), MessageBox bei Fehlern
- Echte Pause/Fortsetzen unter pywebview, echtes `evaluate_js`-Event-Verhalten
- Echter YouTube-Smoke-Test, echte 429-/Backoff-Reaktion, echter ffmpeg-Lauf mit YouTube-Formaten
