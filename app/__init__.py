"""HCLoader package.

`__version__` is the single source of truth for the app version (SemVer `0.x.y`). pyproject.toml
reads it (`[tool.setuptools.dynamic]`), build_portable.ps1 and the self-update parse it, and a
release is the Git tag `v<__version__>` (docs/RELEASING.md).
"""

__version__ = "0.1.0"
