![](images/divider.svg)

HCLoader can check your watchlist automatically in two ways. You can use either or both.

## In the app

While the app is open it checks the watchlist every *watchlist_interval_hours* (default 24 h;
Settings, Zeitplan). Without a previous run it checks about 60 seconds after start. It never checks
while a backoff is active. The next check time is shown in the sidebar and status bar.

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
5. Continues an interrupted [«Read everything (once)»](Watchlist-and-Inbox#read-everything-once)
   for at most `watchlist.backfill_requests_per_hour` requests (default 120, about one hour); the
   rest follows in the next run. Paused backfills are left alone.
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
