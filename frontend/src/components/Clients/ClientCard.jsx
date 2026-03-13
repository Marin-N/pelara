import React from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', transition: 'border-color 0.15s' },
  name: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 4 },
  meta: { fontSize: 13, color: '#888' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, marginTop: 10 },
};

export default function ClientCard({ client }) {
  const navigate = useNavigate();
  const isActive = client.is_active;

  return (
    <div
      style={{ ...styles.card }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = '#6c63ff')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = '#2a2a2e')}
      onClick={() => navigate(`/dashboard?client=${client.id}`)}
    >
      <div style={styles.name}>{client.name}</div>
      <div style={styles.meta}>{client.city ? `${client.city}, ` : ''}{client.country || 'GB'}</div>
      <div style={styles.meta}>{client.business_type || 'Local Business'}</div>
      <span style={{ ...styles.badge, background: isActive ? '#14532d' : '#3b0a0a', color: isActive ? '#22c55e' : '#ef4444' }}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}
