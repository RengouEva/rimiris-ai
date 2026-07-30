-- ============================================================================
-- Rimiris AI — MySQL 8 auth plugin fix (for Hostinger / cPanel / shared hosting)
-- ============================================================================
--
-- PROBLEM
-- -------
-- MySQL 8 defaults to `caching_sha2_password` for new users. Prisma's mysql2
-- driver may fail the handshake with `ER_NOT_SUPPORTED_AUTH_MODE` or a
-- generic "Authentication failed" error when connecting over plain TCP
-- (no SSL, no RSA public key exchange).
--
-- This script switches the user to `mysql_native_password` which works
-- universally with all MySQL drivers.
--
-- USAGE
-- -----
-- 1. Login to phpMyAdmin (or mysql CLI) as the MySQL root/admin user.
-- 2. Edit the variables below to match your environment.
-- 3. Run the script.
-- 4. Restart your Node.js app (no MySQL restart needed).
--
-- ⚠️  Replace <YOUR_PASSWORD> with the EXACT same password you put in
--     DB_PASSWORD in your .env file. If they don't match, auth will still fail.
-- ============================================================================

-- STEP 1: Set these to your actual values
SET @db_user   = 'u658795094_rimirisai';
SET @db_pass   = '<YOUR_PASSWORD_HERE>';
SET @db_host   = '%';  -- use '%' if unsure; or 'localhost'; or specific IP

-- STEP 2: Switch the user to mysql_native_password
--         (MySQL 8 may need to install the plugin first)
ALTER USER 'u658795094_rimirisai'@'localhost'
  IDENTIFIED WITH mysql_native_password BY '<YOUR_PASSWORD_HERE>';

-- If the user exists as 'user'@'%' instead of 'user'@'localhost', also run:
-- ALTER USER 'u658795094_rimirisai'@'%'
--   IDENTIFIED WITH mysql_native_password BY '<YOUR_PASSWORD_HERE>';

-- STEP 3: Apply changes immediately
FLUSH PRIVILEGES;

-- STEP 4: Verify
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'u658795094_rimirisai';
-- Expected output:
--   +---------------------+-----------+-----------------------+
--   | user                | host      | plugin                |
--   +---------------------+-----------+-----------------------+
--   | u658795094_rimirisai | localhost | mysql_native_password |
--   +---------------------+-----------+-----------------------+

-- ============================================================================
-- ALTERNATIVE: if ALTER USER fails with "Plugin 'mysql_native_password' is
-- not loaded" (MySQL 8.4+), use this instead:
-- ============================================================================
-- CREATE USER 'u658795094_rimirisai'@'localhost'
--   IDENTIFIED WITH mysql_native_password BY '<YOUR_PASSWORD_HERE>';
-- GRANT ALL PRIVILEGES ON u658795094_rimirisai.* TO 'u658795094_rimirisai'@'localhost';
-- FLUSH PRIVILEGES;
