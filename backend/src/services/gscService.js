const { google } = require('googleapis');
const db = require('../db');
const { getOAuth2Client } = require('./tokenService');
const logger = require('../utils/logger');

const fmt = (d) => d.toISOString().split('T')[0];

/**
 * Fetch last 30 days of GSC search analytics for a client and store in metrics_gsc.
 * GSC data has a ~3-day processing lag — we shift the window back accordingly.
 * Requires gsc_site_url set on the client record.
 */
const fetchGSCMetrics = async (clientId) => {
  const oauth2Client = await getOAuth2Client(clientId);
  if (!oauth2Client) throw new Error(`No Google token for client ${clientId}`);

  const clientResult = await db.query(
    `SELECT gsc_site_url FROM clients WHERE id = $1`,
    [clientId]
  );
  const clientRow = clientResult.rows[0];
  if (!clientRow?.gsc_site_url) throw new Error(`Client ${clientId} has no gsc_site_url`);

  // GSC data is typically delayed by 3 days — adjust window to get complete data
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 3);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 30);

  const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

  const response = await searchconsole.searchanalytics.query({
    siteUrl: clientRow.gsc_site_url,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['date'],
      rowLimit: 1000,
    },
  });

  const inserted = [];
  for (const row of response.data.rows || []) {
    const dateStr = row.keys[0]; // Already 'YYYY-MM-DD'
    const clicks = Math.round(row.clicks || 0);
    const impressions = Math.round(row.impressions || 0);
    // ctr and position are already floats — store with reasonable precision
    const ctr = parseFloat((row.ctr || 0).toFixed(4));
    const average_position = parseFloat((row.position || 0).toFixed(2));

    const result = await db.query(
      `INSERT INTO metrics_gsc
         (client_id, date, impressions, clicks, ctr, average_position)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (client_id, date) DO UPDATE SET
         impressions      = EXCLUDED.impressions,
         clicks           = EXCLUDED.clicks,
         ctr              = EXCLUDED.ctr,
         average_position = EXCLUDED.average_position
       RETURNING *`,
      [clientId, dateStr, impressions, clicks, ctr, average_position]
    );
    inserted.push(result.rows[0]);
  }

  logger.info('GSC sync complete', { clientId, days: inserted.length });
  return inserted;
};

/**
 * Return last 30 days of stored GSC metrics — reads from DB, no live API call.
 */
const getGSCMetricsSummary = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_gsc WHERE client_id = $1 ORDER BY date ASC LIMIT 30`,
    [clientId]
  );
  return result.rows;
};

module.exports = { fetchGSCMetrics, getGSCMetricsSummary };
