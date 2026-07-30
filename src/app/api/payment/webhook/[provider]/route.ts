import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, type PaymentProviderId } from '@/lib/iris/payment-providers'
import { fulfillPayment } from '@/lib/iris/payment-fulfillment'
import { logWebhookEvent, buildEventInput } from '@/lib/iris/payment-webhook-log'

export const runtime = 'nodejs'

// ============================================================================
// POST /api/payment/webhook/[provider]
// ----------------------------------------------------------------------------
// Receives webhook notifications from payment providers. NO authentication —
// the provider doesn't have our session cookie. Instead, we verify the
// provider's cryptographic signature using the webhookSecret stored in
// .payment-config.json (encrypted at rest).
//
// CRITICAL: this endpoint must NOT call requireSession() — that would block
// the webhook. Signature verification is the ONLY auth layer.
//
// Once the signature is verified, we:
//   1. Extract the payment reference from the payload.
//   2. Call fulfillPayment(reference) which:
//      - Looks up the pending payment
//      - Upgrades the user's tier to 'pro' in the account store
//      - Records the revenue in .rimiris-revenue.json
//      - Marks the pending as 'paid'
//   3. Returns 200 to the provider (idempotent — multiple calls are safe).
//   4. Logs the event to .payment-webhook-log.json for admin debugging.
// ============================================================================

// Force dynamic — never cache webhook responses
export const dynamic = 'force-dynamic'

const VALID_PROVIDERS: Array<Exclude<PaymentProviderId, 'none'>> = [
  'stripe', 'campay', 'fedapay', 'flutterwave', 'paystack', 'notchpay', 'cinetpay',
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params
  const provider = providerParam as Exclude<PaymentProviderId, 'none'>
  if (!VALID_PROVIDERS.includes(provider)) {
    // Log unknown provider attempts (could be a scanner or a misconfigured route)
    let scanBody = ''
    try { scanBody = await req.text() } catch { /* ignore */ }
    await logWebhookEvent(
      buildEventInput(providerParam, scanBody, req.headers, {
        status: 'provider_unknown',
        httpStatus: 404,
        error: `Provider '${providerParam}' is not in the supported list.`,
      }),
    )
    return NextResponse.json(
      { error: 'Provider inconnu.' },
      { status: 404 },
    )
  }

  // Read the raw body — needed for signature verification (the body is
  // the canonical input to the HMAC). Next.js doesn't expose raw body by
  // default; we use .text() since the body is small (webhook payloads are
  // typically < 10 KB).
  let body: string
  try {
    body = await req.text()
  } catch {
    await logWebhookEvent(
      buildEventInput(provider, '', req.headers, {
        status: 'body_unreadable',
        httpStatus: 400,
        error: 'req.text() threw — likely a connection abort or oversize payload.',
      }),
    )
    return NextResponse.json(
      { error: 'Body illisible.' },
      { status: 400 },
    )
  }

  // Verify the provider's signature
  const verifyResult = await verifyWebhook(provider, body, req.headers)
  if (!verifyResult.valid) {
    // CRITICAL: return 200 (not 4xx) to providers to prevent infinite retries.
    // Stripe retries 4xx/5xx up to 16 times over 3 days — for an invalid
    // signature that will NEVER succeed, this is pure noise. Returning 200
    // tells the provider "got it, don't retry" while we still log the failure
    // in the DB for admin review.
    console.warn(
      `[webhook] ${provider} signature verification failed: ${verifyResult.error}`,
    )
    await logWebhookEvent(
      buildEventInput(provider, body, req.headers, {
        status: 'invalid_sig',
        httpStatus: 200,  // Changed from 400 to 200 to prevent provider retries
        error: verifyResult.error,
      }),
    )
    return NextResponse.json(
      { ok: true, fulfilled: false, reason: 'invalid-signature' },
      { status: 200 },
    )
  }

  // If the webhook is for an event we don't fulfill on (e.g. payment.failed),
  // return 200 without doing anything.
  if (!verifyResult.reference) {
    await logWebhookEvent(
      buildEventInput(provider, body, req.headers, {
        status: 'no_reference',
        httpStatus: 200,
        error: 'Signature OK but no actionable reference in payload.',
      }),
    )
    return NextResponse.json({ ok: true, fulfilled: false, reason: 'no-action' })
  }

  // Fulfill the payment (idempotent)
  const fulfillResult = await fulfillPayment(verifyResult.reference, provider)
  if (!fulfillResult.ok) {
    console.warn(
      `[webhook] ${provider} fulfillment failed for ref=${verifyResult.reference}: ${fulfillResult.error}`,
    )
    await logWebhookEvent(
      buildEventInput(provider, body, req.headers, {
        status: 'fulfill_failed',
        httpStatus: 200, // 200 to stop provider retries
        error: fulfillResult.error,
        reference: verifyResult.reference,
      }),
    )
    return NextResponse.json(
      { ok: false, error: fulfillResult.error },
      { status: 200 }, // 200 to stop provider retries
    )
  }

  await logWebhookEvent(
    buildEventInput(provider, body, req.headers, {
      status: fulfillResult.fulfilled ? 'fulfilled' : 'verified',
      httpStatus: 200,
      reference: verifyResult.reference,
      error: fulfillResult.fulfilled ? undefined : 'Already fulfilled (idempotent replay).',
    }),
  )

  return NextResponse.json({
    ok: true,
    fulfilled: fulfillResult.fulfilled,
    reference: verifyResult.reference,
  })
}

// Some providers ping the webhook with GET to verify it exists
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Webhook endpoint is alive.' })
}
