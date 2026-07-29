import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/iris/security'
import { getPending } from '@/lib/iris/payment-pending'
import { getActiveProvider } from '@/lib/iris/payment-providers'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/payment/verify?ref=rdr_xxxxx
// ----------------------------------------------------------------------------
// Allows the frontend to poll the status of a payment (after Campay Mobile
// Money push, or after returning from a hosted checkout redirect).
//
// For Campay push: we poll Campay's /collect/{reference}/ status endpoint
// server-side, and if it's SUCCESSFUL, fulfill the payment. This is a
// fallback in case the webhook is delayed/blocked.
//
// For hosted-checkout providers (Stripe/FedaPay/FlW/Paystack/NotchPay/
// CinetPay): we just return the current pending status from our store. The
// webhook should already have fulfilled it. If not, the user can wait a few
// seconds and re-poll.
//
// Requires session — the user can only check their OWN payments (the pending
// record's accountId must match the session's accountId).
// ============================================================================
export async function GET(req: NextRequest) {
  const auth = requireSession(req)
  if (!auth.ok) return auth.response!
  const session = auth.session!

  const url = new URL(req.url)
  const ref = url.searchParams.get('ref')
  if (!ref) {
    return NextResponse.json({ error: 'Référence manquante.' }, { status: 400 })
  }

  const pending = getPending(ref)
  if (!pending) {
    return NextResponse.json({ error: 'Paiement introuvable.' }, { status: 404 })
  }
  // Security: only the owner can check this payment
  if (pending.accountId !== session.accountId) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }

  // For Campay push: poll the provider's status endpoint (server-to-server)
  // and fulfill if the payment has succeeded but our webhook hasn't fired yet.
  if (pending.provider === 'campay' && pending.status === 'pending' && pending.providerRef) {
    try {
      const active = getActiveProvider()
      if (active && active.id === 'campay') {
        const creds = active.creds
        const baseUrl = creds.mode === 'test'
          ? 'https://demo.campay.net/api'
          : 'https://api.campay.net/api'
        // Get token
        const tokenRes = await fetch(`${baseUrl}/get-token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: creds.username, password: creds.password }),
        })
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json()
          const token = tokenData?.token
          if (token) {
            // Poll the collect status
            const statusRes = await fetch(
              `${baseUrl}/collect/${pending.providerRef}/`,
              { headers: { Authorization: `Token ${token}` } },
            )
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              if (statusData?.status === 'SUCCESSFUL') {
                // Fulfill now (defense-in-depth if webhook is delayed)
                const { fulfillPayment } = await import('@/lib/iris/payment-fulfillment')
                fulfillPayment(ref, 'campay')
              }
            }
          }
        }
      }
    } catch (e) {
      // Best-effort — don't fail the verify call
      console.warn('[verify] Campay poll failed:', e)
    }
  }

  // Re-read the pending (may have been updated by the poll above)
  const updated = getPending(ref)

  return NextResponse.json({
    ok: true,
    reference: updated?.reference,
    status: updated?.status, // 'pending' | 'paid' | 'failed' | 'expired'
    provider: updated?.provider,
    tier: updated?.tier,
    amountXAF: updated?.amountXAF,
    paidAt: updated?.paidAt,
    failureReason: updated?.failureReason,
  })
}
