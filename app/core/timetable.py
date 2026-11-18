"""Timetables for the v0.5.0 «Festival collector» - pure functions, no network.

- `parse(text, stages, set_types)`: pasted timetable text or CSV -> rows
  `{artist, stage, day, start, end, set_type}`. Robust against the usual shapes:
  `18:00 - 19:00 Headhunterz`, `Headhunterz 18:00–19:00`, `Headhunterz | 18:00–19:00 | RED`,
  `18.00 Headhunterz (RED)`, CSV/TSV/semicolon tables with a header row, day headings
  (`Saturday`, `Samstag 28.06.`, `Day 2`, `## Zaterdag`) and stage headings (`RED`, `Stage: BLUE`,
  `[UV]`, `Mainstage:`, `=== The Gathering Stage ===`), combined headings (`Saturday – RED`,
  `SAT | RED STAGE`), `Sat 18.00–19.00 Name @ PURPLE`, CSV without header row (columns told
  apart by content). Emoji/symbols and `**bold**` are removed first. A line without a time that
  is no heading is a row with the artist only (plain line-up lists); a line without any letter
  or digit is never a stage: it is reported in `skipped` (unless it is a separator like `=====`).
  Nothing is guessed from websites: the user pastes, the parser only splits
  (docs/concepts/festivals.md, no scraping).
- Shipped timetable files `app/data/timetables/<series-key>/<year>[-<variant>].json`
  (`list_files`, `load_file`); format in docs/bridge-api.md «Festival collector».

Times are normalised to `HH:MM` (24 h), `set_type` is a code of festivals.SET_TYPES or None.
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from . import festivals as fx

MAX_ARTIST = 120
MAX_STAGE = 40
MAX_DAY = 40
MAX_LINES = 2000  # a pasted timetable larger than this is cut (never a real festival)
MAX_TEXT = 512 * 1024  # characters; a larger paste is cut before anything is parsed
MAX_LINE = 500  # characters per line (a real timetable line is far shorter)
FILE_FORMAT = 1
DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "timetables"

# --------------------------------------------------------------------------- times

_AMPM = r"(?:\s*[ap]\.?\s?m\.?)"
_T = rf"(?:(?:[01]?\d|2[0-4])\s?[:.hH]\s?[0-5]\d{_AMPM}?|(?:1[0-2]|0?[1-9]){_AMPM})"
_SEP = r"\s*(?:-|–|—|~|to|bis|until|tot|à|a)\s*"
_RANGE_RE = re.compile(
    rf"(?<![\d:.])(?P<s>{_T}){_SEP}(?P<e>{_T})(?![\d:])"
    r"|(?<![\d:.])(?P<s4>(?:[01]\d|2[0-4])[0-5]\d)\s*[-–—]\s*(?P<e4>(?:[01]\d|2[0-4])[0-5]\d)(?!\d)",
    re.I,
)
_SINGLE_START_RE = re.compile(rf"^(?P<t>{_T})(?![\d:])", re.I)
_SINGLE_END_RE = re.compile(rf"(?<![\d:.])(?P<t>{_T})$", re.I)
_TIME_PARTS = re.compile(r"^(\d{1,2})(?:\s?[:.hH]\s?(\d{2}))?\s*(?:([ap])\.?\s?m\.?)?$", re.I)
_FOUR = re.compile(r"^(\d{2})(\d{2})$")


def norm_time(text: str | None) -> str | None:
    """'18:00' / '18.00' / '18h00' / '6pm' / '6:30 PM' / '1800' -> 'HH:MM'; else None."""
    t = str(text or "").strip()
    if not t:
        return None
    m = _FOUR.match(t)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
    else:
        m = _TIME_PARTS.match(t)
        if not m:
            return None
        h, mi = int(m.group(1)), int(m.group(2) or 0)
        ap = (m.group(3) or "").lower()
        if ap:
            if not 1 <= h <= 12:
                return None
            h = (h % 12) + (12 if ap == "p" else 0)
    if h == 24 and mi == 0:
        h = 0
    if not (0 <= h <= 23 and 0 <= mi <= 59):
        return None
    return f"{h:02d}:{mi:02d}"


def _find_times(text: str) -> tuple[str | None, str | None, str]:
    """(start, end, text without the time part)."""
    m = _RANGE_RE.search(text)
    if m:
        s = norm_time(m.group("s") or m.group("s4"))
        e = norm_time(m.group("e") or m.group("e4"))
        if s and e:
            return s, e, (text[: m.start()] + " " + text[m.end() :]).strip()
    for rx in (_SINGLE_START_RE, _SINGLE_END_RE):
        m = rx.search(text.strip())
        if m:
            s = norm_time(m.group("t"))
            if s:
                stripped = text.strip()
                return s, None, (stripped[: m.start()] + " " + stripped[m.end() :]).strip()
    return None, None, text


# --------------------------------------------------------------------------- days

_WEEKDAYS = {
    # en, de, nl, fr, es, sv/nb, fi (enough for the festivals in series.yaml)
    0: ("monday", "mon", "montag", "mo", "maandag", "ma", "lundi", "lunes", "mandag", "måndag"),
    1: ("tuesday", "tue", "tues", "dienstag", "di", "dinsdag", "mardi", "martes", "tisdag"),
    2: ("wednesday", "wed", "mittwoch", "mi", "woensdag", "wo", "mercredi", "miércoles"),
    3: ("thursday", "thu", "thur", "thurs", "donnerstag", "do", "donderdag", "jeudi", "jueves"),
    4: ("friday", "fri", "freitag", "fr", "vrijdag", "vr", "vendredi", "viernes", "fredag"),
    5: ("saturday", "sat", "samstag", "sa", "zaterdag", "za", "samedi", "sábado", "lördag"),
    6: ("sunday", "sun", "sonntag", "so", "zondag", "zo", "dimanche", "domingo", "söndag"),
}
_DAY_WORDS = {w for names in _WEEKDAYS.values() for w in names}
_LONG_DAY_WORDS = {w for w in _DAY_WORDS if len(w) > 3}
_DAY_N_RE = re.compile(r"^(?:day|tag|dag|jour|dia|día|päivä)\s*\d{1,2}$", re.I)
_MONTHS = (
    "jan january januar januari janvier enero feb february februar februari fevrier février "
    "mar march märz maart mars marzo apr april avril abril may mai mei mayo jun june juni juin "
    "junio jul july juli juillet julio aug august augustus aout août agosto sep sept september "
    "septembre oct october oktober octobre octubre nov november novembre dec december dezember "
    "december décembre diciembre"
).split()


_MONTH_SET = frozenset(_MONTHS)
_DATE_RE = re.compile(
    r"^(?:(?P<d>\d{1,2})(?P<sep>[./-])(?P<m>\d{1,2})(?:(?P=sep)(?P<y>\d{2}|\d{4}))?(?P<dot>\.)?"
    r"|(?P<iy>\d{4})-(?P<im>\d{1,2})-(?P<id>\d{1,2}))$"
)
_ORDINAL_RE = re.compile(r"^(\d{1,2})(?:st|nd|rd|th|e|er|de|ste|\.)?$", re.I)
_DAY_TOKEN_SPLIT = re.compile(r"[\s,()\[\]|–—]+")
_DAY_FILLER = frozenset(("den", "the", "of", "le", "el", "de", "on", "-", "/", "&"))
_DAY_N_WORDS = frozenset(("day", "tag", "dag", "jour", "dia", "día", "päivä"))


def _date_token(tok: str, *, weekday: bool) -> bool:
    """«12.07.», «12/07», «12.7.2025», «2025-07-12» with a valid day and month. A bare «12.07»
    (could be a time) only counts next to a weekday."""
    m = _DATE_RE.match(tok)
    if not m:
        return False
    if m.group("iy"):
        d, mo = int(m.group("id")), int(m.group("im"))
    else:
        d, mo = int(m.group("d")), int(m.group("m"))
        strong = m.group("sep") != "." or m.group("y") or m.group("dot")
        if not strong and not weekday:
            return False
    return 1 <= d <= 31 and 1 <= mo <= 12


def _day_heading(text: str) -> str | None:
    """The day label when `text` is a day heading: a weekday and/or a date and nothing else
    («Saturday», «Samstag, 12.07.», «Sa. 12.7.2025», «12/07 – Saturday», «Saturday 12 July»,
    «Sunday, July 13th», «Day 2 – Saturday», «12.07.2025»)."""
    clean = text.strip().strip(":").strip()
    if not clean or len(clean) > MAX_DAY:
        return None
    if _DAY_N_RE.match(clean):
        return clean
    tokens = [t.strip(":") for t in _DAY_TOKEN_SPLIT.split(clean)]
    tokens = [t for t in tokens if t]
    if not tokens:
        return None
    folded = [t.casefold() for t in tokens]
    has_weekday = any(f.rstrip(".") in _DAY_WORDS for f in folded)
    weekdays = day_n = dates = months = numbers = 0
    i = 0
    while i < len(tokens):
        f = folded[i]
        word = f.rstrip(".")
        if word in _DAY_WORDS:
            weekdays += 1
        elif word in _DAY_N_WORDS and i + 1 < len(tokens) and tokens[i + 1].isdigit():
            day_n += 1
            i += 1
        elif word in _MONTH_SET:
            months += 1
        elif _date_token(f, weekday=has_weekday):
            dates += 1
        elif re.fullmatch(r"(?:19|20)\d{2}", f):
            pass  # a year
        elif _ORDINAL_RE.match(f) and 1 <= int(_ORDINAL_RE.match(f).group(1)) <= 31:
            numbers += 1
        elif f not in _DAY_FILLER:
            return None
        i += 1
    if weekdays > 1 or day_n > 1 or dates > 1 or months > 1:
        return None
    if weekdays or day_n:
        if numbers and not months and not dates and weekdays and not day_n:
            # «Sa 12»: a short weekday with a bare number is no heading; «Saturday 12» is
            first = next(f for f in folded if f.rstrip(".") in _DAY_WORDS).rstrip(".")
            if first not in _LONG_DAY_WORDS:
                return None
        return clean
    if dates or (months and numbers):
        return clean  # a date alone («12.07.2025», «12 July»)
    return None


_DAY_LEAD = re.compile(r"^([^\W\d_]{2,12})\.?(?: ?[|,:/\-–—])? ?(?=\d)")


def _day_lead(text: str) -> tuple[str | None, str]:
    """«Sat 18.00-19.00 Lil Texas» -> ('Sat', '18.00-19.00 Lil Texas'): a weekday directly in
    front of the time of a set line; anything else -> (None, text)."""
    m = _DAY_LEAD.match(text)
    if m and m.group(1).casefold() in _DAY_WORDS:
        return m.group(1), text[m.end() :]
    return None, text


# separators between day and stage in one heading: punctuation (also «Sat | RED», «Sat, RED»)
# or plain spaces («SAT RED STAGE»); the searched text is a short heading line
_HEAD_SEP = re.compile(r" ?(?:[|,:/–—]|-(?= )) ?| ")


def _combined_heading(text: str, names: dict[str, str]) -> tuple[str, str] | None:
    """«Saturday – RED» / «SAT | RED STAGE» / «RED - Sunday» -> (day, stage); else None."""
    if len(text) > MAX_DAY + MAX_STAGE or not re.search(r"[^\W\d_]", text):
        return None
    seps = list(_HEAD_SEP.finditer(text))[:16]
    for m in reversed(seps):  # the last separator first: «Saturday 28.06. – RED»
        a, b = text[: m.start()].strip(), text[m.end() :].strip()
        if not a or not b:
            continue
        punct = m.group(0).strip() != ""
        day = _day_heading(a)
        if day and (punct or len(a.split()[0]) >= 3):
            stage = _stage_label(b, names, loose=punct)
            if stage:
                return day, stage
        day = _day_heading(b) if punct else None
        if day:
            stage = _stage_label(a, names, loose=True)
            if stage:
                return day, stage
    return None


# --------------------------------------------------------------------------- stages

_STAGE_WORDS = frozenset(
    "stage bühne buhne buehne area arena tent hall floor podium room zone dome hangar garden "
    "terrace theatre theater circus temple cathedral mainstage".split()
)
_STAGE_SUFFIXES = ("stage", "floor", "podium", "bühne", "buhne", "arena")
# colour names of festival stages (Defqon.1, Qlimax, Decibel ...): a line with only a colour is
# a stage heading even without a catalog
_COLOURS = frozenset(
    "red blue black uv yellow indigo magenta gold silver purple green orange white pink grey "
    "gray violet brown".split()
)
_STAGE_PREFIX = re.compile(r"^(?:stage|bühne|buhne|area|podium)\s*[:\-–]\s*(.+)$", re.I)


def _stage_word(word: str) -> bool:
    """«stage», «arena», «mainstage», «hoofdpodium», «dancefloor»."""
    return word in _STAGE_WORDS or (len(word) > 5 and word.endswith(_STAGE_SUFFIXES))


def _has_stage_word(text: str) -> bool:
    return any(_stage_word(w) for w in fx.norm(text).split())


def _colour_label(text: str) -> bool:
    """«RED», «Black», «UV stage»: only a colour name (and the word stage)."""
    words = fx.norm(text).split()
    if words and words[-1] in ("stage", "area"):
        words = words[:-1]
    return len(words) == 1 and words[0] in _COLOURS


def _stage_names(stages: Sequence[fx.StageDef]) -> dict[str, str]:
    """{normalised alias: stage name}."""
    out: dict[str, str] = {}
    for st in stages:
        for alias in (st.name, *st.aliases):
            n = fx.norm(alias)
            if n:
                out.setdefault(n, st.name)
    return out


def _known_stage(text: str, names: dict[str, str]) -> str | None:
    n = fx.norm(text)
    if not n:
        return None
    if n in names:
        return names[n]
    for suffix in (" stage", " area", " buhne"):
        if n.endswith(suffix) and n[: -len(suffix)] in names:
            return names[n[: -len(suffix)]]
    if n.startswith("stage ") and n[6:] in names:
        return names[n[6:]]
    return None


def _clean_stage(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" :-–—=*#[]()|").strip()[:MAX_STAGE]


def _has_letter(text: str | None) -> bool:
    return bool(text) and re.search(r"[^\W\d_]", text) is not None


def _stage_label(text: str, names: dict[str, str], *, loose: bool = False) -> str | None:
    """`text` as a stage name: known stage, «Stage: X», a stage word, a short capital label
    («RED», «THE GATHERING»); `loose` also accepts any short name («Black»)."""
    text = text.strip()
    if not _has_letter(text) or len(text) > MAX_STAGE or re.match(r"^\d", text):
        return None
    m = _STAGE_PREFIX.match(text)
    if m:
        return _known_stage(m.group(1), names) or _clean_stage(m.group(1)) or None
    known = _known_stage(text, names)
    if known:
        return known
    words = fx.norm(text).split()
    if not 0 < len(words) <= 6:
        return None
    if _has_stage_word(text) or _caps_label(text) or (loose and len(words) <= 3):
        return _clean_stage(text) or None
    return None


def _stage_heading(
    raw: str, text: str, names: dict[str, str], *, wrapped: bool = False
) -> str | None:
    """Stage label when the (time-less) line is a stage heading, else None. `wrapped`: the
    line was framed by decoration («🔥 RED 🔥», «=== RED ===»)."""
    if not _has_letter(text):
        return None  # «????? ##» is never a stage
    m = _STAGE_PREFIX.match(text)
    if m:
        return _known_stage(m.group(1), names) or _clean_stage(m.group(1))
    known = _known_stage(text, names)
    if known:
        return known
    marked = (
        wrapped
        or raw.lstrip().startswith(("#", "[", "==", "--", "**"))
        or raw.rstrip().endswith(":")
        or re.match(r"^\s*\[.+\]\s*$", raw) is not None
    )
    words = fx.norm(text).split()
    if _colour_label(text):
        return _clean_stage(text)
    if _has_stage_word(text) and len(words) <= 6:
        return _clean_stage(text)
    if marked and 0 < len(words) <= 6:
        return _clean_stage(text)
    return None


# --------------------------------------------------------------------------- set types


def _set_type(text: str, set_types: Sequence[fx.SetTypeDef]) -> str | None:
    n = fx.norm(text)
    for st in set_types:
        for kw in st.keywords:
            k = fx.norm(kw)
            if k and f" {k} " in f" {n} ":
                return st.code
    return None


_GROUP_RE = re.compile(r"[(\[]([^()\[\]]*)[)\]]")
_LIVE_TAIL = re.compile(r" (?:\(live\)|-\s*live|LIVE)$")


def _split_artist(
    text: str, names: dict[str, str], set_types: Sequence[fx.SetTypeDef]
) -> tuple[str, str | None, str | None]:
    """Artist text -> (artist, stage, set type): bracket groups / «@ RED» / «- RED» with a
    known stage become the stage, bracket groups with a set-type keyword the set type."""
    stage = None
    set_type = None
    out = text

    def group(m: re.Match[str]) -> str:
        nonlocal stage, set_type
        inner = m.group(1).strip()
        known = _known_stage(inner, names)
        if known and stage is None:
            stage = known
            return " "
        if _has_stage_word(inner) and stage is None:
            stage = _clean_stage(inner)
            return " "
        code = _set_type(inner, set_types)
        if code and set_type is None:
            set_type = code
            return " "
        if fx.norm(inner) in ("live", "live set", "liveset"):
            set_type = set_type or "live_set"
            return " "
        return m.group(0)

    # the callers collapse whitespace runs to one space (`_line`), so the regexes below never
    # backtrack over long runs (review v0.5.0 m1)
    out = re.sub(r"\s+", " ", _GROUP_RE.sub(group, out))
    m = re.search(r"(?:@|\bat\b|[-–—|/]) ?([^@\-–—|/]+)$", out)
    if m and stage is None:
        known = _known_stage(m.group(1), names)
        if not known and m.group(0).startswith("@"):
            # «Lil Texas @ PURPLE»: after an explicit «@» a short name is the stage
            known = _stage_label(m.group(1), names, loose=True)
        if known:
            stage = known
            out = out[: m.start()]
    if _LIVE_TAIL.search(out):
        out = _LIVE_TAIL.sub("", out)
        set_type = set_type or "live_set"
    if set_type is None:
        code, phrase = _set_type_phrase(out, set_types)
        if code:
            set_type = code
            # «Headhunterz Endshow» -> artist «Headhunterz»; «Closing Ceremony» stays the name
            loose = r"[\W_]*".join(re.escape(w) for w in fx.norm(phrase).split())
            rest = re.sub(rf"(?i)[\s\-–—:]*\b{loose}\b[\s\-–—:]*", " ", out)
            # «Endshow Closing Ceremony»: only set-type words, the whole text is the name
            if re.search(r"[^\W\d_]{2,}", rest) and not _set_type_phrase(rest, set_types)[0]:
                out = rest
    return _clean_artist(out), stage, set_type


def _set_type_phrase(text: str, set_types: Sequence[fx.SetTypeDef]) -> tuple[str | None, str]:
    """(code, keyword as written in the set types) of the first keyword in `text`."""
    n = fx.norm(text)
    for st in set_types:
        for kw in st.keywords:
            k = fx.norm(kw)
            if k and f" {k} " in f" {n} ":
                return st.code, kw
    return None, ""


_TITLE_RE = re.compile(
    r"\b(?:time\s?table|line[\s-]?up|schedule|zeitplan|programm?e?|speelschema|blokkenschema)\b",
    re.I,
)
_BULLET = re.compile(r"^\s*(?:[-*•·>]+\s*|\d{1,3}[.)]\s+|#+\s*)")


def _clean_artist(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = text.strip(" \t-–—|:,;/@•*").strip()
    return text[:MAX_ARTIST]


# --------------------------------------------------------------------------- CSV

_HEADER_ALIASES = {
    "artist": (
        "artist, artists, dj, djs, act, acts, name, performer, kunstler, kuenstler, artiest, "
        "artiesten, lineup, line up, artist name"
    ),
    "stage": "stage, stages, buhne, buehne, area, podium, floor",
    "day": "day, tag, dag, date, datum, jour, dia",
    "start": "start, from, begin, beginn, von, starttime, start time, time start, aanvang",
    "end": "end, to, until, bis, ende, endtime, end time, time end, einde, tot",
    "time": "time, zeit, tijd, slot, timeslot, time slot, uhrzeit",
    "set_type": "type, set type, settype, set_type, kind, art, set",
}
_HEADERS = {
    fx.norm(alias): key
    for key, aliases in _HEADER_ALIASES.items()
    for alias in aliases.split(",")
    if fx.norm(alias)
}


def _header_key(cell: str) -> str | None:
    n = fx.norm(cell)
    return _HEADERS.get(n) or _HEADERS.get(n.replace(" ", ""))


def _csv_layout(line: str) -> tuple[str, list[str | None]] | None:
    """(delimiter, column keys) if `line` is a header row, else None."""
    for delim in ("\t", ";", ",", "|"):
        if delim not in line:
            continue
        cells = next(csv.reader([line], delimiter=delim))
        keys = [_header_key(c) for c in cells]
        known = [k for k in keys if k]
        if "artist" in known and len(known) >= 2 and len(known) >= len(cells) // 2:
            return delim, keys
    return None


def _time_cell(cell: str) -> str | None:
    """'time' for «18:00-19:00», 'single' for «18:00», else None."""
    c = cell.strip()
    m = _RANGE_RE.fullmatch(c)
    if m and norm_time(m.group("s") or m.group("s4")):
        return "time"
    return "single" if norm_time(c) and re.search(r"\d[:.hH]\d|[ap]\.?m", c, re.I) else None


def _headerless_layout(
    lines: list[str], names: dict[str, str], set_types: Sequence[fx.SetTypeDef]
) -> tuple[str, list[str | None]] | None:
    """(delimiter, column keys) of a CSV without header row («Dillytek,BLUE,Sat,16:00,17:00»):
    most lines split into the same number (>= 3) of cells and one column holds only times.
    The columns are told apart by their content: times, weekdays, set types, stages (known,
    capitals, stage words, few distinct values) and the artist (the rest)."""
    for delim in (";", ","):
        table = [
            next(csv.reader([ln], delimiter=delim, skipinitialspace=True))
            for ln in lines
            if delim in ln
        ]
        table = [[c.strip() for c in row] for row in table]
        counts: dict[int, int] = {}
        for row in table:
            if len(row) >= 3:
                counts[len(row)] = counts.get(len(row), 0) + 1
        if not counts:
            continue
        width = max(counts, key=lambda k: counts[k])
        rows = [row for row in table if len(row) == width]
        if len(rows) < max(1, (len(lines) * 3 + 4) // 5):
            continue
        keys: list[str | None] = [None] * width
        texts: list[int] = []
        for j in range(width):
            col = [row[j] for row in rows if row[j]]
            if not col:
                continue
            kinds = {_time_cell(c) for c in col}
            if kinds == {"time"}:
                keys[j] = "time"
            elif kinds == {"single"}:
                keys[j] = "end" if "start" in keys else "start"
            elif all(_day_heading(c) for c in col):
                keys[j] = "day"
            elif all(c in fx.SET_TYPES or _set_type(c, set_types) for c in col):
                keys[j] = "set_type"
            elif any(_has_letter(c) for c in col):
                texts.append(j)
        if not any(k in ("time", "start") for k in keys) or not texts:
            continue

        def stageness(j: int, rows: list[list[str]] = rows) -> tuple[float, float, int]:
            col = [row[j] for row in rows if row[j]]
            hits = sum(
                1
                for c in col
                if _known_stage(c, names)
                or _caps_label(c)
                or any(w in _STAGE_WORDS for w in fx.norm(c).split())
            )
            return hits / len(col), -len({fx.norm(c) for c in col}) / len(col), -j

        ordered = sorted(texts, key=stageness)
        keys[ordered[0]] = "artist"
        if len(ordered) > 1:
            keys[ordered[-1]] = "stage"
        return delim, keys
    return None


# --------------------------------------------------------------------------- parse


def _row(
    artist: str,
    *,
    stage: str | None,
    day: str | None,
    start: str | None,
    end: str | None,
    set_type: str | None,
) -> dict[str, Any]:
    return {
        "artist": artist[:MAX_ARTIST],
        "stage": (stage or None) and stage[:MAX_STAGE],
        "day": (day or None) and day[:MAX_DAY],
        "start": start,
        "end": end,
        "set_type": set_type if set_type in fx.SET_TYPES else None,
    }


def _parse_csv(
    lines: list[str],
    delim: str,
    keys: list[str | None],
    names: dict[str, str],
    set_types: Sequence[fx.SetTypeDef],
) -> tuple[list[dict[str, Any]], list[str]]:
    rows: list[dict[str, Any]] = []
    skipped: list[str] = []
    for cells in csv.reader(
        [_undecorate(ln)[0] for ln in lines], delimiter=delim, skipinitialspace=True
    ):
        if not any(re.search(r"[^\W_]", c) for c in cells):
            if not _filler_only(delim.join(cells)):
                skipped.append(delim.join(cells))
            continue  # empty line or a markdown separator row (|---|---|)
        values: dict[str, str] = {}
        for k, c in zip(keys, cells, strict=False):
            if k and c.strip() and k not in values:
                values[k] = c.strip()
        raw_artist = values.get("artist", "")
        artist, stage2, st2 = _split_artist(raw_artist, names, set_types)
        if not artist:
            skipped.append(delim.join(cells))
            continue
        start = norm_time(values.get("start"))
        end = norm_time(values.get("end"))
        if values.get("time") and not start:
            s, e, _ = _find_times(values["time"])
            start, end = s, end or e
        stage_raw = values.get("stage")
        stage = (_known_stage(stage_raw, names) or _clean_stage(stage_raw)) if stage_raw else None
        set_type = None
        if values.get("set_type"):
            v = values["set_type"].strip()
            set_type = v if v in fx.SET_TYPES else _set_type(v, set_types)
        rows.append(
            _row(
                artist,
                stage=stage or stage2,
                day=values.get("day"),
                start=start,
                end=end,
                set_type=set_type or st2,
            )
        )
    return rows, skipped


def _cells(text: str) -> list[str] | None:
    if "|" in text:
        cells = [c.strip() for c in text.strip().strip("|").split("|")]
    elif "\t" in text:
        cells = [c.strip() for c in text.split("\t")]
    else:
        return None
    cells = [c for c in cells if c]
    return cells if len(cells) >= 2 else None


def _parse_cells(
    cells: list[str],
    names: dict[str, str],
    set_types: Sequence[fx.SetTypeDef],
) -> tuple[str, str | None, str | None, str | None, str | None, str | None]:
    """(artist, stage, day, start, end, set type) of «Headhunterz | 18:00–19:00 | RED»."""
    artist = ""
    stage = day = start = end = set_type = None
    texts: list[str] = []  # cells that are neither time, known stage, day nor set type
    for cell in cells:
        if start is None or end is None:
            s, e, rest = _find_times(cell)
            if s and not rest.strip(" -–—"):
                if start is None:
                    start, end = s, e
                else:  # «10:00 <tab> 11:00»: start and end in their own columns
                    end = s
                continue
        if stage is None:
            known = _known_stage(cell, names)
            if known:
                stage = known
                continue
        if day is None and _day_heading(cell):
            day = _day_heading(cell)
            continue
        code = cell if cell in fx.SET_TYPES else None
        if code is None and fx.norm(cell) and _set_type(cell, set_types) and artist:
            code = _set_type(cell, set_types)
        if code and set_type is None:
            set_type = code
            continue
        if not artist:
            artist = cell
            texts.append(cell)
        elif stage is None and _has_stage_word(cell):
            stage = _clean_stage(cell)
        else:
            texts.append(cell)
    if stage is None and len(texts) >= 2:
        # «Freitag | UV | 18:00-19:00 | Max Enforcer» with an unknown stage: the short
        # all-caps cell is the stage, the other one the artist
        caps = [c for c in texts if _caps_label(c)]
        if caps and len(caps) < len(texts):
            stage = _clean_stage(caps[0])
            artist = next(c for c in texts if c != caps[0])
    a, st2, type2 = _split_artist(artist, names, set_types)
    return a, stage or st2, day, start, end, set_type or type2


def _caps_label(text: str) -> bool:
    """A short label written in capitals («RED», «UV», «THE GATHERING»): a stage name."""
    letters = [c for c in text if c.isalpha()]
    words = text.split()
    return bool(letters) and all(c.isupper() for c in letters) and 0 < len(words) <= 3


_SPACES = re.compile(r"[^\S\t\n]+")
_DECOR_CHARS = frozenset("\ufe0f\ufe0e\u200d\u20e3")
_FRAME = frozenset("=*#~-–—_+")
_FILLER = frozenset(" \t=-–—_*~#+.:;,|/\\<>•·[](){}")


def _is_symbol(c: str) -> bool:
    """Emoji and pictographs (🔥 ★ ► ♫ ⏰ ─), their joiners/selectors and skin tones."""
    if c in _DECOR_CHARS or "\U0001f3fb" <= c <= "\U0001f3ff":
        return True
    return unicodedata.category(c) in ("So", "Cs", "Co")


def _undecorate(text: str) -> tuple[str, bool, bool]:
    """(text without emoji/symbols and **bold** marks, framed, leading-only). `framed`: the
    line had decoration on both sides («🔥 RED 🔥», «=== RED ===», «**RED**»): a heading;
    `leading-only` («► Sefa»): a list bullet."""
    chars = [" " if _is_symbol(c) else c for c in text]
    first = next((i for i, c in enumerate(chars) if c.isalnum()), None)
    if first is None:
        lead = trail = ""
    else:
        last = max(i for i, c in enumerate(chars) if c.isalnum())
        lead, trail = text[:first], text[last + 1 :]

    def decor(part: str) -> bool:
        return any(_is_symbol(c) or c in _FRAME for c in part)

    clean = "".join(chars).replace("**", " ").replace("__", " ")
    clean = _SPACES.sub(" ", clean).strip(" ")
    framed = decor(lead) and decor(trail.rstrip(":"))
    bullet = not framed and any(_is_symbol(c) for c in lead)
    return clean, framed, bullet


def _filler_only(text: str) -> bool:
    """A separator line («=====», «-----», «|---|---|», «🔥🔥🔥» after cleaning): not reported."""
    return all(c in _FILLER for c in text)


_MULTI_SPLIT = re.compile(r" ?[|,;/] ?")


def _split_sets(line: str) -> list[str]:
    """«18:00 Headhunterz, 19:00 Wildstylez» / «18:00 A | 19:00 B» -> one line per set: only
    when every piece has its own time and a name (a «Name | 18:00 | RED» row stays whole)."""
    pieces = [p.strip() for p in _MULTI_SPLIT.split(line)]
    if len(pieces) < 2:
        return [line]
    for piece in pieces:
        start, _end, rest = _find_times(piece)
        if start is None or not re.search(r"[^\W\d_]", rest):
            return [line]
    return pieces


def _line(raw: str) -> str:
    """One input line, made safe for the regexes: runs of spaces (not tabs: they are column
    separators) collapsed to one, cut to MAX_LINE characters (review v0.5.0 m1)."""
    return _SPACES.sub(" ", raw)[:MAX_LINE]


def _heading_before_times(raw: str, body: str, following: list[str], bullet: bool) -> bool:
    """A short time-less line (no list bullet) directly above a line with a time is a stage
    heading of an unknown stage («RED», «Black», «THE GATHERING»), not a set without time."""
    if not following or bullet or _BULLET.match(raw) or len(body) > MAX_STAGE:
        return False
    if not _has_letter(body):
        return False
    if not 0 < len(body.split()) <= 3:
        return False
    nxt = following[0].strip()
    if _day_heading(nxt) or _cells(nxt) is not None and not _RANGE_RE.search(nxt):
        return False
    return _find_times(_BULLET.sub("", nxt) if not _RANGE_RE.match(nxt) else nxt)[0] is not None


def _parse_lines(
    lines: list[str], names: dict[str, str], set_types: Sequence[fx.SetTypeDef]
) -> tuple[list[dict[str, Any]], list[str]]:
    """Free-form timetable lines -> (rows, skipped). Every line that is neither a row, a
    heading, a title/comment nor a blank or separator line is reported in `skipped`."""
    rows: list[dict[str, Any]] = []
    skipped: list[str] = []
    day: str | None = None
    stage: str | None = None
    # (original line, cleaned piece, framed, bullet) - one entry per set
    expanded: list[tuple[str, str, bool, bool]] = []
    for ln in lines:
        clean, framed, bullet = _undecorate(ln)
        for piece in _split_sets(clean):
            expanded.append((ln.strip(), piece, framed, bullet))
    for i, (orig, raw, framed, bullet) in enumerate(expanded):
        line = raw.strip()
        if line.startswith("//"):
            continue
        if not re.search(r"[^\W_]", line):
            if not _filler_only(line):
                skipped.append(orig)  # «????? ##»: no letter, no digit -> reported, no stage
            continue
        body = _BULLET.sub("", line) if not _RANGE_RE.match(line) else line
        body = body.strip().strip("=*").strip()
        if not body:
            continue
        lead_day, timed = _day_lead(body)
        if lead_day and _find_times(timed)[0] is not None:
            body = timed  # «Sat 18.00-19.00 Lil Texas @ PURPLE»
        else:
            lead_day = None
        start, end, rest = _find_times(body)
        if start is None:
            if _TITLE_RE.search(body):
                continue  # «Defqon.1 2024 – Timetable»: a title line, no row and no heading
            label = _day_heading(body)
            if label:
                day, stage = label, None
                continue
            both = _combined_heading(body, names)
            if both:
                day, stage = both
                continue
        cells = _cells(body)
        if cells is not None:
            a, st, d, s, e, t = _parse_cells(cells, names, set_types)
            if a:
                rows.append(
                    _row(a, stage=st or stage, day=d or lead_day or day, start=s, end=e, set_type=t)
                )
            else:
                skipped.append(orig)
            continue
        if start is None:
            heading = _stage_heading(raw, body, names, wrapped=framed)
            if heading:
                stage = heading
                continue
            following = [p for _o, p, _f, _b in expanded[i + 1 : i + 2]]
            if _heading_before_times(raw, body, following, bullet):
                stage = _clean_stage(body)  # «RED» / «Black» above timed sets
                continue
        artist, st, t = _split_artist(rest, names, set_types)
        if not artist or not re.search(r"[^\W_]", artist):
            skipped.append(orig)
            continue
        rows.append(
            _row(artist, stage=st or stage, day=lead_day or day, start=start, end=end, set_type=t)
        )
    return rows, skipped


def parse(
    text: str,
    stages: Sequence[fx.StageDef] = (),
    set_types: Sequence[fx.SetTypeDef] = (),
) -> dict[str, Any]:
    """Pasted timetable -> {rows:[{artist, stage, day, start, end, set_type}], skipped:[line],
    days:[label], stages:[name], csv: bool}. Duplicate rows (same artist, stage, day, start)
    are dropped. Never raises on odd input."""
    names = _stage_names(stages)
    text = str(text or "")[:MAX_TEXT]
    raw_lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = [_line(ln) for ln in raw_lines if ln.strip()][:MAX_LINES]
    rows: list[dict[str, Any]] = []
    skipped: list[str] = []
    used_csv = False
    if lines:
        layout = _csv_layout(_undecorate(lines[0])[0])
        if layout is not None:
            used_csv = True
            rows, skipped = _parse_csv(lines[1:], layout[0], layout[1], names, set_types)
        else:
            layout = _headerless_layout(lines, names, set_types)
            if layout is not None:
                used_csv = True
                table: list[str] = []
                for ln in lines:
                    cells = next(csv.reader([ln], delimiter=layout[0], skipinitialspace=True))
                    if len(cells) == len(layout[1]):
                        table.append(ln)
                    elif not _filler_only(_undecorate(ln)[0]):
                        skipped.append(ln.strip())  # a heading or note between the rows
                rows, more = _parse_csv(table, layout[0], layout[1], names, set_types)
                skipped += more
    if not used_csv:
        rows, skipped = _parse_lines(lines, names, set_types)
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for r in rows:
        key = (fx.norm(r["artist"]), fx.norm(r["stage"]), fx.norm(r["day"]), r["start"] or "")
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return {
        "rows": out,
        "skipped": skipped,
        "days": _unique(r["day"] for r in out),
        "stages": _unique(r["stage"] for r in out),
        "csv": used_csv,
    }


def _unique(values: Iterable[str | None]) -> list[str]:
    out: list[str] = []
    for v in values:
        if v and v not in out:
            out.append(v)
    return out


# --------------------------------------------------------------------------- shipped files


class TimetableFileError(ValueError):
    pass


def _file_id(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def load_file(path: Path, root: Path | None = None) -> dict[str, Any]:
    """Read and validate one timetable file. Raises TimetableFileError (English, technical:
    the caller shows a translated message)."""
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8-sig"))  # BOM from Windows editors
    except (OSError, ValueError) as exc:
        raise TimetableFileError(f"unreadable: {exc}") from exc
    if not isinstance(data, dict) or data.get("format") != FILE_FORMAT:
        raise TimetableFileError("format must be 1")
    key = str(data.get("series") or "").strip()
    folder = Path(path).parent.name
    if not key or key != folder:
        raise TimetableFileError("series must equal the folder name")
    try:
        year = int(data.get("year"))
    except (TypeError, ValueError):
        raise TimetableFileError("year missing") from None
    if not (fx.MIN_YEAR <= year <= 2100):
        raise TimetableFileError("year out of range")
    sets = data.get("sets")
    if not isinstance(sets, list) or not sets:
        raise TimetableFileError("sets missing")
    rows: list[dict[str, Any]] = []
    for i, s in enumerate(sets):
        if not isinstance(s, dict) or not str(s.get("artist") or "").strip():
            raise TimetableFileError(f"sets[{i}]: artist missing")
        for k in ("start", "end"):
            if s.get(k) not in (None, "") and norm_time(str(s[k])) is None:
                raise TimetableFileError(f"sets[{i}]: invalid {k}")
        st = s.get("set_type") or None
        if st is not None and st not in fx.SET_TYPES:
            raise TimetableFileError(f"sets[{i}]: unknown set_type")
        rows.append(
            _row(
                str(s["artist"]).strip(),
                stage=str(s.get("stage") or "").strip() or None,
                day=str(s.get("day") or "").strip() or None,
                start=norm_time(str(s.get("start") or "")),
                end=norm_time(str(s.get("end") or "")),
                set_type=st,
            )
        )
    root = root or Path(path).parents[1]
    return {
        "file": _file_id(Path(path), root),
        "series_key": key,
        "year": year,
        "variant": str(data.get("variant") or "").strip(),
        "source": str(data.get("source") or "").strip(),
        "updated": str(data.get("updated") or "").strip() or None,
        "rows": rows,
    }


def list_files(root: Path | None = None) -> list[dict[str, Any]]:
    """Every valid file below `root` (default: app/data/timetables): [{file, series_key, year,
    variant, source, updated, sets}] (without the rows). Broken files are skipped with
    `error` set, so a contributor sees why."""
    base = Path(root or DATA_DIR)
    out: list[dict[str, Any]] = []
    if not base.is_dir():
        return out
    for path in sorted(base.glob("*/*.json")):
        try:
            data = load_file(path, base)
        except TimetableFileError as exc:
            out.append({"file": _file_id(path, base), "error": str(exc)})
            continue
        rows = data.pop("rows")
        out.append({**data, "sets": len(rows)})
    return out


def resolve_file(file: str, root: Path | None = None) -> Path | None:
    """Path of a file id (`<series-key>/<name>.json`) inside `root`; None if outside/missing."""
    base = Path(root or DATA_DIR).resolve()
    text = str(file or "").replace("\\", "/").strip("/")
    if not re.fullmatch(r"[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.json", text) or ".." in text:
        return None
    path = (base / text).resolve()
    try:
        path.relative_to(base)
    except ValueError:
        return None
    return path if path.is_file() else None
