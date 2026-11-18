"""Tiny audio files for tag tests, built in Python (no ffmpeg: the Windows CI has none).

The files are structurally valid for mutagen (headers, tag blocks, duration) but carry no
real audio: enough to prove that tag writes work and never touch the audio payload."""

from __future__ import annotations

import struct
from pathlib import Path

MP3_FRAME = bytes([0xFF, 0xFB, 0x90, 0x00]) + b"\x00" * 413  # MPEG-1 L3, 128k, 44.1 kHz


def _box(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", 8 + len(payload)) + kind + payload


def _full(kind: bytes, version_flags: int, payload: bytes) -> bytes:
    return _box(kind, struct.pack(">I", version_flags) + payload)


def make_mp3(path: Path, frames: int = 20) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(MP3_FRAME * frames)
    return path


def make_m4a(path: Path, mdat: bytes = b"AUDIO-PAYLOAD") -> Path:
    """ftyp + moov (one AAC sound track, 1 s) + mdat."""
    mvhd = _full(b"mvhd", 0, struct.pack(">IIII", 0, 0, 1000, 1000) + b"\0" * 80)
    mdhd = _full(b"mdhd", 0, struct.pack(">IIII", 0, 0, 44100, 44100) + b"\x55\xc4\0\0")
    hdlr = _full(b"hdlr", 0, b"\0" * 4 + b"soun" + b"\0" * 12 + b"\0")
    esds = _full(
        b"esds",
        0,
        bytes([3, 25, 0, 1, 0, 4, 17, 0x40, 0x15])
        + b"\0" * 3
        + struct.pack(">II", 128000, 128000)
        + bytes([5, 2, 0x12, 0x10, 6, 1, 2]),
    )
    mp4a = _box(
        b"mp4a",
        b"\0" * 6
        + struct.pack(">H", 1)
        + b"\0" * 8
        + struct.pack(">HHHHI", 2, 16, 0, 0, 44100 << 16)
        + esds,
    )
    stsd = _full(b"stsd", 0, struct.pack(">I", 1) + mp4a)
    stbl = _box(
        b"stbl",
        stsd
        + _full(b"stts", 0, struct.pack(">I", 0))
        + _full(b"stsc", 0, struct.pack(">I", 0))
        + _full(b"stsz", 0, struct.pack(">II", 0, 0))
        + _full(b"stco", 0, struct.pack(">I", 0)),
    )
    minf = _box(b"minf", _full(b"smhd", 0, b"\0" * 4) + stbl)
    trak = _box(b"trak", _full(b"tkhd", 7, b"\0" * 80) + _box(b"mdia", mdhd + hdlr + minf))
    moov = _box(b"moov", mvhd + trak)
    ftyp = _box(b"ftyp", b"M4A \0\0\0\0M4A mp42isom")
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(ftyp + moov + _box(b"mdat", mdat))
    return path


def make_opus(path: Path, audio: bytes = b"\xfc\xff\xfe") -> Path:
    """Ogg Opus: OpusHead + OpusTags + one audio page (1 s granule)."""
    from mutagen.ogg import OggPage

    head = b"OpusHead" + struct.pack("<BBHIhB", 1, 2, 312, 48000, 0, 0)
    tags = b"OpusTags" + struct.pack("<I", 4) + b"test" + struct.pack("<I", 0)
    out = []
    for i, (data, gran, first, last) in enumerate(
        [(head, 0, True, False), (tags, 0, False, False), (audio, 48312, False, True)]
    ):
        page = OggPage()
        page.serial = 1
        page.sequence = i
        page.position = gran
        page.first = first
        page.last = last
        page.packets = [data]
        out.append(page.write())
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"".join(out))
    return path


def mp3_audio(path: Path) -> bytes:
    """Audio payload of an MP3 (everything after the ID3v2 tag)."""
    data = Path(path).read_bytes()
    if data[:3] == b"ID3":
        size = 0
        for b in data[6:10]:
            size = (size << 7) | (b & 0x7F)
        data = data[10 + size :]
    return data


def mp4_mdat(path: Path) -> bytes:
    data = Path(path).read_bytes()
    i = data.index(b"mdat")
    (size,) = struct.unpack(">I", data[i - 4 : i])
    return data[i + 4 : i - 4 + size]
