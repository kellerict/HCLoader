"""Review v0.10.0 M2 + QA: re-uploads of another length (extra intro / outro / trimmed) and of
lower quality (gain, low bitrate, low SNR) are found; different sets are not.

Synthetic sets from `test_fingerprint.song`; the fake decoder renders any window of a file, so
the alignment check (second decode at the found offset) runs as in production."""

from __future__ import annotations

import random
from functools import lru_cache
from pathlib import Path

import pytest

from app.core import config, fingerprint
from app.core.db import Database
from tests.test_fingerprint import song

R = fingerprint.RATE
DUR = 1200.0  # a 20-minute set


def _settings():
    s = config.defaults()
    s.reupload.head_minutes = 1
    s.reupload.windows = 4  # 5 and 10 min from the start, 2 and 6 min before the end
    return s


def _degrade(x: list[float], spec: dict, seed: int) -> list[float]:
    rnd = random.Random(seed)
    gain = spec.get("gain", 1.0)
    sigma = spec.get("noise", 0.0)
    q = spec.get("quant", 0)
    lp = spec.get("lowpass", 1)
    out = []
    for i in range(len(x)):
        v = sum(x[max(0, i - k)] for k in range(lp)) / lp if lp > 1 else x[i]
        v = gain * v + (rnd.gauss(0, sigma) if sigma else 0.0)
        if q:
            v = round(v / q) * q
        out.append(max(-32768.0, min(32767.0, v)))
    return out


def render(spec: dict, start: float, length: float) -> list[float]:
    """Samples of file time [start, start+length) of a file whose set audio is song(seed)
    delayed by `shift` s (another intro before; negative = the start is trimmed), with other
    audio after set time `tail_cut` (another ending) and after set time `diverge` (another set
    that only shares the beginning)."""
    seed, shift = spec["seed"], spec.get("shift", 0.0)
    cut = spec.get("tail_cut")
    div = spec.get("diverge")
    x: list[float] = []
    t, end = start, start + length
    while t < end - 1e-9:
        u = t - shift  # set time
        if u < 0:
            n = min(end, shift) - t
            x += song(seed + 999, round(t, 4), round(n, 4))
        elif div is not None and u >= div:
            n = end - t
            x += song(seed + 333, round(u, 4), round(n, 4))
        elif cut is not None and u >= cut:
            n = end - t
            x += song(seed + 555, round(u, 4), round(n, 4))
        else:
            stop = min(x for x in (cut, div) if x is not None) if (cut or div) else None
            n = end - t if stop is None else min(end - t, stop - u)
            x += song(seed, round(u, 4), round(n, 4))
        t += n
    x = x[: int(round(length * R))]
    if any(k in spec for k in ("gain", "noise", "quant", "lowpass")):
        x = _degrade(x, spec, int(start * 10) + seed)
    return x


def decoder_for(specs: dict[str, dict]):
    calls: list[tuple[str, list]] = []

    def decode(path, windows, *, cancel=None):
        calls.append((Path(path).name, list(windows)))
        spec = specs[Path(path).name]
        return [(s, render(spec, s, n)) for s, n in windows]

    decode.calls = calls
    return decode


@lru_cache(maxsize=8)
def _print(seed: int) -> fingerprint.Fingerprint:
    s = _settings().reupload
    wins = fingerprint.windows_for(DUR, s.head_minutes, s.windows)
    return fingerprint.compute([(a, render({"seed": seed}, a, n)) for a, n in wins], duration=DUR)


def _add(db: Database, tmp_path: Path, vid: str, when: str, duration: float) -> str:
    name = f"{vid}.mp3"
    f = tmp_path / name
    f.write_bytes(b"audio")
    db.upsert_video({"id": vid, "title": vid, "duration": duration, "channel_name": "DJ"})
    db.set_status(vid, "done", file_path=str(f))
    db.execute("UPDATE videos SET downloaded_at=? WHERE id=?", (when, vid))
    return name


def _library(db: Database, tmp_path: Path, seeds=(1,)) -> dict[str, dict]:
    """Original sets already fingerprinted (cached prints)."""
    specs = {}
    for i, seed in enumerate(seeds):
        vid = f"orig{seed:05d}x"
        specs[_add(db, tmp_path, vid, f"2026-10-0{1 + i % 9}T10:00:00", DUR)] = {"seed": seed}
        fingerprint.store(db, vid, _print(seed))
    return specs


