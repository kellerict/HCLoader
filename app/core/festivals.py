"""Festival / series detection (v0.3.0, docs/concepts/festivals.md) - pure functions, no I/O.

Input: title (and optionally description, channel, upload date) of a mix that is already stored
from a flat listing. Output: which series (festival, radio show, podcast), year, edition variant,
stage, set type and episode it probably belongs to, with a confidence score 0..1. No network,
no database: the catalog (series, stages, set types) is passed in (`app/core/series.py` builds
it from the database and the settings).

Scoring (documented in docs/decisions.md «Festivals & series»):
  series alias in the title          +0.50 (weak alias +0.30; weak alias + year right after +0.50)
  series alias only in description   +0.25
  organiser channel matches          +0.15
  year as own word in the title      +0.30   (upload year instead: +0.10)
  episode number (radio / podcast)   +0.30
  stage                              +0.10
  set type (not anthem / episode)    +0.10
  negative word (remake, aftermovie) -0.40
Result clamped to 0..1. Below the threshold (`festivals.min_confidence`) the detection is only a
suggestion.
"""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

KINDS = ("festival", "radio", "podcast")
SET_TYPES = (
    "live_set",
    "closing_ceremony",
    "opening",
    "endshow",
    "full_show",
    "warm_up",
    "anthem",
    "episode",
)
MIN_YEAR = 1990

W_ALIAS = 0.5
W_WEAK_ALIAS = 0.3
W_DESCRIPTION = 0.25
W_CHANNEL = 0.15
W_YEAR_TITLE = 0.3
W_YEAR_UPLOAD = 0.1
W_EPISODE = 0.3
W_STAGE = 0.1
W_SET_TYPE = 0.1
W_NEGATIVE = -0.4
DESCRIPTION_SCAN = 1500  # only the start of a description is searched (cheap, fewer accidents)


# --------------------------------------------------------------------------- catalog


@dataclass(frozen=True)
class Variant:
    name: str
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class SeriesDef:
    key: str
    name: str
    kind: str = "festival"
    aliases: tuple[str, ...] = ()
    weak_aliases: tuple[str, ...] = ()
    channels: tuple[str, ...] = ()
    variants: tuple[Variant, ...] = ()
    default_genre: str | None = None
    id: int | None = None
    enabled: bool = True


@dataclass(frozen=True)
class StageDef:
    name: str
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class SetTypeDef:
    code: str
    label: str
    keywords: tuple[str, ...] = ()


@dataclass
class Catalog:
    series: list[SeriesDef] = field(default_factory=list)
    stages: list[StageDef] = field(default_factory=list)
    set_types: list[SetTypeDef] = field(default_factory=list)
    negative: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self._compiled: list[tuple[SeriesDef, list[tuple[str, bool]]]] | None = None

    def compiled(self) -> list[tuple[SeriesDef, list[tuple[str, bool]]]]:
        """[(series, [(normalised alias, strong)])] of the enabled series (cached)."""
        if self._compiled is None:
            out = []
            for s in self.series:
                if not s.enabled:
                    continue
                forms: list[tuple[str, bool]] = []
                weak = {norm(a) for a in s.weak_aliases}
                seen: set[str] = set()
                # the name is a strong alias unless it is also listed as weak («Hard Bass»)
                for alias, strong in (
                    *((a, True) for a in (s.name, *s.aliases)),
                    *((a, False) for a in s.weak_aliases),
                ):
                    if strong and alias == s.name and norm(alias) in weak:
                        continue
                    n = norm(alias)
                    if n and n not in seen:
                        seen.add(n)
                        forms.append((n, strong))
                out.append((s, forms))
            self._compiled = out
        return self._compiled

    def set_type_label(self, code: str | None) -> str:
        for st in self.set_types:
            if st.code == code:
                return st.label
        return (code or "").replace("_", " ").title()


@dataclass
class Detection:
    series_key: str
    series_name: str
    kind: str
    series_id: int | None = None
    year: int | None = None
    year_source: str | None = None  # "title" | "upload" | None
    variant: str = ""
    stage: str | None = None
    set_type: str | None = None
    episode: int | None = None
    confidence: float = 0.0
    alias: str = ""
    default_genre: str | None = None
    reasons: list[str] = field(default_factory=list)

    @property
    def edition_name(self) -> str:
        return edition_name(self.series_name, self.year, self.variant)

    def to_dict(self) -> dict[str, Any]:
        return {
            "series_key": self.series_key,
            "series_id": self.series_id,
            "series": self.series_name,
            "kind": self.kind,
            "year": self.year,
            "year_source": self.year_source,
            "variant": self.variant,
            "edition": self.edition_name,
            "stage": self.stage,
            "set_type": self.set_type,
            "episode": self.episode,
            "confidence": self.confidence,
            "alias": self.alias,
            "reasons": list(self.reasons),
        }


