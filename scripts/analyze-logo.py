"""Analyze the Rimiris logo to plan conversion strategy."""
from PIL import Image
import os

src = "/home/z/my-project/upload/Rimiris logo.png"
img = Image.open(src)

print(f"Size: {img.size}")
print(f"Mode: {img.mode}")
print(f"Format: {img.format}")
print(f"File size: {os.path.getsize(src)/1024:.1f} KB")

# Check if it has transparency
has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
print(f"Has alpha: {has_alpha}")

# Sample colors - look at corners and center
if img.mode != 'RGBA':
    img = img.convert('RGBA')
px = img.load()
w, h = img.size

# Sample corners
corners = [(0,0), (w-1,0), (0,h-1), (w-1,h-1), (w//2,h//2)]
print("\nSample pixels (R,G,B,A):")
for x,y in corners:
    print(f"  ({x},{y}): {px[x,y]}")

# Find unique colors (sampled - downscale first)
small = img.resize((64,64))
colors = small.getcolors(64*64)
colors.sort(reverse=True)
print(f"\nTop 10 colors in 64x64 sample:")
for count, col in colors[:10]:
    print(f"  {count:5d}x  RGBA{col}")

# Check if mostly transparent
transparent_count = sum(c for c, col in colors if col[3] == 0)
total = 64*64
print(f"\nTransparent pixels: {transparent_count}/{total} ({100*transparent_count/total:.1f}%)")

# Detect if image is mostly single-color (logo-like)
opaque_colors = [(c, col) for c, col in colors if col[3] > 128]
print(f"Distinct opaque colors: {len(opaque_colors)}")
if opaque_colors:
    top = opaque_colors[0]
    total_opaque = sum(c for c,_ in opaque_colors)
    print(f"Most common opaque: {top[1]} ({100*top[0]/total_opaque:.1f}% of opaque)")
