// Generates PWA icons from public/logo.svg using sharp.
// Outputs:
//   public/icons/icon-192.png
//   public/icons/icon-512.png
//   public/icons/maskable-192.png
//   public/icons/maskable-512.png
//   public/icons/apple-touch-icon.png (180x180)
//   public/favicon.png (32x32, replaces missing default)
//   public/icon.svg (alias of logo.svg)

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const SRC_SVG = path.join(ROOT, 'public', 'logo.svg')
const OUT_DIR = path.join(ROOT, 'public', 'icons')

if (!fs.existsSync(SRC_SVG)) {
  console.error('Source SVG not found:', SRC_SVG)
  process.exit(1)
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

const svgBuf = fs.readFileSync(SRC_SVG)

// Brand background color — primary violet from globals.css (oklch(0.42 0.18 285) approx #6D28D9)
const BRAND_BG = { r: 0x6d, g: 0x28, d: 0xd9 }
const BRAND_BG_RGB = '#6D28D9'

async function makeIcon(size, opts = {}) {
  const { maskable = false, bg = BRAND_BG_RGB } = opts
  // For maskable icons: the safe zone is the central 80%. We add padding around the logo
  // by composing it onto a filled background.
  const padding = maskable ? Math.round(size * 0.1) : 0
  const logoSize = size - 2 * padding

  const logoLayer = sharp(svgBuf, { density: 384 })
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

  const composite = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  }).composite([
    {
      input: await logoLayer.png().toBuffer(),
      gravity: 'center',
    },
  ])

  // For non-maskable icons (regular PWA + apple-touch), we still want a solid background
  // so the icon looks polished on both light and dark themes.
  const out = composite.png()
  return out
}

async function makeIconNoBg(size) {
  // Transparent background — just the logo (for iOS apple-touch-icon we need a solid background,
  // but for the small favicon we can keep it transparent over the brand color)
  return sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
}

async function main() {
  const tasks = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'maskable-192.png', size: 192, maskable: true },
    { name: 'maskable-512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ]

  for (const t of tasks) {
    const buf = await (await makeIcon(t.size, { maskable: t.maskable })).toBuffer()
    const outPath = path.join(OUT_DIR, t.name)
    fs.writeFileSync(outPath, buf)
    console.log(`✓ ${t.name} (${t.size}x${t.size}${t.maskable ? ' maskable' : ''}) -> ${outPath}`)
  }

  // Favicon (32x32 transparent PNG)
  const favBuf = await (await makeIconNoBg(32)).toBuffer()
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.png'), favBuf)
  console.log('✓ favicon.png (32x32)')

  // Also generate a 16x16 favicon variant
  const fav16Buf = await (await makeIconNoBg(16)).toBuffer()
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon-16.png'), fav16Buf)
  console.log('✓ favicon-16.png (16x16)')

  // Alias the SVG to /icon.svg for modern browsers
  fs.copyFileSync(SRC_SVG, path.join(ROOT, 'public', 'icon.svg'))
  console.log('✓ icon.svg (alias)')

  console.log('\nAll PWA icons generated.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
