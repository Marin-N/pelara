const router = require('express').Router();
const PDFDocument = require('pdfkit');
const db = require('../db');
const { requireAuth, attachUser } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(requireAuth, attachUser);

const PURPLE = '#6c63ff';
const DARK = '#0f0f11';
const CARD = '#1a1a22';
const TEXT = '#e8e8e8';
const MUTED = '#888888';
const BORDER = '#2a2a2e';
const GREEN = '#22c55e';
const RED = '#ef4444';

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'));
const fmtPct = (p) => {
  if (p == null) return '';
  const sign = p >= 0 ? '↑ +' : '↓ ';
  return `${sign}${Math.abs(p)}%`;
};
const pctColor = (p, higherIsBetter = true) => {
  if (p == null) return MUTED;
  const good = higherIsBetter ? p >= 0 : p <= 0;
  return good ? GREEN : RED;
};

// ── PDF generation ────────────────────────────────────────────────────────────

const generatePDF = (reportRow, doc) => {
  const data = typeof reportRow.data === 'string' ? JSON.parse(reportRow.data) : reportRow.data;
  const { client, period, summary, gsc, gbp, ga4, facebook, alerts, recommendations } = data;

  const W = 595; // A4 width in points
  const MARGIN = 50;
  const CONTENT_W = W - MARGIN * 2;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 88).fill('#1a1a2e');
  doc.fontSize(22).fillColor(PURPLE).text('◈ Pelara', MARGIN, 22);
  doc.fontSize(10).fillColor(MUTED).text('Weekly Performance Report', MARGIN, 50);

  // ── Client info ───────────────────────────────────────────────────────────
  let y = 108;
  doc.fontSize(20).fillColor(TEXT).text(client?.name || 'Client', MARGIN, y);
  y += 28;

  const startDate = period?.start ? new Date(period.start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const endDate = period?.end ? new Date(period.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  doc.fontSize(11).fillColor(MUTED).text(`${startDate} – ${endDate}  ·  Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, MARGIN, y);
  y += 16;

  if (summary) {
    doc.fontSize(12).fillColor('#a5a0ff').text(summary, MARGIN, y, { width: CONTENT_W });
    y += 22;
  }

  y += 12;

  // ── Section helper ────────────────────────────────────────────────────────
  const drawSection = (title) => {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke(BORDER);
    y += 8;
    doc.fontSize(9).fillColor(MUTED).text(title, MARGIN, y, { characterSpacing: 0.8 });
    y += 20;
  };

  const drawMetricRow = (label, thisVal, lastVal, pct, higherIsBetter = true) => {
    if (y > 730) { doc.addPage(); y = 50; }
    doc.fontSize(11).fillColor(MUTED).text(label, MARGIN, y, { width: 180 });
    doc.fontSize(11).fillColor(TEXT).text(fmt(thisVal), MARGIN + 200, y, { width: 100, align: 'right' });
    doc.fontSize(10).fillColor(MUTED).text(`vs ${fmt(lastVal)}`, MARGIN + 310, y, { width: 80, align: 'right' });
    if (pct != null) {
      doc.fontSize(10).fillColor(pctColor(pct, higherIsBetter)).text(fmtPct(pct), MARGIN + 400, y, { width: 95, align: 'right' });
    }
    y += 18;
  };

  // ── GSC section ───────────────────────────────────────────────────────────
  if (gsc?.available) {
    drawSection('GOOGLE SEARCH CONSOLE');
    drawMetricRow('Impressions', gsc.this_week?.impressions, gsc.last_week?.impressions, gsc.changes?.impressions_pct);
    drawMetricRow('Search Clicks', gsc.this_week?.clicks, gsc.last_week?.clicks, gsc.changes?.clicks_pct);
    const ctrThis = gsc.this_week?.ctr != null ? `${gsc.this_week.ctr}%` : null;
    const ctrLast = gsc.last_week?.ctr != null ? `${gsc.last_week.ctr}%` : null;
    drawMetricRow('Click-Through Rate', ctrThis, ctrLast, gsc.changes?.ctr_pct ?? gsc.changes?.clicks_pct);
    drawMetricRow('Avg. Position', gsc.this_week?.avg_position, gsc.last_week?.avg_position, gsc.changes?.position_pct, false);
    y += 10;
  }

  // ── GBP section ───────────────────────────────────────────────────────────
  if (gbp?.available) {
    drawSection('GOOGLE BUSINESS PROFILE');
    drawMetricRow('Views', gbp.this_week?.views, gbp.last_week?.views, gbp.changes?.views_pct);
    drawMetricRow('Phone Clicks', gbp.this_week?.calls, gbp.last_week?.calls, gbp.changes?.calls_pct);
    drawMetricRow('Website Clicks', gbp.this_week?.website_clicks, gbp.last_week?.website_clicks, gbp.changes?.website_pct);
    y += 10;
  }

  // ── GA4 section ───────────────────────────────────────────────────────────
  if (ga4?.available) {
    drawSection('GOOGLE ANALYTICS 4');
    drawMetricRow('Sessions', ga4.this_week?.sessions, ga4.last_week?.sessions, ga4.changes?.sessions_pct);
    drawMetricRow('Organic Sessions', ga4.this_week?.organic_sessions, ga4.last_week?.organic_sessions, ga4.changes?.organic_pct);
    y += 10;
  }

  // ── Facebook section ──────────────────────────────────────────────────────
  if (facebook?.available) {
    drawSection('FACEBOOK PAGE');
    drawMetricRow('Page Reach', facebook.this_week?.reach, facebook.last_week?.reach, facebook.changes?.reach_pct);
    drawMetricRow('Post Engagements', facebook.this_week?.engagements, facebook.last_week?.engagements, facebook.changes?.engagements_pct);
    y += 10;
  }

  // ── Alerts ────────────────────────────────────────────────────────────────
  if (alerts?.length > 0) {
    drawSection(`ALERTS (${alerts.length})`);
    for (const alert of alerts.slice(0, 5)) {
      if (y > 730) { doc.addPage(); y = 50; }
      doc.fontSize(11).fillColor(RED).text(`⚠  ${alert.message}`, MARGIN, y, { width: CONTENT_W });
      y += 18;
    }
    y += 10;
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  if (recommendations?.length > 0) {
    drawSection('RECOMMENDED ACTIONS');
    for (const rec of recommendations.slice(0, 6)) {
      if (y > 730) { doc.addPage(); y = 50; }
      doc.rect(MARGIN, y, 3, 14).fill(PURPLE);
      doc.fontSize(11).fillColor(TEXT).text(rec, MARGIN + 12, y, { width: CONTENT_W - 12 });
      y += 22;
    }
    y += 4;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const PAGE_H = 842;
  doc.moveTo(MARGIN, PAGE_H - 44).lineTo(W - MARGIN, PAGE_H - 44).stroke(BORDER);
  doc.fontSize(9).fillColor(MUTED).text('Powered by Pelara — See further. Act faster.', MARGIN, PAGE_H - 32, { align: 'center', width: CONTENT_W });
};

// ── Route ─────────────────────────────────────────────────────────────────────

router.get('/:reportId', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.*, c.name AS client_name
       FROM reports r
       JOIN clients c ON c.id = r.client_id
       WHERE r.id = $1 AND c.agency_id = $2`,
      [req.params.reportId, req.user.agency_id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, error: 'Report not found' });

    const row = result.rows[0];
    const safeName = (row.client_name || 'report').replace(/[^a-z0-9]/gi, '-').toLowerCase();

    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pelara-report-${safeName}.pdf"`);

    doc.pipe(res);
    generatePDF(row, doc);
    doc.end();

    logger.info('PDF report generated', { reportId: req.params.reportId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
