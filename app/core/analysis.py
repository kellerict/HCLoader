"""Offline audio analysis (v0.7.0): loudness (EBU R128 integrated loudness + true peak via
ffmpeg's `ebur128` filter), ReplayGain 2.0 tags and a compact waveform (peaks) per library file.

Principles:
- **Local only.** No network, nothing through the throttle; only ffmpeg on the local file.
- **Never re-encode.** ffmpeg only decodes (output to a pipe / null muxer); the file is changed
  by a mutagen tag write only (`tagging.write_replaygain_atomic`: copy + `os.replace`), under
  `library.FS_LOCK` so a re-tag/move/delete of the same file never runs at the same time.
- **Never under the player.** The file loaded in the player (`set_in_use`) is never tagged:
  the measurement is stored with `tagged=0`, the tag write follows once the player has
  released the file (the worker queues it again, see `AnalysisQueue.set_playing`).
- **One decode.** Loudness and peaks come from a single ffmpeg run: `ebur128` passes the audio
  through unchanged, the PCM (mono, 2 kHz, s16le) goes to stdout for the peaks, the summary
  of the filter goes to stderr.
- **Gentle.** One file at a time (the caller's thread), ffmpeg with `-threads 1` and lowered
  process priority, cancellable between chunks.

Peaks are stored as JSON below `<app_home>/cache/peaks/` (name = sidecar stem), values 0..255
relative to full scale. The DB (`audio_analysis`) holds the measurement and flags.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import subprocess
import sys
import threading
from array import array
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from . import config, library, sidecar, tagging
from .binaries import _NO_WINDOW, ffmpeg_path
from .db import Database, now_iso
from .i18n import tr

log = logging.getLogger(__name__)

PEAK_POINTS = 1600  # points of the stored waveform (UI draws 1 bar per 2-3 px)
PEAK_RATE = 2000  # Hz of the decoded mono PCM for the peaks (envelope only)
PEAK_BLOCK = 200  # samples per raw block (0.1 s at 2 kHz)
PEAKS_VERSION = 1
FFMPEG_TIMEOUT_S = 45 * 60  # hard limit per file (a 6 h set at low priority stays well below)
CHUNK = 64 * 1024
PROGRESS_EVERY = 1
K_LAST_PASS = "analysis.last_pass"
K_SINCE = "analysis.since"  # first start with v0.7.0: downloads after it are analysed later
_BELOW_NORMAL = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)


# --------------------------------------------------------------------------- file in use

_IN_USE_LOCK = threading.Lock()
_in_use: str | None = None


def set_in_use(video_id: str | None) -> str | None:
    """The library item the player has loaded (its file is open), None = nothing. Returns the
    id that was in use before (so the caller can queue a deferred tag write)."""
    global _in_use
    with _IN_USE_LOCK:
        prev, _in_use = _in_use, (str(video_id) if video_id else None)
    return prev


def in_use(video_id: str) -> bool:
    with _IN_USE_LOCK:
        return _in_use is not None and _in_use == str(video_id)


class AnalysisError(Exception):
    """User-facing error (translated). `permanent=False`: not the file's fault (ffmpeg
    missing) - the item is tried again by the next pass."""

    def __init__(self, message: str, *, permanent: bool = True) -> None:
        super().__init__(message)
        self.permanent = permanent


# --------------------------------------------------------------------------- parsing

_SUMMARY_RE = re.compile(r"Summary:\s*$", re.M)
_I_RE = re.compile(r"^\s*I:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*LUFS", re.M | re.I)
_LRA_RE = re.compile(r"^\s*LRA:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*LU\b", re.M | re.I)
_PEAK_RE = re.compile(r"^\s*Peak:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dBFS", re.M | re.I)
_LOUDNORM_RE = re.compile(r"\{[^{}]*\"input_i\"[^{}]*\}", re.S)
SILENCE_LUFS = -70.0  # ebur128 absolute gate: quieter = silence, no usable loudness


@dataclass
class Loudness:
    lufs: float  # integrated loudness (LUFS)
    true_peak: float | None  # dBTP (None = not measured)
    lra: float | None = None  # loudness range (LU)


def _num(text: str) -> float | None:
    try:
        value = float(text)
    except ValueError:
        return None
    return value if math.isfinite(value) else None


def parse_ebur128(text: str) -> Loudness | None:
    """Loudness from ffmpeg's stderr: the `ebur128` summary («Integrated loudness: I: -8.3
    LUFS ... True peak: Peak: 0.9 dBFS») or, alternatively, the JSON block of
    `loudnorm=print_format=json` (input_i / input_tp / input_lra). None = no summary or
    silence (I below the -70 LUFS gate / -inf)."""
    text = text or ""
    m = list(_SUMMARY_RE.finditer(text))
    if m:
        tail = text[m[-1].end() :]
        i = _I_RE.search(tail)
        lufs = _num(i.group(1)) if i else None
        if lufs is None or lufs <= SILENCE_LUFS:
            return None
        lra = _LRA_RE.search(tail)
        peak = _PEAK_RE.search(tail)
        return Loudness(
            round(lufs, 2),
            round(_num(peak.group(1)), 2) if peak and _num(peak.group(1)) is not None else None,
            round(_num(lra.group(1)), 2) if lra and _num(lra.group(1)) is not None else None,
        )
    j = list(_LOUDNORM_RE.finditer(text))
    if j:
        try:
            data = json.loads(j[-1].group(0))
        except ValueError:
            return None
        lufs = _num(str(data.get("input_i", "")))
        if lufs is None or lufs <= SILENCE_LUFS:
            return None
        tp = _num(str(data.get("input_tp", "")))
        lra = _num(str(data.get("input_lra", "")))
        return Loudness(round(lufs, 2), None if tp is None else round(tp, 2), lra)
    return None


# --------------------------------------------------------------------------- peaks


class PeakAccumulator:
    """Turns a stream of s16le mono PCM bytes into block maxima (|sample|, 0..32768).

    Feed arbitrary chunks (odd byte counts and partial blocks are carried over), then call
    `result(points)` for the waveform reduced to `points` values 0..255."""

    def __init__(self, block: int = PEAK_BLOCK) -> None:
        self.block = max(1, int(block))
        self.blocks: list[int] = []
        self._carry = b""
        self._pending = array("h")
        self.samples = 0

    def feed(self, data: bytes) -> None:
        if not data:
            return
        data = self._carry + data
        cut = len(data) - (len(data) % 2)
        self._carry = data[cut:]
        chunk = array("h")
        chunk.frombytes(data[:cut])
        if sys.byteorder != "little":
            chunk.byteswap()
        self.samples += len(chunk)
        buf = self._pending + chunk if self._pending else chunk
        n = len(buf) - (len(buf) % self.block)
        b = self.block
        for i in range(0, n, b):
            part = buf[i : i + b]
            self.blocks.append(max(max(part), -min(part)))
        self._pending = buf[n:]

    def finish(self) -> None:
        if self._pending:
            part = self._pending
            self.blocks.append(max(max(part), -min(part)))
            self._pending = array("h")

    def result(self, points: int = PEAK_POINTS) -> list[int]:
        self.finish()
        return reduce_peaks(self.blocks, points)


def reduce_peaks(blocks: list[int], points: int = PEAK_POINTS) -> list[int]:
    """Block maxima -> `points` values 0..255 (max per bucket; fewer blocks than points = one
    value per block). Scale: 255 = full scale (32767)."""
    if not blocks:
        return []
    n = len(blocks)
    points = max(1, int(points))
    if n <= points:
        buckets = [[v] for v in blocks]
    else:
        buckets = [blocks[(k * n) // points : ((k + 1) * n) // points] for k in range(points)]
    return [min(255, round(max(b) * 255 / 32767)) for b in buckets if b]


def peaks_dir() -> Path:
    return config.app_home() / "cache" / "peaks"


def peaks_file(video_id: str) -> Path | None:
    try:
        return peaks_dir() / f"{sidecar.sidecar_path(video_id).stem}.json"
    except ValueError:
        return None


def save_peaks(video_id: str, peaks: list[int], *, duration: float | None, stamp: str) -> bool:
    target = peaks_file(video_id)
    if target is None:
        return False
    data = {
        "v": PEAKS_VERSION,
        "id": video_id,
        "duration": duration,
        "downloaded_at": stamp,
        "peaks": peaks,
    }
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        os.replace(tmp, target)
    except OSError as exc:
        log.warning("Waveform not saved (%s): %s", video_id, exc)
        return False
    return True


def load_peaks(video_id: str, stamp: str | None = None) -> dict[str, Any] | None:
    """Cached waveform {peaks, duration} or None (missing, damaged, other version, or the file
    was downloaded again since: `stamp` = the item's downloaded_at)."""
    target = peaks_file(video_id)
    if target is None:
        return None
    try:
        data = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("v") != PEAKS_VERSION:
        return None
    peaks = data.get("peaks")
    if not isinstance(peaks, list) or not peaks:
        return None
    if stamp and data.get("downloaded_at") and data.get("downloaded_at") != stamp:
        return None
    return {"peaks": [int(x) for x in peaks], "duration": data.get("duration")}


def remove_peaks(video_id: str) -> None:
    target = peaks_file(video_id)
    if target is not None:
        try:
            target.unlink(missing_ok=True)
        except OSError:
            pass


def prune_peaks(db: Database) -> int:
    """Delete cached waveforms whose item is no longer in the library (removed, file missing)
    or that belong to an older download (`downloaded_at` differs). -> number deleted."""
    try:
        files = list(peaks_dir().glob("*.json"))
    except OSError:
        return 0
    removed = 0
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            vid = str(data.get("id") or "")
        except (OSError, ValueError, AttributeError):
            vid, data = "", {}
        row = db.get_video(vid) if vid else None
        stale = (
            not row
            or row.get("status") != "done"
            or (data.get("downloaded_at") or "") != (row.get("downloaded_at") or "")
        )
        if stale:
            try:
                f.unlink(missing_ok=True)
                removed += 1
            except OSError:
                pass
    if removed:
        log.info("Waveform cache: %d stale file(s) removed", removed)
    return removed


# --------------------------------------------------------------------------- ffmpeg run


def build_command(exe: Path | str, path: Path | str, *, loudness: bool, peaks: bool) -> list[str]:
    """ffmpeg command line: decode only (no output file), first audio stream."""
    cmd = [str(exe), "-hide_banner", "-nostdin", "-nostats", "-v", "info", "-threads", "1"]
    cmd += ["-i", str(path), "-map", "0:a:0", "-vn", "-sn", "-dn"]
    chain: list[str] = []
    if loudness:
        # framelog=verbose: per-frame lines only at -v verbose -> stderr carries the summary
        chain.append("ebur128=peak=true:framelog=verbose")
    if peaks:
        chain += [f"aresample={PEAK_RATE}", "aformat=sample_fmts=s16:channel_layouts=mono"]
        cmd += ["-af", ",".join(chain), "-f", "s16le", "-"]
    else:
        cmd += ["-af", ",".join(chain), "-f", "null", "-"]
    return cmd


def _lower_priority(proc: subprocess.Popen) -> None:
    if sys.platform != "win32" and hasattr(os, "setpriority"):
        try:
            os.setpriority(os.PRIO_PROCESS, proc.pid, 10)
        except OSError:
            pass


@dataclass
class RunResult:
    loudness: Loudness | None = None
    peaks: list[int] = field(default_factory=list)
    samples: int = 0
    cancelled: bool = False


def run_ffmpeg(
    path: Path,
    *,
    loudness: bool = True,
    peaks: bool = True,
    cancel: threading.Event | None = None,
    exe: Path | str | None = None,
    popen: Callable[..., Any] = subprocess.Popen,
    timeout: float = FFMPEG_TIMEOUT_S,
) -> RunResult:
    """Decode `path` once with ffmpeg and return loudness and/or peaks. Raises AnalysisError."""
    exe = exe or ffmpeg_path()
    if not Path(exe).exists() and popen is subprocess.Popen:
        raise AnalysisError(tr("analysis.no_ffmpeg"), permanent=False)
    cmd = build_command(exe, path, loudness=loudness, peaks=peaks)
    try:
        proc = popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=_NO_WINDOW | _BELOW_NORMAL,
        )
    except OSError as exc:
        raise AnalysisError(tr("analysis.ffmpeg_failed", error=exc)) from exc
    _lower_priority(proc)
    err_parts: list[bytes] = []

    def drain() -> None:  # stderr in its own thread: a full pipe would block ffmpeg
        try:
            for line in iter(proc.stderr.readline, b""):
                err_parts.append(line)
        except (OSError, ValueError):
            pass

    t = threading.Thread(target=drain, name="hcloader-ffmpeg-stderr", daemon=True)
    t.start()
    acc = PeakAccumulator()
    res = RunResult()
    timed_out = threading.Event()

    def on_timeout() -> None:
        timed_out.set()
        try:
            proc.kill()
        except OSError:
            pass

    killer = threading.Timer(timeout, on_timeout)
    killer.daemon = True
    killer.start()
    finished = threading.Event()

    def watch() -> None:  # cancel also reaches a loudness-only run (no stdout until the end)
        while cancel is not None and not finished.wait(0.25):
            if cancel.is_set():
                res.cancelled = True
                try:
                    proc.kill()
                except OSError:
                    pass
                return

    w = threading.Thread(target=watch, name="hcloader-ffmpeg-cancel", daemon=True)
    w.start()
    try:
        while True:
            data = proc.stdout.read(CHUNK)
            if not data:
                break
            if peaks and not res.cancelled:
                acc.feed(data)
        proc.wait()
    finally:
        finished.set()
        killer.cancel()
        if proc.poll() is None:  # exception in the read loop: never leave ffmpeg running
            try:
                proc.kill()
                proc.wait(5)
            except (OSError, subprocess.TimeoutExpired):
                pass
        t.join(5)
        for stream in (proc.stdout, proc.stderr):
            try:
                stream.close()
            except (OSError, AttributeError):
                pass
    if res.cancelled:
        return res
    err = b"".join(err_parts).decode("utf-8", "replace")
    if proc.returncode != 0:
        last = [ln for ln in err.strip().splitlines() if ln.strip()][-1:] or [str(proc.returncode)]
        msg = tr("analysis.ffmpeg_failed", error=last[0][:300])
        # not the file's fault -> tried again by the next pass: hard timeout (busy machine),
        # file moved/deleted (re-tag, delete) while ffmpeg was starting
        transient = timed_out.is_set() or not Path(path).is_file()
        raise AnalysisError(msg, permanent=not transient)
    if loudness:
        res.loudness = parse_ebur128(err)
    if peaks:
        res.peaks = acc.result()
        res.samples = acc.samples
    return res


