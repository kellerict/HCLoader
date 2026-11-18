"""Timetables for the v0.5.0 «Festival collector» - pure functions, no network.

- `parse(text, stages, set_types)`: pasted timetable text or CSV -> rows
  `{artist, stage, day, start, end, set_type}`. Robust against the usual shapes:
  `18:00 - 19:00 Headhunterz`, `Headhunterz 18:00–19:00`, `Headhunterz | 18:00–19:00 | RED`,
  `18.00 Headhunterz (RED)`, CSV/TSV/semicolon tables with a header row, day headings
  (`Saturday`, `Samstag 28.06.`, `Day 2`, `## Zaterdag`) and stage headings (`RED`, `Stage: BLUE`,
  `[UV]`, `Mainstage:`, `=== The Gathering Stage ===`). A line without a time that is no heading
  is a row with the artist only (plain line-up lists). Nothing is guessed from websites: the
  user pastes, the parser only splits (docs/concepts/festivals.md, no scraping).
- Shipped timetable files `app/data/timetables/<series-key>/<year>[-<variant>].json`
  (`list_files`, `load_file`); format in docs/bridge-api.md «Festival collector».

Times are normalised to `HH:MM` (24 h), `set_type` is a code of festivals.SET_TYPES or None.
"""

from __future__ import annotations

import csv
import json
import re
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

from . import festivals as fx

MAX_ARTIST = 120
MAX_STAGE = 40
MAX_DAY = 40
MAX_LINES = 2000  # a pasted timetable larger than this is cut (never a real festival)
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
_DATEISH = re.compile(r"^[\d\s./,\-–]*$")


def _day_heading(text: str) -> str | None:
    """The day label when `text` is a day heading («Saturday», «Samstag, 28.06.», «Day 2»)."""
    clean = text.strip().strip(":").strip()
    if not clean or len(clean) > MAX_DAY:
        return None
    if _DAY_N_RE.match(clean):
        return clean
    words = re.split(r"[\s,.:/]+", clean.casefold())
    words = [w for w in words if w]
    if not words or words[0] not in _DAY_WORDS:
        return None
    if len(words) == 1:
        # very short forms ("do", "so", "za") only as a whole heading line (always the case here)
        return clean
    rest = clean[len(clean.split()[0]) :] if " " in clean else ""
    rest_words = [w for w in words[1:] if w not in _MONTHS and not w.isdigit()]
    if rest_words and not _DATEISH.match(rest):
        return None
    if words[0] not in _LONG_DAY_WORDS and len(words) > 1 and not any(c.isdigit() for c in rest):
        return None
    return clean


def _day_prefix(text: str) -> tuple[str | None, str]:
    """«Saturday – RED» -> ('Saturday', 'RED'); no long weekday name first -> (None, text)."""
    m = re.match(r"^\s*([^\W\d_]+)\b[\s,:\-–—|/]+(.+)$", text)
    if m and m.group(1).casefold() in _LONG_DAY_WORDS:
        return m.group(1), m.group(2).strip()
    return None, text


# --------------------------------------------------------------------------- stages

_STAGE_WORDS = ("stage", "bühne", "buhne", "area", "arena", "tent", "hall", "floor", "podium")
_STAGE_PREFIX = re.compile(r"^(?:stage|bühne|buhne|area|podium)\s*[:\-–]\s*(.+)$", re.I)


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


def _stage_heading(raw: str, text: str, names: dict[str, str]) -> str | None:
    """Stage label when the (time-less) line is a stage heading, else None."""
    m = _STAGE_PREFIX.match(text)
    if m:
        return _known_stage(m.group(1), names) or _clean_stage(m.group(1))
    known = _known_stage(text, names)
    if known:
        return known
    marked = (
        raw.lstrip().startswith(("#", "[", "==", "--", "**"))
        or raw.rstrip().endswith(":")
        or re.match(r"^\s*\[.+\]\s*$", raw) is not None
    )
    words = fx.norm(text).split()
    has_word = any(w in _STAGE_WORDS for w in words)
    if has_word and len(words) <= 6:
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


