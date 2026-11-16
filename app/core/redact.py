"""Mask secrets in texts that reach the log or the UI (Review Phase 3 n4).

`network.proxy` may contain credentials (`http://user:pass@host:port`). yt-dlp and urllib
repeat the proxy URL in error messages, so every error text shown to the user or written to
the log goes through `redact()`. Logging handlers use `RedactingFormatter`.
"""

from __future__ import annotations

import logging
import re

# scheme://userinfo@  (userinfo without '/', whitespace or '@'), e.g. socks5://u:p@host
# R2-n3: greedy up to the LAST '@' before the host, so an unencoded '@' in the password is masked
_USERINFO_RE = re.compile(r"(\b[a-z][a-z0-9+.\-]*://)[^/\s'\"<>]+@", re.I)
# proxy without scheme: user:pass@host:port / user:pass@host.tld (needs a ':' in the userinfo, so
# plain e-mail addresses stay untouched)
_BARE_RE = re.compile(
    r"(?<![\w/.@:+-])[^\s/@:'\"<>]+:[^\s/'\"<>]+@(?=[\w-]+(?::\d+|\.[\w-]+))", re.I
)
MASK = "***"


def redact(text: object) -> str:
    """`text` with credentials in URLs replaced by `***` (`http://***@proxy:8080`)."""
    out = _USERINFO_RE.sub(rf"\1{MASK}@", str(text if text is not None else ""))
    return _BARE_RE.sub(f"{MASK}@", out)


class RedactingFormatter(logging.Formatter):
    """Formatter that masks URL credentials in the whole formatted record (incl. tracebacks)."""

    def format(self, record: logging.LogRecord) -> str:
        return redact(super().format(record))
