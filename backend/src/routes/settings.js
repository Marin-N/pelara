const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const db = require('../db');
const logger = require('../utils/logger');

router.use(requireAuth, attachUser);

// GET /api/settings — agency info + user info
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.id AS agency_id, a.name AS agency_name,
              u.id AS user_id, u.email, u.name AS user_name,
              b.plan, b.status AS subscription_status, b.current_period_end
       FROM agencies a
       JOIN users u ON u.agency_id = a.id AND u.id = $1
       LEFT JOIN billing b ON b.agency_id = a.id
       WHERE a.id = $2`,
      [req.user.id, req.user.agency_id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ success: false, error: 'Settings not found' });

    res.json({
      success: true,
      data: {
        agency_name: row.agency_name,
        email: row.email,
        user_name: row.user_name,
        plan: row.plan || 'starter',
        subscription_status: row.subscription_status || 'trialing',
        current_period_end: row.current_period_end,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings — update agency name and/or contact email
router.put('/', async (req, res, next) => {
  try {
    const { agency_name, email } = req.body;

    if (agency_name) {
      await db.query(
        `UPDATE agencies SET name = $1, updated_at = NOW() WHERE id = $2`,
        [agency_name.trim(), req.user.agency_id]
      );
    }
    if (email) {
      await db.query(
        `UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2`,
        [email.trim().toLowerCase(), req.user.id]
      );
    }

    logger.info('Settings updated', { userId: req.user.id, agencyId: req.user.agency_id });
    res.json({ success: true, message: 'Settings saved' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
