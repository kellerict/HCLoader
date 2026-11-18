# ruff: noqa: E501
"""v0.7.0 loudness normalisation + waveform (core/analysis.py, tagging ReplayGain, worker
AnalysisQueue, Api). Core tests never need ffmpeg (the Windows CI has none): ffmpeg is
replaced by fake processes/runners; the one real-ffmpeg test skips without it."""

from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import threading
import time
from array import array
from pathlib import Path

import pytest
from mutagen.id3 import ID3, TIT2, TXXX
from mutagen.mp4 import MP4, MP4FreeForm
from mutagen.oggopus import OggOpus

from app.core import analysis, tagging
from app.core.analysis import Loudness, PeakAccumulator, RunResult
from app.core.config import Settings
from app.worker import AnalysisQueue
from tests.audio_fixtures import make_m4a, make_mp3, make_opus, mp3_audio, mp4_mdat

VID = "abc123XYZ_-"


@pytest.fixture(autouse=True)
def _nothing_in_the_player():
    analysis.set_in_use(None)
    yield
    analysis.set_in_use(None)


# real ffmpeg 6/7 stderr (shortened): frame lines would only appear at -v verbose, the
# summary comes last; the filter instance name varies
EBUR128_STDERR = """\
Input #0, mp3, from 'set.mp3':
  Duration: 01:02:03.45, start: 0.025057, bitrate: 320 kb/s
  Stream #0:0: Audio: mp3 (mp3float), 44100 Hz, stereo, fltp, 320 kb/s
Stream mapping:
  Stream #0:0 -> #0:0 (mp3 (mp3float) -> pcm_s16le (native))
[Parsed_ebur128_0 @ 0x55d0c1a2b3c0] t: 0.0999773  TARGET:-23 LUFS    M:-120.7 S:-120.7     I: -70.0 LUFS       LRA:   0.0 LU  FTPK: -inf dBFS  TPK: -inf dBFS
Output #0, s16le, to 'pipe:':
size=   14544kB time=01:02:03.42 bitrate=  32.0kbits/s speed= 212x
[Parsed_ebur128_0 @ 0x55d0c1a2b3c0] Summary:

  Integrated loudness:
    I:          -7.9 LUFS
    Threshold: -17.9 LUFS

  Loudness range:
    LRA:         4.1 LU
    Threshold: -27.9 LUFS
    LRA low:    -10.4 LUFS
    LRA high:    -6.3 LUFS

  True peak:
    Peak:        1.1 dBFS
"""

LOUDNORM_STDERR = """\
[Parsed_loudnorm_0 @ 0x5602]
{
	"input_i" : "-8.31",
	"input_tp" : "0.42",
	"input_lra" : "5.20",
	"input_thresh" : "-18.53",
	"output_i" : "-23.00",
	"target_offset" : "0.00"
}
"""


# --------------------------------------------------------------------------- parsing


def test_parse_ebur128_summary():
    lo = analysis.parse_ebur128(EBUR128_STDERR)
    assert lo == Loudness(-7.9, 1.1, 4.1)


def test_parse_ebur128_uses_the_last_summary_and_tolerates_crlf():
    text = EBUR128_STDERR.replace("-7.9 LUFS", "-30.0 LUFS") + EBUR128_STDERR
    assert analysis.parse_ebur128(text.replace("\n", "\r\n")).lufs == -7.9


def test_parse_ebur128_silence_and_garbage():
    silent = EBUR128_STDERR.replace("-7.9 LUFS", "-70.0 LUFS").replace("1.1 dBFS", "-inf dBFS")
    assert analysis.parse_ebur128(silent) is None
    assert analysis.parse_ebur128(EBUR128_STDERR.replace("-7.9 LUFS", "-inf LUFS")) is None
    assert analysis.parse_ebur128("") is None
    assert analysis.parse_ebur128("Error opening input file") is None


def test_parse_ebur128_without_true_peak():
    text = EBUR128_STDERR.split("  True peak:")[0]
    assert analysis.parse_ebur128(text) == Loudness(-7.9, None, 4.1)


def test_parse_loudnorm_json():
    assert analysis.parse_ebur128(LOUDNORM_STDERR) == Loudness(-8.31, 0.42, 5.2)
    assert analysis.parse_ebur128(LOUDNORM_STDERR.replace('"-8.31"', '"-inf"')) is None


# --------------------------------------------------------------------------- peaks


def _pcm(samples):
    return array("h", samples).tobytes()


def test_peak_accumulator_blocks_and_odd_chunks():
    data = _pcm([0, 100, -300, 50] * 50 + [1000, -2000] * 100)  # 200 + 200 samples
    acc = PeakAccumulator(block=200)
    for i in range(0, len(data), 7):  # odd chunk sizes split samples across feeds
        acc.feed(data[i : i + 7])
    acc.finish()
    assert acc.blocks == [300, 2000]
    assert acc.samples == 400


