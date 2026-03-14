import React from 'react';
import ClientCard from './ClientCard.jsx';
import EmptyState from '../Common/EmptyState.jsx';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';

export default function ClientList({ clients, loading, error, onEdit }) {
  if (loading) return <LoadingSpinner />;
  if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  if (!clients.length) {
    return (
      <EmptyState
        title="No clients yet"
        message="Add your first client to start tracking their performance."
      />
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
      {clients.map((c) => <ClientCard key={c.id} client={c} onEdit={onEdit} />)}
    </div>
  );
}
