/**
 * The words and rules of the bank library screens. No React and no network.
 */

// ---- Wording ---------------------------------------------------------------------------------------

export const BANK_STATUSES = [
  { key: 'published', label: 'Published', tone: 'success' },
  { key: 'draft', label: 'Draft', tone: 'neutral' },
];

export const bankStatusInfo = (status) => BANK_STATUSES.find((entry) => entry.key === status) || BANK_STATUSES[1];

export const TYPE_LABEL = { mcq: 'MCQ', programming: 'Programming' };
export const DIFFICULTY_TONE = { easy: 'success', medium: 'warning', hard: 'danger' };
export const difficultyLabel = (level) => (level ? level.charAt(0).toUpperCase() + level.slice(1) : '');

/** "1 topic", "3 topics" */
export const countOf = (count, word) => `${Number(count || 0).toLocaleString('en-IN')} ${word}${Number(count) === 1 ? '' : 's'}`;

// ---- Errors -------------------------------------------------------------------------------------------

/**
 * The message of a failed request, with the problems the server listed under it (an invalid question
 * says which field is wrong).
 */
export function apiMessage(error, fallback) {
  const data = error?.response?.data;
  const lines = [data?.message || fallback];
  const issues = data?.details?.issues;
  if (Array.isArray(issues)) issues.slice(0, 5).forEach((issue) => lines.push(`${issue.path}: ${issue.message}`));
  const problems = data?.details?.problems;
  if (Array.isArray(problems)) {
    problems.slice(0, 5).forEach((problem) => lines.push(`Question ${problem.questionIndex}${problem.title ? ` (${problem.title})` : ''}: ${(problem.issues || []).map((issue) => `${issue.path} ${issue.message}`).join('; ')}`));
  }
  return lines.join('\n');
}

export const isNotConfigured = (error) => error?.response?.data?.code === 'BANK_LIBRARY_NOT_CONFIGURED';

// ---- Forms ----------------------------------------------------------------------------------------------

export const emptyBankForm = () => ({ name: '', description: '', status: 'draft', tags: '' });

export const bankFormFrom = (bank) => ({
  name: bank.name || '',
  description: bank.description || '',
  status: bank.status || 'draft',
  tags: (bank.tags || []).join(', '),
});

/** The form as the API wants it (tags are typed as a comma separated line) */
export const bankPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  status: form.status,
  tags: form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean),
});

export function validateBank(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter a name of at least two characters';
  return errors;
}

export const emptyTopicForm = () => ({ name: '', description: '', videoResource: '', documentationUrl: '' });

export const topicFormFrom = (topic) => ({
  name: topic.name || '',
  description: topic.description || '',
  videoResource: topic.videoResource || '',
  documentationUrl: topic.documentationUrl || '',
});

export function validateTopic(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = 'Enter a name of at least two characters';
  return errors;
}

// ---- Imports ----------------------------------------------------------------------------------------------

/** How an import is described: the word, the tone of its badge */
export const JOB_STATUS = {
  queued: { label: 'Waiting', tone: 'neutral' },
  running: { label: 'Importing', tone: 'info' },
  done: { label: 'Done', tone: 'success' },
  partial: { label: 'Done with problems', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  interrupted: { label: 'Interrupted', tone: 'warning' },
};

export const STEP_STATUS = {
  pending: { label: 'Waiting', tone: 'neutral' },
  running: { label: 'Importing', tone: 'info' },
  done: { label: 'Done', tone: 'success' },
  partial: { label: 'Partly done', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'neutral' },
};

export const jobStatusInfo = (status) => JOB_STATUS[status] || JOB_STATUS.queued;
export const stepStatusInfo = (status) => STEP_STATUS[status] || STEP_STATUS.pending;

/** Questions dealt with so far: brought in, already there, or failed */
export const processedOf = (progress) => (progress ? progress.imported + progress.skipped + progress.failed : 0);

/** A one-line account of a finished import */
export function jobSummary(job) {
  const { imported, skipped, failed } = job.progress;
  const parts = [`${countOf(imported, 'question')} imported`];
  if (skipped > 0) parts.push(`${skipped} already there`);
  if (failed > 0) parts.push(`${failed} could not be imported`);
  return parts.join(', ');
}

/** A stopped import the person should look at */
export const needsAttention = (job) => Boolean(job) && ['failed', 'partial', 'interrupted'].includes(job.status);

// ---- Filling a form from the library ----------------------------------------------------------------------------

/**
 * Puts what the library knows into a form (the name and description of a bank or a topic) without
 * overwriting what the person typed. A field is filled when it is empty, or when it still holds what
 * an earlier choice put there, so changing the bank or topic updates it again.
 *
 *   current    the form as it is now
 *   previous   what the last fill put in each field ({} the first time)
 *   incoming   the new values by field name
 * Returns { form, filled }; keep `filled` for the next call.
 */
export function applyAutofill(current, previous, incoming) {
  const form = { ...current };
  const filled = { ...previous };
  Object.keys(incoming).forEach((field) => {
    const value = incoming[field] == null ? '' : String(incoming[field]);
    const now = current[field] == null ? '' : String(current[field]);
    if (now.trim() === '' || now === previous[field]) {
      form[field] = value;
      filled[field] = value;
    }
  });
  return { form, filled };
}

// ---- Choosing what to import -----------------------------------------------------------------------------------

/**
 * What the picker has chosen, as the numbers the button shows. A question that sits in a chosen topic
 * is part of the topic, so it is not counted twice and is not sent on its own.
 *
 *   topics        the bank's topics ({ id, name, questionCount })
 *   topicIds      the chosen topics (a Set)
 *   questions     the chosen single questions (a Map of id -> { id, topicId })
 */
export function summariseChoice(topics, topicIds, questions) {
  const chosenTopics = topics.filter((topic) => topicIds.has(topic.id));
  const single = [...questions.values()].filter((question) => !topicIds.has(question.topicId));
  return {
    topicIds: chosenTopics.map((topic) => topic.id),
    questionIds: single.map((question) => question.id),
    topicCount: chosenTopics.length,
    questionCount: chosenTopics.reduce((sum, topic) => sum + (topic.questionCount || 0), 0) + single.length,
    allTopics: topics.length > 0 && chosenTopics.length === topics.length,
  };
}