def test_peak_accumulator_partial_last_block_and_scale():
    acc = PeakAccumulator(block=4)
    acc.feed(_pcm([32767, 0, 0, 0, -16384]))
    assert acc.result(10) == [255, 128]  # 16384 / 32767 * 255 = 127.5 -> 128


def test_reduce_peaks_takes_bucket_maximum():
    blocks = [0] * 100
    blocks[42] = 32767
    out = analysis.reduce_peaks(blocks, 10)
    assert len(out) == 10
    assert out[4] == 255 and sum(out) == 255
    assert analysis.reduce_peaks([], 10) == []
    assert len(analysis.reduce_peaks(list(range(5000)), 1600)) == 1600


def test_build_command_only_decodes():
    """Never re-encode: no codec, no output file, first audio stream only, low thread count."""
    both = analysis.build_command("ffmpeg", "a b.mp3", loudness=True, peaks=True)
    assert both[-3:] == ["-f", "s16le", "-"]
    assert "ebur128=peak=true:framelog=verbose,aresample=2000," in " ".join(both)
    lo = analysis.build_command("ffmpeg", "x.mp3", loudness=True, peaks=False)
    assert lo[-3:] == ["-f", "null", "-"]
    pk = analysis.build_command("ffmpeg", "x.mp3", loudness=False, peaks=True)
    assert "ebur128" not in " ".join(pk)
    for cmd in (both, lo, pk):
        assert "-c:a" not in cmd and "-acodec" not in cmd and "-y" not in cmd
        assert cmd[cmd.index("-threads") + 1] == "1"
        assert cmd[cmd.index("-map") + 1] == "0:a:0"


class FakeProc:
    def __init__(self, stdout=b"", stderr="", rc=0, hang=False):
        self.stdout = io.BytesIO(stdout)
        self.stderr = io.BytesIO(stderr.encode())
        self.returncode = None
        self._rc = rc
        self.pid = 999999
        self.killed = False
        self._hang = hang
        self._gate = threading.Event()
        if hang:
            outer = self

            class Slow(io.BytesIO):
                def read(self, n=-1):
                    outer._gate.wait(5)
                    return b""

            self.stdout = Slow()

    def kill(self):
        self.killed = True
        self._gate.set()

    def wait(self, timeout=None):
        self.returncode = -9 if self.killed else self._rc
        return self.returncode

    def poll(self):
        return self.returncode


def test_run_ffmpeg_with_fake_process(tmp_path):
    pcm = _pcm([1000, -32767] * 2000)
    calls = []

    def popen(cmd, **kw):
        calls.append((cmd, kw))
        return FakeProc(pcm, EBUR128_STDERR)

    res = analysis.run_ffmpeg(tmp_path / "x.mp3", exe="ffmpeg", popen=popen)
    assert res.loudness == Loudness(-7.9, 1.1, 4.1)
    assert res.samples == 4000 and res.peaks and max(res.peaks) == 255
    assert calls[0][1]["stdin"] == subprocess.DEVNULL


def test_run_ffmpeg_error_and_cancel(tmp_path):
    def bad(cmd, **kw):
        return FakeProc(b"", "x.mp3: Invalid data found when processing input\n", rc=1)

    with pytest.raises(analysis.AnalysisError, match="Invalid data"):
        analysis.run_ffmpeg(tmp_path / "x.mp3", exe="ffmpeg", popen=bad)

    procs = []

    def hang(cmd, **kw):
        procs.append(FakeProc(hang=True))
        return procs[-1]

    cancel = threading.Event()
    threading.Timer(0.3, cancel.set).start()
    t0 = time.monotonic()
    res = analysis.run_ffmpeg(tmp_path / "x.mp3", exe="ffmpeg", popen=hang, cancel=cancel)
    assert res.cancelled and procs[0].killed
    assert time.monotonic() - t0 < 3


def test_run_ffmpeg_missing_binary(tmp_path):
    with pytest.raises(analysis.AnalysisError) as e:
        analysis.run_ffmpeg(tmp_path / "x.mp3", exe=tmp_path / "nope" / "ffmpeg")
    assert e.value.permanent is False


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg missing")
def test_run_ffmpeg_real(tmp_path):
    src = tmp_path / "tone.mp3"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=6"]
        + ["-af", "volume=0.5", str(src)],
        check=True,
    )
    res = analysis.run_ffmpeg(src, exe=shutil.which("ffmpeg"))
    assert res.loudness is not None and -40 < res.loudness.lufs < -15
    assert res.loudness.true_peak is not None
    assert 50 <= len(res.peaks) <= 70 and max(res.peaks) > 5


