"""v0.9.0: ask the user's Plex or Jellyfin server to scan its library after downloads.

User-configured local/LAN network access - not YouTube, so it does not go through the
`Throttle`, but it is bounded: one batch per debounce window (worker.MediaScanQueue), at most a
few requests per batch, short timeouts, no retries, a capped response size, and the system proxy
is bypassed (the token must not travel through a proxy meant for the internet).

Plex: `GET /library/sections/<id>/refresh?path=<folder>` (partial scan of the new folders; many
folders or no section -> refresh of the section / `sections/all`), token in `X-Plex-Token`.
Jellyfin: `POST /Library/Media/Updated` with the new file paths (path-specific), otherwise
`POST /Items/<library id>/Refresh` or `POST /Library/Refresh`; API key in the `Authorization:
MediaBrowser Token="…"` header. The token/API key comes from core/credentials.py and is never
logged (headers are not logged, URLs carry no token).
"""

from __future__ import annotations

import json
import logging
import ntpath
import posixpath
import ssl
import urllib.error
import urllib.request
from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass, field
from pathlib import Path, PureWindowsPath
from typing import Any
from urllib.parse import quote, urlencode

from .i18n import tr

log = logging.getLogger(__name__)

TIMEOUT_S = 10.0
MAX_RESPONSE = 2 * 1024 * 1024
PLEX_MAX_FOLDERS = 5  # more new folders -> one refresh of the whole section
JELLYFIN_MAX_PATHS = 100
PRODUCT = "HCLoader"
CLIENT_ID = "hcloader-app"
KINDS = ("plex", "jellyfin")


