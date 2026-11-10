import brand from '../../../brand';

/**
 * One hue per platform, everywhere (DESIGN.md, Data series): LeetCode amber, Codeforces blue,
 * CodeChef coral, HackerRank green, GitHub slate, CodeStats violet. The order is the order of the
 * screens of the dashboard.
 */
export const PLATFORMS = [
  { key: 'leetcode', name: 'LeetCode', color: 'var(--ds-series-amber)' },
  { key: 'codeforces', name: 'Codeforces', color: 'var(--ds-series-blue)' },
  { key: 'codechef', name: 'CodeChef', color: 'var(--ds-series-coral)' },
  { key: 'hackerrank', name: 'HackerRank', color: 'var(--ds-series-green)' },
  { key: 'github', name: 'GitHub', color: 'var(--ds-series-slate)' },
  { key: 'scopecodestats', name: brand.codeStats.name, color: 'var(--ds-series-violet)' },
];

const FALLBACK = { key: 'other', name: 'Other', color: 'var(--ds-series-slate)' };

/** The platform with this key; a key the dashboard does not know is shown under its own name */
export const platformMeta = (key) => PLATFORMS.find((platform) => platform.key === key) || { ...FALLBACK, key, name: key ? String(key) : FALLBACK.name };
