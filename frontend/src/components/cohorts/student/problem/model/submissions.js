/**
 * Reading a list of submissions: the figures of one submission, its status in words, and the
 * filtering and sorting of the "All users" table. No React and no network.
 */

/** The server has used several field names over time; the first one present wins */
const firstPresent = (submission, keys) => {
  const key = keys.find((name) => submission[name] !== undefined && submission[name] !== null);
  return key ? submission[key] : 0;
};

export const timeOf = (submission) => firstPresent(submission, ['executionTime', 'maxExecutionTime', 'time']);
export const memoryOf = (submission) => firstPresent(submission, ['memoryUsed', 'maxMemoryUsed', 'memory']);

export const isAccepted = (submission) => submission.status === 'accepted';

/** { label, tone } for a submission status: a word and a tone, never colour alone */
export function statusOf(submission) {
  if (isAccepted(submission)) return { label: 'Accepted', tone: 'success' };
  if (submission.status === 'pending') return { label: 'Pending', tone: 'warning' };
  const label = submission.status ? submission.status.replace('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase()) : 'Unknown';
  return { label, tone: 'danger' };
}

/** 'solved', 'attempted' or null for a question, from the student's own submissions */
export function progressOf(submissions) {
  if (!submissions || submissions.length === 0) return null;
  return submissions.some(isAccepted) ? 'solved' : 'attempted';
}

/** The share of submissions accepted, as a whole percentage */
export function acceptedShare(list) {
  if (!list.length) return 0;
  return Math.round((list.filter(isAccepted).length / list.length) * 100);
}

/** The option a student picked in an MCQ submission, with its letter */
export function pickedOption(submission, options) {
  if (!submission.selectedOption || !options?.length) return null;
  const index = options.findIndex((option) => String(option._id) === String(submission.selectedOption));
  if (index === -1) return null;
  return { text: options[index].text, letter: String.fromCharCode(65 + index), isCorrect: options[index].isCorrect };
}

/**
 * Filters (language, status) and sorts (time, memory, or newest first) a list of submissions.
 *   sort   { field: 'time' | 'memory' | null, direction: 'asc' | 'desc' }
 */
export function arrangeSubmissions(list, { language = 'all', status = 'all', sort = { field: null, direction: 'asc' } } = {}) {
  let result = list;
  if (language !== 'all') result = result.filter((entry) => entry.language === language);
  if (status !== 'all') result = result.filter((entry) => entry.status === status);
  const sign = sort.direction === 'asc' ? 1 : -1;
  if (sort.field === 'time') return [...result].sort((a, b) => sign * (timeOf(a) - timeOf(b)));
  if (sort.field === 'memory') return [...result].sort((a, b) => sign * (memoryOf(a) - memoryOf(b)));
  return [...result].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

/** The next sort after a press on a column: ascending, descending, then back to newest first */
export function nextSort(current, field) {
  if (current.field !== field) return { field, direction: 'asc' };
  if (current.direction === 'asc') return { field, direction: 'desc' };
  return { field: null, direction: 'asc' };
}

export const distinct = (list, key) => [...new Set(list.map((entry) => entry[key]).filter(Boolean))];

/** Where a submitter's public profile lives: their username, or the part of the email before the "@" */
export function profileIdentifier(user) {
  return user?.username || user?.email?.split('@')[0] || user?.rollNumber || null;
}

/** A student keeps at most this many submissions per question; the next one replaces the oldest */
export const SUBMISSION_LIMIT = 5;
