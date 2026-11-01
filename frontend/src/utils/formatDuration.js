/**
 * `2h 05m 09s`, dropping empty leading units; an en dash-like "--" for a missing or negative value.
 * Used by the exam countdowns (cohort page banner, the exam bar).
 */
export const formatDuration = (ms) => {
  if (typeof ms !== 'number' || ms < 0) return '--';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  if (mins > 0) return `${mins}m ${pad(secs)}s`;
  return `${secs}s`;
};

export default formatDuration;
