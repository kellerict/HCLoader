"""Re-upload detection via a compact audio fingerprint (v0.10.0).

docs/decisions.md «Re-upload detection». Principles:
- **Offline only.** ffmpeg decodes the local file (mono, 5512 Hz, s16le); nothing goes over
  the network and nothing passes the throttle. Chromaprint/fpcalc is not bundled (one more
  binary to fetch, pin and update; the decisions note explains the licence check).
- **Cheap.** Only parts of a set are decoded: the first `reupload.head_minutes` minutes and
  `reupload.windows` 30-second windows at absolute anchors - half from the start (5, 10, 15 …
  min), half before the end (2, 6, 12 … min) - so two copies with another intro or another
  ending share the windows of the unchanged side at one time offset (review v0.10.0 M2).
  ffmpeg seeks to each window (`-ss` before `-i`), at lowered priority, one file at a time.
- **Landmark hashes** (spectral peak pairs, the classic Shazam idea): per frame
  (512-point FFT, hop 256 = 46 ms) the strongest bins in six frequency bands above the frame
  mean are candidates; the 3 strongest of every 0.25 s block are kept (12 per second). Each
  peak is paired with up to FANOUT later peaks within TARGET_FRAMES; the pair is packed into
  a 24-bit hash (f1, f2 in 21.5 Hz steps, dt). Hashes survive re-encoding, low bitrates,
  volume changes and noise; another intro length only shifts all times by one offset.
- **Compare** = offset histogram: for the hashes two fingerprints share, the time difference
  of the matching pairs piles up in one bin for the same audio. score = hits in the best bin
  (+-1) / hashes of the smaller fingerprint.
- **Alignment check**: a candidate whose stored print shares enough aligned hits (head or
  anchors overlap once, MIN_HITS and a third of the threshold) is verified by decoding *this*
  file again where the candidate's segments lie at the found offset (`aligned_windows`, at
  most 60 s each). That print must match at the same offset in at least 60 % of the mapped
  segments (and 2). So a copy with minutes more or less at either end matches, and two sets
  that only open with the same track or share one track do not.
- **Fast index**: a deterministic quarter of the hashes (`hash % INDEX_MOD == 0`) goes into
  `fingerprint_index` (SQLite, indexed); candidates come from one indexed query, only the
  best few are verified against their full fingerprint.

Pure functions work on plain sample sequences (tests use synthetic arrays, no ffmpeg).
"""

from __future__ import annotations

import cmath
import json
import logging
import math
import os
import subprocess
import sys
import threading
from array import array
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import platforms
from .binaries import _NO_WINDOW, ffmpeg_path
from .db import Database, now_iso
from .i18n import tr

log = logging.getLogger(__name__)

VERSION = 2  # 2: anchored windows, 0.25 s peak blocks, coarser hash bins (review v0.10.0 M2)
RATE = 5512  # Hz of the decoded mono PCM
FFT = 512  # samples per frame (93 ms)
HOP = 256  # frame step (46 ms)
FRAME_S = HOP / RATE
# frequency bands (FFT bins, 10.8 Hz each): kick/bass up to the leads (~2.7 kHz)
BANDS = ((3, 10), (10, 20), (20, 40), (40, 80), (80, 160), (160, 256))
PEAK_FACTOR = 1.6  # a band maximum counts if it is this much above the frame mean
TARGET_FRAMES = 32  # pair a peak with later peaks up to ~1.5 s
FANOUT = 3
PEAK_BLOCK_S = 0.25  # thinning block: the strongest PEAKS_PER_BLOCK peaks of every block
PEAKS_PER_BLOCK = 3  # -> 12 peaks per second, evenly spread (robust to noise / low bitrate)
INDEX_MOD = 4  # one in four hashes goes into the inverted index
WINDOW_S = 30.0
# absolute window anchors (minutes): from the start (survive another ending) and before the
# end (survive another intro); identical for every copy, unlike positions spread over the
# duration of each file (review v0.10.0 M2)
START_ANCHORS_MIN = (5, 10, 15, 25, 40, 60, 90, 120)
END_ANCHORS_MIN = (2, 6, 12, 20, 30, 45, 60, 90)
VERIFY_MAX_S = 60.0  # alignment check: at most this much per mapped segment is decoded
VERIFY_MIN_S = 10.0  # mapped segments shorter than this are skipped
VERIFY_SHARE = 0.6  # share of the mapped segments that must match at the found offset
VERIFY_CANDIDATES = 2  # candidates whose alignment is checked by decoding (per file)
VERIFY_SCORE_SHARE = 1 / 3  # stored-print score (share of min_score) that triggers the check
MIN_HITS = 40  # hits in the best offset bin, below = never a match
SEG_FLOOR = 8  # aligned hits a segment needs to count as hit
MAX_CANDIDATES = 8  # candidates verified against their full fingerprint
MAX_HASH_FANIN = 200  # index hashes shared by more items than this say nothing
FFMPEG_TIMEOUT_S = 10 * 60
CHUNK = 64 * 1024
K_LAST_PASS = "fingerprint.last_pass"
_BELOW_NORMAL = getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0)
STATES = ("open", "kept", "linked")


