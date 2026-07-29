-- ============================================================================
-- Rimiris AI — Admin user seed
-- ============================================================================
-- Email    : admin@rimiris.com
-- Password : RimirisAdmin2026! (default — CHANGE IT)
-- Role     : super_admin
-- Tier     : pro
--
-- ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN via the admin UI.
-- This file contains a one-time hash+salt; regenerating produces new values.
-- ============================================================================

INSERT INTO `accounts` (
  `id`, `email`, `name`, `passwordHash`, `salt`,
  `role`, `tier`, `createdAt`, `lastLoginAt`
) VALUES (
  '8d550388-5e4e-4ffd-b59f-88af501297bd',
  'admin@rimiris.com',
  'Administrateur Rimiris',
  'b2182589c2c890b35288a7cf56ce470ceb9b1ca6ddcb4656e70101fac9dc519b57c89d4e4f79d41de2c596d51c2530c76d278c87f18ae2c091fa56a136e93ebe',
  'e385a61579b96ae2cb2e16b143d5045b20c6014591bb3d1a9f3d74a5c49dfae0',
  'super_admin',
  'pro',
  1785367132575,
  NULL
)
ON DUPLICATE KEY UPDATE
  `name`         = VALUES(`name`),
  `passwordHash` = VALUES(`passwordHash`),
  `salt`         = VALUES(`salt`),
  `role`         = 'super_admin',
  `tier`         = 'pro',
  `lastLoginAt`  = NULL;

