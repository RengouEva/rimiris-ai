/**
 * Server-side auth API routes for Rimiris AI.
 *
 * Replaces the 100% client-side auth (VULN-04) with a hybrid model:
 *  - The client still stores the session in localStorage for UI reactivity.
 *  - The server ALSO sets an HMAC-signed httpOnly cookie that all
 *    authenticated endpoints verify.
 *  - Login is rate-limited (VULN-07).
 *
 * Routes:
 *   POST /api/auth/login    { email, password } -> sets cookie, returns session
 *   GET  /api/auth/login    -> current session (from cookie)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import {
  setSessionCookie,
  getSessionFromRequest,
  checkLoginRateLimit,
  getClientIP,
  ADMIN_EMAIL,
} from '@/lib/iris/security'
import { migrateLegacyTier, type TierId } from '@/lib/iris/tiers'

export const runtime = 'nodejs'

// ============================================================================
// File-backed account store (shared with signup route via the same file)
// ============================================================================
const ACCOUNTS_PATH = path.join(process.cwd(), '.rimiris-accounts.json')

interface ServerAccount {
  id: string
  email: string
  name: string
  passwordHash: string
  salt: string
  role: 'user' | 'admin' | 'super_admin'
  tier: TierId
  createdAt: number
  lastLoginAt: number | null
}

export type { ServerAccount }

interface AccountStore {
  accounts: ServerAccount[]
}

export function readStore(): AccountStore {
  try {
    if (fs.existsSync(ACCOUNTS_PATH)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_PATH, 'utf8'))
    }
  } catch {
    /* corrupt */
  }
  return { accounts: [] }
}

export function writeStore(store: AccountStore) {
  fs.writeFileSync(ACCOUNTS_PATH, JSON.stringify(store, null, 2), 'utf8')
}

// Server-side password hashing: PBKDF2 (1000 iterations, SHA-256, 64 bytes).
// For legacy accounts created client-side (single SHA-256), verify falls
// back to the weaker algorithm to allow migration.
function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha256')
    .toString('hex')
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  // Try PBKDF2 first (server-created accounts)
  const pbkdf2 = hashPassword(password, salt)
  if (pbkdf2.length === storedHash.length) {
    try {
      if (crypto.timingSafeEqual(Buffer.from(pbkdf2, 'hex'), Buffer.from(storedHash, 'hex'))) {
        return true
      }
    } catch {
      /* fall through */
    }
  }
  // Fall back to single SHA-256 (client-created legacy accounts)
  const legacy = crypto
    .createHash('sha256')
    .update(`${salt}::${password}`)
    .digest('hex')
  if (legacy.length === storedHash.length) {
    try {
      return crypto.timingSafeEqual(Buffer.from(legacy, 'hex'), Buffer.from(storedHash, 'hex'))
    } catch {
      return false
    }
  }
  return false
}

export function applySuperAdminRule(account: ServerAccount): ServerAccount {
  const tier = migrateLegacyTier(account.tier)
  if (account.email === ADMIN_EMAIL) {
    return { ...account, role: 'super_admin', tier: 'pro' }
  }
  if (account.role === 'super_admin' && account.email !== ADMIN_EMAIL) {
    return { ...account, role: 'user', tier }
  }
  return { ...account, tier }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function toSession(account: ServerAccount) {
  return {
    accountId: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    tier: account.tier,
    loginAt: Date.now(),
  }
}

export { hashPassword, verifyPassword, randomSalt, uuid }
function randomSalt(): string { return crypto.randomBytes(32).toString('hex') }
function uuid(): string { return crypto.randomUUID() }

// ============================================================================
// POST /api/auth/login
// ============================================================================
export async function POST(req: NextRequest) {
  const ip = getClientIP(req)
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 })
  }

  const email = normalizeEmail(body?.email || '')
  const password = String(body?.password || '')

  // Rate limit (VULN-07)
  const rl = checkLoginRateLimit(ip, email || 'unknown')
  if (!rl.allowed) {
    return NextResponse.json(
      { error: rl.error },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec || 60) } },
    )
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email et mot de passe requis.' },
      { status: 400 },
    )
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
  }

  const store = readStore()
  const idx = store.accounts.findIndex((a) => a.email === email)
  if (idx === -1) {
    // Same error as wrong password to avoid email enumeration.
    return NextResponse.json(
      { error: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }

  const account = applySuperAdminRule(store.accounts[idx])
  if (!verifyPassword(password, account.salt, account.passwordHash)) {
    return NextResponse.json(
      { error: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }

  store.accounts[idx].lastLoginAt = Date.now()
  store.accounts[idx].role = account.role
  store.accounts[idx].tier = account.tier
  writeStore(store)

  const session = toSession(account)
  const res = NextResponse.json({ ok: true, session })
  setSessionCookie(res, session)
  return res
}

// ============================================================================
// GET /api/auth/login — current session (from cookie)
// ============================================================================
export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ ok: false, session: null }, { status: 200 })
  }
  return NextResponse.json({ ok: true, session })
}
