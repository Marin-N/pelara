import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRating = (r) => r ? Number(r).toFixed(1) : '—';
const fmtCount = (n) => n ? Number(n).toLocaleString('en-GB') : '—';
const starDisplay = (rating) => {
  if (!rating) return '—';
  const r = Math.round(Number(rating) * 2) / 2;
  return '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(r));
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666', marginBottom: 28 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  addBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  refreshBtn: { background: 'transparent', border: '1px solid #444', color: '#888', padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 28 },
  card: (isClient) => ({
    background: '#18181c', border: `1px solid ${isClient ? '#6c63ff' : '#2a2a2e'}`,
    borderRadius: 12, padding: '18px 20px', position: 'relative',
  }),
  yourBadge: { position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, color: '#6c63ff', background: '#6c63ff22', border: '1px solid #6c63ff44', padding: '2px 8px', borderRadius: 20 },
  compName: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4, paddingRight: 60 },
  website: { fontSize: 12, color: '#6c63ff', marginBottom: 12, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  ratingNum: { fontSize: 28, fontWeight: 800, color: '#fff' },
  stars: { fontSize: 14, color: '#f59e0b', letterSpacing: 1 },
  reviewCount: { fontSize: 12, color: '#555' },
  changeRow: { display: 'flex', gap: 16, marginTop: 8 },
  changePill: (up) => ({ fontSize: 12, color: up ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 3 }),
  editRow: { display: 'flex', gap: 8, marginTop: 14 },
  editBtn: { flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 0', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  removeBtn: { background: 'transparent', border: '1px solid #ef444422', color: '#ef4444', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 48, textAlign: 'center', color: '#555', fontSize: 14 },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 14, padding: '28px 28px', width: 440, maxWidth: '90vw' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  input: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, color: '#fff', padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 14 },
  btnRow: { display: 'flex', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #333', color: '#888', padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { flex: 2, background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  msg: (ok) => ({ fontSize: 12, padding: '6px 10px', borderRadius: 6, marginBottom: 12, background: ok ? '#14532d' : '#3b0a0a', color: ok ? '#22c55e' : '#ef4444' }),
  hint: { fontSize: 12, color: '#444', marginTop: -10, marginBottom: 14 },
  // Update metrics mini form
  metricForm: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, padding: '12px 14px', marginTop: 12 },
  metricInput: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 6, color: '#fff', padding: '6px 8px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 8 },
  metricSaveBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
};

// ── Competitor card ───────────────────────────────────────────────────────────

const CompetitorCard = ({ comp, isClient, token, onRemove, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [metricForm, setMetricForm] = useState({ reviews_count: comp.reviews_count || '', reviews_average: comp.reviews_average || '' });
  const [saving, setSaving] = useState(false);

  const saveMetrics = async () => {
    setSaving(true);
    try {
      await api.put(`/api/competitors/${comp.id}/metrics`, metricForm, { headers: { Authorization: `Bearer ${token}` } });
      onUpdated();
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const prevReviews = comp.prev_reviews_count;
  const prevRating = comp.prev_reviews_average;
  const reviewChange = prevReviews && comp.reviews_count ? comp.reviews_count - prevReviews : null;
  const ratingChange = prevRating && comp.reviews_average ? (Number(comp.reviews_average) - Number(prevRating)).toFixed(2) : null;

  return (
    <div style={s.card(isClient)}>
      {isClient && <div style={s.yourBadge}>YOUR CLIENT</div>}
      <div style={s.compName}>{comp.name}</div>
      {comp.website_url && (
        <a href={comp.website_url.startsWith('http') ? comp.website_url : `https://${comp.website_url}`}
           target="_blank" rel="noopener noreferrer" style={s.website}>
          {comp.website_url.replace(/^https?:\/\//, '')}
        </a>
      )}

      <div style={s.ratingRow}>
        <div style={s.ratingNum}>{fmtRating(comp.reviews_average)}</div>
        <div>
          <div style={s.stars}>{starDisplay(comp.reviews_average)}</div>
          <div style={s.reviewCount}>{fmtCount(comp.reviews_count)} reviews</div>
        </div>
      </div>

      {(reviewChange !== null || ratingChange !== null) && (
        <div style={s.changeRow}>
          {reviewChange !== null && (
            <span style={s.changePill(reviewChange >= 0)}>
              {reviewChange >= 0 ? '↑' : '↓'} {Math.abs(reviewChange)} reviews
            </span>
          )}
          {ratingChange !== null && Math.abs(parseFloat(ratingChange)) >= 0.01 && (
            <span style={s.changePill(parseFloat(ratingChange) >= 0)}>
              {parseFloat(ratingChange) >= 0 ? '↑' : '↓'} {Math.abs(ratingChange)} ★
            </span>
          )}
        </div>
      )}

      {comp.metrics_date && (
        <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>
          Updated {new Date(comp.metrics_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}

      {!isClient && (
        <>
          <div style={s.editRow}>
            <button style={s.editBtn} onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel' : '✎ Update metrics'}
            </button>
            <button style={s.removeBtn} onClick={() => onRemove(comp.id)}>✕</button>
          </div>

          {editing && (
            <div style={s.metricForm}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Enter current review data:</div>
              <input style={s.metricInput} type="number" placeholder="Review count (e.g. 127)" value={metricForm.reviews_count}
                onChange={(e) => setMetricForm(f => ({ ...f, reviews_count: e.target.value }))} />
              <input style={s.metricInput} type="number" step="0.1" min="1" max="5" placeholder="Rating (e.g. 4.7)" value={metricForm.reviews_average}
                onChange={(e) => setMetricForm(f => ({ ...f, reviews_average: e.target.value }))} />
              <button style={s.metricSaveBtn} onClick={saveMetrics} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Competitors() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState(null);
  const [addForm, setAddForm] = useState({ name: '', website_url: '', phone: '', gbp_place_id: '' });
  const [addMsg, setAddMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    getAccessTokenSilently().then(setToken);
  }, [getAccessTokenSilently]);

  const selectedClient = clients.find(c => c.id === selectedId);

  const fetchCompetitors = useCallback(async () => {
    if (!selectedId || !token) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/competitors/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } });
      setCompetitors(res.data.data || []);
    } catch { setCompetitors([]); }
    setLoading(false);
  }, [selectedId, token]);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setAddMsg(null);
    try {
      await api.post(`/api/competitors/${selectedId}`, addForm, { headers: { Authorization: `Bearer ${token}` } });
      setAddForm({ name: '', website_url: '', phone: '', gbp_place_id: '' });
      setShowAdd(false);
      fetchCompetitors();
    } catch (err) {
      setAddMsg({ text: err.response?.data?.error || 'Failed to add competitor', ok: false });
    }
    setSaving(false);
  };

  const handleRemove = async (competitorId) => {
    if (!confirm('Remove this competitor?')) return;
    try {
      await api.delete(`/api/competitors/${competitorId}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchCompetitors();
    } catch { /* ignore */ }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await api.post(`/api/competitors/${selectedId}/refresh`, {}, { headers: { Authorization: `Bearer ${token}` } });
      const { updated, total } = res.data.data;
      if (total === 0) setRefreshMsg({ text: 'No competitors have a Google Place ID set — add one to enable auto-refresh.', ok: false });
      else if (updated === 0) setRefreshMsg({ text: 'Could not auto-fetch ratings. Manually update metrics below.', ok: false });
      else { setRefreshMsg({ text: `Updated ${updated} of ${total} competitors from Google Places.`, ok: true }); fetchCompetitors(); }
    } catch (err) {
      setRefreshMsg({ text: err.response?.data?.error || 'Refresh failed', ok: false });
    }
    setRefreshing(false);
    setTimeout(() => setRefreshMsg(null), 6000);
  };

  // Build "your client" pseudo-card for comparison
  const clientCard = selectedClient ? {
    id: 'client',
    name: selectedClient.name,
    website_url: selectedClient.website_url,
    reviews_count: null,
    reviews_average: null,
    metrics_date: null,
  } : null;

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Competitors</div>
          <div style={s.sub}>Track competitor reviews and ratings over time</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {clients.length > 1 && (
            <select style={s.select} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setCompetitors([]); }}>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button style={s.refreshBtn} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : '↻ Auto-refresh'}
          </button>
          <button style={s.addBtn} onClick={() => setShowAdd(true)}>+ Add competitor</button>
        </div>
      </div>

      {refreshMsg && <div style={s.msg(refreshMsg.ok)}>{refreshMsg.text}</div>}

      {loading && <div style={{ color: '#555', fontSize: 14 }}>Loading competitors...</div>}

      {!loading && (
        <>
          <div style={s.sectionTitle}>Comparison</div>
          <div style={s.grid}>
            {clientCard && <CompetitorCard comp={clientCard} isClient token={token} onRemove={() => {}} onUpdated={fetchCompetitors} />}
            {competitors.map((c) => (
              <CompetitorCard key={c.id} comp={c} isClient={false} token={token} onRemove={handleRemove} onUpdated={fetchCompetitors} />
            ))}
          </div>

          {competitors.length === 0 && !loading && (
            <div style={s.emptyBox}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>No competitors tracked yet</div>
              <div>Add competitors to compare their Google reviews and ratings with your client.</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>
                Tip: Add a Google Place ID to enable auto-refresh of review data.
              </div>
            </div>
          )}
        </>
      )}

      {/* Add competitor modal */}
      {showAdd && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Add competitor</div>
            {addMsg && <div style={s.msg(addMsg.ok)}>{addMsg.text}</div>}
            <form onSubmit={handleAdd}>
              <label style={s.label}>Business name *</label>
              <input style={s.input} value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme Locksmiths" required />
              <label style={s.label}>Website</label>
              <input style={s.input} value={addForm.website_url} onChange={(e) => setAddForm(f => ({ ...f, website_url: e.target.value }))} placeholder="acmelocksmiths.co.uk" />
              <label style={s.label}>Google Place ID</label>
              <input style={s.input} value={addForm.gbp_place_id} onChange={(e) => setAddForm(f => ({ ...f, gbp_place_id: e.target.value }))} placeholder="ChIJ... (from maps.google.com)" />
              <div style={s.hint}>Optional — enables auto-refresh of review count and rating.</div>
              <label style={s.label}>Phone</label>
              <input style={s.input} value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+441234567890" />
              <div style={s.btnRow}>
                <button type="button" style={s.cancelBtn} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" style={s.submitBtn} disabled={saving}>{saving ? 'Adding...' : 'Add competitor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
