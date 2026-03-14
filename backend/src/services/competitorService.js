const axios = require('axios');
const db = require('../db');
const logger = require('../utils/logger');

// ── CRUD ───────────────────────────────────────────────────────────────────────

const getCompetitors = async (clientId, agencyId) => {
  // Verify client belongs to agency
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  const result = await db.query(
    `SELECT c.*,
       cm_latest.reviews_count,
       cm_latest.reviews_average,
       cm_latest.date AS metrics_date,
       cm_prev.reviews_count AS prev_reviews_count,
       cm_prev.reviews_average AS prev_reviews_average
     FROM competitors c
     LEFT JOIN LATERAL (
       SELECT reviews_count, reviews_average, date
       FROM competitor_metrics
       WHERE competitor_id = c.id
       ORDER BY date DESC LIMIT 1
     ) cm_latest ON true
     LEFT JOIN LATERAL (
       SELECT reviews_count, reviews_average
       FROM competitor_metrics
       WHERE competitor_id = c.id
       ORDER BY date DESC LIMIT 1 OFFSET 1
     ) cm_prev ON true
     WHERE c.client_id = $1 AND c.is_active = true
     ORDER BY cm_latest.reviews_average DESC NULLS LAST`,
    [clientId]
  );
  return result.rows;
};

const addCompetitor = async (clientId, agencyId, data) => {
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  const { name, website_url, phone, address, gbp_place_id } = data;
  if (!name) throw new Error('Competitor name is required');

  const result = await db.query(
    `INSERT INTO competitors (client_id, name, website_url, phone, address, gbp_place_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [clientId, name, website_url || null, phone || null, address || null, gbp_place_id || null]
  );
  return result.rows[0];
};

const removeCompetitor = async (competitorId, agencyId) => {
  // Verify via join
  const result = await db.query(
    `SELECT comp.id FROM competitors comp
     JOIN clients c ON c.id = comp.client_id
     WHERE comp.id = $1 AND c.agency_id = $2`,
    [competitorId, agencyId]
  );
  if (!result.rows.length) throw new Error('Competitor not found');

  await db.query(
    `UPDATE competitors SET is_active = false WHERE id = $1`,
    [competitorId]
  );
};

// ── Manual metric update ──────────────────────────────────────────────────────

const updateCompetitorMetrics = async (competitorId, agencyId, { reviews_count, reviews_average }) => {
  const check = await db.query(
    `SELECT comp.id FROM competitors comp
     JOIN clients c ON c.id = comp.client_id
     WHERE comp.id = $1 AND c.agency_id = $2 AND comp.is_active = true`,
    [competitorId, agencyId]
  );
  if (!check.rows.length) throw new Error('Competitor not found');

  const today = new Date().toISOString().split('T')[0];
  await db.query(
    `INSERT INTO competitor_metrics (competitor_id, date, reviews_count, reviews_average)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (competitor_id, date) DO UPDATE SET
       reviews_count = EXCLUDED.reviews_count,
       reviews_average = EXCLUDED.reviews_average`,
    [competitorId, today, reviews_count || 0, reviews_average || 0]
  );
  logger.info('Competitor metrics updated manually', { competitorId });
};

// ── Google Places API fetch ────────────────────────────────────────────────────

/**
 * Fetch a competitor's review data from Google Places API.
 * Requires GOOGLE_PLACES_API_KEY in .env — different from OAuth credentials.
 * Falls back gracefully if key not available.
 */
const fetchFromPlaces = async (placeId) => {
  const apiKey = process.env.GOOGLE_CLIENT_ID; // Not ideal but reusing existing key
  // Use Places API (requires Places API enabled in Google Cloud project)
  const placesKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_CLIENT_ID;
  if (!placesKey) return null;

  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        fields: 'name,rating,user_ratings_total',
        key: placesKey,
      },
      timeout: 8000,
    });

    const place = res.data.result;
    if (!place) return null;

    return {
      reviews_count: place.user_ratings_total || 0,
      reviews_average: place.rating || 0,
    };
  } catch (err) {
    logger.warn('Places API fetch failed', { placeId, error: err.message });
    return null;
  }
};

/**
 * Auto-refresh all competitors for a client using Places API.
 * Only refreshes competitors that have a gbp_place_id set.
 * Returns count of updated records.
 */
const refreshCompetitorMetrics = async (clientId, agencyId) => {
  const competitors = await getCompetitors(clientId, agencyId);
  const withPlaceIds = competitors.filter((c) => c.gbp_place_id);

  let updated = 0;
  for (const comp of withPlaceIds) {
    const metrics = await fetchFromPlaces(comp.gbp_place_id);
    if (metrics && (metrics.reviews_count > 0 || metrics.reviews_average > 0)) {
      await updateCompetitorMetrics(comp.id, agencyId, metrics);
      updated++;
    }
  }

  logger.info('Competitor metrics refreshed', { clientId, updated, total: withPlaceIds.length });
  return { updated, total: withPlaceIds.length };
};

// ── History ───────────────────────────────────────────────────────────────────

const getCompetitorHistory = async (competitorId, agencyId, days = 30) => {
  const check = await db.query(
    `SELECT comp.id FROM competitors comp
     JOIN clients c ON c.id = comp.client_id
     WHERE comp.id = $1 AND c.agency_id = $2`,
    [competitorId, agencyId]
  );
  if (!check.rows.length) throw new Error('Competitor not found');

  const result = await db.query(
    `SELECT date, reviews_count, reviews_average
     FROM competitor_metrics
     WHERE competitor_id = $1 AND date >= NOW() - INTERVAL '${parseInt(days, 10)} days'
     ORDER BY date ASC`,
    [competitorId]
  );
  return result.rows;
};

module.exports = {
  getCompetitors,
  addCompetitor,
  removeCompetitor,
  updateCompetitorMetrics,
  refreshCompetitorMetrics,
  getCompetitorHistory,
};
