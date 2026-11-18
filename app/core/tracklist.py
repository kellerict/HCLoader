"""Tracklists (v0.6.0 «Tracklist search»): extraction, normalisation, storage, search.

**Offline only.** Tracklists come from what is already stored or on disk, never from the network:

1. chapters in the metadata sidecar (yt-dlp chapters, or description timestamps resolved at
   download time),
2. the description in the sidecar (timestamped lines, numbered lines, a plain «Tracklist:»
   block),
3. ID3 CHAP frames of the MP3 (sets without sidecar),
4. the `.cue` file next to the audio.

The richest candidate wins (`_score`). Every track is normalised for display (artist joiners
`feat.`/`x`/`&`/`vs.`, remix/edit/VIP information as `version`, a trailing `[Label]`, unicode
quotes/dashes) and folded for matching (case, diacritics, punctuation). Tracks are stored per
library item in `tracks` (+ `tracklists` = what was examined) with an FTS5 index; without FTS5
the search falls back to `LIKE` (docs/decisions.md «Tracklist search»).
"""

from __future__ import annotations

import logging
import re
import threading
import unicodedata
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import player, sidecar, tagging
from .db import Database, now_iso

log = logging.getLogger(__name__)

K_LAST_PASS = "tracklist.last_pass"
SOURCES = ("chapters", "description", "id3", "cue")
MAX_TRACKS = 300  # per set; a longer «tracklist» is not a tracklist
MAX_LINE = 200  # longer lines are prose, not a track
SEARCH_TRACK_LIMIT = 2000
SEARCH_SET_LIMIT = 100
HITS_PER_SET = 12
TOP_LIMIT_MAX = 100
PROGRESS_EVERY = 10

# --------------------------------------------------------------------------- text helpers

_DASHES = dict.fromkeys(map(ord, "‐‑‒–—―−﹘﹣－"), "-")
_QUOTES = {
    **dict.fromkeys(map(ord, "‘’‚‛′´`"), "'"),
    **dict.fromkeys(map(ord, "“”„‟″«»"), '"'),
}
_INVISIBLE = dict.fromkeys(map(ord, "​‌‍⁠﻿­"), None)


def clean_text(text: str) -> str:
    """Unicode quotes/dashes to ASCII, invisible characters removed, NFKC, single spaces."""
    s = unicodedata.normalize("NFKC", str(text or ""))
    s = s.translate(_INVISIBLE).translate(_DASHES).translate(_QUOTES)
    s = s.replace("\t", " ").replace(" ", " ")
    return re.sub(r"\s{2,}", " ", s).strip()


