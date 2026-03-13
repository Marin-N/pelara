import React from 'react';

export default function EmptyState({ title = 'Nothing here yet', message = '', action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
      <h3 style={{ color: '#ccc', marginBottom: 8 }}>{title}</h3>
      {message && <p style={{ marginBottom: 20 }}>{message}</p>}
      {action && action}
    </div>
  );
}
