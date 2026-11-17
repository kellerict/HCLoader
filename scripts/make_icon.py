"""Build the app icon files from ``ui/img/icon.svg``.

Renders the icon with Playwright/Chromium (offline, same launcher as ``ui_screenshots.py``) and
writes

* ``ui/img/hcloader.ico`` - multi-size ICO (16, 20, 24, 32, 40, 48, 64, 128, 256 px),
* ``ui/img/icon-32.png``, ``icon-192.png``, ``icon-512.png`` - favicon / previews.

Only the standard library plus Playwright is used (no Pillow): the pixels come from a canvas in
the browser, PNG and ICO are assembled with ``zlib``/``struct``.

Sizes with a layout in ``HINTS`` are not scaled down from the master SVG but drawn from a
simplified SVG on an integer pixel grid (same design, stems and gaps in whole pixels), so the
icon stays sharp in the title bar and the taskbar.

ICO entries below 256 px are classic 32-bit DIBs (readable by every consumer, including
``System.Drawing.Icon``), the 256 px entry is a PNG (Windows Vista+).

Usage:
    python scripts/make_icon.py [--png-dir DIR] [--check]

``--png-dir DIR`` additionally writes every ICO size as PNG (to look at them), ``--check`` only
reads the existing ICO and prints its entries.
"""

from __future__ import annotations

import argparse
import base64
import struct
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "ui" / "img"
MASTER = IMG / "icon.svg"
ICO = IMG / "hcloader.ico"
ICO_SIZES = (16, 20, 24, 32, 40, 48, 64, 128, 256)
PNG_SIZES = (32, 192, 512)  # committed: favicon + previews

BG, LINE, TRACK = "#08080a", "#34343d", "#2c2c34"
WHITE, RED, ACID = "#ececf0", "#ff1f1f", "#b6ff00"

# Pixel layouts for the small sizes. Per size:
#   stem   width of the letter stems (and of the bars of the C)
#   inner  gap inside a letter       gap     gap between H and C
#   top    first letter row          height  letter height     cross  H crossbar thickness
#   vgap   gap letters -> bar        bar     bar thickness     cut    chamfer of the C
#   radius corner radius             frame   1 px border + red haze (too noisy at 16 px)
# The left/right margin follows from the width; (height - cross) must be even.
_FIELDS = (
    "stem",
    "inner",
    "gap",
    "top",
    "height",
    "cross",
    "vgap",
    "bar",
    "cut",
    "radius",
    "frame",
)
HINTS: dict[int, dict[str, int]] = {
    n: dict(zip(_FIELDS, row, strict=True))
    for n, row in {
        16: (2, 2, 2, 1, 10, 2, 2, 2, 1, 2, 0),
        20: (2, 3, 2, 2, 12, 2, 2, 2, 1, 2, 1),
        24: (3, 3, 2, 2, 15, 3, 2, 3, 1, 2, 1),
        40: (5, 4, 4, 5, 23, 5, 3, 4, 2, 4, 1),
        48: (6, 4, 6, 6, 26, 6, 5, 5, 3, 4, 1),
    }.items()
}


