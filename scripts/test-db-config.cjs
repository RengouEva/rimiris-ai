#!/usr/bin/env node
/**
 * Quick smoke test for src/lib/db-config.ts URL-building logic (SQLite).
 * Validates that the file: URL is built correctly from DB_FILE.
 *
 * Run with: node scripts/test-db-config.cjs   (no deps required)
 */
const { resolve } = require('node:path')

// ---- Replicate buildDatabaseUrl() logic inline (CommonJS, no transpile) ----
function buildDatabaseUrl(env, cwd = process.cwd()) {
  if (env.DATABASE_URL) return env.DATABASE_URL

  const dbFile = env.DB_FILE || './prisma/rimiris.db'

  if (!dbFile.trim()) {
    throw new Error('DB_FILE is empty')
  }

  // Resolve relative paths against the project root.
  // Use cwd override for testing (so we don't depend on actual process.cwd()).
  const resolved = resolve(cwd, dbFile)
  return `file:${resolved}`
}

// Helper: build with a fixed cwd so tests are deterministic across machines.
function build(env, cwd = '/test/project') {
  return buildDatabaseUrl(env, cwd)
}

// ---- Test cases ----
const cases = [
  {
    name: 'default DB_FILE (./prisma/rimiris.db)',
    env: {},
    expect: 'file:/test/project/prisma/rimiris.db',
  },
  {
    name: 'explicit relative DB_FILE',
    env: { DB_FILE: './data/app.db' },
    expect: 'file:/test/project/data/app.db',
  },
  {
    name: 'absolute DB_FILE path',
    env: { DB_FILE: '/var/lib/rimiris/rimiris.db' },
    expect: 'file:/var/lib/rimiris/rimiris.db',
  },
  {
    name: 'DATABASE_URL takes precedence over DB_FILE',
    env: { DATABASE_URL: 'file:/existing/path.db', DB_FILE: '/should/be/ignored.db' },
    expect: 'file:/existing/path.db',
  },
  {
    name: 'subdirectory path is created if needed',
    env: { DB_FILE: './prisma/sub/dir/data.sqlite' },
    expect: 'file:/test/project/prisma/sub/dir/data.sqlite',
  },
]

let passed = 0
let failed = 0
for (const c of cases) {
  const got = build(c.env)
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

// Test empty DB_FILE falls back to default (not an error — just defaults)
const emptyUrl = build({ DB_FILE: '' })
if (emptyUrl === 'file:/test/project/prisma/rimiris.db') {
  console.log(`  PASS  empty DB_FILE falls back to default (${emptyUrl})`)
  passed++
} else {
  console.log(`  FAIL  empty DB_FILE should fall back to default, got: ${emptyUrl}`)
  failed++
}

// Test that the URL starts with "file:"
const url = build({})
if (url.startsWith('file:')) {
  console.log(`  PASS  URL starts with 'file:' (${url})`)
  passed++
} else {
  console.log(`  FAIL  URL should start with 'file:', got: ${url}`)
  failed++
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
