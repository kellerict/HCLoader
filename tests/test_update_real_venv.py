"""Phase 5 acceptance (Wartung): the update button really upgrades yt-dlp inside a venv.

Creates a throw-away venv, installs an old yt-dlp from PyPI and runs `maintenance.run_update`
with that venv's interpreter. Needs PyPI (marker `network`; skipped when it is unreachable, but a
failure with `HCLOADER_REQUIRE_NETWORK=1`, which CI sets).
No YouTube traffic. Run only these: `pytest -m network`; skip them: `pytest -m "not network"`.
"""

import os
import subprocess
import sys
import urllib.request

import pytest

from app.core import maintenance

OLD_YTDLP = "2025.1.15"

pytestmark = pytest.mark.network


@pytest.fixture(scope="module")
def pypi_reachable():
    try:
        urllib.request.urlopen("https://pypi.org/pypi/yt-dlp/json", timeout=8).close()
    except Exception as exc:
        if os.environ.get("HCLOADER_REQUIRE_NETWORK") == "1":  # CI: no silent green
            pytest.fail(f"PyPI nicht erreichbar (HCLOADER_REQUIRE_NETWORK=1): {exc}")
        pytest.skip(f"PyPI nicht erreichbar: {exc}")


def test_update_upgrades_ytdlp_in_a_real_venv(tmp_path, pypi_reachable):
    venv = tmp_path / "venv"
    subprocess.run([sys.executable, "-m", "venv", str(venv)], check=True, timeout=300)
    py = venv / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    subprocess.run(
        [str(py), "-m", "pip", "install", "--disable-pip-version-check", f"yt-dlp=={OLD_YTDLP}"],
        check=True,
        timeout=600,
    )
    before = maintenance.versions_for(py)
    assert before["ytdlp"] == OLD_YTDLP and before["plugin"] is None

    lines: list[str] = []
    res = maintenance.run_update(lines.append, executable=str(py), timeout_s=900)

    assert res["ok"], res.get("error")
    assert res["changed"] is True
    assert maintenance.is_newer(res["ytdlp"], OLD_YTDLP), res["ytdlp"]
    assert res["plugin"], "Plugin wurde nicht mit installiert"
    after = maintenance.versions_for(py)
    assert after["ytdlp"] == res["ytdlp"] and maintenance.is_newer(after["ytdlp"], OLD_YTDLP)
    assert any("yt-dlp" in line for line in lines)
