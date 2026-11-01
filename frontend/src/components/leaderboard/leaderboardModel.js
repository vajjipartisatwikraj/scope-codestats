import brand from '../../brand';
/**
 * What the leaderboard knows how to do with the list of students the server sends: which
 * platforms and tabs exist, how a student's figures are read, and how the list is filtered,
 * sorted and ranked.
 *
 * Pure functions with no React in them. The server sends every student in one answer (GET
 * /api/leaderboard) and the page filters, sorts and ranks on the client, so a filter changes the
 * ranks at once and nothing is asked of the server again.
 */

/** The two lists the leaderboard can show */
export const TABS = [
  { key: 'score', label: 'By score', valueLabel: 'Total score', unit: 'pts' },
  { key: 'problems', label: 'By problems solved', valueLabel: 'Problems solved', unit: 'problems' },
];

/** One hue per platform everywhere (DESIGN.md: Data series) */
export const PLATFORMS = {
  leetcode: { name: 'LeetCode', color: 'var(--ds-series-amber)' },
  codechef: { name: 'CodeChef', color: 'var(--ds-series-coral)' },
  hackerrank: { name: 'HackerRank', color: 'var(--ds-series-green)' },
  codeforces: { name: 'Codeforces', color: 'var(--ds-series-blue)' },
  github: { name: 'GitHub', color: 'var(--ds-series-slate)' },
  scopecodestats: { name: brand.codeStats.name, color: 'var(--ds-series-violet)' },
};

/** The platform columns of each list. GitHub has no problems, so it is only in the score list. */
export const TAB_PLATFORMS = {
  score: ['leetcode', 'codechef', 'hackerrank', 'codeforces', 'github', 'scopecodestats'],
  problems: ['leetcode', 'hackerrank', 'codechef', 'codeforces', 'scopecodestats'],
};

export const DEPARTMENTS = ['AERO', 'CSC', 'CSD', 'CSE', 'CSIT', 'CSM', 'ECE', 'EEE', 'IT', 'MECH', 'OTHER'];
export const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const PAGE_SIZES = [25, 50, 100];

export const ALL = 'ALL';

// ---- Reading a student's figures -------------------------------------------------------------

/** Adds the figures the server does not send: the problems solved and the contests entered, over every platform */
export function enrich(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    problemsSolved: TAB_PLATFORMS.problems.reduce(
      (sum, platform) => sum + (Number(row.platforms?.[platform]?.problemsSolved) || 0),
      0
    ),
    contests: TAB_PLATFORMS.score.reduce(
      (sum, platform) => sum + (Number(row.platforms?.[platform]?.contestsParticipated) || 0),
      0
    ),
  }));
}

/**
 * The student who tops each of four measures among the rows given: the biggest climb in the last
 * 7 days, the most problems solved, the best consistency and the most contests entered. Each is
 * null when nobody has a figure above zero. A tie is settled by the total score, and `ties` says
 * how many other students share the figure.
 */
export function highlightsOf(rows) {
  const best = (read) => {
    let top = null;
    let ties = 0;
    rows.forEach((row) => {
      const value = read(row);
      if (!(value > 0)) return;
      if (!top || value > top.value) {
        top = { row, value };
        ties = 0;
      } else if (value === top.value) {
        ties += 1;
        if ((row.totalScore || 0) > (top.row.totalScore || 0)) top = { row, value };
      }
    });
    return top ? { ...top, ties } : null;
  };
  return {
    climb: best((row) => row.scoreChange || 0),
    solved: best((row) => row.problemsSolved || 0),
    steady: best((row) => Math.max(0, Math.min(5, Math.round(row.consistencyIndex || 0)))),
    contests: best((row) => row.contests || 0),
  };
}

/** The figure a list ranks by: the total score, or the problems solved */
export const valueOf = (row, tab) => (tab === 'problems' ? row.problemsSolved || 0 : row.totalScore || 0);

/** One platform's figure in the current list, or null when the student has not linked the platform */
export function platformValue(row, platform, tab) {
  const stats = row.platforms?.[platform];
  if (!stats) return null;
  return tab === 'problems' ? Number(stats.problemsSolved) || 0 : Number(stats.score) || 0;
}

// ---- Ranks -------------------------------------------------------------------------------------

/**
 * Standard competition ranking by the figure of the list: students with the same figure share a
 * rank and the next rank skips (1, 1, 3). Returns a Map from student id to rank.
 */
