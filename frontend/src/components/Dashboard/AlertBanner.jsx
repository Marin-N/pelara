import React from 'react';

// Parse severity from alert type string — type ends with _yellow / _orange / _red
const getSeverity = (type = '') => {
  if (type.endsWith('_red')) return 'red';
  if (type.endsWith('_orange')) return 'orange';
  return 'yellow';
};

const SEVERITY_STYLES = {
  red: {
    bg: '#3b0a0a',
    border: '#ef444444',
    dot: '#ef4444',
    text: '#fca5a5',
    header: '#ef4444',
  },
  orange: {
    bg: '#431407',
    border: '#f9731644',
    dot: '#f97316',
    text: '#fdba74',
    header: '#f97316',
  },
  yellow: {
    bg: '#422006',
    border: '#eab30844',
    dot: '#eab308',
    text: '#fde68a',
    header: '#eab308',
  },
};

const SEVERITY_LABEL = { red: 'Critical', orange: 'Warning', yellow: 'Notice' };

export default function AlertBanner({ alerts = [], onDismiss, onDismissAll }) {
  if (!alerts.length) return null;

  // Sort: red first, orange second, yellow last
  const ORDER = { red: 0, orange: 1, yellow: 2 };
  const sorted = [...alerts].sort((a, b) => ORDER[getSeverity(a.type)] - ORDER[getSeverity(b.type)]);

  const topSeverity = getSeverity(sorted[0]?.type);
  const palette = SEVERITY_STYLES[topSeverity];

  return (
    <div style={{
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.header }}>
          {alerts.length} unread alert{alerts.length > 1 ? 's' : ''}
        </div>
        {onDismissAll && (
          <button
            onClick={onDismissAll}
            style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer' }}
          >
            Mark all read
          </button>
        )}
      </div>

      {sorted.slice(0, 5).map((alert) => {
        const sev = getSeverity(alert.type);
        const p = SEVERITY_STYLES[sev];
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              padding: '7px 0',
              borderTop: `1px solid ${p.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
              <span style={{ color: p.dot, marginTop: 1, fontSize: 10 }}>●</span>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.dot, marginRight: 6 }}>
                  {SEVERITY_LABEL[sev]}
                </span>
                <span style={{ fontSize: 13, color: p.text }}>{alert.message}</span>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                style={{ background: 'none', border: 'none', color: '#444', fontSize: 16, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
                title="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {alerts.length > 5 && (
        <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
          +{alerts.length - 5} more — go to Alerts page to see all
        </div>
      )}
    </div>
  );
}
