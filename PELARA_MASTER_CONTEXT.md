# PELARA.AI — MASTER CLAUDE CODE CONTEXT FILE
# Version: 1.0 | Created: March 2026
# START EVERY CLAUDE CODE SESSION BY PASTING THIS ENTIRE FILE.
# Then state what was built last session and what to build today.

---

## 1. PRODUCT OVERVIEW

**Product name:** Pelara
**Domain:** pelara.ai
**Tagline:** See further. Act faster.
**What it is:** A unified analytics and intelligence platform for local service businesses and the agencies that manage them.

**The core problem it solves:**
Local businesses (locksmiths, plumbers, electricians, HVAC, cleaners, trades) have their data scattered across Google Business Profile, Google Analytics, Google Search Console, Facebook Insights, and their phone. Nobody connects the dots. When calls stop, nobody knows why. Pelara connects everything into one dashboard, adds call tracking, competitor monitoring, and automated reporting.

**Two customer types:**
1. Local service businesses — use Pelara directly to monitor their own performance
2. Agencies — use Pelara to manage multiple local business clients from one screen

---

## 2. TECH STACK — NON-NEGOTIABLE

**Backend:** Node.js with Express.js
**Database:** PostgreSQL (hosted on Railway.app)
**Frontend:** React (single page application)
**Authentication:** Auth0 (OAuth2, supports Google login)
**Hosting:** Hetzner VPS — IP: 204.168.139.204 (SSH key auth, already configured)
**Frontend hosting:** Served from same Hetzner VPS via Nginx
**Payments:** Stripe (subscription billing)
**Call tracking infrastructure:** Twilio (we own the numbers, not a third party SaaS)
**Email (reports + alerts):** Resend
**Google APIs:** Google Business Profile API, Google Analytics 4 API, Google Search Console API
**Meta API:** Facebook Graph API (for Facebook Insights)
**Language:** JavaScript/Node.js throughout — no TypeScript yet, keep it simple
**Package manager:** npm
**Environment variables:** dotenv (.env file, never committed to git)
**Version control:** GitHub

**Why this stack:**
- Zero upfront cost — all free tiers cover 0–50 clients
- Railway handles server + database in one place
- No vendor lock-in
- Claude Code knows this stack extremely well

---

## 3. DATABASE SCHEMA

### Table: users
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
email VARCHAR(255) UNIQUE NOT NULL
name VARCHAR(255)
role VARCHAR(50) NOT NULL -- 'agency_admin', 'agency_user', 'business_owner'
agency_id UUID REFERENCES agencies(id)
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Table: agencies
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
name VARCHAR(255) NOT NULL
owner_user_id UUID REFERENCES users(id)
stripe_customer_id VARCHAR(255)
stripe_subscription_id VARCHAR(255)
plan VARCHAR(50) DEFAULT 'starter' -- 'starter', 'growth', 'agency', 'agency_pro'
white_label_name VARCHAR(255) -- for white-label agencies
white_label_logo_url VARCHAR(500)
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Table: clients
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
agency_id UUID REFERENCES agencies(id)
name VARCHAR(255) NOT NULL
business_type VARCHAR(100) -- 'locksmith', 'plumber', 'electrician', etc.
address TEXT
city VARCHAR(100)
country VARCHAR(100) DEFAULT 'GB'
phone VARCHAR(50)
website_url VARCHAR(500)
gbp_location_id VARCHAR(255) -- Google Business Profile location ID
ga4_property_id VARCHAR(255) -- Google Analytics 4 property ID
gsc_site_url VARCHAR(500) -- Google Search Console site URL
facebook_page_id VARCHAR(255)
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Table: google_oauth_tokens
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
access_token TEXT NOT NULL
refresh_token TEXT NOT NULL
expires_at TIMESTAMP NOT NULL
scope TEXT
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### Table: facebook_oauth_tokens
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
access_token TEXT NOT NULL
expires_at TIMESTAMP
created_at TIMESTAMP DEFAULT NOW()
```

### Table: metrics_gbp
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
date DATE NOT NULL
views_search INTEGER DEFAULT 0
views_maps INTEGER DEFAULT 0
clicks_website INTEGER DEFAULT 0
clicks_directions INTEGER DEFAULT 0
clicks_phone INTEGER DEFAULT 0
reviews_count INTEGER DEFAULT 0
reviews_average DECIMAL(3,2) DEFAULT 0
photos_count INTEGER DEFAULT 0
posts_count INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(client_id, date)
```

