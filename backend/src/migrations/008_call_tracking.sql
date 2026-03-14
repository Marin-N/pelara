-- Session 12: call tracking schema additions

-- forward_to: the real business phone number calls are forwarded to
-- twilio_sid: Twilio's IncomingPhoneNumber SID — needed to release the number
ALTER TABLE call_tracking_numbers
  ADD COLUMN IF NOT EXISTS forward_to    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS twilio_sid    VARCHAR(100);

-- twilio_call_sid: Twilio's CallSid — used to match status callbacks to call records
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS twilio_call_sid VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_calls_twilio_sid ON calls(twilio_call_sid)
  WHERE twilio_call_sid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calls_client_date ON calls(client_id, called_at DESC);
