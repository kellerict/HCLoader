"""Probable duplicates across platforms (Phase 7a): the same mix on YouTube and SoundCloud.
v0.10.0 (`reupload.precheck`): also on the same platform (a re-upload under another id),
before any download and without a request; the audio fingerprint (core/fingerprint.py)
confirms re-uploads only after the download.

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
from .i18n import tr
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


def find_duplicate(
    db: Any, video: Mapping[str, Any], *, same_platform: bool = False
) -> dict | None:
    """`duplicate_of` for a video dict ({id, platform, title}) or None. `same_platform`:
    candidates of the video's own platform count as well (re-upload pre-check)."""
    duration = video.get("duration")
    if not isinstance(duration, (int, float)) or duration <= 0:
        return None
    platform = video.get("platform") or platform_of(video.get("id"))
    cands = db.duplicate_candidates(
        platform,
        int(duration),
        tolerance=DURATION_TOLERANCE_S,
        statuses=DUPLICATE_STATUSES,
        **({"same_platform": True} if same_platform else {}),
    )
    cands = [c for c in cands if c.get("id") != video.get("id")]
    if same_platform:
        # review v0.10.0 m6: on the same platform, weekly shows with long, mostly equal titles
        # ("… Radio Episode 101" / "… 102", both 60:00) are no re-upload - numbers must agree
        nums = number_tokens(video.get("title"))
        cands = [
            c
            for c in cands
            if (c.get("platform") or platform_of(c.get("id"))) != platform
            or number_tokens(c.get("title")) == nums
        ]
    return best_match(video, cands)


def number_tokens(title: str | None) -> set[str]:
    """Numbers in a title (episode, year, edition), leading zeros ignored."""
    return {t.lstrip("0") or "0" for t in title_tokens(title) if t.isdigit()}


def reason(dup: Mapping[str, Any]) -> str:
    """German filter reason for a hidden duplicate."""
    return tr("filter.duplicate", platform=label(dup.get("platform")))
