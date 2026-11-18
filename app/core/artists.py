"""DJ pages (v0.8.0): artists derived from the library, with aliases, merge/split and b2b credit.

No network, no file access. Who played a set is derived on the fly from data that is already
stored, in this order:

1. a confirmed festival-collector row that points at the set (`checklist_rows.artist` - the
   organiser's timetable is the most reliable source),
2. the title: segments (« | », « @ », « - » …) that are not the series, a year, a stage, a set
   type or generic words («Mix», «Podcast», genre names); «… by <DJ>» / «Hosted by <DJ>»,
3. the channel name, if it is not an organiser channel and does not look like a mix channel.

A credit string is split into artists at strong joiners (b2b, b3b, vs, x) and, unless the
whole piece is a known act («D-Block & S-te-Fan»), at «&», «+» and commas. Every artist of a
b2b set gets the set (role `b2b`). MC credits («feat. MC …») are dropped.

Identity: `key_of(name)` folds case, accents, spaces and punctuation («Sub-Zero Project» =
«SubZero Project» = «subzeroproject»). The table `artists` (migration 13) only holds what the
user said (display name, aliases = merged spellings, own channel, hidden) plus a small seed list
(`app/data/artists.yaml`, inserted once). Merging adds the other artist's names as aliases;
splitting removes an alias again. Known names are matched before a credit is split, so a user's
entry always wins («Mark With a K» is never cut at «with»). The derived index is cached per
database; DB triggers (migration 14) bump a cache version on every relevant write, and a change
of library rows only re-parses the changed sets.
"""

from __future__ import annotations

import json
import logging
import re
import threading
from collections import Counter
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

from ruamel.yaml import YAML

from . import festivals as fx
from . import series
from .config import Settings
from .db import Database, now_iso
from .i18n import tr

log = logging.getLogger(__name__)

SEED_FILE = Path(__file__).resolve().parents[1] / "data" / "artists.yaml"
SEED_VERSION = "1"
K_SEED = "artists_seed_version"
MAX_NAME = 80
# one limit for the dialog and for merging (review v0.8.0 m6: merge used to keep 80 silently)
MAX_ALIASES = 80
MAX_CHANNEL_URL = 300
TOP_TRACKS = 10

# a title is split into segments at these separators (same as the collector)
_TITLE_SPLIT = re.compile(r"\s+[|@~•·]\s+|\s+[-–—]\s+|\s*\|\s*|\s+//\s+")
_BRACKETS = re.compile(r"\s*[(\[{][^)\]}]*[)\]}]\s*")
_STRONG = re.compile(r"\s+(?:b2b|b3b|b4b|vs\.?|versus|x)\s+", re.I)
# «&», «+», «,», «and»; «with» only between two known names («Headhunterz with Wildstylez»)
_WEAK = re.compile(r"\s*(?:&|\+|,)\s*|\s+and\s+|(?<=\x00)\s+with\s+(?=\x00)", re.I)
# a feature / presenter tail is cut off: «X feat. MC Y», «X presents Y», «X with MC Y».
# Whole words only, and never inside a known name («Mark With a K»: protected before).
_FEAT = re.compile(
    r"\s+(?:feat\.?|ft\.?|featuring|w/|hosted\s+by|presents|pres\.|with(?=\s+MC\b))\s+.*$", re.I
)
_MC = re.compile(r"^MC\s+\S", re.I)
# words of a credit (joiners & + , / are never part of a word)
_WORD = re.compile(r"[^\s&+,/]+")
_MAX_SPAN = 8
_BY = re.compile(r"\b(?:mixed|mix|hosted|presented|curated|selected|set)\s+by\s+(.+)$", re.I)
_TAIL = re.compile(
    r"\s+(?:live(?:\s*set)?|liveset|dj\s*set|full\s*set|set|hq|hd|4k|uhd|\d{1,2}\s*(?:h|hours?))$",
    re.I,
)
# words that make a segment a description, not a name («Hardstyle Yearmix», «Raw Podcast #4»)
# fmt: off
_GENERIC = {
    "mix", "mixes", "yearmix", "megamix", "minimix", "mixtape", "tape", "tapes", "podcast",
    "radio", "fm", "episode", "ep", "session", "sessions", "classics", "classic", "anthems",
    "anthem", "compilation", "playlist", "best", "top", "tribute", "special", "edition", "vol",
    "volume", "marathon", "continuous", "hour", "hours", "minute", "minutes", "min", "bpm", "show",
    "livestream", "stream", "recording", "recorded", "full", "warmup", "liveset", "closing",
    "opening", "ceremony", "endshow", "intro", "outro", "official", "aftermovie", "music",
    "records", "recordings", "tv", "channel", "label", "events", "event", "festival", "festivals",
    "hardstyle", "hardcore", "uptempo", "frenchcore", "rawstyle", "gabber", "gabba", "terror",
    "terrorcore", "speedcore", "industrial", "euphoric", "techno", "edm", "oldschool",
    "mainstream", "rave", "raves", "underground", "vault", "archive", "promo", "sampler", "djs",
    "mixed", "selection", "highlights", "afterhours", "weekend",
}
# fmt: on
_YEAR = re.compile(r"^(?:19|20)\d\d$")
_LOCK = threading.Lock()
_CACHE: dict[int, tuple[tuple[Any, ...], Index]] = {}


