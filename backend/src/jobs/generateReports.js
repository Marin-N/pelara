const cron = require('node-cron');
const db = require('../db');
const { generateWeeklyReport } = require('../services/reportService');
const { sendWeeklyReport } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Generate weekly reports for all active clients and send emails.
 * Runs every Monday at 06:00 UTC — after metrics sync (02:00) and alerts (03:00).
 */
const generateAllReports = async () => {
  logger.info('Starting weekly report generation');

  const result = await db.query(
    `SELECT id, name FROM clients WHERE is_active = true`
  );

  let generated = 0;
  let failed = 0;

  for (const client of result.rows) {
    try {
      const report = await generateWeeklyReport(client.id);
      generated++;

      // Attempt to email — failure here does not fail the report generation
      try {
        await sendWeeklyReport(client.id, report.id);
      } catch (emailErr) {
        logger.warn('Report generated but email failed', {
          clientId: client.id,
          reportId: report.id,
          error: emailErr.message,
        });
      }
    } catch (err) {
      failed++;
      logger.error('Report generation failed', { clientId: client.id, error: err.message });
    }
  }

  logger.info('Weekly report generation complete', { generated, failed });
  return { generated, failed };
};

// Every Monday at 06:00 UTC — after metrics sync (02:00) and alert checks (03:00)
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 6 * * 1', async () => {
    logger.info('Cron: weekly report generation triggered');
    try {
      await generateAllReports();
    } catch (err) {
      logger.error('Cron: generateAllReports failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  logger.info('Report generation cron registered (Mondays 06:00 UTC)');
}

module.exports = { generateAllReports };
