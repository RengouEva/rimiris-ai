# Déploiement Hostinger VPS — Rimiris AI

Guide complet pour déployer Rimiris AI sur un VPS Hostinger KVM avec SQLite,
Nginx, PM2, SSL Let's Encrypt, et backup automatique.

> **Backend DB** : SQLite (fichier `.db` sur disque). Aucun serveur MySQL à
> installer, aucune erreur d'authentification `caching_sha2_password`.
> Pour revenir à MySQL plus tard, voir section 15 en bas de ce document.

---

## 1. Pré-requis VPS Hostinger

### 1.1 Acheter le VPS
- Plan : **KVM 1** (1 vCPU / 4 GB RAM / 50 GB NVMe) — suffisant pour démarrer
- OS : **Ubuntu 22.04 LTS** (recommandé)
- Datacenter : le plus proche de tes utilisateurs (Europe = Amsterdam/Paris)

### 1.2 Premier login
```bash
ssh root@VPS_IP
# Mot de passe : créé dans hPanel → VPS → Settings → Root password
```

---

## 2. Installation du serveur (en root)

### 2.1 Mises à jour + paquets de base
```bash
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban nginx certbot python3-certbot-nginx
```

### 2.2 Node.js 20 LTS (via NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # doit afficher v20.x
```

### 2.3 PM2 (process manager)
```bash
npm install -g pm2
```

### 2.4 Bun (pour démarrer l'app standalone plus vite — optionnel)
```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

---

## 3. Préparation du dossier de données SQLite

La base de données est un simple fichier `.db` sur le disque. On le place dans
`/var/lib/rimiris/` pour qu'il survive aux `git pull` et aux rebuilds.

```bash
mkdir -p /var/lib/rimiris
chown -R $(whoami):$(whoami) /var/lib/rimiris
chmod 700 /var/lib/rimiris
```

> **Aucune configuration supplémentaire** — pas de serveur MySQL à démarrer,
> pas d'utilisateur à créer, pas de mot de passe à retenir. Le fichier `.db`
> sera créé automatiquement par Prisma au premier démarrage.

---

## 4. Déploiement du code

### 4.1 Cloner le repo
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/RengouEva/rimiris-ai.git
cd rimiris-ai
```

### 4.2 Installer les dépendances
```bash
npm ci
```

### 4.3 Configurer l'environnement
```bash
cp .env.local .env.production
nano .env.production
```

Modifie ces valeurs :
```bash
# SQLite — juste le chemin du fichier .db. Rien d'autre à configurer.
DB_FILE="/var/lib/rimiris/rimiris.db"

# Secrets (générés avec openssl rand -hex 32)
RIMIRIS_SESSION_SECRET="<un-nouveau-secret-de-64-chars-hex>"
RIMIRIS_ENCRYPTION_KEY="<une-nouvelle-cle-de-64-chars-hex>"
RIMIRIS_PAYMENT_SECRET="<un-nouveau-secret-de-64-chars-hex>"

# Alias legacy (certains modules les lisent encore — garder synchronisés)
SESSION_SECRET="<le_même_que_RIMIRIS_SESSION_SECRET>"
ENCRYPTION_KEY="<le_même_que_RIMIRIS_ENCRYPTION_KEY>"
PAYMENT_SECRET="<le_même_que_RIMIRIS_PAYMENT_SECRET>"

NEXT_PUBLIC_SITE_URL="https://rimiris.ai"
LLM_PROVIDER=zai
NODE_ENV=production
```

Générer des secrets aléatoires :
```bash
openssl rand -hex 32  # pour SESSION_SECRET
openssl rand -hex 32  # pour ENCRYPTION_KEY
openssl rand -hex 32  # pour PAYMENT_SECRET
```

### 4.4 Build + migration DB
```bash
# Charger les variables d'environnement
set -a; source .env.production; set +a

# Générer le client Prisma
npx prisma generate

# Créer toutes les tables dans SQLite (le fichier .db est créé au passage)
npx prisma migrate deploy
# OU si pas de migrations : npx prisma db push --accept-data-loss

# Vérifier que le fichier .db existe
ls -lh /var/lib/rimiris/rimiris.db
# → -rw-r--r-- 1 user user 64K ... rimiris.db

