"""Probable duplicates across platforms (Phase 7a): the same mix on YouTube and SoundCloud.

A hit counts as «vermutlich bereits geladen (<Plattform>)» if a video of the *other* platform
with status done/queued/downloading has the same duration (+-5 s) and a similar normalised title
(token Jaccard >= 0.8). Pure logic plus one indexed DB query (`videos(platform, duration)`).
Nothing is hidden automatically: `filters.hide_cross_platform_duplicates` decides (default off);
the watchlist never auto-downloads such a hit (inbox instead).
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from typing import Any

from .filters import normalize
from .platforms import label, platform_of

DURATION_TOLERANCE_S = 5
MIN_JACCARD = 0.8
# rows that count as "already loaded or about to be": a duplicate of these is not wanted twice
DUPLICATE_STATUSES = ("done", "queued", "downloading")
# words that say nothing about the mix itself (platform/format noise)
_NOISE = {
    "official",
    "video",
    "audio",
    "hq",
    "hd",
    "full",
    "free",
    "download",
    "dl",
    "the",
    "a",
    "and",
    "of",
    "by",
    "ft",
    "feat",
    "x",
}
_TOKEN_RE = re.compile(r"[^\W_]+")


def title_tokens(title: str | None) -> set[str]:
    """Normalised word set (case, accents, punctuation, noise words removed)."""
    return {t for t in _TOKEN_RE.findall(normalize(title)) if t not in _NOISE}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def is_duplicate(
    a: Mapping[str, Any],
    b: Mapping[str, Any],
    *,
    tolerance: int = DURATION_TOLERANCE_S,
    min_jaccard: float = MIN_JACCARD,
) -> bool:
    da, db_ = a.get("duration"), b.get("duration")
    if not isinstance(da, (int, float)) or not isinstance(db_, (int, float)):
        return False
    if abs(da - db_) > tolerance:
        return False
    return jaccard(title_tokens(a.get("title")), title_tokens(b.get("title"))) >= min_jaccard


def best_match(video: Mapping[str, Any], candidates: Iterable[Mapping[str, Any]]) -> dict | None:
    """The most similar candidate that counts as duplicate (or None)."""
    tokens = title_tokens(video.get("title"))
    best: tuple[float, Mapping[str, Any]] | None = None
    for cand in candidates:
        if not is_duplicate(video, cand):
            continue
        score = jaccard(tokens, title_tokens(cand.get("title")))
        if best is None or score > best[0]:
            best = (score, cand)
    if best is None:
        return None
    cand = best[1]
    platform = cand.get("platform") or platform_of(cand.get("id"))
    return {"id": cand.get("id"), "platform": platform, "title": cand.get("title") or ""}


def find_duplicate(db: Any, video: Mapping[str, Any]) -> dict | None:
    """`duplicate_of` for a video dict ({id, platform, title}) or None."""
    duration = video.get("duration")
    if not isinstance(duration, (int, float)) or duration <= 0:
        return None
    platform = video.get("platform") or platform_of(video.get("id"))
    cands = db.duplicate_candidates(
        platform,
        int(duration),
        tolerance=DURATION_TOLERANCE_S,
        statuses=DUPLICATE_STATUSES,
    )
    return best_match(video, [c for c in cands if c.get("id") != video.get("id")])


def reason(dup: Mapping[str, Any]) -> str:
    """German filter reason for a hidden duplicate."""
    return f"Vermutlich bereits geladen ({label(dup.get('platform'))})"
