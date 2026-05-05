#!/usr/bin/env python3
"""Generate public/og-image.png: stone background with 'Kith' centered.

Uses only the Python standard library so it runs anywhere without setup.
Renders the wordmark from a hand-tuned 5x7 bitmap, scaled up.
"""

import os
import struct
import zlib

W, H = 1200, 630
BG = (245, 241, 234)  # stone / off-white
FG = (42, 42, 42)     # dark

FONT = {
    "K": [
        "X...X",
        "X..X.",
        "X.X..",
        "XX...",
        "X.X..",
        "X..X.",
        "X...X",
    ],
    "i": [
        ".X.",
        "...",
        ".X.",
        ".X.",
        ".X.",
        ".X.",
        ".X.",
    ],
    "t": [
        ".X..",
        ".X..",
        "XXX.",
        ".X..",
        ".X..",
        ".X..",
        "..X.",
    ],
    "h": [
        "X....",
        "X....",
        "X.XX.",
        "XX..X",
        "X...X",
        "X...X",
        "X...X",
    ],
}

TEXT = "Kith"
SCALE = 26
GAP_CELLS = 1


def render():
    widths = [len(FONT[c][0]) for c in TEXT]
    total_cells_w = sum(widths) + GAP_CELLS * (len(TEXT) - 1)
    total_w = total_cells_w * SCALE
    total_h = 7 * SCALE
    x0 = (W - total_w) // 2
    y0 = (H - total_h) // 2

    # Precompute letter horizontal ranges in pixel space.
    ranges = []
    cx = x0
    for ci, ch in enumerate(TEXT):
        w = widths[ci]
        ranges.append((cx, cx + w * SCALE, ch, w))
        cx += w * SCALE + GAP_CELLS * SCALE

    raw = bytearray()
    for y in range(H):
        raw.append(0)  # filter: None
        for x in range(W):
            on = False
            if y0 <= y < y0 + total_h:
                for (lx0, lx1, ch, lw) in ranges:
                    if lx0 <= x < lx1:
                        col = (x - lx0) // SCALE
                        row = (y - y0) // SCALE
                        if FONT[ch][row][col] == "X":
                            on = True
                        break
            r, g, b = FG if on else BG
            raw.append(r); raw.append(g); raw.append(b)
    return bytes(raw)


def png_chunk(typ, data):
    return (
        struct.pack(">I", len(data))
        + typ
        + data
        + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)
    )


def write_png(path, raw):
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(raw, 9)
    blob = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", idat)
        + png_chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(blob)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "public", "og-image.png")
    write_png(os.path.normpath(out), render())
    print(f"wrote {out}")