# --------------------------------------------------------------------------- DB


def get_row(db: Database, video_id: str) -> dict[str, Any] | None:
    return db.query_one("SELECT * FROM audio_analysis WHERE video_id = ?", (video_id,))


def loudness_of(db: Database, video_id: str, path: Path | None = None) -> dict[str, Any] | None:
    """Loudness for the player: DB measurement, else ReplayGain tags of the file (another
    tool). -> {lufs, true_peak, gain (dB @ -18 LUFS), peak (linear), source} or None."""
    row = get_row(db, video_id)
    if row and row.get("lufs") is not None:
        rg = tagging.replaygain_for(row["lufs"], row.get("true_peak"))
        return {
            "lufs": row["lufs"],
            "true_peak": row.get("true_peak"),
            "gain": rg.gain,
            "peak": rg.peak,
            "source": "analysis",
        }
    if path is not None:
        rg = tagging.read_replaygain(path)
        if rg is not None:
            tp = None if not rg.peak else round(20 * math.log10(rg.peak), 2)
            return {
                "lufs": round(rg.lufs, 2),
                "true_peak": tp,
                "gain": rg.gain,
                "peak": rg.peak,
                "source": "tags",
            }
    return None


def _store(db: Database, video_id: str, **fields: Any) -> None:
    cols = list(fields)
    db.execute(
        f"INSERT INTO audio_analysis(video_id, {', '.join(cols)}) "
        f"VALUES (?, {', '.join('?' for _ in cols)}) "
        f"ON CONFLICT(video_id) DO UPDATE SET {', '.join(f'{c} = excluded.{c}' for c in cols)}",
        (video_id, *fields.values()),
    )


