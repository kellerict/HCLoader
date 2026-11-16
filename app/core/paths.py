"""Folder structure and file names: sanitising, title cleanup, Windows path-length handling."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Mapping
from pathlib import Path

_REPLACEMENTS = {
    '"': "'",
    ":": "-",
    "/": "-",
    "\\": "-",
    "|": "-",
    "<": "",
    ">": "",
    "?": "",
    "*": "",
}
_RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"COM{i}" for i in range(1, 10)),
             *(f"LPT{i}" for i in range(1, 10))}
_PLACEHOLDER = re.compile(r"\{(\w+)\}")
MIN_TITLE_LENGTH = 5
UNKNOWN_ARTIST = "Unbekannt"


class PathTooLongError(ValueError):
    """Even with minimal title the path would exceed max_path_length."""


def sanitize_filename(name: str, *, fallback: str = "_") -> str:
    """Make a single path component safe for Windows (and other file systems)."""
    name = unicodedata.normalize("NFC", name or "")
    name = "".join(_REPLACEMENTS.get(ch, ch) for ch in name)
    name = "".join(ch for ch in name if ord(ch) >= 32 and ord(ch) != 127)
    name = re.sub(r"\s+", " ", name).strip()
    name = name.rstrip(". ")
    name = name.lstrip(" ")
    if not name:
        return fallback
    if name.split(".")[0].strip().upper() in _RESERVED:
        name = "_" + name
    return name


def truncate(text: str, max_len: int) -> str:
    """Cut to max_len characters, without trailing spaces/dots/separators."""
    if max_len <= 0:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip(" .-_,;")


def clean_title(title: str, patterns: Iterable[str] = ()) -> str:
    """Remove noise like '(Official Video)' / '[HQ]' using the configured regex list."""
    result = title or ""
    for pat in patterns:
        try:
            result = re.sub(pat, " ", result, flags=re.IGNORECASE)
        except re.error:
            continue
    result = re.sub(r"\s+", " ", result).strip()
    return result.strip(" -|–—_").strip() or (title or "").strip()


def parse_artist_from_title(title: str) -> str | None:
    """Parse `ARTIST @ EVENT` or `ARTIST - TITLE`; returns None if nothing plausible."""
    for sep in (" @ ", " - ", " – ", " — "):
        if sep in title:
            artist = title.split(sep, 1)[0].strip()
            if 0 < len(artist) <= 60:
                return artist
    return None


def normalize_date(value: str | None) -> str:
    """'20261003' / '2026-10-03...' -> '2026-10-03'; unknown -> ''."""
    if not value:
        return ""
    m = re.match(r"^(\d{4})-?(\d{2})-?(\d{2})", str(value).strip())
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else ""


def tmp_dir(target_dir: Path | str) -> Path:
    return Path(target_dir) / ".tmp"


def sibling(path: Path, suffix: str) -> Path:
    """Same base name with another extension, e.g. sibling(x.mp3, '.cue')."""
    return path.with_suffix(suffix)


def _values(meta: Mapping[str, object], title_len: int, other_len: int | None) -> dict[str, str]:
    date = normalize_date(str(meta.get("upload_date") or meta.get("date") or ""))
    channel = str(meta.get("channel") or meta.get("channel_name") or "").strip()
    artist = str(meta.get("artist") or "").strip() or channel or UNKNOWN_ARTIST

    def lim(s: str) -> str:
        return truncate(s, other_len) if other_len is not None else s

    return {
        "genre": sanitize_filename(lim(str(meta.get("genre") or "Unsortiert"))),
        "artist": sanitize_filename(lim(artist), fallback=UNKNOWN_ARTIST),
        "channel": sanitize_filename(lim(channel or UNKNOWN_ARTIST), fallback=UNKNOWN_ARTIST),
        "year": date[:4] or "0000",
        "date": date or "0000-00-00",
        "title": sanitize_filename(truncate(str(meta.get("title") or ""), title_len), fallback="_"),
        "id": sanitize_filename(str(meta["id"])),
    }


def _render(template: str, values: dict[str, str], ext: str) -> list[str]:
    parts = [p for p in re.split(r"[/\\]", template) if p.strip()]
    out: list[str] = []
    for i, part in enumerate(parts):
        seg = _PLACEHOLDER.sub(lambda m: values.get(m.group(1), m.group(0)), part)
        last = i == len(parts) - 1
        seg = sanitize_filename(seg)
        if last:
            seg = sanitize_filename(seg + ext)
        out.append(seg)
    return out


def build_target_path(
    target_dir: Path | str,
    template: str,
    meta: Mapping[str, object],
    *,
    ext: str = ".mp3",
    max_title_length: int = 120,
    max_path_length: int = 240,
) -> Path:
    """Build the final file path from the template.

    meta keys: id (required), title, artist, channel/channel_name, genre, upload_date/date.
    Title is limited to max_title_length, then shortened further (then artist/channel/genre)
    until len(str(path)) < max_path_length. The video id is never shortened.
    """
    target = Path(target_dir)
    if not ext.startswith("."):
        ext = "." + ext

    def build(title_len: int, other_len: int | None) -> Path:
        return target.joinpath(*_render(template, _values(meta, title_len, other_len), ext))

    def fits(p: Path) -> bool:
        return len(str(p)) < max_path_length

    title_len = max_title_length
    for _ in range(100):
        path = build(title_len, None)
        if fits(path):
            return path
        actual = len(_values(meta, title_len, None)["title"])
        excess = len(str(path)) - (max_path_length - 1)
        new_len = min(title_len, actual) - excess
        if new_len < MIN_TITLE_LENGTH:
            break
        title_len = new_len
    for other in (40, 25, 15, 8):
        path = build(MIN_TITLE_LENGTH, other)
        if fits(path):
            return path
    raise PathTooLongError(f"Pfad zu lang (max. {max_path_length} Zeichen): {path}")
