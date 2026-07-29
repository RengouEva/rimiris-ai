/**
 * localStorage-based analytics + monetization store.
 *
 * Real auth-aware: events are tied to the current authenticated account
 * (see src/lib/iris/auth.ts). When no session exists, tracking is a no-op
 * so anonymous pre-login visits are not counted.
 *
 * In a real production setup, you'd push these events to a backend
 * (Postgres via Prisma, Stripe webhooks for revenue, etc.). When you wire
 * one up, replace `track()` / `getStats()` to fetch from the API — the
 * schema is forward-compatible.
 *
 * Stored under `rimiris.analytics.*` keys.
 */

import { TIERS, migrateLegacyTier, type TierId } from './tiers'
import { getCurrentSession, ADMIN_EMAIL } from './auth'

// ============================================================================
// Types
// ============================================================================
export type EventType =
  | 'page_view' // user landed on a view
  | 'project_created' // onboarding started
  | 'project_completed' // onboarding finished
  | 'section_drafted' // AI generated a section draft
  | 'section_humanized' // humanization pass run
  | 'export_run' // user exported a document
  | 'plagiarism_check'
  | 'coherence_audit'
  | 'soutenance_simulation'
  | 'upgrade_click' // user clicked an upgrade button
  | 'upgrade_complete' // user "paid" (simulated)
  | 'guide_uploaded'
  | 'ai_request' // any AI call (draft, plan, chat, etc.)

export type AnalyticsEvent = {
  type: EventType
  ts: number // epoch millis
  meta?: Record<string, string | number | boolean>
}

export type UserRecord = {
  id: string // anonymous uuid
  createdAt: number
  lastSeenAt: number
  tier: TierId
  email?: string // only if they entered it during upgrade
  name?: string
  country?: string
  institution?: string
  events: AnalyticsEvent[]
  // Aggregated counters (denormalized for fast admin queries)
  totals: {
    pageViews: number
    sectionsDrafted: number
    exports: number
    aiRequests: number
    upgradeClicks: number
  }
  // Monetization
  revenue: {
    total: number // in XAF (one-time payments)
    lastPaymentAt?: number
    history: { ts: number; amount: number; tier: TierId }[]
  }
}

export type GlobalStats = {
  totalUsers: number
  activeUsers7d: number
  activeUsers30d: number
  totalRevenue: number // XAF
  mrr: number // revenue collected over last 30 days (XAF)
  arr: number // annualized projection (mrr × 12), XAF
  arpu: number // average revenue per user, XAF
  conversionRate: number // % of users who upgraded
  totalEvents: number
  totalAIRequests: number
  totalExports: number
  totalSectionsDrafted: number
  tierDistribution: Record<TierId, number>
  recentEvents: AnalyticsEvent[]
  // Time series for charts (last 30 days, daily buckets)
  revenueSeries: { date: string; revenue: number }[]
  userSeries: { date: string; users: number }[]
  usageSeries: { date: string; requests: number }[]
}

// ============================================================================
// Storage keys
// ============================================================================
const K_USER = 'rimiris.analytics.user'        // current user's analytics record (keyed by auth email when logged in)
const K_EVENTS = 'rimiris.analytics.events'   // global event log (capped)
const K_USERS = 'rimiris.analytics.users'     // admin-facing user list (capped)

const MAX_EVENTS = 2000
const MAX_USERS = 500

// ============================================================================
// Utilities
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
    /* quota exceeded — silently ignore */
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================================================
// Current user (auth-aware)
// ============================================================================
//
// The analytics user record is keyed by the authenticated account's email.
// If no session exists, we return a lightweight anonymous record (id="anon")
// so call sites don't crash, but we do NOT persist it nor track events.

const ANON_USER: UserRecord = {
  id: 'anon',
  createdAt: 0,
  lastSeenAt: 0,
  tier: 'free',
  email: undefined,
  name: undefined,
  events: [],
  totals: {
    pageViews: 0,
    sectionsDrafted: 0,
    exports: 0,
    aiRequests: 0,
    upgradeClicks: 0,
  },
  revenue: { total: 0, history: [] },
}

export function getCurrentUser(): UserRecord {
  const session = getCurrentSession()
  if (!session) return { ...ANON_USER }

  // Use the auth email as the stable analytics ID — this lets the admin
  // portal join analytics totals with the auth accounts list.
  const emailKey = session.email
  const users = read<UserRecord[]>(K_USERS, [])
  const existing = users.find((u) => u.email === emailKey)
  if (existing) {
    existing.lastSeenAt = Date.now()
    existing.tier = migrateLegacyTier(session.tier)
    existing.name = session.name
    write(K_USERS, users)
    write(K_USER, existing)
    return existing
  }
  // First interaction under this session — create the analytics record.
  const newUser: UserRecord = {
    id: session.accountId,
    email: session.email,
    name: session.name,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    tier: migrateLegacyTier(session.tier),
    events: [],
    totals: {
      pageViews: 0,
      sectionsDrafted: 0,
      exports: 0,
      aiRequests: 0,
      upgradeClicks: 0,
    },
    revenue: { total: 0, history: [] },
  }
  write(K_USER, newUser)
  upsertUserInIndex(newUser)
  return newUser
}

