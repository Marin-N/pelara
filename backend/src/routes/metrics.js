const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getClientById } = require('../services/clientService');
const { getGBPMetricsSummary } = require('../services/gbpService');
const { getGA4MetricsSummary } = require('../services/ga4Service');
const { getGSCMetricsSummary } = require('../services/gscService');
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

    const [gbp, ga4, gsc] = await Promise.all([
      getGBPMetricsSummary(req.params.clientId),
      getGA4MetricsSummary(req.params.clientId),
      getGSCMetricsSummary(req.params.clientId),
    ]);

    res.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          has_gbp: !!client.gbp_location_id,
          has_ga4: !!client.ga4_property_id,
          has_gsc: !!client.gsc_site_url,
          has_google_connected: client.has_google_connected,
        },
        gbp,
        ga4,
        gsc,
        facebook: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/metrics/:clientId/gbp
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

// GET /api/metrics/:clientId/ga4
router.get('/:clientId/ga4', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;
    const metrics = await getGA4MetricsSummary(req.params.clientId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// GET /api/metrics/:clientId/gsc
router.get('/:clientId/gsc', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;
    const metrics = await getGSCMetricsSummary(req.params.clientId);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// POST /api/metrics/:clientId/sync — trigger immediate sync across all sources
router.post('/:clientId/sync', async (req, res, next) => {
  try {
    const client = await checkClientOwnership(req, res);
    if (!client) return;

    const result = await syncClient(req.params.clientId);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('No Google token') || err.message.includes('gbp_location_id')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// GET /api/metrics/:clientId/facebook — stub for Session 6
router.get('/:clientId/facebook', async (req, res) => {
  res.status(501).json({ success: false, error: 'Facebook coming in Session 6' });
});

module.exports = router;
