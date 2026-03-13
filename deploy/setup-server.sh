#!/bin/bash
# Pelara server setup — run ONCE on a fresh Ubuntu 24.04 VPS
# Usage: bash deploy/setup-server.sh
set -e

echo "==> Updating apt"
apt-get update -y && apt-get upgrade -y

echo "==> Installing Node.js 20 LTS"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "==> Installing PostgreSQL 15"
apt-get install -y postgresql-15 postgresql-contrib-15

echo "==> Installing Nginx"
apt-get install -y nginx

echo "==> Installing PM2 globally"
npm install -g pm2

echo "==> Installing Certbot"
apt-get install -y certbot python3-certbot-nginx

echo "==> Creating pelara PostgreSQL user and database"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pelara') THEN
    CREATE USER pelara WITH PASSWORD 'CHANGE_ME_PELARA_DB_PASS';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE pelara OWNER pelara'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pelara')\gexec
GRANT ALL PRIVILEGES ON DATABASE pelara TO pelara;
SQL

echo "==> Creating app directory"
mkdir -p /var/www/pelara
chown -R www-data:www-data /var/www/pelara
chmod -R 755 /var/www/pelara

echo "==> Copying Nginx config"
cp /var/www/pelara/deploy/nginx.conf /etc/nginx/sites-available/pelara
ln -sf /etc/nginx/sites-available/pelara /etc/nginx/sites-enabled/pelara
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Enabling PM2 startup"
pm2 startup systemd -u root --hp /root

echo "==> Setup complete!"
echo "Next: cd /var/www/pelara && git clone <repo>, create backend/.env, then run: pm2 start backend/src/index.js --name pelara-backend && pm2 save"
