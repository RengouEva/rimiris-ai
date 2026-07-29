"""Replace the fake 'R' SVG favicon with a REAL one — the PNG embedded inside
an SVG wrapper. Browsers prefer SVG over PNG/ICO, so this is the favicon
that will actually display in the browser tab.

The PNG is base64-encoded inline, so the SVG is self-contained.
"""
import base64
import os
from PIL import Image

SRC = "/home/z/my-project/upload/Rimiris logo.png"
PUB = "/home/z/my-project/public"

# Optimize the PNG to be embedded (small enough for inline base64)
img = Image.open(SRC).convert("RGBA")

# Create a 256x256 fit-contained version for the favicon SVG
size = 256
w, h = img.size
scale = min(size / w, size / h)
new_w = int(round(w * scale))
new_h = int(round(h * scale))
resized = img.resize((new_w, new_h), Image.LANCZOS)
canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
canvas.paste(resized, ((size - new_w) // 2, (size - new_h) // 2), resized)

# Save optimized PNG to embed
tmp_png = "/tmp/rimiris-favicon-source.png"
canvas.save(tmp_png, "PNG", optimize=True, compress_level=9)
png_size = os.path.getsize(tmp_png)
print(f"Embedded PNG size: {png_size/1024:.1f} KB ({size}x{size})")

# Read as base64
with open(tmp_png, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")

# Build the SVG — embeds the PNG as a base64 data URI
svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <title>Rimiris AI</title>
  <desc>Logo officiel de Rimiris AI, directeur de mémoire académique propulsé par l'IA.</desc>
  <image x="0" y="0" width="{size}" height="{size}"
         xlink:href="data:image/png;base64,{b64}"
         preserveAspectRatio="xMidYMid meet"/>
</svg>
'''

# Write icon.svg (the favicon SVG)
with open(f"{PUB}/icon.svg", "w", encoding="utf-8") as f:
    f.write(svg)

# Write logo.svg too (used by some components as fallback)
with open(f"{PUB}/logo.svg", "w", encoding="utf-8") as f:
    f.write(svg)

svg_size = os.path.getsize(f"{PUB}/icon.svg")
print(f"icon.svg size: {svg_size/1024:.1f} KB (contains real logo, not 'R')")
print(f"logo.svg size: {os.path.getsize(f"{PUB}/logo.svg")/1024:.1f} KB")

# Verify content
with open(f"{PUB}/icon.svg", "r") as f:
    content = f.read()
assert "R</text>" not in content, "Still contains fake R!"
assert "data:image/png;base64," in content, "Missing embedded PNG!"
assert "Rimiris AI" in content, "Missing title!"
print("\n✓ Verified: icon.svg now contains the REAL logo (no fake 'R')")
