"""Sync the freshly-converted Rimiris logo into ALL the locations the app references."""
import os
from PIL import Image

SRC = "/home/z/my-project/upload/Rimiris logo.png"
PUB = "/home/z/my-project/public"

img = Image.open(SRC).convert("RGBA")

# 1. /favicon.png  (32x32 — used in layout.tsx as main icon)
img.resize((32, 32), Image.LANCZOS).save(f"{PUB}/favicon.png", "PNG", optimize=True)
# 2. /favicon-16.png
img.resize((16, 16), Image.LANCZOS).save(f"{PUB}/favicon-16.png", "PNG", optimize=True)
# 3. /favicon.ico  (multi-res: 16, 32, 48)
img.resize((16,16), Image.LANCZOS).save(
    f"{PUB}/favicon.ico", format="ICO",
    sizes=[(16,16),(32,32),(48,48)]
)

# 4. /icons/icon-192.png + /icon-512.png
img.resize((192,192), Image.LANCZOS).save(f"{PUB}/icons/icon-192.png", "PNG", optimize=True)
img.resize((512,512), Image.LANCZOS).save(f"{PUB}/icons/icon-512.png", "PNG", optimize=True)

# 5. /icons/maskable-*.png — padded safe zone
def make_maskable(src, size, pad=0.2):
    inner = int(size * (1 - 2*pad))
    logo = src.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0,0,0,0))
    canvas.paste(logo, ((size-inner)//2,)*2, logo)
    return canvas
make_maskable(img, 192).save(f"{PUB}/icons/maskable-192.png", "PNG", optimize=True)
make_maskable(img, 512).save(f"{PUB}/icons/maskable-512.png", "PNG", optimize=True)

# 6. /icons/apple-touch-icon.png (180x180 on white bg)
apple = Image.new("RGBA", (180,180), (255,255,255,255))
apple.paste(img.resize((150,150), Image.LANCZOS), (15,15), img.resize((150,150), Image.LANCZOS))
apple.convert("RGB").save(f"{PUB}/icons/apple-touch-icon.png", "PNG", optimize=True)

# 7. SVG fallback (simple version — colored rounded square with R)
# Since the original PNG has gradients, we keep PNG as primary, but provide SVG
# for browsers that prefer it. We use a simple R mark.
svg_content = '''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C244F"/>
      <stop offset="100%" stop-color="#145DD6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <text x="256" y="340" font-family="Georgia, serif" font-size="280" font-weight="700"
        text-anchor="middle" fill="#ffffff">R</text>
</svg>
'''
with open(f"{PUB}/icon.svg", "w") as f:
    f.write(svg_content)
with open(f"{PUB}/logo.svg", "w") as f:
    f.write(svg_content)

# Report
print("=== Final synced icon set ===")
for fname in sorted(os.listdir(PUB)):
    fpath = f"{PUB}/{fname}"
    if os.path.isfile(fpath) and any(fname.endswith(ext) for ext in ('.png','.ico','.svg','.webp')):
        print(f"  {fname:40s} {os.path.getsize(fpath)/1024:8.1f} KB")
print("\n/icons/")
for fname in sorted(os.listdir(f"{PUB}/icons")):
    fpath = f"{PUB}/icons/{fname}"
    if os.path.isfile(fpath):
        print(f"  {fname:40s} {os.path.getsize(fpath)/1024:8.1f} KB")
