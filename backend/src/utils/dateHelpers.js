/**
 * Date utilities — always work in UTC, format only at display layer.
 */

/** Returns ISO date string YYYY-MM-DD for a given Date object (UTC) */
const toDateString = (date) => date.toISOString().slice(0, 10);

/** Returns a Date for N days ago from today (UTC midnight) */
const daysAgo = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/** Returns { from, to } as YYYY-MM-DD strings for the last N days */
const lastNDays = (n) => ({
  from: toDateString(daysAgo(n)),
  to: toDateString(new Date()),
});

/** Parse a YYYY-MM-DD string into a UTC midnight Date */
const parseDate = (str) => {
  const d = new Date(str + 'T00:00:00Z');
  if (isNaN(d.getTime())) throw new Error(`Invalid date: ${str}`);
  return d;
};

module.exports = { toDateString, daysAgo, lastNDays, parseDate };
