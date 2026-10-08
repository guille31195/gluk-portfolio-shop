#!/usr/bin/env python3
"""Build sticker-maker PNGs from the Family A wordmark.

Reads  docs/brand-kit/logo/a-wordmark-gradient.png
Writes docs/brand-kit/stickers/*.png  (transparent corners, 4 in wide @ 600 dpi)

Usage: python3 scripts/build-stickers.py <path-to-Archivo-variable.ttf>
Archivo is the brand display font (used only for the optional @handle line).
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs/brand-kit/logo/a-wordmark-gradient.png"
OUT = ROOT / "docs/brand-kit/stickers"
FONT = sys.argv[1] if len(sys.argv) > 1 else None

BLACK = (30, 22, 25, 255)      # brand black #1E1619
BONE = (241, 238, 232, 255)    # brand bone #F1EEE8
WHITE = (255, 255, 255, 255)
HANDLE = "@gluk______"

W = 2400                       # 4 in @ 600 dpi
PAD = 170
RADIUS = 110
LETTERS_END_X = 1055           # in source px: letters end, rule begins at ~1064


def load_logo(letters):
    im = Image.open(SRC).convert("RGBA")
    im = im.crop(im.split()[3].getbbox())
    cut = LETTERS_END_X - 48
    if letters is not None:
        px = im.load()
        for y in range(im.height):
            for x in range(cut):
                r, g, b, a = px[x, y]
                px[x, y] = (*letters[:3], a)
    return im


def fit(im, width):
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def handle_layer(logo_w, color):
    size = 74
    font = ImageFont.truetype(FONT, size)
    font.set_variation_by_axes([700, 100])  # Archivo axes: wght, wdth
    tmp = Image.new("RGBA", (logo_w, size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    x = 0
    for ch in HANDLE:                       # light tracking
        d.text((x, 0), ch, font=font, fill=color)
        x += d.textlength(ch, font=font) + 6
    return tmp.crop(tmp.getbbox())


def rounded_sticker(bg, letters, with_handle, name):
    logo = fit(load_logo(letters), W - 2 * PAD)
    handle = handle_layer(logo.width, letters) if with_handle else None
    gap = 90
    h = PAD * 2 + logo.height + ((gap + handle.height) if handle else 0)
    mask = Image.new("L", (W, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, h - 1), RADIUS, fill=255)
    card = Image.new("RGBA", (W, h), bg)
    card.alpha_composite(logo, (PAD, PAD))
    if handle:
        # right-aligned under the rule, so the line and the handle read as one thing
        card.alpha_composite(handle, (W - PAD - handle.width, PAD + logo.height + gap))
    card.putalpha(mask)
    card.save(OUT / name, dpi=(600, 600))


def diecut(name, handle=None, border=46):
    """Black wordmark + gradient rule, hugged by a tight white border to cut around.

    handle: optional text set in the empty space above the rule, left-aligned to it.
    """
    margin = border * 3          # room for the blur so the outline is never clipped
    base = load_logo(BLACK)      # cropped to the artwork; rule starts at x=1016, y~296..323
    scale = 1900 / base.width
    logo = fit(base, 1900)
    canvas = Image.new("RGBA", (logo.width + 2 * margin, logo.height + 2 * margin), (0, 0, 0, 0))
    canvas.alpha_composite(logo, (margin, margin))
    if handle:
        font = ImageFont.truetype(FONT, round(100 * scale))
        font.set_variation_by_axes([800, 100])
        d = ImageDraw.Draw(canvas)
        bb = d.textbbox((0, 0), handle, font=font)
        x = margin + round(1016 * scale) - bb[0]
        y = margin + round(262 * scale) - bb[3]      # sits just above the rule
        d.text((x, y), handle, font=font, fill=BLACK)
    a = canvas.split()[3]
    grown = a.filter(ImageFilter.GaussianBlur(border * 0.7)).point(lambda v: 255 if v > 4 else 0)
    grown = grown.filter(ImageFilter.GaussianBlur(14)).point(lambda v: 255 if v > 128 else 0)
    out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    out.paste(WHITE, mask=grown)
    out.alpha_composite(canvas)
    out = out.crop(grown.getbbox())
    out.save(OUT / name, dpi=(600, 600))


OUT.mkdir(parents=True, exist_ok=True)
rounded_sticker(BLACK, BONE, False, "gluk-sticker-1-dark.png")
rounded_sticker(WHITE, BLACK, False, "gluk-sticker-2-light.png")
if FONT:
    rounded_sticker(BLACK, BONE, True, "gluk-sticker-3-dark-handle.png")
    rounded_sticker(WHITE, BLACK, True, "gluk-sticker-4-light-handle.png")
diecut("gluk-sticker-5-diecut.png")
if FONT:
    diecut("gluk-sticker-6-diecut-handle.png", "@gluk")
    diecut("gluk-sticker-7-diecut-handle-full.png", "@gluk______")
print("done")
