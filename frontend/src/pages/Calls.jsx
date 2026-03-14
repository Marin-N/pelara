import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDuration = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtPhone = (p) => p && p !== 'unknown' ? p : 'Private';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666', marginBottom: 28 },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  statCard: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, padding: '16px 18px' },
  statLabel: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 },
  statVal: { fontSize: 28, fontWeight: 700, color: '#fff' },
  statSub: { fontSize: 12, color: '#555', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 },
  numbersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 28 },
  numberCard: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 10, padding: '16px 18px' },
  numberPhone: { fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'monospace', marginBottom: 4 },
  numberMeta: { fontSize: 12, color: '#666', marginBottom: 10 },
  channelChip: { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#6c63ff22', border: '1px solid #6c63ff44', color: '#a5a0ff', display: 'inline-block', marginBottom: 10 },
  releaseBtn: { background: 'transparent', border: '1px solid #ef444433', color: '#ef4444', fontSize: 11, padding: '3px 10px', borderRadius: 6, cursor: 'pointer' },
  addBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  addCard: { background: '#18181c', border: '1px dashed #333', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', textAlign: 'center', color: '#555', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #2a2a2e' },
  td: { padding: '10px 12px', fontSize: 13, color: '#aaa', borderBottom: '1px solid #1a1a1e' },
  statusDot: (s) => {
    const c = { completed: '#22c55e', 'in-progress': '#6c63ff', 'no-answer': '#ef4444', busy: '#f59e0b', failed: '#ef4444', canceled: '#555' };
    return { display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c[s] || '#555', marginRight: 6 };
  },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 48, textAlign: 'center', color: '#555', fontSize: 14 },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 14, padding: '28px 28px', width: 440, maxWidth: '90vw' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  input: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 14 },
  row: { display: 'flex', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { flex: 2, background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  searchResultItem: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', marginBottom: 6, fontSize: 13, color: '#aaa' },
  msg: (ok) => ({ fontSize: 12, padding: '6px 10px', borderRadius: 6, marginBottom: 12, background: ok ? '#14532d' : '#3b0a0a', color: ok ? '#22c55e' : '#ef4444' }),
  notConfigured: { background: '#1a1a2e', border: '1px solid #6c63ff22', borderRadius: 12, padding: '32px 24px', textAlign: 'center', marginBottom: 24 },
};

// ── Add number modal ──────────────────────────────────────────────────────────

const AddNumberModal = ({ clientId, token, onClose, onAdded }) => {
  const [step, setStep] = useState('form'); // form | results | confirm
  const [form, setForm] = useState({ country: 'GB', areaCode: '', channel: 'gbp', friendlyName: '', forwardTo: '' });
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [msg, setMsg] = useState(null);

  const search = async () => {
    setSearching(true);
    setMsg(null);
    try {
      const url = `/api/calls/${clientId}/search-numbers?country=${form.country}${form.areaCode ? `&areaCode=${form.areaCode}` : ''}`;
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setResults(res.data.data || []);
      if (!res.data.data.length) setMsg({ text: 'No numbers found for that area. Try a different area code.', ok: false });
      else setStep('results');
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Search failed', ok: false });
    }
    setSearching(false);
  };

  const purchase = async () => {
    if (!selected) return;
    if (!form.forwardTo) { setMsg({ text: 'Forward-to number is required', ok: false }); return; }
    setPurchasing(true);
    try {
      await api.post(`/api/calls/${clientId}/numbers`, {
        phoneNumber: selected.phoneNumber,
        channel: form.channel,
        friendlyName: form.friendlyName || `${form.channel} tracker`,
        forwardTo: form.forwardTo,
      }, { headers: { Authorization: `Bearer ${token}` } });
      onAdded();
      onClose();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Purchase failed', ok: false });
      setPurchasing(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalTitle}>Add tracking number</div>
        {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}

        {step === 'form' && (
          <>
            <label style={s.label}>Channel</label>
            <select style={{ ...s.input, cursor: 'pointer' }} value={form.channel} onChange={(e) => setForm(f => ({ ...f, channel: e.target.value }))}>
              <option value="gbp">Google Business Profile listing</option>
              <option value="website">Website</option>
              <option value="ads">Google Ads</option>
              <option value="social">Social media</option>
              <option value="general">General</option>
            </select>
            <label style={s.label}>Country</label>
            <select style={{ ...s.input, cursor: 'pointer' }} value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}>
              <option value="GB">United Kingdom</option>
              <option value="US">United States</option>
              <option value="IE">Ireland</option>
              <option value="AU">Australia</option>
            </select>
            <label style={s.label}>Area code (optional)</label>
            <input style={s.input} value={form.areaCode} onChange={(e) => setForm(f => ({ ...f, areaCode: e.target.value }))} placeholder="e.g. 024 for Coventry" />
            <label style={s.label}>Forward all calls to</label>
            <input style={s.input} value={form.forwardTo} onChange={(e) => setForm(f => ({ ...f, forwardTo: e.target.value }))} placeholder="+441234567890" />
            <div style={s.row}>
              <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button style={s.submitBtn} onClick={search} disabled={searching}>{searching ? 'Searching...' : 'Search numbers'}</button>
            </div>
          </>
        )}

        {step === 'results' && (
          <>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Select a number to purchase:</div>
            {results.map((r) => (
              <div
                key={r.phoneNumber}
                style={{ ...s.searchResultItem, borderColor: selected?.phoneNumber === r.phoneNumber ? '#6c63ff' : '#2a2a2e', color: selected?.phoneNumber === r.phoneNumber ? '#fff' : '#aaa' }}
                onClick={() => setSelected(r)}
              >
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{r.phoneNumber}</span>
                {r.locality && <span style={{ color: '#555', marginLeft: 10 }}>{r.locality}</span>}
              </div>
            ))}
            <div style={s.row}>
              <button style={s.cancelBtn} onClick={() => setStep('form')}>← Back</button>
              <button style={{ ...s.submitBtn, opacity: selected && !purchasing ? 1 : 0.5 }} onClick={purchase} disabled={!selected || purchasing}>
                {purchasing ? 'Purchasing...' : `Buy ${selected?.phoneNumber || 'selected'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Calls() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [configured, setConfigured] = useState(null);
  const [stats, setStats] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    getAccessTokenSilently().then(setToken);
  }, [getAccessTokenSilently]);

  useEffect(() => {
    if (!token) return;
    api.get('/api/calls/configured', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setConfigured(r.data.data.configured))
      .catch(() => setConfigured(false));
  }, [token]);

  const fetchData = useCallback(async () => {
    if (!selectedId || !token) return;
    setLoading(true);
    try {
      const [statsRes, numbersRes, callsRes] = await Promise.all([
        api.get(`/api/calls/${selectedId}/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/api/calls/${selectedId}/numbers`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get(`/api/calls/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats(statsRes.data.data);
      setNumbers(numbersRes.data.data || []);
      setCalls(callsRes.data.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRelease = async (numberId) => {
    if (!confirm('Release this tracking number? This cannot be undone and the number will be returned to Twilio.')) return;
    try {
      await api.delete(`/api/calls/numbers/${numberId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch { /* ignore */ }
  };

  const changeCalc = (thisWeek, lastWeek) => {
    if (!lastWeek) return null;
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  };

  const pctDisplay = (pct) => {
    if (pct === null) return null;
    const color = pct >= 0 ? '#22c55e' : '#ef4444';
    return <span style={{ fontSize: 12, color, marginLeft: 6 }}>{pct >= 0 ? '↑' : '↓'} {Math.abs(pct)}%</span>;
  };

  if (loading && !stats) return <div style={{ color: '#555', padding: '60px 0', textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Call Tracking</div>
          <div style={s.sub}>Track inbound calls by source using dedicated phone numbers</div>
        </div>
        {clients.length > 1 && (
          <select style={s.select} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {configured === false && (
        <div style={s.notConfigured}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>📞</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Twilio not configured</div>
          <div style={{ fontSize: 13, color: '#666', maxWidth: 400, margin: '0 auto' }}>
            Add <code style={{ color: '#a5a0ff' }}>TWILIO_ACCOUNT_SID</code>, <code style={{ color: '#a5a0ff' }}>TWILIO_AUTH_TOKEN</code>, and <code style={{ color: '#a5a0ff' }}>TWILIO_WEBHOOK_URL</code> to your server .env to enable call tracking.
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Calls this week</div>
            <div style={s.statVal}>{stats.calls_this_week}{pctDisplay(changeCalc(stats.calls_this_week, stats.calls_last_week))}</div>
            <div style={s.statSub}>vs {stats.calls_last_week} last week</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total (30d)</div>
            <div style={s.statVal}>{stats.total_calls}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Answered</div>
            <div style={s.statVal}>{stats.answered}</div>
            <div style={s.statSub}>{stats.total_calls > 0 ? Math.round(stats.answered / stats.total_calls * 100) : 0}% answer rate</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Missed</div>
            <div style={s.statVal}>{stats.missed}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Avg. duration</div>
            <div style={s.statVal}>{fmtDuration(stats.avg_duration_secs)}</div>
          </div>
        </div>
      )}

      {/* Tracking numbers */}
      <div style={s.sectionTitle}>Tracking numbers</div>
      <div style={s.numbersGrid}>
        {numbers.map((n) => (
          <div key={n.id} style={s.numberCard}>
            <div style={s.numberPhone}>{n.twilio_number}</div>
            <div style={s.channelChip}>{n.channel}</div>
            <div style={s.numberMeta}>
              {n.friendly_name && <div style={{ marginBottom: 2 }}>{n.friendly_name}</div>}
              <div>Forwards to: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{n.forward_to || '—'}</span></div>
              <div style={{ marginTop: 4 }}>{n.total_calls || 0} calls · last {n.last_call_at ? fmtDate(n.last_call_at) : 'never'}</div>
            </div>
            <button style={s.releaseBtn} onClick={() => handleRelease(n.id)}>Release number</button>
          </div>
        ))}
        {configured && (
          <div style={s.addCard} onClick={() => setShowAdd(true)}>
            <span style={{ fontSize: 18 }}>+</span> Add tracking number
          </div>
        )}
      </div>

      {/* Call log */}
      <div style={s.sectionTitle}>Call log</div>
      {calls.length === 0 ? (
        <div style={s.emptyBox}>
          {numbers.length === 0
            ? 'Add a tracking number above to start tracking calls.'
            : 'No calls recorded yet. Calls will appear here once your tracking numbers receive calls.'}
        </div>
      ) : (
        <div style={{ background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, overflow: 'hidden' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Date</th>
                <th style={s.th}>Caller</th>
                <th style={s.th}>Channel</th>
                <th style={s.th}>Duration</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id}>
                  <td style={s.td}>{fmtDate(c.called_at)}</td>
                  <td style={{ ...s.td, fontFamily: 'monospace', color: '#fff' }}>{fmtPhone(c.caller_number)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.channelChip, fontSize: 11, padding: '2px 8px' }}>{c.channel || '—'}</span>
                  </td>
                  <td style={s.td}>{fmtDuration(c.duration_seconds)}</td>
                  <td style={s.td}>
                    <span style={s.statusDot(c.status)} />
                    {c.status || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && token && (
        <AddNumberModal
          clientId={selectedId}
          token={token}
          onClose={() => setShowAdd(false)}
          onAdded={fetchData}
        />
      )}
    </div>
  );
}
