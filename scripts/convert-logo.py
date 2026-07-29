"""Convert Rimiris logo to lightweight, optimized formats.

Input:  /home/z/my-project/upload/Rimiris logo.png  (1.39 MB, 1024x1024 RGBA)
Output: /home/z/my-project/public/
  - logo.webp           (WebP lossy, q=90, 512x512)  -> main web logo
  - logo.png            (PNG quantized to 256, 512x512) -> fallback
  - logo-full.webp      (WebP lossless, 1024x1024)   -> high-res when needed
  - favicon.ico         (32x32 multi-res ICO)
  - icon-192.png        (PWA icon)
  - icon-512.png        (PWA icon)
  - icon-maskable-192.png  (PWA maskable, padded)
  - icon-maskable-512.png  (PWA maskable, padded)
  - apple-touch-icon.png   (180x180)
"""
from PIL import Image
import os

SRC = "/home/z/my-project/upload/Rimiris logo.png"
OUT = "/home/z/my-project/public"
os.makedirs(OUT, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
print(f"Source: {img.size} {img.mode}")

def save_webp(im, path, quality=90, lossless=False):
    im.save(path, "WEBP", quality=quality, lossless=lossless, method=6)
    print(f"  {path}: {os.path.getsize(path)/1024:.1f} KB")

def save_png_quantized(im, path, colors=256):
    """Save optimized PNG. Pillow can't write PA mode, so keep RGBA + optimize."""
    im.save(path, "PNG", optimize=True, compress_level=9)
    print(f"  {path}: {os.path.getsize(path)/1024:.1f} KB")

# 1. Main web logo (WebP lossy 512x512) - tiny
logo_512 = img.resize((512, 512), Image.LANCZOS)
save_webp(logo_512, f"{OUT}/logo.webp", quality=92)

# 2. PNG fallback (quantized)
save_png_quantized(logo_512, f"{OUT}/logo.png", colors=128)

# 3. High-res lossless for retina / exports
save_webp(img, f"{OUT}/logo-full.webp", lossless=True)

# 4. Favicon (multi-res ICO: 16, 32, 48)
favicon_sizes = [(16,16), (32,32), (48,48)]
favicon_imgs = [img.resize(s, Image.LANCZOS) for s in favicon_sizes]
favicon_imgs[0].save(
    f"{OUT}/favicon.ico",
    format="ICO",
    sizes=favicon_sizes,
)
print(f"  favicon.ico: {os.path.getsize(f'{OUT}/favicon.ico')/1024:.1f} KB")

# 5. PWA icons
icon_192 = img.resize((192, 192), Image.LANCZOS)
icon_512 = img.resize((512, 512), Image.LANCZOS)
icon_192.save(f"{OUT}/icon-192.png", "PNG", optimize=True)
icon_512.save(f"{OUT}/icon-512.png", "PNG", optimize=True)
print(f"  icon-192.png: {os.path.getsize(f'{OUT}/icon-192.png')/1024:.1f} KB")
print(f"  icon-512.png: {os.path.getsize(f'{OUT}/icon-512.png')/1024:.1f} KB")

# 6. Maskable icons (padded ~20% safe zone so OS can crop to circle/squircle)
def make_maskable(im, size, pad_pct=0.2):
    """Place logo on transparent canvas with padding for safe zone."""
    inner_size = int(size * (1 - 2 * pad_pct))
    logo = im.resize((inner_size, inner_size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    offset = ((size - inner_size) // 2,) * 2
    canvas.paste(logo, offset, logo)
    return canvas

maskable_192 = make_maskable(img, 192)
maskable_512 = make_maskable(img, 512)
maskable_192.save(f"{OUT}/icon-maskable-192.png", "PNG", optimize=True)
maskable_512.save(f"{OUT}/icon-maskable-512.png", "PNG", optimize=True)
print(f"  icon-maskable-192.png: {os.path.getsize(f'{OUT}/icon-maskable-192.png')/1024:.1f} KB")
print(f"  icon-maskable-512.png: {os.path.getsize(f'{OUT}/icon-maskable-512.png')/1024:.1f} KB")

# 7. Apple touch icon (180x180 on solid white bg, since iOS doesn't support alpha here)
apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
apple_logo = img.resize((150, 150), Image.LANCZOS)
apple.paste(apple_logo, (15, 15), apple_logo)
apple.convert("RGB").save(f"{OUT}/apple-touch-icon.png", "PNG", optimize=True)
print(f"  apple-touch-icon.png: {os.path.getsize(f'{OUT}/apple-touch-icon.png')/1024:.1f} KB")

# Summary
print("\n=== Summary ===")
total = 0
for f in sorted(os.listdir(OUT)):
    if f.startswith(('logo', 'icon', 'favicon', 'apple')):
        p = f"{OUT}/{f}"
        s = os.path.getsize(p)
        total += s
        print(f"  {f:35s} {s/1024:8.1f} KB")
print(f"  {'TOTAL':35s} {total/1024:8.1f} KB (was 1390.1 KB)")
print(f"  Reduction: {100*(1-total/1423443):.1f}%")
