const router = require('express').Router();
const { requireAuth, attachUser } = require('../middleware/auth');
const { getClientById } = require('../services/clientService');
const { generateWeeklyReport, getReports, getReportById } = require('../services/reportService');
const { sendWeeklyReport } = require('../services/emailService');
const logger = require('../utils/logger');

router.use(requireAuth, attachUser);

// GET /api/reports/:clientId — list reports for a client (most recent first)
router.get('/:clientId', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const reports = await getReports(req.params.clientId);
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/:clientId/:reportId — get full report data
router.get('/:clientId/:reportId', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const report = await getReportById(req.params.reportId, req.params.clientId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reports/:reportId — delete a report
router.delete('/:reportId', async (req, res, next) => {
  try {
    // Verify report belongs to this agency
    const check = await require('../db').query(
      `SELECT r.id FROM reports r
       JOIN clients c ON c.id = r.client_id
       WHERE r.id = $1 AND c.agency_id = $2`,
      [req.params.reportId, req.user.agency_id]
    );
    if (!check.rows.length) return res.status(404).json({ success: false, error: 'Report not found' });

    await require('../db').query(`DELETE FROM reports WHERE id = $1`, [req.params.reportId]);
    logger.info('Report deleted', { reportId: req.params.reportId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/reports/:clientId/generate — manually trigger report generation
router.post('/:clientId/generate', async (req, res, next) => {
  try {
    const client = await getClientById(req.params.clientId, req.user.agency_id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

    const report = await generateWeeklyReport(req.params.clientId);

    // Attempt email — don't fail the HTTP response if email fails
    if (req.query.email !== 'false') {
      sendWeeklyReport(req.params.clientId, report.id).catch((err) => {
        logger.warn('Manual report email failed', { reportId: report.id, error: err.message });
      });
    }

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
