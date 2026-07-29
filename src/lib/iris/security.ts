/**
 * Server-side auth security layer for Rimiris AI.
 *
 * Fixes:
 * - VULN-02: Real server-side auth on /api/ai/* endpoints
 * - VULN-03: Server-side admin verification using HMAC-signed cookie
 * - VULN-04: Session lives in httpOnly cookie (NOT just localStorage)
 * - VULN-07: Brute-force protection (in-memory rate limiter per IP+email)
 * - VULN-09: CSRF protection (Origin/Referer header check)
 * - VULN-12: Rate limiting on LLM endpoints
 *
 * Why both localStorage AND httpOnly cookie?
 * ------------------------------------------
 * The app was originally 100% client-side (PWA). We keep localStorage for
 * the React UI to read session synchronously, but the server no longer
 * trusts the client blindly: every API call must carry the HMAC-signed
 * `rimiris.session` cookie. The cookie is set on signIn/signUp and cleared
 * on signOut.
 *
 * The cookie is HMAC-SHA256 signed with RIMIRIS_SESSION_SECRET (env). If
 * the env var is missing, we generate an ephemeral one at boot and log a
 * warning — sessions will not survive a server restart, but the app keeps
 * working in development.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import type { AuthSession, AuthRole } from './auth-types'

// ============================================================================
// Secret — used to HMAC-sign the session cookie
// ============================================================================
const SESSION_SECRET =
  process.env.RIMIRIS_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  // Fallback: ephemeral secret. Sessions will not survive a restart,
  // but the app remains usable. We log a warning at first use.
  (() => {
    if (!process.env.RIMIRIS_SESSION_SECRET && !process.env.SESSION_SECRET) {
      console.warn(
        '[security] RIMIRIS_SESSION_SECRET not set — using ephemeral secret. ' +
          'Sessions will not survive server restarts. Set RIMIRIS_SESSION_SECRET in production.',
      )
    }
    return crypto.randomBytes(32).toString('hex')
  })()

const COOKIE_NAME = 'rimiris.session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// ============================================================================
// Cookie payload + signing
// ============================================================================
interface SignedSession {
  s: AuthSession   // the session payload
  sig: string      // HMAC-SHA256(payload, secret)
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
}

/**
 * Encode a session into a signed cookie value.
 */
export function encodeSessionCookie(session: AuthSession): string {
  const payload = JSON.stringify(session)
  const b64 = Buffer.from(payload, 'utf8').toString('base64url')
  const sig = sign(b64)
  return `${b64}.${sig}`
}

/**
 * Decode + verify a signed cookie value.
 * Returns null if the signature is invalid or the payload is malformed.
 */
export function decodeSessionCookie(value: string | undefined | null): AuthSession | null {
  if (!value || typeof value !== 'string') return null
  const dot = value.lastIndexOf('.')
  if (dot < 1) return null
  const b64 = value.slice(0, dot)
  const sig = value.slice(dot + 1)

  // Constant-time signature comparison
  const expected = sign(b64)
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null
  }

  try {
    const payload = Buffer.from(b64, 'base64url').toString('utf8')
    const session = JSON.parse(payload) as AuthSession
    // Basic shape validation
    if (!session.accountId || !session.email || !session.role) return null
    // Re-apply super-admin rule on the server side (VULN-03 defense-in-depth)
    return applyServerSuperAdminRule(session)
  } catch {
    return null
  }
}

// ============================================================================
// Server-side super-admin rule (VULN-03)
// ============================================================================
// This mirrors the client-side rule but is enforced server-side using the
// ADMIN_EMAIL constant. Even if an attacker tampers with localStorage and
// the cookie is signed (cannot forge a different role without the secret),
// this is defense-in-depth: if a code path somehow grants super_admin to a
// non-admin email, we strip it here.
export const ADMIN_EMAIL = 'admin@rimiris.com'

function applyServerSuperAdminRule(session: AuthSession): AuthSession {
  if (session.email === ADMIN_EMAIL) {
    return { ...session, role: 'super_admin' as AuthRole, tier: 'pro' }
  }
  if (session.role === 'super_admin' && session.email !== ADMIN_EMAIL) {
    return { ...session, role: 'user' as AuthRole }
  }
  return session
}

