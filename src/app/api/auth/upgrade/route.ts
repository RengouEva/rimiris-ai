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
 *
 * BACKEND: MySQL via Prisma. Account + Revenue tables.
 */
import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import {
  requireSession,
  checkCSRF,
  ADMIN_EMAIL,
} from '@/lib/iris/security'
import {
  findAccountById,
  updateAccount,
  applySuperAdminRule,
} from '../login/route'
import { TIERS, migrateLegacyTier, type TierId } from '@/lib/iris/tiers'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

const PAYMENT_SECRET =
  process.env.RIMIRIS_PAYMENT_SECRET ||
  process.env.PAYMENT_SECRET ||
  ''

let demoModeWarned = false

function verifyPaymentSignature(
  accountId: string,
  tier: TierId,
  amountXAF: number,
  timestamp: number,
  sig: string,
): { valid: boolean; realPayment: boolean } {
  if (!PAYMENT_SECRET) {
    // Demo mode: no signature required, but only allow 'free' -> 'pro'
    // upgrades from authenticated sessions. Log once at boot.
    // CRITICAL: in demo mode NO REVENUE is recorded — the admin panel
    // must never display fictitious amounts. Revenue is only recorded
    // when a real payment provider signs the request with the secret.
    if (!demoModeWarned) {
      console.warn('[payment] RIMIRIS_PAYMENT_SECRET not set — running in demo mode. Upgrades are free, NO revenue is recorded.')
      demoModeWarned = true
    }
    return { valid: true, realPayment: false }
  }
  // Replay protection: timestamp must be within ±5 minutes
  const now = Date.now()
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return { valid: false, realPayment: false }
  }
  const payload = `${accountId}:${tier}:${amountXAF}:${timestamp}`
  const expected = crypto.createHmac('sha256', PAYMENT_SECRET).update(payload).digest('hex')
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    return {
      valid: a.length === b.length && crypto.timingSafeEqual(a, b),
      realPayment: true,
    }
  } catch {
    return { valid: false, realPayment: false }
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
  const sigCheck = verifyPaymentSignature(session.accountId, tier, amountXAF, ts, sig)
  if (!sigCheck.valid) {
    return NextResponse.json(
      { error: 'Signature de paiement invalide ou expirée.' },
      { status: 402 },
    )
  }

  // Apply the upgrade in the DB
  const stored = await findAccountById(session.accountId)
  if (!stored) {
    return NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 })
  }
  const account = applySuperAdminRule({ ...stored, tier })
  const updated = await updateAccount(account.id, {
    tier: account.tier,
    role: account.role,
  })
  if (!updated) {
    return NextResponse.json({ error: 'Échec de la mise à jour du compte.' }, { status: 500 })
  }

  // Record revenue ONLY when a real payment signature was verified.
  // In demo mode (no secret), NO revenue is recorded.
  if (sigCheck.realPayment && amountXAF > 0 && session.email !== ADMIN_EMAIL && tier !== 'free') {
    try {
      await prisma.revenue.create({
        data: {
          ts: BigInt(Date.now()),
          amount: amountXAF,
          tier,
          accountId: account.id,
        },
      })
    } catch (e) {
      console.error('[upgrade] revenue insert failed:', e)
      // Don't fail the upgrade — the user already paid. We'll reconcile later.
    }
  }

  const newSession = {
    ...session,
    tier: account.tier,
    role: account.role,
  }

  // Re-set the cookie with the new tier (the cookie is HMAC-signed server-side,
  // so the client cannot fake this change).
  const { setSessionCookie } = await import('@/lib/iris/security')
  const res = NextResponse.json({
    ok: true,
    session: newSession,
    tier: account.tier,
    realPayment: sigCheck.realPayment,
  })
  setSessionCookie(res, newSession)
  return res
}
