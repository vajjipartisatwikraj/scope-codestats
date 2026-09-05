// Helpers for User.education:
// [{ level, name, startDate, endDate, scoreType, score, stream }]

const EDUCATION_LEVELS = ["School", "Intermediate", "Diploma", "Engineering"];
const SCORE_TYPES = ["CGPA", "Percentage"];

// Level a stream/branch does not apply to
const LEVEL_WITHOUT_STREAM = "School";

// Level whose stream is always the user's department
const LEVEL_WITH_DEPARTMENT_STREAM = "Engineering";

// Highest allowed value per score type (minimum is 0.00 for both)
const SCORE_LIMITS = { CGPA: 10, Percentage: 100 };

const toMonthString = (value) => {
  const text = String(value === undefined || value === null ? "" : value).trim();
  // Accept "YYYY-MM" (month input) and "YYYY-MM-DD" / ISO dates
  const match = text.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
};

const toScore = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

// School has no stream, Engineering always mirrors the user's department.
const resolveStream = (level, stream, engineeringStream) => {
  if (level === LEVEL_WITHOUT_STREAM) return "";
  if (level === LEVEL_WITH_DEPARTMENT_STREAM) {
    return String(engineeringStream || stream || "").trim();
  }
  return String(stream || "").trim();
};

// Drops unusable rows, trims text, and orders entries School -> Engineering.
// `engineeringStream` (the user's department) always wins for Engineering rows.
const normalizeEducation = (input, { engineeringStream = "" } = {}) => {
  if (!Array.isArray(input)) return [];

  return input
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const level = EDUCATION_LEVELS.includes(entry.level) ? entry.level : "";
      const scoreType = SCORE_TYPES.includes(entry.scoreType)
        ? entry.scoreType
        : "CGPA";

      return {
        level,
        name: String(entry.name || "").trim(),
        startDate: toMonthString(entry.startDate),
        endDate: toMonthString(entry.endDate),
        scoreType,
        score: toScore(entry.score),
        stream: resolveStream(level, entry.stream, engineeringStream),
      };
    })
    .filter((entry) => entry.level)
    .sort(
      (a, b) =>
        EDUCATION_LEVELS.indexOf(a.level) - EDUCATION_LEVELS.indexOf(b.level),
    );
};

// Returns the first problem found as a user-facing message, or null when valid.
const validateEducation = (entries) => {
  if (!Array.isArray(entries)) return null;

  for (const entry of entries) {
    const label = entry.level || "Education";

    // "YYYY-MM" strings compare chronologically
    if (entry.startDate && entry.endDate && entry.startDate >= entry.endDate) {
      return `${label}: start date must be earlier than the end date`;
    }

    if (entry.score !== null && entry.score !== undefined) {
      const max = SCORE_LIMITS[entry.scoreType];
      if (entry.score < 0 || entry.score > max) {
        return `${label}: ${entry.scoreType} must be between 0.00 and ${max.toFixed(2)}`;
      }
    }
  }

  return null;
};

module.exports = {
  EDUCATION_LEVELS,
  SCORE_TYPES,
  SCORE_LIMITS,
  LEVEL_WITHOUT_STREAM,
  LEVEL_WITH_DEPARTMENT_STREAM,
  normalizeEducation,
  validateEducation,
};