def hinted_svg(n: int) -> str:
    """Simplified icon for ``n`` px with every edge on a whole pixel."""
    p = HINTS[n]
    s, i, g, t, h, c = p["stem"], p["inner"], p["gap"], p["top"], p["height"], p["cross"]
    w = 2 * s + i  # letter width
    margin, odd = divmod(n - 2 * w - g, 2)
    arm, odd_h = divmod(h - c, 2)
    if odd or odd_h or margin < 1:
        raise ValueError(f"HINTS[{n}] liegt nicht auf dem Pixelraster")
    x, x2, cut = margin, margin + w + g, p["cut"]
    bar_y = t + h + p["vgap"]
    bar_w = n - 2 * margin
    done = round(bar_w * 18 / 26)  # same share as in the master SVG
    if bar_y + p["bar"] > n - 1:
        raise ValueError(f"HINTS[{n}]: Balken ragt über den Rand")
    frame = ""
    if p["frame"]:
        r = p["radius"]
        frame = (
            '<defs><radialGradient id="haze" cx="0.15" cy="1" r="1">'
            f'<stop offset="0" stop-color="{RED}" stop-opacity=".34"/>'
            f'<stop offset=".65" stop-color="{RED}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="{n}" height="{n}" rx="{r}" fill="url(#haze)"/>'
            f'<rect x=".5" y=".5" width="{n - 1}" height="{n - 1}" rx="{r - 0.5}" '
            f'fill="none" stroke="{LINE}"/>'
        )
    h_path = f"M{x} {t}h{s}v{arm}h{i}v{-arm}h{s}v{h}h{-s}v{-arm}h{-i}v{arm}h{-s}z"
    c_path = (
        f"M{x2 + cut} {t}h{w - cut}v{s}h{-(w - s)}v{h - 2 * s}h{w - s}v{s}h{-(w - cut)}"
        f"l{-cut} {-cut}v{-(h - 2 * cut)}z"
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}">'
        f'<rect width="{n}" height="{n}" rx="{p["radius"]}" fill="{BG}"/>{frame}'
        f'<path fill="{WHITE}" d="{h_path}"/><path fill="{RED}" d="{c_path}"/>'
        f'<rect x="{x}" y="{bar_y}" width="{bar_w}" height="{p["bar"]}" fill="{TRACK}"/>'
        f'<rect x="{x}" y="{bar_y}" width="{done}" height="{p["bar"]}" fill="{ACID}"/>'
        "</svg>"
    )


def svg_for(n: int) -> str:
    return hinted_svg(n) if n in HINTS else MASTER.read_text(encoding="utf-8")


# -- rendering ---------------------------------------------------------------
_RENDER_JS = """
async ([uri, n]) => {
  const img = new Image();
  await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('svg')); img.src = uri; });
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, n, n);
  const d = ctx.getImageData(0, 0, n, n).data;
  let s = '';
  for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000));
  return btoa(s);
}
"""  # noqa: E501


def render(sizes: tuple[int, ...]) -> dict[int, bytes]:
    """RGBA pixels (top-down, not premultiplied) per size."""
    from playwright.sync_api import sync_playwright

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from ui_screenshots import launch

    out: dict[int, bytes] = {}
    with sync_playwright() as pw:
        browser = launch(pw)
        try:
            page = browser.new_page(viewport={"width": 64, "height": 64}, device_scale_factor=1)
            for n in sizes:
                svg = svg_for(n).replace("<svg ", f'<svg width="{n}" height="{n}" ', 1)
                uri = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
                rgba = base64.b64decode(page.evaluate(_RENDER_JS, [uri, n]))
                if len(rgba) != n * n * 4:
                    raise SystemExit(f"{n}px: unerwartete Pixelmenge ({len(rgba)})")
                out[n] = rgba
        finally:
            browser.close()
    return out


# -- encoders ----------------------------------------------------------------
PNG_SIG = b"\x89PNG\r\n\x1a\n"


