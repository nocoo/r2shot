#!/usr/bin/env python3
"""
Generate a red-tinted "dev" variant of the R2Shot logo.

Selectively rotates blue/cyan hues to red while preserving whites,
dark details (eyes), and alpha transparency.

Usage:
    python3 scripts/generate-dev-logo.py [source] [output]
    Defaults: source=logo.png, output=logo-dev.png
"""

import sys
import colorsys
from PIL import Image
import numpy as np


def hue_shift_to_red(src: str, dst: str) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = np.array(img, dtype=np.float64)

    r, g, b, a = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2], pixels[:, :, 3]

    # Normalize to 0-1
    rn, gn, bn = r / 255.0, g / 255.0, b / 255.0

    # Vectorized RGB -> HSV
    cmax = np.maximum(np.maximum(rn, gn), bn)
    cmin = np.minimum(np.minimum(rn, gn), bn)
    delta = cmax - cmin

    # Hue calculation (0-360)
    hue = np.zeros_like(delta)
    mask_r = (cmax == rn) & (delta > 0)
    mask_g = (cmax == gn) & (delta > 0)
    mask_b = (cmax == bn) & (delta > 0)
    hue[mask_r] = 60.0 * (((gn[mask_r] - bn[mask_r]) / delta[mask_r]) % 6)
    hue[mask_g] = 60.0 * (((bn[mask_g] - rn[mask_g]) / delta[mask_g]) + 2)
    hue[mask_b] = 60.0 * (((rn[mask_b] - gn[mask_b]) / delta[mask_b]) + 4)

    # Saturation (suppress divide-by-zero for fully black pixels)
    with np.errstate(invalid="ignore"):
        sat = np.where(cmax > 0, delta / cmax, 0)
    val = cmax

    # Target: shift cyan/blue hues (120-260) to red range (350-10)
    # Only shift pixels with enough saturation and not too dark/bright
    color_mask = (
        (hue >= 120)
        & (hue <= 260)  # cyan-blue range
        & (sat > 0.08)  # not desaturated (whites)
        & (val > 0.05)  # not black
        & (a > 0)  # not transparent
    )

    # Remap: 120-260 -> 340-10 (red range, wrapping around 0)
    # Linear remap from source range to target range
    src_min, src_max = 120.0, 260.0
    tgt_min, tgt_max = 345.0, 15.0  # wraps around 360

    old_hue = hue[color_mask]
    # Normalize position within source range (0..1)
    t = (old_hue - src_min) / (src_max - src_min)
    # Map to target range (345 -> 360 -> 15), spanning 30 degrees through 0
    new_hue = tgt_min + t * ((tgt_max + 360 - tgt_min) % 360)
    new_hue = new_hue % 360

    hue[color_mask] = new_hue

    # Boost saturation slightly for vibrancy
    sat[color_mask] = np.clip(sat[color_mask] * 1.15, 0, 1)

    # HSV -> RGB
    h60 = hue / 60.0
    hi = np.floor(h60).astype(int) % 6
    f = h60 - np.floor(h60)
    p = val * (1 - sat)
    q = val * (1 - f * sat)
    t_val = val * (1 - (1 - f) * sat)

    ro = np.zeros_like(val)
    go = np.zeros_like(val)
    bo = np.zeros_like(val)

    for i, (rv, gv, bv) in enumerate(
        [
            (val, t_val, p),  # hi == 0
            (q, val, p),  # hi == 1
            (p, val, t_val),  # hi == 2
            (p, q, val),  # hi == 3
            (t_val, p, val),  # hi == 4
            (val, p, q),  # hi == 5
        ]
    ):
        mask = hi == i
        ro[mask] = rv[mask]
        go[mask] = gv[mask]
        bo[mask] = bv[mask]

    result = np.stack(
        [
            np.clip(ro * 255, 0, 255).astype(np.uint8),
            np.clip(go * 255, 0, 255).astype(np.uint8),
            np.clip(bo * 255, 0, 255).astype(np.uint8),
            a.astype(np.uint8),
        ],
        axis=-1,
    )

    out_img = Image.fromarray(result, "RGBA")
    out_img.save(dst, "PNG")
    print(f"Generated {dst}")


if __name__ == "__main__":
    source = sys.argv[1] if len(sys.argv) > 1 else "logo.png"
    output = sys.argv[2] if len(sys.argv) > 2 else "logo-dev.png"
    hue_shift_to_red(source, output)
