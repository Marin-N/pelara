import React from 'react';

export default function AlertBanner({ alerts = [] }) {
  if (!alerts.length) return null;

  const unread = alerts.filter((a) => !a.is_read);
  if (!unread.length) return null;

  return (
    <div style={{ background: '#7c2d12', border: '1px solid #b45309', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fde68a', marginBottom: 6 }}>
        🔔 {unread.length} unread alert{unread.length > 1 ? 's' : ''}
      </div>
      {unread.slice(0, 3).map((alert) => (
        <div key={alert.id} style={{ fontSize: 13, color: '#fcd34d', paddingLeft: 8, borderLeft: '2px solid #b45309', marginBottom: 4 }}>
          {alert.message}
        </div>
      ))}
    </div>
  );
}
