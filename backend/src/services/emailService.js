const { Resend } = require('resend');
const db = require('../db');
const logger = require('../utils/logger');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const DASHBOARD_URL = process.env.FRONTEND_URL || 'https://204.168.139.204.nip.io';

// ── Formatting helpers ────────────────────────────────────────────────────────

const arrow = (pct) => {
  if (pct === null || pct === undefined) return '';
  return pct >= 0 ? '↑' : '↓';
};

const arrowColor = (pct, higherIsBetter = true) => {
  if (pct === null || pct === undefined) return '#888';
  const good = higherIsBetter ? pct >= 0 : pct <= 0;
  return good ? '#22c55e' : '#ef4444';
};

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'));
const fmtPct = (p) => (p == null ? '' : `${p >= 0 ? '+' : ''}${p}%`);

const metricRow = (label, thisVal, lastVal, pct, higherIsBetter = true) => `
  <tr>
    <td style="padding:8px 0;color:#aaa;font-size:13px;">${label}</td>
    <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${fmt(thisVal)}</td>
    <td style="padding:8px 0;color:#666;font-size:12px;text-align:right;">${fmt(lastVal)}</td>
    <td style="padding:8px 0;font-size:13px;font-weight:600;text-align:right;color:${arrowColor(pct, higherIsBetter)};">
      ${arrow(pct)} ${fmtPct(pct)}
    </td>
  </tr>`;

const sectionHeader = (title, emoji) => `
  <tr><td colspan="4" style="padding:20px 0 8px;font-size:11px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2a2e;">
    ${emoji} ${title}
  </td></tr>`;

// ── Email HTML builder ────────────────────────────────────────────────────────

