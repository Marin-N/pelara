import React from 'react';

export default function EmptyState({
  // New props
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  // Legacy props for backwards compat
  message,
  action,
}) {
  const displayIcon = icon || '📭';
  const displayTitle = title || 'Nothing here yet';
  const displaySubtitle = subtitle || message || '';

  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{displayIcon}</div>
      <h3 style={{ color: '#ccc', marginBottom: 8, fontSize: 16, fontWeight: 600 }}>{displayTitle}</h3>
      {displaySubtitle && <p style={{ marginBottom: 20, fontSize: 14 }}>{displaySubtitle}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{ background: '#6c63ff', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
        >
          {actionLabel}
        </button>
      )}
      {/* Legacy action prop */}
      {action && !actionLabel && action}
    </div>
  );
}