def edition_name(series_name: str, year: int | None, variant: str | None = "") -> str:
    """«Defqon.1 Australia 2019»; without year «Defqon.1 Australia»."""
    parts = [series_name.strip()]
    if variant:
        parts.append(variant.strip())
    if year:
        parts.append(str(year))
    return " ".join(p for p in parts if p)


def festival_label(series_name: str, variant: str | None = "") -> str:
    """Value of TXXX:FESTIVAL and `{festival}`: series name plus variant («Defqon.1 Chile»)."""
    return edition_name(series_name, None, variant)


# --------------------------------------------------------------------------- text helpers

_NON_ALNUM = re.compile(r"[^0-9a-z]+")
_APOS_YEAR = re.compile(r"(?<![0-9A-Za-z])['’`](\d{2})(?!\d)")
_K_YEAR = re.compile(r"(?<![0-9A-Za-z])2k(\d{2})(?![0-9A-Za-z])", re.I)
_YEAR_TOKEN = re.compile(r"^(19\d\d|20\d\d)$")
_EPISODE_RE = (
    re.compile(r"#\s?(\d{1,4})(?!\d)"),
    re.compile(
        r"(?<![0-9A-Za-z])(?:episode|ep|aflevering|afl|folge|show)\.?\s*#?\s*(\d{1,4})(?!\d)",
        re.I,
    ),
)
_SEGMENT_SPLIT = re.compile(r"\s+[-–—~]\s+|[|()\[\]{}/@:•·,]+")


