# Releasing HCLoader

Installed copies (installer, portable ZIP and ZIP-based venv installs) update themselves from GitHub releases
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
5. The `Portable` workflow runs on the tag: portable build, installer build and smoke tests on
   Windows (job `portable`), then the `release` job
   - checks that the tag matches `__version__`,
   - creates the GitHub release if it does not exist yet (notes = the CHANGELOG section; tags with a
     `-` such as `v0.4.0-rc1` become pre-releases, which the updater ignores); a release you already
     created in the UI is kept and only gets the assets,
   - uploads `HCLoader-Setup-X.Y.Z.exe`, `HCLoader-portable-X.Y.Z-win64.zip`,
     `HCLoader-X.Y.Z-source.zip` (`git archive`) and `SHA256SUMS` over all of them
     (`gh release upload --clobber`, `GITHUB_TOKEN`, `contents: write` only in this job).
6. Optionally edit the release notes on GitHub. Mark it as "latest" (default for the newest
   non-pre-release).

You can also create the release in the GitHub UI first ("Draft a new release" → new tag `vX.Y.Z`);
publishing it pushes the tag and the workflow attaches the assets to that release. Drafts are never
offered to users.

## The installer

`installer/HCLoader.iss` (Inno Setup 6) packs exactly the files of the portable ZIP, minus
`portable.txt` and any `data\`, so the installed copy keeps its data in `%APPDATA%\HCLoader`.

- **Build** (CI step "Installer: compile"): the portable ZIP is extracted to a clean folder, the longest
  relative path is measured (`scripts\portable_tools.py longest`) and the step fails if
  `%LOCALAPPDATA%\Programs\HCLoader` + that path exceeds 259 characters (MAX_PATH); it warns when
  user names of 20 characters would no longer fit. Then
  `ISCC.exe /DAppVersion=X.Y.Z /DSourceDir=<folder> /DOutputDir=<out> /DMaxRelPath=<n> installer\HCLoader.iss`.
  Inno Setup 6 is preinstalled on `windows-latest`; otherwise the step installs it with Chocolatey.
  Locally the same command works after `scripts\build_portable.ps1` (`SourceDir` defaults to
  `dist\HCLoader`, but a build folder used for testing contains `__pycache__`/`data\` - those are
  excluded anyway).
- **Smoke** (step "Smoke (f)"): silent install to a temp folder, file and shortcut checks, no
  `portable.txt`, imports + `--help` + Deno/bgutil probe with the installed Python, `app_home()` =
  `%APPDATA%\HCLoader`, self-update mode `installed`, upgrade over the installation, silent uninstall
  (folder and its scheduled task gone, `%APPDATA%\HCLoader` untouched).
- **Facts that must never change:** `AppId` (`{363DD978-CFF7-4D2A-B9B1-F9D6073903A4}`, identifies the
  installation for upgrades), the default folder `{localappdata}\Programs\HCLoader`,
  `PrivilegesRequired=lowest` (per user, no UAC).
- The installer and the executables are **not code-signed**; SmartScreen warns until the file has
  reputation ("More info" › "Run anyway"). Mention that in the release notes if users ask.
- After a self-update the version shown in "Apps & features" is still the one of the last installer
  run (cosmetic; the next installer run fixes it).

## What clients do

- On start (if `maintenance.check_app_updates_on_start` is on) they call
  `https://api.github.com/repos/<repo>/releases/latest` (fallback: `/tags`, highest SemVer, no
  pre-releases). Unauthenticated, so keep the repository **public**.
- Download only after the user clicks. Preferred asset: `HCLoader-X.Y.Z-source.zip`; fallback:
  `https://codeload.github.com/<repo>/zip/refs/tags/vX.Y.Z`. Only `https://` URLs on GitHub hosts
  (`api.github.com`, `github.com`, `codeload.github.com`, `objects.githubusercontent.com`,
  `release-assets.githubusercontent.com`, `raw.githubusercontent.com` for the CHANGELOG) are opened,
  redirects included.
- **Fail-closed:** if the release has a `SHA256SUMS` asset, it must be readable, list the downloaded
  file and match - otherwise the update is refused. Without `SHA256SUMS` (tags without a release, old
  releases) only the ZIP integrity is checked and the banner says «ohne Prüfsumme». The release job
  always attaches `SHA256SUMS`; never delete it from a release.
- The update replaces `app/`, `ui/`, `scripts/` and top-level files only. If `requirements.txt` changed,
  pip runs after the app has exited; if `scripts/fetch_binaries.ps1` changed, it runs with `-BinDir`.
  User data (`data\` / `%APPDATA%\HCLoader`) and the music folder are never touched.
- Raising `requires-python` (or the Python of the portable build) cannot be done by the updater; users
  get "please download the portable ZIP again" (installed copies: "please run the new setup"). Avoid it in patch releases and mention it in the notes.
- A new DB migration is safe: before migrating, the app writes
  `backups/hcloader-premigrate-v<old>-to-v<new>-<ts>.db` (newest 5 kept).

## Account and repository security (required)

`SHA256SUMS` lives in the same release as the ZIP: it protects against broken transfers, not against
someone with write access to the repository. The chain of trust is "the maintainer's GitHub account +
TLS". That is acceptable for this single-maintainer tool only with:

- **2FA** on the maintainer account (passkey or TOTP).
- A **tag ruleset for `v*`** (Settings › Rules › Rulesets › Tag): only the maintainer may create,
  update or delete release tags; block force-pushes on `main`.
- **Immutable releases** enabled (Settings › General › Releases): published assets and tags cannot be
  changed afterwards.
- The wiki workflow (`contents: write`) runs only on `main` / manual dispatch; the portable build
  runs on tags, `main`, PRs and manual dispatch, and only the `release` job may write
  (`persist-credentials: false`).
- A fork set in `maintenance.update_repo` is shown in the banner as «aus <repo>».

Later: a detached signature (e.g. minisign/ed25519) with the public key built into the app.

## If an update is interrupted

`apply_update.ps1` writes `<data>\update\in_progress.json` (journal) before the first change and
removes it at the end. If it is killed in between (power loss), the next start (`HCLoader.cmd`/`.vbs`,
`python -m app.main`) runs the updater with `-Recover`, which restores the old version from
`<App>\_previous\` and restarts the app. `_previous` is only deleted after a successful run; otherwise
it is kept as `_previous-<timestamp>`. Manual restore: close HCLoader, delete the half-updated folders
(`app`, `ui`, `scripts`) and move the ones from `_previous` back.

## Checklist

- [ ] `__version__` bumped, CHANGELOG section written
- [ ] CI green on `main`
- [ ] tag `vX.Y.Z` pushed, `Portable` workflow green (both jobs)
- [ ] release shows four assets: `HCLoader-Setup-X.Y.Z.exe`, portable ZIP, source ZIP, `SHA256SUMS`
- [ ] the setup installs on a clean Windows user (SmartScreen "More info" › "Run anyway"), starts, and
      uninstalls without touching `%APPDATA%\HCLoader`
- [ ] an older install offers the update (Settings › Wartung › App-Update › "Jetzt prüfen")
