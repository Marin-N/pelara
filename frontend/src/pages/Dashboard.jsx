import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClients } from '../hooks/useClients.js';
import EmptyState from '../components/Common/EmptyState.jsx';

const styles = {
  title: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { color: '#888', fontSize: 14, marginBottom: 32 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 },
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px' },
};

export default function Dashboard() {
  const [params] = useSearchParams();
  const clientId = params.get('client');
  const { clients, loading } = useClients();

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : clients[0];

  if (!loading && !clients.length) {
    return (
      <EmptyState
        title="No clients yet"
        message="Add your first client to start seeing their analytics here."
      />
    );
  }

  return (
    <div>
      <div style={styles.title}>
        {selectedClient ? selectedClient.name : 'Dashboard'}
      </div>
      <div style={styles.sub}>
        {selectedClient ? `${selectedClient.city || ''} · ${selectedClient.business_type || 'Local Business'}` : 'Select a client to view analytics'}
      </div>

      {/* Metric cards — will show real data once Google/GBP integrations are built in Session 4+ */}
      <div style={styles.grid}>
        {[
          { label: 'GBP Views', value: '—' },
          { label: 'Calls', value: '—' },
          { label: 'Website Clicks', value: '—' },
          { label: 'Reviews', value: '—' },
        ].map(({ label, value }) => (
          <div key={label} style={styles.card}>
            <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Connect data source to see metrics</div>
          </div>
        ))}
      </div>
    </div>
  );
}
