const cron = require('node-cron');
const db = require('../db');
const { fetchGBPMetrics } = require('../services/gbpService');
const { fetchGA4Metrics } = require('../services/ga4Service');
const { fetchGSCMetrics } = require('../services/gscService');
const logger = require('../utils/logger');

/**
 * Sync GBP, GA4, and GSC metrics for all active clients that have a Google token.
 * Each service runs independently — a failure in one does not block the others.
 */
const syncAllClients = async () => {
  logger.info('Starting daily metrics sync');

  // Only clients with a Google token connected qualify for sync
  const result = await db.query(
    `SELECT c.id, c.name, c.gbp_location_id, c.ga4_property_id, c.gsc_site_url
     FROM clients c
     INNER JOIN google_oauth_tokens t ON t.client_id = c.id
     WHERE c.is_active = true`
  );

  const clients = result.rows;
  logger.info(`Syncing ${clients.length} Google-connected clients`);

  const results = { success: [], failed: [] };

  for (const client of clients) {
    const clientResults = { id: client.id, name: client.name, gbp: null, ga4: null, gsc: null };

    // GBP sync — only if location ID is set
    if (client.gbp_location_id) {
      try {
        const rows = await fetchGBPMetrics(client.id);
        clientResults.gbp = rows.length;
        logger.info('GBP sync OK', { clientId: client.id });
      } catch (err) {
        clientResults.gbp = `error: ${err.message}`;
        logger.error('GBP sync failed', { clientId: client.id, error: err.message });
      }
    }

    // GA4 sync — only if property ID is set
    if (client.ga4_property_id) {
      try {
        const rows = await fetchGA4Metrics(client.id);
        clientResults.ga4 = rows.length;
        logger.info('GA4 sync OK', { clientId: client.id });
      } catch (err) {
        clientResults.ga4 = `error: ${err.message}`;
        logger.error('GA4 sync failed', { clientId: client.id, error: err.message });
      }
    }

    // GSC sync — only if site URL is set
    if (client.gsc_site_url) {
      try {
        const rows = await fetchGSCMetrics(client.id);
        clientResults.gsc = rows.length;
        logger.info('GSC sync OK', { clientId: client.id });
      } catch (err) {
        clientResults.gsc = `error: ${err.message}`;
        logger.error('GSC sync failed', { clientId: client.id, error: err.message });
      }
    }

    // A client is a success if at least one source synced without error
    const anyError = [clientResults.gbp, clientResults.ga4, clientResults.gsc]
      .some((v) => typeof v === 'string' && v.startsWith('error'));

    if (anyError) {
      results.failed.push(clientResults);
    } else {
      results.success.push(clientResults);
    }
  }

  logger.info('Daily metrics sync complete', { success: results.success.length, failed: results.failed.length });
  return results;
};

/**
 * Sync a single client across all connected sources.
 * Used by the manual sync endpoint and testing.
 */
const syncClient = async (clientId) => {
  const clientResult = await db.query(
    `SELECT id, gbp_location_id, ga4_property_id, gsc_site_url
     FROM clients WHERE id = $1`,
    [clientId]
  );
  const client = clientResult.rows[0];
  if (!client) throw new Error(`Client ${clientId} not found`);

  const result = { gbp: null, ga4: null, gsc: null };

  if (client.gbp_location_id) {
    try {
      const rows = await fetchGBPMetrics(clientId);
      result.gbp = rows.length;
    } catch (err) {
      result.gbp = `error: ${err.message}`;
      // Re-throw so the route can return 400 for config issues
      if (err.message.includes('No Google token')) throw err;
    }
  }

  if (client.ga4_property_id) {
    try {
      const rows = await fetchGA4Metrics(clientId);
      result.ga4 = rows.length;
    } catch (err) {
      result.ga4 = `error: ${err.message}`;
      logger.error('GA4 sync failed for manual sync', { clientId, error: err.message });
    }
  }

  if (client.gsc_site_url) {
    try {
      const rows = await fetchGSCMetrics(clientId);
      result.gsc = rows.length;
    } catch (err) {
      result.gsc = `error: ${err.message}`;
      logger.error('GSC sync failed for manual sync', { clientId, error: err.message });
    }
  }

  return { success: true, ...result };
};

// Register daily cron: every day at 2:00 AM UTC
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