# Créer le compte admin
npm run seed:admin
# → Note le mot de passe affiché dans la console
```

### 4.5 Build Next.js
```bash
npm run build
# → crée .next/standalone/ (server.js + .next/static + public)
```

---

## 5. PM2 — Process manager

### 5.1 Démarrer l'app
```bash
cd /var/www/rimiris-ai
pm2 start "bun .next/standalone/server.js" --name rimiris
pm2 save
pm2 startup  # génère la commande à copier-coller pour le boot systemd
```

### 5.2 Logs en temps réel
```bash
pm2 logs rimiris
```

### 5.3 Redémarrage après un git pull
```bash
cd /var/www/rimiris-ai
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart rimiris
```

---

## 6. Nginx — Reverse proxy

### 6.1 Config Nginx
```bash
nano /etc/nginx/sites-available/rimiris.ai
```

Contenu :
```nginx
server {
    listen 80;
    server_name rimiris.ai www.rimiris.ai;

    # Redirect HTTP → HTTPS (after SSL is configured)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets cache (1 year)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 25M;  # pour les uploads PDF (guide méthodo)
}
```

### 6.2 Activer le site
```bash
ln -s /etc/nginx/sites-available/rimiris.ai /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t  # syntax check
systemctl reload nginx
```

---

## 7. DNS Hostinger

### 7.1 Pointer le domaine vers le VPS
Dans hPanel → Domains → DNS :
- Type **A**, Name `@`, Value `VPS_IP`, TTL 3600
- Type **A**, Name `www`, Value `VPS_IP`, TTL 3600

Attendre 5-30 min pour la propagation.

---

## 8. SSL Let's Encrypt (automatique)

```bash
certbot --nginx -d rimiris.ai -d www.rimiris.ai \
  --redirect --agree-tos --no-eff-email --email admin@rimiris.ai
```

Certbot va :
1. Vérifier le domaine via HTTP-01
2. Générer les certificats `/etc/letsencrypt/live/rimiris.ai/`
3. Modifier automatiquement la config Nginx pour activer HTTPS
4. Ajouter un cron de renouvellement automatique (12h avant expiration)

### 8.1 Vérifier le renouvellement
```bash
certbot renew --dry-run
```

---

## 9. Sécurité

### 9.1 Firewall UFW
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'  # 80 + 443
ufw enable
ufw status verbose
# Pas de port MySQL à fermer — SQLite est un fichier, pas un serveur réseau.
```

### 9.2 Fail2ban — brute-force SSH
```bash
systemctl enable fail2ban
systemctl start fail2ban

# Config par défaut : 5 tentatives SSH ratées → ban 10 min
nano /etc/fail2ban/jail.local
```

```ini
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
findtime = 600
```

```bash
systemctl restart fail2ban
```

### 9.3 Désactiver le login SSH par mot de passe (clé only)
```bash
# Sur ta machine locale :
ssh-keygen -t ed25519 -C "rimiris-admin"
ssh-copy-id root@VPS_IP

# Sur le VPS :
nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PubkeyAuthentication yes
systemctl restart sshd
```

---

## 10. Backup automatique SQLite

### 10.1 Script de backup quotidien

Le backup SQLite est trivial : c'est juste une copie de fichier. On utilise
la commande `.backup` de SQLite pour garantir un fichier cohérent même si
l'app est en train d'écrire.

```bash
mkdir -p /var/backups/rimiris
nano /usr/local/bin/backup-sqlite.sh
```

Contenu :
```bash
#!/bin/bash
set -e
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/rimiris
DB_FILE=/var/lib/rimiris/rimiris.db

# Utiliser sqlite3 .backup pour un snapshot cohérent
# (ou juste cp si sqlite3 n'est pas installé)
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/rimiris_$DATE.db'"
else
  cp "$DB_FILE" "$BACKUP_DIR/rimiris_$DATE.db"
fi
gzip "$BACKUP_DIR/rimiris_$DATE.db"

# Rotation : garder 7 jours
find "$BACKUP_DIR" -name "rimiris_*.db.gz" -mtime +7 -delete

# Optionnel : push vers Hostinger Object Storage (S3-compatible)
# aws s3 cp $BACKUP_DIR/rimiris_$DATE.db.gz s3://rimiris-backups/ --endpoint-url ...
```

```bash
chmod +x /usr/local/bin/backup-sqlite.sh

# Cron : tous les jours à 3h du matin
crontab -e
# Ajouter :
0 3 * * * /usr/local/bin/backup-sqlite.sh >> /var/log/backup-sqlite.log 2>&1
```

---

## 11. Vérifications finales

### 11.1 Endpoints de santé
```bash
# Landing page
curl -I https://rimiris.ai/
# HTTP/2 200

# API payment health (public)
curl https://rimiris.ai/api/payment/health
# {"enabled":false,"provider":null,...}

# Admin endpoint sans cookie → 401
curl https://rimiris.ai/api/admin/payment-providers
# {"error":"Authentication required."}
```

### 11.2 Login admin
1. Ouvre https://rimiris.ai dans le navigateur
2. Clic "Démarrer l'entretien"
3. AuthGate → login screen
4. Email : `admin@rimiris.com`
5. Password : celui affiché par `npm run seed:admin`
6. → Admin portal accessible (onglet "Paiements" pour configurer un provider)