def fold(text: str) -> str:
    """Matching form: lower case, no diacritics, letters/digits only, single spaces.
    Works for any script (Cyrillic, CJK stay letters)."""
    s = unicodedata.normalize("NFKD", clean_text(text))
    s = "".join(c for c in s if not unicodedata.combining(c)).casefold()
    s = s.replace("&", " and ").replace("ß", "ss")
    s = re.sub(r"[^\w]+|_", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# --------------------------------------------------------------------------- track parsing

_VERSION_WORDS = (
    r"remix|rmx|edit|vip|bootleg|rework|re-?work|refix|flip|mix|mashup|mash-up|cut|version|"
    r"remake|remaster(?:ed)?|dub|reprise|intro|outro|live|acapella|instrumental|tool|"
    r"re-?edit|bounce|anthem|extended|radio|original|uptempo|hardcore|hardstyle|frenchcore|"
    r"kick|reboot|redrum|update|rebirth"
)
_VERSION_RE = re.compile(rf"\b(?:{_VERSION_WORDS})\b", re.I)
_STRONG_VERSION_RE = re.compile(
    r"\b(?:remix|rmx|edit|vip|bootleg|rework|re-?work|refix|flip|mix|mashup|mash-up|"
    r"remake|remaster(?:ed)?|re-?edit|reboot|version)\b",
    re.I,
)
_FEAT_RE = re.compile(r"(?:^|\s)\(?\s*(?:feat\.?|ft\.?|featuring)\s+", re.I)
_ID_WORDS = {"id", "?", "??", "???", "????", "unknown", "id?", "tba", "tbc", "unreleased id"}
_NEUTRAL_VERSIONS = re.compile(
    r"\b(?:original|extended|radio|club|pro)\s+(?:mix|edit|version)\b|\boriginal\b|\bextended\b",
    re.I,
)
_TRACK_SEP_RE = re.compile(r"\s+-\s+|\s+--\s+|\s+~\s+|\s+\|\s+")


@dataclass
class Track:
    start: float | None
    artist: str
    title: str
    version: str = ""
    label: str = ""
    raw: str = ""
    is_id: bool = False

    def to_dict(self, position: int | None = None) -> dict[str, Any]:
        d = {
            "start": self.start,
            "artist": self.artist,
            "title": self.title,
            "version": self.version,
            "label": self.label,
            "is_id": self.is_id,
        }
        if position is not None:
            d["position"] = position
        return d


def _is_id(text: str) -> bool:
    """«ID», «???», «Unknown», «TBA» … = unreleased / not identified."""
    t = clean_text(text).strip().casefold()
    return t in _ID_WORDS or fold(t) in {"id", "unknown", "tba", "tbc", "unreleased id"}


def normalize_artist(text: str) -> str:
    """Joiners in one spelling: `feat.`, `x`, `&`, `vs.`; stray brackets and spaces removed."""
    s = clean_text(text).strip(" -|:,;")
    s = re.sub(r"\(\s*((?:feat\.?|ft\.?|featuring)\s+[^()]+)\)", r" \1", s, flags=re.I)
    s = re.sub(r"\s*\b(?:feat\.?|ft\.?|featuring)(?=\s|$)\s*", " feat. ", s, flags=re.I)
    s = re.sub(r"\s+(?:vs\.?|versus)\s+", " vs. ", s, flags=re.I)
    s = re.sub(r"\s+[xX×]\s+", " x ", s)
    s = re.sub(r"\s*&\s*", " & ", s)
    s = re.sub(r"\s*,\s*", ", ", s)
    s = re.sub(r"\s+(?:and|und)\s+", " & ", s, flags=re.I) if " - " not in s else s
    return re.sub(r"\s{2,}", " ", s).strip(" ,")


def artists_of(artist: str) -> list[str]:
    """Single folded artist names of an artist field (for «most played» keys)."""
    parts = re.split(r"\s+(?:feat|ft|featuring|vs|versus|x|and|und|with|meets)\s+|,", fold(artist))
    return sorted({p.strip() for p in parts if p.strip()})


def _take_brackets(title: str) -> tuple[str, list[str], list[str]]:
    """Pull version info `(... Remix)`/`[... Edit]` and featured artists `(feat. X)` out of a
    title. -> (title, versions, featured)."""
    versions: list[str] = []
    feats: list[str] = []

    def repl(m: re.Match[str]) -> str:
        inner = m.group(2).strip()
        if not inner:
            return " "
        fm = re.match(r"^(?:feat\.?|ft\.?|featuring)\s+(.+)$", inner, re.I)
        if fm:
            feats.append(fm.group(1).strip())
            return " "
        if _VERSION_RE.search(inner) or _is_id(inner):
            versions.append(inner)
            return " "
        return m.group(0)

    if title.count("(") > title.count(")"):  # «Title (X Remix» – a cut-off closing bracket
        title += ")"
    out = re.sub(r"([(\[])([^()\[\]]*)[)\]]", repl, title)
    return re.sub(r"\s{2,}", " ", out).strip(), versions, feats


def parse_track(text: str, start: float | None = None, *, raw: str | None = None) -> Track | None:
    """`Artist - Title (Remix) [Label]` -> Track. None for empty/useless text."""
    s = clean_text(text).strip(" -|:;,.>*")
    s = s.strip('"').strip()
    if not s:
        return None
    label = ""
    m = re.search(r"\s*\[([^\[\]]{1,60})\]\s*$", s)
    if m and not _STRONG_VERSION_RE.search(m.group(1)) and not _is_id(m.group(1)):
        label = m.group(1).strip()
        s = s[: m.start()].strip()
    m = re.search(r"\s*\{([^{}]{1,60})\}\s*$", s)  # {Label} is rare but unambiguous
    if m and not label:
        label = m.group(1).strip()
        s = s[: m.start()].strip()

    parts = _TRACK_SEP_RE.split(s)
    if len(parts) >= 2:
        artist, title_parts = parts[0], parts[1:]
    else:
        artist, title_parts = "", [s]
    versions: list[str] = []
    # «Artist - Title - Remixer Remix»: trailing segments that name a version
    while len(title_parts) > 1 and _VERSION_RE.search(title_parts[-1]):
        versions.insert(0, title_parts.pop().strip())
    title = " - ".join(p.strip() for p in title_parts)
    title, bracket_versions, feats = _take_brackets(title)
    versions = bracket_versions + versions
    artist, artist_versions, artist_feats = _take_brackets(artist)
    feats = artist_feats + feats
    versions = artist_versions + versions
    fm = re.search(r"\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$", title, re.I)
    if fm and artist:
        feats.append(fm.group(1).strip())
        title = title[: fm.start()].strip()
    title = title.strip(" \"'-").strip()
    artist = normalize_artist(artist.strip(" \"'"))
    for f in feats:
        artist = f"{artist} feat. {normalize_artist(f)}" if artist else normalize_artist(f)
    version = " / ".join(v.strip(" -") for v in versions if v.strip(" -"))
    if not title and not artist:
        return None
    is_id = _is_id(title) if title else _is_id(artist)
    if is_id:
        title = "ID"
        if not artist or _is_id(artist):
            artist = "ID"
    elif artist and _is_id(artist):
        artist = "ID"
    if not title and artist:  # «00:00 Headhunterz» – the artist alone is still useful
        title, artist = artist, ""
    return Track(start, artist, title, version, label, raw if raw is not None else text, is_id)


# --------------------------------------------------------------------------- description

_TS = r"\d{1,2}:\d{2}(?::\d{2})?"
_NUM = r"(?:#\s?(?P<hash>\d{1,3})\s*[.):-]?|(?P<num>\d{1,3})\s*[.)]|(?P<numdash>\d{1,3})\s+-)"
_LEAD_RE = re.compile(
    rf"^(?:{_NUM}\s*)?[\[(]?\s*(?P<ts>{_TS})\s*[\])]?(?:\s*[-|:~>.]+)?\s*(?P<rest>.*)$"
)
_NUM_RE = re.compile(rf"^{_NUM}\s*(?P<rest>.+)$")
_TRAIL_RE = re.compile(rf"^(?:{_NUM}\s*)?(?P<rest>.+?)\s*[-|]?\s*[\[(]?\s*(?P<ts>{_TS})\s*[\])]?$")
_BULLET_RE = re.compile(r"^[\s*•·▶►▸→>»✓✔☆★♪♫🎵🎶🔥⏱️⏱🕐|~=+-]+")
_HEADING_RE = re.compile(
    r"^(?:\W*\s*)?(?:full\s+)?(?:track\s*list(?:ing)?|tracks|set\s*list|playlist|"
    r"titelliste|трек-?лист)\s*[:\-]?\s*\W*$",
    re.I,
)
_JUNK_RE = re.compile(
    r"https?://|www\.|\.com\b|\.be/|@\w|#\w|instagram|facebook|soundcloud\.|spotify|"
    r"subscribe|follow|tickets?\b|merch|copyright|all rights|booking",
    re.I,
)


def _ts_seconds(ts: str) -> int:
    return tagging.parse_timestamp(ts)


@dataclass
class _Line:
    start: float | None
    text: str
    number: int | None = None
    raw: str = ""


@dataclass
class ParseResult:
    tracks: list[Track] = field(default_factory=list)
    timed: bool = False


def _line_candidates(description: str) -> tuple[list[_Line], list[_Line]]:
    """-> (timestamped lines, numbered/plain lines in a tracklist block)."""
    timed: list[_Line] = []
    listed: list[_Line] = []
    in_block = False
    for raw_line in str(description or "").splitlines():
        raw = raw_line.strip()
        line = clean_text(raw)
        if not line:
            in_block = False if listed and in_block else in_block
            continue
        if len(line) > MAX_LINE:
            continue
        if _HEADING_RE.match(line):
            in_block = True
            continue
        body = _BULLET_RE.sub("", line) if not line[:1].isdigit() else line
        m = _LEAD_RE.match(body)
        if m:
            rest = m.group("rest").strip()
            if re.match(rf"^[-–]?\s*{_TS}\b", rest):  # «12:00 - 13:00 Artist» = timetable
                continue
            if rest and not _JUNK_RE.search(rest):
                timed.append(_Line(float(_ts_seconds(m.group("ts"))), rest, raw=raw))
            continue
        m = _TRAIL_RE.match(body)
        if m and _TRACK_SEP_RE.search(m.group("rest")) and not _JUNK_RE.search(m.group("rest")):
            timed.append(_Line(float(_ts_seconds(m.group("ts"))), m.group("rest"), raw=raw))
            continue
        m = _NUM_RE.match(body)
        if m:
            rest = m.group("rest").strip()
            num = m.group("num") or m.group("hash") or m.group("numdash")
            if _TRACK_SEP_RE.search(rest) and not _JUNK_RE.search(rest):
                listed.append(_Line(None, rest, int(num), raw=raw))
            continue
        if in_block and _TRACK_SEP_RE.search(body) and not _JUNK_RE.search(body):
            listed.append(_Line(None, re.sub(r"^\d{1,3}\s+(?=\D)", "", body), raw=raw))
            continue
        if in_block and listed and not _TRACK_SEP_RE.search(body):
            in_block = False
    return timed, listed


def parse_description(description: str | None, duration: float | None = None) -> ParseResult:
    """Tracklist of a description. Timestamped lines win (strictly increasing, inside the
    duration); otherwise numbered lines / a «Tracklist:» block with `Artist - Title` lines.
    Fewer than two tracks -> empty result."""
    timed, listed = _line_candidates(description or "")
    out: list[Track] = []
    last = -1.0
    for ln in timed:
        if ln.start is None or ln.start <= last or (duration and ln.start >= duration):
            continue
        tr = parse_track(ln.text, ln.start, raw=ln.raw)
        if tr is None:
            continue
        out.append(tr)
        last = ln.start
    if len(out) >= 2:
        return ParseResult(out[:MAX_TRACKS], timed=True)
    plain = [t for ln in listed if (t := parse_track(ln.text, None, raw=ln.raw)) is not None]
    if len(plain) >= 2:
        return ParseResult(plain[:MAX_TRACKS], timed=False)
    return ParseResult()


# --------------------------------------------------------------------------- chapters / CUE

_GENERIC_RE = re.compile(
    r"^(?:<?\s*untitled chapter\s*\d*\s*>?|(?:track|chapter|part|kapitel|teil|intro|outro)"
    r"\s*(?:\d+)?)$",
    re.I,
)


def _generic(title: str) -> bool:
    t = clean_text(title)
    return (
        not t
        or bool(_GENERIC_RE.match(t) and re.search(r"\d", t))
        or bool(re.match(r"^<?\s*untitled chapter", t, re.I))
    )


def from_chapters(chapters: Iterable[tagging.Chapter]) -> list[Track]:
    out: list[Track] = []
    for ch in sorted(chapters, key=lambda c: c.start):
        if _generic(ch.title):
            continue
        # a chapter title may carry its own timestamp/number («01. Artist - Title»)
        text = ch.title
        m = _LEAD_RE.match(clean_text(text)) or _NUM_RE.match(clean_text(text))
        if m and m.group("rest").strip():
            text = m.group("rest")
        tr = parse_track(text, float(ch.start), raw=ch.title)
        if tr is not None:
            out.append(tr)
    return out[:MAX_TRACKS]


def _cue_text(path: Path) -> str | None:
    cue = path.with_suffix(".cue")
    try:
        return cue.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        try:
            return cue.read_text(encoding="cp1252")
        except (OSError, UnicodeDecodeError):
            return None
    except OSError:
        return None


def from_cue(text: str) -> list[Track]:
    """Tracks of a CUE sheet. A track PERFORMER equal to the sheet's PERFORMER (the set artist,
    written when a chapter had no `Artist - Title`) is not a track artist."""
    top = ""
    for line in text.splitlines():
        if re.match(r"^\s*TRACK\s+\d+", line, re.I):
            break
        m = re.match(r'^\s*PERFORMER\s+"(.*)"\s*$', line, re.I)
        if m:
            top = m.group(1)
    out: list[Track] = []
    for c in player.parse_cue(text):
        title = str(c.get("title") or "")
        performer = str(c.get("performer") or "")
        if performer and performer != top and not _generic(title):
            text_ = f"{performer} - {title}" if title else performer
        else:
            if _generic(title):
                continue
            text_ = title
        tr = parse_track(text_, float(c["start"]), raw=text_)
        if tr is not None:
            out.append(tr)
    out.sort(key=lambda t: t.start or 0.0)
    return out[:MAX_TRACKS]


# --------------------------------------------------------------------------- extraction


def _score(tracks: list[Track], timed: bool) -> float:
    if len(tracks) < 2:
        return 0.0
    named = sum(1 for t in tracks if t.artist)
    return len(tracks) + named + (len(tracks) if timed else 0)


def extract(
    video_id: str,
    *,
    data: Mapping[str, Any] | None = None,
    path: Path | str | None = None,
    duration: float | None = None,
    files_ok: bool = True,
) -> tuple[str, list[Track]]:
    """Best tracklist of one library item -> (source, tracks); ("none", []) if nothing.
    `data` = sidecar dict (read if None), `path` = audio file; `files_ok=False` skips file
    reads (target folder unreachable)."""
    if data is None:
        data = sidecar.read(video_id) or {}
    dur = duration or (data or {}).get("duration") or None
    dur = float(dur) if dur else None
    cands: list[tuple[str, list[Track], bool]] = []
    chapters = sidecar.chapters_of(data) if data else []
    if chapters:
        cands.append(("chapters", from_chapters(chapters), True))
    desc = (data or {}).get("description") or ""
    if desc:
        res = parse_description(desc, dur)
        cands.append(("description", res.tracks, res.timed))
    p = Path(path) if path else None
    if p is not None and files_ok and not any(_score(t, tm) for _, t, tm in cands):
        try:
            if p.suffix.lower() == ".mp3" and p.is_file():
                from .library import _chapters_from_file  # lazy: library imports a lot

                cands.append(("id3", from_chapters(_chapters_from_file(p)), True))
            text = _cue_text(p)
            if text:
                cands.append(("cue", from_cue(text), True))
        except OSError as exc:
            log.debug("Tracklist file sources not readable (%s): %s", video_id, exc)
    best: tuple[str, list[Track]] = ("none", [])
    best_score = 0.0
    for source, tracks, timed in cands:
        sc = _score(tracks, timed)
        if sc > best_score:
            best, best_score = (source, tracks), sc
    return best


# --------------------------------------------------------------------------- storage


def track_key(t: Track) -> str:
    """Grouping key for «most played»: folded artists | title | version (neutral versions such
    as «Original Mix» / «Extended» dropped). '' = not counted (ID, no artist)."""
    if t.is_id or not t.artist or fold(t.artist) == "id":
        return ""
    title = fold(t.title)
    version = fold(_NEUTRAL_VERSIONS.sub(" ", t.version))
    if not title:
        return ""
    return f"{','.join(artists_of(t.artist))}|{title}|{version}"


def search_text(t: Track) -> str:
    if t.is_id and (not t.artist or t.artist == "ID"):
        return ""  # «ID - ID» is never a search hit
    words = [t.artist if t.artist != "ID" else "", "" if t.is_id else t.title, t.version]
    return fold(" ".join(w for w in words if w))


def store(db: Database, video_id: str, source: str, tracks: list[Track]) -> int:
    """Replace the tracklist of one item. Returns the number of stored tracks."""
    if source not in SOURCES:
        source, tracks = "none", []
    with db.transaction():
        db.execute("DELETE FROM tracks WHERE video_id = ?", (video_id,))
        for i, t in enumerate(tracks[:MAX_TRACKS], 1):
            db.execute(
                "INSERT INTO tracks(video_id, position, start, artist, title, version, label,"
                " raw, is_id, key, search) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    video_id,
                    i,
                    t.start,
                    t.artist[:200],
                    t.title[:300],
                    t.version[:200],
                    t.label[:100],
                    clean_text(t.raw)[:MAX_LINE],
                    1 if t.is_id else 0,
                    track_key(t),
                    search_text(t),
                ),
            )
        db.execute(
            "INSERT INTO tracklists(video_id, source, count, extracted) VALUES (?,?,?,?) "
            "ON CONFLICT(video_id) DO UPDATE SET source = excluded.source, "
            "count = excluded.count, extracted = excluded.extracted",
            (video_id, source, min(len(tracks), MAX_TRACKS), now_iso()),
        )
    return min(len(tracks), MAX_TRACKS)


