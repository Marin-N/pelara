const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { sendWeeklyReport } = require('../services/emailService');
const db = require('../db');
const logger = require('../utils/logger');

router.use(requireAuth, attachUser);

// POST /api/email/test — send a test weekly report to the agency owner's email
// Uses the most recent real report for the first active client, or a sample.
router.post('/test', async (req, res, next) => {
  try {
    // Check Resend is configured
    const key = process.env.RESEND_API_KEY;
    if (!key || key === 'placeholder' || key === 'xxx' || key === 're_xxx') {
      return res.json({
        success: false,
        skipped: true,
        message: 'RESEND_API_KEY not configured — add it to .env and restart PM2.',
      });
    }

    // Find the most recent report for this agency's clients
    const reportResult = await db.query(
      `SELECT r.id, r.client_id
       FROM reports r
       JOIN clients c ON c.id = r.client_id
       WHERE c.agency_id = $1
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [req.user.agency_id]
    );

    if (!reportResult.rows.length) {
      return res.json({
        success: false,
        message: 'No reports found. Generate a report first from the Reports page, then test the email.',
      });
    }

    const { id: reportId, client_id: clientId } = reportResult.rows[0];

    logger.info('Test email requested', { agencyId: req.user.agency_id, reportId });

    await sendWeeklyReport(clientId, reportId);

    res.json({
      success: true,
      message: `Test email sent to ${req.user.email}. Check your inbox (and spam folder).`,
      reportId,
    });
  } catch (err) {
    logger.error('Test email failed', { error: err.message });
    next(err);
  }
});

// GET /api/email/status — check email configuration
router.get('/status', (req, res) => {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  const configured = !!(key && !['placeholder', 'xxx', 're_xxx'].includes(key));
  res.json({
    success: true,
    data: {
      configured,
      from_email: from || 'not set',
      message: configured
        ? `Email configured — sending from ${from}`
        : 'Add RESEND_API_KEY to .env to enable email reports',
    },
  });
});

module.exports = router;
