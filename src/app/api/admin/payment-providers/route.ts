import { NextRequest, NextResponse } from 'next/server'
import {
  requireSuperAdmin,
  getSessionFromRequest,
} from '@/lib/iris/security'
import {
  getMaskedConfig,
  pushProviderConfig,
  removeProvider,
  testProvider,
  readAuditLog,
  PROVIDER_REGISTRY,
  type PaymentProviderId,
} from '@/lib/iris/payment-providers'

export const runtime = 'nodejs'

// ============================================================================
// GET /api/admin/payment-providers
// Returns the current config with secret keys MASKED + provider registry + audit log.
// ============================================================================
export async function GET(req: NextRequest) {
  const forbidden = requireSuperAdmin(req)
  if (forbidden) return forbidden.response!

  const masked = await getMaskedConfig()
  const audit = await readAuditLog(30)

  return NextResponse.json({
    config: masked,
    providers: PROVIDER_REGISTRY.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      region: p.region,
      supportsXAF: p.supportsXAF,
      supportsMobileMoneyPush: p.supportsMobileMoneyPush,
      docsUrl: p.docsUrl,
      fields: p.fields,
    })),
    audit,
  })
}

// ============================================================================
// POST /api/admin/payment-providers
// Push (save) the new config to disk and invalidate the cache.
//
// Body shape:
// {
//   action: 'push' | 'remove' | 'test',
//   provider?: 'stripe' | 'campay' | ...,
//   mode?: 'test' | 'live',
//   fields?: { publishableKey?: string, secretKey?: string, ... },
//   setActive?: boolean,
// }
//
// SECURITY:
//   - requireSuperAdmin (HMAC-signed cookie + super_admin role)
//   - CSRF check (Origin/Referer) built into requireSession
//   - Secret fields encrypted at rest via AES-256-GCM
//   - Audit log appended on every push (timestamp + admin email + changed fields)
// ============================================================================
export async function POST(req: NextRequest) {
  const auth = requireSuperAdmin(req)
  if (!auth.ok) return auth.response!

  try {
    const body = await req.json()
    const session = auth.session!
    const adminEmail = session.email

    // ----- ACTION: TEST -----
    // Pings the provider's API with the CURRENTLY-STORED credentials.
    // Does NOT save anything.
    if (body.action === 'test') {
      if (!body.provider) {
        return NextResponse.json({ error: 'Provider requis.' }, { status: 400 })
      }
      const validProviders = PROVIDER_REGISTRY.map((p) => p.id)
      if (!validProviders.includes(body.provider)) {
        return NextResponse.json({ error: 'Provider inconnu.' }, { status: 400 })
      }
      const result = await testProvider(body.provider as Exclude<PaymentProviderId, 'none'>)
      return NextResponse.json({ ok: true, test: result })
    }

    // ----- ACTION: REMOVE -----
    if (body.action === 'remove') {
      if (!body.provider) {
        return NextResponse.json({ error: 'Provider requis.' }, { status: 400 })
      }
      const result = await removeProvider(
        body.provider as Exclude<PaymentProviderId, 'none'>,
        adminEmail,
      )
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json(result)
    }

    // ----- ACTION: PUSH (default) -----
    if (!body.provider) {
      return NextResponse.json({ error: 'Provider requis.' }, { status: 400 })
    }
    const validProviders = PROVIDER_REGISTRY.map((p) => p.id)
    if (!validProviders.includes(body.provider)) {
      return NextResponse.json({ error: 'Provider inconnu.' }, { status: 400 })
    }
    if (body.mode && !['test', 'live'].includes(body.mode)) {
      return NextResponse.json({ error: 'Mode invalide (test|live).' }, { status: 400 })
    }

    const result = await pushProviderConfig({
      provider: body.provider as Exclude<PaymentProviderId, 'none'>,
      mode: body.mode || 'test',
      fields: body.fields || {},
      setActive: body.setActive === true,
      adminEmail,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Optional: test the provider right after pushing
    let testResult
    if (body.test === true) {
      testResult = await testProvider(result.activeProvider)
    }

    return NextResponse.json({ ...result, test: testResult })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to push payment config.' },
      { status: 500 },
    )
  }
}
