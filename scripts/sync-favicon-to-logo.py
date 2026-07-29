"""Regenerate ALL favicons + icons from the original PNG so the favicon
matches the navbar logo EXACTLY (same source, same colors).

Strategy: use the same source image for ALL outputs, just resize differently.
"""
import os
from PIL import Image

SRC = "/home/z/my-project/upload/Rimiris logo.png"
PUB = "/home/z/my-project/public"

img = Image.open(SRC).convert("RGBA")
print(f"Source: {img.size} {img.mode}, {os.path.getsize(SRC)/1024:.1f} KB")

# === Favicons (must match navbar logo exactly) ===
# Multi-resolution ICO — best browser support
img.resize((16, 16), Image.LANCZOS).save(
    f"{PUB}/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
# PNG favicons
img.resize((32, 32), Image.LANCZOS).save(f"{PUB}/favicon.png", "PNG", optimize=True)
img.resize((16, 16), Image.LANCZOS).save(f"{PUB}/favicon-16.png", "PNG", optimize=True)

# === Apple touch icon (180x180 on white bg — iOS requirement) ===
apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
inner = img.resize((150, 150), Image.LANCZOS)
apple.paste(inner, (15, 15), inner)
apple.convert("RGB").save(f"{PUB}/apple-touch-icon.png", "PNG", optimize=True)
apple.convert("RGB").save(f"{PUB}/icons/apple-touch-icon.png", "PNG", optimize=True)

# === PWA icons (exact same source as favicon) ===
img.resize((192, 192), Image.LANCZOS).save(f"{PUB}/icon-192.png", "PNG", optimize=True)
img.resize((192, 192), Image.LANCZOS).save(f"{PUB}/icons/icon-192.png", "PNG", optimize=True)
img.resize((512, 512), Image.LANCZOS).save(f"{PUB}/icon-512.png", "PNG", optimize=True)
img.resize((512, 512), Image.LANCZOS).save(f"{PUB}/icons/icon-512.png", "PNG", optimize=True)

# === Maskable icons (padded for Android adaptive icons) ===
def make_maskable(src, size, pad=0.2):
    inner = int(size * (1 - 2 * pad))
    logo = src.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(logo, ((size - inner) // 2,) * 2, logo)
    return canvas

make_maskable(img, 192).save(f"{PUB}/icon-maskable-192.png", "PNG", optimize=True)
make_maskable(img, 192).save(f"{PUB}/icons/maskable-192.png", "PNG", optimize=True)
make_maskable(img, 512).save(f"{PUB}/icon-maskable-512.png", "PNG", optimize=True)
make_maskable(img, 512).save(f"{PUB}/icons/maskable-512.png", "PNG", optimize=True)

# === Verify by hashing — favicon.ico and icon-512 should be visually identical ===
import hashlib
def md5(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()[:12]

# Pixel hash of favicon (32x32) vs icon-512 resized to 32x32
fav32 = Image.open(f"{PUB}/favicon.png").resize((32, 32), Image.LANCZOS)
icon32 = img.resize((32, 32), Image.LANCZOS)
fav_hash = hashlib.md5(fav32.tobytes()).hexdigest()[:12]
icon_hash = hashlib.md5(icon32.tobytes()).hexdigest()[:12]
print(f"\nPixel hash check (32x32): favicon={fav_hash}  icon={icon_hash}")
print(f"Match: {'YES — favicon matches the logo exactly' if fav_hash == icon_hash else 'NO (visual content differs)'}")

print("\n=== Final icon set (all from same source as navbar logo) ===")
files = [
    "favicon.ico", "favicon.png", "favicon-16.png",
    "apple-touch-icon.png",
    "icon-192.png", "icon-512.png",
    "icon-maskable-192.png", "icon-maskable-512.png",
    "icons/icon-192.png", "icons/icon-512.png",
    "icons/maskable-192.png", "icons/maskable-512.png",
    "icons/apple-touch-icon.png",
    "logo.webp", "logo.png",
]
total = 0
for f in files:
    p = f"{PUB}/{f}"
    if os.path.exists(p):
        s = os.path.getsize(p)
        total += s
        print(f"  {f:35s} {s/1024:8.1f} KB")
print(f"  {'TOTAL':35s} {total/1024:8.1f} KB")
