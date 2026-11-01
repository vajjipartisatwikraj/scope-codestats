/**
 * The questions of a module as the page shows them: their order, status, labels and filters. No
 * React and no network.
 *
 * A question of the list (GET /cohorts/:id/modules/:moduleId/questions) carries only
 * { _id, title, type, difficultyLevel, marks, stats }.
 */

/** The three difficulties, in the order they are listed. The word carries the meaning; the tone is a second cue. */
export const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', tone: 'success' },
  { key: 'medium', label: 'Medium', tone: 'warning' },
  { key: 'hard', label: 'Hard', tone: 'danger' },
];

export const difficultyOf = (question) => DIFFICULTIES.find((entry) => entry.key === question?.difficultyLevel) || null;

/**
 * The questions in the order the teacher set them (the module's own list of ids). The server answers
 * in storage order, which is not the authored order. Questions the module does not list keep their
 * place at the end.
 */
export function orderQuestions(questions, module) {
  const position = new Map((module?.questions || []).map((entry, index) => [String(entry && entry._id ? entry._id : entry), index]));
  return questions
    .map((question, index) => ({ question, index, at: position.has(String(question._id)) ? position.get(String(question._id)) : Infinity }))
    .sort((a, b) => (a.at === b.at ? a.index - b.index : a.at - b.at))
    .map((entry) => entry.question);
}

/**
 * The share of submissions that were accepted, as a whole percentage, or null while nobody has
 * submitted (no submissions is not 0%).
 */
export function acceptanceRate(question) {
  const total = Number(question?.stats?.totalSubmissions);
  const accepted = Number(question?.stats?.acceptedSubmissions);
  if (!(total > 0)) return null;
  return Math.round((Math.min(accepted || 0, total) / total) * 100);
}

/** The label of the one button on a question's row, by where the student stands */
export const ACTION_LABELS = { new: 'Solve', attempted: 'Attempted', solved: 'Solved' };

/** 'solved', 'attempted' (tried, not solved yet) or 'new' */
export function questionStatus(question, byQuestion) {
  const entry = byQuestion.get(String(question._id));
  if (entry?.solved) return 'solved';
  if (entry && entry.attempts > 0) return 'attempted';
  return 'new';
}

/** { easy: { total, solved }, medium: ..., hard: ... } */
export function difficultyBreakdown(questions, byQuestion) {
  const result = Object.fromEntries(DIFFICULTIES.map((entry) => [entry.key, { total: 0, solved: 0 }]));
  questions.forEach((question) => {
    const bucket = result[question.difficultyLevel];
    if (!bucket) return;
    bucket.total += 1;
    if (questionStatus(question, byQuestion) === 'solved') bucket.solved += 1;
  });
  return result;
}

// ---- Filters ---------------------------------------------------------------------------------

export const STATUS_OPTIONS = [
  { key: 'all', label: 'All questions' },
  { key: 'solved', label: 'Solved' },
  { key: 'unsolved', label: 'Not solved' },
];

export const EMPTY_FILTERS = { search: '', status: 'all', difficulty: 'all' };

export const hasFilters = (filters) => Boolean(filters.search.trim()) || filters.status !== 'all' || filters.difficulty !== 'all';

/** The questions that match the search (title), the status and the difficulty */
export function filterQuestions(questions, filters, byQuestion) {
  const term = filters.search.trim().toLowerCase();
  return questions.filter((question) => {
    if (term && !String(question.title || '').toLowerCase().includes(term)) return false;
    if (filters.difficulty !== 'all' && question.difficultyLevel !== filters.difficulty) return false;
    const solved = questionStatus(question, byQuestion) === 'solved';
    if (filters.status === 'solved' && !solved) return false;
    if (filters.status === 'unsolved' && solved) return false;
    return true;
  });
}

/** The active filters in words, for the "nothing matches" message */
export function describeFilters(filters) {
  const parts = [];
  if (filters.search.trim()) parts.push(`search \u201C${filters.search.trim()}\u201D`);
  if (filters.status !== 'all') parts.push(STATUS_OPTIONS.find((entry) => entry.key === filters.status)?.label.toLowerCase() || filters.status);
  if (filters.difficulty !== 'all') parts.push(`${filters.difficulty} difficulty`);
  return parts;
}