export function updateUser(patch: Partial<UserRecord>): UserRecord {
  const session = getCurrentSession()
  if (!session) return { ...ANON_USER, ...patch }
  const users = read<UserRecord[]>(K_USERS, [])
  const idx = users.findIndex((u) => u.email === session.email)
  const base: UserRecord = idx >= 0 ? users[idx] : {
    id: session.accountId,
    email: session.email,
    name: session.name,
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    tier: session.tier,
    events: [],
    totals: { pageViews: 0, sectionsDrafted: 0, exports: 0, aiRequests: 0, upgradeClicks: 0 },
    revenue: { total: 0, history: [] },
  }
  const merged = { ...base, ...patch }
  merged.lastSeenAt = Date.now()
  if (idx >= 0) users[idx] = merged; else users.push(merged)
  write(K_USERS, users)
  write(K_USER, merged)
  return merged
}

function upsertUserInIndex(user: UserRecord) {
  const users = read<UserRecord[]>(K_USERS, [])
  const idx = users.findIndex((u) => u.id === user.id)
  if (idx >= 0) users[idx] = user
  else {
    users.push(user)
    if (users.length > MAX_USERS) users.shift() // cap
  }
  write(K_USERS, users)
}

// ============================================================================
// Event tracking
// ============================================================================
export function track(type: EventType, meta?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return
  const session = getCurrentSession()
  if (!session) return // do not track anonymous pre-login visits
  const user = getCurrentUser()
  const event: AnalyticsEvent = { type, ts: Date.now(), meta }

  // 1. Update user record
  user.events.push(event)
  if (user.events.length > 100) user.events = user.events.slice(-100)
  user.lastSeenAt = Date.now()

  switch (type) {
    case 'page_view':
      user.totals.pageViews += 1
      break
    case 'section_drafted':
      user.totals.sectionsDrafted += 1
      break
    case 'export_run':
      user.totals.exports += 1
      break
    case 'ai_request':
      user.totals.aiRequests += 1
      break
    case 'upgrade_click':
      user.totals.upgradeClicks += 1
      break
  }

  write(K_USER, user)
  upsertUserInIndex(user)

  // 2. Append to global event log (capped)
  const globalEvents = read<AnalyticsEvent[]>(K_EVENTS, [])
  globalEvents.push({ ...event, meta: { ...meta, _userId: user.id } })
  if (globalEvents.length > MAX_EVENTS) globalEvents.shift()
  write(K_EVENTS, globalEvents)
}

// ============================================================================
// Upgrade flow (VULN-05: now requires server-side verification)
// ============================================================================
//
// Previously the client could grant itself any tier by calling this function
// directly. Now we delegate to /api/auth/upgrade which verifies an HMAC
// payment signature (or accepts demo-mode upgrades if RIMIRIS_PAYMENT_SECRET
// is not set on the server).
//
// For a real payment integration (Stripe / FedaPay / Campay), the flow is:
//   1. Client clicks "Payer"
//   2. Client calls /api/payment/create-checkout which redirects to the
//      provider's hosted checkout page.
//   3. Provider calls /api/payment/webhook (server-to-server) on success.
//   4. The webhook computes the HMAC signature with RIMIRIS_PAYMENT_SECRET
//      and calls the upgrade internally.
//   5. (For polling-based UX) Client polls /api/auth/me which now returns
//      the upgraded tier from the verified cookie.
//
// In the current codebase, /api/auth/upgrade accepts demo-mode calls (no
// signature required) so the UX flow is unchanged — but the actual tier
// mutation happens on the SERVER, not in localStorage. The localStorage
// user record is mirrored here for UI reactivity only.
export async function upgradeToTier(
  tier: TierId,
  email?: string,
  name?: string,
  /** One-time project price in XAF (defaults to the tier's price). */
  priceXAFOverride?: number,
): Promise<{ ok: boolean; user: UserRecord }> {
  const session = getCurrentSession()
  if (!session) return { ok: false, user: { ...ANON_USER } }

  // VULN-05: delegate to the server. The server verifies the payment
  // signature (if configured) and updates the file-backed account store.
  // It also re-issues the HMAC-signed cookie with the new tier.
  try {
    const res = await fetch('/api/auth/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        tier,
        // In demo mode the server doesn't require these, but we send them
        // anyway so a real payment integration can validate them.
        paymentSignature: '',
        paymentTimestamp: Date.now(),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return { ok: false, user: getCurrentUser() }
    }

    // Mirror the upgrade in localStorage for UI reactivity.
    const finalTier: TierId = data.tier || migrateLegacyTier(tier)
    const user = getCurrentUser()
    const t = TIERS[finalTier]
    const amountXAF = priceXAFOverride ?? t.priceXAF

    user.tier = finalTier
    if (email) user.email = email
    if (name) user.name = name
    if (finalTier !== 'free' && session.email !== ADMIN_EMAIL && amountXAF > 0) {
      user.revenue.total += amountXAF
      user.revenue.lastPaymentAt = Date.now()
      user.revenue.history.push({ ts: Date.now(), amount: amountXAF, tier: finalTier })
    }

    write(K_USER, user)
    upsertUserInIndex(user)
    track('upgrade_complete', { tier: finalTier, amount: amountXAF })

    // Update the local session so useAuth re-renders immediately
    if (typeof window !== 'undefined') {
      try {
        const cur = JSON.parse(window.localStorage.getItem('rimiris.auth.session') || 'null')
        if (cur) {
          cur.tier = finalTier
          cur.role = data.session?.role || cur.role
          window.localStorage.setItem('rimiris.auth.session', JSON.stringify(cur))
        }
      } catch {
        /* ignore */
      }
    }

    return { ok: true, user }
  } catch (err: any) {
    return { ok: false, user: getCurrentUser() }
  }
}

