const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/:clientId', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.put('/:alertId/read', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
