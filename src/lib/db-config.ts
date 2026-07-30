/**
 * Builds the SQLite database URL for Prisma.
 *
 * WHY THIS EXISTS
 * ---------------
 * Prisma reads `env("DATABASE_URL")` from `prisma/schema.prisma`. For SQLite,
 * the URL format is `file:<path>`. This module builds that URL from a single
 * `DB_FILE` env var (defaulting to `./prisma/rimiris.db`) and sets
 * `process.env.DATABASE_URL` so PrismaClient picks it up automatically.
 *
 * WHY SQLITE FOR NOW
 * ------------------
 * MySQL 8 on Hostinger defaults to `caching_sha2_password` which requires
 * either TLS or `allowPublicKeyRetrieval=true`. SQLite eliminates the DB
 * server entirely — the database is just a file. Zero auth issues, zero
 * network config, trivial backups (`cp rimiris.db rimiris.db.bak`).
 *
 * STRATEGY
 * --------
 * 1. If `DATABASE_URL` is already set (e.g. user wants a custom path), use
 *    it as-is.
 * 2. Otherwise, build `file:<DB_FILE>` from `DB_FILE` (or the default
 *    `./prisma/rimiris.db`).
 * 3. Set `process.env.DATABASE_URL` so Prisma sees it.
 *
 * CONSUMERS
 * ---------
 * - Next.js runtime: imported by `src/lib/db.ts` before PrismaClient init.
 * - Prisma CLI: imported by `scripts/with-db-env.ts` wrapper.
 */

import { resolve } from 'node:path'

/**
 * Assemble the file: URL for Prisma SQLite.
 * Throws a clear error if DB_FILE is empty.
 */
export function buildDatabaseUrl(): string {
  // Backward compat: explicit URL wins.
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  // DB_FILE defaults to a project-relative path. The user can override
  // with an absolute path (e.g. /var/lib/rimiris/data.db on the server).
  const dbFile = process.env.DB_FILE || './prisma/rimiris.db'

  if (!dbFile.trim()) {
    throw new Error(
      `[db-config] DB_FILE is empty. Either:\n` +
        `  (a) set DATABASE_URL="file:/path/to/db.sqlite", OR\n` +
        `  (b) set DB_FILE="/path/to/db.sqlite" (or omit to use the default).\n` +
        `  See .env.template for reference.`
    )
  }

  // Resolve relative paths against the project root so the file is created
  // in a predictable location regardless of where the process is started.
  // (Caddy/PM2 might set cwd differently — this avoids surprises.)
  const resolved = resolve(dbFile)

  // Prisma SQLite URL format: "file:<absolute-path>"
  return `file:${resolved}`
}

/**
 * The resolved URL — computed once at module load.
 * Importing this module guarantees `process.env.DATABASE_URL` is set.
 */
export const databaseUrl = buildDatabaseUrl()

// Make sure Prisma sees it too — Prisma reads process.env.DATABASE_URL
// at client instantiation time, both in the Next.js runtime and the CLI.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl
}
