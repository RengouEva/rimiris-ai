"""Convert the NEW Rimiris logo (613x553, non-square) to all required formats.

Key difference from previous script: source is NOT square anymore.
For square outputs (favicon, PWA icons, apple-touch-icon), we use a
"contain" strategy — fit the entire logo inside a square canvas with
transparent padding, preserving the aspect ratio.

For the navbar `logo.webp`, we keep the original aspect ratio so the
component renders the brand mark at full visual integrity.
"""
import os
import hashlib
from PIL import Image

SRC = "/home/z/my-project/upload/Rimiris logo.png"
PUB = "/home/z/my-project/public"

src = Image.open(SRC).convert("RGBA")
print(f"Source: {src.size} {src.mode}, {os.path.getsize(SRC)/1024:.1f} KB")
print(f"Aspect ratio: {src.width/src.height:.3f} (1.0 = square)")

# ============================================================================
# Helper: fit-contain a source image into a square canvas with transparent pad
# ============================================================================
def fit_to_square(im: Image.Image, size: int, bg=(0, 0, 0, 0)) -> Image.Image:
    """Resize `im` so it fits entirely inside a `size`x`size` square canvas,
    preserving aspect ratio. Padding is transparent (or `bg` if given)."""
    w, h = im.size
    scale = min(size / w, size / h)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))
    resized = im.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg)
    offset = ((size - new_w) // 2, (size - new_h) // 2)
    canvas.paste(resized, offset, resized)
    return canvas

# ============================================================================
# 1. Web logo (WebP, original aspect ratio) — for navbar / welcome hero
# ============================================================================
# Cap the max dimension to 512 for performance; keep aspect ratio
max_dim = 512
w, h = src.size
if max(w, h) > max_dim:
    scale = max_dim / max(w, h)
    logo_web = src.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
else:
    logo_web = src.copy()
logo_web.save(f"{PUB}/logo.webp", "WEBP", quality=92, method=6)
logo_web.save(f"{PUB}/logo.png", "PNG", optimize=True, compress_level=9)
print(f"\nlogo.webp: {os.path.getsize(f'{PUB}/logo.webp')/1024:.1f} KB ({logo_web.size})")
print(f"logo.png : {os.path.getsize(f'{PUB}/logo.png')/1024:.1f} KB ({logo_web.size})")

# ============================================================================
# 2. Favicons (square — fit-contain on transparent)
# ============================================================================
# Multi-res ICO: 16, 32, 48
favicon_sizes = [(16, 16), (32, 32), (48, 48)]
favicon_imgs = [fit_to_square(src, s[0]) for s in favicon_sizes]
favicon_imgs[0].save(
    f"{PUB}/favicon.ico", format="ICO", sizes=favicon_sizes
)
fit_to_square(src, 32).save(f"{PUB}/favicon.png", "PNG", optimize=True)
fit_to_square(src, 16).save(f"{PUB}/favicon-16.png", "PNG", optimize=True)
print(f"favicon.ico: {os.path.getsize(f'{PUB}/favicon.ico')/1024:.1f} KB")
print(f"favicon.png: {os.path.getsize(f'{PUB}/favicon.png')/1024:.1f} KB")

# ============================================================================
# 3. Apple touch icon (180x180 on white bg — iOS convention)
# ============================================================================
apple = fit_to_square(src, 150, bg=(255, 255, 255, 255))
canvas_apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
canvas_apple.paste(apple, (15, 15), apple)
canvas_apple.convert("RGB").save(f"{PUB}/apple-touch-icon.png", "PNG", optimize=True)
canvas_apple.convert("RGB").save(f"{PUB}/icons/apple-touch-icon.png", "PNG", optimize=True)
print(f"apple-touch-icon.png: {os.path.getsize(f'{PUB}/apple-touch-icon.png')/1024:.1f} KB")

# ============================================================================
# 4. PWA icons (192, 512) — exact same source, just resized to square
# ============================================================================
for size in (192, 512):
    fit_to_square(src, size).save(f"{PUB}/icon-{size}.png", "PNG", optimize=True)
    fit_to_square(src, size).save(f"{PUB}/icons/icon-{size}.png", "PNG", optimize=True)
print(f"icon-192.png: {os.path.getsize(f'{PUB}/icon-192.png')/1024:.1f} KB")
print(f"icon-512.png: {os.path.getsize(f'{PUB}/icon-512.png')/1024:.1f} KB")

# ============================================================================
# 5. Maskable PWA icons (extra padding for Android adaptive icons)
# ============================================================================
def make_maskable(src_im, size, pad_pct=0.15):
    """Fit-contain logo inside (1-2*pad)% of the canvas — leaves a safe zone
    so Android's circular/squircle masks don't crop the brand mark."""
    inner_size = int(size * (1 - 2 * pad_pct))
    return fit_to_square(src_im, inner_size)

for size in (192, 512):
    make_maskable(src, size).save(
        f"{PUB}/icon-maskable-{size}.png", "PNG", optimize=True
    )
    make_maskable(src, size).save(
        f"{PUB}/icons/maskable-{size}.png", "PNG", optimize=True
    )
print(f"maskable-192: {os.path.getsize(f'{PUB}/icons/maskable-192.png')/1024:.1f} KB")
print(f"maskable-512: {os.path.getsize(f'{PUB}/icons/maskable-512.png')/1024:.1f} KB")

# ============================================================================
# 6. SVG fallback (vector, file size ~1 KB)
# ============================================================================
svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 613 553" width="613" height="553">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C244F"/>
      <stop offset="100%" stop-color="#145DD6"/>
    </linearGradient>
  </defs>
  <text x="306.5" y="370" font-family="Georgia, serif" font-size="320" font-weight="700"
        text-anchor="middle" fill="url(#g)">R</text>
</svg>
'''
with open(f"{PUB}/icon.svg", "w") as f:
    f.write(svg_content)
with open(f"{PUB}/logo.svg", "w") as f:
    f.write(svg_content)

# ============================================================================
# Verification — confirm favicon matches the source logo
# ============================================================================
fav32 = Image.open(f"{PUB}/favicon.png")
src32 = fit_to_square(src, 32)
fav_hash = hashlib.md5(fav32.tobytes()).hexdigest()[:12]
src_hash = hashlib.md5(src32.tobytes()).hexdigest()[:12]
print(f"\n=== Verification ===")
print(f"favicon.png 32x32 pixel hash: {fav_hash}")
print(f"source 32x32  pixel hash:     {src_hash}")
print(f"Match: {'YES — favicon identical to source logo' if fav_hash == src_hash else 'NO'}")

# Final summary
print(f"\n=== Final synced icon set ===")
files = [
    "favicon.ico", "favicon.png", "favicon-16.png",
    "apple-touch-icon.png",
    "icon-192.png", "icon-512.png",
    "icon-maskable-192.png", "icon-maskable-512.png",
    "icons/icon-192.png", "icons/icon-512.png",
    "icons/maskable-192.png", "icons/maskable-512.png",
    "icons/apple-touch-icon.png",
    "logo.webp", "logo.png",
    "icon.svg", "logo.svg",
]
total = 0
for f in files:
    p = f"{PUB}/{f}"
    if os.path.exists(p):
        s = os.path.getsize(p)
        total += s
        print(f"  {f:35s} {s/1024:8.1f} KB")
print(f"  {'TOTAL':35s} {total/1024:8.1f} KB")
print(f"\nOriginal source was: {os.path.getsize(SRC)/1024:.1f} KB")
print(f"Total reduction: {100*(1-total/os.path.getsize(SRC)):.1f}%")
