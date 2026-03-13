const cron = require('node-cron');
const db = require('../db');
const { fetchGBPMetrics } = require('../services/gbpService');
const logger = require('../utils/logger');

/**
 * Sync GBP metrics for all active clients that have a Google token.
 * Called by the cron job and by the manual sync endpoint.
 */
const syncAllClients = async () => {
  logger.info('Starting daily metrics sync');

  const result = await db.query(
    `SELECT c.id, c.name, c.gbp_location_id
     FROM clients c
     INNER JOIN google_oauth_tokens t ON t.client_id = c.id
     WHERE c.is_active = true
       AND c.gbp_location_id IS NOT NULL`
  );

  const clients = result.rows;
  logger.info(`Syncing ${clients.length} clients with GBP connected`);

  const results = { success: [], failed: [] };

  for (const client of clients) {
    try {
      const rows = await fetchGBPMetrics(client.id);
      results.success.push({ id: client.id, name: client.name, days: rows.length });
      logger.info('GBP sync OK', { clientId: client.id, name: client.name });
    } catch (err) {
      results.failed.push({ id: client.id, name: client.name, error: err.message });
      logger.error('GBP sync failed', { clientId: client.id, name: client.name, error: err.message });
    }
  }

  logger.info('Daily metrics sync complete', results);
  return results;
};

/**
 * Sync a single client — used by the manual sync endpoint.
 */
const syncClient = async (clientId) => {
  const rows = await fetchGBPMetrics(clientId);
  return { success: true, days: rows.length };
};

// Register daily cron: every day at 2:00 AM UTC
// Only register in production to avoid noisy logs during dev
if (process.env.NODE_ENV === 'production') {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Cron: daily metrics sync triggered');
    try {
      await syncAllClients();
    } catch (err) {
      logger.error('Cron: syncAllClients failed', { error: err.message });
    }
  }, { timezone: 'UTC' });

  logger.info('Metrics sync cron registered (daily 02:00 UTC)');
}

module.exports = { syncAllClients, syncClient };