class MediaServerError(RuntimeError):
    """`code`: auth | unreachable | timeout | tls | http | bad_response | config."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(detail or code)
        self.code = code
        self.detail = detail

    def message(self) -> str:
        return tr(f"media.err_{self.code}", detail=self.detail)


@dataclass(frozen=True)
class Request:
    method: str
    url: str
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes | None = None


Transport = Callable[[Request, float, bool], tuple[int, bytes]]


# --------------------------------------------------------------------------- request building


def _version() -> str:
    try:
        from .. import __version__

        return str(__version__)
    except Exception:  # pragma: no cover
        return "0"


def auth_headers(kind: str, secret: str) -> dict[str, str]:
    if kind == "plex":
        return {
            "Accept": "application/json",
            "X-Plex-Token": secret,
            "X-Plex-Product": PRODUCT,
            "X-Plex-Client-Identifier": CLIENT_ID,
            "X-Plex-Version": _version(),
        }
    if kind == "jellyfin":
        if '"' in secret or "," in secret:
            raise MediaServerError("auth")
        return {
            "Accept": "application/json",
            "Authorization": (
                f'MediaBrowser Client="{PRODUCT}", Device="Windows", DeviceId="{CLIENT_ID}", '
                f'Version="{_version()}", Token="{secret}"'
            ),
        }
    raise MediaServerError("config")


def info_request(kind: str, base: str, secret: str) -> Request:
    """Server name/version - also proves that the token is accepted."""
    path = "/" if kind == "plex" else "/System/Info"
    return Request("GET", base.rstrip("/") + path, auth_headers(kind, secret))


def libraries_request(kind: str, base: str, secret: str) -> Request:
    path = "/library/sections" if kind == "plex" else "/Library/VirtualFolders"
    return Request("GET", base.rstrip("/") + path, auth_headers(kind, secret))


def parse_info(kind: str, data: Any) -> dict[str, str]:
    try:
        if kind == "plex":
            mc = data["MediaContainer"]
            return {
                "name": str(mc.get("friendlyName") or "Plex"),
                "version": str(mc.get("version") or ""),
            }
        return {
            "name": str(data.get("ServerName") or "Jellyfin"),
            "version": str(data.get("Version") or ""),
        }
    except (KeyError, TypeError, AttributeError):
        raise MediaServerError("bad_response") from None


def parse_libraries(kind: str, data: Any) -> list[dict[str, Any]]:
    """[{id, name, type, paths, music}] - music libraries first."""
    out: list[dict[str, Any]] = []
    try:
        if kind == "plex":
            for d in data["MediaContainer"].get("Directory") or []:
                out.append(
                    {
                        "id": str(d["key"]),
                        "name": str(d.get("title") or d["key"]),
                        "type": str(d.get("type") or ""),
                        "paths": [
                            str(loc.get("path"))
                            for loc in d.get("Location") or []
                            if loc.get("path")
                        ],
                        "music": d.get("type") == "artist",
                    }
                )
        else:
            for d in data or []:
                out.append(
                    {
                        "id": str(d.get("ItemId") or ""),
                        "name": str(d.get("Name") or ""),
                        "type": str(d.get("CollectionType") or ""),
                        "paths": [str(p) for p in d.get("Locations") or []],
                        "music": d.get("CollectionType") == "music",
                    }
                )
    except (KeyError, TypeError, AttributeError):
        raise MediaServerError("bad_response") from None
    out = [d for d in out if d["id"]]
    out.sort(key=lambda d: (not d["music"], d["name"].casefold()))
    return out


def server_path(local: str | Path, target_dir: str | Path, server_root: str) -> str | None:
    """Path of a downloaded file as the server sees it. `server_root` empty = the same path;
    otherwise the part below the target folder is appended to it (NAS/Docker mounts). None =
    the file is not inside the target folder (then only a full scan helps)."""
    if not server_root:
        return str(local)
    try:
        rel = PureWindowsPath(local).relative_to(PureWindowsPath(target_dir))
    except ValueError:
        try:
            rel = Path(local).relative_to(Path(target_dir))  # type: ignore[assignment]
        except ValueError:
            return None
    parts = [p for p in rel.parts if p not in ("", ".")]
    windows = "\\" in server_root and "/" not in server_root
    join = ntpath.join if windows else posixpath.join
    root = server_root.rstrip("/\\") or server_root[:1]
    return join(root, *parts) if parts else root


def _parent(path: str) -> str:
    windows = "\\" in path and "/" not in path
    return (ntpath if windows else posixpath).dirname(path) or path


def scan_requests(
    kind: str, base: str, secret: str, library: str, paths: Sequence[str | None]
) -> list[Request]:
    """The requests of one scan batch. `paths` = server paths of the new files (None = not
    mappable -> full scan of the library)."""
    base = base.rstrip("/")
    headers = auth_headers(kind, secret)
    known = [p for p in paths if p]
    partial = bool(known) and len(known) == len(paths)
    if kind == "plex":
        if not library:
            return [Request("GET", f"{base}/library/sections/all/refresh", headers)]
        section = f"{base}/library/sections/{quote(library, safe='')}/refresh"
        folders = sorted({_parent(p) for p in known})
        if partial and len(folders) <= PLEX_MAX_FOLDERS:
            return [Request("GET", f"{section}?{urlencode({'path': f})}", headers) for f in folders]
        return [Request("GET", section, headers)]
    if kind == "jellyfin":
        if partial and len(known) <= JELLYFIN_MAX_PATHS:
            body = json.dumps(
                {"Updates": [{"Path": p, "UpdateType": "Created"} for p in sorted(set(known))]}
            ).encode("utf-8")
            return [
                Request(
                    "POST",
                    f"{base}/Library/Media/Updated",
                    {**headers, "Content-Type": "application/json"},
                    body,
                )
            ]
        if library:
            query = urlencode(
                {
                    "Recursive": "true",
                    "MetadataRefreshMode": "Default",
                    "ImageRefreshMode": "Default",
                    "ReplaceAllMetadata": "false",
                    "ReplaceAllImages": "false",
                }
            )
            return [
                Request("POST", f"{base}/Items/{quote(library, safe='')}/Refresh?{query}", headers)
            ]
        return [Request("POST", f"{base}/Library/Refresh", headers)]
    raise MediaServerError("config")


# --------------------------------------------------------------------------- transport


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """A redirect would carry the token headers to wherever it points: refuse it."""

    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


def urllib_transport(req: Request, timeout: float, verify_tls: bool) -> tuple[int, bytes]:
    """Plain urllib, no proxy (LAN), no redirects, capped body."""
    ctx = ssl.create_default_context()
    if not verify_tls:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=ctx),
        _NoRedirect(),
    )
    r = urllib.request.Request(req.url, data=req.body, headers=req.headers, method=req.method)
    try:
        with opener.open(r, timeout=timeout) as resp:
            return int(resp.status), resp.read(MAX_RESPONSE + 1)[:MAX_RESPONSE]
    except urllib.error.HTTPError as exc:
        return int(exc.code), b""
    except urllib.error.URLError as exc:
        reason = exc.reason
        if isinstance(reason, ssl.SSLError):
            raise MediaServerError("tls", type(reason).__name__) from None
        if isinstance(reason, TimeoutError):
            raise MediaServerError("timeout") from None
        raise MediaServerError("unreachable", str(reason)[:120]) from None
    except TimeoutError:
        raise MediaServerError("timeout") from None
    except ssl.SSLError as exc:
        raise MediaServerError("tls", type(exc).__name__) from None
    except OSError as exc:
        raise MediaServerError("unreachable", str(exc)[:120]) from None


def send(
    req: Request, *, transport: Transport, verify_tls: bool, timeout: float = TIMEOUT_S
) -> bytes:
    status, body = transport(req, timeout, verify_tls)
    if status in (401, 403):
        raise MediaServerError("auth")
    if status >= 300 or status < 200:
        raise MediaServerError("http", str(status))
    return body


def _json(body: bytes) -> Any:
    try:
        return json.loads(body.decode("utf-8") or "null")
    except (UnicodeDecodeError, ValueError):
        raise MediaServerError("bad_response") from None


# --------------------------------------------------------------------------- operations


def test_connection(
    kind: str,
    base: str,
    secret: str,
    *,
    verify_tls: bool = True,
    transport: Transport = urllib_transport,
) -> dict[str, Any]:
    """Server name/version + libraries (two requests). Raises MediaServerError."""
    if kind not in KINDS or not base:
        raise MediaServerError("config")
    info = parse_info(
        kind,
        _json(send(info_request(kind, base, secret), transport=transport, verify_tls=verify_tls)),
    )
    libs = parse_libraries(
        kind,
        _json(
            send(libraries_request(kind, base, secret), transport=transport, verify_tls=verify_tls)
        ),
    )
    return {**info, "libraries": libs}


def scan(
    kind: str,
    base: str,
    secret: str,
    library: str,
    paths: Sequence[str | None],
    *,
    verify_tls: bool = True,
    transport: Transport = urllib_transport,
) -> dict[str, Any]:
    """Send one scan batch; stops at the first failure (no retries). -> {requests, partial}."""
    reqs = scan_requests(kind, base, secret, library, paths)
    for req in reqs:
        send(req, transport=transport, verify_tls=verify_tls)
    partial = any("?path=" in r.url or r.url.endswith("/Library/Media/Updated") for r in reqs)
    return {"requests": len(reqs), "partial": partial}


def server_paths(
    files: Iterable[str], target_dir: str | Path, server_root: str
) -> list[str | None]:
    return [server_path(f, target_dir, server_root) for f in files]