class ArtistError(ValueError):
    """User-facing validation error: `errors` = {field: message}."""

    def __init__(self, errors: dict[str, str]) -> None:
        super().__init__("; ".join(errors.values()))
        self.errors = errors


# --------------------------------------------------------------------------- names


def key_of(name: str | None) -> str:
    """Stable identity of an artist name: folded, letters/digits only, no spaces."""
    return fx.norm(name).replace(" ", "")


def _clean_name(text: str) -> str:
    """Brackets, «Live»/«Set»/«HQ» tails and stray punctuation removed. A feature tail
    («feat. MC …») is kept: `split_credit` cuts it, after known names are protected."""
    s = _BRACKETS.sub(" ", str(text or ""))
    s = re.sub(r"\s+", " ", s).strip(" -–—|:.,;/\\'\"")
    for _ in range(2):
        s = _TAIL.sub("", s).strip(" -–—|:.,;")
    return s


def _plausible(name: str) -> bool:
    if not name or len(name) > MAX_NAME or not re.search(r"[^\W\d_]", name):
        return False
    words = fx.norm(name).split()
    if not words or len(words) > 5:
        return False
    if any(w in _GENERIC for w in words):
        return False
    return not all(_YEAR.match(w) or w.isdigit() for w in words)


@dataclass
class _Known:
    """Lookup of user/seed artists: folded name/alias -> row key."""

    by_key: dict[str, str] = field(default_factory=dict)
    rows: dict[str, dict[str, Any]] = field(default_factory=dict)

    def resolve(self, name: str) -> str | None:
        return self.by_key.get(key_of(name))


def _protect(text: str, known: _Known) -> tuple[str, list[str]]:
    """Replace every known name in `text` by a placeholder «\x00n\x00» (longest match first,
    left to right), so that feature cutting and joiner splitting never cut into it:
    «Mark With a K & MC Chucky» -> «\x000\x00 & MC Chucky»."""
    if not known.by_key:
        return text, []
    words = list(_WORD.finditer(text))
    saved: list[str] = []
    out: list[str] = []
    pos = 0
    i = 0
    while i < len(words):
        hit = None
        for j in range(min(len(words), i + _MAX_SPAN) - 1, i - 1, -1):
            span = text[words[i].start() : words[j].end()]
            if key_of(span) and known.resolve(span):
                hit = (j, span)
                break
        if hit is None:
            i += 1
            continue
        j, span = hit
        out.append(text[pos : words[i].start()])
        out.append(f"\x00{len(saved)}\x00")
        saved.append(span)
        pos = words[j].end()
        i = j + 1
    out.append(text[pos:])
    return "".join(out), saved


def _restore(text: str, saved: Sequence[str]) -> str:
    return re.sub(r"\x00(\d+)\x00", lambda m: saved[int(m.group(1))], text)


def split_credit(text: str, known: _Known | None = None) -> list[str]:
    """«Angerfist b2b Miss K8» -> [Angerfist, Miss K8]; «D-Block & S-te-Fan» stays one act if
    it is known; «Brennan Heart & Wildstylez» -> both. Known names (seed list and the user's
    artists/aliases) are matched first and never cut («Mark With a K»). Names are cleaned
    (brackets, «Live», «feat. MC …», «presents …» removed); an MC next to a DJ («Will Sparks &
    MC Stretch») is dropped, an MC alone («MC Nolz») is kept; implausible pieces are dropped."""
    known = known or _Known()
    whole = _clean_name(text)
    if not whole:
        return []
    if known.resolve(whole):
        return [whole]
    protected, saved = _protect(whole, known)

    def ok(name: str) -> bool:
        return bool(known.resolve(name)) or _plausible(name)

    out: list[str] = []
    for piece in _STRONG.split(protected):
        piece = _FEAT.sub("", piece).strip(" -–—|:.,;/")
        if not piece:
            continue
        restored = _clean_name(_restore(piece, saved))
        if not restored:
            continue
        if known.resolve(restored):
            out.append(restored)
            continue
        parts = [_clean_name(_restore(p, saved)) for p in _WEAK.split(piece)]
        parts = [p for p in parts if p]
        if len(parts) > 1:
            keep = [p for p in parts if known.resolve(p) or not _MC.match(p)] or parts
            if all(ok(p) for p in keep):
                out.extend(keep)
                continue
        if ok(restored):
            out.append(restored)
    seen: set[str] = set()
    uniq = []
    for n in out:
        k = key_of(n)
        if k and k not in seen:
            seen.add(k)
            uniq.append(n)
    return uniq