def png_bytes(n: int, rgba: bytes) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)

    row = n * 4
    raw = b"".join(b"\x00" + rgba[y * row : (y + 1) * row] for y in range(n))
    return (
        PNG_SIG
        + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def dib_bytes(n: int, rgba: bytes) -> bytes:
    """ICO image as 32-bit DIB: BITMAPINFOHEADER (double height), BGRA bottom-up, AND mask."""
    row = n * 4
    xor = bytearray()
    for y in range(n - 1, -1, -1):
        line = bytearray(rgba[y * row : (y + 1) * row])
        line[0::4], line[2::4] = line[2::4], line[0::4]  # RGBA -> BGRA
        xor += line
    mask_row = ((n + 31) // 32) * 4
    mask = bytearray()
    for y in range(n - 1, -1, -1):
        bits = bytearray(mask_row)
        for x in range(n):
            if rgba[(y * n + x) * 4 + 3] == 0:  # fully transparent
                bits[x // 8] |= 0x80 >> (x % 8)
        mask += bits
    header = struct.pack("<IiiHHIIiiII", 40, n, 2 * n, 1, 32, 0, len(xor) + len(mask), 0, 0, 0, 0)
    return header + bytes(xor) + bytes(mask)


def ico_bytes(images: dict[int, bytes]) -> bytes:
    """ICONDIR + ICONDIRENTRYs + image data. Width/height byte 0 means 256."""
    sizes = sorted(images)
    blobs = [png_bytes(n, images[n]) if n >= 256 else dib_bytes(n, images[n]) for n in sizes]
    offset = 6 + 16 * len(sizes)
    out = struct.pack("<HHH", 0, 1, len(sizes))
    for n, blob in zip(sizes, blobs, strict=True):
        dim = 0 if n >= 256 else n
        out += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(blob), offset)
        offset += len(blob)
    return out + b"".join(blobs)


def read_ico(data: bytes) -> list[dict]:
    """Parse an ICO and validate every entry against its image data (self-test)."""
    reserved, kind, count = struct.unpack_from("<HHH", data, 0)
    if reserved != 0 or kind != 1 or count < 1:
        raise ValueError("kein ICO-Header")
    entries = []
    for i in range(count):
        w, h, colors, res, planes, bpp, size, offset = struct.unpack_from(
            "<BBBBHHII", data, 6 + 16 * i
        )
        w, h = w or 256, h or 256
        if res != 0 or offset + size > len(data) or offset < 6 + 16 * count:
            raise ValueError(f"Eintrag {i}: ungültige Lage/Grösse")
        blob = data[offset : offset + size]
        if blob.startswith(PNG_SIG):
            fmt = "PNG"
            iw, ih, depth, ctype = struct.unpack_from(">IIBB", blob, 16)
            zlib.decompress(_png_idat(blob))
            if (depth, ctype) != (8, 6):
                raise ValueError(f"Eintrag {i}: PNG nicht RGBA/8")
        else:
            fmt = "DIB"
            hsize, iw, ih2, _planes, ibpp, comp = struct.unpack_from("<IiiHHI", blob, 0)
            ih = ih2 // 2
            expect = 40 + iw * ih * 4 + ((iw + 31) // 32) * 4 * ih
            if hsize != 40 or ibpp != 32 or comp != 0 or ih2 != 2 * ih or size != expect:
                raise ValueError(f"Eintrag {i}: DIB-Header passt nicht")
        if (iw, ih) != (w, h) or planes != 1 or bpp != 32:
            raise ValueError(f"Eintrag {i}: Verzeichnis {w}x{h} != Bild {iw}x{ih}")
        entries.append({"size": w, "format": fmt, "bytes": size, "offset": offset})
    return entries


def _png_idat(blob: bytes) -> bytes:
    pos, idat = 8, b""
    while pos < len(blob):
        (length,) = struct.unpack_from(">I", blob, pos)
        kind = blob[pos + 4 : pos + 8]
        body = blob[pos + 8 : pos + 8 + length]
        (crc,) = struct.unpack_from(">I", blob, pos + 8 + length)
        if crc != zlib.crc32(kind + body) & 0xFFFFFFFF:
            raise ValueError("PNG: CRC falsch")
        if kind == b"IDAT":
            idat += body
        pos += 12 + length
    return idat


def check(path: Path = ICO) -> list[dict]:
    entries = read_ico(path.read_bytes())
    print(f"{path.relative_to(ROOT) if path.is_relative_to(ROOT) else path}:")
    for e in entries:
        print(f"  {e['size']:>3} x {e['size']:<3}  {e['format']}  {e['bytes']:>7} Bytes")
    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--png-dir", type=Path, help="alle ICO-Grössen zusätzlich als PNG ablegen")
    parser.add_argument("--check", action="store_true", help="nur die vorhandene ICO prüfen")
    args = parser.parse_args()
    if not args.check:
        images = render(tuple(sorted({*ICO_SIZES, *PNG_SIZES})))
        IMG.mkdir(parents=True, exist_ok=True)
        ICO.write_bytes(ico_bytes({n: images[n] for n in ICO_SIZES}))
        for n in PNG_SIZES:
            (IMG / f"icon-{n}.png").write_bytes(png_bytes(n, images[n]))
            print(f"ui/img/icon-{n}.png")
        if args.png_dir:
            args.png_dir.mkdir(parents=True, exist_ok=True)
            for n in ICO_SIZES:
                (args.png_dir / f"icon-{n}.png").write_bytes(png_bytes(n, images[n]))
    sizes = [e["size"] for e in check()]
    if sizes != list(ICO_SIZES):
        print(f"FEHLER: erwartet {list(ICO_SIZES)}, gefunden {sizes}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
