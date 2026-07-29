import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/iris/security'
import { TIERS, getProjectPrice, type TierId } from '@/lib/iris/tiers'
import { initiatePayment, getActiveProvider } from '@/lib/iris/payment-providers'
import { createPending, generateReference } from '@/lib/iris/payment-pending'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/payment/initiate?tier=pro&docType=memoire&phone=+2376XXXXXXXX
// ----------------------------------------------------------------------------
// Starts a real payment with the active provider. Requires an authenticated
// session. Returns a JSON response with:
//   {
//     ok: true,
//     provider: 'stripe',
//     mode: 'test'|'live',
//     reference: 'rdr_abc123',
//     redirectUrl: 'https://checkout.stripe.com/...',   // for hosted checkout
//     flow: 'redirect' | 'push'                          // push = Mobile Money
//   }
//
// The frontend either:
//   (a) redirects the browser to `redirectUrl` (flow='redirect'), or
//   (b) shows a "Confirm on your phone" screen and polls /api/payment/verify
//       (flow='push' — Campay Mobile Money)
// ============================================================================
export async function GET(req: NextRequest) {
  const auth = requireSession(req)
  if (!auth.ok) return auth.response!
  const session = auth.session!

  // Verify payment is enabled
  const active = getActiveProvider()
  if (!active) {
    return NextResponse.json(
      { error: 'Aucun prestataire de paiement configuré. Contactez l\'administrateur.' },
      { status: 503 },
    )
  }

  // Parse query params
  const url = new URL(req.url)
  const tier = (url.searchParams.get('tier') as TierId) || 'pro'
  if (!TIERS[tier]) {
    return NextResponse.json({ error: 'Plan invalide.' }, { status: 400 })
  }
  // Don't allow initiating a payment for the free tier
  if (tier === 'free') {
    return NextResponse.json({ error: 'Le plan Gratuit est gratuit — pas de paiement.' }, { status: 400 })
  }
  // Don't allow admin to "upgrade" (admin is always Pro)
  if (session.email === 'admin@rimiris.com') {
    return NextResponse.json(
      { error: 'Le compte admin est déjà Pro — pas de paiement requis.' },
      { status: 400 },
    )
  }

  const docType = url.searchParams.get('docType') || undefined
  const phone = url.searchParams.get('phone') || undefined
  const amountXAF = getProjectPrice(docType)

  // Build URLs (use the request's origin as the base)
  const origin = url.origin
  const returnUrl = `${origin}/api/payment/success`
  const notifyUrl = `${origin}/api/payment/webhook/${active.id}`

  const reference = generateReference()

  // Store the pending payment BEFORE calling the provider (so the webhook
  // can fulfill even if the user closes the browser right after redirect)
  createPending({
    reference,
    provider: active.id,
    accountId: session.accountId,
    email: session.email,
    name: session.name,
    tier,
    amountXAF,
    docType,
    mode: active.creds.mode,
    status: 'pending',
    createdAt: Date.now(),
  })

  // Initiate with the provider
  const description = docType
    ? `Rimiris AI — Plan ${TIERS[tier].name} (${docType})`
    : `Rimiris AI — Plan ${TIERS[tier].name}`

  const result = await initiatePayment({
    amountXAF,
    currency: 'XAF',
    accountId: session.accountId,
    email: session.email,
    name: session.name,
    reference,
    description,
    returnUrl,
    notifyUrl,
    payerPhone: phone,
  })

  if (!result.ok) {
    // Mark the pending as failed and return the error
    const { markFailed } = await import('@/lib/iris/payment-pending')
    markFailed(reference, result.error || 'Échec de l\'initiation')
    return NextResponse.json(
      { error: result.error, provider: result.provider, reference },
      { status: 502 },
    )
  }

  // Update the pending record with the provider's reference
  if (result.providerRef) {
    const { updatePending } = await import('@/lib/iris/payment-pending')
    updatePending(reference, { providerRef: result.providerRef })
  }

  // Determine the flow type
  const flow = result.redirectUrl ? 'redirect' : 'push'

  return NextResponse.json({
    ok: true,
    provider: result.provider,
    mode: active.creds.mode,
    reference,
    providerRef: result.providerRef,
    redirectUrl: result.redirectUrl,
    flow,
    amountXAF,
    tier,
  })
}