def forget(db: Database, video_id: str) -> None:
    db.execute("DELETE FROM audio_analysis WHERE video_id = ?", (video_id,))
    remove_peaks(video_id)


# --------------------------------------------------------------------------- one item


def _iso_ts(value: Any) -> float | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).timestamp()
    except ValueError:
        return None


def needs(
    row: Mapping[str, Any], settings: config.Settings, *, scope: str = "new"
) -> dict[str, bool]:
    """What an item still needs: {loudness, tags, peaks}. `row` = videos row joined with
    audio_analysis (lufs, tagged, peaks, analysed, error). scope «all» = measure everything
    again; «new» = never measured, downloaded again since, tags not written yet, peaks
    missing (with `loudness.waveforms`)."""
    lo = settings.loudness
    if scope == "all":
        return {"loudness": True, "tags": lo.write_tags, "peaks": lo.waveforms}
    analysed = _iso_ts(row.get("analysed"))
    downloaded = _iso_ts(row.get("downloaded_at"))
    stale = analysed is None or (downloaded is not None and downloaded > analysed)
    measured = row.get("lufs") is not None and not stale
    # «looked, nothing measurable» (silence) also counts as done unless the file is newer
    looked = analysed is not None and not stale
    if looked and row.get("lufs") is None and row.get("error"):
        # ffmpeg could not read the file: not again until it is downloaded again (or «all»)
        return {"loudness": False, "tags": False, "peaks": False}
    tags = bool(lo.write_tags and measured and not row.get("tagged") and _taggable(row))
    peaks = bool(lo.waveforms and (stale or not row.get("peaks")))
    return {"loudness": not (measured or looked), "tags": tags, "peaks": peaks}


