/**
 * Labels and the student table columns of the performance screens. Sort keys follow the API:
 * "totalScore", or "<platform>.<number>" such as "leetcode.rating".
 */

export const PERIODS = [
  { key: '7', days: 7, label: '7 days' },
  { key: '30', days: 30, label: '30 days' },
  { key: '90', days: 90, label: '3 months' },
  { key: '180', days: 180, label: '6 months' },
  { key: '365', days: 365, label: '1 year' },
];
export const DEFAULT_PERIOD = 30;

export const GROUP_BY = [
  { key: 'department', label: 'Department' },
  { key: 'graduatingYear', label: 'Graduating year' },
  { key: 'section', label: 'Section' },
];

export const PAGE_SIZES = [25, 50, 100];

/** The measures the comparison can show, one at a time */
export const COMPARISON_METRICS = [
  { key: 'avgScore', label: 'Average score' },
  { key: 'avgProblems', label: 'Average problems solved' },
  { key: 'avgContests', label: 'Average contests' },
  { key: 'avgCommits', label: 'Average GitHub commits' },
  { key: 'avgScoreGain', label: 'Average score change', signed: true },
  { key: 'avgProblemsGain', label: 'Average problems change', signed: true },
  { key: 'activeRate', label: 'Active students', suffix: '%' },
];

/** The lists of leaders, one at a time */
export const LEADER_LISTS = [
  { key: 'score', label: 'Top scores' },
  { key: 'scoreGain', label: 'Biggest score change', signed: true },
  { key: 'problems', label: 'Most problems solved' },
  { key: 'problemsGain', label: 'Biggest problems change', signed: true },
  { key: 'contests', label: 'Most contests' },
];

export const STAT_LABELS = {
  score: 'Score',
  problems: 'Problems solved',
  easy: 'Easy problems',
  medium: 'Medium problems',
  hard: 'Hard problems',
  contests: 'Contests attended',
  badges: 'Badges',
  certificates: 'Certificates',
  commits: 'Total commits',
  contributions: 'Contributions (last year)',
  repos: 'Public repositories',
  stars: 'Stars received',
  followers: 'Followers',
  lifetimeScore: 'Lifetime score',
  cohortScore: 'Cohort score',
  cohortProblems: 'Cohort problems solved',
  cohortsCompleted: 'Cohorts completed',
  practiceContests: 'Practice arena contests',
};

// Ratings have their own section: a total or an average over unrated students means nothing.
export const SKIP_IN_STATS = ['rating', 'maxRating'];

const PLATFORM_COLUMNS = {
  leetcode: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['problems', 'Solved'], ['problemsGain', 'Solved change', 'gain'],
    ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'],
    ['rating', 'Rating'], ['ratingChange', 'Rating change', 'gain'], ['maxRating', 'Max rating'],
    ['contests', 'Contests'], ['contestsGain', 'Contests change', 'gain'],
  ],
  codeforces: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['problems', 'Solved'], ['problemsGain', 'Solved change', 'gain'],
    ['rating', 'Rating'], ['ratingChange', 'Rating change', 'gain'], ['maxRating', 'Max rating'],
    ['contests', 'Contests'], ['contestsGain', 'Contests change', 'gain'],
  ],
  codechef: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['problems', 'Solved'], ['problemsGain', 'Solved change', 'gain'],
    ['rating', 'Rating'], ['ratingChange', 'Rating change', 'gain'], ['maxRating', 'Max rating'],
    ['contests', 'Contests'], ['contestsGain', 'Contests change', 'gain'],
  ],
  hackerrank: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['problems', 'Solved'], ['problemsGain', 'Solved change', 'gain'],
    ['badges', 'Badges'], ['certificates', 'Certificates'],
  ],
  github: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['commits', 'Total commits'], ['contributions', 'Contributions (last year)'],
    ['repos', 'Repositories'], ['stars', 'Stars'], ['followers', 'Followers'],
  ],
  scopecodestats: [
    ['score', 'Score'], ['scoreGain', 'Score change', 'gain'],
    ['problems', 'Solved'], ['lifetimeScore', 'Lifetime score'],
    ['cohortScore', 'Cohort score'], ['cohortProblems', 'Cohort problems'], ['cohortsCompleted', 'Cohorts done'],
    ['practiceContests', 'Practice contests'],
  ],
};

const identity = [
  { key: 'name', label: 'Student', get: (row) => row.name, kind: 'text', sticky: true },
  { key: 'rollNumber', label: 'Roll no.', get: (row) => row.rollNumber, kind: 'text' },
  { key: 'department', label: 'Dept', get: (row) => row.department, kind: 'text' },
];

const summaryColumns = [
  ...identity,
  { key: 'section', label: 'Sec', get: (row) => row.section || '\u2013', kind: 'text' },
  { key: 'graduatingYear', label: 'Year', get: (row) => row.graduatingYear, kind: 'plain' },
  { key: 'totalScore', label: 'Total score', get: (row) => row.totalScore },
  { key: 'scoreGain', label: 'Score change', get: (row) => row.scoreGain, kind: 'gain' },
  { key: 'totalProblems', label: 'Problems solved', get: (row) => row.totalProblems },
  { key: 'problemsGain', label: 'Solved change', get: (row) => row.problemsGain, kind: 'gain' },
  { key: 'totalContests', label: 'Contests', get: (row) => row.totalContests },
  { key: 'contestsGain', label: 'Contests change', get: (row) => row.contestsGain, kind: 'gain' },
  { key: 'platformsLinked', label: 'Platforms', get: (row) => row.platformsLinked },
  { key: 'consistencyIndex', label: 'Consistency (7d)', get: (row) => row.consistencyIndex },
  { key: 'activeDays', label: 'Active days (7d)', get: (row) => row.activeDays },
];

/** Columns of the table for a view: "summary" or a platform key. */
export function columnsFor(view) {
  if (view === 'summary' || !PLATFORM_COLUMNS[view]) return summaryColumns;
  return [
    ...identity,
    ...PLATFORM_COLUMNS[view].map(([stat, label, kind]) => ({
      key: `${view}.${stat}`,
      label,
      kind,
      // null for a student who has not linked the platform
      get: (row) => row.platforms[view]?.[stat] ?? null,
    })),
  ];
}
