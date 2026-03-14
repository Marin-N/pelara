-- Session 11: dedicated billing table (replaces storing billing state on agencies)

CREATE TABLE IF NOT EXISTS billing (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id              UUID REFERENCES agencies(id) UNIQUE NOT NULL,
  stripe_customer_id     VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan                   VARCHAR(50)  DEFAULT 'starter',
  status                 VARCHAR(50)  DEFAULT 'trialing',
  current_period_end     TIMESTAMP,
  created_at             TIMESTAMP    DEFAULT NOW(),
  updated_at             TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_agency ON billing(agency_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_sub ON billing(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Migrate any existing billing state from agencies into new table
INSERT INTO billing (agency_id, stripe_customer_id, stripe_subscription_id, plan, status)
SELECT
  id,
  stripe_customer_id,
  stripe_subscription_id,
  COALESCE(plan, 'starter'),
  COALESCE(subscription_status, 'trialing')
FROM agencies
ON CONFLICT (agency_id) DO NOTHING;
