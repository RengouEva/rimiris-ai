"""
Deploy upload/rimiris-logo-original.png (TRULY transparent) to all public/ formats.

Source: 1024x1024 RGBA, 87% transparent, 0% white. Verified.
This script NEVER adds a white background. Output preserves alpha channel.

Outputs:
  - public/logo.png          (512x512, transparent)
  - public/logo.webp          (512x512, transparent)
  - public/favicon.png        (32x32, transparent)
  - public/favicon-16.png     (16x16, transparent)
  - public/favicon.ico        (multi-size, transparent)
  - public/apple-touch-icon.png (180x180, opaque white bg — iOS requirement only)
  - public/icon-192.png       (192x192, transparent)
  - public/icon-512.png       (512x512, transparent)
  - public/icon-maskable-192.png (192x192, transparent, 80% safe zone)
  - public/icon-maskable-512.png (512x512, transparent, 80% safe zone)
  - public/icons/* (mirror of above)
"""

from PIL import Image
import shutil
import os

SRC = 'upload/rimiris-logo-original.png'
PUB = 'public'

os.chdir('/home/z/my-project')

src = Image.open(SRC).convert('RGBA')
print(f'Source: {src.size[0]}x{src.size[1]} mode={src.mode}')

# Verify source has transparent corners (otherwise abort)
w, h = src.size
pixels = src.load()
corner_alphas = [pixels[0,0][3], pixels[w-1,0][3], pixels[0,h-1][3], pixels[w-1,h-1][3]]
assert all(a == 0 for a in corner_alphas), f'Source must have transparent corners, got {corner_alphas}'
print(f'  Source corners alpha = {corner_alphas} ✅ transparent')

# ---------- Logo 512x512 transparent ----------
LOGO_SIZE = 512
logo = src.resize((LOGO_SIZE, LOGO_SIZE), Image.LANCZOS)
logo.save(f'{PUB}/logo.png', 'PNG', optimize=True)
logo.save(f'{PUB}/logo.webp', 'WEBP', quality=95, lossless=False, method=6)
print(f'  logo.png + logo.webp: {logo.size}')

# ---------- Favicon PNG (transparent) ----------
fav32 = src.resize((32, 32), Image.LANCZOS)
fav32.save(f'{PUB}/favicon.png', 'PNG', optimize=True)
fav16 = src.resize((16, 16), Image.LANCZOS)
fav16.save(f'{PUB}/favicon-16.png', 'PNG', optimize=True)
print(f'  favicon.png + favicon-16.png')

# ---------- Favicon ICO (multi-size, transparent) ----------
img_ico = src.resize((48, 48), Image.LANCZOS)
img_ico.save(
    f'{PUB}/favicon.ico',
    format='ICO',
    sizes=[(16,16),(32,32),(48,48)],
)
print(f'  favicon.ico (transparent)')

# ---------- Apple Touch Icon (180x180) — iOS REQUIRES opaque bg ----------
apple = Image.new('RGBA', (180, 180), (255, 255, 255, 255))
apple_img = src.resize((180, 180), Image.LANCZOS)
apple.paste(apple_img, (0, 0), apple_img)
apple.convert('RGB').save(f'{PUB}/apple-touch-icon.png', 'PNG', optimize=True)
print(f'  apple-touch-icon.png (opaque white — iOS requirement only)')

# ---------- PWA Icons (transparent) ----------
def save_icon(size: int, fname: str, maskable: bool = False):
    if maskable:
        # Maskable: transparent canvas, logo scaled to 80% centered (safe zone)
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

# ---------- Final verification ----------
print('\n--- Verification (all should be TRANSPARENT except apple-touch-icon) ---')
for f in [
    'public/logo.png', 'public/logo.webp', 'public/favicon.png',
    'public/favicon-16.png', 'public/icon-192.png', 'public/icon-512.png',
    'public/icon-maskable-192.png', 'public/icon-maskable-512.png',
    'public/apple-touch-icon.png',
]:
    img = Image.open(f).convert('RGBA')
    w, h = img.size
    pixels = img.load()
    corners = [pixels[0,0], pixels[w-1,0], pixels[0,h-1], pixels[w-1,h-1]]
    corner_alpha = [c[3] for c in corners]
    has_transparent = 0 in corner_alpha
    is_opaque_white = all(a == 255 for a in corner_alpha) and corners[0][:3] == (255, 255, 255)
    label = 'TRANSPARENT ✅' if has_transparent else ('OPAQUE_WHITE (iOS only)' if is_opaque_white else f'OTHER alpha={corner_alpha}')
    print(f'  {f}: {w}x{h} -> {label}')

print('\nDone.')
