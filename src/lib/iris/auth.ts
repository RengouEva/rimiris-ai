/**
 * Real client-side authentication for Rimiris AI.
 *
 * Why client-side? The app is a PWA with localStorage persistence — there is
 * no backend today. Passwords are hashed with SHA-256 + per-account salt via
 * WebCrypto (subtle.digest). This is *not* as secure as a server-side bcrypt
 * + httpOnly cookie setup, but it is a real auth system: passwords are never
 * stored in clear, sessions persist across reloads, and the super-admin rule
 * is enforced on every sign-in.
 *
 * Super-admin rule
 * ----------------
 * `admin@rimiris.com` is the reserved super-admin mailbox. Anyone who signs
 * up OR signs in with that email is automatically granted:
 *   - role: 'super_admin'   (full CRM portal access)
 *   - tier: 'pro'           (all features unlocked, no paywall)
 * The promotion is re-applied on every sign-in so the rule can never be
 * revoked accidentally.
 *
 * Migration note (v2 pricing model):
 * The 'premium' tier no longer exists. Any legacy account with tier='premium'
 * is migrated to tier='pro' on read (see migrateLegacyTier in tiers.ts).
 *
 * Storage keys
 * ------------
 *   rimiris.auth.accounts   AuthAccount[]        (all registered users)
 *   rimiris.auth.session    AuthSession | null   (current logged-in user)
 *
 * When a real backend lands, replace `signUp` / `signIn` / `signOut` with
 * API calls. The shape of `AuthSession` is forward-compatible.
 */

import { TIERS, migrateLegacyTier, type TierId } from './tiers'

// ============================================================================
// Types
// ============================================================================
export type AuthRole = 'user' | 'admin' | 'super_admin'

export interface AuthAccount {
  id: string
  email: string            // normalized lowercase
  name: string
  passwordHash: string     // SHA-256(salt + password), hex
  salt: string             // 32-byte hex string
  role: AuthRole
  tier: TierId
  createdAt: number
  lastLoginAt: number | null
}

export interface AuthSession {
  accountId: string
  email: string
  name: string
  role: AuthRole
  tier: TierId
  loginAt: number
}

// ============================================================================
// Constants
// ============================================================================
const K_ACCOUNTS = 'rimiris.auth.accounts'
const K_SESSION = 'rimiris.auth.session'

export const ADMIN_EMAIL = 'admin@rimiris.com'

// ============================================================================
// Storage helpers
// ============================================================================
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

