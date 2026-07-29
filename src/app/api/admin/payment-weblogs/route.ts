import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/iris/security'
import {
  getRecentWebhookEvents,
  clearWebhookLog,
  type WebhookEvent,
} from '@/lib/iris/payment-webhook-log'

export const runtime = 'nodejs'

// ============================================================================
// /api/admin/payment-weblogs
// ----------------------------------------------------------------------------
// GET  → returns the last 50 webhook events (newest first) for the admin
//        dashboard "Paiements → Webhooks" panel.
// DELETE → clears the log (admin action — useful for testing).
//
// SECURITY: super_admin only — the webhook log may contain partial payment
// references and body previews that the regular admin shouldn't see.
// ============================================================================

export async function GET(req: NextRequest) {
  const forbidden = requireSuperAdmin(req)
  if (forbidden) return forbidden.response!

  const url = new URL(req.url)
  const limit = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50),
  )

  const events: WebhookEvent[] = getRecentWebhookEvents(limit)

  // Aggregate stats for the dashboard header
  const last24h = events.filter((e) => Date.now() - e.ts < 24 * 60 * 60 * 1000)
  const stats = {
    totalLogged: events.length,
    last24h: last24h.length,
    fulfilled: last24h.filter((e) => e.status === 'fulfilled').length,
    invalidSig: last24h.filter((e) => e.status === 'invalid_sig').length,
    fulfillFailed: last24h.filter((e) => e.status === 'fulfill_failed').length,
    noReference: last24h.filter((e) => e.status === 'no_reference').length,
  }

  return NextResponse.json({ events, stats })
}

export async function DELETE(req: NextRequest) {
  const forbidden = requireSuperAdmin(req)
  if (forbidden) return forbidden.response!

  clearWebhookLog()
  return NextResponse.json({ ok: true, message: 'Webhook log cleared.' })
}
