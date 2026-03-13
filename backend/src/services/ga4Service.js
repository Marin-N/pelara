const { google } = require('googleapis');
const db = require('../db');
const { getOAuth2Client } = require('./tokenService');
const logger = require('../utils/logger');

const fmt = (d) => d.toISOString().split('T')[0];

/**
 * Fetch last 30 days of GA4 metrics for a client and store in metrics_ga4.
 * Requires ga4_property_id set on the client record.
 * Makes two API calls: one for aggregate metrics, one for channel breakdown.
 */
const fetchGA4Metrics = async (clientId) => {
  const oauth2Client = await getOAuth2Client(clientId);
  if (!oauth2Client) throw new Error(`No Google token for client ${clientId}`);

  const clientResult = await db.query(
    `SELECT ga4_property_id FROM clients WHERE id = $1`,
    [clientId]
  );
  const clientRow = clientResult.rows[0];
  if (!clientRow?.ga4_property_id) throw new Error(`Client ${clientId} has no ga4_property_id`);

  // Strip 'properties/' prefix if present — API expects numeric ID only in the resource name
  const propertyId = clientRow.ga4_property_id.replace(/^properties\//, '');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - 30);

  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

  // Run both reports in parallel to reduce latency
  const [mainReport, channelReport] = await Promise.all([
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      },
    }),
    analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
        dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      },
    }),
  ]);

  // Build channel map keyed by raw date string 'YYYYMMDD'
  const channelMap = {};
  for (const row of channelReport.data.rows || []) {
    const dateRaw = row.dimensionValues[0].value;
    const channel = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value || '0', 10);
    if (!channelMap[dateRaw]) channelMap[dateRaw] = { organic: 0, direct: 0, referral: 0 };
    if (channel === 'Organic Search') channelMap[dateRaw].organic += sessions;
    else if (channel === 'Direct') channelMap[dateRaw].direct += sessions;
    else if (channel === 'Referral') channelMap[dateRaw].referral += sessions;
  }

  const inserted = [];
  for (const row of mainReport.data.rows || []) {
    // GA4 date dimension returns 'YYYYMMDD' — convert to 'YYYY-MM-DD' for PostgreSQL
    const dateRaw = row.dimensionValues[0].value;
    const dateStr = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;

    const sessions = parseInt(row.metricValues[0].value || '0', 10);
    const users = parseInt(row.metricValues[1].value || '0', 10);
    const new_users = parseInt(row.metricValues[2].value || '0', 10);
    // bounceRate comes as 0-1 decimal — store as-is matching DB column type DECIMAL(5,2)
    const bounce_rate = parseFloat(parseFloat(row.metricValues[3].value || '0').toFixed(4));
    const avg_session_duration = Math.round(parseFloat(row.metricValues[4].value || '0'));
    const organic_sessions = channelMap[dateRaw]?.organic || 0;
    const direct_sessions = channelMap[dateRaw]?.direct || 0;
    const referral_sessions = channelMap[dateRaw]?.referral || 0;

    const result = await db.query(
      `INSERT INTO metrics_ga4
         (client_id, date, sessions, users, new_users, bounce_rate,
          avg_session_duration, organic_sessions, direct_sessions, referral_sessions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (client_id, date) DO UPDATE SET
         sessions             = EXCLUDED.sessions,
         users                = EXCLUDED.users,
         new_users            = EXCLUDED.new_users,
         bounce_rate          = EXCLUDED.bounce_rate,
         avg_session_duration = EXCLUDED.avg_session_duration,
         organic_sessions     = EXCLUDED.organic_sessions,
         direct_sessions      = EXCLUDED.direct_sessions,
         referral_sessions    = EXCLUDED.referral_sessions
       RETURNING *`,
      [
        clientId, dateStr, sessions, users, new_users, bounce_rate,
        avg_session_duration, organic_sessions, direct_sessions, referral_sessions,
      ]
    );
    inserted.push(result.rows[0]);
  }

  logger.info('GA4 sync complete', { clientId, days: inserted.length });
  return inserted;
};

/**
 * Return last 30 days of stored GA4 metrics — reads from DB, no live API call.
 */
const getGA4MetricsSummary = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_ga4 WHERE client_id = $1 ORDER BY date ASC LIMIT 30`,
    [clientId]
  );
  return result.rows;
};

module.exports = { fetchGA4Metrics, getGA4MetricsSummary };
