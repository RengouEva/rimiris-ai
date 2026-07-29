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
 *   1. Looks up the pending payment by reference (Prisma).
 *   2. Validates it's in 'pending' status (idempotency — webhook may fire
 *      multiple times; we only fulfill once).
 *   3. Loads the account row, upgrades the user's tier to 'pro'.
 *   4. Records the revenue in the `revenues` table.
 *   5. Marks the pending payment as 'paid'.
 *
 * BACKEND
 * -------
 * All persistence goes through Prisma (MySQL). Account + Revenue tables.
 *
 * SECURITY
 * --------
 * Server-only. Only called after webhook signature verification (or after a
 * server-to-server provider API call confirms the payment status). Does NOT
 * trust any client input — the only argument is the payment reference, and
 * we look up the amount + accountId from the pending store (which was
 * written by /api/payment/initiate, also server-side).
 */

import { prisma } from '@/lib/db'
import { findAccountById, updateAccount, applySuperAdminRule } from '@/app/api/auth/login/route'
import { ADMIN_EMAIL } from '@/lib/iris/security'
import { type TierId } from '@/lib/iris/tiers'
import { getPending, markPaid, markFailed } from './payment-pending'
import type { PaymentProviderId } from './payment-providers'

export const runtime = 'nodejs'

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
export async function fulfillPayment(
  reference: string,
  provider: Exclude<PaymentProviderId, 'none'>,
): Promise<FulfillResult> {
  const pending = await getPending(reference)
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
  const stored = await findAccountById(pending.accountId)
  if (!stored) {
    await markFailed(reference, `Account ${pending.accountId} not found`)
    return { ok: false, fulfilled: false, error: 'Compte introuvable.' }
  }
  const account = applySuperAdminRule(stored)
  const updated = await updateAccount(account.id, {
    tier: pending.tier,
    role: account.role,
  })
  if (!updated) {
    await markFailed(reference, `Failed to update account ${account.id}`)
    return { ok: false, fulfilled: false, error: 'Échec mise à jour du compte.' }
  }

  // 2. Record revenue (ONLY for non-admin accounts — admin is auto-Pro)
  if (pending.amountXAF > 0 && account.email !== ADMIN_EMAIL) {
    try {
      await prisma.revenue.create({
        data: {
          ts: BigInt(Date.now()),
          amount: pending.amountXAF,
          tier: pending.tier,
          accountId: account.id,
          provider,
          reference,
        },
      })
    } catch (e) {
      console.error('[fulfill] revenue insert failed:', e)
      // Don't abort — the user is already upgraded. We'll reconcile later.
    }
  }

  // 3. Mark pending as paid
  await markPaid(reference)

  return {
    ok: true,
    fulfilled: true,
    accountId: account.id,
    tier: pending.tier,
    amountXAF: pending.amountXAF,
    provider,
  }
}
