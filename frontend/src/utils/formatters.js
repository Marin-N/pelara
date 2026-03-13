/** Format a number with comma separators: 12345 → "12,345" */
export const formatNumber = (n) =>
  n == null ? '—' : Number(n).toLocaleString('en-GB');

/** Format as GBP currency: 199 → "£199.00" */
export const formatCurrency = (n) =>
  n == null ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

/** Format a percentage: 0.1234 → "12.34%" */
export const formatPercent = (n, decimals = 1) =>
  n == null ? '—' : `${(Number(n) * 100).toFixed(decimals)}%`;

/** Format a date: 2026-03-01 → "1 Mar 2026" */
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Format seconds as "2m 34s" */
export const formatDuration = (seconds) => {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
