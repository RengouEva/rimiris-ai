/**
 * File-backed webhook event log for payment providers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * When a webhook from a payment provider fails (bad signature, missing
 * reference, fulfillment error), it's nearly impossible to debug without
 * a server-side log. Providers don't expose their retry queue, and the
 * request payload is the only source of truth.
 *
 * This module records the LAST 200 webhook events to `.payment-webhook-log.json`
 * so the admin can inspect them from the dashboard (Paiements → Webhooks).
 *
 * STORAGE
 * -------
 * JSON file at `.payment-webhook-log.json` in the project root. Schema:
 *   {
 *     "events": [
 *       {
 *         "id": "wh_<uuid>",
 *         "ts": 1234567890,
 *         "provider": "stripe",
 *         "signatureHeader": "t=...,v1=...",   // masked/truncated
 *         "eventType": "checkout.session.completed",
 *         "reference": "rdr_abc123",            // extracted, may be null
 *         "status": "verified" | "invalid_sig" | "no_reference"
 *                  | "fulfilled" | "fulfill_failed" | "no_action",
 *         "error": "optional error message",
 *         "httpStatus": 200 | 400,
 *         "bodyPreview": "first 500 chars of body" // truncated for size
 *       }
 *     ]
 *   }
 *
 * SAFETY
 * ------
 * - Max 200 entries (older ones dropped automatically).
 * - Body preview capped at 500 chars to keep the file small.
 * - Signature header masked (first 40 chars + "…") — never the full secret.
 * - Atomic write via tmp + rename.
 * - No PII: email/accountId not stored (the reference is enough to cross-
 *   reference with .payment-pending.json if needed).
 */

import * as fs from 'fs'
import * as path from 'path'
import type { PaymentProviderId } from './payment-providers'

const LOG_PATH = path.join(process.cwd(), '.payment-webhook-log.json')
const MAX_EVENTS = 200
const BODY_PREVIEW_MAX = 500
const SIG_PREVIEW_MAX = 40

// ============================================================================
// Types
// ============================================================================
export type WebhookStatus =
  | 'verified' // signature OK, reference extracted, fulfillment attempted
  | 'invalid_sig' // signature verification failed (likely forged or wrong secret)
  | 'no_reference' // signature OK but no reference in payload (e.g. payment.failed)
  | 'no_action' // signature OK, but event type doesn't trigger fulfillment
  | 'fulfilled' // payment upgraded to Pro successfully
  | 'fulfill_failed' // fulfillment raised an error
  | 'provider_unknown' // URL had a provider we don't support
  | 'body_unreadable' // couldn't read the raw body

export interface WebhookEvent {
  /** Unique event ID for dedup. */
  id: string
  /** Unix timestamp (ms). */
  ts: number
  /** Which provider the webhook came from (URL segment). */
  provider: string
  /** Event type from the payload, if extractable. */
  eventType?: string
  /** Payment reference extracted from the payload (rdr_xxx), if any. */
  reference?: string | null
  /** Outcome of processing. */
  status: WebhookStatus
  /** HTTP status we returned to the provider. */
  httpStatus: number
  /** Optional error message. */
  error?: string
  /** Masked signature header (first 40 chars + …). */
  signatureHeader?: string
  /** First 500 chars of the raw body (for debugging). */
  bodyPreview?: string
}

interface WebhookLogStore {
  events: WebhookEvent[]
}

// ============================================================================
// I/O helpers (atomic write, same pattern as payment-pending.ts)
// ============================================================================
function readStore(): WebhookLogStore {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const raw = fs.readFileSync(LOG_PATH, 'utf8')
      const parsed = JSON.parse(raw) as WebhookLogStore
      if (!parsed.events || !Array.isArray(parsed.events)) {
        return { events: [] }
      }
      return parsed
    }
  } catch {
    /* corrupt — return empty */
  }
  return { events: [] }
}

function writeStore(store: WebhookLogStore) {
  const tmp = LOG_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8')
  fs.renameSync(tmp, LOG_PATH)
}

// ============================================================================
// Utility
// ============================================================================
function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return 'wh_' + crypto.randomUUID().slice(0, 12)
  }
  return 'wh_' + Math.random().toString(36).slice(2, 14)
}

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
  // Most providers use a top-level `event` or `type` field
  if (typeof obj.event === 'string') return obj.event
  if (typeof obj.type === 'string') return obj.type
  // Stripe uses `type`
  if (typeof obj.data === 'object' && obj.data !== null) {
    const data = obj.data as Record<string, unknown>
    if (typeof data.event === 'string') return data.event
  }
  // CinetPay uses cpm_result
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
 */
export function logWebhookEvent(
  input: Omit<WebhookEvent, 'id' | 'ts'> & { ts?: number },
): void {
  try {
    const store = readStore()
    const event: WebhookEvent = {
      id: genId(),
      ts: input.ts ?? Date.now(),
      provider: input.provider,
      eventType: input.eventType,
      reference: input.reference ?? null,
      status: input.status,
      httpStatus: input.httpStatus,
      error: input.error,
      signatureHeader: input.signatureHeader,
      bodyPreview: input.bodyPreview,
    }
    store.events.unshift(event) // newest first
    // Trim to MAX_EVENTS
    if (store.events.length > MAX_EVENTS) {
      store.events = store.events.slice(0, MAX_EVENTS)
    }
    writeStore(store)
  } catch (e) {
    // Logging must never break the webhook flow
    console.warn('[webhook-log] failed to persist event:', e)
  }
}

/**
 * Read the last `limit` webhook events (default 20). Returns newest first.
 */
export function getRecentWebhookEvents(limit = 20): WebhookEvent[] {
  const store = readStore()
  return store.events.slice(0, limit)
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
  // Try to parse the body for the event type if not provided
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
export function clearWebhookLog(): void {
  writeStore({ events: [] })
}

/**
 * Type re-export for the admin route.
 */
export type { PaymentProviderId }
