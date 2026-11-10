/**
 * Numbers, dates and colours of the admin dashboard, with no React.
 */
import { formatNumber } from '../../ui/format';

export { formatNumber };

/** +5 / −3 / 0, with a real minus sign (design/screens.md section 21). null is not measured. */
export const signed = (value) => {
  if (value === null || value === undefined) return '\u2013';
  if (value > 0) return `+${formatNumber(value)}`;
  if (value < 0) return `\u2212${formatNumber(Math.abs(value))}`;
  return '0';
};

/** "2026-10-22" -> "Oct 22" (the key is a calendar date, so no time zone shifts it) */
export const shortDate = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-10-22" -> "22 Oct 2026" */
export const longDate = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "2026-10" -> "Oct 2026" */
export const monthLabel = (key) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "2026-10-26T10:00:00Z" -> "26 Oct, 3:30 pm" in IST */
export const loadedAt = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    : '\u2013';

export const percentOf = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** The eight data series in the order of DESIGN.md (Data series): one colour per category, cycling */
const SERIES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green', 'sky', 'slate'];
export const seriesColor = (index) => `var(--ds-series-${SERIES[index % SERIES.length]})`;
