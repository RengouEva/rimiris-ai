/**
 * POST /api/auth/logout — clears the signed session cookie.
 */
import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, checkCSRF } from '@/lib/iris/security'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkCSRF(req)) {
    return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
