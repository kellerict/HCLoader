# Contributing to HCLoader

Thanks for your interest.

## Issues are welcome

Bug reports and feature requests: use the [issue templates](https://github.com/kellerict/HCLoader/issues/new/choose).
Please check the [Troubleshooting](https://github.com/kellerict/HCLoader/wiki/Troubleshooting) page
and existing issues first, and **never post cookies, tokens or account details** (remove personal
paths from logs).

## Pull requests: collaborators only

Pull requests are limited to repository collaborators. If you have a larger idea, open an issue
first and describe it; the maintainer may implement it or invite you as a collaborator.

## Ground rules for changes

- **Be gentle with the platforms.** Every network access goes through the central throttle
  (`app/core/throttle.py`). No parallel downloads, no retry loops, immediate backoff on 429 or a bot
  check. Changes must never bypass this.
- **Cheap before expensive:** flat metadata first, filter, then resolve and download.
- **Everything relevant is a setting** in the GUI, not only a constant in the code. The schema is in
  `docs/settings-schema.md` and `app/core/config.py`.
- **Module boundaries:** `core/` does not know the GUI; `api.py` does not know yt-dlp; only
  `app/core/ytclient.py` imports `yt_dlp`. Long operations go through `worker.py`, never the
  pywebview callback thread.
- Check the **current** yt-dlp, Deno and bgutil documentation before adding options.

## Code style and tests

- Python 3.12+, `pathlib.Path` for paths.
- `ruff check .` and `ruff format .` must be clean (line length 100).
- **Tests are required** for new behavior and bug fixes: `pytest`.
- **No network in tests.** Non-loopback connections are blocked in `tests/conftest.py`; mock them.
  A test that truly needs a network (PyPI only, never YouTube) must carry `@pytest.mark.network`.
- CI runs `ruff` and `pytest` on `windows-latest`; it must be green.

```powershell
.\scripts\setup.ps1 -Dev
.\.venv\Scripts\pytest
.\.venv\Scripts\ruff check . ; .\.venv\Scripts\ruff format .
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), small and thematic, in English:
`feat:`, `fix:`, `chore:`, `docs:`, `test:`.

## UI text and language

- The app UI is **Swiss German (de-CH)**, using "ss" instead of "ß".
- All UI strings live in `ui/js/i18n.js`; do not scatter text through the markup.
- Code, identifiers, commit messages and documentation are in English.
- After visible UI changes, refresh screenshots with `python scripts\ui_screenshots.py`
  (mock mode, output in `docs/screenshots/`).

## Never commit

`bin\` (Deno, ffmpeg), `.venv\`, `__pycache__\`, media files (`*.mp3`, `*.opus`, `*.m4a`),
databases, a `config.yaml` with personal values, cookies, logs.

## Documentation

Wiki pages live in `docs/wiki/` and are published to the GitHub wiki (see `docs/wiki/README.md`).
Update the matching page when behavior or settings change.

## Personal-use notice

HCLoader is for personal archiving. Contributions that make redistribution easier or that work
around the platforms' limits or protections will not be accepted.
