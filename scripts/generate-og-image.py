#!/usr/bin/env python3
"""Generate public/og-image.png: stone background with 'Kith' wordmark and tagline.

Uses Pillow to render clean anti-aliased sans-serif text matching the site's aesthetic.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = (0xEF, 0xED, 0xE8)
FG = (0x1C, 0x19, 0x17)
MUTED = (0x78, 0x71, 0x6C)

WORDMARK = "Kith"
TAGLINE = "Some things are too heavy for one person."

HERE = os.path.dirname(os.path.abspath(__file__))
JAKARTA_BOLD = os.path.join(HERE, "fonts", "PlusJakartaSans-Bold.ttf")
JAKARTA_REGULAR = os.path.join(HERE, "fonts", "PlusJakartaSans-Regular.ttf")

FALLBACK_CANDIDATES = [
    "/System/Library/Fonts/HelveticaNeue.ttc",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/SFNS.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]


def load_font(size, bold=False):
    primary = JAKARTA_BOLD if bold else JAKARTA_REGULAR
    if os.path.exists(primary):
        try:
            return ImageFont.truetype(primary, size)
        except OSError:
            pass
    for path in FALLBACK_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            if path.endswith(".ttc"):
                # HelveticaNeue.ttc: 0 Regular, 1 Bold, 10 Medium
                index = 10 if bold else 0
                return ImageFont.truetype(path, size, index=index)
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    print("warning: no truetype font found, falling back to default", file=sys.stderr)
    return ImageFont.load_default()


def draw_centered(draw, text, y, font, fill):
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    x = (W - w) // 2 - bbox[0]
    draw.text((x, y), text, font=font, fill=fill)
    return bbox[3] - bbox[1]


def render(path):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    wordmark_font = load_font(240, bold=True)
    tagline_font = load_font(38, bold=False)

    wm_bbox = draw.textbbox((0, 0), WORDMARK, font=wordmark_font)
    tg_bbox = draw.textbbox((0, 0), TAGLINE, font=tagline_font)

    wm_h = wm_bbox[3] - wm_bbox[1]
    tg_h = tg_bbox[3] - tg_bbox[1]
    spacing = 48
    block_h = wm_h + spacing + tg_h

    y = (H - block_h) // 2 - wm_bbox[1]
    draw_centered(draw, WORDMARK, y, wordmark_font, FG)

    y = (H - block_h) // 2 + wm_h + spacing - tg_bbox[1]
    draw_centered(draw, TAGLINE, y, tagline_font, MUTED)

    img.save(path, "PNG", optimize=True)


if __name__ == "__main__":
    out = os.path.normpath(os.path.join(HERE, "..", "public", "og-image.png"))
    render(out)
    print(f"wrote {out}")
