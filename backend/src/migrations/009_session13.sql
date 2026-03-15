-- Session 13 migration
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms';
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS review_url TEXT;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  month DATE NOT NULL,
  plan_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(client_id, month)
);

CREATE TABLE IF NOT EXISTS nap_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  source VARCHAR(50) NOT NULL,
  name_found VARCHAR(255),
  address_found TEXT,
  phone_found VARCHAR(50),
  name_match BOOLEAN DEFAULT false,
  address_match BOOLEAN DEFAULT false,
  phone_match BOOLEAN DEFAULT false,
  checked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
