const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  getCompetitors,
  addCompetitor,
  removeCompetitor,
  updateCompetitorMetrics,
  refreshCompetitorMetrics,
  getCompetitorHistory,
} = require('../services/competitorService');

router.use(requireAuth, attachUser);

// GET /api/competitors/:clientId — list competitors with latest metrics
router.get('/:clientId', async (req, res, next) => {
  try {
    const competitors = await getCompetitors(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: competitors });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// POST /api/competitors/:clientId — add a competitor
router.post('/:clientId', async (req, res, next) => {
  try {
    const competitor = await addCompetitor(req.params.clientId, req.user.agency_id, req.body);
    res.status(201).json({ success: true, data: competitor });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('required')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// DELETE /api/competitors/:competitorId — remove a competitor
router.delete('/:competitorId', async (req, res, next) => {
  try {
    await removeCompetitor(req.params.competitorId, req.user.agency_id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// PUT /api/competitors/:competitorId/metrics — manually update reviews/rating
router.put('/:competitorId/metrics', async (req, res, next) => {
  try {
    const { reviews_count, reviews_average } = req.body;
    await updateCompetitorMetrics(req.params.competitorId, req.user.agency_id, { reviews_count, reviews_average });
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// POST /api/competitors/:clientId/refresh — auto-fetch metrics via Places API
router.post('/:clientId/refresh', async (req, res, next) => {
  try {
    const result = await refreshCompetitorMetrics(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// GET /api/competitors/:competitorId/history — metric history for charts
router.get('/:competitorId/history', async (req, res, next) => {
  try {
    const history = await getCompetitorHistory(req.params.competitorId, req.user.agency_id);
    res.json({ success: true, data: history });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
