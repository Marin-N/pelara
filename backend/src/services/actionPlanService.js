const db = require('../db');
const logger = require('../utils/logger');

// ── Data gathering ────────────────────────────────────────────────────────────

const gatherClientData = async (clientId) => {
  const [gscResult, gbpResult, alertsResult, competitorsResult] = await Promise.all([
    db.query(
      `SELECT SUM(impressions)::int AS impressions, SUM(clicks)::int AS clicks,
              AVG(ctr)::numeric AS ctr, AVG(average_position)::numeric AS avg_position
       FROM metrics_gsc WHERE client_id = $1 AND date >= NOW() - INTERVAL '14 days'`,
      [clientId]
    ),
    db.query(
      `SELECT SUM(views_search + views_maps)::int AS views,
              MAX(reviews_count)::int AS reviews_count,
              MAX(reviews_average)::numeric AS reviews_average
       FROM metrics_gbp WHERE client_id = $1 AND date >= NOW() - INTERVAL '14 days'`,
      [clientId]
    ),
    db.query(
      `SELECT type, message FROM alerts
       WHERE client_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`,
      [clientId]
    ),
    db.query(
      `SELECT c.name,
              cm.reviews_count,
              cm.reviews_average
       FROM competitors c
       LEFT JOIN LATERAL (
         SELECT reviews_count, reviews_average
         FROM competitor_metrics
         WHERE competitor_id = c.id
         ORDER BY date DESC LIMIT 1
       ) cm ON true
       WHERE c.client_id = $1 AND c.is_active = true
       ORDER BY cm.reviews_count DESC NULLS LAST
       LIMIT 5`,
      [clientId]
    ),
  ]);

  return {
    gsc: gscResult.rows[0],
    gbp: gbpResult.rows[0],
    alerts: alertsResult.rows,
    competitors: competitorsResult.rows,
  };
};

// ── Rule engine ───────────────────────────────────────────────────────────────

