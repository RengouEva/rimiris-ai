# Déploiement Hostinger VPS — Rimiris AI

Guide complet pour déployer Rimiris AI sur un VPS Hostinger KVM avec MySQL,
Nginx, PM2, SSL Let's Encrypt, et backup automatique.

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
apt install -y curl wget git ufw fail2ban nginx mysql-server certbot python3-certbot-nginx
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

## 3. Configuration MySQL

### 3.1 Sécuriser MySQL
```bash
mysql_secure_installation
# - Set root password? Y
# - Remove anonymous users? Y
# - Disallow remote root login? Y
# - Remove test database? Y
# - Reload privilege tables? Y
```

### 3.2 Créer la base + l'utilisateur Rimiris
```bash
mysql -u root -p
```

```sql
CREATE DATABASE rimiris_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rimiris'@'localhost' IDENTIFIED BY 'UNE_BONNE_PASSWORD_16_CHARS';
GRANT ALL PRIVILEGES ON rimiris_prod.* TO 'rimiris'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.3 Vérifier
```bash
mysql -u rimiris -p rimiris_prod -e "SHOW TABLES;"
# Empty set — la base est prête, les tables seront créées par Prisma
```

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
DATABASE_URL="mysql://rimiris:UNE_BONNE_PASSWORD_16_CHARS@127.0.0.1:3306/rimiris_prod"
RIMIRIS_SESSION_SECRET="<un-nouveau-secret-de-64-chars-hex>"
RIMIRIS_ENCRYPTION_KEY="<une-nouvelle-cle-de-64-chars-hex>"
LLM_PROVIDER=zai
NODE_ENV=production
```

Générer des secrets aléatoires :
```bash
openssl rand -hex 32  # pour SESSION_SECRET
openssl rand -hex 32  # pour ENCRYPTION_KEY
```

### 4.4 Build + migration DB
```bash
# Charger les variables d'environnement
set -a; source .env.production; set +a

# Générer le client Prisma
npx prisma generate

# Créer toutes les tables dans MySQL
npx prisma migrate deploy
# OU si pas de migrations : npx prisma db push --accept-data-loss

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
ufw deny 3306           # MySQL jamais exposé à Internet
ufw enable
ufw status verbose
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

## 10. Backup automatique MySQL

### 10.1 Script de backup quotidien
```bash
mkdir -p /var/backups/mysql
nano /usr/local/bin/backup-mysql.sh
```

Contenu :
```bash
#!/bin/bash
set -e
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/mysql
mysqldump -u rimiris -p'UNE_BONNE_PASSWORD_16_CHARS' rimiris_prod | gzip > $BACKUP_DIR/rimiris_prod_$DATE.sql.gz

# Rotation : garder 7 jours
find $BACKUP_DIR -name "rimiris_prod_*.sql.gz" -mtime +7 -delete

# Optionnel : push vers Hostinger Object Storage (S3-compatible)
# aws s3 cp $BACKUP_DIR/rimiris_prod_$DATE.sql.gz s3://rimiris-backups/ --endpoint-url ...
```

```bash
chmod +x /usr/local/bin/backup-mysql.sh

# Cron : tous les jours à 3h du matin
crontab -e
# Ajouter :
0 3 * * * /usr/local/bin/backup-mysql.sh >> /var/log/backup-mysql.log 2>&1
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

### 12.3 MySQL slow queries
```bash
nano /etc/mysql/mysql.conf.d/mysqld.cnf
# slow_query_log = 1
# slow_query_log_file = /var/log/mysql/slow.log
# long_query_time = 2
systemctl restart mysql
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

### Erreur "DATABASE_URL not found"
```bash
# Le fichier .env.production doit être chargé par PM2
pm2 delete rimiris
pm2 start "bun .next/standalone/server.js" --name rimiris --env production --env-file .env.production
pm2 save
```

### MySQL "Too many connections"
```bash
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
# Augmenter dans /etc/mysql/mysql.conf.d/mysqld.cnf :
# max_connections = 200
systemctl restart mysql
```

### SSL expiré
```bash
certbot renew
systemctl reload nginx
```

---

Dernière mise à jour : 2026-07-30
