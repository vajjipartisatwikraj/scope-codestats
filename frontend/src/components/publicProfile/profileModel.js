/**
 * What the public profile page works out from the one answer of GET /api/users/public/:username:
 * the platforms, the figures behind each chart, the streaks, the class year and the safe links.
 * Plain functions, no React, so every part of the page reads the data the same way.
 */

// ---- Links -----------------------------------------------------------------------------------

/** A link is only followed when it is http or https */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** The LinkedIn address from a full link, a link without "https://", or just the profile name */
export function linkedinHref(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/linkedin\.com/i.test(text)) return safeUrl(/^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, '')}`);
  return safeUrl(`https://www.linkedin.com/in/${encodeURIComponent(text.replace(/^\/+|\/+$/g, ''))}`);
}

/** The address of this profile on this site, from the name in the URL */
export const profileUrl = (username) => `${window.location.origin}/public-profile/${encodeURIComponent(username)}`;

// ---- People ----------------------------------------------------------------------------------

/** "satwik raj" -> "Satwik Raj" */
export const titleCase = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s.'-])([a-z])/g, (match, lead, letter) => `${lead}${letter.toUpperCase()}`);

/**
 * The year of study from the graduating year. The academic year turns over in April, so before April
 * a student is still in the previous year.
 */
export function yearLabel(graduatingYear, now = new Date()) {
  const graduating = parseInt(graduatingYear, 10);
  if (!Number.isFinite(graduating)) return null;
  const yearsLeft = now.getMonth() >= 3 ? graduating - now.getFullYear() : graduating - now.getFullYear() + 1;

  if (yearsLeft > 4) return 'Incoming student';
  if (yearsLeft === 4) return 'First year';
  if (yearsLeft === 3) return 'Second year';
  if (yearsLeft === 2) return 'Third year';
  if (yearsLeft === 1 || yearsLeft === 0) return 'Fourth year';
  if (yearsLeft >= -4) return 'Graduated';
  return 'Alumni';
}

// ---- Platforms -------------------------------------------------------------------------------

/**
 * Every platform the page knows. `color` is a series token, so the same platform has the same colour
 * in the donut, the bars and its card, in both themes.
 */
export const PLATFORMS = [
  { key: 'leetcode', name: 'LeetCode', color: 'var(--ds-series-amber)', url: (u) => `https://leetcode.com/u/${encodeURIComponent(u)}` },
  { key: 'codeforces', name: 'Codeforces', color: 'var(--ds-series-blue)', url: (u) => `https://codeforces.com/profile/${encodeURIComponent(u)}` },
  { key: 'codechef', name: 'CodeChef', color: 'var(--ds-series-coral)', url: (u) => `https://www.codechef.com/users/${encodeURIComponent(u)}` },
  { key: 'hackerrank', name: 'HackerRank', color: 'var(--ds-series-green)', url: (u) => `https://www.hackerrank.com/profile/${encodeURIComponent(u)}` },
  { key: 'github', name: 'GitHub', color: 'var(--ds-series-slate)', url: (u) => `https://github.com/${encodeURIComponent(u)}` },
  { key: 'scopecodestats', name: 'Scope CodeStats', color: 'var(--ds-series-violet)', url: null },
];

/** The platforms the student has, in the usual order, each with its stats as `data` and its profile link */
export function platformsOf(codingProfiles) {
  const profiles = codingProfiles && typeof codingProfiles === 'object' ? codingProfiles : {};
  return PLATFORMS.filter((platform) => profiles[platform.key]).map((platform) => {
    const data = profiles[platform.key];
    return { ...platform, data, href: platform.url && data.username ? platform.url(data.username) : null };
  });
}

/** The figure a metric reads from one platform */
const contestsOf = (platform) => (platform.key === 'scopecodestats' ? platform.data.totalPracticeArenaContests : platform.data.contestsParticipated) || 0;

/**
 * The four ways to compare platforms. Score, problems and contests are parts of one total (a donut);
 * ratings are separate quantities, so they get bars (`whole: false`).
 */
