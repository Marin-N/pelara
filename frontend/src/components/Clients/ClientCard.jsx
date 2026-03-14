import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const styles = {
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', transition: 'border-color 0.15s' },
  name: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4, cursor: 'pointer' },
  meta: { fontSize: 13, color: '#888' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, marginTop: 10 },
  connRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 4 },
  connTag: (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, padding: '3px 8px', borderRadius: 20,
    background: on ? '#14532d' : '#1a1a1a',
    color: on ? '#22c55e' : '#555',
    border: `1px solid ${on ? '#22c55e22' : '#2a2a2e'}`,
  }),
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  connectBtn: { background: '#1a2e1a', border: '1px solid #22c55e22', color: '#22c55e', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  fbBtn: { background: '#1a1f2e', border: '1px solid #3b82f633', color: '#3b82f6', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  editBtn: { background: 'none', border: '1px solid #333', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  viewBtn: { background: 'none', border: '1px solid #2a2a2e', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 },
};

export default function ClientCard({ client, onEdit }) {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const handleConnectGoogle = async (e) => {
    e.stopPropagation();
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`/api/auth/google/url?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to start Google connection');
    } catch (err) {
      console.error('Failed to start Google OAuth', err);
    }
  };

  const handleConnectFacebook = async (e) => {
    e.stopPropagation();
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`/api/auth/facebook/url?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Failed to start Facebook connection');
    } catch (err) {
      console.error('Failed to start Facebook OAuth', err);
    }
  };

  const googleConnected = client.has_google_connected;
  const facebookConnected = client.has_facebook_connected;
  const hasGBP = !!client.gbp_location_id;
  const hasGA4 = !!client.ga4_property_id;
  const hasGSC = !!client.gsc_site_url;
  const hasFB = !!client.facebook_page_id;

  return (
    <div
      style={styles.card}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = '#6c63ff')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = '#2a2a2e')}
    >
      <div style={styles.name} onClick={() => navigate(`/dashboard?client=${client.id}`)}>
        {client.name}
      </div>
      <div style={styles.meta}>{client.city ? `${client.city}, ` : ''}{client.country || 'GB'}</div>
      <div style={styles.meta}>{client.business_type || 'Local Business'}</div>

      {/* Connection status indicators */}
      <div style={styles.connRow}>
        <span style={styles.connTag(googleConnected)}>
          {googleConnected ? '✓' : '○'} Google Auth
        </span>
        <span style={styles.connTag(hasGBP)}>
          {hasGBP ? '✓' : '○'} GBP
        </span>
        <span style={styles.connTag(hasGA4)}>
          {hasGA4 ? '✓' : '○'} GA4
        </span>
        <span style={styles.connTag(hasGSC)}>
          {hasGSC ? '✓' : '○'} GSC
        </span>
        <span style={styles.connTag(facebookConnected)}>
          {facebookConnected ? '✓' : '○'} Facebook
        </span>
      </div>

      <div style={styles.footer}>
        <span style={{ ...styles.badge, background: client.is_active ? '#14532d' : '#3b0a0a', color: client.is_active ? '#22c55e' : '#ef4444' }}>
          {client.is_active ? 'Active' : 'Inactive'}
        </span>
        <button style={styles.editBtn} onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
          Edit
        </button>
      </div>

      <div style={styles.actionRow}>
        {!googleConnected && (
          <button style={styles.connectBtn} onClick={handleConnectGoogle}>
            + Connect Google
          </button>
        )}
        {hasFB && !facebookConnected && (
          <button style={styles.fbBtn} onClick={handleConnectFacebook}>
            + Connect Facebook
          </button>
        )}
        <button style={styles.viewBtn} onClick={() => navigate(`/dashboard?client=${client.id}`)}>
          View dashboard →
        </button>
      </div>
    </div>
  );
}
