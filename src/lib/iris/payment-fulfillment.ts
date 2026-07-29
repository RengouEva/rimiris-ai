/**
 * Payment fulfillment — the bridge between "provider confirmed the payment"
 * and "the user is now Pro on Rimiris".
 *
 * CALLED BY
 * --------
 *   - /api/payment/webhook/[provider]/route.ts (when the provider pushes a
 *     signed notification to our webhook)
 *   - /api/payment/verify/route.ts (when the frontend polls for status after
 *     a hosted-checkout redirect — defense-in-depth in case the webhook is
 *     delayed)
 *
 * WHAT IT DOES
 * ------------
 *   1. Looks up the pending payment by reference.
 *   2. Validates it's in 'pending' status (idempotency — webhook may fire
 *      multiple times; we only fulfill once).
 *   3. Loads the account store, finds the user by accountId.
 *   4. Upgrades the user's tier to 'pro'.
 *   5. Records the revenue in .rimiris-revenue.json (this is what makes the
 *      admin panel display non-zero XAF — finally!).
 *   6. Marks the pending payment as 'paid'.
 *
 * SECURITY
 * --------
 * This function is server-only and is only called after webhook signature
 * verification (or after a server-to-server provider API call confirms the
 * payment status). It does NOT trust any client input — the only argument
 * is the payment reference, and we look up the amount + accountId from
 * the pending store (which was written by /api/payment/initiate, also
 * server-side).
 */

import * as fs from 'fs'
import * as path from 'path'
import { readStore, writeStore, applySuperAdminRule } from '@/app/api/auth/login/route'
import { ADMIN_EMAIL } from '@/lib/iris/security'
import { migrateLegacyTier, type TierId } from '@/lib/iris/tiers'
import { getPending, markPaid, markFailed } from './payment-pending'
import type { PaymentProviderId } from './payment-providers'

export const runtime = 'nodejs'

// ============================================================================
// Revenue record (shared with /api/auth/upgrade — same file, same schema)
// ============================================================================
const REVENUE_PATH = path.join(process.cwd(), '.rimiris-revenue.json')

interface RevenueRecord {
  total: number
  history: Array<{
    ts: number
    amount: number
    tier: TierId
    accountId: string
    provider?: string
    reference?: string
  }>
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
  // Atomic write
  const tmp = REVENUE_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(r, null, 2), 'utf8')
  fs.renameSync(tmp, REVENUE_PATH)
}

// ============================================================================
// Fulfillment result
// ============================================================================
export interface FulfillResult {
  ok: boolean
  /** True if this call actually fulfilled the payment (false = already paid,
   *  not found, or account missing). */
  fulfilled: boolean
  /** Set when ok=false and the issue was lookup-related. */
  error?: string
  /** The account that was upgraded (if fulfilled). */
  accountId?: string
  /** The tier the account was upgraded to (always 'pro' for now). */
  tier?: TierId
  /** The amount in XAF that was recorded as revenue. */
  amountXAF?: number
  /** The provider that processed the payment. */
  provider?: Exclude<PaymentProviderId, 'none'>
}

// ============================================================================
// fulfillPayment — the main entry point.
// ============================================================================
export function fulfillPayment(
  reference: string,
  provider: Exclude<PaymentProviderId, 'none'>,
): FulfillResult {
  const pending = getPending(reference)
  if (!pending) {
    return { ok: false, fulfilled: false, error: 'Paiement introuvable.' }
  }
  // Idempotency — if already paid, return success without re-fulfilling
  if (pending.status === 'paid') {
    return {
      ok: true,
      fulfilled: false,
      accountId: pending.accountId,
      tier: pending.tier,
      amountXAF: pending.amountXAF,
      provider,
    }
  }
  // If failed/expired, don't fulfill
  if (pending.status === 'failed' || pending.status === 'expired') {
    return {
      ok: false,
      fulfilled: false,
      error: `Paiement en statut ${pending.status} — ne peut être fulfill.`,
    }
  }
  // Cross-check: the webhook's provider must match the pending's provider
  // (prevents a malicious Campay webhook from fulfilling a Stripe payment)
  if (pending.provider !== provider) {
    return {
      ok: false,
      fulfilled: false,
      error: `Provider mismatch: pending=${pending.provider}, webhook=${provider}`,
    }
  }

  // 1. Upgrade the account tier
  const store = readStore()
  const idx = store.accounts.findIndex((a) => a.id === pending.accountId)
  if (idx === -1) {
    markFailed(reference, `Account ${pending.accountId} not found`)
    return { ok: false, fulfilled: false, error: 'Compte introuvable.' }
  }
  store.accounts[idx].tier = pending.tier
  store.accounts[idx] = applySuperAdminRule(store.accounts[idx])
  writeStore(store)

  // 2. Record revenue (ONLY for non-admin accounts — admin is auto-Pro)
  if (pending.amountXAF > 0 && store.accounts[idx].email !== ADMIN_EMAIL) {
    const r = readRevenue()
    r.total += pending.amountXAF
    r.history.push({
      ts: Date.now(),
      amount: pending.amountXAF,
      tier: pending.tier,
      accountId: pending.accountId,
      provider,
      reference,
    })
    writeRevenue(r)
  }

  // 3. Mark pending as paid
  markPaid(reference)

  return {
    ok: true,
    fulfilled: true,
    accountId: pending.accountId,
    tier: pending.tier,
    amountXAF: pending.amountXAF,
    provider,
  }
}
