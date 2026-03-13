-- Session 5 migration: ensure referral_sessions column exists in metrics_ga4
-- Safe to run multiple times — ADD COLUMN IF NOT EXISTS is idempotent

ALTER TABLE metrics_ga4
  ADD COLUMN IF NOT EXISTS referral_sessions INTEGER DEFAULT 0;
