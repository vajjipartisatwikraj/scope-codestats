/**
 * The rules of the control panel, with no React: how a run is named, when the nightly run happens,
 * and how durations and countdowns are written.
 */

/** The four states of a run: the word, the tone of its Badge */
export const SYNC_STATUS = {
  running: { label: 'Running', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'warning' },
};

/** The word and tone for a status the server may add later */
export const statusInfo = (status) => SYNC_STATUS[status] || { label: String(status || 'Unknown'), tone: 'neutral' };

/** The tone of the progress bar of a run */
export const barTone = (status) => ({ running: 'accent', completed: 'success', failed: 'danger', cancelled: 'warning' })[status] || 'accent';

export const PLATFORM_LABEL = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  hackerrank: 'HackerRank',
  github: 'GitHub',
};

const PLATFORM_URL = {
  leetcode: (name) => `https://leetcode.com/${name}`,
  codeforces: (name) => `https://codeforces.com/profile/${name}`,
  codechef: (name) => `https://www.codechef.com/users/${name}`,
  hackerrank: (name) => `https://www.hackerrank.com/${name}`,
  github: (name) => `https://github.com/${name}`,
};

/** The profile page of a username on a platform, or null when the platform is not known */
export const platformUrl = (platform, username) => (PLATFORM_URL[platform] && username ? PLATFORM_URL[platform](encodeURIComponent(username)) : null);

export const platformLabel = (platform) => PLATFORM_LABEL[platform] || (platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'Unknown');

/** The nightly sync runs at 12:00 AM IST, which is 18:30 UTC the day before. */
export function nextScheduledRun(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 30));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

/** "5h 12m 3s" */
export function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${minutes}m ${total % 60}s`;
}

/** "42s", "3m 5s", "1h 20m" */
export function formatDuration(seconds = 0) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** "850 ms" or "3.4 s" for the time a rank calculation took; "-" when it is not known */
export function formatMillis(ms) {
  if (ms === null || ms === undefined) return '\u2013';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** The share of profiles of a run that passed, as a whole percentage */
export function successRate(job) {
  const total = (job.updatedProfiles || 0) + (job.failedProfiles || 0);
  return total > 0 ? Math.round((job.updatedProfiles / total) * 100) : 0;
}

export const RANK_SOURCE = {
  cron: 'Nightly sync',
  admin: 'Admin sync',
  recompute: 'Recalculated',
};

export const RANK_STATUS = {
  completed: { label: 'Completed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  running: { label: 'Running', tone: 'info' },
};

export const rankStatusInfo = (status) => RANK_STATUS[status] || { label: String(status || 'Unknown'), tone: 'neutral' };

/** The text of the CSV of the failed profiles of a run, one row per profile */
export function failedProfilesCsv(rows) {
  const headers = ['User', 'Email', 'Department', 'Section', 'Platform', 'Username', 'Error code', 'Error', 'Time'];
  const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(cell).join(','),
    ...rows.map((row) =>
      [
        row.userName,
        row.userEmail,
        row.userDepartment,
        row.userSection,
        platformLabel(row.platform),
        row.platformUsername,
        row.errorCode,
        row.error,
        row.timestamp ? new Date(row.timestamp).toLocaleString() : '',
      ]
        .map(cell)
        .join(',')
    ),
  ].join('\n');
}
