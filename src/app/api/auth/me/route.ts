/**
 * GET /api/auth/me — return the current verified session.
 * The session is read from the HMAC-signed httpOnly cookie (NOT from the
 * client request body), so it cannot be forged.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/iris/security'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ ok: false, session: null }, { status: 200 })
  }
  return NextResponse.json({ ok: true, session })
}
