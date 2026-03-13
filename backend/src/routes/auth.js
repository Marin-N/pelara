const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

// GET /api/auth/me — returns current user info from Auth0 JWT
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    // Auth0 JWT payload is on req.auth after verification
    res.json({ success: true, data: req.auth?.payload });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
