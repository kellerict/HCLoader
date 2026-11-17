"""Multilingual UI and backend messages (v0.2.0, docs/TRANSLATING.md).

Catalog structure, key/placeholder/plural parity, fallback logic, the `general.language`
setting and a lint against hard-coded German texts in ui/.
English (`en`) is the reference; German must be complete as well. The other languages are
filled in later: their missing keys are reported as xfail until then.
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path

import pytest

from app.core import config, i18n

ROOT = Path(__file__).resolve().parents[1]
UI = ROOT / "ui"
UI_LOCALES = UI / "js" / "locales"
PY_LOCALES = ROOT / "app" / "locales"
COMPLETE = ("en", "de")
PENDING = tuple(c for c in i18n.SUPPORTED if c not in COMPLETE)
CATEGORIES = set(i18n.PLURAL_CATEGORIES)
# CLDR categories a translation must provide for plural keys. "many" of es/fr/pt only covers
# millions (1 000 000 Mixes) and falls back to "other", so it is optional there.
REQUIRED_PLURALS = {
    "en": {"one", "other"},
    "de": {"one", "other"},
    "zh-CN": {"other"},
    "hi": {"one", "other"},
    "es": {"one", "other"},
    "fr": {"one", "other"},
    "bn": {"one", "other"},
    "pt": {"one", "other"},
    "ru": {"one", "few", "many", "other"},
    "id": {"other"},
    "nl": {"one", "other"},
}
PLACEHOLDER = re.compile(r"\{(\w+)\}")
TAG = re.compile(r"</?(?:b|i|em|strong|small|code|br)\s*/?>")


# --------------------------------------------------------------------------- helpers


def ui_catalog(code: str) -> tuple[dict, dict]:
    """(meta, dict) of ui/js/locales/<code>.js - both arguments are strict JSON."""
    src = (UI_LOCALES / f"{code}.js").read_text(encoding="utf-8")
    dec = json.JSONDecoder()
    pos = src.index("HC.i18n.register(") + len("HC.i18n.register(")
    meta, pos = dec.raw_decode(src, pos)
    pos = src.index(",", pos) + 1
    while src[pos].isspace():
        pos += 1
    body, pos = dec.raw_decode(src, pos)
    assert src[pos:].strip() == ");", f"{code}.js: trailing content after the dictionary"
    return meta, body


def is_plural(v) -> bool:
    return isinstance(v, dict) and "other" in v and set(v) <= CATEGORIES


def flatten(obj: dict, prefix: str = "") -> dict:
    out = {}
    for k, v in obj.items():
        if k == "_meta":
            continue
        if isinstance(v, dict) and not is_plural(v):
            out.update(flatten(v, f"{prefix}{k}."))
        else:
            out[f"{prefix}{k}"] = v
    return out


def texts(v) -> list[str]:
    return list(v.values()) if isinstance(v, dict) else [v]


def placeholders(v) -> set[str]:
    return {p for t in texts(v) for p in PLACEHOLDER.findall(t)}


def tags(v) -> list[str]:
    return sorted(TAG.findall(texts(v)[-1]))  # "other" form (or the string)


def py_catalog(code: str) -> dict:
    return json.loads((PY_LOCALES / f"{code}.json").read_text(encoding="utf-8"))


UI_REF = flatten(ui_catalog("en")[1])
PY_REF = flatten(py_catalog("en"))


def check_values(code: str, flat: dict, ref: dict) -> list[str]:
    """Placeholder, HTML-tag and plural problems of the keys `code` has filled."""
    problems = []
    for key, value in flat.items():
        if key not in ref:
            continue
        if not isinstance(value, str) and not is_plural(value):
            problems.append(f"{key}: neither text nor plural object")
            continue
        for t in texts(value):
            if not isinstance(t, str) or not t.strip():
                problems.append(f"{key}: empty text")
        for form in texts(value):
            extra = set(PLACEHOLDER.findall(form)) - placeholders(ref[key])
            if extra:
                problems.append(f"{key}: unknown placeholders {sorted(extra)}")
        if placeholders(value) != placeholders(ref[key]):
            problems.append(
                f"{key}: placeholders {sorted(placeholders(value))} "
                f"!= {sorted(placeholders(ref[key]))}"
            )
        if tags(value) != tags(ref[key]):
            problems.append(f"{key}: HTML tags {tags(value)} != {tags(ref[key])}")
        if is_plural(ref[key]):
            if not is_plural(value):
                problems.append(f"{key}: must be a plural object like the reference")
            else:
                missing = REQUIRED_PLURALS[code] - set(value)
                if missing:
                    problems.append(f"{key}: plural forms missing {sorted(missing)}")
        elif is_plural(value) and not set(value) <= CATEGORIES:
            problems.append(f"{key}: invalid plural categories {sorted(value)}")
    return problems


# --------------------------------------------------------------------------- UI catalogs


def test_supported_lists_agree():
    js = (UI / "js" / "i18n.js").read_text(encoding="utf-8")
    m = re.search(r"const SUPPORTED = \[([^\]]*)\]", js)
    assert m
    assert tuple(re.findall(r"'([\w-]+)'", m.group(1))) == i18n.SUPPORTED
    assert sorted(p.stem for p in UI_LOCALES.glob("*.js")) == sorted(i18n.SUPPORTED)
    assert sorted(p.stem for p in PY_LOCALES.glob("*.json")) == sorted(i18n.SUPPORTED)
    field = config.GeneralSettings.model_fields["language"]
    assert set(field.annotation.__args__) == set(i18n.LANGUAGE_CHOICES)
    index = (UI / "index.html").read_text(encoding="utf-8")
    for code in i18n.SUPPORTED:
        assert f'<script src="js/locales/{code}.js"></script>' in index
    assert index.index("js/i18n.js") < index.index("js/locales/en.js") < index.index("js/util.js")


@pytest.mark.parametrize("code", i18n.SUPPORTED)
def test_ui_locale_meta(code):
    meta, body = ui_catalog(code)
    assert meta["code"] == code
    assert meta["name"].strip()
    assert meta["dir"] == "ltr"
    assert meta["intl"].split("-")[0] == code.split("-")[0]
    assert isinstance(body, dict)
    assert py_catalog(code)["_meta"]["code"] == code


def test_ui_reference_and_german_complete():
    de = flatten(ui_catalog("de")[1])
    assert sorted(set(UI_REF) - set(de)) == [], "keys missing in de"
    assert sorted(set(de) - set(UI_REF)) == [], "keys in de that en (reference) does not have"
    assert len(UI_REF) > 800


@pytest.mark.parametrize("code", COMPLETE)
def test_ui_values_consistent(code):
    assert check_values(code, flatten(ui_catalog(code)[1]), UI_REF) == []


@pytest.mark.parametrize("code", PENDING)
def test_ui_pending_locale(code):
    flat = flatten(ui_catalog(code)[1])
    assert sorted(set(flat) - set(UI_REF)) == [], "keys that the reference does not have"
    assert check_values(code, flat, UI_REF) == []
    missing = sorted(set(UI_REF) - set(flat))
    if missing:
        pytest.xfail(f"{code}: {len(missing)} of {len(UI_REF)} keys not translated yet")


def test_german_uses_swiss_spelling():
    for name, flat in (
        ("ui", flatten(ui_catalog("de")[1])),
        ("backend", flatten(py_catalog("de"))),
    ):
        bad = [k for k, v in flat.items() if any("ß" in t for t in texts(v))]
        assert bad == [], f"{name}: «ss» statt ß"


# --------------------------------------------------------------------------- lint: no German in ui/

GERMAN_WORDS = re.compile(
    r"\b(und|oder|nicht|der|die|das|ist|wird|werden|bitte|keine?|alle|fehlt|fehlgeschlagen|"
    r"geladen|Quelle|Quellen|Datei|Ordner|Eintrag|Einträge|Einstellungen|gesperrt|Lauf|Fehler|"
    r"Warteschlange|erwartet|Suche|Treffer|Eingang|heute|gestern|Zahl|Sekunden|Minuten|Stunden|"
    r"Abbrechen|Speichern|Löschen|Zurück|Weiter|Neu|Prüfung|Starte|Fertig|gestartet|beendet)\b"
)
ALLOWED_DATA = ("Zürich", "Unsortiert")  # mock data / the built-in fallback genre (data)


def _scan(src: str) -> tuple[str, list[str]]:
    """Minimal JS/HTML scanner: (code without comments, texts of all string literals).
    Template literals are split into their text parts; `${...}` expressions are scanned as
    code (nested templates included). Regex literals are not special-cased."""
    code, texts_, stack, buf = [], [], ["code"], []
    i, n = 0, len(src)
    depth = [0]
    while i < n:
        mode, c = stack[-1], src[i]
        if mode == "tpl":
            if c == "\\":
                buf.append(src[i : i + 2])
                i += 2
            elif c == "`":
                texts_.append("".join(buf))
                buf = []
                stack.pop()
                code.append(c)
                i += 1
            elif src.startswith("${", i):
                texts_.append("".join(buf))
                buf = []
                stack.append("code")
                depth.append(0)
                code.append("${")
                i += 2
            else:
                buf.append(c)
                i += 1
            continue
        if src.startswith("/*", i) or src.startswith("<!--", i):
            close = "*/" if src.startswith("/*", i) else "-->"
            j = src.find(close, i + 2)
            j = n if j < 0 else j + len(close)
            code.append("\n" * src[i:j].count("\n"))
            i = j
        elif src.startswith("//", i) and (i == 0 or src[i - 1] not in ":\\"):
            j = src.find("\n", i)
            i = n if j < 0 else j
        elif c in "'\"":
            j = i + 1
            while j < n and src[j] != c and src[j] != "\n":
                j += 2 if src[j] == "\\" else 1
            texts_.append(src[i + 1 : j])
            code.append(src[i : j + 1])
            i = j + 1
        elif c == "`":
            stack.append("tpl")
            code.append(c)
            i += 1
        elif c == "{" and len(stack) > 1:
            depth[-1] += 1
            code.append(c)
            i += 1
        elif c == "}" and len(stack) > 1:
            if depth[-1] == 0:
                stack.pop()
                depth.pop()
            else:
                depth[-1] -= 1
            code.append(c)
            i += 1
        else:
            code.append(c)
            i += 1
    return "".join(code), texts_


def _strip_comments(src: str) -> str:
    return _scan(src)[0]


def _german_hits(path: Path) -> list[str]:
    code, pieces = _scan(path.read_text(encoding="utf-8"))
    if path.suffix == ".html":
        pieces += re.findall(r">([^<>]+)<", code)
    hits = []
    for s in pieces:
        s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)  # CSS comments inside template strings
        for word in ALLOWED_DATA:
            s = s.replace(word, "")
        if re.search(r"[äöüÄÖÜß«»]", s) or (" " in s.strip() and GERMAN_WORDS.search(s)):
            hits.append(s[:80])
    return hits


def ui_sources() -> list[Path]:
    files = [UI / "index.html"]
    files += [p for p in sorted((UI / "js").rglob("*.js")) if "locales" not in p.parts]
    return files


@pytest.mark.parametrize("path", ui_sources(), ids=lambda p: p.relative_to(UI).as_posix())
def test_no_hardcoded_german_in_ui(path):
    """Every visible text goes through a key (ui/js/locales). Comments may stay German."""
    assert _german_hits(path) == []


def test_lint_detects_german(tmp_path):
    bad = tmp_path / "x.js"
    bad.write_text(
        "const a = 'Datei fehlt'; /* Kommentar für alle */\nconst b = `Grösse`;\n",
        encoding="utf-8",
    )
    assert len(_german_hits(bad)) == 2
    ok = tmp_path / "y.js"
    ok.write_text(
        "const a = t('file.missing'); // Datei fehlt\nconst b = 'Hardfloor Zürich';\n",
        encoding="utf-8",
    )
    assert _german_hits(ok) == []


# --------------------------------------------------------------------------- UI keys used in code


def _literal_ui_keys() -> set[str]:
    keys = set()
    for path in ui_sources():
        src = _strip_comments(path.read_text(encoding="utf-8"))
        keys |= set(re.findall(r"(?<![\w.])(?:HC\.)?t\(\s*'([a-z0-9_]+(?:\.[A-Za-z0-9_]+)+)'", src))
        keys |= set(re.findall(r"data-i18n(?:-title|-aria)?=\"([a-z0-9_.]+)\"", src))
        keys |= set(re.findall(r"\b(?:h|unit|rangeKey):\s*'([a-z_]+\.[a-z_.]+)'", src))
    return keys


def test_literal_ui_keys_exist():
    keys = {k for k in _literal_ui_keys() if not k.endswith(("_", "."))}  # 'x.y_' + value
    missing = sorted(k for k in keys if k not in UI_REF)
    assert missing == []


def test_settings_fields_have_label_and_help():
    src = (UI / "js" / "views" / "settings.js").read_text(encoding="utf-8")
    fields = set(re.findall(r"\{ k: '([a-z_]+\.[a-z_]+)'", src))
    assert "general.language" in fields
    missing = [
        f"set.{k}.{part}"
        for k in fields
        for part in ("label", "help")
        if f"set.{k}.{part}" not in UI_REF
    ]
    assert missing == []


# --------------------------------------------------------------------------- backend catalogs


def test_backend_reference_and_german_complete():
    de = flatten(py_catalog("de"))
    assert sorted(set(PY_REF) - set(de)) == []
    assert sorted(set(de) - set(PY_REF)) == []
    assert len(PY_REF) > 300


@pytest.mark.parametrize("code", COMPLETE)
def test_backend_values_consistent(code):
    assert check_values(code, flatten(py_catalog(code)), PY_REF) == []


@pytest.mark.parametrize("code", PENDING)
def test_backend_pending_locale(code):
    flat = flatten(py_catalog(code))
    assert sorted(set(flat) - set(PY_REF)) == []
    assert check_values(code, flat, PY_REF) == []
    missing = sorted(set(PY_REF) - set(flat))
    if missing:
        pytest.xfail(f"{code}: {len(missing)} of {len(PY_REF)} backend keys not translated yet")


def _tr_calls() -> dict[str, list[str]]:
    """Every `tr("key", ...)` / `translate("key", ...)` with a literal key in app/."""
    found: dict[str, list[str]] = {}
    for path in sorted((ROOT / "app").rglob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if (
                isinstance(node, ast.Call)
                and isinstance(node.func, ast.Name)
                and node.func.id in ("tr", "translate", "t")
                and node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)
            ):
                found.setdefault(node.args[0].value, []).append(path.name)
    return found


def test_backend_keys_used_in_code_exist():
    used = _tr_calls()
    missing = {k: v for k, v in used.items() if k not in PY_REF}
    assert missing == {}
    assert len(used) > 250


def test_backend_key_constants_exist():
    """Module constants that hold message keys (translated where used)."""
    from app import api, main
    from app.core import config as cfg
    from app.core import filters, preflight, selfupdate, watchlist, ytclient

    keys = [
        *api._JOB_LABELS.values(),
        api._TASK_MOVED,
        api._UPDATE_BUSY,
        *cfg._TYPE_MESSAGES.values(),
        main.UPDATE_RUNNING,
        main.UPDATE_RECOVERING,
        main.UPDATE_RECOVER_FAILED,
        preflight.REST,
        preflight.POT_NOT_READY,
        preflight.POT_GAVE_UP,
        selfupdate.RUN_ACTIVE,
        selfupdate.GIT_HINT,
        selfupdate.WINDOWS_ONLY,
        filters.PREVIEW_REASON,
        filters.GEO_REASON,
        ytclient.PREVIEW_REASON,
        watchlist.UNSUPPORTED_URL,
    ]
    assert [k for k in keys if k not in PY_REF] == []


# --------------------------------------------------------------------------- backend engine


@pytest.mark.parametrize(
    ("code", "cases"),
    [
        ("en", {0: "other", 1: "one", 2: "other", 1.5: "other"}),
        ("de", {1: "one", 5: "other"}),
        ("fr", {0: "one", 1: "one", 2: "other", 1_000_000: "many"}),
        ("pt", {0: "one", 1: "one", 2: "other"}),
        ("es", {0: "other", 1: "one", 2: "other"}),
        ("hi", {0: "one", 1: "one", 2: "other"}),
        ("bn", {0: "one", 1: "one", 2: "other"}),
        ("ru", {1: "one", 2: "few", 5: "many", 11: "many", 21: "one", 22: "few", 112: "many"}),
        (
            "ar",
            {
                0: "zero",
                1: "one",
                2: "two",
                3: "few",
                10: "few",
                11: "many",
                99: "many",
                100: "other",
            },
        ),
        ("zh-CN", {1: "other", 2: "other"}),
        ("id", {1: "other"}),
        ("nl", {0: "other", 1: "one", 2: "other"}),
    ],
)
def test_plural_rules(code, cases):
    assert {n: i18n.plural_category(code, n) for n in cases} == cases


def test_translate_params_plural_and_language():
    assert i18n.translate("queue.enqueued", "en", n=1) == "1 mix added to the queue"
    assert i18n.translate("queue.enqueued", "en", n=3) == "3 mixes added to the queue"
    assert i18n.translate("queue.enqueued", "de", n=1) == "1 Mix zur Warteschlange hinzugefügt"
    assert i18n.translate("api.save_failed", "de", error=OSError("voll")) == (
        "Speichern fehlgeschlagen: voll"
    )
    # unknown placeholders stay literally (texts may contain "{id}")
    assert "{id}" in i18n.translate("config.id_placeholder", "en")


def test_fallback_chain(monkeypatch, caplog):
    i18n.reload_catalogs()
    monkeypatch.setitem(i18n._catalogs, "fr", {"api.settings_saved": "Paramètres enregistrés"})
    assert i18n.translate("api.settings_saved", "fr") == "Paramètres enregistrés"
    assert i18n.translate("api.invalid_selection", "fr") == "Invalid selection"  # -> en
    with caplog.at_level("WARNING"):
        assert i18n.translate("no.such.key", "fr") == "no.such.key"  # -> key
        assert i18n.translate("no.such.key", "fr") == "no.such.key"
    assert len([r for r in caplog.records if "no.such.key" in r.getMessage()]) == 1
    i18n.reload_catalogs()


def test_tr_follows_active_language():
    assert i18n.set_language("de") == "de"
    assert i18n.tr("api.settings_saved") == "Einstellungen gespeichert"
    assert i18n.set_language("en") == "en"
    assert i18n.tr("api.settings_saved") == "Settings saved"


@pytest.mark.parametrize(
    ("tag", "code"),
    [
        ("de_CH", "de"),
        ("de-CH", "de"),
        ("en_US.UTF-8", "en"),
        ("pt-PT", "pt"),
        ("pt_BR", "pt"),
        ("zh-Hans-CN", "zh-CN"),
        ("zh_CN", "zh-CN"),
        ("zh-TW", None),
        ("nl-NL", "nl"),
        ("Dutch_Netherlands", "nl"),
        ("in_ID", "id"),
        ("German_Switzerland", "de"),
        ("ja-JP", None),
        ("", None),
        (None, None),
    ],
)
def test_match(tag, code):
    assert i18n.match(tag) == code


def test_resolve_auto_and_fallback(monkeypatch):
    monkeypatch.setattr(i18n, "_windows_ui_language", lambda: "fr_FR")
    assert i18n.resolve("auto") == "fr"
    monkeypatch.setattr(i18n, "_windows_ui_language", lambda: None)
    for var in ("LANGUAGE", "LC_ALL", "LC_MESSAGES", "LANG"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("LANG", "ru_RU.UTF-8")
    assert i18n.resolve("auto") == "ru"
    monkeypatch.setenv("LANG", "ja_JP.UTF-8")
    monkeypatch.setattr(i18n.locale, "getlocale", lambda: ("ja_JP", "UTF-8"))
    assert i18n.resolve("auto") == "en"
    assert i18n.resolve("de") == "de"
    assert i18n.resolve("xx") == "en"


# --------------------------------------------------------------------------- setting


def test_language_setting_default_and_validation(tmp_path):
    assert config.defaults().general.language == "en"
    assert config.validate_settings({"general": {"language": "de"}}) == {}
    assert config.validate_settings({"general": {"language": "auto"}}) == {}
    errors = config.validate_settings({"general": {"language": "xx"}})
    assert list(errors) == ["general.language"]
    assert "Allowed values" in errors["general.language"]
    # an existing config without the key (installed before v0.2.0) gets English
    path = tmp_path / "config.yaml"
    path.write_text("general:\n  start_view: library\n", encoding="utf-8")
    loaded = config.load(path)
    assert loaded.general.language == "en" and loaded.general.start_view == "library"
    # an invalid value falls back per key, the rest of the section stays
    path.write_text("general:\n  language: klingon\n  start_view: log\n", encoding="utf-8")
    loaded = config.load(path)
    assert loaded.general.language == "en" and loaded.general.start_view == "log"


def test_validation_messages_follow_language():
    bad = {"search": {"results_count": 0}}
    assert config.validate_settings(bad)["search.results_count"] == "Must be at least 1"
    i18n.set_language("de")
    assert config.validate_settings(bad)["search.results_count"] == "Muss mindestens 1 sein"


def test_api_switches_language_on_save(tmp_path, monkeypatch):
    from app.api import Api

    monkeypatch.setenv("HCLOADER_HOME", str(tmp_path))
    api = Api(config_file=tmp_path / "config.yaml", configure_logging=False)
    try:
        assert api.get_settings()["language"] == "en"
        values = api.get_settings()["values"]
        values["general"]["language"] = "de"
        res = api.save_settings(values)
        assert res["ok"] and res["language"] == "de"
        assert api.get_settings()["language"] == "de"
        assert i18n.tr("api.settings_saved") == "Einstellungen gespeichert"
        values["search"]["results_count"] = 0
        assert api.save_settings(values)["errors"]["search.results_count"] == (
            "Muss mindestens 1 sein"
        )
        monkeypatch.setattr(i18n, "_windows_ui_language", lambda: "es_ES")
        values["search"]["results_count"] = 30
        values["general"]["language"] = "auto"
        assert api.save_settings(values)["language"] == "es"
    finally:
        api.shutdown(queue_timeout=1)


# --------------------------------------------------------------------------- JS engine (browser)


@pytest.fixture(scope="module")
def page():
    sync_api = pytest.importorskip("playwright.sync_api")
    import os

    from tests.test_bridge_js import CHROMIUM_OFFLINE_ARGS

    candidates = []
    if os.environ.get("HCLOADER_CHROMIUM"):
        candidates.append({"executable_path": os.environ["HCLOADER_CHROMIUM"]})
    if Path("/opt/pw-browsers/chromium").exists():
        candidates.append({"executable_path": "/opt/pw-browsers/chromium"})
    candidates += [{}, {"channel": "msedge"}]
    env = {k: v for k, v in os.environ.items() if "proxy" not in k.lower()}
    with sync_api.sync_playwright() as pw:
        browser = None
        for kw in candidates:
            try:
                browser = pw.chromium.launch(**kw, args=CHROMIUM_OFFLINE_ARGS, env=env)
                break
            except Exception:
                continue
        if browser is None:
            pytest.skip("no Chromium for Playwright")
        ctx = browser.new_context(locale="fr-FR")
        pg = ctx.new_page()
        pg.messages = []
        pg.on("console", lambda m: pg.messages.append((m.type, m.text)))
        pg.on("pageerror", lambda e: pg.messages.append(("pageerror", str(e))))
        pg.goto((UI / "index.html").as_uri() + "?mock=1&nosim=1&lang=de")
        pg.wait_for_function("document.body.classList.contains('ready')")
        yield pg
        browser.close()


def test_js_language_from_settings_and_html_attributes(page):
    assert page.evaluate(
        "[HC.i18n.lang, document.documentElement.lang, document.documentElement.dir]"
    ) == [
        "de",
        "de-CH",
        "ltr",
    ]
    assert (
        page.evaluate("document.querySelector('.nav-item[data-view=library]').innerText")
        == "Bibliothek"
    )


def test_js_t_plural_fallback_and_escape(page):
    r = page.evaluate(
        """() => {
      const out = {};
      out.one = HC.t('toast.enqueued', {n: 1});
      out.many = HC.t('toast.enqueued', {n: 3});
      out.count = HC.t('inbox.count', {n: '<b>1</b>', count: 1});
      HC.i18n.register({code: 'ru', name: 'Русский', intl: 'ru-RU'},
        {toast: {enqueued: {one: '{n} микс', few: '{n} микса', many: '{n} миксов',
                            other: '{n} микса'}}});
      HC.i18n.set('ru');
      out.ru = [1, 2, 5, 21].map((n) => HC.t('toast.enqueued', {n}));
      out.ru_fallback = HC.t('nav.library');
      out.missing = HC.t('no.such.<key>');
      HC.i18n.register({code: 'ru', name: 'Русский', intl: 'ru-RU', dir: 'rtl'}, {});
      HC.i18n.set('ru');
      out.ar = [document.documentElement.dir, document.documentElement.lang];
      HC.i18n.set('de');
      out.resolve = [HC.i18n.resolve('auto', ['pt-PT', 'en']),
                     HC.i18n.resolve('auto', ['ja', 'zh-TW']),
                     HC.i18n.resolve('auto', ['zh-Hans-CN']), HC.i18n.resolve('xx')];
      out.year = HC.t('discover.none_year', {year: 2013});
      return out;
    }"""
    )
    assert r["one"] == "1 Mix zur Warteschlange hinzugefügt"
    assert r["many"] == "3 Mixes zur Warteschlange hinzugefügt"
    assert r["count"] == "<b>1</b> Treffer"
    assert r["ru"] == ["1 микс", "2 микса", "5 миксов", "21 микс"]
    assert r["ru_fallback"] == "Library"  # missing in ru -> en
    assert r["missing"] == "no.such.&#60;key&#62;"
    assert r["ar"] == ["rtl", "ru-RU"]
    assert r["resolve"] == ["pt", "en", "zh-CN", "en"]
    assert "2013" in r["year"]  # no digit grouping in params
    assert ("warning", "[i18n] missing: no.such.<key>") in page.messages


def test_js_intl_formatting(page):
    r = page.evaluate(
        """() => {
      const u = HC.util;
      const fmt = () => [u.fmtNum(1234567), u.fmtDate('2026-11-14'), u.fmtDec(1.5, 1, true)];
      HC.i18n.set('de');
      const de = fmt();
      HC.i18n.set('en');
      const en = fmt();
      HC.i18n.set('de');
      return {de, en};
    }"""
    )
    assert (
        r["de"] == ["1’234’567", "14.11.2026", "1,5"] or r["de"][0].replace("'", "’") == "1’234’567"
    )
    assert r["en"] == ["1,234,567", "11/14/2026", "1.5"]


def test_js_language_switch_rebuilds_ui(page):
    page.evaluate("HC.app.go('settings')")
    page.select_option('[data-k="general.language"] select', "en")
    page.click("#btn-save")
    page.wait_for_function(
        "HC.i18n && HC.i18n.lang === 'en' && document.body.classList.contains('ready')"
    )
    assert (
        page.evaluate("document.querySelector('.nav-item[data-view=library]').innerText")
        == "Library"
    )
    options = page.evaluate(
        "Array.from(document.querySelectorAll('[data-k=\"general.language\"] option'))"
        ".map(o => o.textContent)"
    )
    assert options[:3] == ["Automatic (system language)", "English", "Deutsch"]
    assert "Nederlands" in options and len(options) == 12


def test_js_no_missing_keys_while_browsing(page):
    """Visits every view and settings tab in English: no key may be missing at runtime."""
    page.messages.clear()
    for view in ("discover", "inbox", "watchlist", "downloads", "library", "log", "settings"):
        page.evaluate(f"HC.app.go('{view}')")
        page.wait_for_timeout(150)
    for tab in page.evaluate(
        "Array.from(document.querySelectorAll('[data-tab]')).map(e => e.dataset.tab)"
    ):
        page.click(f'[data-tab="{tab}"]')
        page.wait_for_timeout(60)
    bad = [m for m in page.messages if m[0] in ("error", "pageerror") or "[i18n] missing" in m[1]]
    assert bad == []