TAGGABLE = (".mp3", ".m4a", ".mp4", ".opus")


def _taggable(row: Mapping[str, Any]) -> bool:
    return Path(str(row.get("file_path") or "")).suffix.lower() in TAGGABLE


def process(
    db: Database,
    settings: config.Settings,
    video_id: str,
    *,
    loudness: bool = True,
    peaks: bool = True,
    cancel: threading.Event | None = None,
    runner: Callable[..., RunResult] = run_ffmpeg,
) -> dict[str, Any]:
    """Analyse one library item. -> {ok, id, loudness?, peaks (bool), tagged, cancelled?,
    error?}. With `loudness=False` and a known measurement only the tag write is retried."""
    row = db.get_video(video_id)
    if not row or row.get("status") != "done" or not row.get("file_path"):
        return {"ok": False, "id": video_id, "error": tr("library.not_in_library")}
    path = Path(row["file_path"])
    out: dict[str, Any] = {"ok": True, "id": video_id, "peaks": False, "tagged": False}
    if loudness or peaks:
        try:
            if not path.is_file():
                raise AnalysisError(tr("player.file_missing"), permanent=False)
            res = runner(path, loudness=loudness, peaks=peaks, cancel=cancel)
        except AnalysisError as exc:
            fields: dict[str, Any] = {"error": str(exc)[:500]}
            if loudness and getattr(exc, "permanent", True):
                fields["analysed"] = now_iso()  # unreadable file: not again until re-download
            _store(db, video_id, **fields)
            return {"ok": False, "id": video_id, "error": str(exc)}
        if res.cancelled:
            return {"ok": True, "id": video_id, "cancelled": True, "peaks": False}
        fields = {"error": None}
        if loudness:
            lo = res.loudness
            fields.update(
                lufs=lo.lufs if lo else None,
                true_peak=lo.true_peak if lo else None,
                lra=lo.lra if lo else None,
                tagged=0,
                analysed=now_iso(),
            )
        if peaks and res.peaks:
            duration = row.get("duration") or (
                round(res.samples / PEAK_RATE, 1) if res.samples else None
            )
            stamp = row.get("downloaded_at") or ""
            out["peaks"] = save_peaks(video_id, res.peaks, duration=duration, stamp=stamp)
            fields["peaks"] = 1 if out["peaks"] else 0
        _store(db, video_id, **fields)
    current = get_row(db, video_id) or {}
    if current.get("lufs") is not None:
        rg = tagging.replaygain_for(current["lufs"], current.get("true_peak"))
        out["loudness"] = {
            "lufs": current["lufs"],
            "true_peak": current.get("true_peak"),
            "gain": rg.gain,
            "peak": rg.peak,
            "source": "analysis",
        }
        if settings.loudness.write_tags and not current.get("tagged"):
            state = _write_tags(db, video_id, rg)
            out["tagged"] = state is True
            if state == "deferred":
                out["tag_deferred"] = True
        else:
            out["tagged"] = bool(current.get("tagged"))
    return out


