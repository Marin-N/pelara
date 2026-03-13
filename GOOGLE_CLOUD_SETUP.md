# Google Cloud Setup for Pelara

## Step 1: Create Project

1. Go to https://console.cloud.google.com
2. Create new project → Name: `pelara` → Note the Project ID
3. Enable Billing (required for APIs even on free tier)

## Step 2: Enable APIs

Go to APIs & Services → Enable APIs and search for + enable each:
- **My Business Performance API** (Google Business Profile metrics)
- **My Business Business Information API** (GBP location info)
- **Google Analytics Data API** (GA4)
- **Google Search Console API** (Search Console)

## Step 3: Create OAuth 2.0 Credentials

1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Name: `Pelara Backend`
4. Authorized redirect URIs — add ALL of these:
   ```
   https://204.168.139.204/api/auth/google/callback
   http://localhost:3001/api/auth/google/callback
   ```
5. Click Create → Copy **Client ID** and **Client Secret**

## Step 4: Configure OAuth Consent Screen

1. APIs & Services → OAuth consent screen
2. User Type: **External** (allows any Google account)
3. App name: `Pelara`
4. User support email: your email
5. Developer contact: your email
6. Scopes → Add:
   - `https://www.googleapis.com/auth/business.manage`
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/webmasters.readonly`
7. Test users → Add `coddinging@gmail.com` (and any client emails)
8. Save and publish (or keep in testing for now)

## Step 5: Add credentials to server .env

SSH into server and edit `/var/www/pelara/backend/.env`:
```
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<your-secret>
GOOGLE_REDIRECT_URI=https://204.168.139.204/api/auth/google/callback
```
Then: `pm2 restart pelara-backend`