def refresh(
    db: Database,
    video_id: str,
    *,
    data: Mapping[str, Any] | None = None,
    path: Path | str | None = None,
    files_ok: bool = True,
) -> dict[str, Any]:
    """Extract and store the tracklist of one item (after a download, in the pass)."""
    row = db.get_video(video_id) or {}
    source, tracks = extract(
        video_id,
        data=data,
        path=path if path is not None else (row.get("file_path") or None),
        duration=row.get("duration"),
        files_ok=files_ok,
    )
    n = store(db, video_id, source, tracks)
    return {"source": source, "count": n}


def safe_refresh(db: Database, video_id: str, **kw: Any) -> None:
    """`refresh` for the download path: never raises (the download itself succeeded)."""
    try:
        refresh(db, video_id, **kw)
    except Exception:
        log.warning("Tracklist not extracted: %s", video_id, exc_info=True)


def has_fts(db: Database) -> bool:
    return (
        db.query_one("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name='tracks_fts'")
        is not None
    )


# --------------------------------------------------------------------------- queries


def _track_out(r: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "position": r["position"],
        "start": r["start"],
        "artist": r["artist"],
        "title": r["title"],
        "version": r["version"],
        "label": r["label"],
        "is_id": bool(r["is_id"]),
    }


def get_tracklist(db: Database, video_id: str, *, extract_missing: bool = True) -> dict[str, Any]:
    """Tracks of one item. Not examined yet -> extracted now (offline, one item)."""
    row = db.get_video(video_id)
    if not row:
        return {"ok": False, "error_key": "tracklist.unknown_item"}
    meta = db.query_one("SELECT * FROM tracklists WHERE video_id = ?", (video_id,))
    if meta is None and extract_missing:
        refresh(db, video_id)
        meta = db.query_one("SELECT * FROM tracklists WHERE video_id = ?", (video_id,))
    rows = db.query("SELECT * FROM tracks WHERE video_id = ? ORDER BY position", (video_id,))
    return {
        "ok": True,
        "video_id": video_id,
        "source": (meta or {}).get("source") or "none",
        "extracted": (meta or {}).get("extracted"),
        "tracks": [_track_out(r) for r in rows],
    }


