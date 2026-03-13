const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// Twilio webhook is public (validated by Twilio signature, not our JWT)
router.post('/webhook', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth);

router.get('/:clientId', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:clientId/stats', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.post('/numbers', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
