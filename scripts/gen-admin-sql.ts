/**
 * Generate a phpMyAdmin-friendly SQL file containing:
 *  - An INSERT for admin@rimiris.com with a PBKDF2-hashed password
 *  - Compatible with the password verification in src/app/api/auth/login/route.ts
 *
 * Usage:
 *   ADMIN_PASSWORD='YourStrong123' npx tsx scripts/gen-admin-sql.ts > download/db-setup/rimiris_admin_seed.sql
 */
import * as crypto from 'crypto'

const ADMIN_EMAIL = 'admin@rimiris.com'
const ADMIN_NAME = 'Administrateur Rimiris'
const ADMIN_ID = crypto.randomUUID()

const password = process.env.ADMIN_PASSWORD || 'RimirisAdmin2026!'
if (password.length < 10) {
  console.error('[gen] Password must be at least 10 chars.')
  process.exit(1)
}

const salt = crypto.randomBytes(32).toString('hex')
const passwordHash = crypto
  .pbkdf2Sync(password, salt, 1000, 64, 'sha256')
  .toString('hex')
const createdAt = Date.now()

// Escape backslashes and single quotes for SQL
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "''")

const sql = `-- ============================================================================
-- Rimiris AI — Admin user seed
-- ============================================================================
-- Email    : ${ADMIN_EMAIL}
-- Password : ${process.env.ADMIN_PASSWORD ? '*** (set via ADMIN_PASSWORD env)' : 'RimirisAdmin2026! (default — CHANGE IT)'}
-- Role     : super_admin
-- Tier     : pro
--
-- ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN via the admin UI.
-- This file contains a one-time hash+salt; regenerating produces new values.
-- ============================================================================

INSERT INTO \`accounts\` (
  \`id\`, \`email\`, \`name\`, \`passwordHash\`, \`salt\`,
  \`role\`, \`tier\`, \`createdAt\`, \`lastLoginAt\`
) VALUES (
  '${esc(ADMIN_ID)}',
  '${esc(ADMIN_EMAIL)}',
  '${esc(ADMIN_NAME)}',
  '${esc(passwordHash)}',
  '${esc(salt)}',
  'super_admin',
  'pro',
  ${createdAt},
  NULL
)
ON DUPLICATE KEY UPDATE
  \`name\`         = VALUES(\`name\`),
  \`passwordHash\` = VALUES(\`passwordHash\`),
  \`salt\`         = VALUES(\`salt\`),
  \`role\`         = 'super_admin',
  \`tier\`         = 'pro',
  \`lastLoginAt\`  = NULL;
`

console.log(sql)
