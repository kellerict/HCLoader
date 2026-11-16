"""Metadata sidecar `<app_home>/meta/<id>.json` for offline re-tagging (Phase 5).

Written after every successful download. It holds exactly what `library.retag` needs to
rebuild tags, CUE and chapters without any network access: title, channel, upload date,
chapters (already resolved from yt-dlp chapters or description timestamps), a shortened
description, thumbnail URL, genre, source. No cookies, no tokens, no request headers. A
sidecar is a plain file (not a DB column): it is large-ish, never queried and can be lost
without damage (re-tagging then falls back to the DB row).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from . import config
from .tagging import Chapter

log = logging.getLogger(__name__)

SIDECAR_VERSION = 1
DESCRIPTION_MAX = 2000
_ID_RE = re.compile(r"^[0-9A-Za-z_-]{1,32}$")


def meta_dir() -> Path:
    return config.app_home() / "meta"


def _check(video_id: str) -> None:
    if not _ID_RE.match(video_id or ""):
        raise ValueError(f"Ungültige Video-ID: {video_id!r}")


def sidecar_path(video_id: str) -> Path:
    """`<id>.<hash>.json`: the short hash of the exact ID keeps IDs that differ only in case apart
    on case-insensitive file systems (Windows)."""
    _check(video_id)
    digest = hashlib.sha1(video_id.encode("utf-8")).hexdigest()[:8]
    return meta_dir() / f"{video_id}.{digest}.json"


def _legacy_path(video_id: str) -> Path:
    _check(video_id)
    return meta_dir() / f"{video_id}.json"


def build(
    meta: Mapping[str, Any],
    *,
    chapters: Iterable[Chapter] = (),
    description: str | None = None,
    genre: str = "",
    source: str = "YouTube",
) -> dict[str, Any]:
    """`meta` = `ytclient.normalize_entry(info)`."""
    return {
        "version": SIDECAR_VERSION,
        "id": meta.get("id"),
        "title": meta.get("title") or "",
        "channel_id": meta.get("channel_id") or "",
        "channel_name": meta.get("channel_name") or "",
        "upload_date": meta.get("upload_date") or "",
        "duration": meta.get("duration"),
        "url": meta.get("url") or "",
        "thumbnail": meta.get("thumbnail"),
        "description": (description or "")[:DESCRIPTION_MAX],
        "chapters": [{"start": c.start, "end": c.end, "title": c.title} for c in chapters],
        "genre": genre,
        "source": source,
        "written": datetime.now(UTC).isoformat(timespec="seconds"),
    }


def write(video_id: str, data: Mapping[str, Any]) -> Path | None:
    """Atomic write; failures are logged, never raised (the download itself succeeded)."""
    try:
        path = sidecar_path(video_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        os.replace(tmp, path)
        legacy = _legacy_path(video_id)  # migrate the old name `<id>.json`
        if (old := _load(legacy)) is not None and old.get("id") in (None, video_id):
            legacy.unlink(missing_ok=True)
        return path
    except (OSError, ValueError, TypeError) as exc:
        log.warning("Metadaten-Sidecar nicht geschrieben (%s): %s", video_id, exc)
        return None


def _load(path: Path) -> dict[str, Any] | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def read(video_id: str) -> dict[str, Any] | None:
    try:
        data = _load(sidecar_path(video_id))
        if data is None:  # older name `<id>.json`: only if it really belongs to this exact ID
            legacy = _load(_legacy_path(video_id))
            if legacy is not None and legacy.get("id") in (None, video_id):
                data = legacy
    except ValueError:
        return None
    return data


def delete(video_id: str) -> None:
    try:
        sidecar_path(video_id).unlink(missing_ok=True)
        legacy = _legacy_path(video_id)
        old = _load(legacy)
        if old is None or old.get("id") in (None, video_id):
            legacy.unlink(missing_ok=True)
    except (OSError, ValueError):
        log.debug("Sidecar nicht löschbar: %s", video_id)


def chapters_of(data: Mapping[str, Any] | None) -> list[Chapter]:
    out: list[Chapter] = []
    for c in (data or {}).get("chapters") or []:
        try:
            end = c.get("end")
            out.append(
                Chapter(
                    float(c["start"]),
                    str(c.get("title") or ""),
                    None if end is None else float(end),
                )
            )
        except (KeyError, TypeError, ValueError, AttributeError):
            continue
    return out