class FingerprintError(Exception):
    """User-facing error (translated). `permanent=False`: not the file's fault."""

    def __init__(self, message: str, *, permanent: bool = True) -> None:
        super().__init__(message)
        self.permanent = permanent


# --------------------------------------------------------------------------- algorithm


@dataclass
class Fingerprint:
    hashes: list[tuple[int, int]] = field(default_factory=list)  # (hash, frame)
    segments: list[tuple[int, int]] = field(default_factory=list)  # frame ranges
    duration: float | None = None
    version: int = VERSION

    def pack(self) -> bytes:
        flat = array("I")
        for h, t in self.hashes:
            flat.append(h & 0xFFFFFFFF)
            flat.append(max(0, t) & 0xFFFFFFFF)
        if sys.byteorder != "little":
            flat.byteswap()
        return flat.tobytes()

    @classmethod
    def unpack(
        cls, blob: bytes, segments: Any = None, duration: float | None = None, version: int = 1
    ) -> Fingerprint:
        flat = array("I")
        flat.frombytes(blob or b"")
        if sys.byteorder != "little":
            flat.byteswap()
        hashes = [(flat[i], flat[i + 1]) for i in range(0, len(flat) - 1, 2)]
        segs = [(int(a), int(b)) for a, b in (segments or [])]
        return cls(hashes, segs, duration, version)


