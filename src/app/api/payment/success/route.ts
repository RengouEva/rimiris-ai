import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/iris/security'
import { getPending } from '@/lib/iris/payment-pending'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/payment/success?ref=rdr_xxx&status=success|cancel
// ----------------------------------------------------------------------------
// The provider redirects the user's browser here after the hosted checkout.
// We:
//   1. Authenticate the user (they should still be logged in).
//   2. Look up the pending payment by reference.
//   3. If still 'pending' (webhook hasn't fired yet), poll the provider's
//      status endpoint (for providers that support server-to-server status
//      checks) and fulfill if confirmed.
//   4. Redirect to the workspace with a success/failure toast param.
// ============================================================================
export async function GET(req: NextRequest) {
  const auth = requireSession(req)
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/?payment=auth_required', req.url))
  }
  const url = new URL(req.url)
  const ref = url.searchParams.get('ref')
  const status = url.searchParams.get('status')

  if (!ref) {
    return NextResponse.redirect(new URL('/?payment=no_ref', req.url))
  }

  const pending = await getPending(ref)
  if (!pending) {
    return NextResponse.redirect(new URL('/?payment=not_found', req.url))
  }
  // Security: only the owner
  if (pending.accountId !== auth.session!.accountId) {
    return NextResponse.redirect(new URL('/?payment=forbidden', req.url))
  }

  // If cancelled, mark as failed
  if (status === 'cancel' && pending.status === 'pending') {
    const { markFailed } = await import('@/lib/iris/payment-pending')
    await markFailed(ref, 'User cancelled the checkout')
    return NextResponse.redirect(new URL('/?payment=cancelled', req.url))
  }

  // For Campay push (no redirect expected, but defensive), poll the status
  if (pending.provider === 'campay' && pending.status === 'pending' && pending.providerRef) {
    try {
      const { getActiveProvider } = await import('@/lib/iris/payment-providers')
      const active = await getActiveProvider()
      if (active && active.id === 'campay') {
        const creds = active.creds
        const baseUrl = creds.mode === 'test'
          ? 'https://demo.campay.net/api'
          : 'https://api.campay.net/api'
        const tokenRes = await fetch(`${baseUrl}/get-token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: creds.username, password: creds.password }),
        })
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json()
          const token = tokenData?.token
          if (token) {
            const statusRes = await fetch(
              `${baseUrl}/collect/${pending.providerRef}/`,
              { headers: { Authorization: `Token ${token}` } },
            )
            if (statusRes.ok) {
              const statusData = await statusRes.json()
              if (statusData?.status === 'SUCCESSFUL') {
                const { fulfillPayment } = await import('@/lib/iris/payment-fulfillment')
                await fulfillPayment(ref, 'campay')
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[success] Campay poll failed:', e)
    }
  }

  // For Stripe: poll the checkout session status
  if (pending.provider === 'stripe' && pending.status === 'pending' && pending.providerRef) {
    try {
      const { getActiveProvider } = await import('@/lib/iris/payment-providers')
      const active = await getActiveProvider()
      if (active && active.id === 'stripe' && active.creds.secretKey) {
        const sessionRes = await fetch(
          `https://api.stripe.com/v1/checkout/sessions/${pending.providerRef}`,
          { headers: { Authorization: `Bearer ${active.creds.secretKey}` } },
        )
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          if (sessionData?.payment_status === 'paid') {
            const { fulfillPayment } = await import('@/lib/iris/payment-fulfillment')
            await fulfillPayment(ref, 'stripe')
          }
        }
      }
    } catch (e) {
      console.warn('[success] Stripe poll failed:', e)
    }
  }

  // For Paystack: verify the transaction
  if (pending.provider === 'paystack' && pending.status === 'pending') {
    try {
      const { getActiveProvider } = await import('@/lib/iris/payment-providers')
      const active = await getActiveProvider()
      if (active && active.id === 'paystack' && active.creds.secretKey) {
        const verifyRes = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
          { headers: { Authorization: `Bearer ${active.creds.secretKey}` } },
        )
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          if (verifyData?.data?.status === 'success') {
            const { fulfillPayment } = await import('@/lib/iris/payment-fulfillment')
            await fulfillPayment(ref, 'paystack')
          }
        }
      }
    } catch (e) {
      console.warn('[success] Paystack verify failed:', e)
    }
  }

  // For Flutterwave: verify the transaction by tx_ref
  if (pending.provider === 'flutterwave' && pending.status === 'pending') {
    try {
      const { getActiveProvider } = await import('@/lib/iris/payment-providers')
      const active = await getActiveProvider()
      if (active && active.id === 'flutterwave' && active.creds.secretKey) {
        const verifyRes = await fetch(
          `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(ref)}`,
          { headers: { Authorization: `Bearer ${active.creds.secretKey}` } },
        )
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json()
          if (verifyData?.data?.status === 'successful') {
            const { fulfillPayment } = await import('@/lib/iris/payment-fulfillment')
            await fulfillPayment(ref, 'flutterwave')
          }
        }
      }
    } catch (e) {
      console.warn('[success] Flutterwave verify failed:', e)
    }
  }

  // Re-read after polling
  const updated = await getPending(ref)
  const paid = updated?.status === 'paid'
  const stillPending = updated?.status === 'pending'

  // Redirect to the workspace with the result
  const redirectUrl = paid
    ? `/?payment=success&tier=${updated?.tier || 'pro'}`
    : stillPending
    ? `/?payment=processing&ref=${ref}`
    : `/?payment=failed&reason=${encodeURIComponent(updated?.failureReason || 'unknown')}`

  return NextResponse.redirect(new URL(redirectUrl, req.url))
}
