# Development

HCLoader targets Windows, but most of the code and all tests run on Linux and macOS too (WebView2,
`schtasks` and the PowerShell scripts are Windows-only).

## Setup

Windows:

```powershell
.\scripts\setup.ps1 -Dev
```

Linux or macOS (tests only, no GUI):

```bash
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r requirements-dev.txt
```

## Everything you need

```powershell
.\.venv\Scripts\pytest
.\.venv\Scripts\ruff check . ; .\.venv\Scripts\ruff format .
.\.venv\Scripts\python scripts\ui_screenshots.py       # screenshots of all views in mock mode -> docs/screenshots/
.\.venv\Scripts\python -m app.main                      # GUI
.\.venv\Scripts\python -m app.main --smoke <URL>        # one real download (QA only, uses the network)
```

(Use `.venv/bin/...` on Linux and macOS.)

## Tests

- **No network in tests.** `tests/conftest.py` blocks every non-loopback connection; mock instead.
- Tests that really need a network (PyPI only, **never YouTube**) carry `@pytest.mark.network`. The
  default run excludes them (`-m 'not network'`); run them with `pytest -m network`. Set
  `HCLOADER_REQUIRE_NETWORK=1` to make them fail instead of skip when the network is missing.
- `HCLOADER_NO_DIALOG=1` prevents modal message boxes (set by the conftest and CI).
- Ruff checks `E, F, I, UP, B` with line length 100.

## CI

`.github/workflows/ci.yml` runs on `windows-latest` for every push and pull request: `ruff check`,
`ruff format --check`, `pytest`, and the network-marked tests (PyPI only).
`.github/workflows/portable.yml` builds the portable ZIP on tags `v*` and on demand, runs smoke
tests (imports, portable mode, pytest inside the embedded Python, unpacking on another drive,
Deno and the PO-token provider) and uploads the ZIP as an artifact.

## Conventions

- Code, identifiers and commits in English; UI texts and user-facing logs in Swiss German (de-CH),
  UI strings centralized in `ui/js/i18n.js`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Every network access goes through the throttle; never add parallel downloads or retry loops.
- Everything a user may want to change must be a setting (schema in
  [docs/settings-schema.md](https://github.com/kellerict/HCLoader/blob/main/docs/settings-schema.md)).
- Check the **current** yt-dlp, Deno and bgutil documentation before adding options; YouTube changes
  constantly.
- Never commit `bin\`, `.venv\`, media files, databases, user `config.yaml`, cookies or logs.

See [CONTRIBUTING.md](https://github.com/kellerict/HCLoader/blob/main/CONTRIBUTING.md) and
[Architecture](Architecture).

## Releasing

Version bump, changelog, tag and the portable ZIP are described in
[docs/RELEASING.md](https://github.com/kellerict/HCLoader/blob/main/docs/RELEASING.md).

## Quality process

The project uses automated QA and independent review steps on top of the test suite (acceptance
checks per phase, a review before merging). Their notes are in `docs/qa/` and `docs/reviews/`.
