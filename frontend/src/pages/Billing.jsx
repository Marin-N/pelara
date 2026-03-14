import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  sub: { fontSize: 14, color: '#666', marginTop: 4 },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12,
    padding: '16px 20px', marginBottom: 32,
  },
  planBadge: (active) => ({
    fontSize: 13, fontWeight: 700,
    color: active ? '#6c63ff' : '#888',
    background: active ? '#6c63ff22' : '#111',
    border: `1px solid ${active ? '#6c63ff44' : '#2a2a2e'}`,
    padding: '4px 12px', borderRadius: 20,
  }),
  statusDot: (status) => {
    const colors = {
      active: '#22c55e', trialing: '#f59e0b', past_due: '#ef4444',
      canceled: '#555', incomplete: '#f59e0b',
    };
    return { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[status] || '#555', marginRight: 6 };
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 },
  card: (isCurrent) => ({
    background: '#18181c',
    border: `1px solid ${isCurrent ? '#6c63ff' : '#2a2a2e'}`,
    borderRadius: 14, padding: '24px 20px',
    display: 'flex', flexDirection: 'column', gap: 0,
    position: 'relative',
  }),
  currentBadge: {
    position: 'absolute', top: 16, right: 16,
    background: '#6c63ff', color: '#fff', fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 20, letterSpacing: '0.5px',
  },
  planName: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 },
  price: { fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 4 },
  priceSmall: { fontSize: 14, fontWeight: 400, color: '#666' },
  clientsNote: { fontSize: 12, color: '#a5a0ff', marginBottom: 16, marginTop: 2 },
  featureList: { flex: 1, marginBottom: 20, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 },
  feature: { fontSize: 13, color: '#aaa', display: 'flex', alignItems: 'flex-start', gap: 7 },
  featureTick: { color: '#22c55e', flexShrink: 0, marginTop: 1 },
  btn: (variant) => {
    const base = { width: '100%', padding: '10px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'opacity 0.15s' };
    if (variant === 'primary') return { ...base, background: '#6c63ff', color: '#fff' };
    if (variant === 'current') return { ...base, background: '#6c63ff22', color: '#6c63ff', cursor: 'default' };
    if (variant === 'outline') return { ...base, background: 'transparent', border: '1px solid #6c63ff', color: '#6c63ff' };
    return { ...base, background: '#2a2a2e', color: '#888' };
  },
  portalSection: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  portalTitle: { fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 },
  portalSub: { fontSize: 13, color: '#666', marginBottom: 16 },
  portalBtn: {
    background: 'transparent', border: '1px solid #444', color: '#aaa',
    padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  },
  msg: (ok) => ({
    background: ok ? '#14532d' : '#3b0a0a',
    border: `1px solid ${ok ? '#22c55e33' : '#ef444433'}`,
    color: ok ? '#22c55e' : '#ef4444',
    padding: '10px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
  }),
};

// ── Plan card ─────────────────────────────────────────────────────────────────

