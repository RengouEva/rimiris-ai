/**
 * Prisma client singleton for server-side usage.
 *
 * WHY THIS EXISTS
 * ---------------
 * In development, Next.js hot-reloads modules constantly. If we instantiate
 * PrismaClient at module scope without protection, we end up with one client
 * per hot-reload — and the DB connection pool fills up within minutes.
 *
 * The fix is the standard `globalThis` trick: stash the client on the global
 * object so the next hot-reload reuses it instead of creating a new one.
 *
 * USAGE
 * -----
 *   import { prisma } from '@/lib/db'
 *   const user = await prisma.account.findUnique({ where: { email } })
 *
 * SERVER-ONLY — never import this from a client component. If you need data
 * in a client component, expose it via an API route.
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
