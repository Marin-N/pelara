const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const {
  sendReviewRequest,
  getReviewRequests,
  getReviewStats,
  markReviewReceived,
} = require('../services/reviewService');

router.use(requireAuth, attachUser);

// GET /api/reviews/:clientId — list review requests
router.get('/:clientId', async (req, res, next) => {
  try {
    const requests = await getReviewRequests(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: requests });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// GET /api/reviews/:clientId/stats — review stats
router.get('/:clientId/stats', async (req, res, next) => {
  try {
    const stats = await getReviewStats(req.params.clientId, req.user.agency_id);
    res.json({ success: true, data: stats });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

// POST /api/reviews/:clientId — send review request
router.post('/:clientId', async (req, res, next) => {
  try {
    const request = await sendReviewRequest(req.params.clientId, req.user.agency_id, req.body);
    res.status(201).json({ success: true, data: request });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    if (err.message.includes('required')) return res.status(400).json({ success: false, error: err.message });
    next(err);
  }
});

// PUT /api/reviews/:clientId/:requestId/received — mark review as received
router.put('/:clientId/:requestId/received', async (req, res, next) => {
  try {
    await markReviewReceived(req.params.requestId, req.user.agency_id);
    res.json({ success: true });
  } catch (err) {
    if (err.message.includes('not found')) return res.status(404).json({ success: false, error: err.message });
    next(err);
  }
});

module.exports = router;