### 11.3 Configurer le premier provider
1. Admin portal → onglet "Paiements"
2. Choisir Stripe (test mode)
3. Entrer `pk_test_...` et `sk_test_...` (clés de test Stripe)
4. Webhook secret : `whsec_...` (configuré dans Stripe Dashboard → Webhooks)
5. URL webhook à déclarer chez Stripe : `https://rimiris.ai/api/payment/webhook/stripe`
6. Push → Test → "Connexion Stripe réussie"
7. Faire un paiement test avec carte `4242 4242 4242 4242`
8. Vérifier le badge "Pro" dans le header après le retour checkout
9. Vérifier le toast "Bienvenue dans Rimiris Pro" sur la landing
10. Vérifier l'événement dans Admin → Paiements → Journal des webhooks

---

## 12. Monitoring

### 12.1 PM2 monitoring
```bash
pm2 monit         # dashboard temps réel CPU/RAM
pm2 status        # tableau de bord
pm2 logs rimiris --lines 100
```

### 12.2 Nginx access/error logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 12.3 SQLite — vérifier l'état du fichier DB
```bash
# Taille du fichier .db
ls -lh /var/lib/rimiris/rimiris.db

# Nombre de lignes par table (si sqlite3 est installé)
sqlite3 /var/lib/rimiris/rimiris.db \
  "SELECT 'accounts', COUNT(*) FROM accounts UNION ALL \
   SELECT 'pending_payments', COUNT(*) FROM pending_payments UNION ALL \
   SELECT 'revenues', COUNT(*) FROM revenues;"

# Ou sans sqlite3 : utiliser l'endpoint /api/db-health
curl "https://rimiris.ai/api/db-health?token=$RIMIRIS_PAYMENT_SECRET" | jq
```

---

## 13. Mise à jour du code (workflow)

```bash
cd /var/www/rimiris-ai
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy  # applique les nouvelles migrations
npm run build
pm2 restart rimiris
pm2 logs rimiris --lines 50  # vérifier qu'il démarre bien
```

---

## 14. En cas de problème

### Erreur "Prisma Client initialization failed"
```bash
cd /var/www/rimiris-ai
npx prisma generate
pm2 restart rimiris
```

### Erreur "Database does not exist" / "no such table"

Le fichier `.db` n'a pas été créé ou la migration n'a pas été appliquée.

```bash
cd /var/www/rimiris-ai
set -a; source .env.production; set +a
npx prisma migrate deploy
ls -lh /var/lib/rimiris/rimiris.db
# → doit afficher un fichier non vide (≥ 16K)

npm run seed:admin  # recrée le compte admin si nécessaire
pm2 restart rimiris
```

### Erreur "unable to open database file" (permissions)

Le user qui fait tourner PM2 n'a pas le droit d'écrire dans `/var/lib/rimiris/`.

```bash
# Vérifier le propriétaire du dossier
ls -ld /var/lib/rimiris
#drwx------ 2 root root 4096 ... /var/lib/rimiris

# Donner la propriété au user qui fait tourner l'app
chown -R $(pm2 jlist | jq -r '.[0].pm2_env.uid // "www-data"'):$(pm2 jlist | jq -r '.[0].pm2_env.gid // "www-data"') /var/lib/rimiris
chmod 700 /var/lib/rimiris
pm2 restart rimiris
```

### Erreur "database is locked" (concurrence SQLite)

SQLite utilise un verrou au niveau du fichier. Si tu vois cette erreur sous
forte charge, c'est que plusieurs écritures se font en parallèle.

- Solution court terme : redémarrer PM2 (`pm2 restart rimiris`).
- Solution long terme : passer à MySQL/Postgres (voir section 15).

### Endpoint /api/auth/login ou /api/auth/signup renvoie 503

Vérifier l'état de la DB via le endpoint diagnostic :
```bash
curl "https://rimiris.ai/api/db-health?token=$RIMIRIS_PAYMENT_SECRET" | jq
```
Le champ `connection.ok` doit être `true`. Si `false`, le message d'erreur
exact est dans `connection.error`.

### Erreur "DATABASE_URL not found"
```bash
# Le fichier .env.production doit être chargé par PM2
pm2 delete rimiris
pm2 start "bun .next/standalone/server.js" --name rimiris --env production --env-file .env.production
pm2 save
```

### SSL expiré
```bash
certbot renew
systemctl reload nginx
```

---

## 15. Revenir à MySQL plus tard

Quand tu seras prêt à passer à MySQL (par exemple si la charge augmente),
il suffira de :

1. Modifier `prisma/schema.prisma` : `provider = "sqlite"` → `provider = "mysql"`.
2. Recréer les `enum` (si besoin) et les annotations `@db.Text` / `@db.LongText`.
3. Configurer MySQL (voir l'ancien guide Hostinger dans l'historique git).
4. Remplacer `DB_FILE` par `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`
   dans `.env.production`.
5. `npx prisma migrate dev --name mysql_init` (génère la migration MySQL).
6. Pour migrer les données existantes : `sqlite3 .db .dump > dump.sql` puis
   adapter et rejouer dans MySQL.

La structure du code (modèles Prisma, queries) ne change pas — seulement le
provider et les types de colonnes spécifiques.

---

Dernière mise à jour : 2026-07-31
