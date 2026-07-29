import { NextResponse } from 'next/server'
import { getActiveProvider, PROVIDER_REGISTRY } from '@/lib/iris/payment-providers'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/payment/health
// Public endpoint — returns the active provider's PUBLIC metadata.
// NO secrets are exposed. Used by the pricing page to show a dynamic badge
// ("Paiement par Stripe", "Mobile Money via Campay", etc.) and by the
// upgrade dialog to know which provider SDK to load.
// ============================================================================
export async function GET() {
  const active = getActiveProvider()
  if (!active) {
    return NextResponse.json({
      enabled: false,
      provider: null,
      mode: null,
      message: 'Aucun prestataire de paiement configuré. Veuillez contacter l\'administrateur.',
    })
  }

  const descriptor = PROVIDER_REGISTRY.find((p) => p.id === active.id)
  return NextResponse.json({
    enabled: true,
    provider: {
      id: active.id,
      name: descriptor?.name || active.id,
      tagline: descriptor?.tagline || '',
      region: descriptor?.region || '',
      supportsXAF: descriptor?.supportsXAF ?? true,
      supportsMobileMoneyPush: descriptor?.supportsMobileMoneyPush ?? false,
    },
    mode: active.creds.mode,
    // Only expose the publishable/public key (these are designed to be
    // client-side). Never expose secret keys here.
    publishableKey: active.creds.publishableKey || active.creds.publicKey || null,
    siteId: active.creds.siteId || null, // CinetPay: site ID is public
  })
}
