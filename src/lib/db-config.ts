/**
 * Builds the MySQL connection URL from separate DB_* env vars.
 *
 * WHY THIS EXISTS
 * ---------------
 * On shared hosting (Hostinger, cPanel, etc.), users prefer to fill in
 * discrete fields (DB_HOST, DB_USER, DB_PASSWORD, ...) rather than assemble
 * a `mysql://user:pass@host:port/db` URL by hand. Special chars in passwords
 * (`@`, `:`, `/`, `#`, space) break the URL if not percent-encoded, which is
 * a constant source of "Cannot connect to database" tickets.
 *
 * STRATEGY
 * --------
 * 1. If `DATABASE_URL` is already set, use it as-is (backward compat for
 *    users who already have a working URL).
 * 2. Otherwise, build it from `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD`
 *    / `DB_NAME`. URL-encode user + password so special chars are safe.
 * 3. Set `process.env.DATABASE_URL` so Prisma (which reads
 *    `env("DATABASE_URL")` from schema.prisma) picks it up.
 *
 * MYSQL 8 AUTH PLUGIN HANDLING (important)
 * ----------------------------------------
 * MySQL 8 ships with `caching_sha2_password` as the default auth plugin.
 * Over a non-TLS connection, the driver must retrieve the server's RSA
 * public key to encrypt the password — but it WILL NOT do so unless
 * `allowPublicKeyRetrieval=true` is passed. Without this, connections fail
 * with `ER_NOT_SUPPORTED_AUTH_MODE` / "Authentication failed for user ...",
 * which is the #1 cause of "MySQL works in phpMyAdmin but not in my Node app"
 * on Hostinger / cPanel / shared hosting.
 *
 * We therefore auto-add `allowPublicKeyRetrieval=true` to NON-SSL
 * connections (the default). To disable, set
 * `DB_ALLOW_PUBLIC_KEY_RETRIEVAL=false`. This is safe over localhost/
 * unix socket; for remote MySQL, prefer `DB_SSL=true` instead.
 *
 * CONSUMERS
 * ---------
 * - Next.js runtime: imported by `src/lib/db.ts` before PrismaClient init.
 * - Prisma CLI: imported by `scripts/with-db-env.ts` wrapper.
 */

/**
 * Assemble the mysql:// URL from individual env vars.
 * Throws a clear error if any required field is missing.
 */
export function buildDatabaseUrl(): string {
  // Backward compat: explicit URL wins.
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const name = process.env.DB_NAME

  const missing: string[] = []
  if (!host) missing.push('DB_HOST')
  if (!user) missing.push('DB_USER')
  if (!password) missing.push('DB_PASSWORD')
  if (!name) missing.push('DB_NAME')

  if (missing.length > 0) {
    throw new Error(
      `[db-config] Missing DB credentials. Either:\n` +
        `  (a) set DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DB_NAME", OR\n` +
        `  (b) set the separate fields: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME.\n` +
        `  Missing: ${missing.join(', ')}.\n` +
        `  See .env.template for reference.`
    )
  }

  const port = process.env.DB_PORT || '3306'
  const ssl = (process.env.DB_SSL || 'false').toLowerCase() === 'true'
  const connLimit = process.env.DB_CONNECTION_LIMIT || '10'
  // DB_SSL_ACCEPT=accept_invalid_certs — useful for Hostinger/cPanel where the
  // MySQL server uses a self-signed cert. Without this, Prisma rejects the
  // SSL handshake. Set DB_SSL=true + DB_SSL_ACCEPT=accept_invalid_certs on
  // hosts with self-signed certs. Defaults to "accept_invalid_certs" so that
  // enabling DB_SSL=true "just works" on shared hosting.
  const sslAccept = process.env.DB_SSL_ACCEPT || 'accept_invalid_certs'
  // DB_ALLOW_PUBLIC_KEY_RETRIEVAL — when SSL is OFF (the default for
  // localhost), MySQL 8's caching_sha2_password plugin requires the driver
  // to fetch the server's RSA public key to encrypt the password. The driver
  // refuses to do this unless explicitly opted in. Default: "true" so that
  // out-of-the-box localhost connections work on MySQL 8. Set to "false" only
  // if you've already migrated the user to mysql_native_password.
  const allowPkr = (process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL || 'true').toLowerCase() === 'true'

  // Percent-encode user & password so special chars (@, :, /, #, space, etc.)
  // don't break the URL parser. encodeURIComponent is the right tool here.
  const encUser = encodeURIComponent(user as string)
  const encPass = encodeURIComponent(password as string)

  // Build query string with URLSearchParams (handles encoding of values).
  const params = new URLSearchParams()
  params.set('connection_limit', connLimit)
  if (ssl) {
    params.set('ssl', 'true')
    // When SSL is on, also pass through sslaccept (defaults to accept_invalid_certs).
    if (sslAccept) params.set('sslaccept', sslAccept)
  } else if (allowPkr) {
    // Non-SSL connection to MySQL 8: enable RSA public key retrieval so
    // caching_sha2_password can encrypt the password. Safe over localhost;
    // for remote hosts prefer DB_SSL=true.
    params.set('allowPublicKeyRetrieval', 'true')
  }
  const queryStr = params.toString()

  return `mysql://${encUser}:${encPass}@${host}:${port}/${name}${
    queryStr ? `?${queryStr}` : ''
  }`
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