def _write_tags(db: Database, video_id: str, rg: tagging.ReplayGain) -> bool | str:
    """Tag write under the library file lock; the path is re-read inside the lock (a re-tag
    may have moved the file while ffmpeg was decoding). -> True, False (failed / not
    taggable) or "deferred": the file is loaded in the player or held open by another
    program - nothing written, `tagged` stays 0 and a later run writes the tags."""
    with library.FS_LOCK:
        if in_use(video_id):
            log.debug("ReplayGain tag write deferred (file in the player): %s", video_id)
            return "deferred"
        row = db.get_video(video_id)
        path = Path(row["file_path"]) if row and row.get("file_path") else None
        if path is None or path.suffix.lower() not in TAGGABLE:
            return False
        try:
            ok = tagging.write_replaygain_atomic(path, rg)
        except tagging.FileBusyError:
            log.info(tr("analysis.tag_deferred", path=path.name))
            return "deferred"
        except Exception as exc:  # file in use (player), read-only, damaged tag block
            log.warning(tr("analysis.tag_failed", path=path.name, error=exc))
            _store(
                db,
                video_id,
                tagged=0,
                error=tr("analysis.tag_failed", path=path.name, error=exc)[:500],
            )
            return False
    if ok:
        _store(db, video_id, tagged=1)
    return ok


