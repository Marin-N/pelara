const db = require('../db');
const logger = require('../utils/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────

const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const avg = (rows, key) => rows.length ? sum(rows, key) / rows.length : 0;

const pctChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const fmtPct = (pct) => pct === null ? null : parseFloat(pct.toFixed(1));

// ── Per-source sections ───────────────────────────────────────────────────────

const buildGSCSection = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_gsc WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 2) return { available: false };

  const thisWeek = rows.slice(0, 7);
  const lastWeek = rows.slice(7, 14);
  if (!lastWeek.length) return { available: false };

  const thisImpressions = sum(thisWeek, 'impressions');
  const lastImpressions = sum(lastWeek, 'impressions');
  const thisClicks = sum(thisWeek, 'clicks');
  const lastClicks = sum(lastWeek, 'clicks');
  const thisPosition = avg(thisWeek, 'average_position');
  const lastPosition = avg(lastWeek, 'average_position');

  return {
    available: true,
    this_week: {
      impressions: thisImpressions,
      clicks: thisClicks,
      ctr: thisImpressions > 0 ? parseFloat((thisClicks / thisImpressions * 100).toFixed(2)) : 0,
      avg_position: parseFloat(thisPosition.toFixed(1)),
    },
    last_week: {
      impressions: lastImpressions,
      clicks: lastClicks,
      ctr: lastImpressions > 0 ? parseFloat((lastClicks / lastImpressions * 100).toFixed(2)) : 0,
      avg_position: parseFloat(lastPosition.toFixed(1)),
    },
    changes: {
      impressions_pct: fmtPct(pctChange(thisImpressions, lastImpressions)),
      clicks_pct: fmtPct(pctChange(thisClicks, lastClicks)),
      ctr_pct: fmtPct(pctChange(
        thisImpressions > 0 ? thisClicks / thisImpressions * 100 : 0,
        lastImpressions > 0 ? lastClicks / lastImpressions * 100 : 0,
      )),
      // Positive position_pct = ranking got WORSE (higher number = lower rank)
      position_pct: fmtPct(pctChange(thisPosition, lastPosition)),
    },
    // Daily data for charts — ascending date order
    daily: [...thisWeek].reverse().map((r) => ({
      date: r.date,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
    })),
  };
};

const buildGBPSection = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_gbp WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 2) return { available: false };

  const thisWeek = rows.slice(0, 7);
  const lastWeek = rows.slice(7, 14);
  if (!lastWeek.length) return { available: false };

  const views = (arr) => sum(arr, 'views_search') + sum(arr, 'views_maps');

  const thisViews = views(thisWeek);
  const lastViews = views(lastWeek);
  const thisCalls = sum(thisWeek, 'clicks_phone');
  const lastCalls = sum(lastWeek, 'clicks_phone');
  const thisWebsite = sum(thisWeek, 'clicks_website');
  const lastWebsite = sum(lastWeek, 'clicks_website');
  const thisDirections = sum(thisWeek, 'clicks_directions');
  const lastDirections = sum(lastWeek, 'clicks_directions');

  return {
    available: true,
    this_week: { views: thisViews, calls: thisCalls, website_clicks: thisWebsite, directions: thisDirections },
    last_week: { views: lastViews, calls: lastCalls, website_clicks: lastWebsite, directions: lastDirections },
    changes: {
      views_pct: fmtPct(pctChange(thisViews, lastViews)),
      calls_pct: fmtPct(pctChange(thisCalls, lastCalls)),
      website_pct: fmtPct(pctChange(thisWebsite, lastWebsite)),
    },
    daily: [...thisWeek].reverse().map((r) => ({
      date: r.date,
      views: (Number(r.views_search) || 0) + (Number(r.views_maps) || 0),
      calls: Number(r.clicks_phone) || 0,
    })),
  };
};