### Table: metrics_ga4
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
date DATE NOT NULL
sessions INTEGER DEFAULT 0
users INTEGER DEFAULT 0
new_users INTEGER DEFAULT 0
bounce_rate DECIMAL(5,2) DEFAULT 0
avg_session_duration INTEGER DEFAULT 0 -- seconds
organic_sessions INTEGER DEFAULT 0
direct_sessions INTEGER DEFAULT 0
referral_sessions INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(client_id, date)
```

### Table: metrics_gsc
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
date DATE NOT NULL
impressions INTEGER DEFAULT 0
clicks INTEGER DEFAULT 0
ctr DECIMAL(5,4) DEFAULT 0
average_position DECIMAL(6,2) DEFAULT 0
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(client_id, date)
```

### Table: metrics_facebook
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
date DATE NOT NULL
page_views INTEGER DEFAULT 0
page_reach INTEGER DEFAULT 0
post_engagements INTEGER DEFAULT 0
followers_count INTEGER DEFAULT 0
new_followers INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(client_id, date)
```

### Table: call_tracking_numbers
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
twilio_number VARCHAR(20) NOT NULL
channel VARCHAR(100) NOT NULL -- 'gbp', 'facebook', 'website', 'directory', 'direct'
friendly_name VARCHAR(255)
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT NOW()
```

### Table: calls
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
tracking_number_id UUID REFERENCES call_tracking_numbers(id)
channel VARCHAR(100)
caller_number VARCHAR(20)
duration_seconds INTEGER DEFAULT 0
status VARCHAR(50) -- 'answered', 'missed', 'voicemail'
called_at TIMESTAMP NOT NULL
recording_url VARCHAR(500)
created_at TIMESTAMP DEFAULT NOW()
```

### Table: competitors
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
name VARCHAR(255) NOT NULL
gbp_place_id VARCHAR(255)
address TEXT
phone VARCHAR(50)
website_url VARCHAR(500)
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT NOW()
```

### Table: competitor_metrics
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
competitor_id UUID REFERENCES competitors(id)
date DATE NOT NULL
reviews_count INTEGER DEFAULT 0
reviews_average DECIMAL(3,2) DEFAULT 0
estimated_ranking INTEGER -- position in local search
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(competitor_id, date)
```

### Table: alerts
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
type VARCHAR(100) NOT NULL -- 'calls_dropped', 'ranking_dropped', 'competitor_gained_reviews', etc.
message TEXT NOT NULL
metric_type VARCHAR(50)
metric_value DECIMAL(10,2)
threshold_value DECIMAL(10,2)
is_read BOOLEAN DEFAULT false
created_at TIMESTAMP DEFAULT NOW()
```

---

## 4. FOLDER STRUCTURE

```
pelara/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── db.js                 # PostgreSQL connection (pg pool)
│   │   ├── middleware/
│   │   │   ├── auth.js           # Auth0 JWT verification
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js           # Login/logout/callback
│   │   │   ├── clients.js        # CRUD for clients
│   │   │   ├── metrics.js        # Fetch and return metrics
│   │   │   ├── calls.js          # Call tracking
│   │   │   ├── competitors.js    # Competitor monitoring
│   │   │   └── alerts.js         # Alerts system
│   │   ├── services/
│   │   │   ├── gbpService.js     # Google Business Profile API calls
│   │   │   ├── ga4Service.js     # Google Analytics 4 API calls
│   │   │   ├── gscService.js     # Search Console API calls
│   │   │   ├── facebookService.js # Facebook Graph API calls
│   │   │   ├── twilioService.js  # Twilio call tracking
│   │   │   ├── stripeService.js  # Stripe billing
│   │   │   └── alertsService.js  # Alert detection logic
│   │   ├── jobs/
│   │   │   ├── syncMetrics.js    # Daily cron: fetch all client metrics
│   │   │   └── checkAlerts.js    # Daily cron: check for alert conditions
│   │   └── utils/
│   │       ├── logger.js
│   │       └── dateHelpers.js
│   ├── .env                      # NEVER commit this
│   ├── package.json
│   └── railway.json              # Railway deployment config
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── TopBar.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── MetricCard.jsx
│   │   │   │   ├── MetricChart.jsx
│   │   │   │   └── AlertBanner.jsx
│   │   │   ├── Clients/
│   │   │   │   ├── ClientList.jsx
│   │   │   │   └── ClientCard.jsx
│   │   │   └── Common/
│   │   │       ├── LoadingSpinner.jsx
│   │   │       └── EmptyState.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Main client dashboard
│   │   │   ├── Clients.jsx       # Agency client list
│   │   │   ├── Calls.jsx         # Call tracking page
│   │   │   ├── Competitors.jsx   # Competitor monitoring
│   │   │   ├── Reports.jsx       # Weekly/monthly reports
│   │   │   ├── Alerts.jsx        # Alerts page
│   │   │   └── Settings.jsx      # Account/billing settings
│   │   ├── hooks/
│   │   │   ├── useClients.js
│   │   │   ├── useMetrics.js
│   │   │   └── useAuth.js
│   │   ├── services/
│   │   │   └── api.js            # All fetch calls to backend
│   │   └── utils/
│   │       ├── formatters.js     # Number, date, currency formatters
│   │       └── chartHelpers.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── deploy/
    ├── setup-server.sh       # One-time server setup (Nginx, PM2, PostgreSQL)
    ├── deploy.sh             # Deploy script: pull from GitHub, restart PM2
    └── nginx.conf            # Nginx config for pelara.ai
```

