const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getClientById } = require('../services/clientService');
const db = require('../db');
const logger = require('../utils/logger');

router.use(requireAuth, attachUser);

// GET /api/posts/:clientId — list all posts (scheduled + recent published/failed)
router.get('/:clientId', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const result = await db.query(
      `SELECT * FROM scheduled_posts
       WHERE client_id = $1
       ORDER BY
         CASE WHEN status = 'scheduled' THEN 0 ELSE 1 END,
         scheduled_for DESC
       LIMIT 50`,
      [req.params.clientId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:clientId/schedule — create a new scheduled post
router.post('/:clientId/schedule', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const { content, image_url, scheduled_for, platform = 'gbp' } = req.body;
    if (!content) return res.status(400).json({ success: false, error: 'content is required' });
    if (!scheduled_for) return res.status(400).json({ success: false, error: 'scheduled_for is required' });

    const scheduledAt = new Date(scheduled_for);
    if (isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid scheduled_for date' });
    }

    const result = await db.query(
      `INSERT INTO scheduled_posts (client_id, platform, content, image_url, scheduled_for, status)
       VALUES ($1, $2, $3, $4, $5, 'scheduled')
       RETURNING *`,
      [req.params.clientId, platform, content, image_url || null, scheduledAt]
    );

    logger.info('Post scheduled', { clientId: req.params.clientId, platform, scheduledFor: scheduledAt });
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/posts/:postId/publish — mark post as published (manual confirmation)
router.put('/:postId/publish', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE scheduled_posts sp
       SET status = 'published', published_at = NOW()
       FROM clients c
       WHERE sp.id = $1 AND sp.client_id = c.id AND c.agency_id = $2
       RETURNING sp.*`,
      [req.params.postId, req.user.agency_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:postId — cancel / delete a post
router.delete('/:postId', async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM scheduled_posts sp
       USING clients c
       WHERE sp.id = $1 AND sp.client_id = c.id AND c.agency_id = $2
       RETURNING sp.id`,
      [req.params.postId, req.user.agency_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Post not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
