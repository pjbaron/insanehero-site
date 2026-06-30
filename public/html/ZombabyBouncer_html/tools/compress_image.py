#!/usr/bin/env python
"""Compress an image for web shipping: downscale to a max dimension and re-encode.

Used by build.js to keep large source art (e.g. the title screen) small in the
shipped build, and to (re)generate the web-ready asset the raw-module dev path
loads. The output format is taken from the destination extension.

Usage:
  python tools/compress_image.py <src> <dest> [--max-dim N] [--quality Q]

No silent fallback: a missing source or unsupported output extension exits non-zero
with a clear message, so the build fails loudly rather than shipping the raw file.
"""
import argparse
import os
import sys

from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dest')
    ap.add_argument('--max-dim', type=int, default=1600,
                    help='longest side is downscaled to at most this many px (never upscaled)')
    ap.add_argument('--quality', type=int, default=82, help='encoder quality for lossy formats')
    a = ap.parse_args()

    if not os.path.isfile(a.src):
        sys.exit('compress_image: source not found: ' + a.src)

    im = Image.open(a.src)
    src_kb = os.path.getsize(a.src) // 1024
    im.thumbnail((a.max_dim, a.max_dim), Image.LANCZOS)   # downscale only; keeps aspect

    ext = os.path.splitext(a.dest)[1].lower()
    out_dir = os.path.dirname(a.dest)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    if ext == '.webp':
        im.save(a.dest, format='WEBP', quality=a.quality, method=6)
    elif ext in ('.jpg', '.jpeg'):
        im.convert('RGB').save(a.dest, format='JPEG', quality=a.quality, optimize=True)
    elif ext == '.png':
        im.save(a.dest, format='PNG', optimize=True)
    else:
        sys.exit('compress_image: unsupported output extension: ' + ext)

    out_kb = os.path.getsize(a.dest) // 1024
    print(f'  compressed {os.path.basename(a.src)} ({src_kb} KB) -> '
          f'{os.path.basename(a.dest)} ({im.size[0]}x{im.size[1]}, {out_kb} KB)')


if __name__ == '__main__':
    main()
