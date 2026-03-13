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

### Table: keyword_rankings
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
keyword VARCHAR(255) NOT NULL
position INTEGER
date DATE NOT NULL
created_at TIMESTAMP DEFAULT NOW()
UNIQUE(client_id, keyword, date)
```

### Table: uptime_logs
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
status VARCHAR(20) NOT NULL -- 'up', 'down'
response_time_ms INTEGER
checked_at TIMESTAMP DEFAULT NOW()
```

### Table: scheduled_posts
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
platform VARCHAR(50) NOT NULL -- 'gbp', 'facebook'
content TEXT NOT NULL
image_url VARCHAR(500)
scheduled_for TIMESTAMP NOT NULL
published_at TIMESTAMP
status VARCHAR(50) DEFAULT 'scheduled' -- 'scheduled', 'published', 'failed'
created_at TIMESTAMP DEFAULT NOW()
```

### Table: review_requests
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
client_id UUID REFERENCES clients(id)
customer_phone VARCHAR(20)
customer_name VARCHAR(255)
job_date DATE
sent_at TIMESTAMP
review_received BOOLEAN DEFAULT false
created_at TIMESTAMP DEFAULT NOW()
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

### SESSION 1 — COMPLETE ✅
- Backend Node.js/Express initialized and running
- PostgreSQL 16 connected (Ubuntu 24.04 uses PG16 — not PG15)
- 14 tables created: agencies, users, clients, google_oauth_tokens, facebook_oauth_tokens, metrics_gbp, metrics_ga4, metrics_gsc, metrics_facebook, call_tracking_numbers, calls, competitors, competitor_metrics, alerts
- Express server running on port 3001 via PM2 (0 restarts)
- Health check live: http://204.168.139.204/health returns correct response
- GitHub: https://github.com/Marin-N/pelara — 33 files committed
- All 6 route stubs, 7 service stubs, 2 job stubs created
- Deploy scripts built: setup-server.sh, deploy.sh, nginx.conf
- DB password: stored in /var/www/pelara/backend/.env on server ONLY — never commit

### IMPORTANT NOTES FROM SESSION 1:
- PostgreSQL is version 16 (not 15) — Ubuntu 24.04 default repos
- Auth0 credentials in .env are PLACEHOLDERS — need real Auth0 app credentials before Session 2
- 4 new tables NOT YET in database — Claude Code must add these in Session 2 migration:
  keyword_rankings, uptime_logs, scheduled_posts, review_requests

### SESSION 2 — COMPLETE ✅
- Auth0 integrated: domain=dev-fsidwx7q263q8ktq.us.auth0.com
- JWT middleware protecting all routes
- User + agency auto-created on first login
- 4 missing tables added: keyword_rankings, uptime_logs, scheduled_posts, review_requests
- React frontend initialized with Vite + Auth0 flow

### SESSION 3 — COMPLETE ✅
- Self-signed SSL certificate installed (730 day) for 204.168.139.204
- Nginx serving HTTPS on port 443, HTTP redirects to HTTPS
- Client CRUD routes fully implemented with agency isolation
- clientService.js with soft delete (is_active=false)
- Clients page with list + Add Client modal
- useClients hook with refetch
- Dashboard page with sidebar navigation
- Login working: https://204.168.139.204
- First user logged in: codinging@gmail.com

### AUTH0 CONFIGURATION (saved for reference):
- Domain: dev-fsidwx7q263q8ktq.us.auth0.com
- Client ID: IcTqEyNyIr3GpZcqdfKsc2k4I31YPRJ9
- Audience: https://api.pelara.ai
- Pelara API created in Auth0 with User Access: Authorized
- Callback URLs include: https://204.168.139.204, https://204.168.139.204/callback

### SESSION 4 — NEXT TARGET: Google OAuth + GBP data

### Session 2 target:
- [ ] Auth0 integration — login, callback, logout, get current user
- [ ] JWT middleware to protect routes
- [ ] Basic user and agency creation on first login

### Session 3 target:
- [ ] Client CRUD endpoints (create, read, update, deactivate)
- [ ] Frontend: React app initialized with Vite
- [ ] Frontend: Auth0 login flow working
- [ ] Frontend: Basic client list page

### Session 4 — Google OAuth + GBP data
- [ ] Google OAuth connection per client
- [ ] Pull GBP metrics: views, clicks, calls, direction requests
- [ ] Store in metrics_gbp table
- [ ] Display on dashboard

### Session 5 — GA4 + Search Console
- [ ] Google Analytics 4 integration
- [ ] Google Search Console integration
- [ ] Store in metrics_ga4 and metrics_gsc tables

### Session 6 — Facebook data
- [ ] Facebook Graph API OAuth
- [ ] Pull page reach, engagement, followers
- [ ] Store in metrics_facebook table

### Session 7 — Dashboard UI
- [ ] Metric cards component
- [ ] Charts using Recharts
- [ ] Date range selector
- [ ] Client switcher for agencies

### Session 8 — Alerts system
- [ ] Daily cron: check all metrics for 20%+ drop week-over-week
- [ ] Create alert records in database
- [ ] Alert banner on dashboard
- [ ] Email alerts via Resend

### Session 9 — Automated weekly reports
- [ ] Weekly PDF report per client (every Monday)
- [ ] Pull all stored metrics
- [ ] Auto-email to agency

### Session 9b — Uptime monitoring + keyword rank tracking
- [ ] Website uptime monitor: ping client website every 5 minutes
- [ ] Alert immediately if site goes down (email + dashboard alert)
- [ ] Keyword rank tracker: track daily Google position for target keywords
- [ ] New table: keyword_rankings (client_id, keyword, position, date)
- [ ] Alert when ranking drops 3+ positions in one day

### Session 10 — Stripe billing
- [ ] Subscription plans: Starter £49, Growth £99, Agency £199, Agency Pro £399
- [ ] Payment flow with Stripe Checkout
- [ ] Webhook handling for subscription events
- [ ] Client access gated by active subscription

### Session 11 — Call tracking (Twilio)
- [ ] Provision tracking numbers per client per channel
- [ ] Twilio webhook receives calls and logs them
- [ ] Call attribution engine (which channel generated the call)
- [ ] Missed call alerts
- [ ] Call log dashboard page

### Session 12 — GBP post scheduler
- [ ] Agency can write and schedule GBP posts directly in Pelara
- [ ] Posts published to client GBP via Google API on scheduled date/time
- [ ] Post calendar view per client
- [ ] Post performance tracking (views, clicks from each post)

### Session 13 — Review request automation
- [ ] After a job is logged in the system, trigger a review request
- [ ] Send WhatsApp/SMS to customer via Twilio
- [ ] Template builder: agency customises the review request message
- [ ] Track: request sent, review received, review count growth

### Session 14 — Competitor intelligence
- [ ] Google Places API finds top 5 competitors per client automatically
- [ ] Weekly scan: review count, rating, GBP post frequency
- [ ] Alert when competitor gains significant reviews or rankings
- [ ] Weekly competitor digest email per client

### Session 15 — NAP consistency + schema validator
- [ ] NAP checker: scan major directories (Yelp, Yell, Checkatrade, TrustATrader) for client's name/address/phone
- [ ] Flag inconsistencies that could hurt local rankings
- [ ] Schema markup validator: check client website has correct LocalBusiness JSON-LD
- [ ] Directory listing health report per client

### Session 16 — AI monthly action plan
- [ ] Claude API generates client-specific monthly recommendations based on all stored data
- [ ] Pulls: metric trends, competitor movements, review velocity, ranking changes
- [ ] Outputs: prioritised action list for agency to act on
- [ ] Delivered as PDF report or in-dashboard card

### Session 17 — Landing page + waitlist (do this BEFORE Session 1)
- [ ] Simple landing page at pelara.ai
- [ ] Email capture form for early access waitlist
- [ ] Basic product description and positioning
- [ ] Hosted on Hetzner VPS from day one

### Session 18 — Legal documents
- [ ] Terms of service
- [ ] Privacy policy (GDPR compliant — UK + EU)
- [ ] Data processing agreement template for agency clients
- [ ] Cookie consent banner on landing page

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


---

## 13. AGENCY INTELLIGENCE — WHAT PROFESSIONAL AGENCIES USE & WHAT PELARA MUST HAVE

### What Tier 2-3 agencies use today (and pay for separately):
- AgencyAnalytics: £10-15/client/month — reporting dashboards only, no call tracking
- Databox: £47+/month — real-time KPIs, goal tracking, benchmark groups
- DashThis: £49-149/month — automated reports, no competitor intelligence
- Semrush: £99-449/month — SEO + competitor, no GBP/call tracking
- CallRail: £45+/month — call tracking only, no local analytics
- Whatagraph: Custom pricing — visual reports, multi-channel, no local SEO focus
- Looker Studio: Free — powerful but manual, no automation, no alerts

**Total a serious agency spends: £250-700/month across 4-5 tools.**
**Pelara replaces all of it at £199-399/month. That is the pitch.**

---

### FEATURES FROM AGENCY ANALYSIS — ADD TO BUILD PLAN:

#### Feature A: Client Onboarding Wizard (Session 19)
Professional agencies lose clients in the first 30 days because setup is chaotic.
Pelara must have a structured onboarding flow when an agency adds a new client:
- Step 1: Business name, type, location, website URL
- Step 2: Connect Google (OAuth — GBP, GA4, Search Console in one flow)
- Step 3: Connect Facebook (OAuth)
- Step 4: Enter target keywords (what they want to rank for)
- Step 5: Enter top 3 competitors (Pelara auto-finds the rest)
- Step 6: Set KPI targets (reviews goal, ranking goal, calls goal per month)
- Step 7: Confirm and launch — first report generates automatically
This replaces the current manual "add client" flow with a guided wizard.
New table: onboarding_steps (client_id, step, completed, completed_at)

#### Feature B: Goal Tracking Per Client (Session 20)
Every professional agency sets targets. Pelara must show progress vs goals — not just raw numbers.
- Agency sets goals per client: "50 Google reviews by June", "rank top 3 for X keyword by August"
- Dashboard shows: current vs target, % progress, days remaining, on track / at risk / behind
- Alert when a goal is falling behind (7 days before deadline, 30% below pace)
New table: client_goals (id, client_id, metric_type, target_value, target_date, current_value, status)
metric_type options: reviews_count, keyword_position, calls_per_week, gbp_views, facebook_followers

#### Feature C: Industry Benchmarking (Session 21)
The single most powerful client conversation tool.
Instead of "you have 38 clicks this month", say "locksmiths in your area average 210 clicks — you are at 18%."
- Pelara stores anonymised aggregate data across all clients by business type + region
- Each client dashboard shows their metric vs industry average
- Weekly report includes benchmark context: "Your review count is below average for Coventry locksmiths"
New table: industry_benchmarks (business_type, region, metric_type, avg_value, top_quartile_value, updated_at)

#### Feature D: QBR Auto-Generator (Session 22)
Every 90 days, Pelara auto-generates a Quarterly Business Review document per client.
Agencies currently spend 4-8 hours per client on this manually.
QBR contains:
- Quarter summary: what improved, what dropped, by how much
- Competitor movement: who gained, who lost, why
- Goal achievement: which targets were hit, which were missed
- Review velocity chart: reviews over 90 days vs competitors
- Top 3 actions for next quarter (AI-generated based on data)
- Branded PDF, ready to send to the client in one click
This is built on top of the existing report infrastructure (Session 9) but quarterly + strategic.

#### Feature E: Diagnostic Onboarding Tool on pelara.ai Website (Session 17 — DO FIRST)
This is the lead generation engine before the product exists.
A multi-step form on pelara.ai that any local business or agency can complete for free.
Flow:
1. Business type + location + how long trading
2. Current situation: calls per week, Google reviews count, on Google Maps, website yes/no
3. Algorithm compares to industry benchmarks
4. Shows the gap: "Locksmiths with 50+ reviews get 3x more calls. You have 5."
5. Shows two futures:
   - Outcome A (fix these 4 things): projected calls increase X to Y in 90 days
   - Outcome B (do nothing): based on competitor growth, you lose Z% market share in 6 months
6. Shows exact weaknesses: GBP inactive, no area pages, low review count, missing citations
7. "Start your free trial — Pelara monitors all of this automatically"
This captures email, qualifies the lead, and demonstrates value before they pay a penny.
Build with Claude Code in Session 17 as a standalone HTML page on pelara.ai.

#### Feature F: Client Health Score (Session 23)
A single number per client that tells the agency at a glance how healthy that client is.
Score 0-100 calculated from:
- Review velocity (gaining reviews? +points. Stagnant? -points)
- GBP activity (posts this week? +points. Silent 14+ days? -points)
- Ranking trend (improving? +points. Dropping? -points)
- Call volume trend (up? +points. Down? -points)
- Competitor gap (pulling ahead? +points. Falling behind? -points)
Score displayed on agency overview dashboard with colour coding:
- 80-100: Green — Healthy
- 60-79: Amber — Needs attention
- 0-59: Red — At risk
Agencies can sort clients by health score to prioritise where to spend time.
New column: health_score INTEGER on clients table, recalculated daily by cron job.

#### Feature G: Benchmark Client vs Client (Agency internal view) (Session 24)
Agencies with multiple clients in the same industry can see who is performing best.
"You manage 6 locksmiths. Here is how they rank against each other."
This helps agencies identify best practices from their top performers and apply to weaker clients.
Also creates internal competition — clients improve when they know they are being compared.
Only visible to agency admin, never to individual clients.

#### Feature H: Automated Alert Escalation (upgrade Session 8)
Current alert system detects drops. Upgrade it with escalation levels:
- Level 1 (Yellow): Metric down 10-20% — note in dashboard
- Level 2 (Orange): Metric down 20-40% — email to agency
- Level 3 (Red): Metric down 40%+ or zero calls for 48h — SMS to agency owner via Twilio
- Level 4 (Critical): Competitor overtook you in rankings + your GBP inactive — emergency alert
This is what Victoria's situation needed. She had 2 days of silence. The system should have screamed on day 1.

---

### UPDATED FULL SESSION ROADMAP (in priority order):

0. ✅ SESSION 1 — Backend foundation (COMPLETE)
1. SESSION 17 — Diagnostic landing page on pelara.ai (DO THIS NOW — generates leads while you build)
2. SESSION 2 — Auth0 + user system
3. SESSION 3 — Client management + React frontend
4. SESSION 4 — Google OAuth + GBP data
5. SESSION 5 — GA4 + Search Console
6. SESSION 6 — Facebook data
7. SESSION 7 — Dashboard UI
8. SESSION 8 — Alerts system (with escalation levels from Feature H)
9. SESSION 9 — Automated weekly reports
10. SESSION 9b — Uptime monitoring + keyword rank tracking
11. SESSION 10 — Stripe billing
12. SESSION 11 — Call tracking (Twilio)
13. SESSION 12 — GBP post scheduler
14. SESSION 13 — Review request automation
15. SESSION 14 — Competitor intelligence
16. SESSION 15 — NAP consistency + schema validator
17. SESSION 16 — AI monthly action plan
18. SESSION 18 — Legal documents (GDPR, ToS, Privacy Policy)
19. SESSION 19 — Client onboarding wizard (Feature A)
20. SESSION 20 — Goal tracking per client (Feature B)
21. SESSION 21 — Industry benchmarking (Feature C)
22. SESSION 22 — QBR auto-generator (Feature D)
23. SESSION 23 — Client health score (Feature F)
24. SESSION 24 — Benchmark client vs client (Feature G)

---

*Total: 24 build sessions. At 1-2 sessions per week, full product in 12-24 weeks.*
*First paying customer possible after Session 10 (Stripe billing live).*
*First serious agency demo possible after Session 7 (dashboard UI complete).*

*Pelara.ai — See further. Act faster.*
*This file is the single source of truth. Keep it updated after every build session.*
