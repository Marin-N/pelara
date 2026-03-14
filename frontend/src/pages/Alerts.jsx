import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';

const getSeverity = (type = '') => {
  if (type.endsWith('_red')) return 'red';
  if (type.endsWith('_orange')) return 'orange';
  return 'yellow';
};

const SEV_COLOR = { red: '#ef4444', orange: '#f97316', yellow: '#eab308' };
const SEV_LABEL = { red: 'Critical', orange: 'Warning', yellow: 'Notice' };

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  row: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, marginBottom: 8 },
  dot: (sev) => ({ width: 8, height: 8, borderRadius: '50%', background: SEV_COLOR[sev], flexShrink: 0, marginTop: 5 }),
  msg: { fontSize: 14, color: '#ccc', flex: 1 },
  meta: { fontSize: 12, color: '#555', marginTop: 4 },
  badge: (sev) => ({ fontSize: 11, fontWeight: 600, color: SEV_COLOR[sev], background: `${SEV_COLOR[sev]}18`, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginRight: 8 }),
  dismissBtn: { background: 'none', border: 'none', color: '#444', fontSize: 18, cursor: 'pointer', flexShrink: 0 },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#555', fontSize: 14 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: (active) => ({ background: active ? '#6c63ff' : 'none', border: `1px solid ${active ? '#6c63ff' : '#333'}`, color: active ? '#fff' : '#888', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }),
  checkBtn: { background: 'none', border: '1px solid #6c63ff33', color: '#6c63ff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  checking: { opacity: 0.5 },
};

const formatDate = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function Alerts() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRead, setShowRead] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  const fetchAlerts = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get(`/api/alerts/${selectedId}?includeRead=${showRead}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(res.data.data || []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId, showRead, getAccessTokenSilently]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleDismiss = async (alertId) => {
    try {
      const token = await getAccessTokenSilently();
      await api.put(`/api/alerts/${alertId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAlerts((prev) => showRead ? prev.map((a) => a.id === alertId ? { ...a, is_read: true } : a) : prev.filter((a) => a.id !== alertId));
    } catch { /* silent */ }
  };

  const handleDismissAll = async () => {
    try {
      const token = await getAccessTokenSilently();
      await api.put(`/api/alerts/${selectedId}/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchAlerts();
    } catch { /* silent */ }
  };

  const handleCheckNow = async () => {
    if (!selectedId || checking) return;
    setChecking(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post(`/api/alerts/${selectedId}/check`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const n = res.data.data.new_alerts;
      alert(`Check complete — ${n} new alert${n !== 1 ? 's' : ''} created`);
      fetchAlerts();
    } catch (err) {
      alert(err.response?.data?.error || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const unread = alerts.filter((a) => !a.is_read);

  return (
    <div>
      <div style={styles.header}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
          Alerts
          {unread.length > 0 && (
            <span style={{ fontSize: 14, fontWeight: 400, color: '#ef4444', marginLeft: 12 }}>
              {unread.length} unread
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {clients.length > 1 && (
            <select style={styles.select} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button
            style={{ ...styles.checkBtn, ...(checking ? styles.checking : {}) }}
            onClick={handleCheckNow}
            disabled={checking}
          >
            {checking ? 'Checking...' : '▶ Check Now'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={styles.tabs}>
          <button style={styles.tab(!showRead)} onClick={() => setShowRead(false)}>Unread</button>
          <button style={styles.tab(showRead)} onClick={() => setShowRead(true)}>All alerts</button>
        </div>
        {unread.length > 0 && !showRead && (
          <button onClick={handleDismissAll} style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer' }}>
            Mark all read
          </button>
        )}
      </div>

      {loading && <div style={styles.emptyBox}>Loading alerts...</div>}

      {!loading && !alerts.length && (
        <div style={styles.emptyBox}>
          {showRead ? 'No alerts recorded yet for this client.' : 'No unread alerts — all clear.'}
        </div>
      )}

      {!loading && alerts.map((alert) => {
        const sev = getSeverity(alert.type);
        return (
          <div key={alert.id} style={{ ...styles.row, opacity: alert.is_read ? 0.5 : 1 }}>
            <div style={styles.dot(sev)} />
            <div style={{ flex: 1 }}>
              <span style={styles.badge(sev)}>{SEV_LABEL[sev]}</span>
              <span style={styles.msg}>{alert.message}</span>
              <div style={styles.meta}>{formatDate(alert.created_at)}</div>
            </div>
            {!alert.is_read && (
              <button style={styles.dismissBtn} onClick={() => handleDismiss(alert.id)} title="Mark read">×</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
