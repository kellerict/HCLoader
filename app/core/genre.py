"""Genre detection (SPEC §8): manual > source default > keyword by priority > Unsortiert."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from typing import Any

from .config import UNSORTED, GenreItem
from .filters import matches_any


def _item(x: Any) -> tuple[str, int, list[str]]:
    if isinstance(x, Mapping):
        return x["name"], int(x.get("priority", 99)), list(x.get("keywords", []))
    return x.name, int(x.priority), list(x.keywords)


def detect_genre(
    title: str | None,
    genres: Iterable[GenreItem | Mapping[str, Any]],
    *,
    manual: str | None = None,
    source_default: str | None = None,
    description: str | None = None,
) -> str:
    """Return the genre name. `genres` is the settings list (GenreItem or dicts)."""
    if manual:
        return manual
    if source_default:
        return source_default
    ordered = sorted((_item(g) for g in genres), key=lambda t: t[1])
    text = f"{title or ''} {description or ''}".strip()
    for name, _prio, keywords in ordered:
        if name != UNSORTED and keywords and matches_any(text, keywords):
            return name
    return UNSORTED


def genre_color(name: str, genres: Iterable[GenreItem | Mapping[str, Any]]) -> str:
    for g in genres:
        gname = g["name"] if isinstance(g, Mapping) else g.name
        if gname == name:
            return g["color"] if isinstance(g, Mapping) else g.color
    return "#6b6b78"


def genre_search_terms(name: str, genres: Iterable[GenreItem | Mapping[str, Any]]) -> list[str]:
    """Keywords of a genre, to append to a search query when its chip is selected."""
    for g in genres:
        if (g["name"] if isinstance(g, Mapping) else g.name) == name:
            return list(g["keywords"] if isinstance(g, Mapping) else g.keywords)
    return []
