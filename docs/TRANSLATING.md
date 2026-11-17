# Translating HCLoader

HCLoader speaks 19 languages from v0.2.0 on. **English (`en`) is the reference catalog**: every key
exists there first, and a missing translation falls back to English, then to the key itself.
German (`de`, de-CH spelling) is the second complete catalog. The others: `zh-CN`, `hi`, `es`,
`fr`, `bn`, `pt` (Brazil), `ru`, `id`, `nl`, `nl-BE` (Vlaams, a regional variant of `nl`), `sv`, `nb` (Bokmål), `fi`, `lt`, `lv`, `et` and
`de-x-frk` («Fränggisch», a Franconian fun dialect).

Picker order (`SUPPORTED`): en, de, zh-CN, hi, es, fr, bn, pt, ru, id, nl, nl-BE, sv, nb, fi, lt, lv,
et, de-x-frk.

## Dialects (`-x-` codes)

A code with a private-use part (`de-x-frk`) is a **dialect**: it is only used when the user picks
it. `auto` never resolves to it (a system language `de-x-frk` maps to its parent `de`), and a
base-language match (`de-DE` → `de`) never lands on it. Its meta names a parent with
`"fallback": "de"`: a missing key falls back to `de`, then `en`, then the key itself. Plural rules
and `Intl` formats come from `intl` (`de-DE`).

## Regional variants (`meta.fallback`, e.g. `nl-BE`)

A **variant** is a real regional language with a parent catalog: `nl-BE` («Vlaams (België)»,
`"intl": "nl-BE"`, `"fallback": "nl"`). Its catalogs contain **only the keys whose wording differs**
from the parent – for Flemish e.g. the polite `u`/`uw` instead of `je`, «enkel» instead of «alleen»,
«bewaren» instead of «opslaan», «bv.» instead of «bijv.», «rechtstreeks», «momenteel». Keep it natural
and professional, no caricature. Every other key falls back to `nl`, then `en`.

- Unlike `-x-` dialects, `auto` does pick a variant: `nl-BE`, `nl_BE`, `nl-Latn-BE` and the Windows name
  `Dutch_Belgium` → `nl-BE`; every other `nl-*` → `nl` (the plain code is listed before its variants).
- Tests: a catalog with `meta.fallback` may be partial (parity tests skip the "missing keys" check;
  placeholders, tags and plurals of the keys it has are still checked). `nl-BE` must not repeat a
  parent text unchanged (`test_flemish_variant_only_holds_differences`).
- When you change a parent text, check whether the variant overrides that key.
- The plural category always follows the catalog the text actually came from.

## File layout

| Part | File | Format |
|---|---|---|
| UI engine | `ui/js/i18n.js` | `HC.t(key, params)`, `HC.i18n` (no texts) |
| UI texts | `ui/js/locales/<code>.js` | `HC.i18n.register(<meta JSON>, <dictionary JSON>);` |
| Backend engine | `app/core/i18n.py` | `tr(key, **params)`, `set_language()` |
| Backend texts | `app/locales/<code>.json` | `{"_meta": {...}, <nested keys>}` |
| Tests | `tests/test_i18n.py` | parity, placeholders, plurals, lint, fallback |

All UI catalogs are loaded with plain `<script>` tags from `ui/index.html` (no `fetch`, works
under `file://` in WebView2 and in the browser mock). Both arguments of `register(...)` must stay
**strict JSON** (double quotes, no comments, no trailing commas): the tests parse them with Python.

Meta object (UI and backend `_meta`):

```json
{"code": "nl", "name": "Nederlands", "dir": "ltr", "intl": "nl-NL"}
```

- `name` – native name, shown in Settings › General › Language.
- `dir` – `rtl` for right-to-left languages (none shipped at the moment); the UI sets `<html dir>` from it.
- `fallback` – optional: a supported language that is tried before English (dialects and
  regional variants, e.g. `"fallback": "de"` for `de-x-frk`, `"fallback": "nl"` for `nl-BE`).
- `intl` – locale for `Intl` (dates, numbers, relative times, units). Use e.g. `ar-u-nu-latn` for an RTL language if
  Latin digits are wanted, `bn` / `hi-IN` for native conventions.

## What the backend translates

User-facing backend texts come from `app/locales/<code>.json`: settings validation errors, error
messages returned by the bridge, toasts, status/queue reasons (backoff, limits), INFO/WARNING/ERROR
log lines shown in the live log, update texts, CLI output and the start error dialogs. The backend
sends **finished text** (same language as the UI, both follow `general.language`).

