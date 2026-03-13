import { format, parseISO } from 'date-fns';

/** Format a date string for chart axis labels: "2026-03-01" → "1 Mar" */
export const formatAxisDate = (dateStr) => {
  try {
    return format(parseISO(dateStr), 'd MMM');
  } catch {
    return dateStr;
  }
};

/** Calculate percentage change between two values */
export const calcChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

/** Returns 'positive', 'negative', or 'neutral' for a change value */
export const changeDirection = (change, higherIsBetter = true) => {
  if (change == null) return 'neutral';
  if (higherIsBetter) return change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
  return change < 0 ? 'positive' : change > 0 ? 'negative' : 'neutral';
};
