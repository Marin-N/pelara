const axios = require('axios');
const db = require('../db');
const logger = require('../utils/logger');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// Fetch the stored page access token for a client
const getFacebookToken = async (clientId) => {
  const result = await db.query(
    `SELECT access_token FROM facebook_oauth_tokens
     WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [clientId]
  );
  return result.rows[0]?.access_token || null;
};

/**
 * Fetch last 30 days of Facebook Page insights for a client and store in metrics_facebook.
 * Requires: facebook_page_id on client + facebook_oauth_tokens for client.
 * Uses page access token (long-lived) stored during OAuth.
 */
const fetchFacebookMetrics = async (clientId) => {
  const token = await getFacebookToken(clientId);
  if (!token) throw new Error(`No Facebook token for client ${clientId}`);

  const clientResult = await db.query(
    `SELECT facebook_page_id FROM clients WHERE id = $1`,
    [clientId]
  );
  const pageId = clientResult.rows[0]?.facebook_page_id;
  if (!pageId) throw new Error(`Client ${clientId} has no facebook_page_id`);

  // Facebook insights window — shift back 2 days to avoid incomplete data for today
  const endDate = new Date();
  endDate.setUTCDate(endDate.getUTCDate() - 2);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 30);

  const since = Math.floor(startDate.getTime() / 1000);
  const until = Math.floor(endDate.getTime() / 1000);

  const response = await axios.get(`${GRAPH_BASE}/${pageId}/insights`, {
    params: {
      metric: [
        'page_impressions',         // total impressions per day → page_views
        'page_impressions_unique',  // unique reach per day → page_reach
        'page_post_engagements',    // total engagements per day → post_engagements
        'page_fans',                // cumulative fans at end of day → followers_count
        'page_fan_adds',            // new fans per day → new_followers
      ].join(','),
      period: 'day',
      since,
      until,
      access_token: token,
    },
  });

  // Build a date-keyed map from the API response
  // Response: { data: [ { name, values: [{ value, end_time }] } ] }
  const byDate = {};
  for (const metricData of response.data.data || []) {
    const metricName = metricData.name;
    for (const entry of metricData.values || []) {
      // end_time: "2026-03-02T08:00:00+0000" — represents end of previous day in PST
      // Subtract 1 day to align with the actual calendar date measured
      const endDt = new Date(entry.end_time);
      endDt.setUTCDate(endDt.getUTCDate() - 1);
      const dateStr = endDt.toISOString().split('T')[0];
      if (!byDate[dateStr]) byDate[dateStr] = {};
      byDate[dateStr][metricName] = typeof entry.value === 'number' ? entry.value : 0;
    }
  }

  const inserted = [];
  for (const [dateStr, m] of Object.entries(byDate)) {
    const result = await db.query(
      `INSERT INTO metrics_facebook
         (client_id, date, page_views, page_reach, post_engagements, followers_count, new_followers)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (client_id, date) DO UPDATE SET
         page_views       = EXCLUDED.page_views,
         page_reach       = EXCLUDED.page_reach,
         post_engagements = EXCLUDED.post_engagements,
         followers_count  = EXCLUDED.followers_count,
         new_followers    = EXCLUDED.new_followers
       RETURNING *`,
      [
        clientId, dateStr,
        m.page_impressions || 0,
        m.page_impressions_unique || 0,
        m.page_post_engagements || 0,
        m.page_fans || 0,
        m.page_fan_adds || 0,
      ]
    );
    inserted.push(result.rows[0]);
  }

  logger.info('Facebook sync complete', { clientId, days: inserted.length });
  return inserted;
};

/**
 * Return last 30 days of stored Facebook metrics — reads from DB, no live API call.
 */
const getFacebookMetricsSummary = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_facebook WHERE client_id = $1 ORDER BY date ASC LIMIT 30`,
    [clientId]
  );
  return result.rows;
};

module.exports = { fetchFacebookMetrics, getFacebookMetricsSummary };