---

## 5. API ROUTES REFERENCE

### Auth
- `POST /api/auth/login` — initiate Auth0 login
- `GET /api/auth/callback` — Auth0 callback
- `POST /api/auth/logout`
- `GET /api/auth/me` — get current user

### Clients
- `GET /api/clients` — list all clients for agency
- `POST /api/clients` — create new client
- `GET /api/clients/:id` — get single client
- `PUT /api/clients/:id` — update client
- `DELETE /api/clients/:id` — deactivate client

### Metrics
- `GET /api/metrics/:clientId/summary` — last 30 days all metrics
- `GET /api/metrics/:clientId/gbp?from=&to=` — GBP metrics range
- `GET /api/metrics/:clientId/ga4?from=&to=` — GA4 metrics range
- `GET /api/metrics/:clientId/gsc?from=&to=` — GSC metrics range
- `GET /api/metrics/:clientId/facebook?from=&to=` — Facebook metrics range
- `POST /api/metrics/:clientId/sync` — trigger manual sync

### Calls
- `GET /api/calls/:clientId` — list calls
- `GET /api/calls/:clientId/stats` — call stats by channel
- `POST /api/calls/webhook` — Twilio webhook (incoming call)
- `POST /api/calls/numbers` — provision new tracking number

### Competitors
- `GET /api/competitors/:clientId` — list competitors
- `POST /api/competitors/:clientId` — add competitor
- `DELETE /api/competitors/:competitorId` — remove competitor
- `GET /api/competitors/:clientId/report` — weekly competitor report

### Alerts
- `GET /api/alerts/:clientId` — list alerts
- `PUT /api/alerts/:alertId/read` — mark as read

---

## 6. ENVIRONMENT VARIABLES (.env)

### Local development (.env)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://pelara:PASSWORD@localhost:5432/pelara
FRONTEND_URL=http://localhost:5173
```

### Production (on Hetzner VPS at /var/www/pelara/backend/.env)
```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://pelara:PASSWORD@localhost:5432/pelara
FRONTEND_URL=https://pelara.ai

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx
AUTH0_AUDIENCE=https://api.pelara.ai

# Google APIs
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Facebook API
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Twilio
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WEBHOOK_URL=https://api.pelara.ai/api/calls/webhook

# Stripe
STRIPE_SECRET_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx

# Resend (email)
RESEND_API_KEY=xxx
FROM_EMAIL=reports@pelara.ai

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## 7. CODING STANDARDS — FOLLOW ALWAYS

- **No TypeScript** — plain JavaScript only for now
- **Async/await** — never callbacks, never raw .then() chains
- **Error handling** — every async route wrapped in try/catch, errors passed to errorHandler middleware
- **No inline SQL** — all queries in service files, not in route files
- **Route files are thin** — validation + call service + return response only
- **Service files do the work** — all business logic and API calls go here
- **Environment variables** — never hardcode secrets, always process.env.XXX
- **Consistent response format:**
```javascript
// Success
res.json({ success: true, data: {...} })

// Error
res.status(400).json({ success: false, error: 'message' })
```
- **Date handling** — always store UTC in database, format for display in frontend
- **Logging** — use logger.js, never console.log in production code
- **Comments** — write WHY not WHAT. Code explains what. Comments explain decisions.

---

## 8. CURRENT BUILD STATE

### Completed: NOTHING YET — starting from zero

### Session 1 target:
- [ ] Initialize backend Node.js/Express project
- [ ] Connect to PostgreSQL database
- [ ] Run database migrations (create all tables above)
- [ ] Basic Express server running on port 3001
- [ ] Health check endpoint: GET /health returns { status: 'ok' }

### Session 2 target:
- [ ] Auth0 integration — login, callback, logout, get current user
- [ ] JWT middleware to protect routes
- [ ] Basic user and agency creation on first login

### Session 3 target:
- [ ] Client CRUD endpoints (create, read, update, deactivate)
- [ ] Frontend: React app initialized with Vite
- [ ] Frontend: Auth0 login flow working
- [ ] Frontend: Basic client list page

### Ongoing after each session:
- Update this file: move completed items to "Completed" section
- Note any schema changes made
- Note any new dependencies installed

---

## 9. DEPENDENCIES

