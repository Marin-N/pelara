const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  isTwilioConfigured,
  searchAvailableNumbers,
  purchaseTrackingNumber,
  releaseTrackingNumber,
  getTrackingNumbers,
  getCalls,
  getCallStats,
  handleIncomingCall,
  handleCallStatus,
} = require('../services/twilioService');
const { getClientById } = require('../services/clientService');
const logger = require('../utils/logger');

// ── Public webhook routes (Twilio calls these — no JWT auth) ─────────────────

// POST /api/calls/webhook — incoming call from Twilio, returns TwiML
router.post('/webhook', async (req, res) => {
  try {
    // Optional: validate Twilio request signature in production
    const twiml = await handleIncomingCall(req.body);
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (err) {
    logger.error('Call webhook error', { error: err.message });
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
});

// POST /api/calls/status — Twilio status callback after call completes
router.post('/status', async (req, res) => {
  try {
    await handleCallStatus(req.body);
    res.sendStatus(204);
  } catch (err) {
    logger.error('Call status callback error', { error: err.message });
    res.sendStatus(204); // always 204 so Twilio doesn't retry
  }
});

// ── Auth-protected routes ─────────────────────────────────────────────────────

router.use(requireAuth, attachUser);

// GET /api/calls/configured — check if Twilio is set up
router.get('/configured', (req, res) => {
  res.json({ success: true, data: { configured: isTwilioConfigured() } });
});

// GET /api/calls/:clientId/stats — call summary stats (last 30 days)
router.get('/:clientId/stats', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const stats = await getCallStats(req.params.clientId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/calls/:clientId/numbers — list tracking numbers for a client
router.get('/:clientId/numbers', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const numbers = await getTrackingNumbers(req.params.clientId);
    res.json({ success: true, data: numbers });
  } catch (err) {
    next(err);
  }
});

// GET /api/calls/:clientId — list call history
router.get('/:clientId', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const calls = await getCalls(req.params.clientId, parseInt(req.query.limit || '100', 10));
    res.json({ success: true, data: calls });
  } catch (err) {
    next(err);
  }
});

// GET /api/calls/:clientId/search-numbers — search available numbers to buy
router.get('/:clientId/search-numbers', async (req, res, next) => {
  try {
    if (!isTwilioConfigured()) {
      return res.status(503).json({ success: false, error: 'Twilio not configured' });
    }

    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { country = 'GB', areaCode } = req.query;
    const numbers = await searchAvailableNumbers(country, areaCode || null);
    res.json({ success: true, data: numbers });
  } catch (err) {
    if (err.message.includes('not configured')) {
      return res.status(503).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// POST /api/calls/:clientId/numbers — purchase a tracking number
router.post('/:clientId/numbers', async (req, res, next) => {
  try {
    if (!isTwilioConfigured()) {
      return res.status(503).json({ success: false, error: 'Twilio not configured' });
    }

    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const number = await purchaseTrackingNumber(req.params.clientId, req.user.agency_id, req.body);
    res.status(201).json({ success: true, data: number });
  } catch (err) {
    if (err.message.includes('not configured') || err.message.includes('required')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// DELETE /api/calls/numbers/:numberId — release a tracking number
router.delete('/numbers/:numberId', async (req, res, next) => {
  try {
    await releaseTrackingNumber(req.params.numberId, req.user.agency_id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