const buildGA4Section = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_ga4 WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 2) return { available: false };

  const thisWeek = rows.slice(0, 7);
  const lastWeek = rows.slice(7, 14);
  if (!lastWeek.length) return { available: false };

  const thisSessions = sum(thisWeek, 'sessions');
  const lastSessions = sum(lastWeek, 'sessions');
  const thisOrganic = sum(thisWeek, 'organic_sessions');
  const lastOrganic = sum(lastWeek, 'organic_sessions');

  return {
    available: true,
    this_week: {
      sessions: thisSessions,
      organic_sessions: thisOrganic,
      users: sum(thisWeek, 'users'),
    },
    last_week: {
      sessions: lastSessions,
      organic_sessions: lastOrganic,
      users: sum(lastWeek, 'users'),
    },
    changes: {
      sessions_pct: fmtPct(pctChange(thisSessions, lastSessions)),
      organic_pct: fmtPct(pctChange(thisOrganic, lastOrganic)),
    },
    daily: [...thisWeek].reverse().map((r) => ({
      date: r.date,
      sessions: Number(r.sessions) || 0,
      organic: Number(r.organic_sessions) || 0,
    })),
  };
};

const buildFacebookSection = async (clientId) => {
  const result = await db.query(
    `SELECT * FROM metrics_facebook WHERE client_id = $1 ORDER BY date DESC LIMIT 14`,
    [clientId]
  );
  const rows = result.rows;
  if (rows.length < 2) return { available: false };

  const thisWeek = rows.slice(0, 7);
  const lastWeek = rows.slice(7, 14);
  if (!lastWeek.length) return { available: false };

  const thisReach = sum(thisWeek, 'page_reach');
  const lastReach = sum(lastWeek, 'page_reach');
  const thisEngagements = sum(thisWeek, 'post_engagements');
  const lastEngagements = sum(lastWeek, 'post_engagements');

  return {
    available: true,
    this_week: {
      reach: thisReach,
      engagements: thisEngagements,
      new_followers: sum(thisWeek, 'new_followers'),
    },
    last_week: {
      reach: lastReach,
      engagements: lastEngagements,
      new_followers: sum(lastWeek, 'new_followers'),
    },
    changes: {
      reach_pct: fmtPct(pctChange(thisReach, lastReach)),
      engagements_pct: fmtPct(pctChange(thisEngagements, lastEngagements)),
    },
  };
};

// ── Recommendations ───────────────────────────────────────────────────────────