### Backend
```json
{
  "express": "^4.18.0",
  "pg": "^8.11.0",
  "dotenv": "^16.0.0",
  "cors": "^2.8.5",
  "express-oauth2-jwt-bearer": "^1.5.0",
  "googleapis": "^128.0.0",
  "twilio": "^4.19.0",
  "stripe": "^14.0.0",
  "resend": "^2.0.0",
  "node-cron": "^3.0.0",
  "winston": "^3.11.0"
}
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "@auth0/auth0-react": "^2.2.0",
  "recharts": "^2.10.0",
  "axios": "^1.6.0",
  "date-fns": "^3.0.0"
}
```

---

## 10. HOW TO USE THIS FILE WITH CLAUDE CODE

**Every session starts like this:**

```
[PASTE THIS ENTIRE FILE]

Previous session completed:
- [list what was built]

Today's task:
- [ONE specific feature to build]
- It should go in: [specific file/folder]
- Follow the same pattern as: [existing file if applicable]
- Also write tests for it in: [test file location]
```

**Rules for Claude Code sessions:**
1. One feature per session — never try to build everything at once
2. Always ask Claude Code to write the code, then test it, then move on
3. If Claude Code produces an error, paste the full error message back in
4. After each session, update the "Current Build State" section above
5. Never skip writing the database migration — schema changes must be tracked

---

## 11. SERVER INFRASTRUCTURE

**VPS Provider:** Hetzner
**Server IP:** 204.168.139.204
**Auth:** SSH key (already configured)
**GitHub:** github.com/Marin-N
**Local save path:** C:\LLM\Pelara.io\

**Server stack:**
- OS: Ubuntu 24.04 LTS
- Web server: Nginx (reverse proxy)
- Process manager: PM2 (keeps Node.js running)
- Database: PostgreSQL 15 (local on server)
- Node.js: v20 LTS
- Deployments: GitHub → SSH pull → PM2 restart

**Nginx config:**
- `pelara.ai` → proxies to `localhost:3001` (backend API)
- `pelara.ai` → serves `/var/www/pelara/frontend/dist` (React build)
- SSL: Let's Encrypt (Certbot)

**PM2 app name:** `pelara-backend`
**App path on server:** `/var/www/pelara/`

---

## 12. FIRST COMMAND TO RUN IN CLAUDE CODE

Open Claude Code. Paste this entire file first. Then paste the following as your first message:

---

**SESSION 1 — FULL AUTONOMOUS BUILD AND DEPLOY:**

```
PROJECT: Pelara.ai — local service business analytics SaaS
SERVER: Hetzner VPS | IP: 204.168.139.204 | SSH key auth already configured
GITHUB: github.com/Marin-N
LOCAL SAVE: C:\LLM\Pelara.io\

RULES — follow without exception:
- Do NOT ask any questions
- Do NOT ask for permission
- Build everything autonomously start to finish
- Deploy directly to Hetzner VPS via SSH
- Push all code to GitHub automatically
- Save all files locally to C:\LLM\BRAIN\Pelara.io\
- If a decision is needed, make the best one and proceed

SESSION 1 TASKS — complete all of these in order:

1. GITHUB: Create a new repository called 'pelara' on github.com/Marin-N. Initialize with README.

2. LOCAL: Create the full project folder structure in C:\LLM\BRAIN\Pelara.io\ exactly as defined in Section 4 of the context file.

3. BACKEND: Initialize Node.js Express project in the backend folder. Install all dependencies from Section 9. Create all files: index.js, db.js, middleware/auth.js, middleware/errorHandler.js, utils/logger.js, utils/dateHelpers.js.

4. DATABASE MIGRATION: Create a migration file at backend/src/migrations/001_initial_schema.sql containing all CREATE TABLE statements from Section 3.

5. HEALTH CHECK: Implement GET /health endpoint returning { status: 'ok', product: 'Pelara', version: '0.1.0', timestamp: new Date() }.

6. DEPLOY SCRIPTS: Create deploy/setup-server.sh (installs Node.js 20, PostgreSQL 15, Nginx, PM2, creates pelara database and user, sets up app directory at /var/www/pelara), deploy/deploy.sh (git pull, npm install, pm2 restart), and deploy/nginx.conf (reverse proxy config for port 3001).

7. SERVER SETUP: SSH into 204.168.139.204 and run setup-server.sh to install all dependencies on the server.

8. DATABASE: Run the migration file on the server to create all tables.

9. PUSH: Commit everything to GitHub with message 'feat: initial Pelara backend setup'.

10. DEPLOY: SSH into server, clone the repo to /var/www/pelara, create the .env file with production values, start PM2, configure Nginx, test that GET http://204.168.139.204/health returns the correct response.

When complete, report: GitHub repo URL, server health check URL, PM2 status, and list of all database tables created.
```

---

That single command builds the entire foundation, deploys it live, and gives you a running server. Every subsequent session follows the same pattern: paste the context file, state what was built, give the next task.

---

*Pelara.ai — See further. Act faster.*
*This file is the single source of truth. Keep it updated after every build session.*
