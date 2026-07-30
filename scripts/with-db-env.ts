/**
 * CLI wrapper: loads .env, builds DATABASE_URL from DB_FILE, then runs
 * the given command (typically `prisma ...` or `tsx scripts/seed-admin.ts`).
 *
 * WHY
 * ----
 * The Prisma CLI reads `env("DATABASE_URL")` from `prisma/schema.prisma`, but
 * for SQLite the URL format is `file:<path>`. This wrapper builds that URL
 * from the DB_FILE env var (or uses the default `./prisma/rimiris.db`)
 * before delegating to the wrapped command.
 *
 * USAGE
 * -----
 *   tsx scripts/with-db-env.ts prisma db push --accept-data-loss
 *   tsx scripts/with-db-env.ts prisma migrate dev
 *   tsx scripts/with-db-env.ts prisma migrate deploy
 *   tsx scripts/with-db-env.ts prisma generate
 *   tsx scripts/with-db-env.ts tsx scripts/seed-admin.ts
 *
 * NOTES
 * -----
 * - .env is loaded manually (no `dotenv` dep added).
 * - .env.local takes precedence over .env (matches Next.js behavior).
 * - Shell-set vars take precedence over .env files.
 * - DATABASE_URL is set in process.env before spawning the child command,
 *   so both the Prisma CLI and any Node script inherit it.
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ----------------------------------------------------------------------------
// 1) Minimal .env parser (no dotenv dep).
//    Loads .env.local first (higher priority), then .env (lower priority).
//    Shell-set vars always win.
// ----------------------------------------------------------------------------
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf-8')

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (!trimmed.includes('=')) continue

    const eqIdx = trimmed.indexOf('=')
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()

    // Strip surrounding quotes (single or double)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    // Shell-set vars take precedence — don't override.
    if (!(key in process.env)) {
      process.env[key] = val
    }
  }
}

const cwd = process.cwd()
loadEnvFile(resolve(cwd, '.env.local'))
loadEnvFile(resolve(cwd, '.env'))

// ----------------------------------------------------------------------------
// 2) Build DATABASE_URL from DB_FILE (or use existing DATABASE_URL).
//    Dynamic import so the .env values above are visible to db-config.ts.
//    Wrapped in an async main() because top-level await is not supported
//    in CJS output (which tsx defaults to for .ts files).
// ----------------------------------------------------------------------------
async function main() {
  const { databaseUrl } = await import('../src/lib/db-config.js')
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = databaseUrl
  }

  // ----------------------------------------------------------------------------
  // 3) Spawn the wrapped command with the now-populated env.
  // ----------------------------------------------------------------------------
  const [cmd, ...args] = process.argv.slice(2)
  if (!cmd) {
    console.error(
      '[with-db-env] No command given.\n' +
        'Usage: tsx scripts/with-db-env.ts <cmd> [args...]\n' +
        '  e.g. tsx scripts/with-db-env.ts prisma db push --accept-data-loss'
    )
    process.exit(1)
  }

  const child = spawn(cmd, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })

  child.on('error', (err) => {
    console.error(`[with-db-env] Failed to spawn "${cmd}":`, err.message)
    process.exit(1)
  })

  child.on('exit', (code) => {
    process.exit(code ?? 1)
  })
}

main().catch((err) => {
  console.error('[with-db-env] Fatal:', err)
  process.exit(1)
})