def _series_rx(cat: fx.Catalog) -> re.Pattern[str] | None:
    """One regex over every series alias of the catalogue (whole words, also written without
    spaces - the same rule as `fx.contains`), built once per catalogue object."""
    rx = getattr(cat, "_artists_series_rx", False)
    if rx is not False:
        return rx
    forms: set[str] = set()
    for _s, aliases in cat.compiled():
        for alias, _strong in aliases:
            a = fx.norm(alias)
            forms |= {f for f in (a, a.replace(" ", "")) if f}
    rx = (
        re.compile(
            r"(?<!\S)(?:"
            + "|".join(re.escape(f) for f in sorted(forms, key=len, reverse=True))
            + r")(?!\S)"
        )
        if forms
        else None
    )
    object.__setattr__(cat, "_artists_series_rx", rx)
    return rx


def _stage_names(cat: fx.Catalog) -> set[str]:
    names = getattr(cat, "_artists_stage_names", None)
    if names is None:
        names = {fx.norm(a) for st in cat.stages for a in (st.name, *st.aliases)}
        object.__setattr__(cat, "_artists_stage_names", names)
    return names


def _segment_skipped(seg_norm: str, cat: fx.Catalog, stage_names: set[str]) -> bool:
    if not seg_norm:
        return True
    if _has_series(seg_norm, cat):
        return True
    if fx.title_years(seg_norm) and len(seg_norm.split()) <= 2:
        return True
    stripped = re.sub(r"\b(?:stage|area|tent|arena)\b", " ", seg_norm).strip()
    stripped = re.sub(r"\s+", " ", stripped)
    if stripped in stage_names:
        return True
    return bool(fx.find_set_type(seg_norm, cat.set_types) and len(seg_norm.split()) <= 3)


def credit_from_title(title: str, cat: fx.Catalog, known: _Known | None = None) -> str | None:
    """The part of a title that names who played («Headhunterz | Defqon.1 2024 | RED» ->
    «Headhunterz»; «Q-dance Radio 512 | Hosted by Villain» -> «Villain»), or None."""
    stage_names = _stage_names(cat)
    known = known or _Known()
    for seg in _TITLE_SPLIT.split(title or ""):
        seg = (seg or "").strip()
        if not seg:
            continue
        m = _BY.search(_BRACKETS.sub(" ", seg))
        if m:
            name = _clean_name(m.group(1))
            if split_credit(name, known):
                return name
            continue
        text = fx.title_text(_BRACKETS.sub(" ", seg))
        if _segment_skipped(text, cat, stage_names):
            continue
        name = _clean_name(seg)
        if known.resolve(name) or split_credit(name, known):
            return name
    return None


# --------------------------------------------------------------------------- seed + rows


@lru_cache(maxsize=2)
def _seed_file(path: str, mtime_ns: int) -> list[dict[str, Any]]:
    data = YAML(typ="safe").load(Path(path).read_text(encoding="utf-8")) or {}
    out = []
    for a in data.get("artists") or []:
        if isinstance(a, Mapping) and str(a.get("name") or "").strip():
            aliases = [str(x).strip() for x in a.get("aliases") or [] if str(x).strip()]
            out.append({"name": str(a["name"]).strip(), "aliases": aliases})
    return out


def seed_data(path: Path | None = None) -> list[dict[str, Any]]:
    p = path or SEED_FILE
    try:
        return _seed_file(str(p), p.stat().st_mtime_ns)
    except Exception as exc:  # broken shipped file: DJ pages still work without it
        log.warning(tr("artist.seed_unreadable", path=p, error=exc))
        return []


def ensure_seeded(db: Database, path: Path | None = None) -> int:
    """Insert the shipped artists once (never again after the user edited or deleted them)."""
    if db.get_state(K_SEED) == SEED_VERSION:
        return 0
    added = 0
    now = now_iso()
    with db.transaction():
        taken = _taken_keys(db)
        for a in seed_data(path):
            k = key_of(a["name"])
            names = {k, *(key_of(x) for x in a["aliases"])}
            if not k or names & taken:
                continue
            db.execute(
                "INSERT INTO artists(key, name, aliases, builtin, created, updated) "
                "VALUES (?,?,?,1,?,?)",
                (k, a["name"], json.dumps(a["aliases"], ensure_ascii=False), now, now),
            )
            taken |= names
            added += 1
        db.execute(
            "INSERT INTO state(key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (K_SEED, SEED_VERSION),
        )
    return added


def _aliases(row: Mapping[str, Any]) -> list[str]:
    try:
        v = json.loads(row.get("aliases") or "[]")
    except (TypeError, ValueError):
        return []
    return [str(x) for x in v if str(x).strip()] if isinstance(v, list) else []


def _rows(db: Database) -> list[dict[str, Any]]:
    return db.query("SELECT * FROM artists ORDER BY id")