def ensure_peaks(
    db: Database, settings: config.Settings, video_id: str, **kw: Any
) -> dict[str, Any]:
    """Waveform of one item, computed if missing (lazy, first play). Also measures the
    loudness in the same decode when it is still unknown (costs almost nothing extra)."""
    row = db.get_video(video_id)
    if not row:
        return {"ok": False, "id": video_id, "error": tr("library.not_in_library")}
    cached = load_peaks(video_id, row.get("downloaded_at"))
    if cached:
        return {"ok": True, "id": video_id, **cached}
    a = get_row(db, video_id) or {}
    need_lo = a.get("lufs") is None and a.get("analysed") is None
    res = process(db, settings, video_id, loudness=need_lo, peaks=True, **kw)
    if not res.get("ok") or res.get("cancelled"):
        return res
    cached = load_peaks(video_id, row.get("downloaded_at"))
    if not cached:
        return {"ok": False, "id": video_id, "error": tr("analysis.no_peaks")}
    return {"ok": True, "id": video_id, **cached, "loudness": res.get("loudness")}


# --------------------------------------------------------------------------- library pass


def _rows(db: Database) -> list[dict[str, Any]]:
    return db.query(
        "SELECT v.id, v.file_path, v.duration, v.downloaded_at, a.lufs, a.tagged, a.peaks, "
        "a.analysed, a.error FROM videos v LEFT JOIN audio_analysis a ON a.video_id = v.id "
        "WHERE v.status = 'done' AND v.file_path IS NOT NULL ORDER BY v.downloaded_at DESC, v.id"
    )


def pending(
    db: Database, settings: config.Settings, *, scope: str = "new"
) -> list[tuple[str, dict[str, bool]]]:
    """Items a pass has to touch, newest download first: [(id, needs)]."""
    out = []
    for r in _rows(db):
        n = needs(r, settings, scope=scope)
        if any(n.values()):
            out.append((r["id"], n))
    return out


