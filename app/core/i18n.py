"""Backend message catalog: user-facing texts of `app/` (docs/TRANSLATING.md).

Catalogs: `app/locales/<code>.json` = {"_meta": {...}, <nested keys>}. English (`en`) is the
reference: every key exists there first. `tr("area.key", name=value)` returns the text in the
active language, falls back to English and finally to the key itself (logged once).

- Placeholders `{name}` are replaced by the keyword arguments (unknown ones stay as they are,
  so a literal `{id}` in a text needs no escaping).
- Plurals: the value is an object with CLDR categories (`one`, `other`, for Arabic also `zero`,
  `two`, `few`, `many`); the category comes from `count=` or else `n=` (see `plural_category`).
- The active language follows `general.language` (`set_language`); "auto" resolves the Windows
  display language (else the process locale), unsupported -> English.

Data never depends on the language (genre names, folder names, DB values, tags) -
docs/decisions.md "Mehrsprachigkeit". DEBUG log lines and programmer errors stay English
and are not translated. No GUI imports here (core/ stays GUI-free).
"""

from __future__ import annotations

import json
import locale
import logging
import os
import re
import sys
import threading
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SUPPORTED: tuple[str, ...] = ("en", "de", "zh-CN", "hi", "es", "fr", "bn", "pt", "ru", "id", "nl")
REFERENCE = "en"
AUTO = "auto"
LANGUAGE_CHOICES: tuple[str, ...] = (AUTO, *SUPPORTED)
PLURAL_CATEGORIES = ("zero", "one", "two", "few", "many", "other")
LOCALES_DIR = Path(__file__).resolve().parents[1] / "locales"

_PLACEHOLDER = re.compile(r"\{(\w+)\}")
_lock = threading.Lock()
_catalogs: dict[str, dict[str, Any]] = {}
_warned: set[str] = set()
_active = REFERENCE


# --------------------------------------------------------------------------- catalogs


