from pathlib import Path

import pytest

from app.core import paths
from app.core.config import DEFAULT_CLEANUP_PATTERNS

TEMPLATE = "{genre}/{artist}/{year}/{date} - {title} [{id}]"


def meta(**kw):
    m = {
        "id": "abc123XYZ",
        "title": "Masters of Hardcore 2026 Liveset",
        "artist": "Partyraiser",
        "genre": "Hardcore",
        "upload_date": "20261003",
    }
    m.update(kw)
    return m


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ('a<b>c:d"e/f\\g|h?i*j', "abc-d'e-f-g-hij"),
        ("tab\there\x00x", "tab herex"),
        ("trailing dots...", "trailing dots"),
        ("trailing space   ", "trailing space"),
        ("CON", "_CON"),
        ("nul.txt", "_nul.txt"),
        ("com1", "_com1"),
        ("LPT9", "_LPT9"),
        ("Console", "Console"),
        ("", "_"),
        ("...", "_"),
        ("  a   b  ", "a b"),
        ("Ümläut", "Ümläut"),
    ],
)
def test_sanitize(raw, expected):
    assert paths.sanitize_filename(raw) == expected


def test_clean_title_default_patterns():
    t = "Partyraiser @ MOH (Official Video) [HQ] [Official Audio] (HD)"
    assert paths.clean_title(t, DEFAULT_CLEANUP_PATTERNS) == "Partyraiser @ MOH"
    assert paths.clean_title("(Official Video)", DEFAULT_CLEANUP_PATTERNS) == "(Official Video)"
    assert paths.clean_title("x [bad", ["[unclosed"]) == "x [bad"


def test_parse_artist():
    assert paths.parse_artist_from_title("Partyraiser @ Masters of Hardcore") == "Partyraiser"
    assert paths.parse_artist_from_title("Angerfist - Live Set 2026") == "Angerfist"
    assert paths.parse_artist_from_title("Just a title") is None
    assert paths.parse_artist_from_title("x" * 80 + " - t") is None


def test_normalize_date():
    assert paths.normalize_date("20261003") == "2026-10-03"
    assert paths.normalize_date("2026-10-03T10:00:00") == "2026-10-03"
    assert paths.normalize_date(None) == "" and paths.normalize_date("abc") == ""


def test_build_path_default(tmp_path):
    p = paths.build_target_path(tmp_path, TEMPLATE, meta())
    rel = p.relative_to(tmp_path)
    assert rel.parts == (
        "Hardcore",
        "Partyraiser",
        "2026",
        "2026-10-03 - Masters of Hardcore 2026 Liveset [abc123XYZ].mp3",
    )


def test_build_path_fallbacks_and_unsafe(tmp_path):
    p = paths.build_target_path(
        tmp_path, TEMPLATE, {"id": "i1", "title": 'A/B: "C"', "channel_name": "Chan?"}
    )
    parts = p.relative_to(tmp_path).parts
    assert parts[0] == "Unsortiert" and parts[1] == "Chan" and parts[2] == "0000"
    assert parts[3] == "0000-00-00 - A-B- 'C' [i1].mp3"
    p2 = paths.build_target_path(tmp_path, TEMPLATE, {"id": "i1", "title": "t"})
    assert p2.relative_to(tmp_path).parts[1] == paths.UNKNOWN_ARTIST


def test_title_truncated_to_max_title_length(tmp_path):
    p = paths.build_target_path(tmp_path, TEMPLATE, meta(title="x" * 300), max_title_length=50)
    assert "x" * 50 in p.name and "x" * 51 not in p.name
    assert p.name.endswith("[abc123XYZ].mp3")


def test_path_length_shrinks_title_keeps_id(tmp_path):
    deep = tmp_path / ("d" * 40) / ("e" * 40)
    p = paths.build_target_path(
        deep,
        TEMPLATE,
        meta(title="y" * 200),
        max_title_length=200,
        max_path_length=len(str(deep)) + 80,
    )
    assert len(str(p)) < len(str(deep)) + 80
    assert p.name.endswith("[abc123XYZ].mp3") and "y" * 5 in p.name


def test_path_length_shrinks_artist_when_needed(tmp_path):
    p = paths.build_target_path(
        tmp_path,
        TEMPLATE,
        meta(artist="A" * 120, title="t" * 100),
        max_path_length=len(str(tmp_path)) + 70,
    )
    assert len(str(p)) < len(str(tmp_path)) + 70
    assert p.name.endswith("[abc123XYZ].mp3")


def test_path_too_long_raises(tmp_path):
    with pytest.raises(paths.PathTooLongError):
        paths.build_target_path(tmp_path, TEMPLATE, meta(), max_path_length=len(str(tmp_path)) + 20)


def test_custom_template_and_reserved_segment(tmp_path):
    p = paths.build_target_path(
        tmp_path, "{channel}\\{title} [{id}]", meta(channel_name="CON", title="Mix")
    )
    assert p.relative_to(tmp_path).parts == ("_CON", "Mix [abc123XYZ].mp3")


def test_tmp_dir_and_sibling(tmp_path):
    assert paths.tmp_dir(tmp_path) == tmp_path / ".tmp"
    assert paths.sibling(Path("a/b.mp3"), ".cue") == Path("a/b.cue")


def test_path_length_counts_utf16_units():
    from pathlib import Path

    from app.core.paths import windows_length

    assert windows_length("abc") == 3
    assert windows_length("a😀") == 3  # emoji = surrogate pair = 2 units
    base = Path("C:/Music")
    title = "😀" * 150
    p = paths.build_target_path(
        base, "{title} [{id}]", {"id": "abc123XYZ_-", "title": title}, max_path_length=100
    )
    assert windows_length(p) < 100 and "abc123XYZ_-" in p.name


def test_console_device_names_reserved():
    assert paths.sanitize_filename("CONIN$").startswith("_")
    assert paths.sanitize_filename("conout$.txt").startswith("_")
