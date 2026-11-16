"""Collect license texts of all Python packages of the portable build (build helper).

Reads the installed distributions of one site-packages folder, copies their license files to
`<out>/python-packages/<name>-<version>/` and writes THIRD_PARTY_LICENSES.txt: the static
header (non-Python components, see scripts/portable/THIRD_PARTY_LICENSES.header.txt) plus one
line per package (name, version, license as declared in its metadata). Standard library only.

Usage: python collect_licenses.py <site-packages> <licenses-dir> <header-file> <output-file>
"""

from __future__ import annotations

import re
import shutil
import sys
from importlib import metadata
from pathlib import Path

_LICENSE_NAME = re.compile(r"^(licen[cs]e|copying|notice|authors)", re.I)
_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def declared_license(dist: metadata.Distribution) -> str:
    """License-Expression, else a short License field, else the license classifiers."""
    md = dist.metadata
    expr = (md.get("License-Expression") or "").strip()
    if expr:
        return expr
    text = (md.get("License") or "").strip()
    if text and len(text) <= 80 and "\n" not in text:
        return text
    classifiers = [
        c.split("::")[-1].strip()
        for c in (md.get_all("Classifier") or [])
        if c.startswith("License ::")
    ]
    if classifiers:
        return "; ".join(classifiers)
    return "siehe Lizenzdatei" if text else "unbekannt (siehe Paket)"


def license_files(dist: metadata.Distribution) -> list[Path]:
    out = []
    for f in dist.files or []:
        parts = Path(str(f)).parts
        in_info = bool(parts) and parts[0].endswith(".dist-info")
        if in_info and (_LICENSE_NAME.match(Path(str(f)).name) or "licenses" in parts[1:-1]):
            p = Path(str(dist.locate_file(f)))
            if p.is_file():
                out.append(p)
    return out


def collect(site_packages: Path, out_dir: Path) -> list[tuple[str, str, str, int]]:
    """Copy license files; returns [(name, version, license, files copied)] sorted by name."""
    rows = []
    seen = set()
    for dist in metadata.distributions(path=[str(site_packages)]):
        name = dist.metadata.get("Name") or "?"
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        version = dist.version or "?"
        target = out_dir / "python-packages" / _SAFE.sub("_", f"{name}-{version}")
        copied = 0
        for src in license_files(dist):
            target.mkdir(parents=True, exist_ok=True)
            dest = target / src.name
            n = 1
            while dest.exists():
                dest = target / f"{src.stem}-{n}{src.suffix}"
                n += 1
            shutil.copy2(src, dest)
            copied += 1
        rows.append((name, version, declared_license(dist), copied))
    return sorted(rows, key=lambda r: r[0].lower())


def render(header: str, rows: list[tuple[str, str, str, int]]) -> str:
    lines = [header.rstrip(), "", "Python-Pakete (python\\Lib\\site-packages)", "-" * 42]
    for name, version, lic, copied in rows:
        where = "licenses\\python-packages" if copied else "keine Lizenzdatei im Paket"
        lines.append(f"{name} {version}: {lic}  [{where}]")
    return "\r\n".join(lines) + "\r\n"


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        return 2
    site, out_dir, header, output = (Path(a) for a in argv)
    rows = collect(site, out_dir)
    Path(output).write_text(
        render(header.read_text(encoding="utf-8"), rows), encoding="utf-8", newline=""
    )
    print(f"{len(rows)} Pakete")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
