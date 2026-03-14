import React from 'react';
import { formatNumber } from '../../utils/formatters.js';

const styles = {
  card: { background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px' },
  label: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 },
  value: { fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 4 },
  change: { fontSize: 13 },
};

export default function MetricCard({ label, value, change, changeLabel }) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const changeColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#888';
  const changeIcon = isPositive ? '↑' : isNegative ? '↓' : '→';

  return (
    <div style={styles.card}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{typeof value === 'string' ? value : formatNumber(value)}</div>
      {change != null && (
        <div style={{ ...styles.change, color: changeColor }}>
          {changeIcon} {Math.abs(change).toFixed(1)}% {changeLabel || 'vs last period'}
        </div>
      )}
    </div>
  );
}
