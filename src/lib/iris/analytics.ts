/**
 * localStorage-based analytics + monetization store.
 *
 * In a real production setup, you'd push these events to a backend
 * (Postgres via Prisma, Stripe webhooks for revenue, etc.). For this
 * iteration, everything lives in localStorage so the admin portal can
 * show realistic stats without a server.
 *
 * The schema is forward-compatible: when you wire up a real backend,
 * you just replace `track()` / `getStats()` to fetch from the API.
 *
 * Stored under `rimiris.analytics.*` keys.
 */

import { TIERS, type TierId } from './tiers'

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
    total: number // in cents (EUR)
    lastPaymentAt?: number
    history: { ts: number; amount: number; tier: TierId }[]
  }
}

export type GlobalStats = {
  totalUsers: number
  activeUsers7d: number
  activeUsers30d: number
  totalRevenue: number // cents
  mrr: number // monthly recurring revenue, cents
  arr: number // annual recurring revenue, cents
  arpu: number // average revenue per user, cents
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
const K_USER = 'rimiris.analytics.user'
const K_EVENTS = 'rimiris.analytics.events' // global event log (capped)
const K_USERS = 'rimiris.analytics.users' // admin-facing user list (capped)
const K_SEED = 'rimiris.analytics.seeded' // flag: demo data inserted?

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
// Current user
// ============================================================================
export function getCurrentUser(): UserRecord {
  const existing = read<UserRecord | null>(K_USER, null)
  if (existing) {
    existing.lastSeenAt = Date.now()
    write(K_USER, existing)
    return existing
  }
  const newUser: UserRecord = {
    id: uuid(),
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    tier: 'free',
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
  return newUser
}

export function updateUser(patch: Partial<UserRecord>): UserRecord {
  const u = getCurrentUser()
  const merged = { ...u, ...patch }
  merged.lastSeenAt = Date.now()
  write(K_USER, merged)
  // Also update the users index
  upsertUserInIndex(merged)
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
// Upgrade flow (simulated payment)
// ============================================================================
export function upgradeToTier(
  tier: TierId,
  email?: string,
  name?: string,
): { ok: boolean; user: UserRecord } {
  const user = getCurrentUser()
  const t = TIERS[tier]
  const amount = t.priceMonthly * 100 // to cents

  user.tier = tier
  if (email) user.email = email
  if (name) user.name = name
  user.revenue.total += amount
  user.revenue.lastPaymentAt = Date.now()
  user.revenue.history.push({ ts: Date.now(), amount, tier })

  write(K_USER, user)
  upsertUserInIndex(user)
  track('upgrade_complete', { tier, amount })

  return { ok: true, user }
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
    premium: 0,
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
    tierDistribution[u.tier] += 1
    if (u.tier !== 'free') upgradedUsers += 1
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

  // MRR = sum of monthly tier prices for all paying users
  let mrr = 0
  for (const u of users) {
    if (u.tier === 'pro') mrr += TIERS.pro.priceMonthly * 100
    if (u.tier === 'premium') mrr += TIERS.premium.priceMonthly * 100
  }

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

// ============================================================================
// Demo seed — populates the admin portal with realistic data on first visit.
// Idempotent (checks K_SEED flag).
// ============================================================================
export function seedDemoData() {
  if (typeof window === 'undefined') return
  if (read<boolean>(K_SEED, false)) return

  const users: UserRecord[] = []
  const countries = ['France', 'Canada', 'Belgique', 'Suisse', 'Cameroun', 'Sénégal', 'Côte d\'Ivoire', 'Maroc']
  const institutions = [
    'UQAC', 'Université Paris-Sorbonne', 'Université de Montréal',
    'ULB', 'Université de Genève', 'ENIEG', 'UCAD', 'Université de Yaoundé I',
    'Université de Lille', 'Université de Lyon', 'HEC Montréal',
  ]
  const names = [
    'Sarah Martin', 'Mohamed El Idrissi', 'Camille Tremblay', 'Aïcha Diallo',
    'Thomas Dubois', 'Léa Nguyen', 'Pierre Ouédraogo', 'Marie-Claude Bélanger',
    'Ibrahim Sow', 'Julie Lefebvre', 'Karim Benali', 'Élodie Gauthier',
    'Yannick Mbarga', 'Sophie Lambert', 'Ousmane Fall', 'Chloé Roy',
    'Boubacar Touré', 'Manon Beaulieu', 'Awa Camara', 'Gabriel Caron',
    'Fatou Mbaye', 'Antoine Bouchard', 'Rachid Mansouri', 'Émilie Fortin',
    'Cheikh Ndiaye', 'Louis-Philippe Roy', 'Aminata Traoré', 'William Côté',
    'Ibrahima Sarr', 'Catherine Poirier',
  ]

  const now = Date.now()
  const DAY = 86400000

  for (let i = 0; i < 32; i++) {
    const createdAt = now - Math.floor(Math.random() * 90) * DAY - Math.floor(Math.random() * DAY)
    const lastSeenAt = createdAt + Math.floor(Math.random() * (now - createdAt))
    const tierRoll = Math.random()
    const tier: TierId = tierRoll < 0.62 ? 'free' : tierRoll < 0.88 ? 'pro' : 'premium'

    // Revenue history
    const t = TIERS[tier]
    const history =
      tier === 'free'
        ? []
        : [
            {
              ts: createdAt + Math.floor(Math.random() * DAY),
              amount: t.priceMonthly * 100,
              tier,
            },
          ]

    // Generate events for this user
    const events: AnalyticsEvent[] = []
    const numEvents = Math.floor(Math.random() * 80) + 5
    for (let j = 0; j < numEvents; j++) {
      const evtRoll = Math.random()
      let type: EventType = 'page_view'
      if (evtRoll < 0.55) type = 'page_view'
      else if (evtRoll < 0.72) type = 'ai_request'
      else if (evtRoll < 0.83) type = 'section_drafted'
      else if (evtRoll < 0.90) type = 'export_run'
      else if (evtRoll < 0.95) type = 'section_humanized'
      else type = 'upgrade_click'

      events.push({
        type,
        ts: createdAt + Math.floor(Math.random() * (lastSeenAt - createdAt || 1)),
      })
    }

    users.push({
      id: uuid(),
      createdAt,
      lastSeenAt,
      tier,
      email: `${names[i].toLowerCase().replace(/[^a-z]+/g, '.')}@gmail.com`,
      name: names[i],
      country: countries[Math.floor(Math.random() * countries.length)],
      institution: institutions[Math.floor(Math.random() * institutions.length)],
      events,
      totals: {
        pageViews: events.filter((e) => e.type === 'page_view').length,
        sectionsDrafted: events.filter((e) => e.type === 'section_drafted').length,
        exports: events.filter((e) => e.type === 'export_run').length,
        aiRequests: events.filter((e) => e.type === 'ai_request').length,
        upgradeClicks: events.filter((e) => e.type === 'upgrade_click').length,
      },
      revenue: {
        total: history.reduce((s, h) => s + h.amount, 0),
        lastPaymentAt: history[0]?.ts,
        history,
      },
    })
  }

  write(K_USERS, users)

  // Build a global event log from all users (most recent first)
  const allEvents: AnalyticsEvent[] = []
  for (const u of users) {
    for (const e of u.events) {
      allEvents.push({ ...e, meta: { _userId: u.id } })
    }
  }
  allEvents.sort((a, b) => b.ts - a.ts)
  write(K_EVENTS, allEvents.slice(0, MAX_EVENTS))

  write(K_SEED, true)
}
