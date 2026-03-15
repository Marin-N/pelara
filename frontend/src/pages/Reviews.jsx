import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const channelBadge = (channel) => {
  const map = { email: { bg: '#1a237e', color: '#90caf9', label: 'Email' }, sms: { bg: '#1b5e20', color: '#a5d6a7', label: 'SMS' } };
  const c = map[channel] || { bg: '#2a2a2e', color: '#888', label: channel || '—' };
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{c.label}</span>;
};

const statusBadge = (status) => {
  const map = {
    sent: { bg: '#1b5e20', color: '#a5d6a7', label: 'Sent' },
    pending: { bg: '#332900', color: '#fbbf24', label: 'Pending' },
    failed: { bg: '#3b0a0a', color: '#ef4444', label: 'Failed' },
    review_received: { bg: '#4a1d6e', color: '#c084fc', label: 'Reviewed ⭐' },
  };
  const c = map[status] || { bg: '#2a2a2e', color: '#888', label: status || '—' };
  return <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{c.label}</span>;
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666' },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 },
  statCard: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '18px 20px' },
  statLabel: { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 },
  statVal: (color) => ({ fontSize: 28, fontWeight: 800, color: color || '#fff' }),
  section: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '22px 24px', marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  input: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none' },
  sendBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  msg: (ok) => ({ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 14, background: ok ? '#14532d' : '#3b0a0a', color: ok ? '#22c55e' : '#ef4444' }),
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #2a2a2e' },
  td: { padding: '12px 12px', color: '#ccc', fontSize: 13, borderBottom: '1px solid #1e1e24', verticalAlign: 'middle' },
  receivedBtn: { background: 'transparent', border: '1px solid #6c63ff44', color: '#6c63ff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 48, textAlign: 'center', color: '#555', fontSize: 14 },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reviews() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [token, setToken] = useState('');
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', channel: 'email' });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    getAccessTokenSilently().then(setToken);
  }, [getAccessTokenSilently]);

  const fetchData = useCallback(async () => {
    if (!selectedId || !token) return;
    setLoading(true);
    try {
      const [statsRes, reqRes] = await Promise.all([
        api.get(`/api/reviews/${selectedId}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/api/reviews/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats(statsRes.data.data);
      setRequests(reqRes.data.data || []);
    } catch { setRequests([]); }
    setLoading(false);
  }, [selectedId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      const res = await api.post(`/api/reviews/${selectedId}`, form, { headers: { Authorization: `Bearer ${token}` } });
      const status = res.data.data?.status;
      if (status === 'sent') {
        setMsg({ text: `Review request sent successfully via ${form.channel}!`, ok: true });
      } else if (status === 'pending') {
        setMsg({ text: `Request saved. ${form.channel === 'email' ? 'Add RESEND_API_KEY' : 'Add TWILIO credentials'} to enable sending.`, ok: false });
      } else {
        setMsg({ text: 'Request saved but delivery failed. Check your API keys.', ok: false });
      }
      setForm({ customer_name: '', customer_email: '', customer_phone: '', channel: form.channel });
      fetchData();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to send request', ok: false });
    }
    setSending(false);
    setTimeout(() => setMsg(null), 6000);
  };

  const handleMarkReceived = async (requestId) => {
    try {
      await api.put(`/api/reviews/${selectedId}/${requestId}/received`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Reviews</div>
          <div style={s.sub}>Send review requests and track responses</div>
        </div>
        {clients.length > 1 && (
          <select style={s.select} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setRequests([]); setStats(null); }}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Stats */}
      <div style={s.statsGrid}>
        <div style={s.statCard}>
          <div style={s.statLabel}>Total Requests</div>
          <div style={s.statVal()}>{stats?.total_sent ?? '—'}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Delivered</div>
          <div style={s.statVal()}>{stats?.delivered ?? '—'}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Reviews Received</div>
          <div style={s.statVal('#22c55e')}>{stats?.reviews_received ?? '—'}</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statLabel}>Sent This Week</div>
          <div style={s.statVal()}>{stats?.sent_this_week ?? '—'}</div>
        </div>
      </div>

      {/* Send form */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Send Review Request</div>
        {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}
        <form onSubmit={handleSend}>
          <div style={s.formGrid}>
            <div>
              <label style={s.label}>Customer Name *</label>
              <input style={s.input} value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} placeholder="John Smith" required />
            </div>
            <div>
              <label style={s.label}>Channel</label>
              <select style={{ ...s.input, cursor: 'pointer' }} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            {form.channel === 'email' && (
              <div>
                <label style={s.label}>Email Address *</label>
                <input style={s.input} type="email" value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} placeholder="john@example.com" required />
              </div>
            )}
            {form.channel === 'sms' && (
              <div>
                <label style={s.label}>Phone Number *</label>
                <input style={s.input} type="tel" value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} placeholder="+447911123456" required />
              </div>
            )}
          </div>
          <button type="submit" style={s.sendBtn} disabled={sending}>
            {sending ? 'Sending...' : '⭐ Send Review Request'}
          </button>
        </form>
      </div>

      {/* Request history */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Request History</div>
        {loading && <div style={{ color: '#555', fontSize: 14 }}>Loading...</div>}
        {!loading && requests.length === 0 && (
          <div style={{ color: '#555', fontSize: 14, padding: '16px 0' }}>No review requests sent yet. Send your first one above.</div>
        )}
        {!loading && requests.length > 0 && (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Customer</th>
                <th style={s.th}>Contact</th>
                <th style={s.th}>Channel</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Sent</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td style={s.td}>{r.customer_name || '—'}</td>
                  <td style={{ ...s.td, color: '#777', fontSize: 12 }}>
                    {r.customer_email || r.customer_phone || '—'}
                  </td>
                  <td style={s.td}>{channelBadge(r.channel)}</td>
                  <td style={s.td}>{statusBadge(r.status)}</td>
                  <td style={{ ...s.td, color: '#555', fontSize: 12 }}>{fmtDate(r.sent_at)}</td>
                  <td style={s.td}>
                    {r.status !== 'review_received' && (
                      <button style={s.receivedBtn} onClick={() => handleMarkReceived(r.id)}>
                        Mark received
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