export const METRICS = [
  { key: 'score', label: 'Score', unit: 'Points', whole: true, skip: [], read: (p) => p.data.score || 0 },
  { key: 'problems', label: 'Problems', unit: 'Problems', whole: true, skip: ['github'], read: (p) => p.data.problemsSolved || 0 },
  { key: 'contests', label: 'Contests', unit: 'Contests', whole: true, skip: ['github', 'hackerrank'], read: contestsOf },
  { key: 'rating', label: 'Rating', unit: 'Rating', whole: false, skip: ['github', 'hackerrank'], read: (p) => p.data.rating || 0 },
];

/** [{ key, name, color, value }] for a metric: only the platforms that count for it and have something */
export function metricRows(platforms, metric) {
  return platforms
    .filter((platform) => !metric.skip.includes(platform.key))
    .map((platform) => ({ key: platform.key, name: platform.name, color: platform.color, value: metric.read(platform) }))
    .filter((row) => row.value > 0);
}

/** The most recent successful update of any platform, or null */
export function lastSyncOf(platforms) {
  const times = platforms.map((platform) => new Date(platform.data.lastUpdated).getTime()).filter((time) => Number.isFinite(time));
  return times.length ? new Date(Math.max(...times)) : null;
}

/** Easy, medium and hard problems added up over the platforms that report them */
export function difficultyTotals(platforms) {
  return platforms.reduce(
    (sum, platform) => ({
      easy: sum.easy + (platform.data.easyProblemsSolved || 0),
      medium: sum.medium + (platform.data.mediumProblemsSolved || 0),
      hard: sum.hard + (platform.data.hardProblemsSolved || 0),
    }),
    { easy: 0, medium: 0, hard: 0 }
  );
}

// ---- Activity --------------------------------------------------------------------------------

const DAY_MS = 86400000;
const dayNumber = (isoDate) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate));
  return match ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS) : NaN;
};

/** The longest run of days in a row with a problem solved, the run that is still going, and the best day */
export function streaksOf(dailyActivity) {
  const active = (Array.isArray(dailyActivity) ? dailyActivity : [])
    .filter((entry) => (entry.count || 0) > 0)
    .map((entry) => ({ day: dayNumber(entry.date), count: entry.count }))
    .filter((entry) => Number.isFinite(entry.day))
    .sort((a, b) => a.day - b.day);

  let longest = 0;
  let run = 0;
  let previous = null;
  let best = 0;
  active.forEach((entry) => {
    run = previous !== null && entry.day === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    best = Math.max(best, entry.count);
    previous = entry.day;
  });

  // The run counts as current when it reaches today or yesterday
  const today = Math.floor(Date.now() / DAY_MS);
  const current = previous !== null && today - previous <= 1 ? run : 0;
  return { longest, current, best };
}

// ---- Achievements ----------------------------------------------------------------------------

export const ACHIEVEMENT_TYPES = [
  { key: 'project', label: 'Projects', single: 'Project', empty: 'No projects yet' },
  { key: 'internship', label: 'Internships', single: 'Internship', empty: 'No internships yet' },
  { key: 'certification', label: 'Certifications', single: 'Certification', empty: 'No certifications yet' },
  { key: 'achievement', label: 'Achievements', single: 'Achievement', empty: 'No achievements yet' },
];

const MONTH_YEAR = new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' });

/** "Mar 2025" from a date, or the text as written when it is not a date */
export function monthYear(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : MONTH_YEAR.format(date);
}

/** "Mar 2025 to Aug 2025", "From Mar 2025", or just the one date there is */
export function rangeOf(startDate, endDate) {
  const start = monthYear(startDate);
  const end = monthYear(endDate);
  if (start && end) return start === end ? start : `${start} to ${end}`;
  if (start) return `From ${start}`;
  return end;
}

/** Who gave it or where it was done: the issuer, else the organisation's domain */
export const organizationOf = (achievement) => achievement.issuer || achievement.domainLink || '';

// ---- Education -------------------------------------------------------------------------------

/** "8.9 CGPA" or "91%"; empty without a score */
export function scoreText(entry) {
  if (entry.score === null || entry.score === undefined || entry.score === '') return '';
  return entry.scoreType === 'Percentage' ? `${entry.score}%` : `${entry.score} CGPA`;
}