export function rankMap(rows, tab) {
  const ordered = [...rows].sort((a, b) => valueOf(b, tab) - valueOf(a, tab));
  const ranks = new Map();
  let rank = 0;
  let previous = null;
  ordered.forEach((row, index) => {
    const value = valueOf(row, tab);
    if (value !== previous) {
      rank = index + 1;
      previous = value;
    }
    ranks.set(row._id, rank);
  });
  return ranks;
}

/** The rank of each student inside their own department, among all the students of the list */
export function departmentRankMap(rows, tab) {
  const byDepartment = new Map();
  rows.forEach((row) => {
    const key = row.department || '';
    if (!byDepartment.has(key)) byDepartment.set(key, []);
    byDepartment.get(key).push(row);
  });
  const ranks = new Map();
  byDepartment.forEach((members) => {
    rankMap(members, tab).forEach((rank, id) => ranks.set(id, rank));
  });
  return ranks;
}

// ---- Filtering -----------------------------------------------------------------------------------

export const EMPTY_FILTERS = { search: '', department: ALL, year: ALL, section: ALL };

export const hasFilters = (filters) =>
  filters.search.trim() !== '' || filters.department !== ALL || filters.year !== ALL || filters.section !== ALL;

/**
 * Keeps the students that match every filter. `yearOf(graduatingYear)` says which year of study a
 * student is in ("Third Year"), from the academic year configuration.
 */
export function filterRows(rows, filters, yearOf) {
  const needle = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.department !== ALL && row.department !== filters.department) return false;
    if (filters.section !== ALL && row.section !== filters.section) return false;
    if (filters.year !== ALL && yearOf(row.graduatingYear) !== filters.year) return false;
    if (needle) {
      const haystack = `${row.name || ''} ${row.email || ''} ${row.rollNumber || ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

// ---- Sorting ---------------------------------------------------------------------------------------

export const DEFAULT_SORT = { key: 'value', dir: 'desc' };

/** Columns that read as words sort A to Z first; the numbers sort from the biggest */
const TEXT_KEYS = new Set(['name', 'department', 'section']);
export const firstDirection = (key) => (TEXT_KEYS.has(key) ? 'asc' : 'desc');

/**
 * Click on a column: a new column sorts in its natural direction, the same column again reverses
 * it, and a third click goes back to the default (the figure of the list, biggest first).
 */
export function nextSort(current, key) {
  if (current.key !== key) return { key, dir: firstDirection(key) };
  if (current.dir === firstDirection(key)) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return DEFAULT_SORT;
}

function sortValue(row, key, tab) {
  if (key === 'value') return valueOf(row, tab);
  if (key === 'name') return (row.name || '').toLowerCase();
  if (key === 'department') return row.department || '';
  if (key === 'section') return row.section || '';
  if (key === 'year') return row.graduatingYear || 0;
  if (key === 'consistency') return row.consistencyIndex || 0;
  if (key === 'change') return row.scoreChange || 0;
  if (key.startsWith('platform:')) return platformValue(row, key.slice('platform:'.length), tab) ?? -1;
  return 0;
}

/** Sorts a copy of the rows. Ties are settled by the list's figure, then by name, so the order never jumps. */
export function sortRows(rows, sort, tab) {
  const direction = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = sortValue(a, sort.key, tab);
    const y = sortValue(b, sort.key, tab);
    const primary = typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y)) : x - y;
    if (primary !== 0) return direction * primary;
    const byValue = valueOf(b, tab) - valueOf(a, tab);
    if (byValue !== 0) return byValue;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// ---- The signed-in student ---------------------------------------------------------------------------

/** The row of the signed-in student: matched by email, then by roll number */
export function findOwnRow(rows, user) {
  if (!user || rows.length === 0) return null;
  const email = (user.email || '').toLowerCase();
  let own = email ? rows.find((row) => (row.email || '').toLowerCase() === email) : null;
  if (!own && user.rollNumber) {
    const roll = String(user.rollNumber).toLowerCase();
    own = rows.find((row) => row.rollNumber && String(row.rollNumber).toLowerCase() === roll) || null;
  }
  return own;
}

/** What the consistency index (0 to 5) means in days of the last 7, for the hint */
export const CONSISTENCY_DAYS = ['0 or 1 days', '2 days', '3 days', '4 days', '5 days', '6 or 7 days'];

export const consistencyHint = (index) =>
  `Active on ${CONSISTENCY_DAYS[Math.max(0, Math.min(5, Math.round(index || 0)))]} of the last 7`;
