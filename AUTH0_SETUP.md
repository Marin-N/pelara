# Auth0 Setup Instructions for Pelara

Auth0 apps must be created through the Auth0 dashboard (no public API to create tenants).
Do this once, then fill the credentials into the .env files below.

---

## Step 1: Create Auth0 Tenant

1. Go to https://auth0.com and sign up / log in
2. Create a new tenant named `pelara` (region: EU — Ireland)
3. Your domain will be: `pelara.eu.auth0.com`

---

## Step 2: Create the Backend API

1. Auth0 Dashboard → Applications → APIs → Create API
2. Name: `Pelara API`
3. Identifier (audience): `https://api.pelara.ai`
4. Signing Algorithm: RS256
5. Click Create

---

## Step 3: Create the Frontend SPA Application

1. Auth0 Dashboard → Applications → Applications → Create Application
2. Name: `Pelara App`
3. Type: Single Page Web Application
4. Click Create
5. Go to Settings tab:

**Allowed Callback URLs:**
```
http://localhost:5173/callback, https://pelara.ai/callback
```

**Allowed Logout URLs:**
```
http://localhost:5173, https://pelara.ai
```

**Allowed Web Origins:**
```
http://localhost:5173, https://pelara.ai
```

6. Under Advanced Settings → Grant Types: ensure `Authorization Code` and `Implicit` are enabled
7. Save Changes
8. Copy: Domain, Client ID, Client Secret

---

## Step 4: Enable Google Social Login (optional but recommended)

1. Auth0 Dashboard → Authentication → Social → Google / Gmail
2. Follow the setup — uses Auth0's built-in Google app for development
3. For production: create your own Google OAuth app and paste credentials

---

## Step 5: Fill in .env files

### Backend (.env on server: /var/www/pelara/backend/.env)
```
AUTH0_DOMAIN=pelara.eu.auth0.com
AUTH0_AUDIENCE=https://api.pelara.ai
```
(Client ID and Secret are not needed on the backend — it only validates JWTs)

### Frontend (.env.local in frontend/)
```
VITE_AUTH0_DOMAIN=pelara.eu.auth0.com
VITE_AUTH0_CLIENT_ID=<Client ID from Step 3>
VITE_AUTH0_AUDIENCE=https://api.pelara.ai
VITE_API_URL=http://localhost:3001
```

### Production frontend (.env.production in frontend/)
```
VITE_AUTH0_DOMAIN=pelara.eu.auth0.com
VITE_AUTH0_CLIENT_ID=<Client ID from Step 3>
VITE_AUTH0_AUDIENCE=https://api.pelara.ai
VITE_API_URL=https://pelara.ai
```

---

## Step 6: Update server .env

SSH into 204.168.139.204 and edit /var/www/pelara/backend/.env:
```bash
ssh root@204.168.139.204
nano /var/www/pelara/backend/.env
# Set AUTH0_DOMAIN and AUTH0_AUDIENCE
pm2 restart pelara-backend
```