def _taken_keys(db: Database, *, except_key: str | None = None) -> set[str]:
    out: set[str] = set()
    for r in _rows(db):
        if r["key"] == except_key:
            continue
        out |= {r["key"], key_of(r["name"]), *(key_of(a) for a in _aliases(r))}
    return out - {""}


def _known(db: Database) -> _Known:
    k = _Known()
    for r in _rows(db):
        r = {**r, "aliases": _aliases(r)}
        k.rows[r["key"]] = r
        for name in (r["key"], key_of(r["name"]), *(key_of(a) for a in r["aliases"])):
            if name:
                k.by_key.setdefault(name, r["key"])
    return k


# --------------------------------------------------------------------------- index


@dataclass
class Artist:
    key: str
    spellings: Counter = field(default_factory=Counter)
    videos: dict[str, str] = field(default_factory=dict)  # video id -> role (solo | b2b)
    row: dict[str, Any] | None = None

    @property
    def name(self) -> str:
        if self.row:
            return str(self.row["name"])
        if self.spellings:
            # most frequent spelling; on a tie the one with more capitals (proper casing)
            return max(
                self.spellings.items(), key=lambda kv: (kv[1], sum(c.isupper() for c in kv[0]))
            )[0]
        return self.key

    @property
    def hidden(self) -> bool:
        return bool(self.row and self.row.get("hidden"))


@dataclass
class Index:
    artists: dict[str, Artist] = field(default_factory=dict)
    by_video: dict[str, list[str]] = field(
        default_factory=dict
    )  # video -> artist keys (credit order)
    rows: dict[str, dict[str, Any]] = field(default_factory=dict)  # video rows (status done)
    # video -> (credit inputs, names): reused by an incremental rebuild for unchanged rows
    memo: dict[str, tuple[tuple[Any, ...], list[str]]] = field(default_factory=dict)

    def visible(self, key: str) -> Artist | None:
        a = self.artists.get(key)
        return a if a is not None and not a.hidden and a.videos else None

    def names_of(self, video_id: str) -> list[str]:
        return [
            self.artists[k].name
            for k in self.by_video.get(video_id, [])
            if not self.artists[k].hidden
        ]


K_REV_ROWS = "artists_rev_rows"
K_REV_NAMES = "artists_rev_names"


def _revisions(db: Database) -> tuple[str | None, str | None]:
    """(rows, names) cache versions, bumped by DB triggers (migration 14) on every write that
    the index depends on - festival assignment, collector credits, retag, delete, downloads,
    artist edits, series edits - in this process or another one (headless run)."""
    r = db.query("SELECT key, value FROM state WHERE key IN (?, ?)", (K_REV_ROWS, K_REV_NAMES))
    d = {x["key"]: x["value"] for x in r}
    return d.get(K_REV_ROWS), d.get(K_REV_NAMES)


def _settings_sig(settings: Settings) -> tuple[Any, ...]:
    fs = settings.festivals
    return (
        tuple(fs.extra_stages),
        tuple((e.keyword, e.set_type) for e in fs.extra_set_types),
    )


def _signature(db: Database, settings: Settings) -> tuple[Any, ...]:
    return (*_revisions(db), _settings_sig(settings))


def bump(db: Database) -> None:
    """Force a full rebuild of the DJ index on its next use (in every process): the one cache
    version bump for writes the triggers cannot see."""
    with db.transaction():
        for k in (K_REV_ROWS, K_REV_NAMES):
            db.execute(
                "INSERT INTO state(key, value) VALUES (?, '1') ON CONFLICT(key) DO UPDATE "
                "SET value = CAST(value AS INTEGER) + 1",
                (k,),
            )
    invalidate(db)


def invalidate(db: Database | None = None) -> None:
    """Drop the cached index of this process (the next use rebuilds it completely)."""
    with _LOCK:
        if db is None:
            _CACHE.clear()
        else:
            _CACHE.pop(id(db), None)


def index(db: Database, settings: Settings) -> Index:
    """Artist index of the library (cached; see `_signature`). If only library rows changed
    (a download, a festival assignment, a retag, a delete), the cached index is updated
    incrementally: only rows whose credit inputs changed are parsed again."""
    ensure_seeded(db)
    series.sync_builtin(db)  # may write the series table: before the signature is read
    sig = _signature(db, settings)
    with _LOCK:
        hit = _CACHE.get(id(db))
    if hit and hit[0] == sig and None not in sig[:2]:
        return hit[1]
    prev = hit[1] if hit and hit[0][1:] == sig[1:] and None not in sig[:2] else None
    idx = build_index(db, settings, previous=prev)
    with _LOCK:
        _CACHE[id(db)] = (sig, idx)
    return idx


def _organiser_channels(cat: fx.Catalog) -> set[str]:
    return {fx.norm(c) for s in cat.series for c in s.channels if fx.norm(c)}


