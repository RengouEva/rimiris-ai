"""
Deploy upload/logoRIMIRIS.png to all required public/ logo formats.

Source: 1024x1024 RGBA with transparent background (87% transparent, 0% white).
Outputs (all preserve alpha, no white background):
  - public/logo.png          (512x461, fit-contain with transparent padding for aspect ratio 1.108)
  - public/logo.webp          (same as above, VP8 lossless-ish)
  - public/icon.svg           (kept as-is — it's already a separate SVG brand asset)
  - public/favicon.png        (32x32)
  - public/favicon-16.png     (16x16)
  - public/favicon.ico        (multi-size: 16, 32, 48)
  - public/apple-touch-icon.png (180x180 — iOS REQUIRES opaque bg, use white)
  - public/icon-192.png       (192x192)
  - public/icon-512.png       (512x512)
  - public/icon-maskable-192.png (192x192, padded 80% safe area)
  - public/icon-maskable-512.png (512x512, padded 80% safe area)
  - public/icons/* (mirror of above)
"""

from PIL import Image, ImageDraw
import shutil
import os

SRC = 'upload/logoRIMIRIS.png'
PUB = 'public'

os.chdir('/home/z/my-project')

src = Image.open(SRC).convert('RGBA')
print(f'Source: {src.size[0]}x{src.size[1]} mode={src.mode}')

# ---------- Logo (non-square, aspect 1.108 = 613/553) ----------
# Original logo file 'upload/Rimiris logo.png' was 613x553, but new source is square 1024x1024.
# Component rimiris-logo.tsx uses aspect ratio 613/553. We need a non-square canvas
# OR we can keep the square logo and update the component to use 1:1 aspect.
#
# Option: keep 1:1 ratio (square). Update the component to use square aspect.
# This is cleaner since the new logo is naturally square.
# Let's produce a 512x512 logo PNG and WebP.

LOGO_SIZE = 512
logo = src.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
logo.save(f'{PUB}/logo.png', 'PNG', optimize=True)
logo.save(f'{PUB}/logo.webp', 'WEBP', quality=95, lossless=False, method=6)
print(f'  logo.png: {logo.size}')
print(f'  logo.webp: {logo.size}')

# ---------- Favicon PNG (32x32 + 16x16) ----------
fav32 = src.resize((32, 32), Image.LANCZOS)
fav32.save(f'{PUB}/favicon.png', 'PNG', optimize=True)
fav16 = src.resize((16, 16), Image.LANCZOS)
fav16.save(f'{PUB}/favicon-16.png', 'PNG', optimize=True)
print(f'  favicon.png + favicon-16.png')

# ---------- Favicon ICO (multi-size) ----------
fav48 = src.resize((48, 48), Image.LANCZOS)
fav32.save(f'{PUB}/favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48)])
# PIL ICO is limited; do it properly by saving each size and combining
# Actually PIL can save ICO with multiple sizes via append_images
img_ico = src.resize((48, 48), Image.LANCZOS)
img_ico.save(
    f'{PUB}/favicon.ico',
    format='ICO',
    sizes=[(16,16),(32,32),(48,48)],
)
print(f'  favicon.ico')

# ---------- Apple Touch Icon (180x180, opaque white bg) ----------
apple = Image.new('RGBA', (180, 180), (255, 255, 255, 255))
apple_img = src.resize((180, 180), Image.LANCZOS)
apple.paste(apple_img, (0, 0), apple_img)
apple.convert('RGB').save(f'{PUB}/apple-touch-icon.png', 'PNG', optimize=True)
print(f'  apple-touch-icon.png (opaque white bg — iOS requirement)')

# ---------- PWA Icons (square, transparent) ----------
def save_icon(size: int, fname: str, maskable: bool = False):
    if maskable:
        # Maskable icons need a "safe zone" of 80% in the center.
        # We create a transparent canvas of `size` and paste the logo
        # scaled to 80% of `size` centered.
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        inner = int(size * 0.80)
        logo_scaled = src.resize((inner, inner), Image.LANCZOS)
        offset = (size - inner) // 2
        canvas.paste(logo_scaled, (offset, offset), logo_scaled)
        canvas.save(f'{PUB}/{fname}', 'PNG', optimize=True)
    else:
        img = src.resize((size, size), Image.LANCZOS)
        img.save(f'{PUB}/{fname}', 'PNG', optimize=True)
    print(f'  {fname}')

save_icon(192, 'icon-192.png')
save_icon(512, 'icon-512.png')
save_icon(192, 'icon-maskable-192.png', maskable=True)
save_icon(512, 'icon-maskable-512.png', maskable=True)

# ---------- Mirror to public/icons/ ----------
for src_name, dst_name in [
    ('icon-192.png', 'icons/icon-192.png'),
    ('icon-512.png', 'icons/icon-512.png'),
    ('icon-maskable-192.png', 'icons/maskable-192.png'),
    ('icon-maskable-512.png', 'icons/maskable-512.png'),
    ('apple-touch-icon.png', 'icons/apple-touch-icon.png'),
]:
    shutil.copy2(f'{PUB}/{src_name}', f'{PUB}/{dst_name}')
    print(f'  mirrored {dst_name}')

# ---------- Verify final alpha ----------
print('\n--- Verification ---')
for f in [
    'public/logo.png', 'public/logo.webp', 'public/favicon.png',
    'public/icon-192.png', 'public/icon-512.png',
    'public/icon-maskable-192.png', 'public/icon-maskable-512.png',
    'public/apple-touch-icon.png',
]:
    img = Image.open(f).convert('RGBA')
    w, h = img.size
    pixels = img.load()
    corners = [pixels[0,0], pixels[w-1,0], pixels[0,h-1], pixels[w-1,h-1]]
    corner_alpha = [c[3] for c in corners]
    has_transparent = 0 in corner_alpha
    is_opaque = all(a == 255 for a in corner_alpha)
    label = 'TRANSPARENT' if has_transparent else ('OPAQUE_WHITE' if is_opaque and corners[0][:3]==(255,255,255) else 'OPAQUE')
    print(f'  {f}: {w}x{h} corners_alpha={corner_alpha} -> {label}')

print('\nDone.')
