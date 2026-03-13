-- Pelara Session 2 migration — auth0_sub column + 4 additional tables
-- auth0_sub is the permanent Auth0 user identifier used for login lookups

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth0_sub VARCHAR(255) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_auth0_sub ON users(auth0_sub);

CREATE TABLE IF NOT EXISTS keyword_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  keyword VARCHAR(255) NOT NULL,
  position INTEGER,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, keyword, date)
);

CREATE TABLE IF NOT EXISTS uptime_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  status VARCHAR(20) NOT NULL, -- 'up', 'down'
  response_time_ms INTEGER,
  checked_at TIMESTAMP DEFAULT NOW()
);

-- Index on checked_at for efficient time-range queries (monitoring queries last N records)
CREATE INDEX IF NOT EXISTS idx_uptime_logs_client_checked
  ON uptime_logs(client_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  platform VARCHAR(50) NOT NULL, -- 'gbp', 'facebook'
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  scheduled_for TIMESTAMP NOT NULL,
  published_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  customer_phone VARCHAR(20),
  customer_name VARCHAR(255),
  job_date DATE,
  sent_at TIMESTAMP,
  review_received BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
