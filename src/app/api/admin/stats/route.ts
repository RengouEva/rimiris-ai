import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/iris/security'
import { prisma } from '@/lib/db'
import { migrateLegacyTier, type TierId } from '@/lib/iris/tiers'

export const runtime = 'nodejs'

// ============================================================================
// /api/admin/stats — aggregate stats from MySQL (super_admin only)
// ----------------------------------------------------------------------------
// Replaces the client-side `getGlobalStats()` that read from localStorage.
// Returns real numbers from the DB:
//   - totalUsers, activeUsers7d, activeUsers30d
//   - totalRevenue, mrr (30-day), arpu
//   - tierDistribution
//   - revenueSeries (last 30 days, daily buckets)
//
// NOTE: "active users" is approximated by lastLoginAt (since we don't track
// session-level activity server-side yet). This is good enough for the admin
// dashboard.
// ============================================================================

export async function GET(req: NextRequest) {
  const forbidden = requireSuperAdmin(req)
  if (forbidden) return forbidden.response!

  const now = Date.now()
  const sevenDaysAgo = BigInt(now - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = BigInt(now - 30 * 24 * 60 * 60 * 1000)

  // Total users
  const totalUsers = await prisma.account.count()

  // Active users (lastLoginAt within window)
  const activeUsers7d = await prisma.account.count({
    where: { lastLoginAt: { gte: sevenDaysAgo } },
  })
  const activeUsers30d = await prisma.account.count({
    where: { lastLoginAt: { gte: thirtyDaysAgo } },
  })

  // Tier distribution
  const allAccounts = await prisma.account.findMany({ select: { tier: true } })
  const tierDistribution: Record<TierId, number> = { free: 0, pro: 0 }
  for (const a of allAccounts) {
    const t = migrateLegacyTier(a.tier as TierId)
    tierDistribution[t] = (tierDistribution[t] || 0) + 1
  }

  // Revenue (last 30 days)
  const recentRevenues = await prisma.revenue.findMany({
    where: { ts: { gte: thirtyDaysAgo } },
  })
  const mrr = recentRevenues.reduce((sum, r) => sum + r.amount, 0)

  // Total revenue (all time)
  const allRevenues = await prisma.revenue.findMany()
  const totalRevenue = allRevenues.reduce((sum, r) => sum + r.amount, 0)

  // Revenue series (last 30 days, daily buckets)
  const revenueSeries: { date: string; revenue: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const dayStart = now - i * 24 * 60 * 60 * 1000
    const dayEnd = dayStart + 24 * 60 * 60 * 1000
    const dayRevenue = allRevenues
      .filter((r) => Number(r.ts) >= dayStart && Number(r.ts) < dayEnd)
      .reduce((sum, r) => sum + r.amount, 0)
    revenueSeries.push({
      date: new Date(dayStart).toISOString().slice(0, 10),
      revenue: dayRevenue,
    })
  }

  // User growth series (cumulative, last 30 days)
  const userSeries: { date: string; users: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const dayEnd = now - i * 24 * 60 * 60 * 1000
    const dayUsers = allAccounts.filter((a) => {
      // createdAt is BigInt, convert to Number for comparison
      // Note: allAccounts was fetched without createdAt — refetch with it.
      return true
    }).length
    userSeries.push({
      date: new Date(dayEnd).toISOString().slice(0, 10),
      users: 0, // placeholder — properly computed below
    })
  }

  // Proper user series (refetch with createdAt)
  const accountsWithDates = await prisma.account.findMany({ select: { createdAt: true } })
  for (let i = 29; i >= 0; i--) {
    const dayEnd = now - i * 24 * 60 * 60 * 1000
    const cumulativeUsers = accountsWithDates.filter(
      (a) => Number(a.createdAt) <= dayEnd,
    ).length
    userSeries[29 - i].users = cumulativeUsers
  }

  // ARPU (average revenue per user)
  const arpu = totalUsers > 0 ? Math.round(totalRevenue / totalUsers) : 0

  // Conversion rate (% of users who upgraded to pro)
  const conversionRate = totalUsers > 0
    ? (tierDistribution.pro / totalUsers) * 100
    : 0

  return NextResponse.json({
    totalUsers,
    activeUsers7d,
    activeUsers30d,
    totalRevenue,
    mrr,
    arr: mrr * 12,
    arpu,
    conversionRate,
    tierDistribution,
    revenueSeries,
    userSeries,
    // Analytics events (page views, AI requests, exports) are still in
    // localStorage — they're per-user tracking, not server-side.
    // The admin portal can mix client + server data.
    totalEvents: 0,
    totalAIRequests: 0,
    totalExports: 0,
    totalSectionsDrafted: 0,
    recentEvents: [],
    usageSeries: [],
  })
}
