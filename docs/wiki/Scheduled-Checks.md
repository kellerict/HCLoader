![](images/divider.svg)

HCLoader can check your watchlist automatically in two ways. You can use either or both.

## In the app

While the app is open it checks the watchlist every *watchlist_interval_hours* (default 24 h;
Settings, Zeitplan). Without a previous run it checks about 60 seconds after start. It never checks
while a backoff is active. The next check time is shown in the status bar and in the Watchlist header.

## Windows Task Scheduler (headless)

In Settings, Zeitplan, **Windows-Aufgabenplanung**, the app can create or remove a scheduled task
named `HCLoader-Watchlist`:

- starts daily at the configured time (default `03:00`),
- runs only while you are logged on (no password is stored),
- if the computer was off at that time, it runs as soon as possible afterwards,
- works on battery, does not start a second copy while one runs, time limit 6 hours.

The task starts HCLoader without a window:

```
python -m app.main --headless --run-watchlist
```

(you can run exactly this yourself, for example with `HCLoader-Konsole.cmd --headless --run-watchlist`
in the portable build).

### What a headless run does

1. Takes the run lock and the watchlist lock (exits with code 4 if another run holds one).
2. Starts the PO-token server if the mode needs it (or reuses the one of an open app window).
3. Checks all enabled sources incrementally.
4. Downloads the queued videos sequentially through the normal queue; the per-run and per-day limits
   still apply and the rest stays queued.
5. Releases the run and watchlist locks, then continues an interrupted
   [«Read everything (once)»](Watchlist-and-Inbox#read-everything-once) with a budget of
   `watchlist.backfill_requests_per_hour` requests (default 120, about one hour). Paused backfills
   are left alone. While it reads, an open app window keeps working normally: downloads, watchlist
   checks and searches run in between (the pacing wait blocks nothing), and a yt-dlp update stops
   the scheduled backfill before its next request (it continues later).

   **Only backfills that fit.** A scheduled run only takes on a backfill it can *finish* within its
   budget: setup requests + the pages before the saved position (they have to be requested again,
   YouTube and SoundCloud only know "next page") + the remaining pages. HCLoader learns the real
   page size from earlier runs. A backfill that does not fit is not touched at all (no request);
   its note says «Too large for a scheduled run (N requests …)» and it continues in the app,
   which has no budget. Raising «Requests per hour» to at least N lets scheduled runs finish it.
   Example: a YouTube channel with a cap of 5000 entries needs about 168 requests – with 120 per
   hour it is read in the app; with the default cap of 2000 (68 requests) a scheduled run finishes
   it. A partial scheduled run would not help: the next continuation would have to request all its
   pages again.
6. Writes one `headless` entry into the run history (Protokoll, shown as "Aufgabenplanung").

### Exit codes

| Code | Meaning |
|---|---|
| 0 | OK |
| 1 | Errors during the run (sources, downloads, unexpected error, local problem) |
| 2 | Blocked by backoff or throttle (active at start or triggered during the run) |
| 3 | Wrong command line |
| 4 | Another run holds the run or watchlist lock (app or headless) |

### Moving the app

The task contains absolute paths. If you move the folder (portable build), the app shows "app was
moved, re-create the task" and one click re-creates it. It does not do so automatically, in case
you have two copies.

---

[← File naming and tags](File-Naming-and-Tags) · [🏠 Home](Home) · [Supported sources →](Supported-Sources)
