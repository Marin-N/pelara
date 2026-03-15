import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useClients } from '../hooks/useClients.js';
import api from '../services/api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtMonth = (d) => d ? new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—';

const priorityBadge = (priority) => {
  const map = {
    high: { bg: '#3b0a0a', color: '#ef4444', label: 'High' },
    medium: { bg: '#3d2900', color: '#f59e0b', label: 'Medium' },
    low: { bg: '#14532d', color: '#22c55e', label: 'Low' },
  };
  const c = map[priority] || { bg: '#2a2a2e', color: '#888', label: priority };
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666' },
  controls: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  select: { background: '#18181c', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 14 },
  generateBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  section: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '22px 24px', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 },
  focusBadge: { background: '#6c63ff22', color: '#a5a0ff', border: '1px solid #6c63ff44', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 },
  focusRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  insightItem: { fontSize: 13, color: '#888', padding: '6px 0', borderBottom: '1px solid #2a2a2e22' },
  actionCard: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 10, padding: '16px 18px', marginBottom: 10 },
  actionHeader: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  actionCategory: { fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  actionTitle: { fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 },
  actionDesc: { fontSize: 13, color: '#888', lineHeight: 1.6 },
  planHistoryItem: (active) => ({
    background: active ? '#6c63ff11' : 'transparent',
    border: `1px solid ${active ? '#6c63ff44' : '#2a2a2e'}`,
    borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  }),
  planHistoryLabel: { fontSize: 14, fontWeight: 600, color: '#fff' },
  planHistoryDate: { fontSize: 11, color: '#555' },
  emptyBox: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: 60, textAlign: 'center', color: '#555' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 },
  msg: (ok) => ({ fontSize: 13, padding: '8px 12px', borderRadius: 8, marginBottom: 16, background: ok ? '#14532d' : '#3b0a0a', color: ok ? '#22c55e' : '#ef4444' }),
};

// ── Plan view ─────────────────────────────────────────────────────────────────

function PlanView({ plan }) {
  const data = plan.plan_data || plan;
  const actions = data.actions || [];
  const insights = data.insights || [];
  const focusAreas = data.focus_areas || [];

  return (
    <div>
      {/* Focus areas */}
      {focusAreas.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Focus Areas</div>
          <div style={s.focusRow}>
            {focusAreas.map((area) => (
              <span key={area} style={s.focusBadge}>{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* Key insights */}
      {insights.length > 0 && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Key Insights</div>
          {insights.map((insight, i) => (
            <div key={i} style={s.insightItem}>💡 {insight}</div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Recommended Actions ({actions.length})</div>
        {actions.map((action, i) => (
          <div key={i} style={s.actionCard}>
            <div style={s.actionHeader}>
              {priorityBadge(action.priority)}
              <span style={s.actionCategory}>{action.category}</span>
            </div>
            <div style={s.actionTitle}>{action.title}</div>
            <div style={s.actionDesc}>{action.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActionPlans() {
  const { clients } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedId, setSelectedId] = useState('');
  const [token, setToken] = useState('');
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!selectedId && clients.length) setSelectedId(clients[0].id);
  }, [clients, selectedId]);

  useEffect(() => {
    getAccessTokenSilently().then(setToken);
  }, [getAccessTokenSilently]);

  const fetchPlans = useCallback(async () => {
    if (!selectedId || !token) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/action-plans/${selectedId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data.data || [];
      setPlans(data);
      if (data.length > 0) setActivePlan(data[0]);
      else setActivePlan(null);
    } catch { setPlans([]); setActivePlan(null); }
    setLoading(false);
  }, [selectedId, token]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleGenerate = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await api.post(`/api/action-plans/${selectedId}/generate`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMsg({ text: 'Action plan generated successfully!', ok: true });
      await fetchPlans();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to generate plan', ok: false });
    }
    setGenerating(false);
    setTimeout(() => setMsg(null), 5000);
  };

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Action Plan</div>
          <div style={s.sub}>Monthly recommended actions based on your data</div>
        </div>
        <div style={s.controls}>
          {clients.length > 1 && (
            <select style={s.select} value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setPlans([]); setActivePlan(null); }}>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button style={s.generateBtn} onClick={handleGenerate} disabled={generating || !selectedId}>
            {generating ? 'Generating...' : '🎯 Generate Plan'}
          </button>
        </div>
      </div>

      {msg && <div style={s.msg(msg.ok)}>{msg.text}</div>}

      {loading && <div style={{ color: '#555', fontSize: 14 }}>Loading plans...</div>}

      {!loading && plans.length === 0 && (
        <div style={s.emptyBox}>
          <div style={s.emptyIcon}>🎯</div>
          <div style={s.emptyTitle}>No action plan yet</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>
            Generate a plan to get data-driven recommendations for this client.
          </div>
          <button style={s.generateBtn} onClick={handleGenerate} disabled={generating || !selectedId}>
            {generating ? 'Generating...' : 'Generate First Plan'}
          </button>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
          {/* Plan history sidebar */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Plan History</div>
            {plans.map((plan) => (
              <div key={plan.id} style={s.planHistoryItem(activePlan?.id === plan.id)} onClick={() => setActivePlan(plan)}>
                <div>
                  <div style={s.planHistoryLabel}>{fmtMonth(plan.month)}</div>
                  <div style={s.planHistoryDate}>{fmtDate(plan.generated_at)}</div>
                </div>
                <span style={{ color: '#6c63ff', fontSize: 12 }}>›</span>
              </div>
            ))}
          </div>

          {/* Active plan content */}
          <div>
            {activePlan && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                      {fmtMonth(activePlan.month)} Plan
                    </div>
                    <div style={{ fontSize: 12, color: '#555' }}>Generated {fmtDate(activePlan.generated_at)}</div>
                  </div>
                </div>
                <PlanView plan={activePlan} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