_GROUP_RE = re.compile(r"\s*[(\[]([^()\[\]]*)[)\]]\s*")
_LIVE_TAIL = re.compile(r"\s+(?:\(live\)|-\s*live|LIVE)$")


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
        if any(w in _STAGE_WORDS for w in fx.norm(inner).split()) and stage is None:
            stage = _clean_stage(inner)
            return " "
        code = _set_type(inner, set_types)
        if code and set_type is None:
            set_type = code
            return " "
        if fx.norm(inner) == "live":
            set_type = set_type or "live_set"
            return " "
        return m.group(0)

    out = _GROUP_RE.sub(group, out)
    m = re.search(r"\s*(?:@|\bat\b|[-–—|/])\s*([^@\-–—|/]+)$", out)
    if m and stage is None:
        known = _known_stage(m.group(1), names)
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
            if re.search(r"[^\W\d_]{2,}", rest):
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
    for cells in csv.reader(lines, delimiter=delim):
        if not any(re.search(r"[^\W_]", c) for c in cells):
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
    for cell in cells:
        if start is None:
            s, e, rest = _find_times(cell)
            if s and not rest.strip(" -–—"):
                start, end = s, e
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
        elif stage is None and any(w in _STAGE_WORDS for w in fx.norm(cell).split()):
            stage = _clean_stage(cell)
    a, st2, type2 = _split_artist(artist, names, set_types)
    return a, stage or st2, day, start, end, set_type or type2


def parse(
    text: str,
    stages: Sequence[fx.StageDef] = (),
    set_types: Sequence[fx.SetTypeDef] = (),
) -> dict[str, Any]:
    """Pasted timetable -> {rows:[{artist, stage, day, start, end, set_type}], skipped:[line],
    days:[label], stages:[name], csv: bool}. Duplicate rows (same artist, stage, day, start)
    are dropped. Never raises on odd input."""
    names = _stage_names(stages)
    raw_lines = str(text or "").replace("\r\n", "\n").replace("\r", "\n").split("\n")
    lines = [ln for ln in raw_lines if ln.strip()][:MAX_LINES]
    rows: list[dict[str, Any]] = []
    skipped: list[str] = []
    used_csv = False
    if lines:
        layout = _csv_layout(lines[0])
        if layout is not None:
            used_csv = True
            rows, skipped = _parse_csv(lines[1:], layout[0], layout[1], names, set_types)
    if not used_csv:
        day: str | None = None
        stage: str | None = None
        for raw in lines:
            line = raw.strip()
            if line.startswith("//"):
                continue
            body = _BULLET.sub("", line) if not _RANGE_RE.match(line) else line
            body = body.strip().strip("=*").strip()
            if not body:
                continue
            cells = _cells(body)
            if cells is not None:
                a, st, d, s, e, t = _parse_cells(cells, names, set_types)
                if a:
                    rows.append(
                        _row(a, stage=st or stage, day=d or day, start=s, end=e, set_type=t)
                    )
                else:
                    skipped.append(line)
                continue
            start, end, rest = _find_times(body)
            if start is None and _TITLE_RE.search(body):
                continue  # «Defqon.1 2024 – Timetable»: a title line, no row and no heading
            if start is None:
                label = _day_heading(body)
                if label:
                    day, stage = label, None
                    continue
                dprefix, after = _day_prefix(body)
                if dprefix and _stage_heading(after, after, names):
                    day, stage = dprefix, _stage_heading(after, after, names)
                    continue
                heading = _stage_heading(raw, body, names)
                if heading:
                    stage = heading
                    continue
            artist, st, t = _split_artist(rest, names, set_types)
            if not artist or not re.search(r"[^\W_]", artist):
                skipped.append(line)
                continue
            rows.append(_row(artist, stage=st or stage, day=day, start=start, end=end, set_type=t))
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
        data = json.loads(Path(path).read_text(encoding="utf-8"))
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
