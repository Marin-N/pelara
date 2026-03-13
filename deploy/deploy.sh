#!/bin/bash
# Pelara deployment script — run on server or via SSH from local
# Usage: bash deploy/deploy.sh
set -e

APP_DIR="/var/www/pelara"
PM2_NAME="pelara-backend"

echo "==> Pulling latest code"
cd "$APP_DIR"
git pull origin main

echo "==> Installing backend dependencies"
cd "$APP_DIR/backend"
npm install --omit=dev

echo "==> Restarting PM2 process"
pm2 restart "$PM2_NAME" --update-env || pm2 start src/index.js --name "$PM2_NAME"
pm2 save

echo "==> Deploy complete!"
pm2 status "$PM2_NAME"