// ============================================================================
// Read verified session from a Next.js request (cookie-based)
// ============================================================================
export function getSessionFromRequest(req: NextRequest): AuthSession | null {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  return decodeSessionCookie(cookie)
}

export function isSuperAdminOnServer(req: NextRequest): boolean {
  const s = getSessionFromRequest(req)
  return !!s && s.role === 'super_admin'
}

// ============================================================================
// Set / clear the signed session cookie on a NextResponse
// ============================================================================
export function setSessionCookie(res: NextResponse, session: AuthSession) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: encodeSessionCookie(session),
    httpOnly: true,     // VULN-18 mitigation — JS cannot read the cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // VULN-09 mitigation — CSRF protection
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}

// ============================================================================
// CSRF protection (VULN-09)
// ============================================================================
// For state-changing requests (POST/PUT/DELETE), verify the Origin or
// Referer header matches the expected site. Browsers always send Origin on
// cross-origin requests; missing/unknown Origin is rejected.
export function checkCSRF(req: NextRequest): boolean {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true // safe methods
  }
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')
  if (!host) return false // misconfigured request

  // Accept if Origin matches host
  if (origin) {
    try {
      const u = new URL(origin)
      if (u.host === host) return true
    } catch {
      /* malformed origin — fall through to reject */
    }
    return false
  }
  // Fallback to Referer if Origin is missing (some browsers omit Origin on same-origin)
  if (referer) {
    try {
      const u = new URL(referer)
      if (u.host === host) return true
    } catch {
      /* malformed */
    }
  }
  // No Origin AND no Referer → reject. Real browsers always send at least one.
  return false
}

// ============================================================================
// Rate limiting (VULN-07 + VULN-12)
// ============================================================================
// Simple in-memory sliding-window rate limiter. Sufficient for a single-node
// deployment. For multi-node, replace with Redis.
interface RateBucket {
  count: number
  resetAt: number
}
const RATE_BUCKETS = new Map<string, RateBucket>()

interface RateLimitOptions {
  /** Unique key (e.g. ip+email for login, ip+accountId for LLM). */
  key: string
  /** Max requests in the window. */
  max: number
  /** Window size in ms. */
  windowMs: number
}

export function rateLimit(opts: RateLimitOptions): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const bucket = RATE_BUCKETS.get(opts.key)
  if (!bucket || bucket.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + opts.windowMs }
    RATE_BUCKETS.set(opts.key, fresh)
    return { allowed: true, remaining: opts.max - 1, resetAt: fresh.resetAt }
  }
  if (bucket.count >= opts.max) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt }
  }
  bucket.count++
  return { allowed: true, remaining: opts.max - bucket.count, resetAt: bucket.resetAt }
}

// Cleanup expired buckets every 5 minutes (memory hygiene)
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of RATE_BUCKETS) {
    if (b.resetAt <= now) RATE_BUCKETS.delete(k)
  }
}, 5 * 60 * 1000).unref?.()

// ============================================================================
// Auth helpers for route handlers
// ============================================================================
export interface AuthCheckResult {
  ok: boolean
  session?: AuthSession
  response?: NextResponse
}

/**
 * Require an authenticated session for a route.
 * Usage:
 *   const auth = requireSession(req)
 *   if (!auth.ok) return auth.response!
 *   // auth.session is guaranteed non-null here
 */
export function requireSession(req: NextRequest): AuthCheckResult {
  if (!checkCSRF(req)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'CSRF check failed.' },
        { status: 403 },
      ),
    }
  }
  const session = getSessionFromRequest(req)
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      ),
    }
  }
  return { ok: true, session }
}

/**
 * Require a super-admin session.
 */
export function requireSuperAdmin(req: NextRequest): AuthCheckResult {
  const auth = requireSession(req)
  if (!auth.ok) return auth
  if (auth.session!.role !== 'super_admin') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Forbidden — super admin only.' },
        { status: 403 },
      ),
    }
  }
  return auth
}

/**
 * Get the client IP for rate-limiting purposes.
 * Respects X-Forwarded-For (take the first IP, which is the client).
 */
