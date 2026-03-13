const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');

// GET /api/auth/me
// Returns the current user from the database (creates user + agency on first call).
// The JWT from Auth0 must be passed as Authorization: Bearer <token>.
router.get('/me', requireAuth, attachUser, async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
// Stateless JWT auth has no server-side session to destroy.
// The frontend handles logout by calling Auth0's logout endpoint.
// This endpoint exists for completeness and to revoke any future refresh tokens.
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