# set types after which a title names a show, not a DJ («Qlimax 2024 | Rise of the Celestials |
# Full Show», «Qlimax 2023 | The Anthem Show»)
_SHOW_TYPES = {"full_show", "anthem"}


def _has_series(text_norm: str, cat: fx.Catalog) -> bool:
    rx = _series_rx(cat)
    return bool(rx and rx.search(text_norm))


def title_names(row: Mapping[str, Any], cat: fx.Catalog, known: _Known) -> list[str]:
    """Artists named in the title. Only trusted where the title format is known: a festival /
    radio title (series name or assigned edition), «… by <DJ>», a known artist, or the
    channel's own name. «Overdrive – 1 Hour Uptempo Mix» from a mix channel names no DJ."""
    title = str(row.get("title") or "")
    text = fx.title_text(title)
    if fx.find_set_type(text, cat.set_types) in _SHOW_TYPES:
        return []
    credit = credit_from_title(title, cat, known)
    names = split_credit(credit, known) if credit else []
    if not names:
        return []
    channel = key_of(row.get("channel_name"))
    if (
        row.get("edition_id")
        or _has_series(text, cat)
        or _BY.search(title)
        or any(known.resolve(n) for n in names)
        or (channel and any(key_of(n) == channel for n in names))
    ):
        return names
    return []


def channel_names(row: Mapping[str, Any], organisers: set[str], known: _Known) -> list[str]:
    """The channel as artist: not an organiser channel, not a festival set, and the channel's
    name appears in the title (an artist uploading their own set names themselves; a mix
    channel's «Euphoric Hardstyle Yearmix» does not)."""
    ch = str(row.get("channel_name") or "").strip()
    if not ch or fx.norm(ch) in organisers or row.get("edition_id"):
        return []
    if not known.resolve(ch) and key_of(ch) not in key_of(row.get("title")):
        return []
    return split_credit(ch, known)


_ROW_COLS = (
    "id, title, channel_id, channel_name, duration, upload_date, downloaded_at, genre, "
    "edition_id, stage, set_type, platform, file_path"
)


def _names_of_row(
    row: Mapping[str, Any],
    credit: str | None,
    cat: fx.Catalog,
    organisers: set[str],
    known: _Known,
) -> list[str]:
    names = split_credit(credit, known) if credit else []
    if not names:
        names = title_names(row, cat, known)
    if not names:
        names = channel_names(row, organisers, known)
    return names


def build_index(db: Database, settings: Settings, *, previous: Index | None = None) -> Index:
    """Derive the index. With `previous` (same artist table and catalogue, see `index`), rows
    whose title/channel/edition/collector credit did not change reuse their parsed names."""
    known = _known(db)
    cat: fx.Catalog | None = None
    organisers: set[str] = set()
    idx = Index()
    for k, r in known.rows.items():
        idx.artists[k] = Artist(key=k, row=r)
    collector: dict[str, str] = {}
    for r in db.query(
        "SELECT video_id, artist FROM checklist_rows WHERE video_id IS NOT NULL AND confirmed = 1 "
        "ORDER BY position, id"
    ):
        collector.setdefault(r["video_id"], r["artist"])
    rows = db.query(f"SELECT {_ROW_COLS} FROM videos WHERE status = 'done'")
    memo = previous.memo if previous is not None else {}
    for row in rows:
        vid = row["id"]
        idx.rows[vid] = row
        credit = collector.get(vid)
        inputs = (
            credit,
            row.get("title"),
            row.get("channel_name"),
            bool(row.get("edition_id")),
        )
        hit = memo.get(vid)
        if hit is not None and hit[0] == inputs:
            names = hit[1]
        else:
            if cat is None:
                cat = series.catalog(db, settings)
                organisers = _organiser_channels(cat)
            names = _names_of_row(row, credit, cat, organisers, known)
        idx.memo[vid] = (inputs, names)
        if not names:
            continue
        role = "b2b" if len(names) > 1 else "solo"
        keys: list[str] = []
        for n in names:
            k = known.resolve(n) or key_of(n)
            if not k or k in keys:
                continue
            a = idx.artists.get(k)
            if a is None:
                a = idx.artists[k] = Artist(key=k)
            a.spellings[n] += 1
            a.videos[vid] = role
            keys.append(k)
        if len(keys) == 1 and role == "b2b":  # «HH & Headhunterz»: one artist after all
            idx.artists[keys[0]].videos[vid] = "solo"
        if keys:
            idx.by_video[vid] = keys
    return idx


# --------------------------------------------------------------------------- views


def _year(row: Mapping[str, Any], editions: Mapping[int, dict[str, Any]]) -> int | None:
    ed = editions.get(row.get("edition_id")) if row.get("edition_id") else None
    if ed and ed.get("event_year"):
        return int(ed["event_year"])
    m = re.match(r"^(\d{4})", str(row.get("upload_date") or ""))
    return int(m.group(1)) if m else None


