import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import MetricCard from '../components/Dashboard/MetricCard.jsx';
import MetricChart from '../components/Dashboard/MetricChart.jsx';
import EmptyState from '../components/Common/EmptyState.jsx';
import api from '../services/api.js';
import { calcChange } from '../utils/chartHelpers.js';

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  sub: { color: '#888', fontSize: 14, marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12, marginTop: 28 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 },
  chartGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 },
  syncBtn: { background: 'none', border: '1px solid #6c63ff', color: '#6c63ff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  syncBtnLoading: { opacity: 0.5, cursor: 'not-allowed' },
  noData: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '24px', textAlign: 'center', color: '#555', fontSize: 13 },
  clientSelect: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  syncMsg: { background: '#1a1a2e', border: '1px solid #6c63ff33', color: '#a5a0ff', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
  connectionDots: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  dot: (on) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: on ? '#22c55e' : '#555' }),
};

const sumTotal = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
const halfTrend = (rows, key) => {
  const mid = Math.floor(rows.length / 2);
  return calcChange(
    sumTotal(rows.slice(mid), key),
    sumTotal(rows.slice(0, mid), key)
  );
};

export default function Dashboard() {
  const [params] = useSearchParams();
  const clientId = params.get('client');
  const { clients, loading: clientsLoading } = useClients();
  const { getAccessTokenSilently } = useAuth0();

  const [selectedId, setSelectedId] = useState(clientId || '');
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    if (clientId) setSelectedId(clientId);
  }, [clientId]);

  const fetchMetrics = useCallback(async () => {
    if (!selectedId) return;
    setMetricsLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/metrics/${selectedId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMetrics(res.data.data);
    } catch {
      setMetrics(null);
    } finally {
      setMetricsLoading(false);
    }
  }, [selectedId, getAccessTokenSilently]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleSync = async () => {
    if (!selectedId || syncing) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post(`/api/metrics/${selectedId}/sync`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = res.data.data;
      const parts = [];
      if (d.gbp != null && !String(d.gbp).startsWith('error')) parts.push(`GBP: ${d.gbp}d`);
      if (d.ga4 != null && !String(d.ga4).startsWith('error')) parts.push(`GA4: ${d.ga4}d`);
      if (d.gsc != null && !String(d.gsc).startsWith('error')) parts.push(`GSC: ${d.gsc}d`);
      setSyncMsg(parts.length ? `Synced — ${parts.join(', ')}` : 'Sync complete');
      await fetchMetrics();
    } catch (err) {
      setSyncMsg(err.response?.data?.error || 'Sync failed — check Google is connected');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 6000);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId);
  const gbp = metrics?.gbp || [];
  const ga4 = metrics?.ga4 || [];
  const gsc = metrics?.gsc || [];
  const clientInfo = metrics?.client || {};

  const gbpChartData = gbp.map((r) => ({
    date: r.date,
    views: (r.views_search || 0) + (r.views_maps || 0),
    calls: r.clicks_phone || 0,
    website: r.clicks_website || 0,
  }));

  const ga4ChartData = ga4.map((r) => ({
    date: r.date,
    sessions: r.sessions || 0,
    organic: r.organic_sessions || 0,
  }));

  const gscChartData = gsc.map((r) => ({
    date: r.date,
    impressions: r.impressions || 0,
    clicks: r.clicks || 0,
  }));

  const avgPosition = gsc.length
    ? (gsc.reduce((s, r) => s + (Number(r.average_position) || 0), 0) / gsc.length).toFixed(1)
    : 0;

  if (!clientsLoading && !clients.length) {
    return <EmptyState title="No clients yet" message="Go to Clients to add your first client." />;
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>{selectedClient?.name || 'Dashboard'}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clients.length > 1 && (
            <select style={styles.clientSelect} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            style={{ ...styles.syncBtn, ...(syncing ? styles.syncBtnLoading : {}) }}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : '↻ Sync Now'}
          </button>
        </div>
      </div>

      {selectedClient && (
        <div style={styles.sub}>
          {selectedClient.city ? `${selectedClient.city} · ` : ''}
          {selectedClient.business_type || 'Local Business'}
        </div>
      )}

      {/* Connection status indicators */}
      {metrics && (
        <div style={styles.connectionDots}>
          <span style={styles.dot(clientInfo.has_google_connected)}>
            {clientInfo.has_google_connected ? '●' : '○'} Google Auth
          </span>
          <span style={styles.dot(clientInfo.has_gbp)}>
            {clientInfo.has_gbp ? '●' : '○'} GBP
          </span>
          <span style={styles.dot(clientInfo.has_ga4)}>
            {clientInfo.has_ga4 ? '●' : '○'} GA4
          </span>
          <span style={styles.dot(clientInfo.has_gsc)}>
            {clientInfo.has_gsc ? '●' : '○'} Search Console
          </span>
        </div>
      )}

      {syncMsg && <div style={styles.syncMsg}>{syncMsg}</div>}

      {metricsLoading && <div style={styles.noData}>Loading metrics...</div>}

      {!metricsLoading && (
        <>
          {/* ── GBP Section ────────────────────────────────── */}
          {gbp.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Business Profile</div>
              <div style={styles.grid}>
                <MetricCard label="GBP Views (30d)" value={sumTotal(gbp, 'views_search') + sumTotal(gbp, 'views_maps')} change={halfTrend(gbp, 'views_search')} />
                <MetricCard label="Website Clicks" value={sumTotal(gbp, 'clicks_website')} change={halfTrend(gbp, 'clicks_website')} />
                <MetricCard label="Direction Requests" value={sumTotal(gbp, 'clicks_directions')} change={halfTrend(gbp, 'clicks_directions')} />
                <MetricCard label="Phone Clicks" value={sumTotal(gbp, 'clicks_phone')} change={halfTrend(gbp, 'clicks_phone')} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={gbpChartData} dataKey="views" label="GBP Views — last 30 days" color="#6c63ff" />
                <MetricChart data={gbpChartData} dataKey="calls" label="Phone Clicks — last 30 days" color="#22c55e" />
              </div>
            </>
          ) : clientInfo.has_gbp ? (
            <>
              <div style={styles.sectionTitle}>Google Business Profile</div>
              <div style={styles.noData}>No GBP data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* ── GA4 Section ────────────────────────────────── */}
          {ga4.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Analytics 4</div>
              <div style={styles.grid}>
                <MetricCard label="Sessions (30d)" value={sumTotal(ga4, 'sessions')} change={halfTrend(ga4, 'sessions')} />
                <MetricCard label="Users" value={sumTotal(ga4, 'users')} change={halfTrend(ga4, 'users')} />
                <MetricCard label="Organic Sessions" value={sumTotal(ga4, 'organic_sessions')} change={halfTrend(ga4, 'organic_sessions')} />
                <MetricCard label="Direct Sessions" value={sumTotal(ga4, 'direct_sessions')} change={halfTrend(ga4, 'direct_sessions')} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={ga4ChartData} dataKey="sessions" label="Sessions — last 30 days" color="#f59e0b" />
                <MetricChart data={ga4ChartData} dataKey="organic" label="Organic Sessions — last 30 days" color="#06b6d4" />
              </div>
            </>
          ) : clientInfo.has_ga4 ? (
            <>
              <div style={styles.sectionTitle}>Google Analytics 4</div>
              <div style={styles.noData}>No GA4 data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* ── GSC Section ────────────────────────────────── */}
          {gsc.length > 0 ? (
            <>
              <div style={styles.sectionTitle}>Google Search Console</div>
              <div style={styles.grid}>
                <MetricCard label="Impressions (30d)" value={sumTotal(gsc, 'impressions')} change={halfTrend(gsc, 'impressions')} />
                <MetricCard label="Search Clicks" value={sumTotal(gsc, 'clicks')} change={halfTrend(gsc, 'clicks')} />
                <MetricCard label="Avg. Position" value={avgPosition} change={null} />
                <MetricCard label="Click-Through Rate" value={`${(sumTotal(gsc, 'clicks') / Math.max(sumTotal(gsc, 'impressions'), 1) * 100).toFixed(1)}%`} change={null} />
              </div>
              <div style={styles.chartGrid}>
                <MetricChart data={gscChartData} dataKey="impressions" label="Impressions — last 30 days" color="#ec4899" />
                <MetricChart data={gscChartData} dataKey="clicks" label="Search Clicks — last 30 days" color="#8b5cf6" />
              </div>
            </>
          ) : clientInfo.has_gsc ? (
            <>
              <div style={styles.sectionTitle}>Google Search Console</div>
              <div style={styles.noData}>No GSC data yet — click "Sync Now" to fetch</div>
            </>
          ) : null}

          {/* No data at all */}
          {!gbp.length && !ga4.length && !gsc.length && !clientInfo.has_gbp && !clientInfo.has_ga4 && !clientInfo.has_gsc && (
            <div style={styles.noData}>
              {clientInfo.has_google_connected
                ? 'Add GA4 Property ID, GSC Site URL, or GBP Location ID to this client to start seeing metrics'
                : 'Connect Google on the Clients page, then set up GBP, GA4, and GSC IDs to start seeing metrics here'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
