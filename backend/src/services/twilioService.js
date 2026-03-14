const twilio = require('twilio');
const db = require('../db');
const logger = require('../utils/logger');

// ── Client ────────────────────────────────────────────────────────────────────

const getClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !sid.startsWith('AC')) throw new Error('Twilio not configured — add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
  return twilio(sid, token);
};

const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  return sid.startsWith('AC');
};

// ── Number search ─────────────────────────────────────────────────────────────

/**
 * Search for available local phone numbers.
 * countryCode: 'GB', 'US', etc.
 * areaCode: optional — e.g. '024' for Coventry
 */
const searchAvailableNumbers = async (countryCode = 'GB', areaCode = null) => {
  const client = getClient();
  const opts = { limit: 5, voiceEnabled: true };
  if (areaCode) opts.areaCode = areaCode;

  const numbers = await client.availablePhoneNumbers(countryCode).local.list(opts);
  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality,
    region: n.region,
    monthlyRentalRate: n.beta ? 'N/A' : '£1.15/mo',
  }));
};

// ── Number purchase ───────────────────────────────────────────────────────────

/**
 * Purchase a Twilio tracking number and save it to the DB.
 * body.phoneNumber — E.164 format number to buy (from searchAvailableNumbers)
 * body.channel — 'gbp', 'website', 'ads', 'social', etc.
 * body.friendlyName — display label
 * body.forwardTo — real business phone in E.164 (+441234567890)
 */
const purchaseTrackingNumber = async (clientId, agencyId, body) => {
  const { phoneNumber, channel, friendlyName, forwardTo } = body;
  if (!phoneNumber || !forwardTo) throw new Error('phoneNumber and forwardTo are required');

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('TWILIO_WEBHOOK_URL not configured in .env');
  const statusUrl = webhookUrl.replace('/webhook', '/status');

  // Verify client belongs to agency
  const clientResult = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientResult.rows.length) throw new Error('Client not found');

  const client = getClient();
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName || `Pelara — ${channel || 'tracking'}`,
    voiceUrl: webhookUrl,
    voiceMethod: 'POST',
    statusCallback: statusUrl,
    statusCallbackMethod: 'POST',
  });

  const result = await db.query(
    `INSERT INTO call_tracking_numbers
       (client_id, twilio_number, twilio_sid, channel, friendly_name, forward_to)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [clientId, purchased.phoneNumber, purchased.sid, channel || 'general', friendlyName || purchased.friendlyName, forwardTo]
  );

  logger.info('Tracking number purchased', { clientId, phoneNumber: purchased.phoneNumber, channel });
  return result.rows[0];
};

// ── Number release ────────────────────────────────────────────────────────────

const releaseTrackingNumber = async (numberId, agencyId) => {
  const result = await db.query(
    `SELECT t.*, c.agency_id FROM call_tracking_numbers t
     JOIN clients c ON c.id = t.client_id
     WHERE t.id = $1`,
    [numberId]
  );
  const tn = result.rows[0];
  if (!tn) throw new Error('Tracking number not found');
  if (tn.agency_id !== agencyId) throw new Error('Tracking number not found');

  if (tn.twilio_sid) {
    try {
      const client = getClient();
      await client.incomingPhoneNumbers(tn.twilio_sid).remove();
    } catch (err) {
      logger.warn('Failed to remove Twilio number', { sid: tn.twilio_sid, error: err.message });
    }
  }

  await db.query(
    `UPDATE call_tracking_numbers SET is_active = false WHERE id = $1`,
    [numberId]
  );
  logger.info('Tracking number released', { numberId });
};

// ── Data queries ──────────────────────────────────────────────────────────────

const getTrackingNumbers = async (clientId) => {
  const result = await db.query(
    `SELECT t.*,
       COUNT(ca.id)::int AS total_calls,
       COUNT(CASE WHEN ca.status = 'completed' THEN 1 END)::int AS answered_calls,
       MAX(ca.called_at) AS last_call_at
     FROM call_tracking_numbers t
     LEFT JOIN calls ca ON ca.tracking_number_id = t.id
     WHERE t.client_id = $1 AND t.is_active = true
     GROUP BY t.id
     ORDER BY t.created_at DESC`,
    [clientId]
  );
  return result.rows;
};

const getCalls = async (clientId, limit = 100) => {
  const result = await db.query(
    `SELECT ca.*, t.channel, t.friendly_name, t.forward_to
     FROM calls ca
     LEFT JOIN call_tracking_numbers t ON t.id = ca.tracking_number_id
     WHERE ca.client_id = $1
     ORDER BY ca.called_at DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
};

