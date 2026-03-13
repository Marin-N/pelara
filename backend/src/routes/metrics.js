const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/:clientId/summary', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:clientId/gbp', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:clientId/ga4', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:clientId/gsc', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:clientId/facebook', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.post('/:clientId/sync', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
