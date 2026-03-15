const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { runNAPCheck, getLatestNAPChecks } = require('../services/napService');

router.use(requireAuth, attachUser);

// POST /api/nap/:clientId/check — run NAP check
router.post('/:clientId/check', async (req, res, next) => {
  try {
    const result = await runNAPCheck(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// GET /api/nap/:clientId — get latest NAP check results
router.get('/:clientId', async (req, res, next) => {
  try {
    const result = await getLatestNAPChecks(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
