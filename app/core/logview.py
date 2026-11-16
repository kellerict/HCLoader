"""Log view (Phase 5): filter LogLine dicts and describe `runs` rows for the UI."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime
from typing import Any

LEVEL_RANK = {"debug": 0, "info": 1, "ok": 1, "warn": 2, "error": 3}
LOG_LIMIT_MAX = 5000
RUNS_LIMIT_DEFAULT = 50
RUNS_LIMIT_MAX = 500
RUN_KINDS = ("watchlist", "headless", "manual")


def _int(value: Any, default: int, lo: int, hi: int) -> int:
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def filter_lines(
    lines: Sequence[dict[str, Any]], filters: Mapping[str, Any] | None = None
) -> list[dict[str, Any]]:
    """filters: `levels` (list of exact levels) or `level` (minimum: debug < info/ok < warn <
    error), `search` (case-insensitive substring of the message), `limit` (the last N lines)."""
    f = filters or {}
    levels = f.get("levels")
    out = list(lines)
    if isinstance(levels, (list, tuple, set)) and levels:
        wanted = {str(x) for x in levels}
        out = [ln for ln in out if ln.get("level") in wanted]
    elif f.get("level") in LEVEL_RANK:
        floor = LEVEL_RANK[f["level"]]
        out = [ln for ln in out if LEVEL_RANK.get(ln.get("level"), 1) >= floor]
    needle = str(f.get("search") or "").strip().casefold()
    if needle:
        out = [ln for ln in out if needle in str(ln.get("msg", "")).casefold()]
    if f.get("limit") is not None:
        n = _int(f["limit"], len(out), 1, LOG_LIMIT_MAX)
        out = out[-n:]
    return out


def _parse(ts: str | None) -> datetime | None:
    try:
        return datetime.fromisoformat(ts) if ts else None
    except ValueError:
        return None


def run_info(row: Mapping[str, Any]) -> dict[str, Any]:
    """`runs` row -> Run (bridge.js) incl. `duration` in seconds (null while running)."""
    kind = row.get("kind")
    start, end = _parse(row.get("started")), _parse(row.get("finished"))
    duration = None
    if start and end:
        try:
            duration = max(0, int((end - start).total_seconds()))
        except TypeError:  # naive vs aware
            duration = None
    return {
        "id": row["id"],
        "kind": kind if kind in RUN_KINDS else "manual",
        "started": row.get("started"),
        "finished": row.get("finished"),
        "duration": duration,
        "found": row.get("found") or 0,
        "downloaded": row.get("downloaded") or 0,
        "errors": row.get("errors") or 0,
        "note": row.get("note") or "",
    }


def runs_limit(filters: Mapping[str, Any] | None) -> int:
    return _int((filters or {}).get("runs_limit"), RUNS_LIMIT_DEFAULT, 1, RUNS_LIMIT_MAX)
