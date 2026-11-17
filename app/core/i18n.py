"""Backend message catalog: user-facing texts of `app/` (docs/TRANSLATING.md).

Catalogs: `app/locales/<code>.json` = {"_meta": {...}, <nested keys>}. English (`en`) is the
reference: every key exists there first. `tr("area.key", name=value)` returns the text in the
active language, falls back to the catalog's `_meta.fallback` (dialects: de-x-frk -> de),
then to English and finally to the key itself (logged once).

- Placeholders `{name}` are replaced by the keyword arguments (unknown ones stay as they are,
  so a literal `{id}` in a text needs no escaping).
- Plurals: the value is an object with CLDR categories (`one`, `other`, for Arabic also `zero`,
  `two`, `few`, `many`); the category comes from `count=` or else `n=` (see `plural_category`).
- The active language follows `general.language` (`set_language`); "auto" resolves the Windows
  display language (else the process locale), unsupported -> English. Private-use dialects
  (code with "-x-", e.g. the fun dialect de-x-frk) are only used when chosen explicitly;
  "auto" never resolves to them.

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

# Picker order (ui/js/i18n.js has the same list)
SUPPORTED: tuple[str, ...] = (
    *("en", "de", "zh-CN", "hi", "es", "fr", "bn", "pt", "ru", "id", "nl"),
    *("sv", "nb", "fi", "lt", "lv", "et", "de-x-frk"),
)
REFERENCE = "en"
AUTO = "auto"
LANGUAGE_CHOICES: tuple[str, ...] = (AUTO, *SUPPORTED)
PLURAL_CATEGORIES = ("zero", "one", "two", "few", "many", "other")
LOCALES_DIR = Path(__file__).resolve().parents[1] / "locales"

_PLACEHOLDER = re.compile(r"\{(\w+)\}")
_lock = threading.Lock()
_catalogs: dict[str, dict[str, Any]] = {}
_warned: set[str] = set()
_fallbacks: dict[str, str | None] = {}
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
        _fallbacks.clear()
        _warned.clear()


def is_dialect(code: str) -> bool:
    """Private-use tag (e.g. de-x-frk): selectable, never chosen by "auto"."""
    return "-x-" in code.lower()


def fallback_of(code: str) -> str | None:
    """`_meta.fallback` of a catalog (de-x-frk -> de), only if it is a supported language."""
    with _lock:
        if code in _fallbacks:
            return _fallbacks[code]
    value = catalog_meta(code).get("fallback")
    fb = value if isinstance(value, str) and value in SUPPORTED and value != code else None
    with _lock:
        _fallbacks[code] = fb
    return fb


def parent_of(code: str) -> str:
    """Non-dialect parent of a dialect (meta fallback, else the base code, else English)."""
    fb = fallback_of(code) or code.split("-")[0]
    return fb if fb in SUPPORTED and not is_dialect(fb) else REFERENCE


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
    if is_dialect(t):  # unknown private-use tag
        return None
    base = t.split("-")[0]
    if base == "zh":
        return None if re.search(r"hant|-tw|-hk|-mo", t) else "zh-CN"
    if base == "in":  # legacy code for Indonesian
        return "id"
    if base in ("no", "nn"):  # Norwegian macro language / Nynorsk -> Bokmål
        return "nb"
    for code in SUPPORTED:
        if not is_dialect(code) and code.split("-")[0] == base:
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
        "swedish": "sv",
        "norwegian": "nb",
        "finnish": "fi",
        "lithuanian": "lt",
        "latvian": "lv",
        "estonian": "et",
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
            return parent_of(code) if is_dialect(code) else code
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
    if base in ("en", "de", "nl", "sv", "fi", "et"):
        return "one" if i == 1 and v == 0 else "other"
    if base == "nb":
        return "one" if n == 1 else "other"
    if base == "lt":
        if v != 0:
            return "many"
        if i % 10 == 1 and not 11 <= i % 100 <= 19:
            return "one"
        if 2 <= i % 10 <= 9 and not 11 <= i % 100 <= 19:
            return "few"
        return "other"
    if base == "lv":
        f = _f
        if (
            i % 10 == 0
            and v == 0
            or 11 <= i % 100 <= 19
            and v == 0
            or v == 2
            and 11 <= f % 100 <= 19
        ):
            return "zero"
        if (
            v == 0
            and i % 10 == 1
            and i % 100 != 11
            or v == 2
            and f % 10 == 1
            and f % 100 != 11
            or v not in (0, 2)
            and f % 10 == 1
        ):
            return "one"
        return "other"
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
    source = code
    fb = fallback_of(code) if value is None else None
    if fb and fb != REFERENCE:
        value, source = _lookup(fb, key), fb
    if value is None and code != REFERENCE:
        value, source = _lookup(REFERENCE, key), REFERENCE
    if value is None:
        if key not in _warned:
            _warned.add(key)
            log.warning("i18n: missing key %s", key)
        return key
    if not isinstance(value, str):
        count = params.get("count", params.get("n"))
        category = "other"
        if isinstance(count, (int, float)) and not isinstance(count, bool):
            category = plural_category(source, count)
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
