-- Session 4: ensure one Google token record per client
-- Required for ON CONFLICT upsert in tokenService
ALTER TABLE google_oauth_tokens
  ADD CONSTRAINT uq_google_oauth_tokens_client UNIQUE (client_id);