def initials(name: str) -> str:
    """«Sub Zero Project» -> «SZ», «Headhunterz» -> «HE», «D-Block & S-te-Fan» -> «DS»."""
    words = [w for w in re.split(r"[^\w]+", name or "") if w and not w.isdigit()]
    if not words:
        return (name or "?")[:2].upper()
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[-1][0] if len(words) == 2 else words[0][0] + words[1][0]).upper()


def _summary(a: Artist, idx: Index, editions: Mapping[int, dict[str, Any]]) -> dict[str, Any]:
    rows = [idx.rows[v] for v in a.videos if v in idx.rows]
    years = {y for y in (_year(r, editions) for r in rows) if y}
    fests = {
        editions[r["edition_id"]]["series_id"]
        for r in rows
        if r.get("edition_id")
        and r["edition_id"] in editions
        and editions[r["edition_id"]].get("kind") == "festival"
    }
    last = max(
        (str(r.get("upload_date") or r.get("downloaded_at") or "") for r in rows), default=""
    )
    return {
        "key": a.key,
        "name": a.name,
        "initials": initials(a.name),
        "aliases": list((a.row or {}).get("aliases") or []),
        "spellings": sorted(a.spellings, key=lambda s: -a.spellings[s]),
        "channel_url": (a.row or {}).get("channel_url") or None,
        "edited": bool(a.row and not a.row.get("builtin")),
        "hidden": a.hidden,
        "sets": len(rows),
        "b2b": sum(1 for v in a.videos.values() if v == "b2b"),
        "seconds": int(sum(int(r.get("duration") or 0) for r in rows)),
        "festivals": len(fests),
        "years": sorted(years),
        "last": last[:10] or None,
    }


def list_artists(
    db: Database, settings: Settings, opts: Mapping[str, Any] | None = None
) -> list[dict[str, Any]]:
    """All artists with at least one set in the library. opts: `search` (name/alias),
    `sort` sets (default) | recent | name, `hidden` (true = only hidden ones)."""
    o = opts or {}
    idx = index(db, settings)
    editions = series.edition_map(db)
    want_hidden = bool(o.get("hidden"))
    q = fx.norm(str(o.get("search") or ""))
    out = []
    for a in idx.artists.values():
        if not a.videos or a.hidden != want_hidden:
            continue
        s = _summary(a, idx, editions)
        if q:
            hay = fx.norm(" ".join([s["name"], *s["aliases"], *s["spellings"]]))
            if q not in hay and q.replace(" ", "") not in a.key:
                continue
        out.append(s)
    sort = str(o.get("sort") or "sets")
    if sort == "recent":
        out.sort(key=lambda s: (s["last"] or "", s["sets"]), reverse=True)
    elif sort == "name":
        out.sort(key=lambda s: fx.norm(s["name"]))
    else:
        out.sort(key=lambda s: (-s["sets"], -s["seconds"], fx.norm(s["name"])))
    return out


def resolve_key(db: Database, settings: Settings, key: str) -> str | None:
    """Key or any alias/spelling -> the artist key (None = unknown)."""
    idx = index(db, settings)
    k = str(key or "")
    if k in idx.artists:
        return k
    known = _known(db)
    return known.resolve(k) or (key_of(k) if key_of(k) in idx.artists else None)


def video_ids(db: Database, settings: Settings, key: str) -> list[str]:
    """Sets of an artist (newest first)."""
    idx = index(db, settings)
    a = idx.artists.get(str(key))
    if a is None:
        return []
    rows = [idx.rows[v] for v in a.videos if v in idx.rows]
    rows.sort(
        key=lambda r: (str(r.get("upload_date") or ""), str(r.get("downloaded_at") or "")),
        reverse=True,
    )
    return [r["id"] for r in rows]


def credits(db: Database, settings: Settings, video_id: str) -> list[str]:
    """Display names of the artists of a set (credit order), [] if none is known."""
    return index(db, settings).names_of(str(video_id))


def top_tracks(db: Database, ids: Sequence[str], limit: int = TOP_TRACKS) -> list[dict[str, Any]]:
    """Tracks this artist played most often (from the offline tracklists; empty without)."""
    if not ids:
        return []
    out: list[dict[str, Any]] = []
    marks = ",".join("?" for _ in ids)
    try:
        rows = db.query(
            "SELECT key, COUNT(DISTINCT video_id) AS sets, MIN(artist) AS artist, "
            "MIN(title) AS title, MIN(version) AS version FROM tracks "
            f"WHERE video_id IN ({marks}) AND key <> '' AND is_id = 0 "
            "GROUP BY key ORDER BY sets DESC, key LIMIT ?",
            [*ids, int(limit)],
        )
    except Exception:  # tracklist tables missing in a very old test DB: no tracks
        return []
    for r in rows:
        out.append(
            {
                "artist": r["artist"] or "",
                "title": r["title"] or "",
                "version": r["version"] or "",
                "sets": int(r["sets"]),
            }
        )
    return out


