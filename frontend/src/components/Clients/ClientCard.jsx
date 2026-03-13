import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const styles = {
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', transition: 'border-color 0.15s' },
  name: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4, cursor: 'pointer' },
  meta: { fontSize: 13, color: '#888' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, marginTop: 10 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  connectBtn: { background: '#1a2e1a', border: '1px solid #22c55e22', color: '#22c55e', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  connectedTag: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#22c55e' },
  viewBtn: { background: 'none', border: '1px solid #2a2a2e', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
};

export default function ClientCard({ client }) {
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();
  const isActive = client.is_active;
  const googleConnected = client.has_google_connected;

  const handleConnectGoogle = async (e) => {
    e.stopPropagation();
    // Fetch the Google OAuth redirect URL from our backend (JWT-authenticated),
    // then redirect the browser to that URL. We can't do a direct browser redirect
    // to a JWT-protected route, so we POST to get the URL first.
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`/api/auth/google/url?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Failed to start Google OAuth', err);
    }
  };

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

      <div style={styles.footer}>
        <span style={{ ...styles.badge, background: isActive ? '#14532d' : '#3b0a0a', color: isActive ? '#22c55e' : '#ef4444' }}>
          {isActive ? 'Active' : 'Inactive'}
        </span>

        {googleConnected ? (
          <div style={styles.connectedTag}>
            <span>✓</span> Google connected
          </div>
        ) : (
          <button style={styles.connectBtn} onClick={handleConnectGoogle}>
            + Connect Google
          </button>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          style={styles.viewBtn}
          onClick={() => navigate(`/dashboard?client=${client.id}`)}
        >
          View dashboard →
        </button>
      </div>
    </div>
  );
}