# --------------------------------------------------------------------------- ReplayGain tags


def test_replaygain_math():
    rg = tagging.replaygain_for(-7.9, 1.1)
    assert rg.gain == -10.1 and rg.peak == pytest.approx(1.135011, abs=1e-6)
    assert rg.lufs == pytest.approx(-7.9)
    assert tagging.format_gain(rg.gain) == "-10.10 dB"
    assert tagging.format_gain(3.0) == "+3.00 dB"
    assert tagging.format_peak(rg.peak) == "1.135011"
    assert tagging.r128_gain(-7.9) == -3866  # (-23 + 7.9) * 256
    assert tagging.r128_gain(-200) == 32767
    assert tagging.parse_gain("-6.48 dB") == -6.48
    assert tagging.parse_gain("+1,5 dB") == 1.5
    assert tagging.parse_gain("loud") is None
    assert tagging.parse_peak("0.98") == 0.98 and tagging.parse_peak("x") is None


def test_mp3_replaygain_keeps_audio_and_other_tags(tmp_path):
    f = make_mp3(tmp_path / "a.mp3")
    tags = ID3()
    tags.add(TIT2(encoding=3, text=["Set"]))
    tags.add(TXXX(encoding=3, desc="replaygain_track_gain", text=["+1.00 dB"]))  # other tool
    tags.save(f)
    before = mp3_audio(f)
    assert tagging.write_replaygain(f, tagging.ReplayGain(-10.1, 1.135011))
    after = ID3(f)
    assert after["TXXX:REPLAYGAIN_TRACK_GAIN"].text == ["-10.10 dB"]
    assert after["TXXX:REPLAYGAIN_TRACK_PEAK"].text == ["1.135011"]
    assert "TXXX:replaygain_track_gain" not in after  # no duplicate in another case
    assert after["TIT2"].text == ["Set"]
    assert mp3_audio(f) == before  # audio untouched
    assert tagging.read_replaygain(f) == tagging.ReplayGain(-10.1, 1.135011)


def test_retag_keeps_replaygain_frames(tmp_path):
    f = make_mp3(tmp_path / "a.mp3")
    tagging.write_tags(f, {"title": "T", "artist": "A", "id": VID})
    tagging.write_replaygain(f, tagging.ReplayGain(-9.0, 0.9))
    tagging.write_tags(f, {"title": "T2", "artist": "A", "id": VID}, keep_existing=True)
    assert tagging.read_replaygain(f) == tagging.ReplayGain(-9.0, 0.9)


def test_m4a_replaygain_atoms(tmp_path):
    f = make_m4a(tmp_path / "a.m4a", mdat=b"AAC-FRAMES" * 10)
    assert tagging.write_replaygain(f, tagging.ReplayGain(-8.25, 0.977237))
    tags = MP4(f).tags
    assert bytes(tags["----:com.apple.iTunes:replaygain_track_gain"][0]) == b"-8.25 dB"
    assert bytes(tags["----:com.apple.iTunes:replaygain_track_peak"][0]) == b"0.977237"
    assert mp4_mdat(f) == b"AAC-FRAMES" * 10
    # foreign upper-case atoms are replaced, not duplicated; reading is case-insensitive
    mp4 = MP4(f)
    del mp4.tags["----:com.apple.iTunes:replaygain_track_gain"]
    mp4.tags["----:com.apple.iTunes:REPLAYGAIN_TRACK_GAIN"] = [MP4FreeForm(b"-1.00 dB")]
    mp4.save()
    assert tagging.read_replaygain(f).gain == -1.0
    tagging.write_replaygain(f, tagging.ReplayGain(-2.0, None))
    keys = [k.lower() for k in MP4(f).tags.keys()]
    assert keys.count("----:com.apple.itunes:replaygain_track_gain") == 1
    assert tagging.read_replaygain(f).gain == -2.0


def test_m4a_tags_and_replaygain_coexist(tmp_path):
    f = make_m4a(tmp_path / "a.m4a")
    tagging.write_tags(f, {"title": "T", "artist": "A", "id": VID})
    tagging.write_replaygain(f, tagging.ReplayGain(-5.0, 1.0))
    tagging.write_tags(f, {"title": "T2", "artist": "A", "id": VID})
    assert MP4(f).tags["\xa9nam"] == ["T2"]
    assert tagging.read_replaygain(f) == tagging.ReplayGain(-5.0, 1.0)