_SET_COLS = (
    "v.title AS set_title, v.channel_name AS set_artist, v.duration AS set_duration, "
    "v.thumbnail AS set_thumbnail, v.genre AS set_genre, v.platform AS set_platform, "
    "v.upload_date AS set_upload_date, v.downloaded_at AS set_downloaded_at"
)


def _query_tokens(query: str) -> list[str]:
    return [w for w in fold(query).split() if w][:12]


def search(
    db: Database,
    query: str,
    *,
    set_limit: int = SEARCH_SET_LIMIT,
    hits_per_set: int = HITS_PER_SET,
) -> dict[str, Any]:
    """Sets (library items, status done) containing tracks that match all words of `query`
    (prefix match per word). -> {query, engine, sets:[{id, title, artist, …, hits:[track]}],
    hits, truncated}. Newest download first; inside a set by position."""
    tokens = _query_tokens(query)
    engine = "fts5" if has_fts(db) else "like"
    if not tokens:
        return {"query": query, "engine": engine, "sets": [], "hits": 0, "truncated": False}
    base = (
        f"SELECT t.*, {_SET_COLS} FROM tracks t JOIN videos v ON v.id = t.video_id "
        "WHERE v.status = 'done' AND t.search <> '' "
    )
    order = " ORDER BY v.downloaded_at DESC, v.id, t.position LIMIT ?"
    if engine == "fts5":
        match = " ".join(f'"{w}"*' for w in tokens)
        sql = base + "AND t.id IN (SELECT rowid FROM tracks_fts WHERE tracks_fts MATCH ?)" + order
        params: list[Any] = [match, SEARCH_TRACK_LIMIT + 1]
    else:
        like = " ".join("AND t.search LIKE ? ESCAPE '\\'" for _ in tokens)
        sql = base + like + order
        params = [f"%{_like_escape(w)}%" for w in tokens] + [SEARCH_TRACK_LIMIT + 1]
    rows = db.query(sql, params)
    truncated = len(rows) > SEARCH_TRACK_LIMIT
    rows = rows[:SEARCH_TRACK_LIMIT]
    sets: dict[str, dict[str, Any]] = {}
    for r in rows:
        s = sets.get(r["video_id"])
        if s is None:
            if len(sets) >= set_limit:
                truncated = True
                continue
            s = sets[r["video_id"]] = {
                "id": r["video_id"],
                "title": r["set_title"] or "",
                "artist": r["set_artist"] or "",
                "duration": r["set_duration"],
                "thumbnail": r["set_thumbnail"] or None,
                "genre": r["set_genre"] or "",
                "platform": r["set_platform"] or "youtube",
                "upload_date": r["set_upload_date"],
                "downloaded_at": r["set_downloaded_at"],
                "hits": [],
                "more": 0,
            }
        if len(s["hits"]) < hits_per_set:
            s["hits"].append(_track_out(r))
        else:
            s["more"] += 1
    return {
        "query": query,
        "engine": engine,
        "sets": list(sets.values()),
        "hits": len(rows),
        "truncated": truncated,
    }


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def top_tracks(db: Database, limit: int = 20) -> list[dict[str, Any]]:
    """Tracks that appear in the most sets (at least two), with the most common spelling."""
    limit = max(1, min(int(limit or 20), TOP_LIMIT_MAX))
    keys = db.query(
        "SELECT t.key, COUNT(DISTINCT t.video_id) AS sets FROM tracks t "
        "JOIN videos v ON v.id = t.video_id WHERE v.status = 'done' AND t.key <> '' "
        "GROUP BY t.key HAVING sets >= 2 ORDER BY sets DESC, t.key LIMIT ?",
        (limit,),
    )
    if not keys:
        return []
    marks = ",".join("?" for _ in keys)
    spell = db.query(
        f"SELECT key, artist, title, version, COUNT(*) AS n FROM tracks WHERE key IN ({marks}) "
        "GROUP BY key, artist, title, version ORDER BY n DESC, artist, title",
        [k["key"] for k in keys],
    )
    best: dict[str, dict[str, Any]] = {}
    for s in spell:
        best.setdefault(s["key"], s)
    out = []
    for k in keys:
        s = best.get(k["key"]) or {}
        out.append(
            {
                "key": k["key"],
                "artist": s.get("artist") or "",
                "title": s.get("title") or "",
                "version": s.get("version") or "",
                "sets": k["sets"],
            }
        )
    return out


