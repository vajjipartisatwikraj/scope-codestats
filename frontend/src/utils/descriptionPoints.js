// Achievement descriptions are a list of bullet points, each with word and
// character bounds. Mirrors backend/utils/descriptionPoints.js.

export const DESCRIPTION_LIMITS = {
  minPoints: 2,
  maxPoints: 5,
  minWords: 10,
  maxWords: 40,
  minChars: 100,
  maxChars: 400,
};

export const countWords = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

// Keeps blank points so rows stay editable in the form.
export const asEditablePoints = (input) => {
  if (Array.isArray(input)) return input.map((point) => String(point || ""));
  // Legacy single-string description
  return String(input || "")
    .split(/\r?\n+/)
    .map((point) => point.replace(/^\s*[-•*\u2022]\s*/, ""));
};

// Drops blank points, used for display and before sending to the API.
export const normalizeDescriptionPoints = (input) =>
  asEditablePoints(input)
    .map((point) => point.replace(/^\s*[-•*\u2022]\s*/, "").trim())
    .filter(Boolean);

// Message describing the first problem with a single point, or null.
export const getPointError = (point) => {
  const text = String(point || "").trim();
  const words = countWords(text);
  const { minWords, maxWords, minChars, maxChars } = DESCRIPTION_LIMITS;

  if (words < minWords) return `Needs at least ${minWords} words (has ${words})`;
  if (words > maxWords) return `Must be at most ${maxWords} words (has ${words})`;
  if (text.length < minChars)
    return `Needs at least ${minChars} characters (has ${text.length})`;
  if (text.length > maxChars)
    return `Must be at most ${maxChars} characters (has ${text.length})`;
  return null;
};

// Message describing the first problem with the whole description, or null.
export const validateDescriptionPoints = (input) => {
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
    if (error) return `Point ${i + 1}: ${error.toLowerCase()}`;
  }

  return null;
};
