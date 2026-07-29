/**
 * Seed script — creates the admin@rimiris.com super-admin account.
 *
 * Usage (after `prisma migrate deploy` or `prisma db push`):
 *   npx tsx scripts/seed-admin.ts        # default password "RimirisAdmin2026!"
 *   ADMIN_PASSWORD='YourStrong123' npx tsx scripts/seed-admin.ts
 *
 * The script is idempotent — if the admin account already exists, it just
 * resets the password (useful if you forget it).
 *
 * IMPORTANT: change the password immediately after first login via the
 * admin UI (or by editing the script and re-running).
 */

import * as crypto from 'crypto'
import { prisma } from '../src/lib/db'

const ADMIN_EMAIL = 'admin@rimiris.com'
const ADMIN_NAME = 'Administrateur Rimiris'

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha256')
    .toString('hex')
}

async function main() {
  const password = process.env.ADMIN_PASSWORD || 'RimirisAdmin2026!'
  if (password.length < 10) {
    console.error('[seed] Le mot de passe doit contenir au moins 10 caractères.')
    process.exit(1)
  }

  console.log(`[seed] Connexion à la DB...`)
  await prisma.$connect()

  const existing = await prisma.account.findUnique({ where: { email: ADMIN_EMAIL } })
  const salt = crypto.randomBytes(32).toString('hex')
  const passwordHash = hashPassword(password, salt)

  if (existing) {
    console.log(`[seed] Compte admin existant trouvé — réinitialisation du mot de passe.`)
    await prisma.account.update({
      where: { email: ADMIN_EMAIL },
      data: {
        passwordHash,
        salt,
        role: 'super_admin',
        tier: 'pro',
        name: ADMIN_NAME,
        lastLoginAt: null,
      },
    })
    console.log(`[seed] ✅ Mot de passe admin réinitialisé.`)
  } else {
    console.log(`[seed] Création du compte admin...`)
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        salt,
        role: 'super_admin',
        tier: 'pro',
        createdAt: BigInt(Date.now()),
      },
    })
    console.log(`[seed] ✅ Compte admin créé.`)
  }

  console.log(`[seed] Identifiants:`)
  console.log(`       Email    : ${ADMIN_EMAIL}`)
  console.log(`       Password : ${password}`)
  console.log(`       ⚠️  Changez ce mot de passe après la première connexion !`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('[seed] Échec :', e)
  process.exit(1)
})
