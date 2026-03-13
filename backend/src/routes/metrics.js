const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getClientById } = require('../services/clientService');
const { getGBPMetricsSummary } = require('../services/gbpService');
const { syncClient } = require('../jobs/syncMetrics');

router.use(requireAuth, attachUser);

// Verify the requesting user's agency owns the target client
const checkClientOwnership = async (req, res) => {
  const client = await getClientById(req.params.clientId, req.user.agency_id);
  if (!client) {
    res.status(404).json({ success: false, error: 'Client not found' });
    return null;
  }
  return client;
};

// GET /api/metrics/:clientId/summary — last 30 days of all stored metrics
router.get('/:clientId/summary', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;

    const gbp = await getGBPMetricsSummary(req.params.clientId);

    res.json({
      success: true,
      data: {
        client: { id: client.id, name: client.name },
        gbp,
        // GA4, GSC, Facebook — populated in Sessions 5 and 6
        ga4: [],
        gsc: [],
        facebook: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/metrics/:clientId/gbp — GBP metrics with optional date range
router.get('/:clientId/gbp', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;

    const metrics = await getGBPMetricsSummary(req.params.clientId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// POST /api/metrics/:clientId/sync — trigger immediate GBP fetch for one client
router.post('/:clientId/sync', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;

    const result = await syncClient(req.params.clientId);
    res.json({ success: true, data: result });
  } catch (err) {
    // Sync errors (bad token, no GBP location set) return 400 not 500
    if (err.message.includes('No Google token') || err.message.includes('gbp_location_id')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// Stubs for future sessions
router.get('/:clientId/ga4', async (req, res, next) => {
  try { res.status(501).json({ success: false, error: 'GA4 coming in Session 5' }); }
  catch (err) { next(err); }
});

router.get('/:clientId/gsc', async (req, res, next) => {
  try { res.status(501).json({ success: false, error: 'GSC coming in Session 5' }); }
  catch (err) { next(err); }
});

router.get('/:clientId/facebook', async (req, res, next) => {
  try { res.status(501).json({ success: false, error: 'Facebook coming in Session 6' }); }
  catch (err) { next(err); }
});

module.exports = router;