Not translated on purpose: DEBUG log lines and programmer errors (English), `config.yaml` comments,
the Windows task description, and all **data**: genre names (also the fallback genre
«Unsortiert»), folder and file names, tags, DB values, the download archive. Texts stored with a run
or a failed video (run notes, error column) keep the language they were written in.

## Keys

- Dotted, lower-case snake_case: `area.key` (`toast.enqueued`, `set.general.language.help`).
  Nested JSON objects build the path: `{"toast": {"enqueued": ...}}` = `toast.enqueued`.
- Never rename or delete keys in a translation; only `en` defines keys. New keys are added to
  `en` and `de` in the same change (the tests enforce this).
- Keep a key's meaning stable; when the meaning changes, use a new key.

## Placeholders

`{name}` is replaced by a parameter: `"Source saved: {name}"`. Keep every placeholder of the
English text, in any order the language needs; do not translate the name inside the braces.
Some texts contain literal braces that are *not* parameters (`{id}`, `{platform}` in the path
pattern help) – keep them unchanged too. Numbers passed as parameters are formatted with `Intl`
(no digit grouping, so years stay `2013`). Backend messages insert numbers unformatted (Latin
digits) – accepted difference, see `docs/decisions.md`.

**Parameters are inserted raw (not escaped)** so that markup like `<b>…</b>` can be passed. Any
`HC.t(...)` result with data from outside (video title, channel or source name, path, error text)
must go through `esc()` – or through `ui.toast` / `ui.confirm`, which escape – before it reaches
`innerHTML`. Never put such a result into `innerHTML` directly.

HTML: a few UI texts contain `<b>…</b>`; keep the same tags (the tests compare them).
Quotation marks: use the typographic quotes of your language (de-CH «…», en “…”).

## Plurals

A plural key is an object with CLDR categories instead of a string:

```json
"enqueued": {"one": "{n} mix added to the queue", "other": "{n} mixes added to the queue"}
```

- The category is chosen with `Intl.PluralRules` (UI) or `plural_category()` (backend) from the
  parameter `count`, or `n` if there is no `count`. Always write the number placeholder in every
  form (`{n}`, sometimes `{rest}`) – `one` is not only 1 in every language (Russian: 21, 31 …).
- Provide the categories your language needs (checked by the tests):

| Language | Categories |
|---|---|
| en, de, nl, nl-BE, hi, bn, sv, nb, fi, et, de-x-frk | `one`, `other` |
| es, fr, pt | `one`, `other` (`many` optional, only for millions) |
| ru | `one`, `few`, `many`, `other` |
| lt | `one`, `few`, `many` (fractions), `other` |
| lv | `zero`, `one`, `other` |
| zh-CN, id | `other` |

- A key that is a plain string in English stays a string (no plural needed).

## Right-to-left (no language shipped)

If a catalog declares `"dir": "rtl"`, the engine sets `<html dir="rtl">`. Layout mirroring is done in CSS (logical properties,
`[dir=rtl]` overrides) – that is UI work, not translation work. In texts: keep Latin product names
(YouTube, SoundCloud, yt-dlp, PO token) as they are; the browser handles bidi runs.

## Adding a language

1. Add the code to `SUPPORTED` in `ui/js/i18n.js` and `app/core/i18n.py`, to the `language` literal
   in `app/core/config.py` (`GeneralSettings`), the mock's `general.language` rule (`ui/js/mock.js`),
   `LANGUAGES` in `scripts/ui_screenshots.py`, and `REQUIRED_PLURALS` in `tests/test_i18n.py`.
2. Create `ui/js/locales/<code>.js` and `app/locales/<code>.json` (copy a stub) and add the
   `<script>` tag in `ui/index.html`.
3. Add the language to the `match()` name table if Windows reports it by name, and its plural rule
   to `plural_category()` in `app/core/i18n.py` if it is not `one`/`other` like English.
4. Update `docs/settings-schema.md` and `config.example.yaml`.

## Filling a stub

Copy the structure of `en` (UI: `ui/js/locales/en.js`, backend: `app/locales/en.json`) into the
stub's empty dictionary and translate the values. Partial catalogs are fine while working: missing
keys fall back to English, and the test for that language is reported as `xfail` with the number
of missing keys until it is complete. Wrong placeholders, unknown keys or missing plural forms fail
right away.

## Checking

```powershell
.\.venv\Scripts\pytest tests/test_i18n.py -rx            # catalogs, lint, fallback, browser checks
.\.venv\Scripts\python scripts\ui_screenshots.py --lang fr   # screenshots -> docs/screenshots/fr/
```

In the browser mock (`ui/index.html?mock=1&lang=fr`) a missing key logs `[i18n] missing: <key>`
once in the console. The mock's own simulated backend messages and mock data stay English.
