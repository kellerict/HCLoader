"""Replace directory/file links under a folder by real copies (portable build helper).

`deno install` builds `node_modules` with links (`node_modules/<pkg>` -> `.deno/<pkg>@<v>/...`).
On Windows these are symlinks or junctions with ABSOLUTE targets: after moving the app folder
(USB stick, other drive) they would point to the old place, and ZIP files cannot hold them
anyway. This script copies each link target in place of the link, so the folder works from
anywhere. Standard library only (runs in the embedded Python, `._pth` = isolated mode).

Usage: python materialize_links.py <folder>   -> prints the number of replaced links.
"""

from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path


def is_link(path: Path) -> bool:
    if path.is_symlink():
        return True
    isjunction = getattr(os.path, "isjunction", None)  # Python 3.12+
    return bool(isjunction and isjunction(path))


def _remove_link(path: Path) -> None:
    # junctions and Windows directory symlinks are removed with rmdir (target untouched)
    if os.name == "nt" and (not path.is_symlink() or os.path.isdir(path)):
        try:
            os.rmdir(path)
            return
        except OSError:
            pass
    os.unlink(path)


def _inside(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def materialize(root: Path) -> int:
    """Replace every link below `root` with a copy of its target. Raises on dangling links
    and on links that point to one of their own parent folders (would copy forever)."""
    root = Path(root)
    count = 0
    stack = [root]
    while stack:
        folder = stack.pop()
        with os.scandir(folder) as it:
            entries = sorted(it, key=lambda e: e.name)
        for entry in entries:
            path = Path(entry.path)
            if is_link(path):
                target = Path(os.path.realpath(path))
                if not target.exists():
                    raise RuntimeError(f"Link ohne Ziel: {path} -> {target}")
                if target.is_dir():
                    if _inside(path.parent.resolve(), target):
                        raise RuntimeError(f"Link zeigt auf eigenen Elternordner: {path}")
                    _remove_link(path)
                    shutil.copytree(target, path, symlinks=False)
                    stack.append(path)  # the copy may contain further links of its own
                else:
                    _remove_link(path)
                    shutil.copy2(target, path)
                count += 1
                if count % 50 == 0:
                    print(f"    {count} Links aufgeloest ...", flush=True)
            elif entry.is_dir(follow_symlinks=False):
                stack.append(path)
    return count


def long_path(path: Path) -> Path:
    """Windows: extended-length form (\\\\?\\C:\\...) so copies deep inside node_modules are not
    limited to MAX_PATH (260). Derived paths keep the prefix. No-op elsewhere."""
    if os.name != "nt":
        return path
    text = os.path.abspath(str(path))
    if text.startswith("\\\\?\\"):
        return Path(text)
    if text.startswith("\\\\"):  # UNC share
        return Path("\\\\?\\UNC\\" + text[2:])
    return Path("\\\\?\\" + text)


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("Aufruf: materialize_links.py <Ordner>", file=sys.stderr)
        return 2
    folder = long_path(Path(argv[0]))
    if not folder.is_dir():
        print(f"Ordner fehlt: {folder}", file=sys.stderr)
        return 2
    print(f"    {materialize(folder)} Links aufgeloest (fertig)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
