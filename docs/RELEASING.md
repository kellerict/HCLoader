# Releasing HCLoader

Installed copies (installer, portable ZIP and ZIP-based venv installs) update themselves from GitHub releases
(`app/core/selfupdate.py`, design in `docs/decisions.md` "Selbst-Update"). A release is nothing more
than a Git tag `vX.Y.Z` plus a GitHub release; the workflow `.github/workflows/portable.yml` builds and
attaches the assets.

## Steps (automatic release from `main`)

1. On a branch: **bump the version** in `app/__init__.py` (`__version__ = "X.Y.Z"`, SemVer). This is
   the only place; `pyproject.toml` and `build_portable.ps1` read it.
2. **Changelog:** move the entries under `## [Unreleased]` in `CHANGELOG.md` into a new section
   `## [X.Y.Z] - YYYY-MM-DD`. The release notes and the self-update show this text.
   **The section starts with `### Highlights`** – see "Writing release notes" below.
3. Commit (`chore: release vX.Y.Z`), open a PR, wait for **green CI** (`ci.yml`, `portable.yml`).
4. **Merge to `main`** (Claude prepares, the user gives the go). That's all - the push to `main`
   runs the `Portable` workflow:
   - job `plan` (read-only) reads `__version__`; a release is due if there is **no tag `vX.Y.Z`**
     yet **and** `CHANGELOG.md` has a section `## [X.Y.Z]`. Without the section nothing happens
     (a notice in the run), so ordinary pushes to `main` never release;
   - job `portable` builds the portable ZIP and the installer and smoke-tests both on Windows;
   - only if both succeed, job `release` (the only job with `contents: write`)
     - creates the lightweight tag `vX.Y.Z` on the pushed commit (`GITHUB_SHA`, via the REST API;
       a tag that already points to that commit is fine, one on another commit fails the job),
     - creates the GitHub release: title `HCLoader X.Y.Z`, notes = the CHANGELOG section plus the
       code signing policy link; a version with `-` (`0.4.0-rc1`) becomes a **pre-release**, which
       the updater ignores,
     - uploads `HCLoader-Setup-X.Y.Z.exe`, `HCLoader-portable-X.Y.Z-win64.zip`,
       `HCLoader-X.Y.Z-source.zip` (`git archive` of the commit) and `SHA256SUMS` over all of them
       (`gh release upload --clobber`).

   A tag created with `GITHUB_TOKEN` starts no further workflow run, so everything above happens in
   this one run. If the build or a smoke test fails, no tag and no release are created; fix it on a
   branch and merge again (the version still has no tag, so the next push to `main` releases it).
5. Optionally edit the release notes on GitHub. The newest non-pre-release is marked "latest".

### Manual paths (still supported)

- **Push a tag** `vX.Y.Z` yourself (`git tag vX.Y.Z && git push origin vX.Y.Z`), or create the
  release in the GitHub UI ("Draft a new release" → new tag; publishing pushes the tag): the workflow
  runs on the tag, checks that it matches `__version__`, creates the release if it does not exist
  (a release you created is kept) and attaches the assets. Drafts are never offered to users.
- **Re-run for a tag:** "Run workflow" (`workflow_dispatch`) on the tag `vX.Y.Z` builds again and
  re-uploads the assets (`--clobber`). `workflow_dispatch` on a branch never releases.

## Writing release notes

The CHANGELOG section becomes the GitHub release text, and the app shows it in the update dialog
(«Changes»). Users read it in a small dialog, so keep it short and structured (English):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Highlights
- One line per point, what the user gets – no prose, no implementation details
- 3 to 8 bullets

### Added
- Details, one bullet per change …

### Changed
### Fixed
```

- **`### Highlights` comes first**, with 3 to 8 one-line bullets. The dialog shows only this list
  (at most 8 bullets, each cut after three lines); everything else appears after «Show all changes».
  Without a Highlights heading the app falls back to the first list of the section.
- No introductory paragraph, no running text. Use `### Added` / `### Changed` / `### Fixed` below.
- The dialog renders a small Markdown subset: headings, bullet and numbered lists (nested), `**bold**`,
  `*italic*`, `` `code` ``, tables, `>` quotes, `---` and `https://` links. Raw HTML is shown as text;
  images and other link schemes are dropped. Tables are fine for before/after values (keep them to
  three or four narrow columns).
- Check the result in the mock: `ui/index.html?mock=1`, banner › «Changes»
  (`python scripts/ui_screenshots.py --only update-notes update-notes-all`).

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

- [ ] `__version__` bumped, CHANGELOG section `## [X.Y.Z]` written (on a branch), starting with
      `### Highlights` (3 to 8 one-line bullets)
- [ ] CI green on the PR, merged to `main`
- [ ] `Portable` workflow on `main` green (jobs `plan`, `portable`, `release`), tag `vX.Y.Z` created
- [ ] release shows four assets: `HCLoader-Setup-X.Y.Z.exe`, portable ZIP, source ZIP, `SHA256SUMS`
- [ ] the setup installs on a clean Windows user (SmartScreen "More info" › "Run anyway"), starts, and
      uninstalls without touching `%APPDATA%\HCLoader`
- [ ] an older install offers the update (Settings › Wartung › App-Update › "Jetzt prüfen")