def detail(db: Database, settings: Settings, key: str) -> dict[str, Any] | None:
    """{artist (summary), sets: [{id, role, with}], tracks} or None if unknown/without sets."""
    k = resolve_key(db, settings, key)
    if k is None:
        return None
    idx = index(db, settings)
    a = idx.artists.get(k)
    if a is None or not a.videos:
        return None
    editions = series.edition_map(db)
    sets = []
    for vid in video_ids(db, settings, k):
        others = [
            idx.artists[o].name
            for o in idx.by_video.get(vid, [])
            if o != k and not idx.artists[o].hidden
        ]
        sets.append({"id": vid, "role": a.videos.get(vid, "solo"), "with": others})
    return {
        "artist": _summary(a, idx, editions),
        "sets": sets,
        "tracks": top_tracks(db, [s["id"] for s in sets]),
    }


# --------------------------------------------------------------------------- editing


def _clean_aliases(values: Any, errors: dict[str, str]) -> list[str]:
    if values is None:
        return []
    if not isinstance(values, (list, tuple)):
        errors["aliases"] = tr("artist.aliases_invalid")
        return []
    out: list[str] = []
    seen: set[str] = set()
    for v in values:
        s = re.sub(r"\s+", " ", str(v or "")).strip()
        if not s:
            continue
        if len(s) > MAX_NAME:
            errors["aliases"] = tr("artist.alias_too_long", max=MAX_NAME)
            continue
        if key_of(s) and key_of(s) not in seen:
            seen.add(key_of(s))
            out.append(s)
    if len(out) > MAX_ALIASES:
        errors["aliases"] = tr("artist.too_many_aliases", max=MAX_ALIASES)
    return out


def _channel_url(value: Any, errors: dict[str, str]) -> str | None:
    s = str(value or "").strip()
    if not s:
        return None
    from . import watchlist  # lazy: watchlist imports more

    if len(s) > MAX_CHANNEL_URL:
        errors["channel_url"] = tr("source.url_too_long")
        return None
    _clean, errs = watchlist.validate_source(
        {"type": "channel", "name": "x", "url_or_query": s}, Settings()
    )
    if errs:
        errors["channel_url"] = errs.get("url_or_query") or tr("artist.channel_invalid")
        return None
    return s


def _row(db: Database, key: str) -> dict[str, Any] | None:
    r = db.query_one("SELECT * FROM artists WHERE key = ?", (key,))
    return {**r, "aliases": _aliases(r)} if r else None


def _write(db: Database, key: str, name: str, aliases: list[str], **fields: Any) -> None:
    now = now_iso()
    cur = _row(db, key)
    if cur is None:
        db.execute(
            "INSERT INTO artists(key, name, aliases, channel_url, hidden, builtin, created, "
            "updated) VALUES (?,?,?,?,?,0,?,?)",
            (
                key,
                name,
                json.dumps(aliases, ensure_ascii=False),
                fields.get("channel_url"),
                int(bool(fields.get("hidden", False))),
                now,
                now,
            ),
        )
        return
    db.execute(
        "UPDATE artists SET name=?, aliases=?, channel_url=?, hidden=?, builtin=0, updated=? "
        "WHERE key=?",
        (
            name,
            json.dumps(aliases, ensure_ascii=False),
            fields.get("channel_url", cur.get("channel_url")),
            int(bool(fields.get("hidden", cur.get("hidden")))),
            now,
            key,
        ),
    )


def save_artist(db: Database, settings: Settings, data: Mapping[str, Any]) -> dict[str, Any]:
    """Create or edit an artist. data: {key? (existing/derived artist), name, aliases[],
    channel_url?}. A name or alias that already belongs to another artist is refused (merge
    instead). Returns the key."""
    errors: dict[str, str] = {}
    name = re.sub(r"\s+", " ", str(data.get("name") or "")).strip()
    if not name:
        errors["name"] = tr("artist.name_missing")
    elif len(name) > MAX_NAME:
        errors["name"] = tr("artist.name_too_long", max=MAX_NAME)
    aliases = _clean_aliases(data.get("aliases"), errors)
    channel = _channel_url(data.get("channel_url"), errors)
    key = str(data.get("key") or "").strip() or key_of(name)
    if not key:
        errors.setdefault("name", tr("artist.name_missing"))
    if errors:
        raise ArtistError(errors)
    aliases = [a for a in aliases if key_of(a) not in (key, key_of(name))]
    # a name/alias of another saved artist is refused (merge instead); an alias that is a
    # derived artist (no row) is fine: its sets simply count for this artist from now on
    taken = _taken_keys(db, except_key=key)
    for n, fld in ((name, "name"), *((a, "aliases") for a in aliases)):
        if key_of(n) in taken:
            errors[fld] = tr("artist.name_taken", name=n, owner=_owner_name(db, key_of(n)))
            break
    if errors:
        raise ArtistError(errors)
    with db.transaction():
        _write(db, key, name, aliases, channel_url=channel)
    invalidate(db)
    log.info(tr("artist.saved", name=name))
    return {"key": key}


