"""Long-path-safe helpers for the portable build (Windows PowerShell 5.1 cannot handle paths
longer than 260 characters in Get-ChildItem / ZipFile). Standard library only, runs in the
embedded Python.

Usage:
  python portable_tools.py longest <folder>          -> longest path length relative to folder
  python portable_tools.py zip <folder> <zipfile>    -> ZIP with <folder name>/ as top level
"""

from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path


def long_path(path: Path) -> Path:
    """Windows extended-length form (no MAX_PATH limit); no-op elsewhere. Kept local on purpose:
    the embedded Python (._pth, isolated) does not put the script folder on sys.path."""
    if os.name != "nt":
        return path
    text = os.path.abspath(str(path))
    if text.startswith("\\\\?\\"):
        return Path(text)
    if text.startswith("\\\\"):
        return Path("\\\\?\\UNC\\" + text[2:])
    return Path("\\\\?\\" + text)


def iter_files(root: Path):
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in filenames:
            yield Path(dirpath) / name


def longest(root: Path) -> int:
    root = long_path(root)
    base = len(str(root)) + 1
    return max((len(str(p)) - base for p in iter_files(root)), default=0)


def make_zip(root: Path, target: Path) -> int:
    root = long_path(root)
    target = long_path(target)
    top = root.name
    count = 0
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for path in iter_files(root):
            arc = f"{top}/{path.relative_to(root).as_posix()}"
            zf.write(path, arc)
            count += 1
            if count % 1000 == 0:
                print(f"    {count} Dateien gepackt ...", flush=True)
    return count


def main(argv: list[str]) -> int:
    if len(argv) == 2 and argv[0] == "longest":
        print(longest(Path(argv[1])))
        return 0
    if len(argv) == 3 and argv[0] == "zip":
        print(f"    {make_zip(Path(argv[1]), Path(argv[2]))} Dateien gepackt (fertig)")
        return 0
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