def norm(text: str | None) -> str:
    """Lower case, accents removed, every non-alphanumeric run -> one space."""
    text = unicodedata.normalize("NFKD", str(text or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).casefold()
    text = text.replace("ß", "ss")
    return _NON_ALNUM.sub(" ", text).strip()


def _expand_years(title: str) -> str:
    """'19 -> 2019, 2k19 -> 2019 (before normalising, which drops the apostrophe)."""

    def full(m: re.Match[str]) -> str:
        yy = int(m.group(1))
        return f" {2000 + yy if yy < 90 else 1900 + yy}"

    return _K_YEAR.sub(full, _APOS_YEAR.sub(full, title))


def _find(tokens_text: str, phrase: str) -> int:
    """Token position of `phrase` (normalised) in `tokens_text` (normalised), -1 if absent.
    Also matches the phrase written without spaces ("defqon1", "qbase")."""
    padded = f" {tokens_text} "
    for form in {phrase, phrase.replace(" ", "")}:
        if not form:
            continue
        i = padded.find(f" {form} ")
        if i >= 0:
            return padded[:i].count(" ")
    return -1


def _contains(tokens_text: str, phrase: str) -> bool:
    return _find(tokens_text, norm(phrase)) >= 0


def _channel_match(channels: Iterable[str], channel: Mapping[str, Any]) -> bool:
    cid = str(channel.get("channel_id") or "").strip()
    cname = norm(channel.get("channel_name"))
    curl = str(channel.get("channel_url") or "").strip().lower().rstrip("/")
    for c in channels:
        c = str(c or "").strip()
        if not c:
            continue
        low = c.lower().rstrip("/")
        if cid and c == cid:
            return True
        if curl and low.startswith(("http://", "https://")) and curl == low:
            return True
        if cname and norm(c) == cname:
            return True
    return False


def _years(tokens: list[str]) -> list[tuple[int, int]]:
    """[(token index, year)] for plausible years in the title."""
    top = datetime.now().year + 1
    out = []
    for i, t in enumerate(tokens):
        if _YEAR_TOKEN.match(t) and MIN_YEAR <= int(t) <= top:
            out.append((i, int(t)))
    return out


def _pick_year(years: list[tuple[int, int]], alias_end: int) -> int | None:
    if not years:
        return None
    if alias_end < 0:
        return years[0][1]
    after = [(i - alias_end, y) for i, y in years if i >= alias_end]
    if after:
        return min(after)[1]
    return min((alias_end - i, y) for i, y in years)[1]


def _upload_year(upload_date: str | None) -> int | None:
    m = re.match(r"^(\d{4})", str(upload_date or ""))
    if not m:
        return None
    y = int(m.group(1))
    return y if MIN_YEAR <= y <= datetime.now().year + 1 else None


def find_episode(title: str) -> int | None:
    for rx in _EPISODE_RE:
        m = rx.search(title or "")
        if m:
            n = int(m.group(1))
            if n > 0:
                return n
    return None


def find_stage(title: str, stages: Sequence[StageDef]) -> str | None:
    """A stage is accepted as its own title segment («… | RED | …»), as «<name> stage» /
    «stage <name>», or as an all-caps word in a title that is not all caps."""
    if not title:
        return None
    segments = [norm(s) for s in _SEGMENT_SPLIT.split(title)]
    text = norm(title)
    letters = [c for c in title if c.isalpha()]
    mixed_case = bool(letters) and not all(c.isupper() for c in letters)
    caps_words = set(re.findall(r"(?<![0-9A-Za-z])([A-Z]{2,})(?![0-9A-Za-z])", title))
    for st in stages:
        for alias in (st.name, *st.aliases):
            a = norm(alias)
            if not a:
                continue
            if a in segments or f"{a} stage" in segments or f"stage {a}" in segments:
                return st.name
            if _find(text, f"{a} stage") >= 0 or _find(text, f"stage {a}") >= 0:
                return st.name
            if mixed_case and " " not in a and alias.upper() in caps_words:
                return st.name
    return None


def find_set_type(text_norm: str, set_types: Sequence[SetTypeDef]) -> str | None:
    for st in set_types:
        for kw in st.keywords:
            if _contains(text_norm, kw):
                return st.code
    return None


# --------------------------------------------------------------------------- detection


def _best_alias(text: str, catalog: Catalog) -> tuple[SeriesDef, str, bool, int, int] | None:
    """(series, alias, strong, start token, end token) of the best alias hit: strong before
    weak, longer before shorter, earlier before later."""
    best: tuple[tuple[int, int, int], tuple[SeriesDef, str, bool, int, int]] | None = None
    for s, forms in catalog.compiled():
        for alias, strong in forms:
            pos = _find(text, alias)
            if pos < 0:
                continue
            length = len(alias.split())
            # compact hit ("defqon1") spans one token
            span = length if f" {alias} " in f" {text} " else 1
            rank = (int(strong), len(alias), -pos)
            if best is None or rank > best[0]:
                best = (rank, (s, alias, strong, pos, pos + span))
    return best[1] if best else None


def detect(
    title: str | None,
    catalog: Catalog,
    *,
    description: str | None = None,
    channel_id: str | None = None,
    channel_name: str | None = None,
    channel_url: str | None = None,
    upload_date: str | None = None,
    year_from_upload: bool = True,
) -> Detection | None:
    """Best guess for one mix, or None when no series name appears at all."""
    title = str(title or "")
    expanded = _expand_years(title)
    text = norm(expanded)
    tokens = text.split()
    hit = _best_alias(text, catalog)
    reasons: list[str] = []
    in_description = False
    if hit is None and description:
        desc = norm(_expand_years(str(description)[:DESCRIPTION_SCAN]))
        dhit = _best_alias(desc, catalog)
        if dhit is not None and dhit[2]:  # weak aliases never count from a description
            hit = (dhit[0], dhit[1], True, -1, -1)
            in_description = True
    if hit is None:
        return None
    series, alias, strong, _start, end = hit

    years = _years(tokens)
    year = _pick_year(years, end)
    year_source = "title" if year else None
    adjacent_year = end >= 0 and end < len(tokens) and bool(years) and years_at(years, end)

    score = 0.0
    if in_description:
        score += W_DESCRIPTION
        reasons.append("alias:description")
    elif strong:
        score += W_ALIAS
        reasons.append("alias")
    elif adjacent_year:
        score += W_ALIAS
        reasons.append("alias:weak+year")
    else:
        score += W_WEAK_ALIAS
        reasons.append("alias:weak")

    chan = {"channel_id": channel_id, "channel_name": channel_name, "channel_url": channel_url}
    if series.channels and _channel_match(series.channels, chan):
        score += W_CHANNEL
        reasons.append("channel")

    if year:
        score += W_YEAR_TITLE
        reasons.append("year:title")
    elif year_from_upload:
        year = _upload_year(upload_date)
        if year:
            year_source = "upload"
            score += W_YEAR_UPLOAD
            reasons.append("year:upload")

    episode = None
    if series.kind in ("radio", "podcast"):
        episode = find_episode(title)
        if episode is None and 0 <= end < len(tokens) and re.fullmatch(r"\d{1,4}", tokens[end]):
            if not years_at(years, end):  # «Masters of Hardcore Podcast 199»
                episode = int(tokens[end]) or None
        if episode:
            score += W_EPISODE
            reasons.append("episode")

    variant = ""
    for v in series.variants:
        if any(_contains(text, a) for a in (v.name, *v.aliases)):
            variant = v.name
            break

    stage = find_stage(title, catalog.stages)
    if stage:
        score += W_STAGE
        reasons.append("stage")

    set_type = "episode" if episode else find_set_type(text, catalog.set_types)
    if set_type and set_type not in ("anthem", "episode"):
        score += W_SET_TYPE
        reasons.append("set_type")

    if any(_contains(text, w) for w in catalog.negative):
        score += W_NEGATIVE
        reasons.append("negative")

    return Detection(
        series_key=series.key,
        series_name=series.name,
        kind=series.kind,
        series_id=series.id,
        year=year,
        year_source=year_source,
        variant=variant,
        stage=stage,
        set_type=set_type,
        episode=episode,
        confidence=round(min(1.0, max(0.0, score)), 2),
        alias=alias,
        default_genre=series.default_genre,
        reasons=reasons,
    )


def years_at(years: list[tuple[int, int]], index: int) -> bool:
    """True if a year token sits exactly at token `index` (directly after the alias)."""
    return any(i == index for i, _ in years)


# --------------------------------------------------------------------------- catalog from data


def _strs(value: Any) -> tuple[str, ...]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, (list, tuple)):
        return ()
    out: list[str] = []
    for v in value:
        if isinstance(v, (str, int, float)) and str(v).strip():
            out.append(str(v).strip())
    return tuple(out)


