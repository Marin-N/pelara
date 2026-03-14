const db = require('../db');
const logger = require('../utils/logger');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Percentage change from previous to current. Negative = drop. Returns null if no baseline. */
const pctChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

/**
 * Classify a % change into an alert severity level.
 * Only fires for drops (negative pct), not for increases.
 * Returns 'yellow' | 'orange' | 'red' | null
 */
const getSeverity = (pct) => {
  if (pct === null || pct >= -10) return null; // Within tolerance — no alert
  if (pct <= -40) return 'red';
  if (pct <= -20) return 'orange';
  return 'yellow'; // -10 to -20
};

const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

/**
 * Insert an alert record, deduplicating by (client_id, base_type, today).
 * base_type should be the metric category without severity, e.g. 'gsc_impressions_drop'.
 * This prevents re-alerting daily while still allowing escalation if severity changes.
 */
const createAlert = async (clientId, baseType, severity, message, metricType, metricValue, thresholdValue) => {
  const today = new Date().toISOString().split('T')[0];
  const fullType = `${baseType}_${severity}`;

  // Deduplicate: only one alert per base type per client per day
  const existing = await db.query(
    `SELECT id FROM alerts
     WHERE client_id = $1
       AND type LIKE $2
       AND DATE(created_at AT TIME ZONE 'UTC') = $3`,
    [clientId, `${baseType}%`, today]
  );
  if (existing.rows.length) return null;

  const result = await db.query(
    `INSERT INTO alerts (client_id, type, message, metric_type, metric_value, threshold_value)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [clientId, fullType, message, metricType, metricValue, thresholdValue]
  );
  return result.rows[0];
};

// ── Per-source alert checks ───────────────────────────────────────────────────

/**
 * Compare last 7 days vs previous 7 days for GSC metrics.
 * Fires on impressions drop and clicks drop.
 */
const checkGSCAlerts = async (clientId, clientName) => {
  const result = await db.query(
    `SELECT date, impressions, clicks FROM metrics_gsc
     WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 7) return []; // Not enough history

  // rows are DESC so rows[0..6] = last 7 days, rows[7..13] = previous 7
  const recent = rows.slice(0, 7);
  const previous = rows.slice(7, 14);
  if (!previous.length) return [];

  const alerts = [];

  const checks = [
    { key: 'impressions', base: 'gsc_impressions_drop', label: 'Google impressions' },
    { key: 'clicks', base: 'gsc_clicks_drop', label: 'Search clicks' },
  ];

  for (const c of checks) {
    const recentVal = sum(recent, c.key);
    const prevVal = sum(previous, c.key);
    const pct = pctChange(recentVal, prevVal);
    const sev = getSeverity(pct);
    if (!sev) continue;

    const msg = `${clientName}: ${c.label} dropped ${Math.abs(pct).toFixed(1)}% this week `
      + `(${recentVal.toLocaleString()} vs ${prevVal.toLocaleString()} last week)`;

    const alert = await createAlert(clientId, c.base, sev, msg, c.key, recentVal, prevVal);
    if (alert) {
      alerts.push({ ...alert, severity: sev });
      logger.info('Alert created', { clientId, type: alert.type });
    }
  }

  return alerts;
};

/**
 * Compare last 7 vs previous 7 days for GBP metrics.
 * Fires on phone clicks and website clicks drops.
 */
