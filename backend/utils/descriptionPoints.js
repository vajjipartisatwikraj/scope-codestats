// Achievement descriptions are stored as an array of bullet points.
// Each point and the number of points are bounded.

const DESCRIPTION_LIMITS = {
  minPoints: 2,
  maxPoints: 5,
  minWords: 10,
  maxWords: 40,
  minChars: 100,
  maxChars: 400,
};

const countWords = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

// Accepts an array of points or a legacy single-string description (split on
// newlines / leading bullet markers so old records still render as points).
const normalizeDescriptionPoints = (input) => {
  const raw = Array.isArray(input) ? input : String(input || "").split(/\r?\n+/);

  return raw
    .map((point) =>
      String(point || "")
        .replace(/^\s*[-•*\u2022]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
};

// Message describing the first problem with a single point, or null.
const getPointError = (point) => {
  const text = String(point || "").trim();
  const words = countWords(text);
  const { minWords, maxWords, minChars, maxChars } = DESCRIPTION_LIMITS;

  if (words < minWords) return `needs at least ${minWords} words (has ${words})`;
  if (words > maxWords) return `must be at most ${maxWords} words (has ${words})`;
  if (text.length < minChars)
    return `needs at least ${minChars} characters (has ${text.length})`;
  if (text.length > maxChars)
    return `must be at most ${maxChars} characters (has ${text.length})`;
  return null;
};

// Message describing the first problem with the whole description, or null.
const validateDescriptionPoints = (input) => {
  const points = normalizeDescriptionPoints(input);
  const { minPoints, maxPoints } = DESCRIPTION_LIMITS;

  if (points.length < minPoints) {
    return `Description needs at least ${minPoints} points (has ${points.length})`;
  }
  if (points.length > maxPoints) {
    return `Description can have at most ${maxPoints} points (has ${points.length})`;
  }

  for (let i = 0; i < points.length; i += 1) {
    const error = getPointError(points[i]);
    if (error) return `Point ${i + 1} ${error}`;
  }

  return null;
};

module.exports = {
  DESCRIPTION_LIMITS,
  countWords,
  normalizeDescriptionPoints,
  getPointError,
  validateDescriptionPoints,
};
