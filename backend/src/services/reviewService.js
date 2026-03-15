const { Resend } = require('resend');
const twilio = require('twilio');
const db = require('../db');
const logger = require('../utils/logger');

const DASHBOARD_URL = process.env.FRONTEND_URL || 'https://204.168.139.204.nip.io';

// ── Helpers ───────────────────────────────────────────────────────────────────

const isResendConfigured = () => {
  const key = process.env.RESEND_API_KEY || '';
  return key.length > 0 && key !== 'placeholder';
};

const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  return sid.startsWith('AC');
};

const getReviewUrl = (client) => {
  // Google review URL via search — fallback for clients without a Place ID
  const query = encodeURIComponent(`${client.name} ${client.city || ''}`);
  return `https://search.google.com/local/writereview?q=${query}`;
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  // Strip everything except digits
  return phone.replace(/\D/g, '');
};

// ── Email send ─────────────────────────────────────────────────────────────────

const buildReviewEmailHTML = (customerName, businessName, reviewUrl) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#18181c;border:1px solid #2a2a2e;border-radius:16px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;">
    <div style="font-size:22px;font-weight:800;color:#fff;">
      <span style="color:#6c63ff;">◈</span> ${businessName}
    </div>
  </td></tr>
  <tr><td style="padding:32px;">
    <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:12px;">
      Hi ${customerName || 'there'} 👋
    </div>
    <div style="font-size:15px;color:#aaa;line-height:1.6;margin-bottom:28px;">
      Thank you for choosing ${businessName}! We hope everything went smoothly.<br><br>
      If you have a moment, we'd really appreciate it if you could leave us a Google review — it helps other customers find us and takes less than a minute.
    </div>
    <a href="${reviewUrl}" style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
      ⭐ Leave a Google Review
    </a>
    <div style="font-size:12px;color:#444;margin-top:28px;">
      Thank you for your support — it means a lot to us.
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const sendReviewEmail = async (customerEmail, customerName, businessName, reviewUrl) => {
  if (!isResendConfigured()) {
    logger.warn('Resend not configured — skipping review email');
    return false;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

  await resend.emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject: `How was your experience with ${businessName}?`,
    html: buildReviewEmailHTML(customerName, businessName, reviewUrl),
  });

  return true;
};

// ── SMS send ──────────────────────────────────────────────────────────────────

const sendReviewSMS = async (customerPhone, businessName, reviewUrl) => {
  if (!isTwilioConfigured()) {
    logger.warn('Twilio not configured — skipping review SMS');
    return false;
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    logger.warn('TWILIO_PHONE_NUMBER not set — skipping review SMS');
    return false;
  }

  await client.messages.create({
    body: `Hi! Thank you for choosing ${businessName}. If you have a moment, please leave us a Google review: ${reviewUrl}`,
    from: fromNumber,
    to: customerPhone,
  });

  return true;
};

// ── Public API ────────────────────────────────────────────────────────────────

const sendReviewRequest = async (clientId, agencyId, data) => {
  const { customer_name, customer_email, customer_phone, channel = 'sms' } = data;

  // Verify client belongs to agency
  const clientResult = await db.query(
    `SELECT id, name, city FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientResult.rows.length) throw new Error('Client not found');
  const client = clientResult.rows[0];

  if (!customer_name) throw new Error('customer_name is required');
  if (channel === 'email' && !customer_email) throw new Error('customer_email is required for email channel');
  if (channel === 'sms' && !customer_phone) throw new Error('customer_phone is required for sms channel');

  const reviewUrl = getReviewUrl(client);

  // Insert record first (status pending)
  const insertResult = await db.query(
    `INSERT INTO review_requests
       (client_id, customer_name, customer_email, customer_phone, channel, review_url, status, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
     RETURNING *`,
    [clientId, customer_name, customer_email || null, customer_phone || null, channel, reviewUrl]
  );
  const request = insertResult.rows[0];

  let delivered = false;
  let status = 'pending';

  try {
    if (channel === 'email' && customer_email) {
      delivered = await sendReviewEmail(customer_email, customer_name, client.name, reviewUrl);
      if (delivered) status = 'sent';
    } else if (channel === 'sms' && customer_phone) {
      delivered = await sendReviewSMS(customer_phone, client.name, reviewUrl);
      if (delivered) status = 'sent';
    }
  } catch (err) {
    logger.warn('Review request delivery failed', { clientId, channel, error: err.message });
    status = 'failed';
  }

  // Update status
  await db.query(`UPDATE review_requests SET status = $1 WHERE id = $2`, [status, request.id]);

  logger.info('Review request sent', { clientId, channel, status, requestId: request.id });
  return { ...request, status };
};

const getReviewRequests = async (clientId, agencyId, limit = 50) => {
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  const result = await db.query(
    `SELECT * FROM review_requests WHERE client_id = $1 ORDER BY sent_at DESC LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
};

const getReviewStats = async (clientId, agencyId) => {
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total_sent,
       COUNT(CASE WHEN status = 'sent' THEN 1 END)::int AS delivered,
       COUNT(CASE WHEN review_received = true THEN 1 END)::int AS reviews_received,
       COUNT(CASE WHEN sent_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS sent_this_week,
       COUNT(CASE WHEN sent_at >= date_trunc('month', NOW()) THEN 1 END)::int AS sent_this_month
     FROM review_requests
     WHERE client_id = $1`,
    [clientId]
  );
  return result.rows[0];
};

const markReviewReceived = async (requestId, agencyId) => {
  const check = await db.query(
    `SELECT rr.id FROM review_requests rr
     JOIN clients c ON c.id = rr.client_id
     WHERE rr.id = $1 AND c.agency_id = $2`,
    [requestId, agencyId]
  );
  if (!check.rows.length) throw new Error('Review request not found');

  await db.query(
    `UPDATE review_requests SET review_received = true, status = 'review_received' WHERE id = $1`,
    [requestId]
  );
  logger.info('Review marked as received', { requestId });
};

module.exports = {
  sendReviewRequest,
  getReviewRequests,
  getReviewStats,
  markReviewReceived,
  getReviewUrl,
};
