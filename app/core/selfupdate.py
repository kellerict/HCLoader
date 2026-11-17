"""Self-update of HCLoader itself from GitHub releases (docs/decisions.md "Selbst-Update").

Flow: `check()` (once per GUI start, or manually) asks the GitHub API for the newest release
(fallback: tags). `download()` fetches the source ZIP of that tag, verifies it and prepares a
staging tree under `<app_home>/update/staging/` plus `manifest.json`. Nothing in the app folder
changes while HCLoader runs. `launch()` starts `scripts/apply_update.ps1` hidden; it waits for the
app process to end, swaps the program folders (`app/`, `ui/`, `scripts/`, top-level files) with
rollback via `_previous/`, runs pip / fetch_binaries.ps1 only if needed, writes
`<app_home>/update/result.json` and restarts the app.

Never touched: `data/` (settings, DB, archive, logs, cache), `portable.txt`, the music folder,
`python/`, `.venv/`, `bin/` (except the bgutil provider via fetch_binaries.ps1 when needed).

Not YouTube traffic -> no Throttle. Unauthenticated, 5 s timeout for the check. HTTP, clock,
platform and process start are injectable for tests (no network in tests).
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import sysconfig
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any

from . import config, locks
from .i18n import tr

log = logging.getLogger(__name__)

DEFAULT_REPO = config.DEFAULT_UPDATE_REPO
API_LATEST = "https://api.github.com/repos/{repo}/releases/latest"
API_TAGS = "https://api.github.com/repos/{repo}/tags?per_page=100"
# release list (newest first) for the notes of skipped versions: one request per check
API_RELEASES = "https://api.github.com/repos/{repo}/releases?per_page={n}"
RELEASES_PER_PAGE = 20
MAX_RELEASES = 20  # versions listed in `status()["releases"]`
CODELOAD_ZIP = "https://codeload.github.com/{repo}/zip/refs/tags/{tag}"
RAW_CHANGELOG = "https://raw.githubusercontent.com/{repo}/{tag}/CHANGELOG.md"
CHECK_TIMEOUT_S = 5.0
DOWNLOAD_TIMEOUT_S = 30.0
USER_AGENT = "HCLoader-Updater"
MAX_ZIP_BYTES = 200 * 1024 * 1024  # a source ZIP is a few MB; guards against garbage
MAX_UNPACKED_BYTES = 400 * 1024 * 1024
SUMS_ASSETS = ("SHA256SUMS", "SHA256SUMS.txt")
SOURCE_ASSET = "HCLoader-{version}-source.zip"  # optional release asset (portable.yml)
LOCK_STALE_S = 30 * 60
JOURNAL = "in_progress.json"  # written by apply_update.ps1 before the first change (m2)
# Review m6: every URL the updater opens (also after redirects) - https and GitHub only
ALLOWED_HOSTS = frozenset(
    {
        "api.github.com",
        "github.com",
        "codeload.github.com",
        "objects.githubusercontent.com",
        "release-assets.githubusercontent.com",
        "raw.githubusercontent.com",  # CHANGELOG.md of a tag (notes without a release)
    }
)
PROGRESS_INTERVAL_S = 0.25

# What the update replaces: program folders and top-level files. Everything else stays.
PROGRAM_DIRS = ("app", "ui", "scripts")
PROGRAM_FILES = (
    "config.example.yaml",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "requirements.txt",
    "pyproject.toml",
)
# portable starters (copied from scripts/portable/ with CRLF + ASCII, like build_portable.ps1)
PORTABLE_STARTERS = (
    "HCLoader.cmd",
    "HCLoader.vbs",
    "HCLoader-Konsole.cmd",
    "Verknuepfung-erstellen.cmd",
)
# never moved, replaced or deleted by the updater (apply_update.ps1 checks the same list)
PROTECTED = (
    "data",
    "portable.txt",
    "python",
    ".venv",
    "bin",
    "licenses",
    ".git",
    "_previous",
    "update",
)
STATES = ("idle", "checking", "downloading", "ready", "applying", "error")

# message keys (app/locales)
RUN_ACTIVE = "update.run_active"
GIT_HINT = "update.git_hint"
WINDOWS_ONLY = "update.windows_only"

_SEMVER_RE = re.compile(
    r"^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$"
)


class UpdateError(Exception):
    """German message for the user."""


class UpdateCancelled(Exception):
    pass


# --------------------------------------------------------------------------- versions


def parse_version(text: str | None) -> tuple[int, int, int] | None:
    """`v0.3.1` / `0.3.1` -> (0, 3, 1). Pre-releases (`-rc1`) and anything else -> None."""
    m = _SEMVER_RE.match((text or "").strip())
    if not m or m.group(4):
        return None
    return int(m.group(1)), int(m.group(2)), int(m.group(3))


def is_prerelease(text: str | None) -> bool:
    m = _SEMVER_RE.match((text or "").strip())
    return bool(m and m.group(4))


def is_newer(latest: str | None, current: str | None) -> bool:
    a, b = parse_version(latest), parse_version(current)
    if a is None:
        return False
    return b is None or a > b


def version_from_init(text: str) -> str | None:
    m = re.search(r'^__version__\s*=\s*["\']([^"\']+)["\']', text, re.M)
    return m.group(1) if m else None


def min_python(pyproject_text: str) -> tuple[int, int] | None:
    """`requires-python = ">=3.13"` -> (3, 13)."""
    m = re.search(r'^requires-python\s*=\s*["\']\s*>=\s*(\d+)\.(\d+)', pyproject_text, re.M)
    return (int(m.group(1)), int(m.group(2))) if m else None


def changelog_section(text: str, version: str) -> str:
    """The `## [x.y.z]` (or `## x.y.z` / `## vx.y.z`) section of a Keep-a-Changelog file."""
    v = re.escape(version.lstrip("v"))
    head = re.compile(rf"^##[ \t]*\[?v?{v}\]?(?:[ \t]|$).*$", re.M)
    m = head.search(text or "")
    if not m:
        return ""
    rest = text[m.end() :]
    nxt = re.search(r"^##\s", rest, re.M)
    return rest[: nxt.start() if nxt else len(rest)].strip()


_CHANGELOG_HEAD_RE = re.compile(
    r"^##[ \t]*\[?v?(\d+\.\d+\.\d+)(?![\w.+-])\]?"
    r"(?:[ \t]*[-\u2013\u2014][ \t]*(\d{4}-\d{2}-\d{2}))?.*$",
    re.M,
)


def changelog_releases(
    text: str,
    *,
    newer_than: str | None,
    up_to: str | None,
    limit: int | None = MAX_RELEASES,
) -> list[dict[str, Any]]:
    """All `## [x.y.z] - YYYY-MM-DD` sections with `newer_than` < version <= `up_to`, newest
    first: [{version, published, notes, url: ""}]. `[Unreleased]` and pre-releases are skipped."""
    heads = list(_CHANGELOG_HEAD_RE.finditer(text or ""))
    starts = [m.start() for m in re.finditer(r"^##\s", text or "", re.M)]
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for m in heads:
        ver = m.group(1)
        v = parse_version(ver)
        if v is None or ver in seen:
            continue
        if newer_than is not None and not is_newer(ver, newer_than):
            continue
        if up_to is not None and is_newer(ver, up_to):
            continue
        end = next((p for p in starts if p > m.start()), len(text))
        seen.add(ver)
        out.append(
            {
                "version": ver,
                "published": m.group(2),
                "notes": text[m.end() : end].strip(),
                "url": "",
            }
        )
    out.sort(key=lambda r: parse_version(r["version"]) or (0, 0, 0), reverse=True)
    return out if limit is None else out[:limit]


MAX_LOCAL_CHANGELOG_BYTES = 2_000_000


def local_release_notes(root: Path) -> list[dict[str, Any]]:
    """Release history from the CHANGELOG.md shipped with the app (offline): every
    `## [x.y.z]` section, newest first, as [{version, date, notes}]. `[Unreleased]` is skipped;
    a missing or unreadable file gives []."""
    try:
        with (root / "CHANGELOG.md").open("rb") as fh:
            text = fh.read(MAX_LOCAL_CHANGELOG_BYTES).decode("utf-8", errors="replace")
    except OSError:
        return []
    return [
        {"version": r["version"], "date": r["published"], "notes": r["notes"]}
        for r in changelog_releases(text, newer_than=None, up_to=None, limit=None)
    ]


def normalize_requirements(text: str) -> list[str]:
    out = []
    for line in (text or "").splitlines():
        line = line.split("#", 1)[0].strip()
        if line:
            out.append(re.sub(r"\s+", "", line).lower())
    return sorted(out)


def requirements_changed(old_text: str | None, new_text: str | None) -> bool:
    return normalize_requirements(old_text or "") != normalize_requirements(new_text or "")


def is_git_checkout(root: Path) -> bool:
    return (root / ".git").exists()


def is_installed_copy(root: Path) -> bool:
    """App folder of the installer (installer/HCLoader.iss): the embedded Python of the
    portable build (`python/python3xx._pth`), but no `portable.txt` and no `.git`."""
    if config.is_portable(root) or is_git_checkout(root):
        return False
    try:
        return any(p.is_file() for p in (root / "python").glob("python*._pth"))
    except OSError:
        return False


# --------------------------------------------------------------------------- GitHub


def check_url(url: str) -> str:
    """Review m6: only `https://` on a GitHub host (ALLOWED_HOSTS). `browser_download_url`
    comes from the API answer; urllib would also open `file:` or `ftp:` URLs."""
    parts = urllib.parse.urlsplit(str(url or ""))
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or host not in ALLOWED_HOSTS or parts.username or parts.password:
        raise UpdateError(tr("update.bad_url", url=str(url)[:120]))
    return url


# Links in the release notes (Api.open_url): only these hosts open in the system browser
LINK_HOSTS = frozenset({"github.com"})


def link_hosts(repo: str | None) -> frozenset[str]:
    """github.com plus the host of the configured update repo (`owner/repo` lives on
    github.com; a full `https://host/owner/repo` adds its host)."""
    hosts = set(LINK_HOSTS)
    text = str(repo or "").strip()
    if "://" in text:
        host = (urllib.parse.urlsplit(text).hostname or "").lower()
        if host:
            hosts.add(host)
    return frozenset(hosts)


def external_link(url: Any, repo: str | None) -> str | None:
    """`url` if it may open in the system browser: `https://`, no credentials, no port, host
    in `link_hosts(repo)`, no control characters; else None."""
    text = str(url or "")
    if not text or len(text) > 2000 or any(ord(c) < 33 or c in '"<>\\^`{|}' for c in text):
        return None
    try:
        parts = urllib.parse.urlsplit(text)
        port = parts.port
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if (
        parts.scheme != "https"
        or parts.username
        or parts.password
        or port is not None
        or host not in link_hosts(repo)
    ):
        return None
    return text


def open_link(url: Any, repo: str | None, browser: Callable[[str], Any]) -> dict[str, Any]:
    """Open an allowed link (`external_link`) with `browser` (webbrowser.open: the system
    browser, on Windows via os.startfile). {ok} | {ok:false, error}."""
    target = external_link(url, repo)
    if target is None:
        msg = tr("update.link_not_allowed", url=str(url or "")[:120])
        log.warning("%s", msg)
        return {"ok": False, "error": msg}
    try:
        browser(target)
    except Exception as exc:
        log.warning("Browser could not be started: %s", exc)
        return {"ok": False, "error": str(exc) or exc.__class__.__name__}
    return {"ok": True}


class _CheckedRedirects(urllib.request.HTTPRedirectHandler):
    """GitHub answers asset downloads with a redirect (objects/release-assets host); every
    hop must pass `check_url` as well."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[no-untyped-def]
        check_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_OPENER = urllib.request.build_opener(_CheckedRedirects())


