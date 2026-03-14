import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';
import { formatAxisDate } from '../utils/chartHelpers.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('en-GB'));
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const PctBadge = ({ pct, higherIsBetter = true }) => {
  if (pct === null || pct === undefined) return <span style={{ color: '#555', fontSize: 12 }}>—</span>;
  const good = higherIsBetter ? pct >= 0 : pct <= 0;
  const color = good ? '#22c55e' : '#ef4444';
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color }}>
      {pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  genBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  genBtnLoading: { opacity: 0.6, cursor: 'not-allowed' },
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.15s' },
  cardActive: { borderColor: '#6c63ff' },
  period: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 },
  summary: { fontSize: 13, color: '#a5a0ff', marginBottom: 10 },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { fontSize: 11, padding: '3px 8px', borderRadius: 20, background: '#111', border: '1px solid #2a2a2e', color: '#888' },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 48, textAlign: 'center', color: '#555', fontSize: 14 },
  // Detail panel
  detail: { background: '#111', border: '1px solid #6c63ff22', borderRadius: 12, padding: '28px 28px', marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16, marginTop: 28, paddingBottom: 8, borderBottom: '1px solid #2a2a2e' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
  metricBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, padding: '14px 16px' },
  metricLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 },
  metricVal: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  chartBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, padding: '16px 14px', marginBottom: 12 },
  chartLabel: { fontSize: 12, color: '#666', marginBottom: 12 },
  rec: { fontSize: 13, color: '#aaa', padding: '8px 0 8px 14px', borderLeft: '2px solid #6c63ff', marginBottom: 8 },
  alertRow: { fontSize: 13, color: '#fca5a5', padding: '6px 0', borderBottom: '1px solid #2a2a2e' },
};

// ── MetricBox component ───────────────────────────────────────────────────────

const MetricBox = ({ label, thisVal, lastVal, pct, higherIsBetter = true }) => (
  <div style={s.metricBox}>
    <div style={s.metricLabel}>{label}</div>
    <div style={s.metricVal}>{fmt(thisVal)}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <PctBadge pct={pct} higherIsBetter={higherIsBetter} />
      <span style={{ fontSize: 11, color: '#444' }}>vs {fmt(lastVal)}</span>
    </div>
  </div>
);

// ── ComparisonChart ───────────────────────────────────────────────────────────