export function getClientIP(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const xreal = req.headers.get('x-real-ip')
  if (xreal) return xreal.trim()
  return 'unknown'
}

// ============================================================================
// Brute-force protection on login (VULN-07)
// ============================================================================
// Per-IP+email: max 10 attempts per 15 minutes.
// Per-IP alone: max 30 attempts per 15 minutes (catches email enumeration).
export function checkLoginRateLimit(ip: string, email: string): { allowed: boolean; error?: string; retryAfterSec?: number } {
  const perIpEmail = rateLimit({
    key: `login:${ip}:${email.toLowerCase()}`,
    max: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!perIpEmail.allowed) {
    return {
      allowed: false,
      error: 'Trop de tentatives. Réessayez dans quelques minutes.',
      retryAfterSec: Math.ceil((perIpEmail.resetAt - Date.now()) / 1000),
    }
  }
  const perIp = rateLimit({
    key: `login:${ip}`,
    max: 30,
    windowMs: 15 * 60 * 1000,
  })
  if (!perIp.allowed) {
    return {
      allowed: false,
      error: 'Trop de tentatives depuis cette adresse. Réessayez plus tard.',
      retryAfterSec: Math.ceil((perIp.resetAt - Date.now()) / 1000),
    }
  }
  return { allowed: true }
}

// ============================================================================
// LLM rate limiting (VULN-12)
// ============================================================================
// Per-accountId: max 30 LLM calls per minute (protects against DoS and
// runaway scripts). Per-IP for anonymous: max 10/min (anonymous should be
// near-zero since all /api/ai/* require auth now).
export function checkLLMRateLimit(req: NextRequest, accountId?: string): { allowed: boolean; error?: string } {
  const ip = getClientIP(req)
  if (accountId) {
    const r = rateLimit({
      key: `llm:acct:${accountId}`,
      max: 30,
      windowMs: 60 * 1000,
    })
    if (!r.allowed) {
      return { allowed: false, error: 'Limite de requêtes IA atteinte (30/min). Réessayez dans 1 minute.' }
    }
    return { allowed: true }
  }
  // Anonymous (shouldn't happen since routes require auth, but defense-in-depth)
  const r = rateLimit({
    key: `llm:ip:${ip}`,
    max: 10,
    windowMs: 60 * 1000,
  })
  if (!r.allowed) {
    return { allowed: false, error: 'Limite de requêtes IA atteinte. Réessayez plus tard.' }
  }
  return { allowed: true }
}

// ============================================================================
// Encryption-at-rest for LLM API keys (VULN-15)
// ============================================================================
// We use AES-256-GCM with a key derived from RIMIRIS_ENCRYPTION_KEY (env).
// The encrypted blob is stored as: iv:authTag:ciphertext (all hex).
const ENCRYPTION_KEY =
  process.env.RIMIRIS_ENCRYPTION_KEY ||
  process.env.ENCRYPTION_KEY ||
  // Fallback ephemeral key (same warning as session secret)
  (() => {
    if (!process.env.RIMIRIS_ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY) {
      console.warn(
        '[security] RIMIRIS_ENCRYPTION_KEY not set — using ephemeral key. ' +
          'Stored API keys will not be decryptable after a server restart.',
      )
    }
    return crypto.randomBytes(32).toString('hex')
  })()

function deriveKey(): Buffer {
  // Derive a 32-byte AES key from the secret using PBKDF2
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, 'rimiris-key-v1', 100000, 32, 'sha256')
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return ''
  const key = deriveKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`
}

export function decryptSecret(blob: string): string {
  if (!blob) return ''
  // Backward compat: if the value is not in iv:tag:ct format, treat as plaintext
  // (this allows reading old configs written before encryption was added).
  if (!blob.includes(':')) return blob
  try {
    const [ivHex, tagHex, ctHex] = blob.split(':')
    const key = deriveKey()
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const ct = Buffer.from(ctHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString('utf8')
  } catch {
    // Decryption failed — either corrupted or wrong key. Return empty
    // so the caller treats it as "no key set" rather than crashing.
    return ''
  }
}

export { COOKIE_NAME, ADMIN_EMAIL as SERVER_ADMIN_EMAIL }