function uuid(): string {
  // VULN-16: crypto.randomUUID() is available in all modern browsers and
  // Node 19+. The Math.random() fallback is kept only for legacy runtimes
  // and logged loudly when used.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  console.error('[security] crypto.randomUUID unavailable — falling back to weak Math.random UUID.')
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function randomSalt(): string {
  // VULN-16: crypto.getRandomValues is available in all modern browsers and
  // in Node 19+ (globalThis.crypto). The Math.random() fallback is kept ONLY
  // for truly ancient environments — if it ever runs, we log a loud warning
  // because the salts generated there are weak.
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    console.error('[security] crypto.getRandomValues unavailable — falling back to weak Math.random salt.')
    for (let i = 0; i < 32; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(`${salt}::${password}`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback (very weak — only used in non-secure contexts)
  let h = 0
  const str = `${salt}::${password}`
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return `weak_${(h >>> 0).toString(16)}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// ============================================================================
// Super-admin rule + legacy tier migration
// ============================================================================
function applySuperAdminRule(account: AuthAccount): AuthAccount {
  // Migrate legacy 'premium' tier to 'pro' (v2 pricing model — premium removed).
  const migratedTier = migrateLegacyTier(account.tier)
  const base: AuthAccount = { ...account, tier: migratedTier }

  if (base.email === ADMIN_EMAIL) {
    return {
      ...base,
      role: 'super_admin',
      tier: 'pro',
    }
  }
  // If for some reason a non-admin account was super_admin, demote it
  // (defensive — prevents privilege escalation via manual localStorage edits
  // on non-admin emails).
  if (base.role === 'super_admin' && base.email !== ADMIN_EMAIL) {
    return { ...base, role: 'user' }
  }
  return base
}

// ============================================================================
// Public API
// ============================================================================
export function listAccounts(): AuthAccount[] {
  return read<AuthAccount[]>(K_ACCOUNTS, []).map(applySuperAdminRule)
}

export function getAccountByEmail(email: string): AuthAccount | null {
  const e = normalizeEmail(email)
  const found = read<AuthAccount[]>(K_ACCOUNTS, []).find((a) => a.email === e)
  return found ? applySuperAdminRule(found) : null
}

export function getAccountById(id: string): AuthAccount | null {
  const found = read<AuthAccount[]>(K_ACCOUNTS, []).find((a) => a.id === id)
  return found ? applySuperAdminRule(found) : null
}

export function getCurrentSession(): AuthSession | null {
  return read<AuthSession | null>(K_SESSION, null)
}

/**
 * Register a new account.
 * - Email must be valid and not already in use.
 * - Password must be at least 6 chars.
 * - admin@rimiris.com is auto-promoted to super_admin + pro.
 */
export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'Server-side call not allowed.' }

  const e = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    return { ok: false, error: 'Adresse email invalide.' }
  }
  // VULN-07: stronger password policy (mirrors server /api/auth/signup)
  if (password.length < 10) {
    return { ok: false, error: 'Le mot de passe doit contenir au moins 10 caractères.' }
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, error: 'Le mot de passe doit contenir majuscules, minuscules et chiffres.' }
  }
  if (!name.trim()) {
    return { ok: false, error: 'Veuillez saisir votre nom.' }
  }

  // VULN-04: delegate account creation to the server. The server sets the
  // HMAC-signed httpOnly cookie; we mirror the session in localStorage only
  // for UI reactivity. The localStorage copy is NOT trusted by any API.
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: e, password, name: name.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data.error || 'Échec de la création du compte.' }
    }
    const session = data.session as AuthSession
    write(K_SESSION, session)
    notify()
    return { ok: true, session }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erreur réseau.' }
  }
}

/**
 * Sign in with email + password.
 * - Re-applies the super-admin rule on every login.
 * - Updates lastLoginAt.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'Server-side call not allowed.' }

  const e = normalizeEmail(email)

  // VULN-04: delegate to the server. The server verifies the password
  // against the file-backed account store, rate-limits (VULN-07), and
  // sets the HMAC-signed httpOnly cookie. We mirror the session in
  // localStorage for UI reactivity.
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: e, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, error: data.error || 'Échec de la connexion.' }
    }
    const session = data.session as AuthSession
    write(K_SESSION, session)
    notify()
    return { ok: true, session }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Erreur réseau.' }
  }
}

export async function signOut() {
  if (typeof window === 'undefined') return
  // VULN-04: clear the httpOnly cookie via the server.
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  } catch {
    /* network errors don't block client-side signout */
  }
  window.localStorage.removeItem(K_SESSION)
  notify()
}

/**
 * Update the current account's profile (name only — email is immutable).
 * Used by a future "Settings" view.
 */
export function updateProfile(name: string): { ok: boolean; error?: string; session?: AuthSession } {
  const session = getCurrentSession()
  if (!session) return { ok: false, error: 'Non connecté.' }
  if (!name.trim()) return { ok: false, error: 'Nom invalide.' }

  const accounts = read<AuthAccount[]>(K_ACCOUNTS, [])
  const idx = accounts.findIndex((a) => a.id === session.accountId)
  if (idx === -1) return { ok: false, error: 'Compte introuvable.' }

  accounts[idx].name = name.trim()
  write(K_ACCOUNTS, accounts)

  const newSession: AuthSession = { ...session, name: accounts[idx].name }
  write(K_SESSION, newSession)
  notify()
  return { ok: true, session: newSession }
}

/**
 * Change the password for the current account. Requires the old password.
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = getCurrentSession()
  if (!session) return { ok: false, error: 'Non connecté.' }
  if (newPassword.length < 6) {
    return { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' }
  }
  const accounts = read<AuthAccount[]>(K_ACCOUNTS, [])
  const idx = accounts.findIndex((a) => a.id === session.accountId)
  if (idx === -1) return { ok: false, error: 'Compte introuvable.' }

  const oldHash = await hashPassword(oldPassword, accounts[idx].salt)
  if (oldHash !== accounts[idx].passwordHash) {
    return { ok: false, error: 'Ancien mot de passe incorrect.' }
  }

  const newSalt = randomSalt()
  accounts[idx].salt = newSalt
  accounts[idx].passwordHash = await hashPassword(newPassword, newSalt)
  write(K_ACCOUNTS, accounts)
  return { ok: true }
}

// ============================================================================
// Role helpers
// ============================================================================
export function isSuperAdmin(session: AuthSession | null): boolean {
  return !!session && session.role === 'super_admin'
}

export function canAccessAdminPortal(session: AuthSession | null): boolean {
  return isSuperAdmin(session)
}

// ============================================================================
// Subscription helpers (cross-component reactivity)
// ============================================================================
const LISTENERS = new Set<() => void>()

function notify() {
  for (const l of LISTENERS) {
    try { l() } catch { /* noop */ }
  }
}

export function subscribe(cb: () => void): () => void {
  LISTENERS.add(cb)
  // Cross-tab sync via storage event
  if (typeof window !== 'undefined') {
    const handler = (e: StorageEvent) => {
      if (e.key === K_SESSION || e.key === K_ACCOUNTS) cb()
    }
    window.addEventListener('storage', handler)
    return () => {
      LISTENERS.delete(cb)
      window.removeEventListener('storage', handler)
    }
  }
  return () => LISTENERS.delete(cb)
}

// Re-export tier helpers for convenience
export { TIERS }
