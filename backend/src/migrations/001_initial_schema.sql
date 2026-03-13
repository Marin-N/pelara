-- Pelara initial schema — Session 1
-- Run once on a fresh database

-- agencies must exist before users (users reference agencies)
-- users must exist before agencies.owner_user_id (circular)
-- We use deferred FK for owner_user_id to resolve the circular reference

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_user_id UUID, -- FK added below after users table exists
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  white_label_name VARCHAR(255),
  white_label_logo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  agency_id UUID REFERENCES agencies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE agencies
  ADD CONSTRAINT fk_agencies_owner
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
  NOT VALID; -- skip retroactive validation, fine for fresh DB

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'GB',
  phone VARCHAR(50),
  website_url VARCHAR(500),
  gbp_location_id VARCHAR(255),
  ga4_property_id VARCHAR(255),
  gsc_site_url VARCHAR(500),
  facebook_page_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facebook_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metrics_gbp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  views_search INTEGER DEFAULT 0,
  views_maps INTEGER DEFAULT 0,
  clicks_website INTEGER DEFAULT 0,
  clicks_directions INTEGER DEFAULT 0,
  clicks_phone INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  reviews_average DECIMAL(3,2) DEFAULT 0,
  photos_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS metrics_ga4 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  organic_sessions INTEGER DEFAULT 0,
  direct_sessions INTEGER DEFAULT 0,
  referral_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS metrics_gsc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  average_position DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS metrics_facebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  page_views INTEGER DEFAULT 0,
  page_reach INTEGER DEFAULT 0,
  post_engagements INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, date)
);

CREATE TABLE IF NOT EXISTS call_tracking_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  twilio_number VARCHAR(20) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  friendly_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  tracking_number_id UUID REFERENCES call_tracking_numbers(id),
  channel VARCHAR(100),
  caller_number VARCHAR(20),
  duration_seconds INTEGER DEFAULT 0,
  status VARCHAR(50),
  called_at TIMESTAMP NOT NULL,
  recording_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  name VARCHAR(255) NOT NULL,
  gbp_place_id VARCHAR(255),
  address TEXT,
  phone VARCHAR(50),
  website_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id),
  date DATE NOT NULL,
  reviews_count INTEGER DEFAULT 0,
  reviews_average DECIMAL(3,2) DEFAULT 0,
  estimated_ranking INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(competitor_id, date)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  metric_type VARCHAR(50),
  metric_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