const buildRecommendations = (gsc, gbp, ga4, alertCount) => {
  const recs = [];

  if (gsc?.available) {
    const { impressions_pct, clicks_pct, position_pct } = gsc.changes;
    if (impressions_pct !== null && impressions_pct < -20) {
      recs.push(`Google impressions dropped ${Math.abs(impressions_pct).toFixed(0)}% this week — post an update to your Google Business Profile and ensure all listing info is complete.`);
    }
    if (clicks_pct !== null && clicks_pct < -15) {
      recs.push(`Search clicks dropped ${Math.abs(clicks_pct).toFixed(0)}% — review listing titles and descriptions for stronger calls-to-action.`);
    }
    if (position_pct !== null && position_pct > 10) {
      recs.push(`Average ranking worsened this week — review your location pages and ensure they target your core service keywords.`);
    }
    if (gsc.this_week.avg_position > 20) {
      recs.push(`Average position is ${gsc.this_week.avg_position} — aim for top 10 by adding location-specific service pages for your area.`);
    }
    if (gsc.this_week.ctr < 2 && gsc.this_week.impressions > 100) {
      recs.push(`Click-through rate is ${gsc.this_week.ctr}% — improve it by adding star ratings schema markup and writing more compelling meta descriptions.`);
    }
  }

  if (gbp?.available) {
    if (gbp.changes.calls_pct !== null && gbp.changes.calls_pct < -20) {
      recs.push(`Phone clicks from Google Business Profile dropped ${Math.abs(gbp.changes.calls_pct).toFixed(0)}% — verify your phone number is correct and respond to any recent reviews.`);
    }
    if (gbp.this_week.calls === 0 && gbp.last_week.calls > 0) {
      recs.push(`No phone calls from GBP this week (${gbp.last_week.calls} last week) — check your listing is live and consider adding new photos to regain visibility.`);
    }
  }

  if (ga4?.available) {
    if (ga4.changes.organic_pct !== null && ga4.changes.organic_pct < -20) {
      recs.push(`Organic website traffic dropped ${Math.abs(ga4.changes.organic_pct).toFixed(0)}% — check for any recent website changes, crawl errors, or Google algorithm updates.`);
    }
  }

  if (alertCount > 0) {
    recs.push(`${alertCount} alert${alertCount > 1 ? 's were' : ' was'} triggered this week — review the Alerts section for details and take action before these trends worsen.`);
  }

  if (!recs.length) {
    recs.push('Metrics are stable this week. Maintain momentum — aim for at least one GBP post, one review response, and one piece of new content this week.');
  }

  return recs;
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate a weekly report for a client.
 * Covers the last 7 completed days vs the 7 days before that.
 * Saves to the reports table and returns the full saved row.
 */
const generateWeeklyReport = async (clientId) => {
  // Get client + agency owner email in one query
  const clientResult = await db.query(
    `SELECT c.*, a.id AS agency_id_val,
            u.email AS agency_email, u.name AS agency_name
     FROM clients c
     JOIN agencies a ON a.id = c.agency_id
     LEFT JOIN users u ON u.agency_id = a.id AND u.role = 'agency_admin'
     WHERE c.id = $1
     LIMIT 1`,
    [clientId]
  );
  const client = clientResult.rows[0];
  if (!client) throw new Error(`Client ${clientId} not found`);

  // Period = yesterday (to ensure data is complete) going back 7 days
  const periodEnd = new Date();
  periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 6);

  // Build all sections in parallel
  const [gsc, gbp, ga4, facebook] = await Promise.all([
    buildGSCSection(clientId),
    buildGBPSection(clientId),
    buildGA4Section(clientId),
    buildFacebookSection(clientId),
  ]);

  // Fetch alerts triggered this week
  const alertsResult = await db.query(
    `SELECT type, message, created_at FROM alerts
     WHERE client_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`,
    [clientId]
  );
  const alerts = alertsResult.rows;

  const recommendations = buildRecommendations(gsc, gbp, ga4, alerts.length);

  // Build one-line summary for list view
  const summaryParts = [];
  if (gsc?.available && gsc.changes.impressions_pct !== null) {
    const p = gsc.changes.impressions_pct;
    summaryParts.push(`Impressions ${p >= 0 ? '+' : ''}${p.toFixed(0)}%`);
  }
  if (gbp?.available && gbp.changes.calls_pct !== null) {
    const p = gbp.changes.calls_pct;
    summaryParts.push(`GBP calls ${p >= 0 ? '+' : ''}${p.toFixed(0)}%`);
  }
  if (ga4?.available && ga4.changes.sessions_pct !== null) {
    const p = ga4.changes.sessions_pct;
    summaryParts.push(`Sessions ${p >= 0 ? '+' : ''}${p.toFixed(0)}%`);
  }

  const reportData = {
    client: {
      id: client.id,
      name: client.name,
      city: client.city,
      business_type: client.business_type,
    },
    agency_email: client.agency_email,
    period: {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    },
    summary: summaryParts.length ? summaryParts.join(' · ') : 'Weekly metrics report',
    gsc,
    gbp,
    ga4,
    facebook,
    alerts,
    recommendations,
  };

  const saved = await db.query(
    `INSERT INTO reports (client_id, agency_id, report_type, period_start, period_end, data)
     VALUES ($1, $2, 'weekly', $3, $4, $5)
     RETURNING *`,
    [clientId, client.agency_id, reportData.period.start, reportData.period.end, JSON.stringify(reportData)]
  );

  logger.info('Weekly report generated', { clientId, reportId: saved.rows[0].id });
  return saved.rows[0];
};

/**
 * List recent reports for a client — lightweight, data field excluded.
 */
const getReports = async (clientId, limit = 12) => {
  const result = await db.query(
    `SELECT id, client_id, report_type, period_start, period_end,
            data->>'summary' AS summary,
            jsonb_array_length(COALESCE(data->'alerts', '[]'::jsonb)) AS alert_count,
            email_sent_at, created_at
     FROM reports
     WHERE client_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
};

/** Get full report data by ID. */
const getReportById = async (reportId, clientId) => {
  const result = await db.query(
    `SELECT * FROM reports WHERE id = $1 AND client_id = $2`,
    [reportId, clientId]
  );
  return result.rows[0] || null;
};

module.exports = { generateWeeklyReport, getReports, getReportById };
