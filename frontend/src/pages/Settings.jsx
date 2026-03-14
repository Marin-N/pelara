import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import api from '../services/api.js';

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 14, color: '#666', marginBottom: 32 },
  section: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '24px', marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  row: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    background: '#111', border: '1px solid #2a2a2e', borderRadius: 8,
    color: '#fff', padding: '9px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box',
    outline: 'none',
  },
  saveBtn: {
    background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 20px',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  saveBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  msg: (ok) => ({
    fontSize: 13, padding: '8px 14px', borderRadius: 8, marginBottom: 16,
    background: ok ? '#14532d' : '#3b0a0a',
    border: `1px solid ${ok ? '#22c55e33' : '#ef444433'}`,
    color: ok ? '#22c55e' : '#ef4444',
  }),
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  infoLabel: { fontSize: 13, color: '#666' },
  infoValue: { fontSize: 13, color: '#fff', fontWeight: 500 },
  planChip: { fontSize: 12, fontWeight: 700, color: '#6c63ff', background: '#6c63ff22', border: '1px solid #6c63ff44', padding: '3px 10px', borderRadius: 20 },
  billingLink: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6c63ff', textDecoration: 'none', padding: '8px 16px', border: '1px solid #6c63ff44', borderRadius: 8, background: '#6c63ff11' },
  dangerSection: { background: '#18181c', border: '1px solid #ef444422', borderRadius: 12, padding: '24px', marginBottom: 20 },
  dangerTitle: { fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 4 },
  dangerSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  dangerBtn: { background: 'transparent', border: '1px solid #ef444466', color: '#ef4444', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  confirmBox: { background: '#1a0a0a', border: '1px solid #ef444433', borderRadius: 8, padding: '16px', marginTop: 16 },
  confirmInput: { background: '#111', border: '1px solid #ef444433', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', marginTop: 10, marginBottom: 12 },
  confirmBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { getAccessTokenSilently, logout } = useAuth0();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({ agency_name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const res = await api.get('/api/settings', { headers: { Authorization: `Bearer ${token}` } });
      const d = res.data.data;
      setSettings(d);
      setForm({ agency_name: d.agency_name || '', email: d.email || '' });
    } catch { /* ignore */ }
  }, [getAccessTokenSilently]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = await getAccessTokenSilently();
      await api.put('/api/settings', form, { headers: { Authorization: `Bearer ${token}` } });
      setSaveMsg({ text: 'Settings saved successfully', ok: true });
      await fetchSettings();
      setTimeout(() => setSaveMsg(null), 4000);
    } catch (err) {
      setSaveMsg({ text: err.response?.data?.error || 'Failed to save settings', ok: false });
    } finally {
      setSaving(false);
    }
  };

  const planLabel = { starter: 'Starter', growth: 'Growth', agency: 'Agency' };
  const statusLabel = { active: 'Active', trialing: 'Trial', past_due: 'Payment past due', canceled: 'Canceled' };

  return (
    <div>
      <div style={s.title}>Settings</div>
      <div style={s.sub}>Manage your agency profile and account</div>

      {/* Agency profile */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Agency profile</div>
        <div style={s.sectionSub}>Update your agency name and contact email</div>

        {saveMsg && <div style={s.msg(saveMsg.ok)}>{saveMsg.text}</div>}

        <form onSubmit={handleSave}>
          <div style={s.row}>
            <label style={s.label}>Agency name</label>
            <input
              style={s.input}
              value={form.agency_name}
              onChange={(e) => setForm((f) => ({ ...f, agency_name: e.target.value }))}
              placeholder="Your agency name"
            />
          </div>
          <div style={s.row}>
            <label style={s.label}>Contact email</label>
            <input
              style={s.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
            />
          </div>
          <button
            type="submit"
            style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* Billing summary */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Billing</div>
        <div style={s.sectionSub}>Your current plan and subscription details</div>

        {settings && (
          <>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Current plan</span>
              <span style={s.planChip}>{planLabel[settings.plan] || settings.plan}</span>
            </div>
            <div style={s.infoRow}>
              <span style={s.infoLabel}>Status</span>
              <span style={s.infoValue}>{statusLabel[settings.subscription_status] || settings.subscription_status}</span>
            </div>
            {settings.current_period_end && (
              <div style={s.infoRow}>
                <span style={s.infoLabel}>Next billing date</span>
                <span style={s.infoValue}>
                  {new Date(settings.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <Link to="/billing" style={s.billingLink}>Manage subscription →</Link>
            </div>
          </>
        )}
      </div>

      {/* Danger zone */}
      <div style={s.dangerSection}>
        <div style={s.dangerTitle}>Danger zone</div>
        <div style={s.dangerSub}>
          Deleting your account will remove all your data including clients, metrics, reports, and alerts.
          This action cannot be undone.
        </div>

        {!showDeleteConfirm ? (
          <button style={s.dangerBtn} onClick={() => setShowDeleteConfirm(true)}>
            Delete account
          </button>
        ) : (
          <div style={s.confirmBox}>
            <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 6 }}>
              Type <strong>DELETE</strong> to confirm account deletion:
            </div>
            <input
              style={s.confirmInput}
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={s.confirmBtn}
                disabled={deleteText !== 'DELETE'}
                onClick={() => {
                  // Account deletion requires manual intervention — direct to support
                  alert('Please email support@pelara.ai to request account deletion. We will process your request within 48 hours.');
                  setShowDeleteConfirm(false);
                  setDeleteText('');
                }}
              >
                Confirm delete
              </button>
              <button
                style={{ ...s.dangerBtn, color: '#888', borderColor: '#333' }}
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
