const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getClientById } = require('../services/clientService');
const { checkClientAlerts, getAlerts, markAlertRead, markAllAlertsRead } = require('../services/alertsService');

router.use(requireAuth, attachUser);

// GET /api/alerts/:clientId?includeRead=true
// Returns unread alerts by default. Pass includeRead=true for full history.
router.get('/:clientId', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const includeRead = req.query.includeRead === 'true';
    const alerts = await getAlerts(req.params.clientId, includeRead);
    res.json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:alertId/read — mark a single alert as read
router.put('/:alertId/read', async (req, res, next) => {
  try {
    const alert = await markAlertRead(req.params.alertId);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

// PUT /api/alerts/:clientId/read-all — mark all unread alerts for a client as read
router.put('/:clientId/read-all', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    await markAllAlertsRead(req.params.clientId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:clientId/check — manually run alert checks (useful for testing)
router.post('/:clientId/check', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const newAlerts = await checkClientAlerts(req.params.clientId);
    res.json({ success: true, data: { new_alerts: newAlerts.length, alerts: newAlerts } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