const getCallStats = async (clientId) => {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total_calls,
       COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS answered,
       COUNT(CASE WHEN status IN ('no-answer','busy','failed','canceled') THEN 1 END)::int AS missed,
       COALESCE(AVG(CASE WHEN status = 'completed' AND duration_seconds > 0 THEN duration_seconds END), 0)::int AS avg_duration_secs,
       COUNT(CASE WHEN called_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS calls_this_week,
       COUNT(CASE WHEN called_at >= NOW() - INTERVAL '14 days' AND called_at < NOW() - INTERVAL '7 days' THEN 1 END)::int AS calls_last_week
     FROM calls
     WHERE client_id = $1 AND called_at >= NOW() - INTERVAL '30 days'`,
    [clientId]
  );
  return result.rows[0];
};

// ── Webhook handlers ──────────────────────────────────────────────────────────

/**
 * Handle incoming call from Twilio.
 * Returns TwiML string — forwards call and records it.
 */
const handleIncomingCall = async (body) => {
  const { To, From, CallSid } = body;

  const result = await db.query(
    `SELECT t.*, c.id AS client_id FROM call_tracking_numbers t
     JOIN clients c ON c.id = t.client_id
     WHERE t.twilio_number = $1 AND t.is_active = true
     LIMIT 1`,
    [To]
  );
  const tn = result.rows[0];

  if (!tn || !tn.forward_to) {
    logger.warn('Incoming call to unknown or unconfigured number', { to: To });
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not currently in service.</Say><Hangup/></Response>`;
  }

  // Insert call record
  try {
    await db.query(
      `INSERT INTO calls (client_id, tracking_number_id, channel, caller_number, status, called_at, twilio_call_sid)
       VALUES ($1, $2, $3, $4, 'in-progress', NOW(), $5)`,
      [tn.client_id, tn.id, tn.channel, From || 'unknown', CallSid]
    );
  } catch (err) {
    logger.error('Failed to insert call record', { error: err.message });
  }

  const statusUrl = (process.env.TWILIO_WEBHOOK_URL || '').replace('/webhook', '/status');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="${statusUrl}" method="POST" record="record-from-answer-dual" timeout="30" callerId="${To}">
    <Number>${tn.forward_to}</Number>
  </Dial>
</Response>`;
};

/**
 * Handle Twilio status callback after call ends.
 * Updates the call record with duration, status, recording URL.
 */
const handleCallStatus = async (body) => {
  const { CallSid, CallStatus, CallDuration, RecordingUrl } = body;
  if (!CallSid) return;

  await db.query(
    `UPDATE calls SET
       status           = $1,
       duration_seconds = $2,
       recording_url    = $3
     WHERE twilio_call_sid = $4`,
    [CallStatus || 'completed', parseInt(CallDuration || '0', 10), RecordingUrl || null, CallSid]
  );
  logger.info('Call status updated', { CallSid, CallStatus, duration: CallDuration });
};

module.exports = {
  isTwilioConfigured,
  searchAvailableNumbers,
  purchaseTrackingNumber,
  releaseTrackingNumber,
  getTrackingNumbers,
  getCalls,
  getCallStats,
  handleIncomingCall,
  handleCallStatus,
};