const PlanCard = ({ plan, currentPlan, subscriptionStatus, onUpgrade, loading }) => {
  const isCurrent = plan.is_current;
  const isDowngrade = getPlanRank(plan.key) < getPlanRank(currentPlan);
  const hasActiveSub = ['active', 'trialing'].includes(subscriptionStatus);

  let btnLabel = 'Subscribe';
  let btnVariant = 'primary';
  if (isCurrent) { btnLabel = 'Current plan'; btnVariant = 'current'; }
  else if (isDowngrade && hasActiveSub) { btnLabel = 'Downgrade'; btnVariant = 'outline'; }
  else if (!isCurrent && hasActiveSub) { btnLabel = 'Upgrade'; btnVariant = 'primary'; }

  return (
    <div style={s.card(isCurrent)}>
      {isCurrent && <div style={s.currentBadge}>CURRENT</div>}
      <div style={s.planName}>{plan.name}</div>
      <div style={s.price}>
        £{plan.price}
        <span style={s.priceSmall}>/mo</span>
      </div>
      <div style={s.clientsNote}>
        {plan.clients_limit ? `Up to ${plan.clients_limit} client${plan.clients_limit > 1 ? 's' : ''}` : 'Unlimited clients'}
      </div>
      <ul style={s.featureList}>
        {plan.features.map((f) => (
          <li key={f} style={s.feature}>
            <span style={s.featureTick}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button
        style={s.btn(btnVariant)}
        disabled={isCurrent || loading}
        onClick={() => !isCurrent && onUpgrade(plan.key)}
      >
        {loading === plan.key ? 'Redirecting...' : btnLabel}
      </button>
    </div>
  );
};

const PLAN_ORDER = ['starter', 'growth', 'agency', 'agency_pro'];
const getPlanRank = (key) => PLAN_ORDER.indexOf(key);

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const [params, setSearchParams] = useSearchParams();
  const { getAccessTokenSilently } = useAuth0();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(null); // plan key
  const [portalLoading, setPortalLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { text, ok }

  // Handle redirect back from Stripe Checkout
  useEffect(() => {
    const result = params.get('billing');
    if (result === 'success') {
      setMsg({ text: 'Payment successful! Your plan has been activated.', ok: true });
      setSearchParams({}, { replace: true });
    } else if (result === 'cancelled') {
      setMsg({ text: 'Checkout cancelled — no charge was made.', ok: false });
      setSearchParams({}, { replace: true });
    }
  }, [params, setSearchParams]);

  const fetchBilling = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get('/api/billing/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBilling(res.data.data);
    } catch {
      setBilling(null);
    } finally {
      setLoading(false);
    }
  }, [getAccessTokenSilently]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  const handleUpgrade = async (planKey) => {
    setUpgradeLoading(planKey);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post(
        '/api/billing/checkout',
        { plan: planKey },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.data.url;
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to start checkout. Try again.', ok: false });
      setUpgradeLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post(
        '/api/billing/portal',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.data.url;
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Failed to open billing portal.', ok: false });
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: '#555', padding: '48px 0', textAlign: 'center', fontSize: 14 }}>
        Loading billing...
      </div>
    );
  }

  const statusLabels = {
    active: 'Active', trialing: 'Trial', past_due: 'Payment past due',
    canceled: 'Canceled', incomplete: 'Incomplete',
  };

  return (
    <div>
      <div style={s.header}>
        <div>
          <div style={s.title}>Billing</div>
          <div style={s.sub}>Manage your Pelara subscription</div>
        </div>
      </div>

      {msg && (
        <div style={s.msg(msg.ok)} onClick={() => setMsg(null)}>
          {msg.text}
        </div>
      )}

      {billing && (
        <div style={s.statusBar}>
          <span style={{ fontSize: 13, color: '#666' }}>Current plan</span>
          <span style={s.planBadge(true)}>{billing.plan_name}</span>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#888' }}>
            <span style={s.statusDot(billing.subscription_status)} />
            {statusLabels[billing.subscription_status] || billing.subscription_status}
          </span>
          <span style={{ fontSize: 13, color: '#555' }}>
            {billing.clients_limit ? `${billing.clients_limit} client${billing.clients_limit > 1 ? ' slots' : ' slot'}` : 'Unlimited client slots'}
          </span>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
        Choose your plan
      </div>

      <div style={s.grid}>
        {(billing?.plans || []).map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            currentPlan={billing?.current_plan}
            subscriptionStatus={billing?.subscription_status}
            onUpgrade={handleUpgrade}
            loading={upgradeLoading}
          />
        ))}
      </div>

      {billing?.has_subscription && (
        <div style={s.portalSection}>
          <div style={s.portalTitle}>Manage subscription</div>
          <div style={s.portalSub}>
            Update your payment method, view invoices, or cancel your subscription via the Stripe billing portal.
          </div>
          <button style={s.portalBtn} onClick={handlePortal} disabled={portalLoading}>
            {portalLoading ? 'Opening portal...' : 'Open Billing Portal →'}
          </button>
        </div>
      )}

      <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>
        All prices in GBP. Subscriptions renew monthly. Cancel anytime from the billing portal.
        Secure payments powered by Stripe.
      </div>
    </div>
  );
}
