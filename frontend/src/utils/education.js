import {
  educationLevels,
  LEVEL_WITHOUT_STREAM,
  LEVEL_WITH_DEPARTMENT_STREAM,
  scoreLimits,
  scoreTypes,
} from "../constants/profileOptions";

const toMonthString = (value) => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
};

// Rows kept as-is for editing (blank rows survive), just shaped consistently.
export const asEditableEducation = (input) =>
  Array.isArray(input)
    ? input
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => ({
          level: educationLevels.includes(entry.level) ? entry.level : "",
          name: entry.name || "",
          startDate: toMonthString(entry.startDate),
          endDate: toMonthString(entry.endDate),
          scoreType: scoreTypes.includes(entry.scoreType)
            ? entry.scoreType
            : "CGPA",
          score:
            entry.score === null || entry.score === undefined
              ? ""
              : String(entry.score),
          stream: entry.stream || "",
        }))
    : [];

// School has no stream, Engineering always mirrors the user's department.
export const resolveStream = (level, stream, engineeringStream = "") => {
  if (level === LEVEL_WITHOUT_STREAM) return "";
  if (level === LEVEL_WITH_DEPARTMENT_STREAM) {
    return String(engineeringStream || stream || "").trim();
  }
  return String(stream || "").trim();
};

// Score out of range? Returns a message, otherwise null.
export const getScoreError = (scoreType, score) => {
  if (score === "" || score === null || score === undefined) return null;
  const num = Number(score);
  const max = scoreLimits[scoreType] ?? 100;
  if (!Number.isFinite(num) || num < 0 || num > max) {
    return `${scoreType} must be between 0.00 and ${max.toFixed(2)}`;
  }
  return null;
};

// First validation problem as a user-facing message, or null when everything
// checks out. Mirrors validateEducation in backend/utils/education.js.
export const validateEducation = (input) => {
  const entries = asEditableEducation(input);

  for (const entry of entries) {
    const label = entry.level || "Education";

    if (!entry.level) return "Please pick a level for every education entry";

    // "YYYY-MM" strings compare chronologically
    if (entry.startDate && entry.endDate && entry.startDate >= entry.endDate) {
      return `${label}: start date must be earlier than the end date`;
    }

    const scoreError = getScoreError(entry.scoreType, entry.score);
    if (scoreError) return `${label}: ${scoreError}`;
  }

  return null;
};

// Drops rows without a level, resolves the stream, and orders the entries
// School -> Engineering. Mirrors backend/utils/education.js.
export const normalizeEducation = (input, { engineeringStream = "" } = {}) =>
  asEditableEducation(input)
    .filter((entry) => entry.level)
    .map((entry) => ({
      ...entry,
      name: entry.name.trim(),
      stream: resolveStream(entry.level, entry.stream, engineeringStream),
      score: entry.score === "" ? null : Number(entry.score),
    }))
    .map((entry) => ({
      ...entry,
      score: Number.isFinite(entry.score) ? entry.score : null,
    }))
    .sort(
      (a, b) =>
        educationLevels.indexOf(a.level) - educationLevels.indexOf(b.level),
    );

// "2022-08" -> "Aug 2022"
export const formatMonth = (value) => {
  const month = toMonthString(value);
  if (!month) return "";
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

// "Aug 2022 - May 2026" / "Aug 2022 - Present"
export const formatDateRange = (startDate, endDate) => {
  const start = formatMonth(startDate);
  const end = formatMonth(endDate);
  if (!start && !end) return "";
  return `${start || "?"} - ${end || "Present"}`;
};