def _default_open(req: urllib.request.Request, timeout: float) -> Any:
    check_url(req.full_url)
    return _OPENER.open(req, timeout=timeout)


Opener = Callable[[urllib.request.Request, float], Any]


def _request(url: str, accept: str = "application/vnd.github+json") -> urllib.request.Request:
    check_url(url)
    return urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": accept,
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )


def _get_json(url: str, opener: Opener, timeout: float) -> Any:
    with opener(_request(url), timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _get_text(url: str, opener: Opener, timeout: float, limit: int = 2_000_000) -> str:
    with opener(_request(url, "text/plain, */*"), timeout) as resp:
        return resp.read(limit).decode("utf-8", errors="replace")


@dataclass
class Release:
    version: str
    tag: str
    notes: str = ""
    url: str = ""  # html page of the release / tag
    zip_url: str = ""
    zip_name: str = ""
    sums_url: str | None = None
    source: str = "release"  # "release" | "tags"
    published: str | None = None  # ISO date (release: published_at, tags: CHANGELOG heading)
    # versions > the installed one up to this release, newest first (UpdateStatus.releases)
    releases: list[dict[str, Any]] = field(default_factory=list)

    def entry(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "published": self.published,
            "notes": self.notes,
            "url": self.url,
        }


def _release_from_api(data: dict[str, Any], repo: str) -> Release | None:
    if not isinstance(data, dict) or data.get("draft") or data.get("prerelease"):
        return None
    tag = str(data.get("tag_name") or "")
    version = parse_version(tag)
    if version is None:
        return None
    ver = ".".join(map(str, version))
    assets = {
        str(a.get("name")): str(a.get("browser_download_url") or "")
        for a in data.get("assets") or []
        if isinstance(a, dict)
    }
    sums = next((assets[n] for n in SUMS_ASSETS if assets.get(n)), None)
    src_name = SOURCE_ASSET.format(version=ver)
    if assets.get(src_name):
        zip_url, zip_name = assets[src_name], src_name
    else:
        zip_url = CODELOAD_ZIP.format(repo=repo, tag=tag)
        zip_name = f"{repo.split('/')[-1]}-{ver}.zip"  # name of the codeload download
    return Release(
        version=ver,
        tag=tag,
        notes=str(data.get("body") or "").strip(),
        url=str(data.get("html_url") or f"https://github.com/{repo}/releases/tag/{tag}"),
        zip_url=zip_url,
        zip_name=zip_name,
        sums_url=sums,
        source="release",
        published=_iso_date(data.get("published_at")),
    )


def _iso_date(value: Any) -> str | None:
    """`2026-11-17T08:00:00Z` -> `2026-11-17` (None if it is not such a timestamp)."""
    m = re.match(r"^(\d{4}-\d{2}-\d{2})(?:[T ].*)?$", str(value or "").strip())
    return m.group(1) if m else None


def _latest_from_tags(
    repo: str, opener: Opener, timeout: float, current: str | None = None
) -> Release | None:
    data = _get_json(API_TAGS.format(repo=repo), opener, timeout)
    best: tuple[tuple[int, int, int], str] | None = None
    for item in data if isinstance(data, list) else []:
        name = str((item or {}).get("name") or "")
        v = parse_version(name)
        if v is not None and (best is None or v > best[0]):
            best = (v, name)
    if best is None:
        return None
    ver = ".".join(map(str, best[0]))
    tag = best[1]
    notes = ""
    sections: list[dict[str, Any]] = []
    try:
        text = _get_text(RAW_CHANGELOG.format(repo=repo, tag=tag), opener, timeout)
        notes = changelog_section(text, ver)
        sections = changelog_releases(text, newer_than=current, up_to=ver)
    except Exception as exc:  # notes are optional
        log.debug("CHANGELOG of %s not readable: %s", tag, exc)
    rel = Release(
        version=ver,
        tag=tag,
        notes=notes,
        url=f"https://github.com/{repo}/releases/tag/{tag}",
        zip_url=CODELOAD_ZIP.format(repo=repo, tag=tag),
        zip_name=f"{repo.split('/')[-1]}-{ver}.zip",
        source="tags",
    )
    own = next((r for r in sections if r["version"] == ver), None)
    if own:
        rel.published = own["published"]
    for r in sections:  # tags have no release page: link the tag
        r["url"] = f"https://github.com/{repo}/releases/tag/v{r['version']}"
    rel.releases = sections
    return rel


def releases_between(
    data: Any, repo: str, *, newer_than: str | None, up_to: str
) -> list[dict[str, Any]]:
    """Entries of a `GET /releases` answer with `newer_than` < version <= `up_to`, newest
    first. Drafts and pre-releases are skipped (the updater only offers stable releases)."""
    out: dict[str, dict[str, Any]] = {}
    for item in data if isinstance(data, list) else []:
        rel = _release_from_api(item, repo)
        if rel is None or is_newer(rel.version, up_to):
            continue
        if newer_than is not None and not is_newer(rel.version, newer_than):
            continue
        out.setdefault(rel.version, rel.entry())
    ordered = sorted(out.values(), key=lambda r: parse_version(r["version"]), reverse=True)
    return ordered[:MAX_RELEASES]


def fill_releases(
    rel: Release,
    repo: str,
    current: str | None,
    *,
    opener: Opener = _default_open,
    timeout: float = CHECK_TIMEOUT_S,
) -> None:
    """Set `rel.releases` (all versions newer than `current` up to `rel`) from ONE request to
    the release list. Fail-safe: on any error, or if the offered release is missing from the
    list, only the offered release itself is listed."""
    if rel.releases:  # tags path: already filled from the CHANGELOG
        return
    rel.releases = [rel.entry()]
    if rel.source != "release" or not is_newer(rel.version, current):
        return
    try:
        data = _get_json(API_RELEASES.format(repo=repo, n=RELEASES_PER_PAGE), opener, timeout)
    except Exception as exc:
        log.debug("Release list not readable: %s", exc)
        return
    found = releases_between(data, repo, newer_than=current, up_to=rel.version)
    if found and found[0]["version"] == rel.version:
        found[0] = rel.entry()  # same data as `releases/latest`
        rel.releases = found


def find_latest(
    repo: str,
    *,
    opener: Opener = _default_open,
    timeout: float = CHECK_TIMEOUT_S,
    current: str | None = None,
) -> Release | None:
    """Newest stable release of `repo` (`releases/latest`, which already skips drafts and
    pre-releases), else the highest SemVer tag. Network errors propagate (caller logs them).
    `current`: installed version; on the tags path the CHANGELOG sections of all newer
    versions become `Release.releases`."""
    try:
        rel = _release_from_api(_get_json(API_LATEST.format(repo=repo), opener, timeout), repo)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:  # 404 = no release yet -> tags
            raise
        rel = None
    if rel is not None:
        return rel
    return _latest_from_tags(repo, opener, timeout, current)


# --------------------------------------------------------------------------- download / verify


def download(
    url: str,
    dest: Path,
    *,
    opener: Opener = _default_open,
    on_progress: Callable[[int, int], None] | None = None,
    cancel: threading.Event | None = None,
    timeout: float = DOWNLOAD_TIMEOUT_S,
    max_bytes: int = MAX_ZIP_BYTES,
    chunk: int = 64 * 1024,
) -> Path:
    """Stream `url` to `dest` (via `<dest>.part`). total = 0 if the server sends no length
    (codeload streams source ZIPs without Content-Length)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_name(dest.name + ".part")
    done = 0
    try:
        with (
            opener(_request(url, "application/octet-stream"), timeout) as resp,
            part.open("wb") as fh,
        ):
            try:
                total = int(resp.headers.get("Content-Length") or 0)
            except (AttributeError, TypeError, ValueError):
                total = 0
            if total > max_bytes:
                raise UpdateError(tr("update.too_big", n=total))
            if on_progress:
                on_progress(0, total)
            while True:
                if cancel is not None and cancel.is_set():
                    raise UpdateCancelled()
                buf = resp.read(chunk)
                if not buf:
                    break
                fh.write(buf)
                done += len(buf)
                if done > max_bytes:
                    raise UpdateError(tr("update.too_big_aborted"))
                if on_progress:
                    on_progress(done, total)
        if total and done != total:
            raise UpdateError(tr("update.incomplete", got=done, total=total))
        part.replace(dest)
    except BaseException:
        part.unlink(missing_ok=True)
        raise
    return dest


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for buf in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(buf)
    return h.hexdigest()


def parse_sums(text: str) -> dict[str, str]:
    """`<sha256>  <name>` / `<sha256> *<name>` lines -> {name: sha256}."""
    out = {}
    for line in (text or "").splitlines():
        m = re.match(r"^\s*([0-9a-fA-F]{64})\s+\*?(.+?)\s*$", line)
        if m:
            out[m.group(2).split("/")[-1]] = m.group(1).lower()
    return out


def _is_symlink(info: zipfile.ZipInfo) -> bool:
    return (info.external_attr >> 16) & 0o170000 == 0o120000


def _safe_parts(name: str) -> tuple[str, ...] | None:
    name = name.replace("\\", "/")
    if name.startswith("/") or re.match(r"^[A-Za-z]:", name):
        return None
    parts = PurePosixPath(name).parts
    if any(p in ("..", "") or ":" in p for p in parts):
        return None
    return parts


def zip_prefix(zf: zipfile.ZipFile) -> str:
    """Top folder of the source tree (`HCLoader-0.3.0/`, `owner-repo-<sha>/`, or '')."""
    for info in zf.infolist():
        n = info.filename.replace("\\", "/")
        if n == "app/__init__.py":
            return ""
        parts = n.split("/")
        if len(parts) == 3 and parts[1:] == ["app", "__init__.py"]:
            return parts[0] + "/"
    raise UpdateError(tr("update.no_source"))


def verify_zip(path: Path) -> str:
    """ZIP integrity (CRC of every member), no unsafe paths, the app is inside.
    Returns the top-folder prefix."""
    try:
        with zipfile.ZipFile(path) as zf:
            bad = zf.testzip()
            if bad is not None:
                raise UpdateError(tr("update.zip_damaged", error=bad))
            for info in zf.infolist():
                if _safe_parts(info.filename) is None:
                    raise UpdateError(tr("update.zip_bad_path", path=info.filename))
            if sum(i.file_size for i in zf.infolist()) > MAX_UNPACKED_BYTES:
                raise UpdateError(tr("update.zip_too_big"))
            prefix = zip_prefix(zf)
            if prefix + "app/main.py" not in zf.namelist():
                raise UpdateError(tr("update.no_main"))
            return prefix
    except zipfile.BadZipFile as exc:
        raise UpdateError(tr("update.not_zip", error=exc)) from exc


def extract_program(zip_path: Path, staging: Path, prefix: str) -> list[str]:
    """Extract only PROGRAM_DIRS / PROGRAM_FILES (no tests, docs, CI) into `staging`.
    Symlinks are skipped. Returns the top-level items found."""
    found: set[str] = set()
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            name = info.filename.replace("\\", "/")
            if not name.startswith(prefix) or info.is_dir() or _is_symlink(info):
                continue
            parts = _safe_parts(name[len(prefix) :])
            if not parts:
                continue
            top = parts[0]
            if not (
                (top in PROGRAM_DIRS and len(parts) > 1)
                or (len(parts) == 1 and top in PROGRAM_FILES)
            ):
                continue
            if "__pycache__" in parts:
                continue
            target = staging.joinpath(*parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            found.add(top)
    return sorted(found)


def _crlf_ascii(src: Path, dst: Path) -> None:
    text = src.read_text(encoding="utf-8", errors="replace")
    text = text.replace("\r\n", "\n").replace("\n", "\r\n")
    dst.write_bytes(text.encode("ascii", errors="replace"))


# --------------------------------------------------------------------------- runtime / staging


@dataclass
class Runtime:
    """How this installation runs: decides pip and the restart command of the updater."""

    mode: str  # "portable" | "installed" | "venv" | "other" (see BUNDLED_MODES)
    python: str  # console interpreter (pip)
    pythonw: str  # windowless interpreter (restart)
    site_packages: str


# Modes with HCLoader's own embedded Python in `<app>/python/` (portable ZIP, installer): pip
# needs the portable flags, starters and links are handled like in build_portable.ps1.
BUNDLED_MODES = ("portable", "installed")


def detect_runtime(root: Path, executable: str | None = None) -> Runtime:
    """`portable` = embedded Python + `portable.txt`; `installed` = embedded Python without the
    marker (Inno Setup installer, data in %APPDATA%); `venv`; `other` (no pip)."""
    from . import maintenance

    exe = Path(executable or sys.executable)
    py = maintenance.venv_python(str(exe))
    w = exe.with_name("pythonw" + exe.suffix)
    pyw = w if w.exists() else exe
    purelib = sysconfig.get_paths().get("purelib", "")
    if maintenance.is_embedded_python(exe, root):
        pydir = root / maintenance.PORTABLE_PYTHON_DIR
        return Runtime(
            "portable" if config.is_portable(root) else "installed",
            str(pydir / "python.exe"),
            str(pydir / "pythonw.exe"),
            str(pydir / "Lib" / "site-packages"),
        )
    if maintenance.in_venv():
        return Runtime("venv", str(py), str(pyw), purelib)
    return Runtime("other", str(py), str(pyw), purelib)


def pip_args(runtime: Runtime, root: Path) -> list[str]:
    from . import maintenance

    flags = list(maintenance.PORTABLE_PIP_FLAGS) if runtime.mode in BUNDLED_MODES else []
    return [
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        *flags,
        "-r",
        str(root / "requirements.txt"),
    ]


def _read(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return None


def _file_hash(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError:
        return None


def prepare_staging(
    zip_path: Path,
    update_dir: Path,
    *,
    root: Path,
    current: str,
    expected: str,
    runtime: Runtime,
    data_dir: Path,
    logs_dir: Path,
    notes: str = "",
    url: str = "",
    python_version: tuple[int, int] = sys.version_info[:2],
) -> dict[str, Any]:
    """Unpack the program part of `zip_path` into `<update_dir>/staging`, compare with the
    installed version and write `<update_dir>/manifest.json` for apply_update.ps1."""
    prefix = verify_zip(zip_path)
    staging = update_dir / "staging"
    remove_tree(staging)
    staging.mkdir(parents=True)
    found = extract_program(zip_path, staging, prefix)
    for need in ("app", "ui", "scripts"):
        if need not in found:
            raise UpdateError(tr("update.missing_dir", dir=need))
    if not (staging / "scripts" / "apply_update.ps1").is_file():
        raise UpdateError(tr("update.no_script"))
    staged_version = version_from_init(_read(staging / "app" / "__init__.py") or "")
    if staged_version != expected:
        raise UpdateError(
            tr("update.version_mismatch", package=staged_version or "?", release=expected)
        )
    need_py = min_python(_read(staging / "pyproject.toml") or "")
    if need_py and tuple(python_version) < need_py:
        want = ".".join(map(str, need_py))
        if runtime.mode == "portable":
            raise UpdateError(tr("update.python_portable", version=expected, python=want))
        if runtime.mode == "installed":
            raise UpdateError(
                tr("update.python_installer", version=expected, python=want, setup=expected)
            )
        raise UpdateError(tr("update.python_venv", version=expected, python=want, python2=want))
    req_changed = requirements_changed(
        _read(root / "requirements.txt"), _read(staging / "requirements.txt")
    )
    if req_changed and runtime.mode == "other":
        raise UpdateError(tr("update.new_requirements"))
    fetch = Path("scripts") / "fetch_binaries.ps1"
    bin_changed = req_changed or _file_hash(root / fetch) != _file_hash(staging / fetch)
    items = [i for i in (*PROGRAM_DIRS, *PROGRAM_FILES) if (staging / i).exists()]
    if runtime.mode in BUNDLED_MODES:
        for name in PORTABLE_STARTERS:
            src = staging / "scripts" / "portable" / name
            if src.is_file():
                _crlf_ascii(src, staging / name)
                items.append(name)
    assert not set(items) & set(PROTECTED)
    manifest = {
        "format": 1,
        "from_version": current,
        "to_version": expected,
        "notes": notes,
        "url": url,
        "app_root": str(root),
        "update_dir": str(update_dir),
        "staging": str(staging),
        "data_dir": str(data_dir),
        "items": items,
        "protected": list(PROTECTED),
        "mode": runtime.mode,
        "python": runtime.python,
        "pythonw": runtime.pythonw,
        "site_packages": runtime.site_packages,
        "requirements_changed": req_changed,
        "pip_args": pip_args(runtime, root),
        "binaries_changed": bin_changed,
        "bin_dir": str(root / "bin"),
        "materialize_links": runtime.mode in BUNDLED_MODES,
        "log": str(logs_dir / "update.log"),
        "result": str(update_dir / "result.json"),
        "lock": str(update_dir / "update.lock"),
        "journal": str(update_dir / JOURNAL),
        "run_lock_mutexes": locks.mutex_names(locks.RUN_LOCK),
        "created": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    _write_manifest(update_dir, manifest)
    return manifest


def long_path(path: Path) -> Path:
    """Windows extended-length form (no MAX_PATH limit, Review n5: `_previous` holds
    site-packages and node_modules of the provider); no-op elsewhere."""
    if os.name != "nt":
        return path
    text = os.path.abspath(str(path))
    if text.startswith("\\\\?\\"):
        return Path(text)
    if text.startswith("\\\\"):
        return Path("\\\\?\\UNC\\" + text[2:])
    return Path("\\\\?\\" + text)


def remove_tree(path: Path) -> None:
    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(long_path(path), ignore_errors=True)
        if path.exists():
            log.warning("Folder not completely deleted: %s", path)
    elif path.exists() or path.is_symlink():
        path.unlink(missing_ok=True)


# --------------------------------------------------------------------------- update lock


def lock_path(update_dir: Path) -> Path:
    return update_dir / "update.lock"


def update_in_progress(update_dir: Path, *, now: float | None = None) -> bool:
    """True while apply_update.ps1 works (lock file younger than LOCK_STALE_S). A stale lock
    (updater crashed) is removed."""
    p = lock_path(update_dir)
    try:
        age = (time.time() if now is None else now) - p.stat().st_mtime
    except OSError:
        return False
    if age < LOCK_STALE_S:
        return True
    p.unlink(missing_ok=True)
    return False


# --------------------------------------------------------------------------- state machine


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


@dataclass
class _State:
    state: str = "idle"
    latest: str | None = None
    notes: str = ""
    url: str | None = None
    published: str | None = None
    releases: list[dict[str, Any]] = field(default_factory=list)
    progress: dict[str, Any] | None = None
    error: str | None = None
    checked: str | None = None
    release: Release | None = None
    manifest: dict[str, Any] | None = None
    result: dict[str, Any] | None = field(default=None)
    verified: bool | None = None  # m6: SHA256SUMS checked (False = release without sums)


class SelfUpdater:
    """Holds the update state; every long method blocks and is meant for a worker thread
    (app/worker.py). `on_change(status)` / `on_progress(data)` feed the UI events."""

    def __init__(
        self,
        *,
        current: str,
        repo: Callable[[], str],
        update_dir: Path,
        root: Path,
        data_dir: Path,
        logs_dir: Path,
        opener: Opener = _default_open,
        on_change: Callable[[dict[str, Any]], None] | None = None,
        on_progress: Callable[[dict[str, Any]], None] | None = None,
        platform: str = sys.platform,
        runtime: Callable[[], Runtime] | None = None,
        popen: Callable[..., Any] = subprocess.Popen,
        pid: Callable[[], int] = os.getpid,
        python_version: tuple[int, int] = sys.version_info[:2],
        run_lock_free: Callable[[], bool] | None = None,
    ) -> None:
        self.current = current
        self._repo = repo
        self.update_dir = update_dir
        self.root = root
        self.data_dir = data_dir
        self.logs_dir = logs_dir
        self._open = opener
        self._on_change = on_change
        self._on_progress = on_progress
        self._platform = platform
        self._runtime = runtime or (lambda: detect_runtime(self.root))
        self._popen = popen
        self._pid = pid
        self._python_version = python_version
        self._run_lock_free = run_lock_free or _probe_run_lock
        self._lock = threading.RLock()
        self._cancel = threading.Event()
        self._s = _State()
        self._last_progress = 0.0

    def bind(
        self,
        on_change: Callable[[dict[str, Any]], None] | None,
        on_progress: Callable[[dict[str, Any]], None] | None,
    ) -> None:
        """Event sinks (Api: events `update` / `update_progress`)."""
        self._on_change = on_change
        self._on_progress = on_progress

    # -- status

    @property
    def git_checkout(self) -> bool:
        return is_git_checkout(self.root)

    @property
    def portable(self) -> bool:
        return config.is_portable(self.root)

    @property
    def installed(self) -> bool:
        """Installed copy (Inno Setup installer): embedded Python, no `portable.txt`."""
        return is_installed_copy(self.root)

    def blocked(self) -> str | None:
        """Why this installation cannot update itself (None = it can)."""
        if self.git_checkout:
            return tr(GIT_HINT)
        if self._platform != "win32":
            return tr(WINDOWS_ONLY)
        return None

    @property
    def state(self) -> str:
        return self._s.state

    def status(self) -> dict[str, Any]:
        with self._lock:
            s = self._s
            return {
                "current": self.current,
                "latest": s.latest,
                "available": is_newer(s.latest, self.current),
                "state": s.state,
                "notes": s.notes,
                "url": s.url,
                "published": s.published,
                # versions > current up to `latest`, newest first (skipped versions included)
                "releases": [
                    dict(r) for r in s.releases if is_newer(r.get("version"), self.current)
                ],
                "progress": dict(s.progress) if s.progress else None,
                "error": s.error,
                "checked": s.checked,
                "portable": self.portable,
                "git_checkout": self.git_checkout,
                "installed": self.installed,
                "blocked": self.blocked(),
                # m6: True = SHA256SUMS matched, False = release without SHA256SUMS (only the
                # ZIP integrity was checked; banner «ohne Prüfsumme»), None = not downloaded
                "verified": s.verified,
                # m7: the configured repo; `foreign_repo` = not the official one (banner)
                "repo": self.repo(),
                "foreign_repo": self.repo().lower() != DEFAULT_REPO.lower(),
            }

    def repo(self) -> str:
        try:
            return str(self._repo() or DEFAULT_REPO)
        except Exception:
            return DEFAULT_REPO

    def _set(self, **fields: Any) -> dict[str, Any]:
        with self._lock:
            for k, v in fields.items():
                setattr(self._s, k, v)
            st = self.status()
        if self._on_change:
            try:
                self._on_change(st)
            except Exception:
                log.debug("update event failed", exc_info=True)
        return st

    def _progress(self, phase: str, done: int, total: int, *, force: bool = False) -> None:
        pct = round(100.0 * done / total, 1) if total else None
        data = {"phase": phase, "pct": pct, "bytes": done, "total": total}
        with self._lock:
            self._s.progress = data
        now = time.monotonic()
        if not force and now - self._last_progress < PROGRESS_INTERVAL_S:
            return
        self._last_progress = now
        if self._on_progress:
            try:
                self._on_progress(data)
            except Exception:
                log.debug("update_progress event failed", exc_info=True)

    # -- start: leftovers of a previous session

    def restore(self) -> dict[str, Any]:
        """At app start: a staged update from an earlier session is `ready` again (if still
        newer than this version and for this folder); otherwise leftovers are removed."""
        manifest_file = self.update_dir / "manifest.json"
        try:
            m = json.loads(manifest_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            m = None
        usable = (
            isinstance(m, dict)
            and is_newer(m.get("to_version"), self.current)
            and os.path.normcase(str(m.get("app_root"))) == os.path.normcase(str(self.root))
            and (self.update_dir / "staging" / "app" / "__init__.py").is_file()
            and self.blocked() is None
        )
        if usable:
            assert isinstance(m, dict)
            return self._set(
                state="ready",
                latest=m["to_version"],
                notes=m.get("notes") or "",
                url=m.get("url") or None,
                published=m.get("published") or None,
                releases=_clean_releases(m.get("releases")),
                manifest=m,
                error=None,
                verified=m.get("verified"),
            )
        self.discard()
        return self.status()

    def take_result(self) -> dict[str, Any] | None:
        """Result of the last apply_update.ps1 run (once): {ok, from_version, to_version,
        error, rolled_back, log}. The staging is dropped; after success also `_previous`."""
        p = self.update_dir / "result.json"
        try:
            res = json.loads(p.read_text(encoding="utf-8-sig"))
        except (OSError, ValueError):
            return None
        try:
            p.replace(self.update_dir / "result.last.json")
        except OSError:
            p.unlink(missing_ok=True)
        if not isinstance(res, dict):
            return None
        if res.get("ok"):
            remove_tree(self.root / "_previous")
        if res.get("unchanged"):
            # M4/m3: nothing was changed (locked file, a headless run, an interrupted earlier
            # run repaired first): the prepared update stays ready for the next exit
            log.info(tr("update.not_applied", reason=res.get("error") or "?"))
        else:
            # after a failure: the same staging would fail again; the next check offers the
            # release anew. `_previous` stays (the updater keeps it unless the last run was ok)
            self.discard()
        with self._lock:
            self._s.result = res
        return res

    def discard(self) -> None:
        """Forget a prepared update (staging, manifest, download)."""
        for name in ("staging", "manifest.json", "download.zip", "download.zip.part"):
            remove_tree(self.update_dir / name)
        with self._lock:
            self._s.manifest = None
            self._s.progress = None

    # -- check

    def check(self, *, manual: bool = False) -> dict[str, Any]:
        """Ask GitHub once. Errors / offline: only the log (automatic check) or `error`
        in the result (manual check); the state stays as it was."""
        with self._lock:
            if self._s.state in ("checking", "downloading", "applying"):
                return {**self.status(), "ok": False, "error": tr("update.running")}
            before = self._s.state
        repo = self.repo()
        self._set(state="checking", error=None if manual else self._s.error)
        try:
            rel = find_latest(repo, opener=self._open, current=self.current)
            if rel is not None:
                fill_releases(rel, repo, self.current, opener=self._open)
        except Exception as exc:
            msg = tr("update.check_failed", error=_reason(exc))
            if manual:
                log.warning("%s", msg)
            else:
                log.info("%s", msg)
            st = self._set(state=before if before != "checking" else "idle")
            return {**st, "ok": False, "error": msg}
        now = _now_iso()
        if rel is None:
            log.info(tr("update.no_release", repo=repo))
            st = self._set(state=before if before == "ready" else "idle", checked=now)
            return {**st, "ok": True}
        keep_ready = before == "ready" and self._s.manifest is not None
        if keep_ready:
            st = self._set(state="ready", checked=now)
        else:
            st = self._set(
                state="idle",
                latest=rel.version,
                notes=rel.notes,
                url=rel.url,
                published=rel.published,
                releases=list(rel.releases),
                release=rel,
                checked=now,
                error=None,
            )
        if st["available"]:
            log.info(tr("update.available", latest=rel.version, current=self.current))
        else:
            log.info(tr("update.current", version=self.current))
        return {**st, "ok": True}

    # -- download + prepare

    def can_download(self) -> str | None:
        """German refusal or None."""
        b = self.blocked()
        if b:
            return b
        with self._lock:
            if self._s.state == "downloading":
                return tr("update.downloading")
            if self._s.state in ("ready", "applying"):
                return tr("update.already_ready")
            if self._s.state == "checking":
                return tr("update.checking")
            rel = self._s.release
        if rel is None or not is_newer(rel.version, self.current):
            return tr("update.none_known")
        return None

    def begin_download(self) -> str | None:
        """Atomically switch to `downloading` (so a second click is refused at once)."""
        with self._lock:
            refusal = self.can_download()
            if refusal:
                return refusal
            self._cancel.clear()
            self._s.state = "downloading"
            self._s.error = None
            self._s.progress = {"phase": "download", "pct": 0.0, "bytes": 0, "total": 0}
        self._set()
        return None

    def download(self) -> dict[str, Any]:
        """Download, verify and stage (blocking; after `begin_download`)."""
        with self._lock:
            rel = self._s.release
            if self._s.state != "downloading":
                refusal = self.begin_download()
                if refusal:
                    return {**self.status(), "ok": False, "error": refusal}
                rel = self._s.release
        assert rel is not None
        self.update_dir.mkdir(parents=True, exist_ok=True)
        zip_path = self.update_dir / "download.zip"
        try:
            log.info(tr("update.loading", version=rel.version, url=rel.zip_url))
            download(
                rel.zip_url,
                zip_path,
                opener=self._open,
                on_progress=lambda d, t: self._progress("download", d, t),
                cancel=self._cancel,
            )
            size = zip_path.stat().st_size
            self._progress("download", size, size, force=True)
            self._progress("verify", 0, 0, force=True)
            verified = self._verify_sums(rel, zip_path)
            if self._cancel.is_set():
                raise UpdateCancelled()
            self._progress("prepare", 0, 0, force=True)
            manifest = prepare_staging(
                zip_path,
                self.update_dir,
                root=self.root,
                current=self.current,
                expected=rel.version,
                runtime=self._runtime(),
                data_dir=self.data_dir,
                logs_dir=self.logs_dir,
                notes=rel.notes,
                url=rel.url,
                python_version=self._python_version,
            )
            if self._cancel.is_set():
                raise UpdateCancelled()
        except UpdateCancelled:
            log.info(tr("update.cancelled"))
            self.discard()
            st = self._set(state="idle", progress=None)
            return {**st, "ok": False, "cancelled": True, "error": "Abgebrochen"}
        except Exception as exc:
            msg = str(exc) if isinstance(exc, UpdateError) else _reason(exc)
            log.error(tr("update.failed", error=msg))
            self.discard()
            st = self._set(state="error", error=msg, progress=None)
            return {**st, "ok": False, "error": msg}
        zip_path.unlink(missing_ok=True)
        manifest["verified"] = verified
        with self._lock:
            manifest["published"] = self._s.published
            manifest["releases"] = list(self._s.releases)
        _write_manifest(self.update_dir, manifest)
        log.info(
            tr(
                "update.ready",
                version=rel.version,
                packages="ja" if manifest["requirements_changed"] else "nein",
                binaries="ja" if manifest["binaries_changed"] else "nein",
            ),
        )
        if not self._s.notes:
            text = _read(self.update_dir / "staging" / "CHANGELOG.md") or ""
            notes = changelog_section(text, rel.version)
            manifest["notes"] = notes
            sections = changelog_releases(text, newer_than=self.current, up_to=rel.version)
            with self._lock:
                self._s.notes = notes
                if sections and not any(r.get("notes") for r in self._s.releases):
                    for r in sections:
                        r["url"] = rel.url if r["version"] == rel.version else ""
                    self._s.releases = sections
                    manifest["releases"] = sections
            _write_manifest(self.update_dir, manifest)
        st = self._set(
            state="ready", manifest=manifest, progress=None, error=None, verified=verified
        )
        return {**st, "ok": True}

    def _verify_sums(self, rel: Release, zip_path: Path) -> bool:
        """SHA256SUMS asset of the release (m6, fail-closed): if the release has one, it must
        be readable, list the downloaded file and match - otherwise the update is refused (the
        release job always attaches it; a gap means an incomplete or tampered release).
        Without SHA256SUMS (tags without a release, older releases) only the ZIP integrity is
        checked; returns False then (banner «ohne Prüfsumme»), True after a matching hash."""
        if not rel.sums_url:
            log.warning(tr("update.no_sums"))
            return False
        try:
            sums = parse_sums(_get_text(rel.sums_url, self._open, DOWNLOAD_TIMEOUT_S))
        except UpdateError:
            raise
        except Exception as exc:
            raise UpdateError(tr("update.sums_unreadable", error=_reason(exc))) from exc
        expected = sums.get(rel.zip_name)
        if not expected:
            raise UpdateError(tr("update.sums_no_entry", file=rel.zip_name))
        actual = sha256_file(zip_path)
        if actual != expected:
            raise UpdateError(
                tr(
                    "update.checksum_mismatch",
                    file=rel.zip_name,
                    expected=expected[:12],
                    got=actual[:12],
                )
            )
        log.info(tr("update.sha_ok", file=rel.zip_name))
        return True

    def cancel(self) -> dict[str, Any]:
        """Stop a running download, or drop a prepared update (it is then not applied)."""
        with self._lock:
            state = self._s.state
        if state == "downloading":
            self._cancel.set()
            return self.status()
        if state in ("ready", "error"):
            self.discard()
            return self._set(state="idle", error=None, progress=None)
        return self.status()

    def stop(self) -> None:
        """App shutdown: abort a download (the worker discards the partial file)."""
        self._cancel.set()

    # -- apply

    def launch(self, *, restart: bool) -> dict[str, Any]:
        """Start apply_update.ps1 hidden; it waits for this process to end. Call only when the
        app is about to exit (after Api.shutdown)."""
        refusal = self.blocked()
        with self._lock:
            m = self._s.manifest
            if refusal is None and (self._s.state != "ready" or not m):
                refusal = tr("update.none_ready")
        if refusal:
            return {"ok": False, "error": refusal}
        assert m is not None
        manifest = self.update_dir / "manifest.json"
        script = self.update_dir / "apply_update.ps1"
        # the installed updater matches the manifest this version writes; the staged one is
        # the fallback for installations that do not ship it yet
        src = self.root / "scripts" / "apply_update.ps1"
        if not src.is_file():
            src = self.update_dir / "staging" / "scripts" / "apply_update.ps1"
        try:
            shutil.copyfile(src, script)
            lock_path(self.update_dir).write_text(
                json.dumps({"pid": self._pid(), "started": _now_iso()}), encoding="utf-8"
            )
        except OSError as exc:
            msg = tr("update.prepare_failed", error=exc)
            log.error("%s", msg)
            self._set(state="error", error=msg)
            return {"ok": False, "error": msg}
        # m3: a headless watchlist run (task scheduler) holds the download-run lock. The update
        # lock above already keeps new runs from starting; a running one is not disturbed: the
        # update stays ready for the next exit (apply_update.ps1 waits for the lock as well).
        if not self._run_lock_free():
            lock_path(self.update_dir).unlink(missing_ok=True)
            msg = tr(RUN_ACTIVE)
            log.warning("%s", msg)
            return {"ok": False, "error": msg, "deferred": True}
        args = updater_command(script, manifest, self._pid(), restart=restart)
        try:
            _start_detached(self._popen, args, cwd=self.update_dir)
        except OSError as exc:
            lock_path(self.update_dir).unlink(missing_ok=True)
            msg = tr("update.start_failed", error=exc)
            log.error("%s", msg)
            self._set(state="error", error=msg)
            return {"ok": False, "error": msg}
        log.warning(
            tr("update.on_exit", version=m.get("to_version"), log=m.get("log")),
        )
        self._set(state="applying")
        return {"ok": True, "args": args}


def _clean_releases(value: Any) -> list[dict[str, Any]]:
    """`releases` from a manifest written by this version (anything else -> [])."""
    out = []
    for r in value if isinstance(value, list) else []:
        if isinstance(r, dict) and parse_version(str(r.get("version") or "")):
            out.append(
                {
                    "version": str(r["version"]),
                    "published": r.get("published") or None,
                    "notes": str(r.get("notes") or ""),
                    "url": str(r.get("url") or ""),
                }
            )
    return out[:MAX_RELEASES]


def _probe_run_lock() -> bool:
    """True if no download run (GUI queue, headless, smoke) holds the run lock right now."""
    lock = locks.acquire_run_lock()
    if lock is None:
        return False
    lock.release()
    return True


SM_SHUTTINGDOWN = 0x2000


def session_ending(platform: str = sys.platform) -> bool:
    """Review m1: Windows is logging off / shutting down (`GetSystemMetrics(SM_SHUTTINGDOWN)`,
    set once WM_QUERYENDSESSION has been sent). The updater must not start then: Windows
    kills it after a few seconds, possibly between the swap and pip."""
    if platform != "win32":
        return False
    try:
        import ctypes

        return bool(ctypes.windll.user32.GetSystemMetrics(SM_SHUTTINGDOWN))  # type: ignore[attr-defined]
    except Exception:
        log.debug("GetSystemMetrics not available", exc_info=True)
        return False


def interrupted(update_dir: Path) -> bool:
    """Review m2: apply_update.ps1 left its journal (crash or kill in the middle of the swap,
    or a failed rollback): the next start must restore from `_previous` first."""
    return (update_dir / JOURNAL).is_file()


def start_recovery(
    update_dir: Path,
    root: Path,
    *,
    restart: bool,
    pid: int = 0,
    popen: Callable[..., Any] = subprocess.Popen,
) -> bool:
    """Start `apply_update.ps1 -Recover` (hidden, detached): it restores the old version from
    `_previous` (or does nothing while the updater that wrote the journal still runs) and,
    with `restart`, starts the app again. True if started."""
    script = update_dir / "apply_update.ps1"
    if not script.is_file():
        script = root / "scripts" / "apply_update.ps1"
    manifest = update_dir / "manifest.json"
    if not script.is_file() or not manifest.is_file():
        log.error(tr("update.recover_impossible", a=script, b=manifest))
        return False
    args = [*updater_command(script, manifest, pid, restart=restart), "-Recover"]
    try:
        _start_detached(popen, args, cwd=update_dir)
    except OSError as exc:
        log.error(tr("update.recover_failed", error=exc))
        return False
    log.warning(tr("update.recover_started", log=script))
    return True


def _write_manifest(update_dir: Path, manifest: dict[str, Any]) -> None:
    tmp = update_dir / "manifest.json.tmp"
    tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(update_dir / "manifest.json")


def powershell_exe() -> str:
    root = os.environ.get("SystemRoot") or os.environ.get("WINDIR") or r"C:\Windows"
    exe = Path(root) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
    return str(exe) if exe.exists() else "powershell.exe"


def updater_command(script: Path, manifest: Path, pid: int, *, restart: bool) -> list[str]:
    args = [
        powershell_exe(),
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-WindowStyle",
        "Hidden",
        "-File",
        str(script),
        "-Manifest",
        str(manifest),
        "-WaitPid",
        str(pid),
    ]
    if restart:
        args.append("-Restart")
    return args


CREATE_NO_WINDOW = 0x08000000
CREATE_NEW_PROCESS_GROUP = 0x00000200
CREATE_BREAKAWAY_FROM_JOB = 0x01000000


def _start_detached(popen: Callable[..., Any], args: list[str], *, cwd: Path) -> Any:
    """Hidden, own process group, outside a kill-on-close job object if allowed (the updater
    must outlive the app). cwd = update folder: no handle on the folders it swaps."""
    base = CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP
    kw = {
        "cwd": str(cwd),
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "close_fds": True,
    }
    try:
        return popen(args, creationflags=base | CREATE_BREAKAWAY_FROM_JOB, **kw)
    except OSError:
        # the job does not allow breakaway -> plain start (Windows keeps it alive anyway
        # unless the job kills on close)
        return popen(args, creationflags=base, **kw)


def _reason(exc: BaseException) -> str:
    if isinstance(exc, urllib.error.HTTPError):
        if exc.code == 403:
            return tr("update.github_limit")
        return f"HTTP {exc.code}"
    if isinstance(exc, urllib.error.URLError):
        return tr("update.no_connection", error=exc.reason)
    if isinstance(exc, TimeoutError):
        return tr("update.timeout")
    return str(exc) or exc.__class__.__name__