const buildEmailHTML = (report) => {
  const { client, period, summary, gsc, gbp, ga4, facebook, alerts, recommendations } = report;

  const dateRange = `${new Date(period.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(period.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  let metricsTable = '';

  if (gsc?.available) {
    metricsTable += sectionHeader('Google Search Console', '🔍');
    metricsTable += metricRow('Impressions', gsc.this_week.impressions, gsc.last_week.impressions, gsc.changes.impressions_pct);
    metricsTable += metricRow('Search Clicks', gsc.this_week.clicks, gsc.last_week.clicks, gsc.changes.clicks_pct);
    metricsTable += metricRow('Click-Through Rate', gsc.this_week.ctr != null ? `${gsc.this_week.ctr}%` : '—', gsc.last_week.ctr != null ? `${gsc.last_week.ctr}%` : '—', gsc.changes.ctr_pct ?? gsc.changes.clicks_pct);
    metricsTable += metricRow('Avg. Position', gsc.this_week.avg_position, gsc.last_week.avg_position, gsc.changes.position_pct, false);
  }

  if (gbp?.available) {
    metricsTable += sectionHeader('Google Business Profile', '📍');
    metricsTable += metricRow('Views', gbp.this_week.views, gbp.last_week.views, gbp.changes.views_pct);
    metricsTable += metricRow('Phone Clicks', gbp.this_week.calls, gbp.last_week.calls, gbp.changes.calls_pct);
    metricsTable += metricRow('Website Clicks', gbp.this_week.website_clicks, gbp.last_week.website_clicks, gbp.changes.website_pct);
  }

  if (ga4?.available) {
    metricsTable += sectionHeader('Google Analytics', '📊');
    metricsTable += metricRow('Sessions', ga4.this_week.sessions, ga4.last_week.sessions, ga4.changes.sessions_pct);
    metricsTable += metricRow('Organic Sessions', ga4.this_week.organic_sessions, ga4.last_week.organic_sessions, ga4.changes.organic_pct);
  }

  if (facebook?.available) {
    metricsTable += sectionHeader('Facebook Page', '📱');
    metricsTable += metricRow('Page Reach', facebook.this_week.reach, facebook.last_week.reach, facebook.changes.reach_pct);
    metricsTable += metricRow('Post Engagements', facebook.this_week.engagements, facebook.last_week.engagements, facebook.changes.engagements_pct);
  }

  const alertsHTML = alerts?.length
    ? `<div style="background:#2a1a1a;border:1px solid #ef444422;border-radius:8px;padding:16px;margin:20px 0;">
        <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">⚠ ${alerts.length} ALERT${alerts.length > 1 ? 'S' : ''} THIS WEEK</div>
        ${alerts.slice(0, 3).map((a) => `<div style="font-size:13px;color:#fca5a5;padding:4px 0;border-bottom:1px solid #3b0a0a;">${a.message}</div>`).join('')}
      </div>`
    : '';

  const recsHTML = recommendations?.length
    ? `<div style="margin:24px 0;">
        <div style="font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">💡 Actions for this week</div>
        ${recommendations.map((r) => `<div style="font-size:13px;color:#aaa;padding:6px 0 6px 12px;border-left:2px solid #6c63ff;margin-bottom:8px;">${r}</div>`).join('')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#18181c;border:1px solid #2a2a2e;border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;">
    <div style="font-size:22px;font-weight:800;color:#fff;margin-bottom:4px;">
      <span style="color:#6c63ff;">◈</span> Pelara
    </div>
    <div style="font-size:13px;color:#888;">Weekly Performance Report</div>
  </td></tr>

  <!-- Client + period -->
  <tr><td style="padding:24px 32px 0;">
    <div style="font-size:20px;font-weight:700;color:#fff;">${client.name}</div>
    <div style="font-size:13px;color:#888;margin-top:4px;">${client.city || ''} · ${dateRange}</div>
    <div style="font-size:14px;color:#a5a0ff;margin-top:8px;font-weight:500;">${summary}</div>
  </td></tr>

  <!-- Alerts -->
  ${alertsHTML ? `<tr><td style="padding:0 32px;">${alertsHTML}</td></tr>` : ''}

  <!-- Metrics table -->
  <tr><td style="padding:8px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="border-bottom:1px solid #2a2a2e;">
        <td style="padding:8px 0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;">Metric</td>
        <td style="padding:8px 0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">This week</td>
        <td style="padding:8px 0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Last week</td>
        <td style="padding:8px 0;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.5px;text-align:right;">Change</td>
      </tr>
      ${metricsTable}
    </table>
  </td></tr>

  <!-- Recommendations -->
  ${recsHTML ? `<tr><td style="padding:0 32px;">${recsHTML}</td></tr>` : ''}

  <!-- CTA -->
  <tr><td style="padding:24px 32px;">
    <a href="${DASHBOARD_URL}/dashboard" style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
      View Full Dashboard →
    </a>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #2a2a2e;">
    <div style="font-size:12px;color:#555;">
      Pelara · See further. Act faster. · This report was generated automatically every Monday.
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send the weekly report email to the agency owner.
 * Updates email_sent_at on the report record if successful.
 */
const sendWeeklyReport = async (clientId, reportId) => {
  const report = await db.query(
    `SELECT r.*, r.data AS report_data FROM reports r WHERE r.id = $1 AND r.client_id = $2`,
    [reportId, clientId]
  );
  if (!report.rows.length) throw new Error(`Report ${reportId} not found`);

  const row = report.rows[0];
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  const toEmail = data.agency_email;

  if (!toEmail) {
    logger.warn('No agency email — skipping report email', { clientId, reportId });
    return null;
  }

  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'placeholder') {
    logger.warn('RESEND_API_KEY not set — skipping email send', { clientId, reportId });
    return null;
  }

  const html = buildEmailHTML(data);
  const subject = `Weekly Report: ${data.client.name} — ${new Date(row.period_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${new Date(row.period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    });

    // Mark email as sent
    await db.query(
      `UPDATE reports SET email_sent_at = NOW() WHERE id = $1`,
      [reportId]
    );

    logger.info('Weekly report email sent', { clientId, reportId, to: toEmail, emailId: result.data?.id });
    return result;
  } catch (err) {
    logger.error('Failed to send weekly report email', { clientId, reportId, error: err.message });
    throw err;
  }
};

module.exports = { sendWeeklyReport };
