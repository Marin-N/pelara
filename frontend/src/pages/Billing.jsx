import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666', marginBottom: 32 },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12,
    padding: '16px 20px', marginBottom: 32,
  },
  statusLabel: { fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' },
  planChip: {
    fontSize: 13, fontWeight: 700, color: '#6c63ff',
    background: '#6c63ff22', border: '1px solid #6c63ff44',
    padding: '3px 12px', borderRadius: 20,
  },
  statusDot: (s) => {
    const c = { active: '#22c55e', trialing: '#f59e0b', past_due: '#ef4444', canceled: '#555' };
    return { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c[s] || '#555', marginRight: 5 };
  },
  renewNote: { fontSize: 12, color: '#555', marginLeft: 'auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 32 },
  card: (cur) => ({
    background: '#18181c', border: `1px solid ${cur ? '#6c63ff' : '#2a2a2e'}`,
    borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', position: 'relative',
  }),
  badge: {
    position: 'absolute', top: 16, right: 16,
    background: '#6c63ff', color: '#fff', fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px',
  },
  planName: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 },
  price: { fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 2 },
  priceNote: { fontSize: 13, color: '#666', marginBottom: 6 },
  clientNote: { fontSize: 12, color: '#a5a0ff', marginBottom: 18 },
  features: { flex: 1, listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  feature: { fontSize: 13, color: '#aaa', display: 'flex', gap: 8, alignItems: 'flex-start' },
  tick: { color: '#22c55e', flexShrink: 0 },
  btn: {
    primary: { width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', background: '#6c63ff', color: '#fff' },
    current: { width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'default', border: '1px solid #6c63ff', background: 'transparent', color: '#6c63ff' },
    outline: { width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid #444', background: 'transparent', color: '#aaa' },
  },
  section: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  portalBtn: { background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  msg: (ok) => ({
    background: ok ? '#14532d' : '#3b0a0a',
    border: `1px solid ${ok ? '#22c55e33' : '#ef444433'}`,
    color: ok ? '#22c55e' : '#ef4444',
    padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, cursor: 'pointer',
  }),
  footer: { fontSize: 12, color: '#444', marginTop: 8 },
};

const PLAN_ORDER = ['starter', 'growth', 'agency'];

// ── Plan card ─────────────────────────────────────────────────────────────────

const PlanCard = ({ plan, currentPlan, status, onSelect, loading }) => {
  const isCurrent = plan.is_current;
  const myRank = PLAN_ORDER.indexOf(plan.key);
  const curRank = PLAN_ORDER.indexOf(currentPlan);
  const hasSub = ['active', 'trialing'].includes(status);

  let label = 'Subscribe';
  let variant = 'primary';
  if (isCurrent) { label = 'Current plan'; variant = 'current'; }
  else if (myRank < curRank && hasSub) { label = 'Downgrade'; variant = 'outline'; }
  else if (!isCurrent && hasSub) label = 'Upgrade';

  return (
    <div style={s.card(isCurrent)}>
      {isCurrent && <div style={s.badge}>CURRENT</div>}
      <div style={s.planName}>{plan.name}</div>
      <div style={s.price}>£{plan.price}<span style={{ fontSize: 16, fontWeight: 400, color: '#666' }}>/mo</span></div>
      <div style={s.priceNote}>Billed monthly · cancel anytime</div>
      <div style={s.clientNote}>
        {plan.clients_limit ? `Up to ${plan.clients_limit} client location${plan.clients_limit > 1 ? 's' : ''}` : 'Unlimited client locations'}
      </div>
      <ul style={s.features}>
        {plan.features.map((f) => (
          <li key={f} style={s.feature}><span style={s.tick}>✓</span>{f}</li>
        ))}
      </ul>
      <button
        style={s.btn[variant]}
        disabled={isCurrent || !!loading}
        onClick={() => !isCurrent && onSelect(plan.key)}
      >
        {loading === plan.key ? 'Redirecting...' : label}
      </button>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Billing() {
  const [params, setSearchParams] = useSearchParams();
  const { getAccessTokenSilently } = useAuth0();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectLoading, setSelectLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const result = params.get('billing');
    if (result === 'success') { setMsg({ text: 'Payment successful — your plan is now active!', ok: true }); setSearchParams({}, { replace: true }); }
    else if (result === 'cancelled') { setMsg({ text: 'Checkout cancelled — no charge was made.', ok: false }); setSearchParams({}, { replace: true }); }
  }, [params, setSearchParams]);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get('/api/stripe/subscription', { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [getAccessTokenSilently]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSelect = async (planKey) => {
    setSelectLoading(planKey);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post('/api/stripe/create-checkout', { plan: planKey }, { headers: { Authorization: `Bearer ${token}` } });
      window.location.href = res.data.data.url;
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to start checkout. Try again shortly.', ok: false });
      setSelectLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post('/api/stripe/portal', {}, { headers: { Authorization: `Bearer ${token}` } });
      window.location.href = res.data.data.url;
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to open billing portal.', ok: false });
      setPortalLoading(false);
    }
  };

  const statusLabel = { active: 'Active', trialing: 'Free trial', past_due: 'Payment past due', canceled: 'Canceled' };

  if (loading) return <div style={{ color: '#555', padding: '60px 0', textAlign: 'center', fontSize: 14 }}>Loading billing...</div>;

  return (
    <div>
      <div style={s.title}>Billing</div>
      <div style={s.sub}>Manage your Pelara subscription</div>

      {msg && <div style={s.msg(msg.ok)} onClick={() => setMsg(null)}>{msg.text}</div>}

      {data && (
        <div style={s.statusBar}>
          <span style={s.statusLabel}>Plan</span>
          <span style={s.planChip}>{data.plan_name}</span>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#888' }}>
            <span style={s.statusDot(data.status)} />
            {statusLabel[data.status] || data.status}
          </span>
          <span style={{ fontSize: 13, color: '#666' }}>
            {data.clients_limit ? `${data.clients_limit} client slots` : 'Unlimited clients'}
          </span>
          {data.current_period_end && (
            <span style={s.renewNote}>
              Renews {new Date(data.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
        Choose a plan
      </div>

      <div style={s.grid}>
        {(data?.plans || []).map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            currentPlan={data?.current_plan}
            status={data?.status}
            onSelect={handleSelect}
            loading={selectLoading}
          />
        ))}
      </div>

      {data?.has_subscription && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Manage subscription</div>
          <div style={s.sectionSub}>Update payment method, view invoices, or cancel via the Stripe portal.</div>
          <button style={s.portalBtn} onClick={handlePortal} disabled={portalLoading}>
            {portalLoading ? 'Opening...' : 'Open Billing Portal →'}
          </button>
        </div>
      )}

      <div style={s.footer}>
        All prices in GBP inc. VAT where applicable. Subscriptions renew monthly.
        Secure payments by Stripe. Questions? <Link to="/settings" style={{ color: '#6c63ff' }}>Contact us via Settings</Link>.
      </div>
    </div>
  );
}
