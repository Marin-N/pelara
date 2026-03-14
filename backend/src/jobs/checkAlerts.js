const cron = require('node-cron');
const db = require('../db');
const { checkClientAlerts } = require('../services/alertsService');
const logger = require('../utils/logger');

/**
 * Run metric drop checks for every active client.
 * Scheduled daily at 03:00 UTC — 1 hour after metrics sync finishes.
 */
const checkAllAlerts = async () => {
  logger.info('Starting daily alert checks');

  const result = await db.query(
    `SELECT id, name FROM clients WHERE is_active = true`
  );

  let totalNew = 0;
  for (const client of result.rows) {
    try {
      const newAlerts = await checkClientAlerts(client.id);
      if (newAlerts.length) {
        logger.info(`New alerts for ${client.name}`, { clientId: client.id, count: newAlerts.length });
        totalNew += newAlerts.length;
      }
    } catch (err) {
      logger.error('Alert check failed', { clientId: client.id, error: err.message });
    }
  }

  logger.info('Daily alert checks complete', { totalNew });
  return totalNew;
};

// Runs at 03:00 UTC every day — after metrics sync (02:00 UTC)
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron: daily alert check triggered');
    try {
      await checkAllAlerts();
    } catch (err) {
      logger.error('Cron: checkAllAlerts failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  logger.info('Alert check cron registered (daily 03:00 UTC)');
}

module.exports = { checkAllAlerts };