const buildActions = (client, data) => {
  const actions = [];
  const focusAreas = new Set();
  const insights = [];

  const { gsc, gbp, alerts, competitors } = data;

  // ── GSC rules ──────────────────────────────────────────────────────────────
  const gscHasData = gsc && (gsc.impressions > 0 || gsc.clicks > 0);

  if (!client.gsc_site_url) {
    actions.push({
      priority: 'high',
      category: 'Setup',
      title: 'Connect Google Search Console',
      description: 'Search Console is not connected. Connect it to track search visibility, impressions, and keyword performance.',
    });
    focusAreas.add('Setup');
  } else if (!gscHasData) {
    insights.push('No Search Console data found for the past 14 days.');
  } else {
    insights.push(`Search Console: ${(gsc.impressions || 0).toLocaleString()} impressions, ${gsc.clicks || 0} clicks in past 14 days.`);

    const avgPos = parseFloat(gsc.avg_position || 0);
    const ctr = parseFloat(gsc.ctr || 0) * 100;

    if (avgPos > 20) {
      actions.push({
        priority: 'medium',
        category: 'SEO',
        title: 'Improve search rankings',
        description: `Average position is ${avgPos.toFixed(1)} — content on page 1–2 gets significantly more clicks. Focus on optimising existing pages for target keywords.`,
      });
      focusAreas.add('SEO');
    }

    if (ctr < 2) {
      actions.push({
        priority: 'medium',
        category: 'SEO',
        title: 'Improve click-through rate',
        description: `CTR is ${ctr.toFixed(2)}% — below the 2% benchmark. Improve title tags and meta descriptions to make listings more compelling in search results.`,
      });
      focusAreas.add('SEO');
    }
  }

  // ── GBP rules ──────────────────────────────────────────────────────────────
  const reviewCount = parseInt(gbp?.reviews_count || 0, 10);
  const reviewAvg = parseFloat(gbp?.reviews_average || 0);

  if (reviewCount > 0) {
    insights.push(`Google reviews: ${reviewCount} reviews, ${reviewAvg.toFixed(1)} average rating.`);
  }

  if (reviewCount < 20) {
    actions.push({
      priority: 'high',
      category: 'Reputation',
      title: 'Increase Google review count',
      description: `Currently ${reviewCount} reviews. Businesses with 20+ reviews appear more prominently. Use the Reviews page to send automated review requests after each job.`,
    });
    focusAreas.add('Reputation');
  }

  if (reviewAvg > 0 && reviewAvg < 4.5) {
    actions.push({
      priority: 'medium',
      category: 'Reputation',
      title: 'Improve review rating',
      description: `Current rating is ${reviewAvg.toFixed(1)}. Aim for 4.5+. Respond professionally to negative reviews and resolve issues to encourage score improvements.`,
    });
    focusAreas.add('Reputation');
  }

  actions.push({
    priority: 'low',
    category: 'Content',
    title: 'Post weekly Google Business Profile updates',
    description: 'Regular GBP posts keep your listing fresh and signal activity to Google. Aim for at least one post per week — promotions, before/after work, team updates.',
  });
  focusAreas.add('Content');

  // ── Competitor rules ───────────────────────────────────────────────────────
  if (competitors.length > 0) {
    const topCompetitor = competitors[0];
    const topReviews = parseInt(topCompetitor.reviews_count || 0, 10);

    if (topReviews - reviewCount >= 10) {
      actions.push({
        priority: 'high',
        category: 'Reputation',
        title: `Close the review gap with ${topCompetitor.name}`,
        description: `${topCompetitor.name} has ${topReviews} reviews — ${topReviews - reviewCount} more than you. Send review requests after every completed job to close the gap.`,
      });
      focusAreas.add('Reputation');

      insights.push(`Top competitor ${topCompetitor.name} has ${topReviews} reviews.`);
    }
  }

  // ── Alert rules ────────────────────────────────────────────────────────────
  const redAlerts = alerts.filter((a) => a.type?.includes('red') || a.message?.toLowerCase().includes('dropped'));

  if (redAlerts.length > 0) {
    actions.push({
      priority: 'high',
      category: 'Performance',
      title: 'Address critical metric drops',
      description: `${redAlerts.length} critical alert${redAlerts.length > 1 ? 's' : ''} in the past 30 days. Review the Alerts page and investigate root causes for each drop.`,
    });
    focusAreas.add('Performance');
    insights.push(`${redAlerts.length} critical alert${redAlerts.length > 1 ? 's' : ''} detected in the past 30 days.`);
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    focus_areas: [...focusAreas],
    insights,
    actions,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

const generateActionPlan = async (clientId, agencyId) => {
  const clientResult = await db.query(
    `SELECT id, name, city, gsc_site_url, gbp_location_id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientResult.rows.length) throw new Error('Client not found');
  const client = clientResult.rows[0];

  const data = await gatherClientData(clientId);
  const { focus_areas, insights, actions } = buildActions(client, data);

  const month = new Date();
  month.setDate(1);
  const monthStr = month.toISOString().split('T')[0];

  const planData = {
    client_name: client.name,
    month: monthStr,
    focus_areas,
    insights,
    actions,
    generated_at: new Date().toISOString(),
  };

  // Upsert by client_id + month
  const result = await db.query(
    `INSERT INTO action_plans (client_id, month, plan_data, generated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (client_id, month) DO UPDATE SET
       plan_data = EXCLUDED.plan_data,
       generated_at = NOW()
     RETURNING *`,
    [clientId, monthStr, JSON.stringify(planData)]
  );

  logger.info('Action plan generated', { clientId, month: monthStr, actions: actions.length });
  return result.rows[0].plan_data;
};

const getActionPlans = async (clientId, agencyId, limit = 6) => {
  const clientCheck = await db.query(
    `SELECT id FROM clients WHERE id = $1 AND agency_id = $2`,
    [clientId, agencyId]
  );
  if (!clientCheck.rows.length) throw new Error('Client not found');

  const result = await db.query(
    `SELECT id, month, plan_data, generated_at
     FROM action_plans
     WHERE client_id = $1
     ORDER BY month DESC
     LIMIT $2`,
    [clientId, limit]
  );
  return result.rows;
};

module.exports = { generateActionPlan, getActionPlans };
