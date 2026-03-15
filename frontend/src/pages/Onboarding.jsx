import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

const BUSINESS_TYPES = ['Locksmith', 'Plumber', 'Electrician', 'HVAC', 'Cleaner', 'Roofer', 'Carpenter', 'Painter', 'Landscaper', 'Builder', 'Other'];

const STEPS = ['Welcome', 'Add Client', 'Connect Google', 'All Set'];

const s = {
  root: { minHeight: '100vh', background: '#0f0f11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 16, padding: '40px 48px', width: '100%', maxWidth: 520 },
  progress: { display: 'flex', gap: 6, marginBottom: 36, alignItems: 'center' },
  stepDot: (active, done) => ({
    width: done ? 28 : active ? 28 : 20,
    height: 8,
    borderRadius: 4,
    background: done ? '#22c55e' : active ? '#6c63ff' : '#2a2a2e',
    transition: 'all 0.3s ease',
  }),
  stepLabel: { fontSize: 11, color: '#555', marginBottom: 6 },
  title: { fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 32, lineHeight: 1.6 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' },
  input: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 16 },
  select: { background: '#111', border: '1px solid #2a2a2e', borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: 14, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 16, cursor: 'pointer' },
  primaryBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', marginBottom: 12 },
  secondaryBtn: { background: 'none', color: '#555', border: 'none', padding: '8px 0', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center' },
  connectBtn: { background: '#18181c', border: '2px solid #6c63ff', color: '#fff', padding: '14px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600, width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 },
  error: { fontSize: 13, color: '#ef4444', marginBottom: 12 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2a2e', fontSize: 14 },
  summaryLabel: { color: '#666' },
  summaryVal: { color: '#fff', fontWeight: 600 },
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const [step, setStep] = useState(0);
  const [agencyName, setAgencyName] = useState('');
  const [clientForm, setClientForm] = useState({ name: '', city: '', business_type: '', phone: '', website_url: '' });
  const [createdClientId, setCreatedClientId] = useState(null);
  const [createdClientName, setCreatedClientName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dismiss = () => {
    localStorage.setItem('onboarding_dismissed', '1');
    navigate('/dashboard', { replace: true });
  };

  // Step 0 → 1: Save agency name
  const handleAgencyNext = async () => {
    if (!agencyName.trim()) { setError('Please enter your agency name'); return; }
    setSaving(true);
    setError('');
    try {
      const token = await getAccessTokenSilently();
      await api.put('/api/settings', { agency_name: agencyName }, { headers: { Authorization: `Bearer ${token}` } });
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save agency name');
    }
    setSaving(false);
  };

  // Step 1 → 2: Create first client
  const handleClientNext = async () => {
    if (!clientForm.name.trim()) { setError('Please enter a client name'); return; }
    setSaving(true);
    setError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await api.post('/api/clients', clientForm, { headers: { Authorization: `Bearer ${token}` } });
      const newClient = res.data.data;
      setCreatedClientId(newClient.id);
      setCreatedClientName(newClient.name);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create client');
    }
    setSaving(false);
  };

  // Step 2: Connect Google OAuth
  const handleConnectGoogle = () => {
    if (!createdClientId) return;
    // OAuth will redirect back to /clients?google=connected
    localStorage.setItem('onboarding_dismissed', '1');
    window.location.href = `/api/auth/google/connect?clientId=${createdClientId}`;
  };

  // Step 3 → Dashboard
  const handleFinish = () => {
    localStorage.setItem('onboarding_dismissed', '1');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div style={s.root}>
      <div style={s.card}>
        {/* Progress bar */}
        <div style={s.progress}>
          {STEPS.map((label, i) => (
            <div key={i} style={s.stepDot(i === step, i < step)} title={label} />
          ))}
          <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>Step {step + 1} of {STEPS.length}</span>
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <>
            <div style={s.title}>Welcome to Pelara! 👋</div>
            <div style={s.sub}>
              Let's get you set up in just a few steps. First, what's the name of your agency or business?
            </div>
            {error && <div style={s.error}>{error}</div>}
            <label style={s.label}>Agency name</label>
            <input
              style={s.input}
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="e.g. Smith Digital Marketing"
              onKeyDown={(e) => e.key === 'Enter' && handleAgencyNext()}
              autoFocus
            />
            <button style={s.primaryBtn} onClick={handleAgencyNext} disabled={saving}>
              {saving ? 'Saving...' : 'Continue →'}
            </button>
            <button style={s.secondaryBtn} onClick={dismiss}>Skip setup</button>
          </>
        )}

        {/* Step 1: Add first client */}
        {step === 1 && (
          <>
            <div style={s.title}>Add your first client</div>
            <div style={s.sub}>Enter the details of the local business you want to track.</div>
            {error && <div style={s.error}>{error}</div>}
            <label style={s.label}>Business name *</label>
            <input style={s.input} value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vi-keys Auto Locksmith" />
            <label style={s.label}>City</label>
            <input style={s.input} value={clientForm.city} onChange={(e) => setClientForm((f) => ({ ...f, city: e.target.value }))} placeholder="Coventry" />
            <label style={s.label}>Business type</label>
            <select style={s.select} value={clientForm.business_type} onChange={(e) => setClientForm((f) => ({ ...f, business_type: e.target.value }))}>
              <option value="">Select type...</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={s.label}>Phone</label>
            <input style={s.input} value={clientForm.phone} onChange={(e) => setClientForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+447911123456" />
            <label style={s.label}>Website</label>
            <input style={s.input} value={clientForm.website_url} onChange={(e) => setClientForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="example.co.uk" />
            <button style={s.primaryBtn} onClick={handleClientNext} disabled={saving}>
              {saving ? 'Creating...' : 'Add Client →'}
            </button>
            <button style={s.secondaryBtn} onClick={() => setStep(0)}>← Back</button>
          </>
        )}

        {/* Step 2: Connect Google */}
        {step === 2 && (
          <>
            <div style={s.title}>Connect Google 🔗</div>
            <div style={s.sub}>
              Connect Google for <strong style={{ color: '#fff' }}>{createdClientName}</strong> to start pulling in Search Console, Analytics, and Business Profile data.
            </div>
            <button style={s.connectBtn} onClick={handleConnectGoogle}>
              <span>🔵</span> Connect Google Account
            </button>
            <button style={s.primaryBtn} onClick={() => setStep(3)} style={{ ...s.primaryBtn, background: '#2a2a2e', color: '#888' }}>
              Skip for now →
            </button>
            <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginTop: 8 }}>
              You can connect Google anytime from the Clients page.
            </div>
          </>
        )}

        {/* Step 3: All set */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={s.title}>You're all set!</div>
            <div style={s.sub}>Your Pelara workspace is ready. Here's what you've set up:</div>
            <div style={{ marginBottom: 28 }}>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>Agency</span>
                <span style={s.summaryVal}>{agencyName}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={s.summaryLabel}>First client</span>
                <span style={s.summaryVal}>{createdClientName}</span>
              </div>
            </div>
            <button style={s.primaryBtn} onClick={handleFinish}>
              Go to Dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
