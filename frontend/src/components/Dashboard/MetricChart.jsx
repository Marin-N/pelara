import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAxisDate } from '../../utils/chartHelpers.js';

export default function MetricChart({ data = [], dataKey, label, color = '#6c63ff' }) {
  if (!data.length) return <div style={{ color: '#555', padding: 20 }}>No data yet</div>;

  return (
    <div style={{ background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 16px' }}>
      {label && <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{label}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
          <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11, fill: '#666' }} />
          <YAxis tick={{ fontSize: 11, fill: '#666' }} />
          <Tooltip
            contentStyle={{ background: '#1e1e22', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
            labelFormatter={formatAxisDate}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
