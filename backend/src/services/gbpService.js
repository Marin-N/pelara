const axios = require('axios');
const db = require('../db');
const { getOAuth2Client } = require('./tokenService');
const logger = require('../utils/logger');

// Google Business Profile Performance API endpoint
const GBP_BASE = 'https://businessprofileperformance.googleapis.com/v1';

// All metrics we pull — combined into our 5 DB columns on insert
const GBP_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'CALL_CLICKS',
];

const toGBPDate = (d) => ({
  year: d.getUTCFullYear(),
  month: d.getUTCMonth() + 1,
  day: d.getUTCDate(),
});

/**
 * Fetch last 30 days of GBP performance for a client and store in metrics_gbp.
 * Handles token refresh automatically via oauth2Client.getAccessToken().
 */
const fetchGBPMetrics = async (clientId) => {
  const oauth2Client = await getOAuth2Client(clientId);
  if (!oauth2Client) throw new Error(`No Google token for client ${clientId}`);

  const clientResult = await db.query(
    `SELECT gbp_location_id FROM clients WHERE id = $1`,
    [clientId]
  );
  const clientRow = clientResult.rows[0];
  if (!clientRow?.gbp_location_id) throw new Error(`Client ${clientId} has no gbp_location_id`);

  // Strip "locations/" prefix if the stored value already has it
  const locationId = clientRow.gbp_location_id.replace(/^locations\//, '');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - 30);

  const { token } = await oauth2Client.getAccessToken();

  // GBP API takes repeated dailyMetrics query params
  const params = new URLSearchParams();
  GBP_METRICS.forEach((m) => params.append('dailyMetrics', m));
  const s = toGBPDate(startDate);
  const e = toGBPDate(endDate);
  params.append('dailyRange.startDate.year', s.year);
  params.append('dailyRange.startDate.month', s.month);
  params.append('dailyRange.startDate.day', s.day);
  params.append('dailyRange.endDate.year', e.year);
  params.append('dailyRange.endDate.month', e.month);
  params.append('dailyRange.endDate.day', e.day);

  const response = await axios.get(
    `${GBP_BASE}/locations/${locationId}:fetchMultiDailyMetricsTimeSeries?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Build a date-keyed map: { '2026-03-01': { WEBSITE_CLICKS: 5, ... } }
  const byDate = {};
  for (const series of response.data.multiDailyMetricTimeSeries || []) {
    const metric = series.dailyMetric;
    for (const dv of series.timeSeries?.datedValues || []) {
      const { year, month, day } = dv.date;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!byDate[dateStr]) byDate[dateStr] = {};
      byDate[dateStr][metric] = parseInt(dv.value || '0', 10);
    }
  }

  // Upsert each day — ON CONFLICT updates existing rows with fresh values
  const inserted = [];
  for (const [dateStr, m] of Object.entries(byDate)) {
    const views_search =
      (m.BUSINESS_IMPRESSIONS_DESKTOP_SEARCH || 0) +
      (m.BUSINESS_IMPRESSIONS_MOBILE_SEARCH || 0);
    const views_maps =
      (m.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0) +
      (m.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0);

    const row = await db.query(
      `INSERT INTO metrics_gbp
         (client_id, date, views_search, views_maps, clicks_website, clicks_directions, clicks_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (client_id, date) DO UPDATE SET
         views_search      = EXCLUDED.views_search,
         views_maps        = EXCLUDED.views_maps,
         clicks_website    = EXCLUDED.clicks_website,
         clicks_directions = EXCLUDED.clicks_directions,
         clicks_phone      = EXCLUDED.clicks_phone
       RETURNING *`,
      [
        clientId, dateStr,
        views_search, views_maps,
        m.WEBSITE_CLICKS || 0,
        m.BUSINESS_DIRECTION_REQUESTS || 0,
        m.CALL_CLICKS || 0,
      ]
    );
    inserted.push(row.rows[0]);
  }

  logger.info('GBP sync complete', { clientId, days: inserted.length });
  return inserted;
};

/**
 * Return last 30 days of stored GBP metrics — reads from DB, no live API call.
 */
const getGBPMetricsSummary = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_gbp
     WHERE client_id = $1
     ORDER BY date ASC
     LIMIT 30`,
    [clientId]
  );
  return result.rows;
};

module.exports = { fetchGBPMetrics, getGBPMetricsSummary };