def status(db: Database) -> dict[str, Any]:
    row = (
        db.query_one(
            "SELECT "
            "(SELECT COUNT(*) FROM videos WHERE status = 'done') AS total, "
            "(SELECT COUNT(*) FROM tracklists l JOIN videos v ON v.id = l.video_id "
            " WHERE v.status = 'done') AS scanned, "
            "(SELECT COUNT(*) FROM tracklists l JOIN videos v ON v.id = l.video_id "
            " WHERE v.status = 'done' AND l.count > 0) AS sets, "
            "(SELECT COUNT(*) FROM tracks t JOIN videos v ON v.id = t.video_id "
            " WHERE v.status = 'done') AS tracks"
        )
        or {}
    )
    return {
        "total": row.get("total") or 0,
        "scanned": row.get("scanned") or 0,
        "sets": row.get("sets") or 0,
        "tracks": row.get("tracks") or 0,
        "last_pass": db.get_state(K_LAST_PASS),
        "engine": "fts5" if has_fts(db) else "like",
    }


# --------------------------------------------------------------------------- offline pass


def index_pass(
    db: Database,
    *,
    scope: str = "missing",
    progress: Callable[[dict[str, Any]], None] | None = None,
    cancel: threading.Event | None = None,
    read: Callable[[str], Mapping[str, Any] | None] = sidecar.read,
    files_ok: bool = True,
) -> dict[str, Any]:
    """Extract tracklists for the library (status done). scope «missing» = items never
    examined, «all» = every item again. Offline; cancellable between items."""
    if scope == "all":
        rows = db.query(
            "SELECT id, file_path, duration FROM videos WHERE status = 'done' ORDER BY id"
        )
    else:
        rows = db.query(
            "SELECT v.id, v.file_path, v.duration FROM videos v "
            "LEFT JOIN tracklists l ON l.video_id = v.id "
            "WHERE v.status = 'done' AND l.video_id IS NULL ORDER BY v.id"
        )
    total = len(rows)
    res = {"ok": True, "total": total, "done": 0, "sets": 0, "tracks": 0, "cancelled": False}
    for i, r in enumerate(rows, 1):
        if cancel is not None and cancel.is_set():
            res["cancelled"] = True
            break
        try:
            source, tracks = extract(
                r["id"],
                data=read(r["id"]) or {},
                path=r.get("file_path") or None,
                duration=r.get("duration"),
                files_ok=files_ok,
            )
            n = store(db, r["id"], source, tracks)
        except Exception:
            log.warning("Tracklist not extracted: %s", r["id"], exc_info=True)
            n = 0
        res["done"] = i
        if n:
            res["sets"] += 1
            res["tracks"] += n
        if progress is not None and (i % PROGRESS_EVERY == 0 or i == total):
            progress({"done": i, "total": total, "sets": res["sets"], "tracks": res["tracks"]})
    if not res["cancelled"]:
        db.set_state(K_LAST_PASS, now_iso())
    return res
