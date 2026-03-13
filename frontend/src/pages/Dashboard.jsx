import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import MetricCard from '../components/Dashboard/MetricCard.jsx';
import MetricChart from '../components/Dashboard/MetricChart.jsx';
import AlertBanner from '../components/Dashboard/AlertBanner.jsx';
import EmptyState from '../components/Common/EmptyState.jsx';
import api from '../services/api.js';
import { calcChange } from '../utils/chartHelpers.js';

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  sub: { color: '#888', fontSize: 14, marginBottom: 28 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 },
  syncBtn: { background: 'none', border: '1px solid #6c63ff', color: '#6c63ff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  syncBtnLoading: { opacity: 0.5, cursor: 'not-allowed' },
  noData: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '32px', textAlign: 'center', color: '#555', fontSize: 14 },
  clientSelect: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
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

  // Once clients load, default to first client if none selected
  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  // Update from URL param when navigating from client card
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
    } catch (err) {
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
      setSyncMsg(`Synced ${res.data.data?.days || 0} days of data`);
      await fetchMetrics();
    } catch (err) {
      setSyncMsg(err.response?.data?.error || 'Sync failed — check Google is connected');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 5000);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedId);
  const gbp = metrics?.gbp || [];

  // Compute 30-day totals and compare to previous 15 days for trend
  const total = (key) => gbp.reduce((s, r) => s + (r[key] || 0), 0);
  const recentHalf = gbp.slice(Math.floor(gbp.length / 2));
  const olderHalf = gbp.slice(0, Math.floor(gbp.length / 2));
  const halfTotal = (key, arr) => arr.reduce((s, r) => s + (r[key] || 0), 0);
  const trend = (key) => calcChange(halfTotal(key, recentHalf), halfTotal(key, olderHalf));

  const chartData = gbp.map((r) => ({
    date: r.date,
    views: (r.views_search || 0) + (r.views_maps || 0),
    calls: r.clicks_phone || 0,
    website: r.clicks_website || 0,
  }));

  if (!clientsLoading && !clients.length) {
    return <EmptyState title="No clients yet" message="Go to Clients to add your first client." />;
  }

  return (
    <div>
      <div style={styles.header}>
        <div style={styles.title}>
          {selectedClient?.name || 'Dashboard'}
        </div>
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
          {selectedClient.has_google_connected
            ? <span style={{ color: '#22c55e', marginLeft: 8 }}>● Google connected</span>
            : <span style={{ color: '#888', marginLeft: 8 }}>○ Google not connected</span>}
        </div>
      )}

      {syncMsg && (
        <div style={{ background: '#1a1a2e', border: '1px solid #6c63ff33', color: '#a5a0ff', padding: '8px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {syncMsg}
        </div>
      )}

      {gbp.length > 0 ? (
        <>
          <div style={styles.grid}>
            <MetricCard label="GBP Views (30d)" value={total('views_search') + total('views_maps')} change={trend('views_search')} />
            <MetricCard label="Website Clicks" value={total('clicks_website')} change={trend('clicks_website')} />
            <MetricCard label="Direction Requests" value={total('clicks_directions')} change={trend('clicks_directions')} />
            <MetricCard label="Phone Clicks" value={total('clicks_phone')} change={trend('clicks_phone')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <MetricChart data={chartData} dataKey="views" label="GBP Views — last 30 days" color="#6c63ff" />
            <MetricChart data={chartData} dataKey="calls" label="Phone Clicks — last 30 days" color="#22c55e" />
          </div>
        </>
      ) : (
        <div style={styles.noData}>
          {metricsLoading ? 'Loading metrics...' : (
            selectedClient?.has_google_connected
              ? 'No GBP data yet — click "Sync Now" to fetch the last 30 days'
              : 'Connect Google on the Clients page to start seeing metrics here'
          )}
        </div>
      )}
    </div>
  );
}
