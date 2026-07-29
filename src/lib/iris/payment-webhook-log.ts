/**
 * Webhook event log for payment providers — MySQL-backed via Prisma.
 *
 * Previously a JSON file at `.payment-webhook-log.json`. Now uses the
 * `PaymentWebhookEvent` table.
 *
 * CAP
 * ---
 * The table is capped at 200 rows via a post-insert trim (FIFO). The cap
 * keeps the table small enough that the admin panel can scan it without
 * pagination.
 *
 * PRIVACY
 * -------
 * - Body preview is truncated to 500 chars.
 * - Signature header is masked (first 40 chars + "…").
 * - No PII is stored (email/accountId not in the row — the reference is
 *   enough to cross-reference with pending_payments).
 */

import { prisma } from '@/lib/db'
import type { PaymentWebhookEvent as PrismaWebhookEvent } from '@prisma/client'
import type { PaymentProviderId } from './payment-providers'

const MAX_EVENTS = 200
const BODY_PREVIEW_MAX = 500
const SIG_PREVIEW_MAX = 40

// ============================================================================
// Types
// ============================================================================
export type WebhookStatus =
  | 'verified'
  | 'invalid_sig'
  | 'no_reference'
  | 'no_action'
  | 'fulfilled'
  | 'fulfill_failed'
  | 'provider_unknown'
  | 'body_unreadable'

export interface WebhookEvent {
  id: string
  ts: number
  provider: string
  eventType?: string
  reference?: string | null
  status: WebhookStatus
  httpStatus: number
  error?: string
  signatureHeader?: string
  bodyPreview?: string
}

// ============================================================================
// Convert Prisma row → WebhookEvent (legacy in-memory shape)
// ============================================================================
function toEvent(row: PrismaWebhookEvent): WebhookEvent {
  return {
    id: row.id,
    ts: Number(row.ts),
    provider: row.provider,
    eventType: row.eventType || undefined,
    reference: row.reference,
    status: row.status as WebhookStatus,
    httpStatus: row.httpStatus,
    error: row.error || undefined,
    signatureHeader: row.signatureHeader || undefined,
    bodyPreview: row.bodyPreview || undefined,
  }
}

// ============================================================================
// Utility
// ============================================================================
function truncate(s: string | undefined | null, max: number): string | undefined {
  if (!s) return undefined
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

function maskSignature(sig: string | undefined | null): string | undefined {
  if (!sig) return undefined
  if (sig.length <= SIG_PREVIEW_MAX) return sig
  return sig.slice(0, SIG_PREVIEW_MAX) + '…'
}

/**
 * Best-effort extraction of event type from a provider's webhook payload.
 * Used purely for display in the admin log — not security-sensitive.
 */
function extractEventType(
  provider: string,
  parsed: unknown,
): string | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined
  const obj = parsed as Record<string, unknown>
  if (typeof obj.event === 'string') return obj.event
  if (typeof obj.type === 'string') return obj.type
  if (typeof obj.data === 'object' && obj.data !== null) {
    const data = obj.data as Record<string, unknown>
    if (typeof data.event === 'string') return data.event
  }
  if (typeof obj.cpm_result === 'string') return `cpm_result=${obj.cpm_result}`
  return undefined
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Append a webhook event to the log. The log is capped at MAX_EVENTS — older
 * entries are dropped (FIFO). Safe to call from the webhook handler — if the
 * log write fails, the webhook still proceeds (we only log a warning).
 *
 * Returns the persisted event (or null on failure) so callers can chain.
 */
export async function logWebhookEvent(
  input: Omit<WebhookEvent, 'id' | 'ts'> & { ts?: number },
): Promise<void> {
  try {
    const ts = input.ts ?? Date.now()
    await prisma.paymentWebhookEvent.create({
      data: {
        ts: BigInt(ts),
        provider: input.provider,
        eventType: input.eventType || null,
        reference: input.reference ?? null,
        status: input.status,
        httpStatus: input.httpStatus,
        error: input.error || null,
        signatureHeader: input.signatureHeader || null,
        bodyPreview: input.bodyPreview || null,
      },
    })

    // Trim: keep only the MAX_EVENTS most recent rows.
    // Cheap to run on every insert because the table is small.
    const total = await prisma.paymentWebhookEvent.count()
    if (total > MAX_EVENTS) {
      const excess = total - MAX_EVENTS
      // Delete the oldest `excess` rows.
      const oldest = await prisma.paymentWebhookEvent.findMany({
        orderBy: { ts: 'asc' },
        take: excess,
        select: { id: true },
      })
      if (oldest.length > 0) {
        await prisma.paymentWebhookEvent.deleteMany({
          where: { id: { in: oldest.map((r) => r.id) } },
        })
      }
    }
  } catch (e) {
    // Logging must never break the webhook flow
    console.warn('[webhook-log] failed to persist event:', e)
  }
}

/**
 * Read the last `limit` webhook events (default 20). Returns newest first.
 */
export async function getRecentWebhookEvents(limit = 20): Promise<WebhookEvent[]> {
  const rows = await prisma.paymentWebhookEvent.findMany({
    orderBy: { ts: 'desc' },
    take: limit,
  })
  return rows.map(toEvent)
}

/**
 * Helper: build a log entry from the raw webhook inputs, with sensible
 * defaults. The caller passes the outcome (`status`, `error`, `httpStatus`)
 * and we handle the masking + truncation.
 */
export function buildEventInput(
  provider: string,
  body: string,
  headers: Headers,
  outcome: {
    status: WebhookStatus
    httpStatus: number
    error?: string
    reference?: string | null
    eventType?: string
  },
): Omit<WebhookEvent, 'id' | 'ts'> {
  let parsedBody: unknown = null
  try {
    parsedBody = JSON.parse(body)
  } catch {
    // Not JSON — that's OK for some providers
  }

  return {
    provider,
    eventType: outcome.eventType || extractEventType(provider, parsedBody),
    reference: outcome.reference,
    status: outcome.status,
    httpStatus: outcome.httpStatus,
    error: outcome.error,
    signatureHeader: maskSignature(
      headers.get('stripe-signature') ||
        headers.get('x-campay-signature') ||
        headers.get('x-fedapay-signature') ||
        headers.get('verif-hash') ||
        headers.get('x-paystack-signature') ||
        headers.get('x-notchpay-signature') ||
        headers.get('signature') ||
        undefined,
    ),
    bodyPreview: truncate(body, BODY_PREVIEW_MAX),
  }
}

/**
 * Clear all webhook events (admin action). Useful for testing.
 */
export async function clearWebhookLog(): Promise<void> {
  await prisma.paymentWebhookEvent.deleteMany({})
}

/**
 * Type re-export for the admin route.
 */
export type { PaymentProviderId }
