/**
 * GET /api/db-health — diagnostic endpoint for DB connection issues.
 *
 * Returns a JSON report showing:
 *   - which DB env vars are set (values masked)
 *   - the resolved DATABASE_URL (masked)
 *   - whether Prisma can reach the DB
 *   - whether the `accounts` table exists and how many rows it has
 *
 * USAGE
 * -----
 * Open in browser: http://localhost:3000/api/db-health
 * Or:              curl http://localhost:3000/api/db-health
 *
 * SECURITY
 * --------
 * - In production, requires super_admin session.
 * - In development, open to all (so you can debug from the browser).
 * - Never returns raw passwords or full secrets — always masked.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/iris/security'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mask(s: string, visible = 2): string {
  if (!s) return '(empty)'
  if (s.length <= visible * 2) return '*'.repeat(s.length)
  return s.slice(0, visible) + '*'.repeat(Math.min(s.length - visible * 2, 12)) + s.slice(-visible)
}

export async function GET(req: NextRequest) {
  // In production, gate behind super_admin OR a one-shot token query param.
  // The token bypass is for ops debugging when login itself is broken
  // (e.g. signup 500 because of DB issues). The token must match
  // RIMIRIS_PAYMENT_SECRET — a value only the server operator knows.
  if (process.env.NODE_ENV === 'production') {
    const session = getSessionFromRequest(req)
    const token = new URL(req.url).searchParams.get('token')
    const expectedToken = process.env.RIMIRIS_PAYMENT_SECRET || process.env.PAYMENT_SECRET
    const tokenOk = !!(token && expectedToken && token === expectedToken)
    if ((!session || session.role !== 'super_admin') && !tokenOk) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          hint: 'Login as super_admin, or append ?token=<RIMIRIS_PAYMENT_SECRET> to debug.',
        },
        { status: 403 },
      )
    }
  }

  const report: Record<string, any> = {
    ts: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    env: {},
    dbUrl: '(not set)',
    connection: null,
    tables: null,
  }

  // 1) Env vars (masked)
  const envKeys = [
    'DB_FILE',
    'DATABASE_URL',
  ]
  for (const k of envKeys) {
    const v = process.env[k]
    if (v === undefined) {
      report.env[k] = '(not set)'
    } else if (k === 'DATABASE_URL') {
      // For SQLite URLs, the path is not really a secret but mask anyway.
      report.env[k] = mask(v, 12)
    } else {
      report.env[k] = v
    }
  }

  // 2) Resolved DATABASE_URL (what Prisma actually sees)
  report.dbUrl = mask(process.env.DATABASE_URL || '', 12)

  // 3) Try a simple Prisma query
  try {
    // findFirst is cheap and doesn't require the table to have rows.
    await prisma.account.findFirst({ select: { id: true } })
    report.connection = { ok: true }
  } catch (e: any) {
    report.connection = {
      ok: false,
      error: String(e?.message || e),
      code: e?.code,
      // Prisma connection errors have these fields
      meta: e?.meta ? JSON.stringify(e.meta) : undefined,
    }
    // Don't even try the table count if we can't connect.
    return NextResponse.json(report, { status: 200 })
  }

  // 4) If connected, count rows in each known table
  try {
    const tableCounts: Record<string, number | string> = {}
    const models = ['account', 'pendingPayment', 'paymentWebhookEvent', 'revenue', 'paymentConfig', 'paymentConfigAudit'] as const
    for (const model of models) {
      try {
        // @ts-expect-error — dynamic model access on prisma client
        tableCounts[model] = await prisma[model].count()
      } catch (e: any) {
        tableCounts[model] = `ERR: ${e?.message || e}`
      }
    }
    report.tables = tableCounts
  } catch (e: any) {
    report.tables = { error: String(e?.message || e) }
  }

  return NextResponse.json(report, { status: 200 })
}
