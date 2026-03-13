const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// All client routes require authentication
router.use(requireAuth);

// Placeholder routes — implemented in Session 3
router.get('/', async (req, res, next) => {
  try {
    res.json({ success: true, data: [] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    res.status(501).json({ success: false, error: 'Not implemented yet' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
