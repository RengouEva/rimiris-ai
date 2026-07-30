#!/usr/bin/env node
/**
 * Quick smoke test for src/lib/db-config.ts URL-building logic.
 * Validates that special chars in password get URL-encoded properly.
 *
 * Run with: node scripts/test-db-config.cjs   (no deps required)
 */

// ---- Replicate buildDatabaseUrl() logic inline (CommonJS, no transpile) ----
function buildDatabaseUrl(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL

  const host = env.DB_HOST
  const user = env.DB_USER
  const password = env.DB_PASSWORD
  const name = env.DB_NAME

  const missing = []
  if (!host) missing.push('DB_HOST')
  if (!user) missing.push('DB_USER')
  if (!password) missing.push('DB_PASSWORD')
  if (!name) missing.push('DB_NAME')
  if (missing.length > 0) {
    throw new Error(`Missing: ${missing.join(', ')}`)
  }

  const port = env.DB_PORT || '3306'
  const ssl = (env.DB_SSL || 'false').toLowerCase() === 'true'
  const connLimit = env.DB_CONNECTION_LIMIT || '10'

  const encUser = encodeURIComponent(user)
  const encPass = encodeURIComponent(password)

  const params = new URLSearchParams()
  params.set('connection_limit', connLimit)
  if (ssl) params.set('ssl', 'true')
  const queryStr = params.toString()

  return `mysql://${encUser}:${encPass}@${host}:${port}/${name}${
    queryStr ? `?${queryStr}` : ''
  }`
}

// ---- Test cases ----
const cases = [
  {
    name: 'simple password',
    env: { DB_HOST: '127.0.0.1', DB_PORT: '3306', DB_USER: 'rimiris', DB_PASSWORD: 'secret123', DB_NAME: 'rimiris_prod' },
    expect: 'mysql://rimiris:secret123@127.0.0.1:3306/rimiris_prod?connection_limit=10',
  },
  {
    name: 'password with @ (would break URL)',
    env: { DB_HOST: 'localhost', DB_USER: 'u123', DB_PASSWORD: 'P@ssw0rd!', DB_NAME: 'db' },
    expect: 'mysql://u123:P%40ssw0rd!@localhost:3306/db?connection_limit=10',
  },
  {
    name: 'password with : / # ?',
    env: { DB_HOST: 'db.host', DB_USER: 'admin', DB_PASSWORD: 'a:b/c#d?e', DB_NAME: 'app' },
    expect: 'mysql://admin:a%3Ab%2Fc%23d%3Fe@db.host:3306/app?connection_limit=10',
  },
  {
    name: 'with SSL enabled',
    env: { DB_HOST: 'db.host', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'd', DB_SSL: 'true' },
    expect: 'mysql://u:p@db.host:3306/d?connection_limit=10&ssl=true',
  },
  {
    name: 'custom connection limit',
    env: { DB_HOST: 'h', DB_USER: 'u', DB_PASSWORD: 'p', DB_NAME: 'd', DB_CONNECTION_LIMIT: '5' },
    expect: 'mysql://u:p@h:3306/d?connection_limit=5',
  },
  {
    name: 'DATABASE_URL takes precedence over DB_* fields',
    env: { DATABASE_URL: 'mysql://existing:url@host:3306/db', DB_HOST: 'should', DB_USER: 'be', DB_PASSWORD: 'ignored', DB_NAME: 'x' },
    expect: 'mysql://existing:url@host:3306/db',
  },
]

let passed = 0
let failed = 0
for (const c of cases) {
  const got = buildDatabaseUrl(c.env)
  if (got === c.expect) {
    console.log(`  PASS  ${c.name}`)
    passed++
  } else {
    console.log(`  FAIL  ${c.name}`)
    console.log(`        got:      ${got}`)
    console.log(`        expected: ${c.expect}`)
    failed++
  }
}

// Test missing fields error
try {
  buildDatabaseUrl({ DB_HOST: 'h' })  // missing DB_USER, DB_PASSWORD, DB_NAME
  console.log('  FAIL  missing fields should throw')
  failed++
} catch (e) {
  console.log(`  PASS  missing fields throws: ${e.message}`)
  passed++
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
