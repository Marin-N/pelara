-- Session 10: add subscription_status to agencies
-- Stripe customer/subscription columns already existed from Session 1

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trialing';
