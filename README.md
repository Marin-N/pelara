# Pelara.ai

**See further. Act faster.**

A unified analytics and intelligence platform for local service businesses and the agencies that manage them.

## Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** React (Vite)
- **Auth:** Auth0
- **Hosting:** Hetzner VPS

## Quick start (local)

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

Health check: `GET http://localhost:3001/health`

## Deploy

```bash
# First time — sets up the server
bash deploy/setup-server.sh

# Every deploy
bash deploy/deploy.sh
```