const checkGBPAlerts = async (clientId, clientName) => {
  const result = await db.query(
    `SELECT date, clicks_phone, clicks_website, views_search, views_maps FROM metrics_gbp
     WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 7) return [];

  const recent = rows.slice(0, 7);
  const previous = rows.slice(7, 14);
  if (!previous.length) return [];

  const alerts = [];

  const checks = [
    { key: 'clicks_phone', base: 'gbp_calls_drop', label: 'GBP phone clicks' },
    { key: 'clicks_website', base: 'gbp_website_drop', label: 'GBP website clicks' },
    { key: null, base: 'gbp_views_drop', label: 'GBP views' }, // combined search+maps
  ];

  for (const c of checks) {
    let recentVal, prevVal;
    if (c.key === null) {
      // Combined views
      recentVal = sum(recent, 'views_search') + sum(recent, 'views_maps');
      prevVal = sum(previous, 'views_search') + sum(previous, 'views_maps');
    } else {
      recentVal = sum(recent, c.key);
      prevVal = sum(previous, c.key);
    }

    const pct = pctChange(recentVal, prevVal);
    const sev = getSeverity(pct);
    if (!sev) continue;

    const msg = `${clientName}: ${c.label} dropped ${Math.abs(pct).toFixed(1)}% this week `
      + `(${recentVal.toLocaleString()} vs ${prevVal.toLocaleString()} last week)`;

    const key = c.key || 'gbp_views';
    const alert = await createAlert(clientId, c.base, sev, msg, key, recentVal, prevVal);
    if (alert) {
      alerts.push({ ...alert, severity: sev });
      logger.info('Alert created', { clientId, type: alert.type });
    }
  }

  return alerts;
};

/**
 * Compare last 7 vs previous 7 days for GA4 sessions.
 */
const checkGA4Alerts = async (clientId, clientName) => {
  const result = await db.query(
    `SELECT date, sessions FROM metrics_ga4
     WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 7) return [];

  const recent = rows.slice(0, 7);
  const previous = rows.slice(7, 14);
  if (!previous.length) return [];

  const recentVal = sum(recent, 'sessions');
  const prevVal = sum(previous, 'sessions');
  const pct = pctChange(recentVal, prevVal);
  const sev = getSeverity(pct);
  if (!sev) return [];

  const msg = `${clientName}: Website sessions dropped ${Math.abs(pct).toFixed(1)}% this week `
    + `(${recentVal.toLocaleString()} vs ${prevVal.toLocaleString()} last week)`;

  const alert = await createAlert(clientId, 'ga4_sessions_drop', sev, msg, 'sessions', recentVal, prevVal);
  if (!alert) return [];

  logger.info('Alert created', { clientId, type: alert.type });
  return [{ ...alert, severity: sev }];
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run all metric checks for a single client.
 * Returns array of newly-created alert objects.
 */
const checkClientAlerts = async (clientId) => {
  const clientResult = await db.query(
    `SELECT id, name, gbp_location_id, ga4_property_id, gsc_site_url FROM clients WHERE id = $1`,
    [clientId]
  );
  const client = clientResult.rows[0];
  if (!client) return [];

  const allAlerts = [];

  if (client.gsc_site_url) {
    const a = await checkGSCAlerts(client.id, client.name);
    allAlerts.push(...a);
  }
  if (client.gbp_location_id) {
    const a = await checkGBPAlerts(client.id, client.name);
    allAlerts.push(...a);
  }
  if (client.ga4_property_id) {
    const a = await checkGA4Alerts(client.id, client.name);
    allAlerts.push(...a);
  }

  return allAlerts;
};

/**
 * Fetch alerts for a client (unread by default).
 * Pass includeRead=true to get all alerts.
 */
const getAlerts = async (clientId, includeRead = false) => {
  const whereRead = includeRead ? '' : 'AND is_read = false';
  const result = await db.query(
    `SELECT * FROM alerts
     WHERE client_id = $1 ${whereRead}
     ORDER BY created_at DESC
     LIMIT 50`,
    [clientId]
  );
  return result.rows;
};

/** Mark a single alert as read. */
const markAlertRead = async (alertId) => {
  const result = await db.query(
    `UPDATE alerts SET is_read = true WHERE id = $1 RETURNING *`,
    [alertId]
  );
  return result.rows[0] || null;
};

/** Mark all unread alerts for a client as read. */
const markAllAlertsRead = async (clientId) => {
  await db.query(
    `UPDATE alerts SET is_read = true WHERE client_id = $1 AND is_read = false`,
    [clientId]
  );
};

module.exports = { checkClientAlerts, getAlerts, markAlertRead, markAllAlertsRead };