_TWIDDLE: list[complex] = [cmath.exp(-2j * math.pi * k / FFT) for k in range(FFT // 2)]
_REV: list[int] = [int(format(i, f"0{FFT.bit_length() - 1}b")[::-1], 2) for i in range(FFT)]
_WINDOW: list[float] = [0.5 - 0.5 * math.cos(2 * math.pi * i / (FFT - 1)) for i in range(FFT)]


def _fft(x: Sequence[float]) -> list[complex]:
    """Iterative radix-2 FFT of FFT points (pure Python, ~0.3 ms)."""
    a: list[complex] = [complex(x[r]) for r in _REV]
    n = FFT
    size = 2
    while size <= n:
        half = size // 2
        step = n // size
        for start in range(0, n, size):
            k = 0
            for j in range(start, start + half):
                t = a[j + half] * _TWIDDLE[k]
                u = a[j]
                a[j] = u + t
                a[j + half] = u - t
                k += step
        size *= 2
    return a


def _frame_peaks(samples: Sequence[float]) -> list[list[tuple[int, float]]]:
    """Candidate peaks per frame of one segment: [(bin, strength)], strength = band maximum
    relative to the frame mean (only above PEAK_FACTOR)."""
    out: list[list[tuple[int, float]]] = []
    count = (len(samples) - FFT) // HOP + 1 if len(samples) >= FFT else 0
    lo, top = BANDS[0][0], BANDS[-1][1]
    for i in range(count):
        base = i * HOP
        spec = _fft([samples[base + j] * _WINDOW[j] for j in range(FFT)])
        mags = [abs(spec[b]) for b in range(top)]
        mean = sum(mags[lo:top]) / (top - lo)
        peaks: list[tuple[int, float]] = []
        if mean > 1e-6:
            for a, b in BANDS:
                best = max(range(a, b), key=mags.__getitem__)
                ratio = mags[best] / mean
                if ratio > PEAK_FACTOR:
                    peaks.append((best, ratio))
        out.append(peaks)
    return out


def _thin(peaks: list[list[tuple[int, float]]]) -> list[list[int]]:
    """Keep the PEAKS_PER_BLOCK strongest peaks of every PEAK_BLOCK_S block of frames: an even
    density, independent of loudness and of how busy the music is. Short blocks keep peaks
    in every part of the signal, so noise that masks one moment does not take a whole second."""
    block = max(1, round(PEAK_BLOCK_S / FRAME_S))
    out: list[list[int]] = [[] for _ in peaks]
    for b0 in range(0, len(peaks), block):
        cand = [(s, t, f) for t in range(b0, min(b0 + block, len(peaks))) for f, s in peaks[t]]
        cand.sort(reverse=True)
        for _s, t, f in cand[:PEAKS_PER_BLOCK]:
            out[t].append(f)
    for row in out:
        row.sort()
    return out


def hash_pair(f1: int, f2: int, dt: int) -> int:
    """24-bit hash of a peak pair; frequencies in 2-bin steps (21.5 Hz), so a peak that moves
    by one bin after a re-encode (low bitrate, noise) usually keeps its hash."""
    return (((f1 >> 1) & 0x1FF) << 15) | (((f2 >> 1) & 0x1FF) << 6) | (dt & 0x3F)


def compute(segments: Iterable[tuple[float, Sequence[float]]], *, duration: float | None = None):
    """Fingerprint of decoded segments [(start seconds, mono samples at RATE)]."""
    fp = Fingerprint(duration=duration)
    for start_s, samples in segments:
        if len(samples) < FFT:
            continue
        offset = int(round(start_s / FRAME_S))
        frames = _thin(_frame_peaks(samples))
        fp.segments.append((offset, offset + len(frames)))
        for t1, row in enumerate(frames):
            for f1 in row:
                paired = 0
                for dt in range(1, TARGET_FRAMES + 1):
                    if t1 + dt >= len(frames) or paired >= FANOUT:
                        break
                    for f2 in frames[t1 + dt]:
                        fp.hashes.append((hash_pair(f1, f2, dt), offset + t1))
                        paired += 1
                        if paired >= FANOUT:
                            break
    return fp


def windows_for(
    duration: float | None, head_minutes: int, windows: int
) -> list[tuple[float, float]]:
    """[(start s, length s)] to decode, sorted: the head plus `windows` windows of WINDOW_S at
    absolute anchors - the first half from the start (START_ANCHORS_MIN, after the head), the
    other half before the end (END_ANCHORS_MIN). Two copies with another intro or ending share
    the windows of the unchanged side at one time offset (review v0.10.0 M2). Anchors that
    do not fit the file are skipped (unknown duration: head only)."""
    head = max(1, int(head_minutes)) * 60.0
    out = [(0.0, head if not duration else min(head, float(duration)))]
    if not duration or windows <= 0 or duration <= head + WINDOW_S:
        return out
    dur = float(duration)
    n_end = int(windows) // 2
    n_start = int(windows) - n_end
    taken: list[tuple[float, float]] = []

    def free(start: float) -> bool:
        return (
            start >= head
            and start + WINDOW_S <= dur
            and all(abs(start - s0) >= WINDOW_S for s0, _l in taken)
        )

    for minute in START_ANCHORS_MIN:
        if len(taken) >= n_start:
            break
        if free(minute * 60.0):
            taken.append((minute * 60.0, WINDOW_S))
    starts = len(taken)
    for minute in END_ANCHORS_MIN:
        if len(taken) - starts >= n_end:
            break
        start = round(dur - minute * 60.0, 2)
        if free(start):
            taken.append((start, WINDOW_S))
    return out + sorted(taken)


def aligned_windows(
    other: Fingerprint, offset_s: float, duration: float | None
) -> list[tuple[float, float]]:
    """Windows of *this* file that hold the audio of `other`'s segments when this file is
    `offset_s` ahead (compare(this, other).offset_s): each segment start + offset, at most
    VERIFY_MAX_S long, clipped to the file; shorter than VERIFY_MIN_S = skipped."""
    out: list[tuple[float, float]] = []
    for s0, s1 in other.segments:
        start = s0 * FRAME_S + offset_s
        end = start + min((s1 - s0) * FRAME_S, VERIFY_MAX_S)
        start = max(0.0, start)
        if duration:
            end = min(end, float(duration))
        if end - start >= VERIFY_MIN_S:
            out.append((round(start, 2), round(end - start, 2)))
    return out


@dataclass
class Match:
    score: float = 0.0
    hits: int = 0
    offset_s: float = 0.0
    segments_hit: int = 0
    segments: int = 0


def compare(a: Fingerprint, b: Fingerprint) -> Match:
    """Offset histogram of the shared hashes. `offset_s` > 0: `b` is ahead (a starts later)."""
    if not a.hashes or not b.hashes:
        return Match()
    where: dict[int, list[int]] = defaultdict(list)
    for h, t in b.hashes:
        where[h].append(t)
    hist: Counter[int] = Counter()
    for h, t in a.hashes:
        for tb in where.get(h, ()):
            hist[t - tb] += 1
    if not hist:
        return Match()
    best_dt, _ = max(
        hist.items(), key=lambda kv: kv[1] + hist.get(kv[0] - 1, 0) + hist.get(kv[0] + 1, 0)
    )
    hits = hist[best_dt] + hist.get(best_dt - 1, 0) + hist.get(best_dt + 1, 0)
    # which segments of `a` carry the aligned hits
    seg_hits: Counter[int] = Counter()
    for h, t in a.hashes:
        for tb in where.get(h, ()):
            if abs((t - tb) - best_dt) <= 1:
                for i, (s0, s1) in enumerate(a.segments):
                    if s0 <= t < s1:
                        seg_hits[i] += 1
                        break
    floor = max(SEG_FLOOR, hits // 50)
    segs_hit = sum(1 for n in seg_hits.values() if n >= floor)
    score = hits / max(1, min(len(a.hashes), len(b.hashes)))
    return Match(
        score=round(min(1.0, score), 4),
        hits=hits,
        offset_s=round(best_dt * FRAME_S, 2),
        segments_hit=segs_hit,
        segments=min(len(a.segments), len(b.segments)),
    )


def is_match(m: Match, min_score: float) -> bool:
    """`min_score` as a share (0.2 = 20 %)."""
    if m.hits < MIN_HITS or m.score < min_score:
        return False
    return m.segments_hit >= min(2, max(1, m.segments))


def is_verified(m: Match, min_score: float, mapped: int) -> bool:
    """Alignment check (`compare(aligned print, other)`): a match, and at least VERIFY_SHARE of
    the `mapped` segments carry hits at the offset."""
    if not is_match(m, min_score):
        return False
    return m.segments_hit >= max(min(2, mapped), math.ceil(mapped * VERIFY_SHARE))


# --------------------------------------------------------------------------- ffmpeg


def build_command(exe: Path | str, path: Path | str, start: float, length: float) -> list[str]:
    cmd = [str(exe), "-hide_banner", "-nostdin", "-nostats", "-v", "error", "-threads", "1"]
    if start > 0:
        cmd += ["-ss", f"{start:.2f}"]
    cmd += ["-t", f"{length:.2f}", "-i", str(path), "-map", "0:a:0", "-vn", "-sn", "-dn"]
    cmd += ["-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"]
    return cmd


def decode(
    path: Path,
    windows: Sequence[tuple[float, float]],
    *,
    cancel: threading.Event | None = None,
    exe: Path | str | None = None,
    popen: Callable[..., Any] = subprocess.Popen,
) -> list[tuple[float, array]] | None:
    """Decode the windows with ffmpeg (one short run each). None = cancelled."""
    exe = exe or ffmpeg_path()
    if not Path(exe).exists() and popen is subprocess.Popen:
        raise FingerprintError(tr("analysis.no_ffmpeg"), permanent=False)
    out: list[tuple[float, array]] = []
    for start, length in windows:
        if cancel is not None and cancel.is_set():
            return None
        pcm = _run(exe, path, start, length, cancel, popen)
        if pcm is None:
            return None
        samples = array("h")
        samples.frombytes(pcm[: len(pcm) // 2 * 2])
        if sys.byteorder != "little":
            samples.byteswap()
        out.append((start, samples))
    return out


def _run(exe, path, start, length, cancel, popen) -> bytes | None:
    cmd = build_command(exe, path, start, length)
    try:
        proc = popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=_NO_WINDOW | _BELOW_NORMAL,
        )
    except OSError as exc:
        raise FingerprintError(tr("analysis.ffmpeg_failed", error=exc)) from exc
    if sys.platform != "win32" and hasattr(os, "setpriority"):
        try:
            os.setpriority(os.PRIO_PROCESS, proc.pid, 10)
        except OSError:
            pass
    killed = {"cancel": False}
    done = threading.Event()

    def watch() -> None:
        waited = 0.0
        while not done.wait(0.25):
            waited += 0.25
            if (cancel is not None and cancel.is_set()) or waited > FFMPEG_TIMEOUT_S:
                killed["cancel"] = cancel is not None and cancel.is_set()
                try:
                    proc.kill()
                except OSError:
                    pass
                return

    w = threading.Thread(target=watch, name="hcloader-fp-watch", daemon=True)
    w.start()
    try:
        data, err = proc.communicate()
    finally:
        done.set()
    if killed["cancel"]:
        return None
    if proc.returncode != 0:
        text = (err or b"").decode("utf-8", "replace").strip().splitlines()
        msg = tr("analysis.ffmpeg_failed", error=(text[-1] if text else proc.returncode))
        raise FingerprintError(msg, permanent=Path(path).is_file())
    return data or b""


# --------------------------------------------------------------------------- DB


def get(db: Database, video_id: str) -> Fingerprint | None:
    row = db.query_one(
        "SELECT * FROM fingerprints WHERE video_id=? AND hashes IS NOT NULL", (video_id,)
    )
    if not row or row["version"] != VERSION:
        return None
    segs = json.loads(row["segments"] or "[]")
    return Fingerprint.unpack(row["hashes"], segs, row["duration"], row["version"])


def store(db: Database, video_id: str, fp: Fingerprint) -> bool:
    """Save print + index rows. False (nothing written) when the item left the library while
    it was decoded (review v0.10.0 n1: no dead rows for a deleted item)."""
    with db.transaction():
        row = db.query_one("SELECT status FROM videos WHERE id=?", (video_id,))
        if not row or row["status"] != "done":
            return False
        db.execute("DELETE FROM fingerprint_index WHERE video_id=?", (video_id,))
        db.execute(
            "INSERT OR REPLACE INTO fingerprints(video_id, version, created, duration, hashes, "
            "segments, error) VALUES (?, ?, ?, ?, ?, ?, NULL)",
            (video_id, fp.version, now_iso(), fp.duration, fp.pack(), json.dumps(fp.segments)),
        )
        sample = sorted({h for h, _t in fp.hashes if h % INDEX_MOD == 0})
        db._conn.executemany(  # noqa: SLF001 - bulk insert
            "INSERT INTO fingerprint_index(hash, video_id) VALUES (?, ?)",
            [(h, video_id) for h in sample],
        )
    return True


def store_error(db: Database, video_id: str, message: str) -> None:
    db.execute(
        "INSERT OR REPLACE INTO fingerprints(video_id, version, created, hashes, error) "
        "VALUES (?, ?, ?, NULL, ?)",
        (video_id, VERSION, now_iso(), message[:500]),
    )


def forget(db: Database, video_id: str) -> None:
    """A library item was deleted: fingerprint, index and re-upload marks (both sides)."""
    with db.transaction():
        db.execute("DELETE FROM fingerprint_index WHERE video_id=?", (video_id,))
        db.execute("DELETE FROM fingerprints WHERE video_id=?", (video_id,))
        db.execute("DELETE FROM reuploads WHERE video_id=? OR of_id=?", (video_id, video_id))


def candidates(db: Database, fp: Fingerprint, *, exclude: str = "") -> list[tuple[str, int]]:
    """[(video_id, shared index hashes)] of library items, best first (one indexed query per
    chunk of 500 hashes)."""
    sample = sorted({h for h, _t in fp.hashes if h % INDEX_MOD == 0})
    counts: Counter[str] = Counter()
    for i in range(0, len(sample), 500):
        part = sample[i : i + 500]
        marks = ",".join("?" for _ in part)
        rows = db.query(
            f"SELECT hash, video_id FROM fingerprint_index WHERE hash IN ({marks})", part
        )
        by_hash: dict[int, list[str]] = defaultdict(list)
        for r in rows:
            by_hash[r["hash"]].append(r["video_id"])
        for vids in by_hash.values():
            if len(vids) > MAX_HASH_FANIN:
                continue
            for v in vids:
                if v != exclude:
                    counts[v] += 1
    floor = max(3, MIN_HITS // INDEX_MOD // 2)
    return [(v, n) for v, n in counts.most_common(MAX_CANDIDATES) if n >= floor]


Verifier = Callable[[Fingerprint, Match], "Match | None"]


def find_match(
    db: Database,
    video_id: str,
    fp: Fingerprint,
    min_score: float,
    *,
    verify: Verifier | None = None,
) -> tuple[str, Match] | None:
    """Best library item (status done) the fingerprint matches, else None.

    Without `verify` the stored prints decide (`is_match`). With `verify(other, m)` (decodes
    this file again where `other`'s segments lie at the found offset, see `aligned_windows`)
    the best VERIFY_CANDIDATES with at least MIN_HITS aligned hits (and a third of the
    threshold score, partial overlap) are checked, so another
    intro or ending of any length (head or anchors hit once) still matches, and two sets that
    only share a track or an intro do not. The verified match decides; None = not checkable
    (cancelled, decode error), then the stored prints decide."""
    best: tuple[str, Match] | None = None
    checked = 0
    scored: list[tuple[str, Match, Fingerprint]] = []
    for vid, _n in candidates(db, fp, exclude=video_id):
        row = db.get_video(vid)
        if not row or row.get("status") != "done":
            continue
        other = get(db, vid)
        if other is None:
            continue
        scored.append((vid, compare(fp, other), other))
    scored.sort(key=lambda x: x[1].hits, reverse=True)
    for vid, m, other in scored:
        ok = is_match(m, min_score)
        worth = m.hits >= MIN_HITS and m.score >= min_score * VERIFY_SCORE_SHARE
        if verify is not None and worth and checked < VERIFY_CANDIDATES:
            checked += 1
            mv = verify(other, m)
            if mv is not None:
                ok, m = is_verified(mv, min_score, mv.segments), mv
        if ok and (best is None or m.score > best[1].score):
            best = (vid, m)
    return best


def mark(db: Database, newer: str, older: str, m: Match) -> bool:
    """Store «`newer` is a probable re-upload of `older`». A decision the user already made
    for this pair (kept / linked) stays. Returns True if the mark is new or open."""
    row = db.query_one("SELECT * FROM reuploads WHERE video_id=?", (newer,))
    if row and row["of_id"] == older and row["state"] != "open":
        return False
    db.execute(
        "INSERT OR REPLACE INTO reuploads(video_id, of_id, score, offset_s, detected, state) "
        "VALUES (?, ?, ?, ?, ?, 'open')",
        (newer, older, m.score, m.offset_s, now_iso()),
    )
    return True


def _order(db: Database, a: str, b: str) -> tuple[str, str]:
    """(newer, older) by download time (then id) - the later download is the re-upload."""
    ra, rb = db.get_video(a) or {}, db.get_video(b) or {}
    ka = (str(ra.get("downloaded_at") or ""), a)
    kb = (str(rb.get("downloaded_at") or ""), b)
    return (a, b) if ka >= kb else (b, a)


def info_of(db: Database, video_id: str) -> dict[str, Any] | None:
    """`reupload` field of a library/download item: {of: {id, title, platform, channel},
    score (0..1), offset_s, state} or None."""
    row = db.query_one("SELECT * FROM reuploads WHERE video_id=?", (video_id,))
    if not row:
        return None
    other = db.get_video(row["of_id"]) or {}
    return {
        "of": {
            "id": row["of_id"],
            "title": other.get("title") or "",
            "platform": other.get("platform") or platforms.platform_of(row["of_id"]),
            "channel": other.get("channel_name") or "",
            "in_library": other.get("status") == "done",
        },
        "score": row["score"],
        "offset_s": row["offset_s"],
        "state": row["state"],
    }


def reupload_map(db: Database, ids: Iterable[str] | None = None) -> dict[str, dict[str, Any]]:
    """{video_id: info_of(...)} of every mark (or of `ids`), for list views (one query)."""
    rows = db.query(
        "SELECT r.*, v.title AS of_title, v.platform AS of_platform, v.channel_name AS of_channel,"
        " v.status AS of_status FROM reuploads r LEFT JOIN videos v ON v.id = r.of_id"
    )
    wanted = set(ids) if ids is not None else None
    out: dict[str, dict[str, Any]] = {}
    for r in rows:
        if wanted is not None and r["video_id"] not in wanted:
            continue
        out[r["video_id"]] = {
            "of": {
                "id": r["of_id"],
                "title": r.get("of_title") or "",
                "platform": r.get("of_platform") or platforms.platform_of(r["of_id"]),
                "channel": r.get("of_channel") or "",
                "in_library": r.get("of_status") == "done",
            },
            "score": r["score"],
            "offset_s": r["offset_s"],
            "state": r["state"],
        }
    return out


def resolve(db: Database, video_id: str, action: str) -> dict[str, Any]:
    """User decision on a mark: keep (dismiss, keep both) | link (same mix) | open (undo).
    Deleting the new file is `library.delete_item` (the API calls both)."""
    row = db.query_one("SELECT * FROM reuploads WHERE video_id=?", (video_id,))
    if not row:
        return {"ok": False, "error": tr("reupload.not_marked")}
    state = {"keep": "kept", "link": "linked", "open": "open"}.get(str(action))
    if state is None:
        return {"ok": False, "error": tr("reupload.bad_action")}
    db.execute("UPDATE reuploads SET state=? WHERE video_id=?", (state, video_id))
    return {"ok": True, "id": video_id, "state": state, "reupload": info_of(db, video_id)}


# --------------------------------------------------------------------------- items / pass


def _min_score(settings: Any) -> float:
    return float(settings.reupload.min_score) / 100.0


def process(
    db: Database,
    settings: Any,
    video_id: str,
    *,
    cancel: threading.Event | None = None,
    decoder: Callable[..., Any] = decode,
) -> dict[str, Any]:
    """Fingerprint one library item and compare it with the library.
    -> {ok, id, reupload?: {...}, cancelled?, error?}."""
    row = db.get_video(video_id)
    if not row or row.get("status") != "done" or not row.get("file_path"):
        return {"ok": False, "id": video_id, "error": tr("library.not_in_library")}
    path = Path(row["file_path"])
    cfg = settings.reupload
    duration = float(row["duration"]) if row.get("duration") else None
    wins = windows_for(duration, cfg.head_minutes, cfg.windows)
    try:
        if not path.is_file():
            raise FingerprintError(tr("player.file_missing"), permanent=False)
        segs = decoder(path, wins, cancel=cancel)
    except FingerprintError as exc:
        if exc.permanent:
            store_error(db, video_id, str(exc))
        return {"ok": False, "id": video_id, "error": str(exc)}
    if segs is None:
        return {"ok": True, "id": video_id, "cancelled": True}
    fp = compute(segs, duration=duration)
    if cancel is not None and cancel.is_set():
        return {"ok": True, "id": video_id, "cancelled": True}
    if not fp.hashes:
        store_error(db, video_id, tr("reupload.no_audio"))
        return {"ok": False, "id": video_id, "error": tr("reupload.no_audio")}
    if not store(db, video_id, fp):
        return {"ok": False, "id": video_id, "error": tr("library.not_in_library")}
    out: dict[str, Any] = {"ok": True, "id": video_id, "hashes": len(fp.hashes)}

    def verify(other: Fingerprint, m: Match) -> Match | None:
        wins = aligned_windows(other, m.offset_s, duration)
        if not wins:
            return None
        try:
            segs2 = decoder(path, wins, cancel=cancel)
        except FingerprintError:
            return None
        if segs2 is None:
            return None
        mv = compare(compute(segs2, duration=duration), other)
        if abs(mv.offset_s - m.offset_s) > 2 * FRAME_S:
            return Match(segments=len(wins))  # aligned elsewhere: not the same audio here
        mv.segments = len(wins)
        return mv

    found = find_match(db, video_id, fp, _min_score(settings), verify=verify)
    if found:
        other, m = found
        newer, older = _order(db, video_id, other)
        if mark(db, newer, older, m):
            out["reupload"] = {"id": newer, **(info_of(db, newer) or {})}
            log.info(
                tr(
                    "reupload.found",
                    title=(db.get_video(newer) or {}).get("title") or newer,
                    of=(db.get_video(older) or {}).get("title") or older,
                    score=round(m.score * 100),
                )
            )
    return out


def _rows(db: Database) -> list[dict[str, Any]]:
    return db.query(
        "SELECT v.id, v.downloaded_at, f.version, f.created, f.error, f.hashes IS NOT NULL AS ok "
        "FROM videos v LEFT JOIN fingerprints f ON f.video_id = v.id "
        "WHERE v.status = 'done' AND v.file_path IS NOT NULL ORDER BY v.downloaded_at, v.id"
    )


def _needs(r: Mapping[str, Any], scope: str) -> bool:
    if scope == "all":
        return True
    if r.get("version") is None or r["version"] != VERSION:
        return True
    if str(r.get("downloaded_at") or "") > str(r.get("created") or ""):
        return True  # downloaded again since
    return False


def pending(db: Database, *, scope: str = "new") -> list[str]:
    """Items a pass has to fingerprint, oldest download first (so the newer item of a pair
    is the one that finds the older and gets marked)."""
    return [r["id"] for r in _rows(db) if _needs(r, scope)]


def status(db: Database) -> dict[str, Any]:
    rows = _rows(db)
    marks = db.query("SELECT state, COUNT(*) AS n FROM reuploads GROUP BY state")
    by_state = {r["state"]: r["n"] for r in marks}
    return {
        "total": len(rows),
        "fingerprinted": sum(1 for r in rows if r.get("ok") and r.get("version") == VERSION),
        "failed": sum(1 for r in rows if r.get("error")),
        "pending": sum(1 for r in rows if _needs(r, "new")),
        "open": by_state.get("open", 0),
        "kept": by_state.get("kept", 0),
        "linked": by_state.get("linked", 0),
        "last_pass": db.get_state(K_LAST_PASS),
        "ffmpeg": ffmpeg_path().exists(),
    }


def run_pass(
    db: Database,
    settings_provider: Callable[[], Any],
    *,
    scope: str = "new",
    progress: Callable[[dict[str, Any]], None] | None = None,
    cancel: threading.Event | None = None,
    between: Callable[[], None] | None = None,
    item_done: Callable[[dict[str, Any]], None] | None = None,
    decoder: Callable[..., Any] = decode,
) -> dict[str, Any]:
    """Backfill: fingerprint the library one file at a time (low priority), cancellable
    between items and inside ffmpeg."""
    todo = pending(db, scope=scope)
    total = len(todo)
    res = {"ok": True, "total": total, "done": 0, "found": 0, "failed": 0, "cancelled": False}
    if total and decoder is decode and not ffmpeg_path().exists():
        return {**res, "ok": False, "error": tr("analysis.no_ffmpeg")}
    for i, vid in enumerate(todo, 1):
        if between is not None:
            between()
        if cancel is not None and cancel.is_set():
            res["cancelled"] = True
            break
        try:
            r = process(db, settings_provider(), vid, cancel=cancel, decoder=decoder)
        except Exception as exc:
            log.warning("Fingerprint failed: %s", vid, exc_info=True)
            r = {"ok": False, "id": vid, "error": str(exc)}
        if r.get("cancelled"):
            res["cancelled"] = True
            break
        res["done"] = i
        if not r.get("ok"):
            res["failed"] += 1
        if r.get("reupload"):
            res["found"] += 1
        if item_done is not None:
            item_done(r)
        if progress is not None:
            progress({k: res[k] for k in ("done", "total", "found", "failed")})
    if not res["cancelled"]:
        db.set_state(K_LAST_PASS, now_iso())
    return res


K_SINCE = "fingerprint.since"  # first start with v0.10.0


def since_pending(db: Database) -> list[str]:
    """Items downloaded since the first start with v0.10.0 (e.g. by the scheduled headless
    run, which does not decode) without a fingerprint: the GUI queues them after the start.
    Older items are left to the backfill pass the user starts."""
    since = db.get_state(K_SINCE)
    if not since:
        db.set_state(K_SINCE, now_iso())
        return []
    return [
        r["id"]
        for r in _rows(db)
        if str(r.get("downloaded_at") or "") >= since and _needs(r, "new")
    ]
