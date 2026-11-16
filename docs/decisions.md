# Entscheide

Kurze Notizen zu Architekturentscheiden (Datum, Entscheid, Grund).

## 2026-11-16 – Download-Archiv schreibt HCLoader, nicht yt-dlp (Review M2)

- **Entscheid:** `download_archive` wird nicht mehr an yt-dlp gegeben. `YtClient` liest `archive.txt`
  selbst (Skip-Prüfung, `in_archive`) und hängt `youtube <id>` erst an, nachdem das Video getaggt,
  verschoben und in der DB als `done` gespeichert ist (`_record_archive`).
- **Grund:** yt-dlp schreibt das Archiv direkt nach dem Download, vor Tagging und Verschieben. Ein harter
  Abbruch in diesem Fenster blockierte ein Video dauerhaft als "bereits geladen". Jetzt gibt es kein
  Fenster mehr. Das Archiv bleibt im yt-dlp-Format (`youtube <id>`), bleibt also mit yt-dlp kompatibel.
- Beim App-Start werden `downloading`-Zeilen (Absturz) auf `failed` mit "Unterbrochen" gesetzt
  (`Database.reset_interrupted_downloads`), aber nur, solange kein Download-Lauf aktiv ist (Lauf-Lock).

## 2026-11-16 – Kein `max_downloads` bei yt-dlp (Review B1)

- **Entscheid:** B1 wird über die Video-ID-Pflicht in `YtClient.download` gelöst (andere URLs werden vor
  dem Throttle abgelehnt, die URL an yt-dlp wird immer aus der ID neu gebaut), dazu `playlist_items: "1"`
  und ein Fehler, falls `info["_type"] == "playlist"`. `max_downloads: 1` wird bewusst **nicht** gesetzt.
- **Grund:** Geprüft gegen `yt_dlp/YoutubeDL.py` 2026.10.26 (`check_max_downloads`, Z. ~3367/3677): Nach dem
  ersten erfolgreichen Download wirft yt-dlp `MaxDownloadsReached` aus `extract_info` und verwirft das Info-Dict.
  Ein normaler Einzel-Download würde dadurch als Fehler enden.

## 2026-11-16 – Pause zwischen Downloads zentral im Throttle (Review M4/M5)

- `Throttle.before_request("download")` erzwingt die zufällige Pause `sleep_interval`..`max_sleep_interval`
  seit dem Ende des letzten Downloads (`state.last_download_end`, überlebt Neustarts). Vor dem Download wird
  gewartet, nicht nach dem letzten. Die Wartezeit ist über `cancel_event` abbrechbar (`WaitCancelled`).
- Ein Download-Versuch zählt gegen Lauf-/Tageslimit, sobald `before_request` ihn freigibt (atomar mit der
  Limitprüfung). Fehlversuche zählen, Skips nie, der eine Netzwerk-Retry nicht doppelt.
- Der Throttle hält einen `RLock` (Zähler, Backoff, Request-Abstand inkl. Sleep) und einen separaten
  Lock für die lange Download-Pause, damit Suchen währenddessen nicht blockieren. Mehrere Prozesse
  schliesst der Lauf-Lock (`app/core/locks.py`) aus; `BEGIN IMMEDIATE` ist deshalb nicht nötig.

## 2026-11-16 – PO-Token-TTL in ganzen Stunden (Review m8)

- **Entscheid:** `TOKEN_TTL` wird als ganze Stunden gesetzt: `max(1, round(po_token_ttl_hours))`. Die
  Schema-Grenze 0.5-48 bleibt; ein Wert wie 0.5 wird auf 1 aufgerundet, 6.6 auf 7.
- **Grund:** Die README von bgutil-ytdlp-pot-provider 2.0.2 dokumentiert `TOKEN_TTL` "in hours, defaults to 6"
  und nennt es für den Script-Modus (Token-Cache in `generate_once`); das yt-dlp-Plugin startet den
  Prozess mit der Umgebung des Elternprozesses. Der Server-Quellcode liegt lokal nicht vor, deshalb wird
  nicht davon ausgegangen, dass Bruchteile korrekt geparst werden. Im HTTP-Modus erbt der Kindprozess
  die Variable beim Start; eine Änderung wirkt dort erst nach Neustart des Servers.
- Offen für den Orchestrator: Schema/GUI-Hinweis "ganze Stunden" (Typ `float`, Grenze 0.5).

## 2026-11-16 – Prozess-Locks (Review m13)

- `app/core/locks.py`: `acquire_single_instance()` (GUI) und `acquire_run_lock()` (ein Download-Lauf, egal ob
  GUI-Worker, Headless oder Smoke). Windows: benannter Mutex `Local\HCLoader.<name>` per ctypes; sonst bzw.
  bei Fehler: OS-Dateilock (`msvcrt.locking`/`fcntl.flock`) unter `<app_home>/locks/`, wird vom OS beim
  Prozessende freigegeben (keine veralteten Lock-Dateien).
- Der Worker (Phase 3) muss `acquire_run_lock()` für die Dauer eines Laufs halten und am Ende
  `Throttle.finish_run(success)` aufrufen (Backoff-Reset nach erfolgreichem Lauf, SPEC §5).