def test_opus_r128_track_gain(tmp_path):
    f = make_opus(tmp_path / "a.opus", audio=b"\xfc\x01\x02\x03")
    assert tagging.write_replaygain(f, tagging.ReplayGain(-10.1, 1.135))
    audio = OggOpus(f)
    assert audio["r128_track_gain"] == ["-3866"]
    assert "replaygain_track_gain" not in audio  # RFC 7845: Opus players use R128 only
    assert OggOpus(f).info.length == pytest.approx(1.0, abs=0.01)
    rg = tagging.read_replaygain(f)
    assert rg.gain == pytest.approx(-10.1, abs=0.01) and rg.peak is None


def test_opus_foreign_replaygain_comment(tmp_path):
    f = make_opus(tmp_path / "a.opus")
    audio = OggOpus(f)
    audio["REPLAYGAIN_TRACK_GAIN"] = ["-4.00 dB"]
    audio["REPLAYGAIN_TRACK_PEAK"] = ["0.5"]
    audio.save()
    assert tagging.read_replaygain(f) == tagging.ReplayGain(-4.0, 0.5)


def test_other_containers_untouched(tmp_path):
    f = tmp_path / "a.webm"
    f.write_bytes(b"\x1a\x45\xdf\xa3webm")
    assert tagging.write_replaygain(f, tagging.ReplayGain(-1.0, 1.0)) is False
    assert f.read_bytes() == b"\x1a\x45\xdf\xa3webm"
    assert tagging.read_replaygain(f) is None
    assert tagging.read_replaygain(make_mp3(tmp_path / "plain.mp3")) is None
    bad = tmp_path / "bad.m4a"
    bad.write_bytes(b"not an mp4")
    assert tagging.read_replaygain(bad) is None


# --------------------------------------------------------------------------- one item / pass


def fake_runner(lufs=-7.9, tp=1.1, values=None, calls=None):
    """Stands in for run_ffmpeg: records (file name, loudness, peaks) per call."""

    def run(path, *, loudness=True, peaks=True, cancel=None, **kw):
        if calls is not None:
            calls.append((Path(path).name, loudness, peaks))
        return RunResult(
            loudness=Loudness(lufs, tp, 3.0) if loudness else None,
            peaks=(values or [10, 200, 255, 30]) if peaks else [],
            samples=7200 * analysis.PEAK_RATE,
        )

    return run


@pytest.fixture
def settings(tmp_path):
    s = Settings()
    s.storage.target_dir = str(tmp_path / "music")
    return s


def add_done(db, path, vid=VID, downloaded_at=None, **kw):
    db.upsert_video({"id": vid, "title": "Mix", "channel_name": "DJ", "duration": 3600, **kw})
    db.set_status(vid, "done", file_path=str(path))
    if downloaded_at:
        db.execute("UPDATE videos SET downloaded_at = ? WHERE id = ?", (downloaded_at, vid))


