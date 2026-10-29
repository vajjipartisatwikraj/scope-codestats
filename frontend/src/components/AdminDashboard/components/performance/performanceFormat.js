/**
 * Labels, colours and the student table columns of the admin Performance screen.
 * Sort keys follow the API: "totalScore", or "<platform>.<number>" such as "leetcode.rating".
 */
import { SCORE_PLATFORMS } from "../../../Dashboard/progress/progressFormat";

export { chartColor, chartTheme, formatNumber, longDate, shortDate, signed, pluralize } from "../../../Dashboard/progress/progressFormat";

export const PLATFORM_LIST = SCORE_PLATFORMS;
export const platformMeta = (key) => SCORE_PLATFORMS.find((p) => p.key === key);

export const PERIODS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "3M" },
  { days: 180, label: "6M" },
  { days: 365, label: "1Y" },
];
export const DEFAULT_PERIOD = 30;

export const GROUP_BY = [
  { key: "department", label: "Department" },
  { key: "graduatingYear", label: "Graduating year" },
  { key: "section", label: "Section" },
];

export const PAGE_SIZES = [25, 50, 100];

/** "2026-10-26T10:00:00Z" -> a short local date and time */
export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : "-");

const PLATFORM_COLUMNS = {
  leetcode: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["problems", "Solved"], ["problemsGain", "Solved change", "gain"],
    ["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"],
    ["rating", "Rating"], ["ratingChange", "Rating change", "gain"], ["maxRating", "Max rating"],
    ["contests", "Contests"], ["contestsGain", "Contests change", "gain"],
  ],
  codeforces: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["problems", "Solved"], ["problemsGain", "Solved change", "gain"],
    ["rating", "Rating"], ["ratingChange", "Rating change", "gain"], ["maxRating", "Max rating"],
    ["contests", "Contests"], ["contestsGain", "Contests change", "gain"],
  ],
  codechef: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["problems", "Solved"], ["problemsGain", "Solved change", "gain"],
    ["rating", "Rating"], ["ratingChange", "Rating change", "gain"], ["maxRating", "Max rating"],
    ["contests", "Contests"], ["contestsGain", "Contests change", "gain"],
  ],
  hackerrank: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["problems", "Solved"], ["problemsGain", "Solved change", "gain"],
    ["badges", "Badges"], ["certificates", "Certificates"],
  ],
  github: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["commits", "Total commits"], ["contributions", "Contributions (last year)"],
    ["repos", "Repositories"], ["stars", "Stars"], ["followers", "Followers"],
  ],
  scopecodestats: [
    ["score", "Score"], ["scoreGain", "Score change", "gain"],
    ["problems", "Solved"], ["lifetimeScore", "Lifetime score"],
    ["cohortScore", "Cohort score"], ["cohortProblems", "Cohort problems"], ["cohortsCompleted", "Cohorts done"],
    ["practiceContests", "Practice contests"],
  ],
};

const identity = [
  { key: "name", label: "Student", get: (r) => r.name, kind: "text", sticky: true },
  { key: "rollNumber", label: "Roll no.", get: (r) => r.rollNumber, kind: "text" },
  { key: "department", label: "Dept", get: (r) => r.department, kind: "text" },
];

const summaryColumns = [
  ...identity,
  { key: "section", label: "Sec", get: (r) => r.section || "-", kind: "text" },
  { key: "graduatingYear", label: "Year", get: (r) => r.graduatingYear, kind: "plain" },
  { key: "totalScore", label: "Total score", get: (r) => r.totalScore },
  { key: "scoreGain", label: "Score change", get: (r) => r.scoreGain, kind: "gain" },
  { key: "totalProblems", label: "Problems solved", get: (r) => r.totalProblems },
  { key: "problemsGain", label: "Solved change", get: (r) => r.problemsGain, kind: "gain" },
  { key: "totalContests", label: "Contests", get: (r) => r.totalContests },
  { key: "contestsGain", label: "Contests change", get: (r) => r.contestsGain, kind: "gain" },
  { key: "platformsLinked", label: "Platforms", get: (r) => r.platformsLinked },
  { key: "consistencyIndex", label: "Consistency (7d)", get: (r) => r.consistencyIndex },
  { key: "activeDays", label: "Active days (7d)", get: (r) => r.activeDays },
];

/** Columns of the table for a view: "summary" or a platform key. */
export function columnsFor(view) {
  if (view === "summary" || !PLATFORM_COLUMNS[view]) return summaryColumns;
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