CASES = {
    # name: (spec of the newer copy, its duration, expected offset s)
    "extra_tail_150s": ({"seed": 1, "tail_cut": DUR}, DUR + 150, 0.0),
    "extra_tail_10min": ({"seed": 1, "tail_cut": DUR}, DUR + 600, 0.0),
    "extra_head_150s": ({"seed": 1, "shift": 150.0}, DUR + 150, 150.0),
    "extra_head_8min": ({"seed": 1, "shift": 480.0}, DUR + 480, 480.0),
    # 40 s more intro (only 20 s of the 1-min head overlap) and 110 s more at the end
    "head_and_tail": ({"seed": 1, "shift": 40.0, "tail_cut": DUR}, DUR + 150, 40.0),
    "trimmed": ({"seed": 1, "shift": -45.0}, DUR - 45 - 60, -45.0),
    "gain_change": ({"seed": 1, "gain": 0.35, "noise": 300.0}, DUR, 0.0),
    "low_bitrate": ({"seed": 1, "lowpass": 3, "quant": 4096, "noise": 1500.0}, DUR, 0.0),
    "low_snr": ({"seed": 1, "noise": 8000.0, "quant": 2048}, DUR, 0.0),  # SNR about -8 dB
    "intro_2s_noisy": ({"seed": 1, "shift": 2.37, "noise": 4000.0, "gain": 0.6}, DUR + 2.37, 2.37),
}


@pytest.mark.parametrize("case", list(CASES))
def test_reupload_of_other_length_or_quality_matches(db, tmp_path, case):
    spec, duration, offset = CASES[case]
    specs = _library(db, tmp_path)
    specs[_add(db, tmp_path, "copy", "2026-11-01T10:00:00", duration)] = spec
    dec = decoder_for(specs)
    res = fingerprint.process(db, _settings(), "copy", decoder=dec)
    mark = res.get("reupload")
    assert mark, f"{case}: no match"
    assert mark["id"] == "copy" and mark["of"]["id"] == "orig00001x"
    assert abs(mark["offset_s"] - offset) < 0.2, mark
    assert mark["score"] >= _settings().reupload.min_score / 100
    # the alignment check decoded the copy where the original's segments lie
    assert len(dec.calls) == 2
    first = dec.calls[1][1][0]
    assert abs(first[0] - max(0.0, offset)) < 0.2


DIFFERENT = {
    "same_intro_then_other_set": ({"seed": 1, "diverge": 90.0}, DUR),
    "same_intro_other_length": ({"seed": 1, "diverge": 90.0}, DUR + 150),
    "other_set": ({"seed": 2}, DUR),
    "other_set_noisy": ({"seed": 3, "noise": 4000.0}, DUR + 150),
}


@pytest.mark.parametrize("case", list(DIFFERENT))
def test_different_sets_do_not_match(db, tmp_path, case):
    spec, duration = DIFFERENT[case]
    specs = _library(db, tmp_path)
    specs[_add(db, tmp_path, "copy", "2026-11-01T10:00:00", duration)] = spec
    res = fingerprint.process(db, _settings(), "copy", decoder=decoder_for(specs))
    assert res["ok"] and "reupload" not in res, res


def test_no_false_positive_on_random_pairs(db, tmp_path):
    """Six unrelated sets, fingerprinted one after the other against each other (15 pairs):
    not one mark, and no stored-print comparison comes near a match."""
    seeds = (11, 12, 13, 14, 15, 16)
    specs = {}
    for i, seed in enumerate(seeds):
        vid = f"rand{seed:05d}x"
        specs[_add(db, tmp_path, vid, f"2026-10-0{i + 1}T10:00:00", DUR)] = {"seed": seed}
    dec = decoder_for(specs)
    for seed in seeds:
        res = fingerprint.process(db, _settings(), f"rand{seed:05d}x", decoder=dec)
        assert res["ok"] and "reupload" not in res
    assert len(dec.calls) == len(seeds)  # never an alignment decode: no candidate got close
    prints = [_print(seed) for seed in seeds]
    for i in range(len(prints)):
        for j in range(i + 1, len(prints)):
            m = fingerprint.compare(prints[i], prints[j])
            # all synthetic sets share the kick and the note grid, so some hits line up;
            # the score stays far below the threshold that triggers the alignment check
            assert m.score < 0.15 * fingerprint.VERIFY_SCORE_SHARE, (i, j, m)
            assert not fingerprint.is_match(m, 0.05)
    assert fingerprint.status(db)["open"] == 0


def test_aligned_windows_maps_and_clips():
    fp = fingerprint.Fingerprint(
        segments=[(0, round(60 / fingerprint.FRAME_S)), (round(300 / fingerprint.FRAME_S), 0)]
    )
    fp.segments[1] = (fp.segments[1][0], fp.segments[1][0] + round(30 / fingerprint.FRAME_S))
    wins = fingerprint.aligned_windows(fp, 150.0, 1350.0)
    assert [round(s) for s, _n in wins] == [150, 450]
    assert round(wins[0][1]) == 60 and round(wins[1][1]) == 30
    # the copy starts 45 s later in the set: the head is clipped at 0
    wins = fingerprint.aligned_windows(fp, -45.0, 1100.0)
    assert wins[0][0] == 0.0 and round(wins[0][1]) == 15
    # a segment beyond the end of a shorter copy is skipped
    assert len(fingerprint.aligned_windows(fp, 0.0, 200.0)) == 1
