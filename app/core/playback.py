"""Player memory (v0.7.0): remembered playback position per set and the «continue listening»
list. Local DB only (table `playback`), no network.

Rules (docs/decisions.md «Player memory»):
- Positions in the first or last `MARGIN_S` seconds are not remembered: the row is removed
  (just started = nothing to resume; near the end = finished).
- «Continue listening» = the most recently updated unfinished sets that are still in the
  library (status `done`), newest first.
- `player.resume == "off"` stores nothing (the UI does not call `save_position` then; the
  backend checks it as well) and the list is empty.
"""

from __future__ import annotations

from typing import Any

from .config import Settings
from .db import Database, now_iso

MARGIN_S = 30.0
CONTINUE_LIMIT = 5
MAX_LIMIT = 20


def resumable(position: float | None, duration: float | None) -> bool:
    """True if `position` is worth remembering (outside the first/last 30 s)."""
    try:
        pos = float(position or 0)
    except (TypeError, ValueError):
        return False
    if pos != pos or pos < MARGIN_S:  # NaN or just started
        return False
    if duration:
        try:
            dur = float(duration)
        except (TypeError, ValueError):
            return True
        if dur > 0 and pos > dur - MARGIN_S:
            return False
    return True


def save(
    db: Database,
    settings: Settings,
    video_id: str,
    position: Any,
    duration: Any = None,
) -> dict[str, Any]:
    """Remember or clear the position. -> {ok, stored}."""
    if settings.player.resume == "off":
        return {"ok": True, "stored": False}
    row = db.get_video(video_id)
    if not row or row.get("status") != "done":
        return {"ok": False, "stored": False}
    try:
        pos = float(position)
    except (TypeError, ValueError):
        return {"ok": False, "stored": False}
    dur: float | None
    try:
        dur = float(duration) if duration not in (None, "") else None
    except (TypeError, ValueError):
        dur = None
    if not dur or dur <= 0:
        dur = float(row["duration"]) if row.get("duration") else None
    if not resumable(pos, dur):
        forget(db, video_id)
        return {"ok": True, "stored": False}
    db.execute(
        "INSERT INTO playback(video_id, position, duration, updated) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(video_id) DO UPDATE SET position = excluded.position, "
        "duration = excluded.duration, updated = excluded.updated",
        (video_id, round(pos, 2), dur, now_iso()),
    )
    return {"ok": True, "stored": True}


def forget(db: Database, video_id: str) -> None:
    db.execute("DELETE FROM playback WHERE video_id = ?", (video_id,))


def get(db: Database, settings: Settings, video_id: str) -> dict[str, Any] | None:
    """{position, duration, updated} to resume from, or None."""
    if settings.player.resume == "off":
        return None
    row = db.query_one(
        "SELECT position, duration, updated FROM playback WHERE video_id = ?", (video_id,)
    )
    if not row or not resumable(row["position"], row.get("duration")):
        return None
    return {"position": row["position"], "duration": row.get("duration"), "updated": row["updated"]}


def continue_listening(
    db: Database, settings: Settings, limit: Any = CONTINUE_LIMIT
) -> list[dict[str, Any]]:
    """Last unfinished sets (newest first) that are still in the library."""
    if settings.player.resume == "off":
        return []
    try:
        n = max(1, min(MAX_LIMIT, int(limit)))
    except (TypeError, ValueError):
        n = CONTINUE_LIMIT
    rows = db.query(
        "SELECT p.video_id AS id, p.position, COALESCE(p.duration, v.duration) AS duration, "
        "p.updated, v.title, v.channel_name AS artist, v.genre, v.platform "
        "FROM playback p JOIN videos v ON v.id = p.video_id "
        "WHERE v.status = 'done' ORDER BY p.updated DESC, p.video_id LIMIT ?",
        (n * 2,),
    )
    out = [r for r in rows if resumable(r["position"], r.get("duration"))]
    return out[:n]