def _owner_name(db: Database, k: str) -> str:
    known = _known(db)
    owner = known.by_key.get(k) or k
    row = known.rows.get(owner)
    return str(row["name"]) if row else owner


def merge(db: Database, settings: Settings, keys: Iterable[str], into: str) -> dict[str, Any]:
    """Merge artists into `into`: their names, spellings and aliases become aliases of it,
    their own rows disappear. Sets of both now count for one artist."""
    idx = index(db, settings)
    target = idx.artists.get(str(into))
    if target is None:
        raise ArtistError({"key": tr("artist.unknown")})
    sources = [
        idx.artists[k]
        for k in dict.fromkeys(str(k) for k in keys)
        if k in idx.artists and k != target.key
    ]
    if not sources:
        raise ArtistError({"keys": tr("artist.nothing_to_merge")})
    trow = _row(db, target.key)
    aliases = list((trow or {}).get("aliases") or [])
    have = {key_of(a) for a in aliases} | {target.key, key_of(target.name)}
    for s in sources:
        for n in (s.name, *((s.row or {}).get("aliases") or []), *s.spellings):
            if key_of(n) and key_of(n) not in have:
                have.add(key_of(n))
                aliases.append(n)
    if len(aliases) > MAX_ALIASES:  # refuse instead of dropping spellings (they would split off)
        raise ArtistError({"keys": tr("artist.merge_too_many", name=target.name, max=MAX_ALIASES)})
    with db.transaction():
        for s in sources:
            db.execute("DELETE FROM artists WHERE key = ?", (s.key,))
        _write(
            db,
            target.key,
            target.name,
            aliases,
            channel_url=(trow or {}).get("channel_url")
            or next(
                (
                    (s.row or {}).get("channel_url")
                    for s in sources
                    if (s.row or {}).get("channel_url")
                ),
                None,
            ),
        )
    invalidate(db)
    log.info(tr("artist.merged", names=", ".join(s.name for s in sources), name=target.name))
    return {"key": target.key}


def split(db: Database, settings: Settings, key: str, alias: str) -> dict[str, Any]:
    """Remove an alias again: sets with that spelling count for their own artist."""
    row = _row(db, str(key))
    if row is None:
        raise ArtistError({"key": tr("artist.unknown")})
    ak = key_of(alias)
    left = [a for a in row["aliases"] if key_of(a) != ak]
    if len(left) == len(row["aliases"]):
        raise ArtistError({"alias": tr("artist.alias_unknown", alias=alias)})
    with db.transaction():
        _write(db, row["key"], row["name"], left)
    invalidate(db)
    log.info(tr("artist.split", alias=alias, name=row["name"]))
    return {"key": row["key"], "split": ak}


def set_hidden(db: Database, settings: Settings, key: str, hidden: bool) -> dict[str, Any]:
    idx = index(db, settings)
    a = idx.artists.get(str(key))
    if a is None:
        raise ArtistError({"key": tr("artist.unknown")})
    with db.transaction():
        _write(db, a.key, a.name, list((a.row or {}).get("aliases") or []), hidden=bool(hidden))
    invalidate(db)
    return {"key": a.key, "hidden": bool(hidden)}


# --------------------------------------------------------------------------- watchlist


def watch_proposal(db: Database, settings: Settings, key: str) -> dict[str, Any] | None:
    """What «Add to watchlist» would create: the artist's own channel if known (stored
    `channel_url`, or a channel of their sets whose name is the artist), else a search source
    «<DJ> live set». Language-neutral query (it is sent to YouTube)."""
    from . import discover  # lazy

    k = resolve_key(db, settings, key)
    idx = index(db, settings)
    a = idx.artists.get(k or "")
    if a is None:
        return None
    url = (a.row or {}).get("channel_url")
    names = {a.key, key_of(a.name), *(key_of(x) for x in (a.row or {}).get("aliases") or [])}
    if not url:
        for vid in a.videos:
            r = idx.rows.get(vid) or {}
            cid = str(r.get("channel_id") or "")
            if not cid or key_of(r.get("channel_name")) not in names:
                continue
            if cid.startswith("sc:"):
                url = discover.soundcloud_channel_page(db, cid)
            elif re.fullmatch(r"UC[0-9A-Za-z_-]{22}", cid):
                url = f"https://www.youtube.com/channel/{cid}"
            if url:
                break
    if url:
        return {"type": "channel", "name": a.name, "url_or_query": url, "artist": a.name}
    return {
        "type": "search",
        "name": f"{a.name} live set",
        "url_or_query": f"{a.name} live set",
        "platform": "youtube",
        "artist": a.name,
    }
