# Releasing HCLoader

Installed copies (portable ZIP and ZIP-based venv installs) update themselves from GitHub releases
(`app/core/selfupdate.py`, design in `docs/decisions.md` "Selbst-Update"). A release is nothing more
than a Git tag `vX.Y.Z` plus a GitHub release; the workflow `.github/workflows/portable.yml` builds and
attaches the assets.

## Steps

1. **Bump the version** in `app/__init__.py` (`__version__ = "X.Y.Z"`, SemVer). This is the only place;
   `pyproject.toml` and `build_portable.ps1` read it.
2. **Changelog:** move the entries under `## [Unreleased]` in `CHANGELOG.md` into a new section
   `## [X.Y.Z] - YYYY-MM-DD`. The self-update shows this text (or the release notes) to the user.
3. Commit (`chore: release vX.Y.Z`), merge to `main` via PR, wait for green CI.
4. **Tag and push** from `main`:
   ```
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
5. The `Portable` workflow runs on the tag: build + smoke tests on Windows, then the `release` job
   - checks that the tag matches `__version__`,
   - creates the GitHub release if it does not exist yet (notes = the CHANGELOG section; tags with a
     `-` such as `v0.4.0-rc1` become pre-releases, which the updater ignores),
   - uploads `HCLoader-portable-X.Y.Z-win64.zip`, `HCLoader-X.Y.Z-source.zip` (`git archive`) and
     `SHA256SUMS` (`gh release upload --clobber`, `GITHUB_TOKEN`, `contents: write` only in this job).
6. Optionally edit the release notes on GitHub. Mark it as "latest" (default for the newest
   non-pre-release).

You can also create the release in the GitHub UI first ("Draft a new release" → new tag `vX.Y.Z`);
publishing it pushes the tag and the workflow attaches the assets to that release. Drafts are never
offered to users.

## What clients do

- On start (if `maintenance.check_app_updates_on_start` is on) they call
  `https://api.github.com/repos/<repo>/releases/latest` (fallback: `/tags`, highest SemVer, no
  pre-releases). Unauthenticated, so keep the repository **public**.
- Download only after the user clicks. Preferred asset: `HCLoader-X.Y.Z-source.zip`; fallback:
  `https://codeload.github.com/<repo>/zip/refs/tags/vX.Y.Z`. If `SHA256SUMS` lists the file, the hash
  must match.
- The update replaces `app/`, `ui/`, `scripts/` and top-level files only. If `requirements.txt` changed,
  pip runs after the app has exited; if `scripts/fetch_binaries.ps1` changed, it runs with `-BinDir`.
  User data (`data\` / `%APPDATA%\HCLoader`) and the music folder are never touched.
- Raising `requires-python` (or the Python of the portable build) cannot be done by the updater; users
  get "please download the portable ZIP again". Avoid it in patch releases and mention it in the notes.
- A new DB migration is safe: before migrating, the app writes
  `backups/hcloader-premigrate-v<old>-to-v<new>-<ts>.db` (newest 5 kept).

## Checklist

- [ ] `__version__` bumped, CHANGELOG section written
- [ ] CI green on `main`
- [ ] tag `vX.Y.Z` pushed, `Portable` workflow green (both jobs)
- [ ] release shows three assets: portable ZIP, source ZIP, `SHA256SUMS`
- [ ] an older install offers the update (Settings › Wartung › App-Update › "Jetzt prüfen")
