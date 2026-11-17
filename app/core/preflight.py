"""Local preconditions of a download (Review Phase 3 m2), without yt-dlp.

A PO-token server that is not ready or a target folder that is not reachable/writable is a
*local* problem: no YouTube request is made, nothing is counted, and the download queue
blocks (entries stay `queued`, `blocked_code` "pot" / "target") instead of marking every
waiting entry as failed. `YtClient` raises `LocalError`; the queue checks the same
conditions before it starts a run (`worker.local_preflight`).
"""

from __future__ import annotations

from pathlib import Path

from . import paths
from .i18n import tr

# message keys (app/locales)
REST = "queue.rest_stays"
POT_NOT_READY = "queue.pot_not_ready"
POT_GAVE_UP = "queue.pot_gave_up"


class LocalError(RuntimeError):
    """code: 'pot' (PO-token server not ready) | 'target' (target folder not usable)."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


def block_reason(message: str) -> str:
    """Queue wording (`blocked_reason`) for a local block."""
    return f"{message} – {tr(REST)}"


def check_target(target_dir: Path) -> LocalError | None:
    """`<target>/.tmp` can be created and written (probe file), else a LocalError('target')."""
    err = paths.check_writable_dir(paths.tmp_dir(target_dir))
    if err is None:
        return None
    return LocalError("target", tr("queue.target_unusable", path=target_dir, error=err))
