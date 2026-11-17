# Downloads and queue

The **Downloads** view shows the queue. There is **one** active download at a time, always.

## What you see

- Counters: this run (for example 1 / 10), today (3 / 25), rate limit (MB/s) and the pause between
  downloads (30 to 120 s by default).
- The active download with phase (**Laden** download, **Konvertieren** convert, **Taggen** tag),
  percentage, speed and ETA.
- Waiting entries with their position, and failed entries with the reason.

## Actions

| Action | Notes |
|---|---|
| Pause / resume queue (**Pausieren**) | A running download finishes; a running throttle pause is cut short. |
| Cancel (**Abbrechen**) | Waiting or failed items go back to "new". An active download is aborted (partial files may remain in `.tmp`). Once the final move into the library has started, the item counts as done. |
| Reorder | Move waiting items up or down. |
| Retry (**Wiederholen**) | Only for failed items; appended at the end. Retries are manual on purpose. |

## Limits

*Max downloads per run* (default 10) and *per day* (default 25) apply to the queue. What does not
fit stays queued and is shown as waiting with the reason ("daily limit", "run limit", "backoff",
"paused"). With two platforms the queue keeps downloading from the one that is not blocked.

## Pipeline

1. Resolve the single video (one metadata request through the throttle).
2. Download the best audio into `<target>\.tmp`.
3. Convert with ffmpeg (MP3 320 kbps CBR by default, or V0 VBR; or keep the original).
4. Write tags, cover, CUE and chapters.
5. Move the file to its final place and record it in the database and the yt-dlp download archive.

Temporary files stay in `.tmp` until tagging succeeded. If you quit during a download, it is
aborted and the item stays queued for the next start.

## Errors

A failed item shows the error, for example `HTTP 403` for members-only videos. Local problems
(for example a target folder that cannot be written, or the PO-token server not running) block the
queue until fixed instead of marking every item as failed; nothing is counted against the limits. 403 and 429 are never retried automatically.
