/**
 * Labels, colours and number formats shared by the Progress tab charts.
 */
import { platforms } from "../dashboardUtils";

// The platforms the Progress tab covers, in the order the backend lists them.
const PROGRESS_KEYS = ["leetcode", "codeforces", "codechef", "hackerrank", "github"];

export const PROGRESS_PLATFORMS = PROGRESS_KEYS.map((key) => platforms.find((p) => p.key === key));

// The platforms that have a score (and so a score and rank history), including the internal
// Scope CodeStats score. Same order as the backend (config/rankings.js).
const SCORE_KEYS = ["leetcode", "codeforces", "codechef", "hackerrank", "github", "scopecodestats"];

export const SCORE_PLATFORMS = SCORE_KEYS.map((key) => platforms.find((p) => p.key === key));

export const RANGE_OPTIONS = [
  { days: 7, label: "7D" },
  { days: 30, label: "30D" },
  { days: 90, label: "3M" },
  { days: 180, label: "6M" },
  { days: 365, label: "1Y" },
];
export const DEFAULT_RANGE_DAYS = 90;

// GitHub's brand colour is near-black, which disappears on dark cards.
export const chartColor = (platform, darkMode) =>
  platform.key === "github" ? (darkMode ? "#9be9a8" : "#2da44e") : platform.color;

// Series colours that work on both themes
export const SERIES = {
  problems: "#0585E0",
  rating: "#f5a524",
  contests: "#a855f7",
  gain: "#22c55e",
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
  commits: "#22c55e",
  pullRequests: "#3b82f6",
  merged: "#a855f7",
  repos: "#f59e0b",
  contributions: "#16a34a",
};

export const PIE_COLORS = ["#0585E0", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6"];

/** "2026-10-22" -> "Oct 22" (the key is a calendar date, so no timezone shifts). */
export const shortDate = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "2026-10-22" -> "Oct 22, 2026" */
export const longDate = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

/** The label of a bucket on a bar chart's axis. */
export function bucketLabel(bucket, granularity) {
  if (granularity === "month") {
    return new Date(`${bucket.start}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return shortDate(bucket.start);
}

/** The full description of a bucket, for tooltips: "Oct 5 - Oct 11" or "Oct 5". */
export function bucketRange(bucket) {
  return bucket.start === bucket.end ? longDate(bucket.start) : `${shortDate(bucket.start)} - ${shortDate(bucket.end)}`;
}

export const formatNumber = (value) =>
  value === null || value === undefined ? "-" : Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

/** +5 / -3 / 0 */
export const signed = (value) => {
  if (value === null || value === undefined) return "-";
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
};

export const pluralize = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? "" : "s"}`;

/** 18 -> "#18" */
export const formatRank = (rank) => (rank === null || rank === undefined ? "-" : `#${formatNumber(rank)}`);

/**
 * A rank change, as the server sends it: positions gained (positive = moved up the table).
 * 12 -> "Up 12 places", -3 -> "Down 3 places", 0 -> "No change".
 */
export function placesText(change) {
  if (change === null || change === undefined) return "-";
  if (change === 0) return "No change";
  return `${change > 0 ? "Up" : "Down"} ${pluralize(Math.abs(change), "place")}`;
}

/** Colour for a rank or score change: green when it improved, red when it got worse. */
export const changeColor = (change) =>
  change > 0 ? SERIES.gain : change < 0 ? SERIES.hard : undefined;

/** Percentile 85.6 (better than 85.6% of students) -> "Top 14%". Never "Top 0%". */
export const topPercentText = (percentile) =>
  percentile === null || percentile === undefined ? "-" : `Top ${Math.max(1, Math.round(100 - percentile))}%`;

/** Theme-aware colours for axes, grids and tooltips. */
export function chartTheme(darkMode) {
  return {
    text: darkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)",
    grid: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    tooltip: {
      backgroundColor: darkMode ? "rgba(20,20,20,0.96)" : "rgba(255,255,255,0.98)",
      border: `1px solid ${darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
      borderRadius: 8,
      color: darkMode ? "#fff" : "#111",
      fontSize: 12,
    },
  };
}