def variants_from(data: Any) -> tuple[Variant, ...]:
    out = []
    for v in data or []:
        if isinstance(v, Mapping) and str(v.get("name") or "").strip():
            out.append(Variant(str(v["name"]).strip(), _strs(v.get("aliases"))))
        elif isinstance(v, str) and v.strip():
            out.append(Variant(v.strip()))
    return tuple(out)


def series_from(data: Mapping[str, Any], *, id: int | None = None) -> SeriesDef:
    kind = str(data.get("kind") or "festival")
    return SeriesDef(
        key=str(data.get("key") or ""),
        name=str(data.get("name") or "").strip(),
        kind=kind if kind in KINDS else "festival",
        aliases=_strs(data.get("aliases")),
        weak_aliases=_strs(data.get("weak_aliases")),
        channels=_strs(data.get("channels")),
        variants=variants_from(data.get("variants")),
        default_genre=(str(data.get("default_genre") or "").strip() or None),
        id=id,
        enabled=bool(data.get("enabled", True)),
    )


def stages_from(data: Any, extra: Iterable[str] = ()) -> list[StageDef]:
    out = []
    names: set[str] = set()
    for s in data or []:
        if isinstance(s, Mapping) and str(s.get("name") or "").strip():
            st = StageDef(str(s["name"]).strip(), _strs(s.get("aliases")))
        elif isinstance(s, str) and s.strip():
            st = StageDef(s.strip())
        else:
            continue
        out.append(st)
        names.add(norm(st.name))
    for e in extra:
        e = str(e or "").strip()
        if e and norm(e) not in names:
            out.append(StageDef(e))
            names.add(norm(e))
    return out


def set_types_from(data: Any, extra: Iterable[tuple[str, str]] = ()) -> list[SetTypeDef]:
    """Built-in set types; `extra` = user keywords [(keyword, code)], checked first."""
    base: list[SetTypeDef] = []
    labels: dict[str, str] = {}
    for s in data or []:
        if not isinstance(s, Mapping):
            continue
        code = str(s.get("code") or "")
        if code not in SET_TYPES:
            continue
        label = str(s.get("label") or code)
        labels[code] = label
        base.append(SetTypeDef(code, label, _strs(s.get("keywords"))))
    user = [
        SetTypeDef(code, labels.get(code, code), (kw,))
        for kw, code in extra
        if code in SET_TYPES and str(kw or "").strip()
    ]
    return [*user, *base]