def test_process_measures_tags_and_caches_peaks(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    calls = []
    res = analysis.process(db, settings, VID, runner=fake_runner(calls=calls))
    assert res["ok"] and res["tagged"] and res["peaks"]
    assert res["loudness"]["gain"] == -10.1 and res["loudness"]["lufs"] == -7.9
    assert calls == [("set.mp3", True, True)]
    row = analysis.get_row(db, VID)
    assert row["lufs"] == -7.9 and row["true_peak"] == 1.1 and row["tagged"] == 1
    assert row["peaks"] == 1 and row["analysed"] and row["error"] is None
    assert tagging.read_replaygain(f).gain == -10.1
    cached = analysis.load_peaks(VID, db.get_video(VID)["downloaded_at"])
    assert cached == {"peaks": [10, 200, 255, 30], "duration": 3600}
    data = json.loads(analysis.peaks_file(VID).read_text())
    assert data["v"] == 1 and data["id"] == VID
    assert analysis.loudness_of(db, VID)["source"] == "analysis"
    # nothing left to do
    assert analysis.pending(db, settings) == []


def test_write_tags_off_measures_only(db, settings, tmp_path):
    settings.loudness.write_tags = False
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    res = analysis.process(db, settings, VID, runner=fake_runner())
    assert res["ok"] and not res["tagged"]
    assert tagging.read_replaygain(f) is None
    assert analysis.pending(db, settings) == []


def test_tag_write_failure_is_retried_without_measuring(db, settings, tmp_path, monkeypatch):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    real = tagging.write_replaygain

    def locked(*a, **kw):
        raise PermissionError("file in use")

    monkeypatch.setattr(tagging, "write_replaygain", locked)
    res = analysis.process(db, settings, VID, runner=fake_runner())
    assert res["ok"] and not res["tagged"]
    assert "file in use" in analysis.get_row(db, VID)["error"]
    todo = analysis.pending(db, settings)
    assert todo == [(VID, {"loudness": False, "tags": True, "peaks": False})]
    monkeypatch.setattr(tagging, "write_replaygain", real)
    calls = []
    res = analysis.run_pass(db, lambda: settings, runner=fake_runner(calls=calls))
    assert res["analysed"] == 1 and calls == []  # tag write only, no decode
    assert analysis.get_row(db, VID)["tagged"] == 1
    assert tagging.read_replaygain(f).gain == -10.1


def test_tag_write_follows_a_moved_file(db, settings, tmp_path):
    """A re-tag may move the file while ffmpeg decodes: the tag write re-reads the path."""
    f = make_mp3(tmp_path / "music" / "old" / "set.mp3")
    moved = tmp_path / "music" / "new" / "set.mp3"
    add_done(db, f)

    def run(path, **kw):
        moved.parent.mkdir(parents=True)
        f.rename(moved)
        db.set_file_path(VID, str(moved))
        return fake_runner()(path, **kw)

    assert analysis.process(db, settings, VID, runner=run)["tagged"]
    assert tagging.read_replaygain(moved).gain == -10.1


def test_unreadable_file_is_not_retried_until_redownload(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f, downloaded_at="2026-01-01T10:00:00+00:00")

    def broken(path, **kw):
        raise analysis.AnalysisError("ffmpeg could not analyse the file: Invalid data")

    res = analysis.process(db, settings, VID, runner=broken)
    assert not res["ok"] and "Invalid data" in res["error"]
    assert analysis.status(db, settings)["failed"] == 1
    assert analysis.pending(db, settings) == []  # looked at, nothing measurable
    assert analysis.pending(db, settings, scope="all")  # «analyse all again» retries
    db.execute(
        "UPDATE videos SET downloaded_at = ? WHERE id = ?", ("2099-01-01T10:00:00+00:00", VID)
    )
    assert analysis.pending(db, settings)[0][1]["loudness"] is True


def test_missing_file_counts_as_temporary(db, settings, tmp_path):
    add_done(db, tmp_path / "music" / "gone.mp3")
    res = analysis.process(db, settings, VID, runner=fake_runner())
    assert not res["ok"]
    assert analysis.get_row(db, VID)["analysed"] is None
    assert analysis.pending(db, settings)  # tried again (e.g. network share back)


def test_redownload_makes_cache_stale(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f, downloaded_at="2026-01-01T10:00:00+00:00")
    analysis.process(db, settings, VID, runner=fake_runner())
    assert analysis.load_peaks(VID, "2026-01-01T10:00:00+00:00")
    assert analysis.load_peaks(VID, "2026-02-01T10:00:00+00:00") is None
    db.execute(
        "UPDATE videos SET downloaded_at = ? WHERE id = ?", ("2099-01-01T10:00:00+00:00", VID)
    )
    assert analysis.pending(db, settings) == [
        (VID, {"loudness": True, "tags": False, "peaks": True})
    ]


def test_waveforms_setting_and_unknown_formats(db, settings, tmp_path):
    settings.loudness.waveforms = False
    f = tmp_path / "music" / "set.webm"
    f.parent.mkdir(parents=True)
    f.write_bytes(b"webm")
    add_done(db, f)
    calls = []
    res = analysis.process_pending(db, settings, VID, runner=fake_runner(calls=calls))
    assert calls == [("set.webm", True, False)]
    assert res["ok"] and not res["tagged"] and res["loudness"]["lufs"] == -7.9
    assert analysis.pending(db, settings) == []  # .webm: nothing to tag, not retried


def test_ensure_peaks_lazy_and_cached(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    calls = []
    res = analysis.ensure_peaks(db, settings, VID, runner=fake_runner(calls=calls))
    assert res["ok"] and res["peaks"] == [10, 200, 255, 30]
    assert calls == [("set.mp3", True, True)]  # loudness measured in the same decode
    res = analysis.ensure_peaks(db, settings, VID, runner=fake_runner(calls=calls))
    assert res["ok"] and len(calls) == 1  # from the cache


def test_damaged_peaks_cache_is_recomputed(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    analysis.process(db, settings, VID, runner=fake_runner())
    analysis.peaks_file(VID).write_text("{broken", encoding="utf-8")
    assert analysis.load_peaks(VID) is None
    assert analysis.ensure_peaks(db, settings, VID, runner=fake_runner())["ok"]


def test_run_pass_progress_cancel_and_between(db, settings, tmp_path):
    for i in range(4):
        add_done(db, make_mp3(tmp_path / "music" / f"{i}.mp3"), vid=f"vid{i:08d}")
    seen, between = [], []
    cancel = threading.Event()

    def runner(path, **kw):
        if Path(path).name == "2.mp3":
            cancel.set()
        return fake_runner()(path, **kw)

    res = analysis.run_pass(
        db,
        lambda: settings,
        progress=seen.append,
        cancel=cancel,
        between=lambda: between.append(1),
        runner=runner,
    )
    assert res["cancelled"] and res["done"] == 3 and res["total"] == 4
    assert [p["done"] for p in seen] == [1, 2, 3]
    assert len(between) == 4  # checked before each item, the 4th is cancelled
    assert db.get_state(analysis.K_LAST_PASS) is None  # a cancelled pass is not «last pass»
    res = analysis.run_pass(db, lambda: settings, runner=fake_runner())
    assert res == {
        "ok": True, "total": 1, "done": 1, "analysed": 1, "failed": 0, "cancelled": False,
    }  # fmt: skip
    assert db.get_state(analysis.K_LAST_PASS)
    st = analysis.status(db, settings)
    assert st["total"] == 4 and st["analysed"] == 4 and st["pending"] == 0


def test_run_pass_without_ffmpeg(db, settings, tmp_path, monkeypatch):
    add_done(db, make_mp3(tmp_path / "music" / "a.mp3"))
    monkeypatch.setattr(analysis, "ffmpeg_path", lambda: tmp_path / "none" / "ffmpeg")
    res = analysis.run_pass(db, lambda: settings)
    assert not res["ok"] and "ffmpeg" in res["error"]
    assert analysis.status(db, settings)["ffmpeg"] is False


def test_since_pending_marks_first_start(db, settings, tmp_path):
    add_done(db, make_mp3(tmp_path / "music" / "a.mp3"), downloaded_at="2020-01-01T00:00:00+00:00")
    assert analysis.since_pending(db, settings) == []  # first start: only remembers the time
    assert db.get_state(analysis.K_SINCE)
    add_done(
        db,
        make_mp3(tmp_path / "music" / "b.mp3"),
        vid="newHeadless1",
        downloaded_at="2099-01-01T00:00:00+00:00",
    )
    assert analysis.since_pending(db, settings) == ["newHeadless1"]


def test_forget_removes_row_and_cache(db, settings, tmp_path):
    add_done(db, make_mp3(tmp_path / "music" / "a.mp3"))
    analysis.process(db, settings, VID, runner=fake_runner())
    analysis.forget(db, VID)
    assert analysis.get_row(db, VID) is None
    assert not analysis.peaks_file(VID).exists()


def test_loudness_from_foreign_tags(db, settings, tmp_path):
    f = make_mp3(tmp_path / "music" / "a.mp3")
    tagging.write_replaygain(f, tagging.ReplayGain(-6.0, 0.891251))
    add_done(db, f)
    lo = analysis.loudness_of(db, VID, f)
    assert lo["source"] == "tags" and lo["lufs"] == -12.0 and lo["true_peak"] == -1.0


# --------------------------------------------------------------------------- worker


class Bus:
    def __init__(self):
        self.events = []
        self.cond = threading.Condition()

    def emit(self, kind, data=None):
        with self.cond:
            self.events.append((kind, data))
            self.cond.notify_all()

    def wait_for(self, pred, timeout=5):
        with self.cond:
            assert self.cond.wait_for(lambda: any(pred(k, d) for k, d in self.events), timeout)

    def of(self, kind):
        return [d for k, d in self.events if k == kind]


def test_analysis_queue_waveform_item_and_pass(db, settings, tmp_path):
    for i in range(3):
        add_done(db, make_mp3(tmp_path / "music" / f"{i}.mp3"), vid=f"vid{i:08d}")
    bus = Bus()
    q = AnalysisQueue(db, lambda: settings, bus, runner=fake_runner())
    try:
        q.request_waveform("vid00000000")
        bus.wait_for(lambda k, d: k == "waveform")
        wf = bus.of("waveform")[0]
        assert wf["id"] == "vid00000000" and wf["ok"] and wf["peaks"]
        q.request("vid00000001")
        bus.wait_for(lambda k, d: k == "media_analysed" and d["id"] == "vid00000001")
        assert q.start_pass("new")
        bus.wait_for(lambda k, d: k == "audio_analysis" and d["phase"] == "done")
        done = bus.of("audio_analysis")[-1]
        # vid0 was fully analysed by the waveform request (same decode), vid1 after «download»
        assert done["total"] == 1 and done["analysed"] == 1 and not done["cancelled"]
        assert bus.of("audio_analysis")[0]["phase"] == "start"
        deadline = time.monotonic() + 5
        while not q.idle() and time.monotonic() < deadline:
            time.sleep(0.02)
        assert q.idle() and not q.pass_running()
    finally:
        q.stop()


def test_analysis_queue_urgent_waveform_between_pass_items(db, settings, tmp_path):
    for i in range(3):
        add_done(db, make_mp3(tmp_path / "music" / f"{i}.mp3"), vid=f"vid{i:08d}")
    bus = Bus()
    order = []
    gate = threading.Event()

    def runner(path, **kw):
        order.append(Path(path).name)
        if len(order) == 1:
            gate.wait(5)
        return fake_runner()(path, **kw)

    q = AnalysisQueue(db, lambda: settings, bus, runner=runner)
    try:
        add_done(db, make_mp3(tmp_path / "music" / "play.mp3"), vid="playing0001")
        db.execute("UPDATE videos SET downloaded_at = '2000-01-01T00:00:00+00:00'")
        # newest download first: the played set comes last in the pass
        db.execute("UPDATE videos SET downloaded_at = '1999-01-01' WHERE id = 'playing0001'")
        q.start_pass("new")
        deadline = time.monotonic() + 5
        while not order and time.monotonic() < deadline:
            time.sleep(0.01)
        q.request_waveform("playing0001")
        gate.set()
        bus.wait_for(lambda k, d: k == "audio_analysis" and d["phase"] == "done")
        # the requested waveform came right after the running file, before the rest
        assert order[1] == "play.mp3"
        assert bus.of("waveform")[0]["id"] == "playing0001"
    finally:
        q.stop()


def test_analysis_queue_cancel_pass(db, settings, tmp_path):
    for i in range(3):
        add_done(db, make_mp3(tmp_path / "music" / f"{i}.mp3"), vid=f"vid{i:08d}")
    bus = Bus()

    def runner(path, *, cancel=None, **kw):
        q.cancel_pass()
        assert cancel.is_set()
        return RunResult(cancelled=True)

    q = AnalysisQueue(db, lambda: settings, bus, runner=runner)
    try:
        q.start_pass("all")
        bus.wait_for(lambda k, d: k == "audio_analysis" and d["phase"] == "done")
        assert bus.of("audio_analysis")[-1]["cancelled"] is True
        assert bus.of("media_analysed") == []
    finally:
        q.stop()


# --------------------------------------------------------------------------- review v0.7.0


def test_timeout_is_not_a_permanent_failure(tmp_path):
    """m3: the hard timeout kills ffmpeg - that is not the file's fault."""
    f = make_mp3(tmp_path / "x.mp3")
    procs = []

    def hang(cmd, **kw):
        procs.append(FakeProc(b"", "killed\n", rc=1, hang=True))
        return procs[-1]

    with pytest.raises(analysis.AnalysisError) as e:
        analysis.run_ffmpeg(f, exe="ffmpeg", popen=hang, timeout=0.2)
    assert procs[0].killed and e.value.permanent is False


def test_ffmpeg_error_on_present_file_is_permanent_vanished_file_is_not(tmp_path):
    """m2: a file moved/deleted while ffmpeg starts is tried again later."""
    f = make_mp3(tmp_path / "x.mp3")

    def bad(cmd, **kw):
        return FakeProc(b"", "Invalid data found when processing input\n", rc=1)

    with pytest.raises(analysis.AnalysisError) as e:
        analysis.run_ffmpeg(f, exe="ffmpeg", popen=bad)
    assert e.value.permanent is True
    with pytest.raises(analysis.AnalysisError) as e:
        analysis.run_ffmpeg(tmp_path / "gone.mp3", exe="ffmpeg", popen=bad)
    assert e.value.permanent is False


def test_exception_in_read_loop_kills_ffmpeg(tmp_path):
    """m4: the finally block never leaves ffmpeg running."""
    procs = []

    class Boom(io.BytesIO):
        def read(self, n=-1):
            raise ValueError("boom")

    def popen(cmd, **kw):
        p = FakeProc()
        p.stdout = Boom()
        procs.append(p)
        return p

    with pytest.raises(ValueError):
        analysis.run_ffmpeg(tmp_path / "x.mp3", exe="ffmpeg", popen=popen)
    assert procs[0].killed


def test_playing_file_is_never_tagged_tag_write_deferred(db, settings, tmp_path):
    """M1: the set loaded in the player is measured, but its tags wait until it is released."""
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    before = f.read_bytes()
    analysis.set_in_use(VID)
    res = analysis.process(db, settings, VID, runner=fake_runner())
    assert res["ok"] and res["tagged"] is False and res["tag_deferred"] is True
    assert f.read_bytes() == before  # not one byte changed under the player
    row = analysis.get_row(db, VID)
    assert row["lufs"] == -7.9 and row["tagged"] == 0 and row["error"] is None
    assert analysis.pending(db, settings) == [
        (VID, {"loudness": False, "tags": True, "peaks": False})
    ]
    # lazy waveform on first play (get_waveform -> ensure_peaks) takes the same path
    assert analysis.ensure_peaks(db, settings, VID, runner=fake_runner())["ok"]
    assert f.read_bytes() == before
    analysis.set_in_use("otherset0001")
    res = analysis.process_pending(db, settings, VID, runner=fake_runner())
    assert res["tagged"] is True and tagging.read_replaygain(f).gain == -10.1


def test_analysis_queue_writes_deferred_tags_after_the_player_released_the_file(
    db, settings, tmp_path
):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    bus = Bus()
    calls = []
    q = AnalysisQueue(db, lambda: settings, bus, runner=fake_runner(calls=calls))
    try:
        q.set_playing(VID)
        q.request_waveform(VID)
        bus.wait_for(lambda k, d: k == "waveform")
        assert analysis.get_row(db, VID)["tagged"] == 0
        assert tagging.read_replaygain(f) is None
        q.set_playing(VID)  # same set again (play/pause): nothing queued
        q.set_playing(None)  # player closed -> deferred tag write, no new decode
        bus.wait_for(lambda k, d: k == "media_analysed" and d.get("tagged"))
        assert len(calls) == 1
        assert analysis.get_row(db, VID)["tagged"] == 1
        assert tagging.read_replaygain(f).gain == -10.1
    finally:
        q.stop()


def test_atomic_tag_write_retries_sharing_violation_then_replaces(tmp_path):
    f = make_mp3(tmp_path / "set.mp3")
    fails = []

    def flaky(src, dst):
        if len(fails) < 2:
            fails.append(1)
            raise PermissionError(32, "being used by another process")
        os.replace(src, dst)

    rg = tagging.ReplayGain(-6.0, 0.9)
    assert tagging.write_replaygain_atomic(f, rg, replace=flaky, sleep=lambda s: None)
    assert len(fails) == 2 and tagging.read_replaygain(f) == rg
    assert list(tmp_path.iterdir()) == [f]  # no temp copy left


def test_atomic_tag_write_gives_up_on_busy_file_and_defers(db, settings, tmp_path, monkeypatch):
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f)
    before = f.read_bytes()

    def busy(src, dst):
        raise PermissionError(32, "being used by another process")

    with pytest.raises(tagging.FileBusyError):
        tagging.write_replaygain_atomic(
            f, tagging.ReplayGain(-1.0, 1.0), replace=busy, sleep=lambda s: None
        )
    assert f.read_bytes() == before and sorted(f.parent.iterdir()) == [f]
    monkeypatch.setattr(tagging, "REPLACE_DELAY_S", 0)
    monkeypatch.setattr(os, "replace", busy)
    monkeypatch.setattr(tagging.time, "sleep", lambda s: None)
    res = analysis.process(db, settings, VID, peaks=False, runner=fake_runner())
    monkeypatch.undo()
    assert res["ok"] and res["tag_deferred"] and not res["tagged"]
    assert analysis.get_row(db, VID)["error"] is None  # busy is not an error
    assert f.read_bytes() == before


def test_prune_peaks_removes_orphans_and_old_downloads(db, settings, tmp_path):
    """m5: waveform cache files of removed items / older downloads are cleaned up."""
    f = make_mp3(tmp_path / "music" / "set.mp3")
    add_done(db, f, downloaded_at="2026-01-01T10:00:00+00:00")
    add_done(db, make_mp3(tmp_path / "music" / "b.mp3"), vid="otherset0001")
    analysis.process(db, settings, VID, runner=fake_runner())
    analysis.process(db, settings, "otherset0001", runner=fake_runner())
    analysis.save_peaks("removedset01", [1, 2], duration=1, stamp="x")
    db.mark_removed("otherset0001")
    assert analysis.prune_peaks(db) == 2
    assert analysis.peaks_file(VID).exists()
    assert not analysis.peaks_file("otherset0001").exists()
    assert not analysis.peaks_file("removedset01").exists()
    db.execute("UPDATE videos SET downloaded_at = '2099-01-01T00:00:00+00:00' WHERE id = ?", (VID,))
    assert analysis.prune_peaks(db) == 1 and not analysis.peaks_file(VID).exists()


def test_main_sets_allow_file_urls_explicitly():
    """M2: file: media + Web Audio in WebView2 must not depend on a pywebview default."""
    from types import SimpleNamespace

    from app import main

    fake = SimpleNamespace(settings={"ALLOW_FILE_URLS": False})
    main.configure_webview(fake)
    assert fake.settings["ALLOW_FILE_URLS"] is True
    main.configure_webview(SimpleNamespace())  # older pywebview without settings: no error
