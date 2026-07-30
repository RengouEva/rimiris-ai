/**
 * Server-side auth API routes for Rimiris AI.
 *
 * Replaces the 100% client-side auth (VULN-04) with a hybrid model:
 *  - The client still stores the session in localStorage for UI reactivity.
 *  - The server ALSO sets an HMAC-signed httpOnly cookie that all
 *    authenticated endpoints verify.
 *  - Login is rate-limited (VULN-07).
 *  - Account store is backed by MySQL via Prisma (was .rimiris-accounts.json).
 *
 * Routes:
 *   POST /api/auth/login    { email, password } -> sets cookie, returns session
 *   GET  /api/auth/login    -> current session (from cookie)
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import {
  setSessionCookie,
  getSessionFromRequest,
  checkLoginRateLimit,
  getClientIP,
  ADMIN_EMAIL,
} from '@/lib/iris/security'
import { migrateLegacyTier, type TierId } from '@/lib/iris/tiers'
import { prisma } from '@/lib/db'
import type { Account } from '@prisma/client'

export const runtime = 'nodejs'

// Local union types for the role/tier fields. SQLite doesn't support Prisma
// enums, so these fields are stored as TEXT. We keep the TS types here so the
// rest of the codebase (signup, upgrade, fulfillment) doesn't need to change.
export type AccountRole = 'user' | 'admin' | 'super_admin'
export type AccountTier = 'free' | 'pro'

// ============================================================================
// Types — kept compatible with the old ServerAccount so the rest of the
// codebase (signup, upgrade, fulfillment) doesn't need to change.
// ============================================================================
export interface ServerAccount {
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

// ============================================================================
// Helpers — convert Prisma row ↔ ServerAccount (the legacy in-memory shape)
// ============================================================================
export function toServerAccount(row: Account): ServerAccount {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    salt: row.salt,
    role: row.role as 'user' | 'admin' | 'super_admin',
    tier: migrateLegacyTier(row.tier as TierId),
    createdAt: Number(row.createdAt),
    lastLoginAt: row.lastLoginAt ? Number(row.lastLoginAt) : null,
  }
}

// ============================================================================
// File-backed account store has been REMOVED. All persistence goes through
// Prisma. The following helpers wrap the DB calls and keep the old function
// signatures so the rest of the codebase works unchanged.
// ============================================================================

/**
 * Read ALL accounts from the DB.
 * Used by admin portal (via listAccounts client-side) and the revenue
 * aggregation in the analytics module.
 *
 * Note: this is read-heavy on purpose. If perf becomes an issue, switch to
 * specific `findUnique`/`findMany` calls in each consumer.
 */
export async function readStore(): Promise<{ accounts: ServerAccount[] }> {
  const rows = await prisma.account.findMany()
  return { accounts: rows.map(toServerAccount) }
}

/**
 * Find a single account by email. Returns null if not found.
 */
export async function findAccountByEmail(email: string): Promise<ServerAccount | null> {
  const row = await prisma.account.findUnique({ where: { email } })
  return row ? toServerAccount(row) : null
}

/**
 * Find a single account by ID.
 */
export async function findAccountById(id: string): Promise<ServerAccount | null> {
  const row = await prisma.account.findUnique({ where: { id } })
  return row ? toServerAccount(row) : null
}

/**
 * Create a new account row. Throws on duplicate email (caught by caller).
 */
export async function createAccount(account: ServerAccount): Promise<ServerAccount> {
  const row = await prisma.account.create({
    data: {
      id: account.id,
      email: account.email,
      name: account.name,
      passwordHash: account.passwordHash,
      salt: account.salt,
      role: account.role as AccountRole,
      tier: account.tier as AccountTier,
      createdAt: BigInt(account.createdAt),
      lastLoginAt: account.lastLoginAt ? BigInt(account.lastLoginAt) : null,
    },
  })
  return toServerAccount(row)
}

/**
 * Update an account. Only the fields passed in `patch` are touched.
 * Returns the updated ServerAccount, or null if not found.
 */
export async function updateAccount(
  id: string,
  patch: Partial<Omit<ServerAccount, 'id'>>,
): Promise<ServerAccount | null> {
  try {
    const data: Record<string, unknown> = {}
    if (patch.email !== undefined) data.email = patch.email
    if (patch.name !== undefined) data.name = patch.name
    if (patch.passwordHash !== undefined) data.passwordHash = patch.passwordHash
    if (patch.salt !== undefined) data.salt = patch.salt
    if (patch.role !== undefined) data.role = patch.role as AccountRole
    if (patch.tier !== undefined) data.tier = patch.tier as AccountTier
    if (patch.lastLoginAt !== undefined) {
      data.lastLoginAt = patch.lastLoginAt ? BigInt(patch.lastLoginAt) : null
    }
    const row = await prisma.account.update({
      where: { id },
      data,
    })
    return toServerAccount(row)
  } catch {
    return null
  }
}

// ============================================================================
// Password hashing (PBKDF2 — same algo as before, just inline now)
// ============================================================================
export function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha256')
    .toString('hex')
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
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

export function randomSalt(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function uuid(): string {
  return crypto.randomUUID()
}

// ============================================================================
// Super-admin rule — applied on every read so admin@rimiris.com is always
// super_admin + pro, even if a DB row says otherwise (defense-in-depth).
// ============================================================================
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

  // DB read must be wrapped — otherwise a DB connection failure bubbles up
  // as an opaque 500 with no body, making debugging painful.
  let stored: ServerAccount | null
  try {
    stored = await findAccountByEmail(email)
  } catch (e: any) {
    console.error('[login] DB read error (findAccountByEmail):', e)
    return NextResponse.json(
      {
        error: 'Service indisponible. Vérifiez la connexion à la base de données.',
        hint: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined,
      },
      { status: 503 },
    )
  }
  if (!stored) {
    // Same error as wrong password to avoid email enumeration.
    return NextResponse.json(
      { error: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }

  const account = applySuperAdminRule(stored)
  if (!verifyPassword(password, account.salt, account.passwordHash)) {
    return NextResponse.json(
      { error: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }

  // Persist lastLoginAt (and the enforced role/tier in case the super-admin
  // rule changed something). Wrap in try/catch so a transient DB error does
  // NOT block login — the session is still valid.
  try {
    await updateAccount(account.id, {
      lastLoginAt: Date.now(),
      role: account.role,
      tier: account.tier,
    })
  } catch (e: any) {
    console.error('[login] DB write error (updateAccount, non-blocking):', e)
  }

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