def since_pending(db: Database, settings: config.Settings) -> list[str]:
    """Items downloaded since the first start with v0.7.0 (e.g. by the scheduled headless run,
    which does not analyse) that were never analysed: the GUI queues them after the start."""
    since = db.get_state(K_SINCE)
    if not since:
        db.set_state(K_SINCE, now_iso())
        return []
    t0 = _iso_ts(since) or 0
    return [
        r["id"]
        for r in _rows(db)
        if r.get("analysed") is None
        and (_iso_ts(r.get("downloaded_at")) or 0) >= t0
        and any(needs(r, settings).values())
    ]


def status(db: Database, settings: config.Settings) -> dict[str, Any]:
    rows = _rows(db)
    measured = sum(1 for r in rows if r.get("lufs") is not None)
    todo = sum(1 for r in rows if any(needs(r, settings).values()))
    return {
        "total": len(rows),
        "analysed": measured,
        "tagged": sum(1 for r in rows if r.get("tagged")),
        "waveforms": sum(1 for r in rows if r.get("peaks")),
        "failed": sum(1 for r in rows if r.get("error")),
        "pending": todo,
        "last_pass": db.get_state(K_LAST_PASS),
        "ffmpeg": ffmpeg_path().exists(),
    }


def run_pass(
    db: Database,
    settings_provider: Callable[[], config.Settings],
    *,
    scope: str = "new",
    progress: Callable[[dict[str, Any]], None] | None = None,
    cancel: threading.Event | None = None,
    between: Callable[[], None] | None = None,
    item_done: Callable[[dict[str, Any]], None] | None = None,
    runner: Callable[..., RunResult] = run_ffmpeg,
    ids: Iterable[str] | None = None,
) -> dict[str, Any]:
    """Analyse the library one file at a time. `between()` runs before each item (the worker
    serves urgent waveform requests there). Cancellable between items and inside ffmpeg."""
    settings = settings_provider()
    todo = pending(db, settings, scope=scope)
    if ids is not None:
        wanted = set(ids)
        todo = [x for x in todo if x[0] in wanted]
    total = len(todo)
    res = {"ok": True, "total": total, "done": 0, "analysed": 0, "failed": 0, "cancelled": False}
    if total and not ffmpeg_path().exists() and runner is run_ffmpeg:
        return {**res, "ok": False, "error": tr("analysis.no_ffmpeg")}
    for i, (vid, n) in enumerate(todo, 1):
        if between is not None:
            between()
        if cancel is not None and cancel.is_set():
            res["cancelled"] = True
            break
        try:
            r = process(
                db,
                settings_provider(),
                vid,
                loudness=n["loudness"],
                peaks=n["peaks"],
                cancel=cancel,
                runner=runner,
            )
        except Exception as exc:
            log.warning("Analysis failed: %s", vid, exc_info=True)
            r = {"ok": False, "id": vid, "error": str(exc)}
        if r.get("cancelled"):
            res["cancelled"] = True
            break
        res["done"] = i
        if r.get("ok"):
            res["analysed"] += 1
        else:
            res["failed"] += 1
        if item_done is not None:
            item_done(r)
        if progress is not None and (i % PROGRESS_EVERY == 0 or i == total):
            progress({k: res[k] for k in ("done", "total", "analysed", "failed")})
    if not res["cancelled"]:
        db.set_state(K_LAST_PASS, now_iso())
    return res


def process_pending(
    db: Database,
    settings: config.Settings,
    video_id: str,
    *,
    cancel: threading.Event | None = None,
    runner: Callable[..., RunResult] = run_ffmpeg,
) -> dict[str, Any]:
    """Analyse one item as far as it still needs it (after a download: everything)."""
    rows = [r for r in _rows(db) if r["id"] == video_id]
    if not rows:
        return {"ok": False, "id": video_id, "error": tr("library.not_in_library")}
    n = needs(rows[0], settings)
    if not any(n.values()):
        return {"ok": True, "id": video_id, "skipped": True, "peaks": bool(rows[0].get("peaks"))}
    return process(
        db,
        settings,
        video_id,
        loudness=n["loudness"],
        peaks=n["peaks"],
        cancel=cancel,
        runner=runner,
    )
