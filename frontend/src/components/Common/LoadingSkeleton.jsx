import React from 'react';

const pulseStyle = {
  background: 'linear-gradient(90deg, #1e1e24 25%, #2a2a32 50%, #1e1e24 75%)',
  backgroundSize: '400% 100%',
  animation: 'skeleton-pulse 1.6s ease infinite',
  borderRadius: 6,
};

// Inject keyframe animation once
if (typeof document !== 'undefined' && !document.getElementById('skeleton-style')) {
  const style = document.createElement('style');
  style.id = 'skeleton-style';
  style.textContent = `@keyframes skeleton-pulse { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }`;
  document.head.appendChild(style);
}

// ── Primitives ────────────────────────────────────────────────────────────────

export const SkeletonBlock = ({ width = '100%', height = 16, style = {} }) => (
  <div style={{ ...pulseStyle, width, height, borderRadius: 6, ...style }} />
);

export const SkeletonCard = ({ style = {} }) => (
  <div style={{ background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', ...style }}>
    <SkeletonBlock width="45%" height={11} style={{ marginBottom: 12 }} />
    <SkeletonBlock width="55%" height={30} style={{ marginBottom: 8 }} />
    <SkeletonBlock width="35%" height={11} />
  </div>
);

// ── Preset skeletons for common page shapes ────────────────────────────────────

export const StatsGridSkeleton = ({ count = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
    {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }) => (
  <div style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid #1e1e24' }}>
    {Array.from({ length: cols }).map((_, i) => (
      <SkeletonBlock key={i} width={`${80 / cols}%`} height={13} style={{ flexShrink: 0 }} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div>
    {Array.from({ length: rows }).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}
  </div>
);

export const CardListSkeleton = ({ count = 3 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ background: '#18181c', border: '1px solid #2a2a2e', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
        <SkeletonBlock width="40%" height={16} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="70%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonBlock width="50%" height={11} />
      </div>
    ))}
  </div>
);

export default SkeletonBlock;
