import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'
import { requireSuperAdmin, getSessionFromRequest } from '@/lib/iris/security'

export const runtime = 'nodejs'
// Up to 8 MB logo upload (raw PNG/SVG can be large)
export const maxDuration = 30

// ============================================================================
// Paths
// ============================================================================
const PUB = path.join(process.cwd(), 'public')
const UPLOAD_DIR = path.join(process.cwd(), 'upload', 'admin-uploads')
const META_PATH = path.join(process.cwd(), '.logo-meta.json')

interface LogoMeta {
  updatedAt?: number  // unix ms
  sourceFile?: string // e.g. 'logo-1700000000000.png'
  sourceFormat?: string
  sourceW?: number
  sourceH?: number
  sourceTransparent?: boolean
  updatedBy?: string
}

// ============================================================================
// Auth — mirrors /api/admin/llm-config
// ============================================================================
function ensureAdmin(req: NextRequest) {
  // VULN-03: was using client-side getCurrentSession()/isSuperAdmin() —
  // always bypassed on server. Now uses HMAC-signed cookie verification.
  const auth = requireSuperAdmin(req)
  if (!auth.ok) return auth.response
  return null
}

function readMeta(): LogoMeta {
  try {
    if (fs.existsSync(META_PATH)) {
      return JSON.parse(fs.readFileSync(META_PATH, 'utf8'))
    }
  } catch {
    /* corrupt JSON — return empty */
  }
  return {}
}

function writeMeta(m: LogoMeta) {
  fs.writeFileSync(META_PATH, JSON.stringify(m, null, 2), 'utf8')
}

// ============================================================================
// GET /api/admin/logo
// Returns logo metadata (last update, dimensions, transparency status).
// ============================================================================
export async function GET(req: NextRequest) {
  const forbidden = ensureAdmin(req)
  if (forbidden) return forbidden

  const meta = readMeta()
  return NextResponse.json({
    ...meta,
    urls: {
      // Cache-busting query string forces browsers to re-fetch the new logo
      // after upload. Without this, the old logo stays in cache for hours.
      logo: `/logo.webp?v=${meta.updatedAt || 0}`,
      favicon: `/favicon.png?v=${meta.updatedAt || 0}`,
      icon192: `/icon-192.png?v=${meta.updatedAt || 0}`,
      icon512: `/icon-512.png?v=${meta.updatedAt || 0}`,
    },
  })
}