const ComparisonChart = ({ data, dataKey, label, color }) => {
  if (!data?.length) return null;
  return (
    <div style={s.chartBox}>
      <div style={s.chartLabel}>{label}</div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 2, right: 8, bottom: 2, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
          <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 10, fill: '#555' }} />
          <YAxis tick={{ fontSize: 10, fill: '#555' }} />
          <Tooltip
            contentStyle={{ background: '#1e1e22', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
            labelFormatter={formatAxisDate}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ── ReportDetail ──────────────────────────────────────────────────────────────

const ReportDetail = ({ report }) => {
  const data = typeof report.data === 'string' ? JSON.parse(report.data) : report.data;
  const { gsc, gbp, ga4, facebook, alerts, recommendations } = data;

  return (
    <div style={s.detail}>
      <div style={{ fontSize: 13, color: '#a5a0ff', marginBottom: 4 }}>{data.summary}</div>
      <div style={{ fontSize: 12, color: '#555' }}>
        {fmtShort(data.period.start)} – {fmtDate(data.period.end)}
      </div>

      {/* GSC */}
      {gsc?.available && (
        <>
          <div style={s.sectionTitle}>🔍 Google Search Console</div>
          <div style={s.metricsGrid}>
            <MetricBox label="Impressions" thisVal={gsc.this_week.impressions} lastVal={gsc.last_week.impressions} pct={gsc.changes.impressions_pct} />
            <MetricBox label="Clicks" thisVal={gsc.this_week.clicks} lastVal={gsc.last_week.clicks} pct={gsc.changes.clicks_pct} />
            <MetricBox label="CTR" thisVal={gsc.this_week.ctr != null ? `${gsc.this_week.ctr}%` : null} lastVal={gsc.last_week.ctr != null ? `${gsc.last_week.ctr}%` : null} pct={gsc.changes.ctr_pct ?? gsc.changes.clicks_pct} />
            <MetricBox label="Avg. Position" thisVal={gsc.this_week.avg_position} lastVal={gsc.last_week.avg_position} pct={gsc.changes.position_pct} higherIsBetter={false} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ComparisonChart data={gsc.daily} dataKey="impressions" label="Impressions this week" color="#6c63ff" />
            <ComparisonChart data={gsc.daily} dataKey="clicks" label="Clicks this week" color="#22c55e" />
          </div>
        </>
      )}

      {/* GBP */}
      {gbp?.available && (
        <>
          <div style={s.sectionTitle}>📍 Google Business Profile</div>
          <div style={s.metricsGrid}>
            <MetricBox label="Views" thisVal={gbp.this_week.views} lastVal={gbp.last_week.views} pct={gbp.changes.views_pct} />
            <MetricBox label="Phone Clicks" thisVal={gbp.this_week.calls} lastVal={gbp.last_week.calls} pct={gbp.changes.calls_pct} />
            <MetricBox label="Website Clicks" thisVal={gbp.this_week.website_clicks} lastVal={gbp.last_week.website_clicks} pct={gbp.changes.website_pct} />
            <MetricBox label="Directions" thisVal={gbp.this_week.directions} lastVal={gbp.last_week.directions} pct={null} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ComparisonChart data={gbp.daily} dataKey="views" label="GBP Views this week" color="#f59e0b" />
            <ComparisonChart data={gbp.daily} dataKey="calls" label="Phone Clicks this week" color="#22c55e" />
          </div>
        </>
      )}

      {/* GA4 */}
      {ga4?.available && (
        <>
          <div style={s.sectionTitle}>📊 Google Analytics 4</div>
          <div style={s.metricsGrid}>
            <MetricBox label="Sessions" thisVal={ga4.this_week.sessions} lastVal={ga4.last_week.sessions} pct={ga4.changes.sessions_pct} />
            <MetricBox label="Organic Sessions" thisVal={ga4.this_week.organic_sessions} lastVal={ga4.last_week.organic_sessions} pct={ga4.changes.organic_pct} />
            <MetricBox label="Users" thisVal={ga4.this_week.users} lastVal={ga4.last_week.users} pct={null} />
          </div>
          <ComparisonChart data={ga4.daily} dataKey="sessions" label="Sessions this week" color="#06b6d4" />
        </>
      )}

      {/* Facebook */}
      {facebook?.available && (
        <>
          <div style={s.sectionTitle}>📱 Facebook Page</div>
          <div style={s.metricsGrid}>
            <MetricBox label="Page Reach" thisVal={facebook.this_week.reach} lastVal={facebook.last_week.reach} pct={facebook.changes.reach_pct} />
            <MetricBox label="Engagements" thisVal={facebook.this_week.engagements} lastVal={facebook.last_week.engagements} pct={facebook.changes.engagements_pct} />
            <MetricBox label="New Followers" thisVal={facebook.this_week.new_followers} lastVal={facebook.last_week.new_followers} pct={null} />
          </div>
        </>
      )}

      {/* Alerts */}
      {alerts?.length > 0 && (
        <>
          <div style={s.sectionTitle}>⚠ Alerts this week ({alerts.length})</div>
          {alerts.map((a, i) => <div key={i} style={s.alertRow}>{a.message}</div>)}
        </>
      )}

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <>
          <div style={s.sectionTitle}>💡 Actions for this week</div>
          {recommendations.map((r, i) => <div key={i} style={s.rec}>{r}</div>)}
        </>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [fullReports, setFullReports] = useState({}); // cache full report data by id
  const [genMsg, setGenMsg] = useState('');

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  const fetchReports = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/reports/${selectedId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data.data || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, getAccessTokenSilently]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Toggle report open — lazy-load full data on first open
  const handleToggle = async (reportId) => {
    if (openId === reportId) { setOpenId(null); return; }
    setOpenId(reportId);
    if (fullReports[reportId]) return; // already cached

    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/reports/${selectedId}/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullReports((prev) => ({ ...prev, [reportId]: res.data.data }));
    } catch { /* show partial data from list */ }
  };

  const handleGenerate = async () => {
    if (!selectedId || generating) return;
    setGenerating(true);
    setGenMsg('');
    try {
      const token = await getAccessTokenSilently();
      await api.post(`/api/reports/${selectedId}/generate?email=false`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGenMsg('Report generated successfully');
      await fetchReports();
      setTimeout(() => setGenMsg(''), 4000);
    } catch (err) {
      setGenMsg(err.response?.data?.error || 'Failed to generate report — need at least 14 days of metric data');
      setTimeout(() => setGenMsg(''), 6000);
    } finally {
      setGenerating(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId);

  return (
    <div>
      <div style={s.header}>
        <div style={s.title}>
          Reports
          {reports.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#555', marginLeft: 12 }}>
              {reports.length} report{reports.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clients.length > 1 && (
            <select style={s.select} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setOpenId(null); }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            style={{ ...s.genBtn, ...(generating ? s.genBtnLoading : {}) }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : '+ Generate Report'}
          </button>
        </div>
      </div>

      {genMsg && (
        <div style={{
          background: genMsg.includes('success') ? '#14532d' : '#3b0a0a',
          border: `1px solid ${genMsg.includes('success') ? '#22c55e33' : '#ef444433'}`,
          color: genMsg.includes('success') ? '#22c55e' : '#ef4444',
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
        }}>
          {genMsg}
        </div>
      )}

      {loading && <div style={s.emptyBox}>Loading reports...</div>}

      {!loading && !reports.length && (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No reports yet</div>
          <div>Reports generate automatically every Monday. Click "Generate Report" to create one now.</div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Requires at least 14 days of metric data for meaningful week-over-week comparison.</div>
        </div>
      )}

      {!loading && reports.map((report) => {
        const isOpen = openId === report.id;
        const fullData = fullReports[report.id];
        const alertCount = Number(report.alert_count) || 0;

        return (
          <div key={report.id}>
            <div
              style={{
                ...s.card,
                ...(isOpen ? s.cardActive : {}),
              }}
              onMouseOver={(e) => { if (!isOpen) e.currentTarget.style.borderColor = '#6c63ff88'; }}
              onMouseOut={(e) => { if (!isOpen) e.currentTarget.style.borderColor = '#2a2a2e'; }}
              onClick={() => handleToggle(report.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={s.period}>
                    {fmtShort(report.period_start)} – {fmtDate(report.period_end)}
                  </div>
                  <div style={s.summary}>{report.summary || 'Weekly metrics report'}</div>
                  <div style={s.chips}>
                    <span style={s.chip}>{report.report_type}</span>
                    {alertCount > 0 && (
                      <span style={{ ...s.chip, background: '#3b0a0a', border: '1px solid #ef444422', color: '#ef4444' }}>
                        {alertCount} alert{alertCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {report.email_sent_at && (
                      <span style={{ ...s.chip, color: '#22c55e', border: '1px solid #22c55e22' }}>
                        ✓ Emailed
                      </span>
                    )}
                    <span style={{ ...s.chip, marginLeft: 'auto' }}>
                      {new Date(report.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div style={{ color: '#555', fontSize: 18, marginLeft: 16, marginTop: 2 }}>
                  {isOpen ? '▲' : '▼'}
                </div>
              </div>
            </div>

            {isOpen && fullData && <ReportDetail report={fullData} />}
            {isOpen && !fullData && (
              <div style={{ ...s.detail, textAlign: 'center', color: '#555', fontSize: 13 }}>
                Loading report data...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
