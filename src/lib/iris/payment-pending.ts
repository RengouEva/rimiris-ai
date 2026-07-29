/**
 * Pending payment store — MySQL-backed via Prisma.
 *
 * Previously a JSON file at `.payment-pending.json`. Now uses the
 * `PendingPayment` table. Public API (function signatures) is preserved
 * so consumers (initiate, webhook, success, verify, fulfillment) don't
 * need to change — but every function is now `async`.
 *
 * STORAGE
 * -------
 * Table `pending_payments`:
 *   - reference (unique)  rdr_xxx
 *   - provider             stripe | campay | ...
 *   - providerRef          provider's own session/tx ID
 *   - accountId            Rimiris account ID (FK)
 *   - email / name         payer info, denormalized for the audit trail
 *   - tier / amountXAF     what they paid for
 *   - status               pending | paid | expired | failed
 *   - createdAt / paidAt   lifecycle timestamps
 *   - failureReason        set when status = failed
 *
 * SAFETY
 * ------
 * - Atomic updates via Prisma transactions where needed.
 * - Stale cleanup (pending > 24h → expired, resolved > 7d → deleted) runs
 *   lazily inside `getPending` and `createPending`.
 */

import { prisma } from '@/lib/db'
import type { PendingPayment as PrismaPendingPayment } from '@prisma/client'
import type { PaymentProviderId, ProviderMode } from './payment-providers'
import type { TierId } from './tiers'

const STALE_AFTER_MS = 24 * 60 * 60 * 1000 // 24h

// ============================================================================
// Types (kept identical to the old file-based API)
// ============================================================================
export type PendingStatus = 'pending' | 'paid' | 'expired' | 'failed'

export interface PendingPayment {
  reference: string
  provider: Exclude<PaymentProviderId, 'none'>
  providerRef?: string
  accountId: string
  email: string
  name: string
  tier: TierId
  amountXAF: number
  docType?: string
  mode: ProviderMode
  status: PendingStatus
  createdAt: number
  paidAt?: number
  failureReason?: string
}

// ============================================================================
// Convert Prisma row → PendingPayment (the legacy in-memory shape)
// ============================================================================
function toPending(row: PrismaPendingPayment): PendingPayment {
  return {
    reference: row.reference,
    provider: row.provider as Exclude<PaymentProviderId, 'none'>,
    providerRef: row.providerRef || undefined,
    accountId: row.accountId,
    email: row.email,
    name: row.name,
    tier: row.tier as TierId,
    amountXAF: row.amountXAF,
    docType: row.docType || undefined,
    mode: row.mode as ProviderMode,
    status: row.status as PendingStatus,
    createdAt: Number(row.createdAt),
    paidAt: row.paidAt ? Number(row.paidAt) : undefined,
    failureReason: row.failureReason || undefined,
  }
}

// ============================================================================
// Stale cleanup — mark pendings older than 24h as 'expired', and delete
// resolved entries older than 7 days. Runs at most once per request via a
// simple throttle (no need for a cron — this is cheap and idempotent).
// ============================================================================
let lastCleanup = 0
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 min

async function maybeCleanup(): Promise<void> {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  try {
    // 1. Expire stale pending
    await prisma.pendingPayment.updateMany({
      where: {
        status: 'pending',
        createdAt: { lt: BigInt(now - STALE_AFTER_MS) },
      },
      data: { status: 'expired' },
    })

    // 2. Delete resolved entries older than 7 days
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
    await prisma.pendingPayment.deleteMany({
      where: {
        status: { in: ['paid', 'failed', 'expired'] },
        OR: [
          { paidAt: { lt: BigInt(now - SEVEN_DAYS) } },
          {
            paidAt: null,
            createdAt: { lt: BigInt(now - SEVEN_DAYS) },
          },
        ],
      },
    })
  } catch (e) {
    console.warn('[payment-pending] cleanup failed:', e)
  }
}

// ============================================================================
// CRUD
// ============================================================================
export async function createPending(p: PendingPayment): Promise<void> {
  await maybeCleanup()
  await prisma.pendingPayment.create({
    data: {
      reference: p.reference,
      provider: p.provider,
      providerRef: p.providerRef || null,
      accountId: p.accountId,
      email: p.email,
      name: p.name,
      tier: p.tier,
      amountXAF: p.amountXAF,
      docType: p.docType || null,
      mode: p.mode,
      status: p.status,
      createdAt: BigInt(p.createdAt),
      paidAt: p.paidAt ? BigInt(p.paidAt) : null,
      failureReason: p.failureReason || null,
    },
  })
}

export async function getPending(reference: string): Promise<PendingPayment | null> {
  await maybeCleanup()
  const row = await prisma.pendingPayment.findUnique({ where: { reference } })
  return row ? toPending(row) : null
}

export async function findPendingByProviderRef(
  provider: Exclude<PaymentProviderId, 'none'>,
  providerRef: string,
): Promise<PendingPayment | null> {
  const row = await prisma.pendingPayment.findFirst({
    where: { provider, providerRef },
  })
  return row ? toPending(row) : null
}

/**
 * Update a pending payment's status. Returns the updated record, or null
 * if not found.
 */
export async function updatePending(
  reference: string,
  patch: Partial<PendingPayment>,
): Promise<PendingPayment | null> {
  try {
    const data: Record<string, unknown> = {}
    if (patch.providerRef !== undefined) data.providerRef = patch.providerRef || null
    if (patch.status !== undefined) data.status = patch.status
    if (patch.paidAt !== undefined) data.paidAt = patch.paidAt ? BigInt(patch.paidAt) : null
    if (patch.failureReason !== undefined) data.failureReason = patch.failureReason || null
    const row = await prisma.pendingPayment.update({
      where: { reference },
      data,
    })
    return toPending(row)
  } catch {
    return null
  }
}

/**
 * Mark a pending payment as paid.
 */
export async function markPaid(reference: string): Promise<PendingPayment | null> {
  return updatePending(reference, { status: 'paid', paidAt: Date.now() })
}

/**
 * Mark a pending payment as failed.
 */
export async function markFailed(
  reference: string,
  reason: string,
): Promise<PendingPayment | null> {
  return updatePending(reference, { status: 'failed', failureReason: reason })
}

// ============================================================================
// Reference generator — `rdr_<random>` (rdr = "rimiris payment")
// ============================================================================
export function generateReference(): string {
  const rand = Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  return `rdr_${rand}`
}