def _flatten(obj: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in obj.items():
        if k == "_meta":
            continue
        key = f"{prefix}{k}"
        if isinstance(v, dict) and not is_plural(v):
            out.update(_flatten(v, key + "."))
        else:
            out[key] = v
    return out


def is_plural(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and isinstance(value.get("other"), str)
        and all(k in PLURAL_CATEGORIES for k in value)
    )


def load_catalog(code: str) -> dict[str, Any]:
    """Flat {key: text | {category: text}} of one language (cached). Missing file -> {}."""
    with _lock:
        cached = _catalogs.get(code)
    if cached is not None:
        return cached
    path = LOCALES_DIR / f"{code}.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        flat = _flatten(data) if isinstance(data, dict) else {}
    except (OSError, ValueError) as exc:
        if code in SUPPORTED:
            log.debug("Catalog %s not readable: %s", path, exc)
        flat = {}
    with _lock:
        _catalogs[code] = flat
    return flat


def catalog_meta(code: str) -> dict[str, Any]:
    try:
        data = json.loads((LOCALES_DIR / f"{code}.json").read_text(encoding="utf-8"))
        return dict(data.get("_meta") or {})
    except (OSError, ValueError):
        return {}


def reload_catalogs() -> None:
    """Drop the cache (tests, catalogs edited at runtime)."""
    with _lock:
        _catalogs.clear()
        _warned.clear()


# --------------------------------------------------------------------------- language


def match(tag: str | None) -> str | None:
    """Map a BCP-47 / POSIX / Windows locale name ("de_CH", "pt-PT", "zh-Hans-CN",
    "German_Switzerland") onto a supported code, or None."""
    if not tag or not isinstance(tag, str):
        return None
    t = tag.strip().split(".")[0].split("@")[0].replace("_", "-").lower()
    if not t:
        return None
    for code in SUPPORTED:
        if code.lower() == t:
            return code
    base = t.split("-")[0]
    if base == "zh":
        return None if re.search(r"hant|-tw|-hk|-mo", t) else "zh-CN"
    if base == "in":  # legacy code for Indonesian
        return "id"
    for code in SUPPORTED:
        if code.split("-")[0] == base:
            return code
    # Windows names from locale.getlocale(): "German_Switzerland", "Chinese (Simplified)_China"
    names = {
        "english": "en",
        "german": "de",
        "chinese": "zh-CN",
        "hindi": "hi",
        "spanish": "es",
        "french": "fr",
        "bangla": "bn",
        "bengali": "bn",
        "portuguese": "pt",
        "russian": "ru",
        "indonesian": "id",
        "dutch": "nl",
    }
    word = re.split(r"[\s(_-]", t)[0]
    return names.get(word)


def _windows_ui_language() -> str | None:
    if sys.platform != "win32":
        return None
    try:
        import ctypes

        lcid = ctypes.windll.kernel32.GetUserDefaultUILanguage()  # type: ignore[attr-defined]
        return locale.windows_locale.get(int(lcid))
    except Exception:
        return None


def system_language() -> str:
    """'auto': the Windows display language, else LANGUAGE/LC_ALL/LC_MESSAGES/LANG or the
    process locale; unsupported -> English."""
    candidates: list[str | None] = [_windows_ui_language()]
    for var in ("LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG"):
        value = os.environ.get(var)
        if value:
            candidates.extend(value.split(":"))
    try:
        candidates.append(locale.getlocale()[0])
    except ValueError:
        pass
    for c in candidates:
        code = match(c)
        if code:
            return code
    return REFERENCE


def resolve(setting: str | None) -> str:
    """Setting value ('auto' or a code) -> supported language code."""
    if not setting or setting == AUTO:
        return system_language()
    return match(setting) or REFERENCE


def set_language(setting: str | None) -> str:
    """Activate the language of `general.language`; returns the resolved code."""
    global _active
    code = resolve(setting)
    _active = code
    return code


def current() -> str:
    return _active


# --------------------------------------------------------------------------- plurals


def _int_parts(n: float) -> tuple[int, int, int]:
    """(integer part, number of visible fraction digits, fraction digits as int)."""
    s = repr(abs(n)) if isinstance(n, float) else str(abs(int(n)))
    if "." in s and not s.endswith(".0"):
        whole, frac = s.split(".")
        return int(whole), len(frac), int(frac)
    return int(abs(n)), 0, 0


def plural_category(code: str, n: float) -> str:
    """CLDR plural category of `n` for the supported languages (cardinal rules)."""
    i, v, _f = _int_parts(n)
    base = code.split("-")[0]
    if base in ("zh", "id"):
        return "other"
    if base in ("en", "de", "nl"):
        return "one" if i == 1 and v == 0 else "other"
    if base in ("hi", "bn"):
        return "one" if i == 0 or n == 1 else "other"
    if base in ("fr", "pt"):
        if i in (0, 1):
            return "one"
        return "many" if v == 0 and i != 0 and i % 1_000_000 == 0 else "other"
    if base == "es":
        if n == 1:
            return "one"
        return "many" if v == 0 and i != 0 and i % 1_000_000 == 0 else "other"
    if base == "ru":
        if v != 0:
            return "other"
        if i % 10 == 1 and i % 100 != 11:
            return "one"
        if 2 <= i % 10 <= 4 and not 12 <= i % 100 <= 14:
            return "few"
        return "many"
    if base == "ar":
        if v != 0:
            return "other"
        if n == 0:
            return "zero"
        if n == 1:
            return "one"
        if n == 2:
            return "two"
        if 3 <= i % 100 <= 10:
            return "few"
        if 11 <= i % 100 <= 99:
            return "many"
        return "other"
    return "one" if n == 1 else "other"


# --------------------------------------------------------------------------- lookup


def _lookup(code: str, key: str) -> Any:
    value = load_catalog(code).get(key)
    if isinstance(value, str) or is_plural(value):
        return value
    return None


def _fmt(value: Any) -> str:
    if isinstance(value, bool) or value is None:
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def translate(key: str, lang: str | None = None, **params: Any) -> str:
    """Text of `key` in `lang` (default: active language) -> en -> the key itself."""
    code = lang or _active
    value = _lookup(code, key)
    if value is None and code != REFERENCE:
        value = _lookup(REFERENCE, key)
    if value is None:
        if key not in _warned:
            _warned.add(key)
            log.warning("i18n: missing key %s", key)
        return key
    if not isinstance(value, str):
        count = params.get("count", params.get("n"))
        category = "other"
        if isinstance(count, (int, float)) and not isinstance(count, bool):
            category = plural_category(code if _lookup(code, key) is not None else REFERENCE, count)
        value = value.get(category) or value["other"]
    if not params:
        return value
    return _PLACEHOLDER.sub(
        lambda m: _fmt(params[m.group(1)]) if m.group(1) in params else m.group(0), value
    )


def tr(key: str, **params: Any) -> str:
    """Shorthand used throughout `app/`: `tr("api.save_failed", error=exc)`."""
    return translate(key, None, **params)


t = tr
