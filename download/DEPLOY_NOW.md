# 🚀 DÉPLOIEMENT IMMÉDIAT — SQLite

> **Problème actuel** : votre site retourne 503 sur `/api/auth/login` parce que
> le serveur Hostinger tourne encore avec l'ancien code MySQL. Le commit
> `b67f7dd` (SQLite) est déjà poussé sur GitHub — il suffit de le déployer.

## Étapes à exécuter sur le serveur Hostinger (via SSH)

Connectez-vous en SSH à votre VPS Hostinger, puis :

```bash
# 1) Aller dans le dossier du projet
cd ~/rimiris-ai   # ← adaptez le chemin si différent

# 2) Récupérer le dernier code (commit b67f7dd = passage à SQLite)
git pull origin main

# 3) Installer les dépendances (au cas où)
npm install --omit=dev

# 4) Créer le dossier qui accueillera le fichier SQLite
sudo mkdir -p /var/lib/rimiris
sudo chown $(whoami):$(whoami) /var/lib/rimiris

# 5) Uploadez le fichier .env (voir section ci-dessous)
#    puis copiez-le à la racine du projet :
#    (depuis votre PC : scp download/rimiris-ai.env user@serveur:~/rimiris-ai/.env)
#    OU si vous l'avez déjà sur le serveur :
cp /chemin/vers/rimiris-ai.env .env
chmod 600 .env   # sécurisé

# 6) Générer le client Prisma + créer les tables SQLite
npx prisma generate
npx prisma migrate deploy
# ↑ Cette commande crée le fichier /var/lib/rimiris/rimiris.db
#   avec toutes les tables (accounts, pending_payments, etc.)

# 7) Créer le compte admin par défaut
npm run seed:admin
# ↑ Affiche : admin@rimiris.com / RimirisAdmin2026!

# 8) Rebuild le projet
npm run build

# 9) Redémarrer PM2 avec les nouvelles variables d'env
pm2 restart rimiris-ai --update-env
# (ou pm2 reload rimiris-ai --update-env)

# 10) Vérifier que ça marche
pm2 logs rimiris-ai --lines 30
curl -s http://localhost:3000/api/db-health | head -50
```

## Test final

1. Ouvrez https://iris.interdata.group
2. Cliquez sur **Connexion**
3. Email : `admin@rimiris.com`
4. Mot de passe : `RimirisAdmin2026!`
5. ✅ Vous êtes connecté en super_admin

## Diagnostic en cas de souci

```bash
# Vérifier que le fichier SQLite existe et est writable
ls -la /var/lib/rimiris/
# Doit afficher : rimiris.db  (taille > 0)

# Vérifier les variables d'env chargées par PM2
pm2 env rimiris-ai | grep -E "DB_FILE|DATABASE_URL|NODE_ENV"

# Vérifier la DB depuis l'API (avec token)
curl "https://iris.interdata.group/api/db-health?token=50ee2d73322b97b49c210f1b892008ba88f3d31bd8224dbee98c6b494b047474"
# Doit retourner JSON avec "connection":{"ok":true,...}
```

## Le fichier .env à utiliser

Le fichier prêt à l'emploi est : `download/rimiris-ai.env`

Il contient déjà :
- `DB_FILE=/var/lib/rimiris/rimiris.db`
- 3 secrets générés aléatoirement (session, encryption, payment)
- `NEXT_PUBLIC_SITE_URL=https://iris.interdata.group`
- `LLM_PROVIDER=zai`

Il suffit de le télécharger, le renommer en `.env`, et l'uploader sur le serveur.

## Pourquoi SQLite résout le problème

Avant (MySQL) :
- ❌ MySQL 8 utilise `caching_sha2_password` par défaut
- ❌ Nécessite TLS ou `allowPublicKeyRetrieval=true` — échec d'auth
- ❌ 503 sur /api/auth/login

Après (SQLite) :
- ✅ Aucun serveur DB — c'est juste un fichier
- ✅ Aucune authentification réseau
- ✅ Aucun problème de plugin de mot de passe
- ✅ Backup trivial : `cp rimiris.db rimiris.db.bak`

## Revenir à MySQL plus tard

Quand vous voudrez ré-activer MySQL (parce que le traffic augmente),
voir `download/HOSTINGER_DEPLOY.md` section **"Switching back to MySQL"**.

Le code est structuré pour que la transition soit réversible — il suffit de
changer `provider = "sqlite"` → `provider = "mysql"` dans `prisma/schema.prisma`,
remettre les enums, et configurer `DB_HOST/DB_USER/...` dans `.env`.
