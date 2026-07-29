# Rimiris AI — Configuration DB via phpMyAdmin

Ce dossier contient tout ce qu'il faut pour configurer la base de données MySQL
de Rimiris AI via **phpMyAdmin** (cPanel, Hostinger, ou tout hébergement mutualisé).

## 📦 Contenu

| Fichier | Rôle |
|---|---|
| `rimiris_schema.sql` | Crée les 6 tables (accounts, pending_payments, revenues, payment_configs, payment_config_audits, payment_webhook_events) + clés étrangères. **À importer en premier.** |
| `rimiris_admin_seed.sql` | Insère le compte `admin@rimiris.com` (super_admin / pro) avec un mot de passe hashé. **À importer en deuxième.** |
| `.env.template` | Template à copier en `.env` sur le serveur et à remplir avec tes vraies credentials. |

---

## 🚀 Étapes

### Étape 1 — Créer la base dans phpMyAdmin

1. Ouvre **phpMyAdmin** (depuis cPanel / Hostinger hPanel).
2. Clique sur **Bases de données** dans le menu du haut.
3. **Créer une base de données** :
   - Nom : `rimiris_prod` (ou `u123456789_rimiris_prod` sur hébergement mutualisé)
   - Interclassement : `utf8mb4_unicode_ci`
4. Clique sur **Créer**.

### Étape 2 — Créer un utilisateur MySQL (si pas déjà fait)

Toujours dans cPanel / hPanel → **Bases de données MySQL** → **Ajouter un utilisateur** :

- Nom d'utilisateur : `rimiris` (ou `u123456789_rimiris`)
- Mot de passe : génère-en un fort (32+ caractères aléatoires) et **note-le** — c'est ce que tu mettras dans `DATABASE_URL`.
- Clique sur **Créer l'utilisateur**.

Puis **Ajouter l'utilisateur à la base** :

- Sélectionne l'utilisateur et la base `rimiris_prod`.
- Coche **Tous les privilèges**.
- Clique sur **Ajouter**.

### Étape 3 — Importer le schéma

1. Dans phpMyAdmin, sélectionne ta base `rimiris_prod` dans la barre latérale gauche.
2. Clique sur l'onglet **Importer** (en haut).
3. **Fichier à importer** → choisis `rimiris_schema.sql`.
4. Format : **SQL** (détecté automatiquement).
5. Jeu de caractères du fichier : **utf-8**.
6. Clique sur **Importer** en bas.

✅ Tu dois voir le message `L'importation a été terminée avec succès` et 6 tables dans la barre latérale gauche.

### Étape 4 — Importer le compte admin

Même procédure :

1. Toujours sur la base `rimiris_prod` sélectionnée.
2. Onglet **Importer**.
3. Choisis `rimiris_admin_seed.sql`.
4. Clique sur **Importer**.

✅ Va dans la table `accounts` → tu dois voir 1 ligne avec `admin@rimiris.com`.

> ⚠️ **Sécurité** : le mot de passe par défaut `RimirisAdmin2026!` est hashé avec un salt unique, mais il est公开 dans le repo. **Change-le immédiatement après ta première connexion** via l'interface admin.

### Étape 5 — Générer les secrets pour `.env`

Sur un terminal (Local ou via SSH) :

```bash
# Génère 5 secrets différents — copie-colle chaque valeur
for i in 1 2 3 4 5; do openssl rand -hex 32; echo; done
```

Si tu n'as pas de terminal, utilise un générateur en ligne : <https://generate-secret.vercel.app/32>

### Étape 6 — Créer le fichier `.env` sur le serveur

1. Copie `.env.template` en `.env` à la racine du projet Next.js.
2. Remplace les valeurs :

```env
# 1) DATABASE — remplace USER, PASSWORD, et DB_NAME par ceux de l'étape 2
DATABASE_URL="mysql://USER:PASSWORD@127.0.0.1:3306/rimiris_prod"

# 2) SECRETS — colle les 5 valeurs générées à l'étape 5
RIMIRIS_SESSION_SECRET="colle_secret_1"
RIMIRIS_ENCRYPTION_KEY="colle_secret_2"
SESSION_SECRET="colle_secret_3"            # doit être ≠ de RIMIRIS_SESSION_SECRET
ENCRYPTION_KEY="colle_secret_4"            # doit être ≠ de RIMIRIS_ENCRYPTION_KEY
RIMIRIS_PAYMENT_SECRET="colle_secret_5"
PAYMENT_SECRET="colle_secret_5"            # peut être identique

# 3) URL publique
NEXT_PUBLIC_SITE_URL="https://ton-domaine.com"

# 4) LLM (zai = gratuit en sandbox ; sinon openai/anthropic/mistral/openrouter)
LLM_PROVIDER=zai
```

### Étape 7 — Build + Start

```bash
npm install
npx prisma generate        # régénère le client Prisma pour MySQL
npm run build
npm run start              # ou pm2 start ecosystem.config.js en production
```

### Étape 8 — Vérification

1. Ouvre `https://ton-domaine.com` dans le navigateur.
2. Clique sur **Connexion**.
3. Connecte-toi avec :
   - Email : `admin@rimiris.com`
   - Mot de passe : `RimirisAdmin2026!`
4. Une fois connecté : **change immédiatement le mot de passe** (panneau admin → sécurité).
5. Vérifie que tu vois le panneau admin (statistiques, comptes, etc.).

---

## 🔧 Problèmes fréquents

| Problème | Solution |
|---|---|
| `Access denied for user` | Vérifie que l'utilisateur a bien **tous les privilèges** sur la DB dans cPanel. |
| `Unknown database 'rimiris_prod'` | Tu as oublié de créer la DB à l'étape 1, ou son nom a un préfixe (`u123456789_rimiris_prod`). |
| `ER_CON_COUNT_ERROR` | Trop de connexions simultanées. Ajoute `?connection_limit=5` à la fin de `DATABASE_URL`. |
| Import qui échoue (table existe déjà) | Tu as déjà importé. Supprime toutes les tables puis réessaie, ou DROP DATABASE + CREATE DATABASE. |
| `prisma generate` n'a pas l'air de marcher | Vérifie que `DATABASE_URL` est bien chargé : `npx prisma validate`. |
| Admin login échoue | Vérifie que tu as bien importé `rimiris_admin_seed.sql`. Sinon, refais l'import (l'INSERT est `ON DUPLICATE KEY UPDATE`, donc idempotent). |

---

## 📁 Emplacement des fichiers sur le serveur

```
/var/www/rimiris/           (ou ~/public_html/rimiris/)
├── .env                    ← créé à l'étape 6 (NE PAS COMMIT)
├── .env.template
├── prisma/
│   └── schema.prisma
├── src/
└── ...

/home/z/my-project/download/db-setup/    ← ce dossier (à télécharger / cloner sur le serveur)
├── rimiris_schema.sql
├── rimiris_admin_seed.sql
└── .env.template
```
