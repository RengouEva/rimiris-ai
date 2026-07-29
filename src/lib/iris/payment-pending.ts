/**
 * File-backed pending payment store.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * When a user starts a checkout (e.g. Stripe Checkout Session), the payment
 * isn't complete yet — the user is being redirected to the provider. We need
 * to remember:
 *   - WHO initiated the payment (accountId + email)
 *   - WHAT they're paying for (tier, amountXAF, docType)
 *   - WHICH provider is processing it (and the reference they assigned)
 *   - WHEN it was initiated (so we can expire stale entries)
 *
 * When the provider's webhook fires later (could be seconds or minutes),
 * we look up the pending payment by reference and "fulfill" it: upgrade
 * the user's tier and record the revenue.
 *
 * STORAGE
 * -------
 * JSON file at `.payment-pending.json` in the project root. Schema:
 *   {
 *     "pending": [
 *       {
 *         "reference": "rdr_abc123",
 *         "provider": "stripe",
 *         "providerRef": "cs_test_...",   // provider's own session/tx id
 *         "accountId": "...",
 *         "email": "...",
 *         "name": "...",
 *         "tier": "pro",
 *         "amountXAF": 7000,
 *         "docType": "memoire",
 *         "mode": "test" | "live",
 *         "status": "pending" | "paid" | "expired" | "failed",
 *         "createdAt": 1234567890,
 *         "paidAt": 1234567890,
 *         "failureReason": "..."
 *       }
 *     ]
 *   }
 *
 * SAFETY
 * ------
 * - Reads are synchronous (small file, single-node deployment).
 * - Writes use a temp file + rename for atomicity.
 * - Stale entries (status='pending', older than 24h) are cleaned up on every
 *   read so the file doesn't grow unboundedly.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { PaymentProviderId, ProviderMode } from './payment-providers'
import type { TierId } from './tiers'

const PENDING_PATH = path.join(process.cwd(), '.payment-pending.json')
const STALE_AFTER_MS = 24 * 60 * 60 * 1000 // 24h

// ============================================================================
// Types
// ============================================================================
export type PendingStatus = 'pending' | 'paid' | 'expired' | 'failed'

export interface PendingPayment {
  /** Our reference (also used as the provider's external reference / tx_ref). */
  reference: string
  /** Which provider is processing this payment. */
  provider: Exclude<PaymentProviderId, 'none'>
  /** Provider's own session/transaction ID (filled when initiate succeeds). */
  providerRef?: string
  /** Account being upgraded. */
  accountId: string
  email: string
  name: string
  /** Target tier (always 'pro' for now). */
  tier: TierId
  /** Amount in XAF (integer). */
  amountXAF: number
  /** Document type, for reduced pricing (dissertation/exposé = 2000 XAF). */
  docType?: string
  /** Mode at the time of initiation. */
  mode: ProviderMode
  /** Current lifecycle state. */
  status: PendingStatus
  createdAt: number
  paidAt?: number
  failureReason?: string
}

interface PendingStore {
  pending: PendingPayment[]
}

// ============================================================================
// I/O helpers (atomic write)
// ============================================================================
function readStore(): PendingStore {
  try {
    if (fs.existsSync(PENDING_PATH)) {
      const raw = fs.readFileSync(PENDING_PATH, 'utf8')
      const parsed = JSON.parse(raw) as PendingStore
      if (!parsed.pending || !Array.isArray(parsed.pending)) {
        return { pending: [] }
      }
      return parsed
    }
  } catch {
    /* corrupt — return empty */
  }
  return { pending: [] }
}

function writeStore(store: PendingStore) {
  // Atomic write: write to .tmp, then rename
  const tmp = PENDING_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, PENDING_PATH)
}

// ============================================================================
// Stale cleanup — drop pending entries older than STALE_AFTER_MS that are
// still in 'pending' status (mark them 'expired' rather than deleting, so
// the audit trail is preserved for 7 days).
// ============================================================================
function cleanupStale(store: PendingStore): PendingStore {
  const now = Date.now()
  let changed = false
  for (const p of store.pending) {
    if (p.status === 'pending' && now - p.createdAt > STALE_AFTER_MS) {
      p.status = 'expired'
      changed = true
    }
  }
  // Drop fully-resolved entries (paid/failed/expired) older than 7 days
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000
  const before = store.pending.length
  store.pending = store.pending.filter((p) => {
    if (p.status === 'pending') return true
    const resolvedAt = p.paidAt || p.createdAt
    return now - resolvedAt < SEVEN_DAYS
  })
  if (before !== store.pending.length) changed = true
  if (changed) writeStore(store)
  return store
}

// ============================================================================
// CRUD
// ============================================================================
export function createPending(p: PendingPayment): void {
  const store = cleanupStale(readStore())
  store.pending.push(p)
  writeStore(store)
}

export function getPending(reference: string): PendingPayment | null {
  const store = cleanupStale(readStore())
  return store.pending.find((p) => p.reference === reference) || null
}

export function findPendingByProviderRef(
  provider: Exclude<PaymentProviderId, 'none'>,
  providerRef: string,
): PendingPayment | null {
  const store = cleanupStale(readStore())
  return (
    store.pending.find(
      (p) => p.provider === provider && p.providerRef === providerRef,
    ) || null
  )
}

/**
 * Update a pending payment's status. Returns the updated record, or null
 * if not found.
 */
export function updatePending(
  reference: string,
  patch: Partial<PendingPayment>,
): PendingPayment | null {
  const store = cleanupStale(readStore())
  const idx = store.pending.findIndex((p) => p.reference === reference)
  if (idx === -1) return null
  store.pending[idx] = { ...store.pending[idx], ...patch }
  writeStore(store)
  return store.pending[idx]
}

/**
 * Mark a pending payment as paid. Returns the updated record.
 */
export function markPaid(reference: string): PendingPayment | null {
  return updatePending(reference, { status: 'paid', paidAt: Date.now() })
}

/**
 * Mark a pending payment as failed.
 */
export function markFailed(
  reference: string,
  reason: string,
): PendingPayment | null {
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