// ============================================================================
// POST /api/admin/logo
// Accepts multipart/form-data with field 'file' (PNG, WebP, or SVG).
// Processes the file with sharp, preserving alpha channel — NO flattening
// to white background (except for apple-touch-icon.png which iOS requires
// to be opaque).
// ============================================================================
export async function POST(req: NextRequest) {
  const forbidden = ensureAdmin(req)
  if (forbidden) return forbidden

  // VULN-17: Content-Length check BEFORE reading the body
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  const MAX_UPLOAD_BYTES = 12 * 1024 * 1024 // 12 MB cap (8 MB logo + multipart overhead)
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Upload trop volumineux (${(contentLength / 1024 / 1024).toFixed(1)} MB). Maximum : 12 MB.` },
      { status: 413 },
    )
  }

  const session = getSessionFromRequest(req)

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier reçu. Champ attendu : 'file'." },
        { status: 400 },
      )
    }

    // Validate type
    const allowedTypes = [
      'image/png',
      'image/webp',
      'image/svg+xml',
      'image/svg',
      'image/jpeg',
      'image/jpg',
    ]
    const ct = file.type.toLowerCase()
    if (!allowedTypes.includes(ct)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté: ${ct}. Utilisez PNG, WebP, SVG ou JPG.` },
        { status: 400 },
      )
    }

    // Validate size (max 8 MB)
    const MAX_BYTES = 8 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 8 MB.` },
        { status: 400 },
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())

    // Save original upload (audit trail)
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    const ext = ct.includes('svg') ? 'svg' : ct.includes('webp') ? 'webp' : ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png'
    const ts = Date.now()
    const sourceName = `logo-${ts}.${ext}`
    const sourcePath = path.join(UPLOAD_DIR, sourceName)
    fs.writeFileSync(sourcePath, buf)

    // ---------------------------------------------------------------------------
    // Detect source dimensions + transparency.
    // ---------------------------------------------------------------------------
    let sourceW = 0
    let sourceH = 0
    let sourceTransparent = true

    if (ct.includes('svg')) {
      // SVG: force rasterize at 1024x1024 with transparent background
      const probe = sharp(buf, { density: 300 }).resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      const meta = await probe.metadata()
      sourceW = meta.width || 1024
      sourceH = meta.height || 1024
      // SVG with fit=contain on transparent bg → always transparent
      sourceTransparent = true
    } else {
      const probe = sharp(buf)
      const meta = await probe.metadata()
      sourceW = meta.width || 0
      sourceH = meta.height || 0
      if (meta.hasAlpha) {
        // Sample alpha on a 64x64 downscaled copy
        const { data, info } = await sharp(buf)
          .clone()
          .resize(64, 64, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true })
        let minAlpha = 255
        for (let i = 3; i < data.length; i += info.channels) {
          if (data[i] < minAlpha) minAlpha = data[i]
          if (minAlpha === 0) break
        }
        sourceTransparent = minAlpha < 255
      } else {
        // No alpha channel — fully opaque
        sourceTransparent = false
      }
    }

    // ---------------------------------------------------------------------------
    // Build a canonical 1024x1024 RGBA PNG with transparent padding.
    // All outputs are derived from this canonical source to guarantee
    // consistent aspect ratio (1:1) and full alpha preservation.
    // ---------------------------------------------------------------------------
    const loader = ct.includes('svg')
      ? sharp(buf, { density: 300 })
      : sharp(buf)

    const canonical = await loader
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .png()
      .toBuffer()

    const can = () => sharp(canonical)

    // logo.png + logo.webp (512x512, transparent)
    await can()
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 95, compressionLevel: 9 })
      .toFile(path.join(PUB, 'logo.png'))
    await can()
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 95, lossless: false })
      .toFile(path.join(PUB, 'logo.webp'))

    // favicon.png (32x32) + favicon-16.png (16x16) — transparent
    await can()
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUB, 'favicon.png'))
    await can()
      .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUB, 'favicon-16.png'))

    // favicon.ico — sharp can't emit true .ico, so we write a 32x32 PNG with
    // .ico extension. Modern browsers accept this. True multi-size .ico would
    // require a dedicated library (out of scope here).
    await can()
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUB, 'favicon.ico'))

    // apple-touch-icon.png (180x180, opaque white bg — iOS REQUIREMENT)
    // This is the ONLY format composited on white. iOS does not support
    // transparent apple-touch-icons.
    const appleLogo = await can()
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: appleLogo, blend: 'over' }])
      .flatten({ background: '#ffffff' })
      .png()
      .toFile(path.join(PUB, 'apple-touch-icon.png'))

    // PWA icons (square, transparent)
    await can()
      .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUB, 'icon-192.png'))
    await can()
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(PUB, 'icon-512.png'))

    // Maskable icons (80% safe zone, transparent)
    const makeMaskable = async (size: number, fname: string) => {
      const inner = Math.round(size * 0.8)
      const innerLogo = await can()
        .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: innerLogo, blend: 'over', gravity: 'center' }])
        .png()
        .toFile(path.join(PUB, fname))
    }
    await makeMaskable(192, 'icon-maskable-192.png')
    await makeMaskable(512, 'icon-maskable-512.png')

    // Mirror to public/icons/
    const iconsDir = path.join(PUB, 'icons')
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
    const copyMap: [string, string][] = [
      ['icon-192.png', 'icons/icon-192.png'],
      ['icon-512.png', 'icons/icon-512.png'],
      ['icon-maskable-192.png', 'icons/maskable-192.png'],
      ['icon-maskable-512.png', 'icons/maskable-512.png'],
      ['apple-touch-icon.png', 'icons/apple-touch-icon.png'],
    ]
    for (const [src, dst] of copyMap) {
      fs.copyFileSync(path.join(PUB, src), path.join(PUB, dst))
    }

    // ---------------------------------------------------------------------------
    // Save metadata
    // ---------------------------------------------------------------------------
    const meta: LogoMeta = {
      updatedAt: ts,
      sourceFile: sourceName,
      sourceFormat: ext,
      sourceW,
      sourceH,
      sourceTransparent,
      updatedBy: session?.email || 'unknown',
    }
    writeMeta(meta)

    return NextResponse.json({
      ok: true,
      meta,
      urls: {
        logo: `/logo.webp?v=${ts}`,
        favicon: `/favicon.png?v=${ts}`,
        icon192: `/icon-192.png?v=${ts}`,
        icon512: `/icon-512.png?v=${ts}`,
      },
      message: sourceTransparent
        ? 'Logo mis à jour. Transparence préservée.'
        : "Logo mis à jour. ⚠️ Attention : l'image source n'a pas de canal alpha (JPEG ou PNG opaque). Les coins seront opaques. Utilisez un PNG avec fond transparent pour un meilleur rendu.",
    })
  } catch (e: any) {
    console.error('[admin/logo] error:', e)
    return NextResponse.json(
      { error: e?.message || 'Erreur lors du traitement du logo.' },
      { status: 500 },
    )
  }
}
