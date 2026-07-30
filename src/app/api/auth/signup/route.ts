/**
 * POST /api/auth/signup — create a new account + set signed session cookie.
 *
 * Replaces the client-side signUp for server-side trust. The client still
 * mirrors the session in localStorage for UI reactivity.
 *
 * Backend is MySQL via Prisma (was .rimiris-accounts.json file).
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  setSessionCookie,
  checkCSRF,
  checkLoginRateLimit,
  getClientIP,
} from '@/lib/iris/security'
import {
  findAccountByEmail,
  createAccount,
  applySuperAdminRule,
  normalizeEmail,
  toSession,
  hashPassword,
  randomSalt,
  uuid,
  type ServerAccount,
} from '../login/route'
import type { TierId } from '@/lib/iris/tiers'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!checkCSRF(req)) {
    return NextResponse.json({ error: 'CSRF check failed.' }, { status: 403 })
  }

  const ip = getClientIP(req)
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }

  const email = normalizeEmail(body?.email || '')
  const password = String(body?.password || '')
  const name = String(body?.name || '').trim()

  // Rate limit signup attempts (same bucket as login — prevents account
  // enumeration via signup too).
  const rl = checkLoginRateLimit(ip, email || 'unknown')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.error },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec || 60) } },
    )
  }

  // Validate (VULN-07: stronger password policy)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }
  // VULN-07 mitigation: bump minimum from 6 to 10 chars + complexity.
  if (password.length < 10) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 10 caractères.' },
      { status: 400 },
    )
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir majuscules, minuscules et chiffres.' },
      { status: 400 },
    )
  }
  if (!name) {
    return NextResponse.json({ error: 'Veuillez saisir votre nom.' }, { status: 400 })
  }

  // DB read must be wrapped — otherwise a DB connection failure bubbles up
  // as an opaque 500 with no body, making debugging painful.
  let existing: ServerAccount | null
  try {
    existing = await findAccountByEmail(email)
  } catch (e: any) {
    console.error('[signup] DB read error (findAccountByEmail):', e)
    return NextResponse.json(
      {
        error: 'Service indisponible. Vérifiez la connexion à la base de données.',
        // Helpful hint in dev only — never expose internals in prod.
        hint: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined,
      },
      { status: 503 },
    )
  }
  if (existing) {
    return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
  }

  const salt = randomSalt()
  const passwordHash = hashPassword(password, salt)

  const account: ServerAccount = applySuperAdminRule({
    id: uuid(),
    email,
    name,
    passwordHash,
    salt,
    role: 'user',
    tier: 'free' as TierId,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  })

  try {
    await createAccount(account)
  } catch (e: any) {
    // Prisma P2002 = unique constraint violation (race condition — two
    // signups at the same time with the same email).
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 })
    }
    console.error('[signup] Prisma error (createAccount):', e)
    return NextResponse.json(
      {
        error: 'Erreur serveur lors de la création du compte.',
        hint: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined,
      },
      { status: 500 },
    )
  }

  const session = toSession(account)
  const res = NextResponse.json({ ok: true, session })
  setSessionCookie(res, session)
  return res
}