// ============================================================================
// Admin queries
// ============================================================================
export function getAllUsers(): UserRecord[] {
  return read<UserRecord[]>(K_USERS, [])
}

export function getGlobalStats(): GlobalStats {
  const users = read<UserRecord[]>(K_USERS, [])
  const allEvents = read<AnalyticsEvent[]>(K_EVENTS, [])

  const now = Date.now()
  const DAY = 86400000
  const sevenDaysAgo = now - 7 * DAY
  const thirtyDaysAgo = now - 30 * DAY

  let totalRevenue = 0
  let totalEvents = 0
  let totalAIRequests = 0
  let totalExports = 0
  let totalSectionsDrafted = 0
  let upgradedUsers = 0
  const tierDistribution: Record<TierId, number> = {
    free: 0,
    pro: 0,
  }
  let active7 = 0
  let active30 = 0

  // Time series (30 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const revenueSeries: { date: string; revenue: number }[] = []
  const userSeries: { date: string; users: number }[] = []
  const usageSeries: { date: string; requests: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    revenueSeries.push({ date: iso, revenue: 0 })
    userSeries.push({ date: iso, users: 0 })
    usageSeries.push({ date: iso, requests: 0 })
  }
  const seriesIdx = (iso: string) =>
    revenueSeries.findIndex((p) => p.date === iso)

  for (const u of users) {
    totalRevenue += u.revenue.total
    const userTier = migrateLegacyTier(u.tier)
    tierDistribution[userTier] += 1
    if (userTier !== 'free') upgradedUsers += 1
    if (u.lastSeenAt >= sevenDaysAgo) active7 += 1
    if (u.lastSeenAt >= thirtyDaysAgo) active30 += 1

    // Count events
    totalEvents += u.events.length
    for (const e of u.events) {
      if (e.type === 'ai_request') totalAIRequests += 1
      if (e.type === 'export_run') totalExports += 1
      if (e.type === 'section_drafted') totalSectionsDrafted += 1
    }

    // Revenue time series
    for (const p of u.revenue.history) {
      const iso = new Date(p.ts).toISOString().slice(0, 10)
      const idx = seriesIdx(iso)
      if (idx >= 0) revenueSeries[idx].revenue += p.amount
    }

    // User signup time series
    const signupIso = new Date(u.createdAt).toISOString().slice(0, 10)
    const sIdx = seriesIdx(signupIso)
    if (sIdx >= 0) userSeries[sIdx].users += 1

    // Usage time series (from events)
    for (const e of u.events) {
      if (e.type === 'ai_request') {
        const iso = new Date(e.ts).toISOString().slice(0, 10)
        const idx = seriesIdx(iso)
        if (idx >= 0) usageSeries[idx].requests += 1
      }
    }
  }

  // MRR in this context = revenue collected over the last 30 days
  // (one-time payments, not true monthly recurring revenue).
  // ARR is a 12x annualized projection for display only.
  let recentRevenue30d = 0
  for (const u of users) {
    for (const p of u.revenue.history) {
      if (p.ts >= thirtyDaysAgo) recentRevenue30d += p.amount
    }
  }
  const mrr = recentRevenue30d
  const arr = mrr * 12

  const arpu = users.length > 0 ? Math.round(totalRevenue / users.length) : 0
  const conversionRate =
    users.length > 0 ? (upgradedUsers / users.length) * 100 : 0

  return {
    totalUsers: users.length,
    activeUsers7d: active7,
    activeUsers30d: active30,
    totalRevenue,
    mrr,
    arr: mrr * 12,
    arpu,
    conversionRate,
    totalEvents,
    totalAIRequests,
    totalExports,
    totalSectionsDrafted,
    tierDistribution,
    recentEvents: allEvents.slice(-50).reverse(),
    revenueSeries,
    userSeries,
    usageSeries,
  }
}


