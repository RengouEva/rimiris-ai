import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/iris/security'
import { prisma } from '@/lib/db'
import { migrateLegacyTier, type TierId } from '@/lib/iris/tiers'

export const runtime = 'nodejs'

// ============================================================================
// /api/admin/accounts — list all accounts from MySQL (super_admin only)
// ----------------------------------------------------------------------------
// Replaces the client-side `listAccounts()` that read from localStorage.
// The localStorage mirror is still kept in sync by signup/login/upgrade for
// UI reactivity, but the admin portal should fetch from this endpoint so
// the displayed list matches the DB exactly.
// ============================================================================

export async function GET(req: NextRequest) {
  const forbidden = requireSuperAdmin(req)
  if (forbidden) return forbidden.response!

  const rows = await prisma.account.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    accounts: rows.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      tier: migrateLegacyTier(a.tier as TierId),
      createdAt: Number(a.createdAt),
      lastLoginAt: a.lastLoginAt ? Number(a.lastLoginAt) : null,
    })),
  })
}
