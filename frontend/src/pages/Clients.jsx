import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useSearchParams } from 'react-router-dom';
import { useClients } from '../hooks/useClients.js';
import ClientList from '../components/Clients/ClientList.jsx';
import api from '../services/api.js';

const BUSINESS_TYPES = [
  'Locksmith', 'Plumber', 'Electrician', 'HVAC', 'Cleaner', 'Roofer',
  'Carpenter', 'Painter', 'Landscaper', 'Builder', 'Other',
];

const styles = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  title: { fontSize: 24, fontWeight: 700, color: '#fff' },
  addBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 16, padding: '32px 36px', width: 520, maxHeight: '90vh', overflowY: 'auto' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12, marginTop: 20, paddingBottom: 6, borderBottom: '1px solid #2a2a2e' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldFull: { display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2', marginBottom: 16 },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' },
  labelHint: { fontSize: 11, color: '#444', marginTop: 2 },
  input: { background: '#0f0f11', border: '1px solid #333', color: '#fff', padding: '9px 12px', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { background: '#0f0f11', border: '1px solid #333', color: '#fff', padding: '9px 12px', borderRadius: 8, fontSize: 14, outline: 'none' },
  actions: { display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  cancelBtn: { background: 'none', border: '1px solid #333', color: '#888', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  submitBtn: { background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 },
};

const EMPTY_FORM = {
  name: '', business_type: '', city: '', country: 'GB',
  phone: '', website_url: '', address: '',
  gbp_location_id: '', ga4_property_id: '', gsc_site_url: '',
};

export default function Clients() {
  const { clients, loading, error, refetch } = useClients();
  const { getAccessTokenSilently } = useAuth0();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const status = searchParams.get('google');
    if (status === 'connected') {
      setGoogleStatus('Google connected successfully! You can now sync metrics from the dashboard.');
      refetch();
      setSearchParams({});
      setTimeout(() => setGoogleStatus(''), 5000);
    } else if (status === 'denied' || status === 'error') {
      setGoogleStatus('Google connection failed. Please try again.');
      setSearchParams({});
      setTimeout(() => setGoogleStatus(''), 4000);
    }
  }, [searchParams]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setSaveError('Business name is required'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const token = await getAccessTokenSilently();
      await api.post('/api/clients', form, { headers: { Authorization: `Bearer ${token}` } });
      setShowModal(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to create client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {googleStatus && (
        <div style={{
          background: googleStatus.includes('success') ? '#14532d' : '#3b0a0a',
          border: `1px solid ${googleStatus.includes('success') ? '#22c55e33' : '#ef444433'}`,
          color: googleStatus.includes('success') ? '#22c55e' : '#ef4444',
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13,
        }}>
          {googleStatus}
        </div>
      )}

      <div style={styles.header}>
        <div style={styles.title}>
          Clients <span style={{ fontSize: 15, color: '#555', fontWeight: 400 }}>({clients.length})</span>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>+ Add Client</button>
      </div>

      <ClientList clients={clients} loading={loading} error={error} />

      {showModal && (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div style={styles.modal}>
            <div style={styles.modalTitle}>Add New Client</div>
            <form onSubmit={handleSubmit}>

              {/* ── Business details ── */}
              <div style={styles.sectionLabel}>Business Details</div>

              <div style={{ ...styles.fieldFull, marginBottom: 16 }}>
                <label style={styles.label}>Business Name *</label>
                <input style={styles.input} name="name" value={form.name} onChange={handleChange} placeholder="e.g. Rapid Locksmith Birmingham" autoFocus />
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <label style={styles.label}>Business Type</label>
                  <select style={styles.select} name="business_type" value={form.business_type} onChange={handleChange}>
                    <option value="">Select type</option>
                    {BUSINESS_TYPES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>City</label>
                  <input style={styles.input} name="city" value={form.city} onChange={handleChange} placeholder="Birmingham" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Phone</label>
                  <input style={styles.input} name="phone" value={form.phone} onChange={handleChange} placeholder="+44 7700 900000" />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Country</label>
                  <select style={styles.select} name="country" value={form.country} onChange={handleChange}>
                    <option value="GB">United Kingdom</option>
                    <option value="IE">Ireland</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <div style={{ ...styles.fieldFull, marginTop: 8 }}>
                <label style={styles.label}>Website URL</label>
                <input style={styles.input} name="website_url" value={form.website_url} onChange={handleChange} placeholder="https://example.com" />
              </div>

              {/* ── Google integration IDs ── */}
              <div style={styles.sectionLabel}>Google Integration (optional — can set later)</div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>GBP Location ID</label>
                <div style={styles.labelHint}>Found in Google Business Profile — e.g. 123456789</div>
                <input style={styles.input} name="gbp_location_id" value={form.gbp_location_id} onChange={handleChange} placeholder="123456789" />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>GA4 Property ID</label>
                <div style={styles.labelHint}>Google Analytics 4 — numeric ID only, e.g. 320123456</div>
                <input style={styles.input} name="ga4_property_id" value={form.ga4_property_id} onChange={handleChange} placeholder="320123456" />
              </div>

              <div style={styles.fieldFull}>
                <label style={styles.label}>GSC Site URL</label>
                <div style={styles.labelHint}>Exact URL as shown in Search Console, e.g. https://example.com/</div>
                <input style={styles.input} name="gsc_site_url" value={form.gsc_site_url} onChange={handleChange} placeholder="https://example.com/" />
              </div>

              {saveError && <div style={styles.error}>{saveError}</div>}

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={() => { setShowModal(false); setForm(EMPTY_FORM); }}>Cancel</button>
                <button type="submit" style={{ ...styles.submitBtn, opacity: saving ? 0.6 : 1 }} disabled={saving}>
                  {saving ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
