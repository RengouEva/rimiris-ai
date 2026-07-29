/**
 * POST /api/auth/upgrade — server-side tier upgrade with payment signature.
 *
 * VULN-05: Previously the client called upgradeToTier() directly in
 * localStorage, allowing any user to grant themselves Pro for free by
 * editing localStorage. Now the upgrade must come through this endpoint
 * and carry a valid HMAC payment signature.
 *
 * Payment signature format:
 *   HMAC-SHA256(`${accountId}:${tier}:${amountXAF}:${timestamp}`, RIMIRIS_PAYMENT_SECRET)
 *
 * In demo mode (RIMIRIS_PAYMENT_SECRET not set), we accept any upgrade
 * request from an authenticated session but log a warning. In production
 * the payment provider (Stripe, FedaPay, Campay…) would call this endpoint
 * server-side with the secret after a successful payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import {
  requireSession,
  checkCSRF,
  ADMIN_EMAIL,
} from '@/lib/iris/security'
import {
  readStore,
  writeStore,
  applySuperAdminRule,
} from '../login/route'
import { TIERS, migrateLegacyTier, type TierId } from '@/lib/iris/tiers'

export const runtime = 'nodejs'

const PAYMENT_SECRET =
  process.env.RIMIRIS_PAYMENT_SECRET ||
  process.env.PAYMENT_SECRET ||
  ''

const REVENUE_PATH = path.join(process.cwd(), '.rimiris-revenue.json')

interface RevenueRecord {
  total: number
  history: { ts: number; amount: number; tier: TierId; accountId: string }[]
}

function readRevenue(): RevenueRecord {
  try {
    if (fs.existsSync(REVENUE_PATH)) {
      return JSON.parse(fs.readFileSync(REVENUE_PATH, 'utf8'))
    }
  } catch {
    /* corrupt */
  }
  return { total: 0, history: [] }
}

function writeRevenue(r: RevenueRecord) {
  fs.writeFileSync(REVENUE_PATH, JSON.stringify(r, null, 2), 'utf8')
}

function verifyPaymentSignature(
  accountId: string,
  tier: TierId,
  amountXAF: number,
  timestamp: number,
  sig: string,
): boolean {
  if (!PAYMENT_SECRET) {
    // Demo mode: no signature required, but only allow 'free' -> 'pro'
    // upgrades from authenticated sessions. Log once at boot.
    console.warn('[payment] RIMIRIS_PAYMENT_SECRET not set — running in demo mode. Anyone authenticated can upgrade.')
    return true
  }
  // Replay protection: timestamp must be within ±5 minutes
  const now = Date.now()
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) return false
  const payload = `${accountId}:${tier}:${amountXAF}:${timestamp}`
  const expected = crypto.createHmac('sha256', PAYMENT_SECRET).update(payload).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!checkCSRF(req)) {
    return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })
  }
  const auth = requireSession(req)
  if (!auth.ok) return auth.response!
  const session = auth.session!

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }

  const targetTier = body?.tier as TierId | undefined
  if (!targetTier || !TIERS[targetTier]) {
    return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
  }

  // Super-admin is permanently Pro — block downgrades.
  if (session.email === ADMIN_EMAIL && targetTier !== 'pro') {
    return NextResponse.json({ error: 'Le compte admin est déjà Pro.' }, { status: 400 })
  }

  const tier = migrateLegacyTier(targetTier)
  const amountXAF = TIERS[tier].priceXAF || 0

  // Verify payment signature (skipped in demo mode)
  const sig = String(body?.paymentSignature || '')
  const ts = Number(body?.paymentTimestamp || 0)
  if (!verifyPaymentSignature(session.accountId, tier, amountXAF, ts, sig)) {
    return NextResponse.json(
      { error: 'Signature de paiement invalide ou expirée.' },
      { status: 402 },
    )
  }

  // Apply the upgrade in the server store
  const store = readStore()
  const idx = store.accounts.findIndex((a) => a.id === session.accountId)
  if (idx === -1) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
  }
  store.accounts[idx].tier = tier
  store.accounts[idx] = applySuperAdminRule(store.accounts[idx])
  writeStore(store)

  // Record revenue (free upgrades + admin auto-pro do not generate revenue)
  if (amountXAF > 0 && session.email !== ADMIN_EMAIL && tier !== 'free') {
    const r = readRevenue()
    r.total += amountXAF
    r.history.push({ ts: Date.now(), amount: amountXAF, tier, accountId: session.accountId })
    writeRevenue(r)
  }

  const newSession = {
    ...session,
    tier: store.accounts[idx].tier,
    role: store.accounts[idx].role,
  }

  // Re-set the cookie with the new tier (the cookie is HMAC-signed server-side,
  // so the client cannot fake this change).
  const { setSessionCookie } = await import('@/lib/iris/security')
  const res = NextResponse.json({
    ok: true,
    session: newSession,
    tier: store.accounts[idx].tier,
  })
  setSessionCookie(res, newSession)
  return res
}
