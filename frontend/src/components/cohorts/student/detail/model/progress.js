/**
 * How far a student is, worked out from what the cohort payload carries (GET /cohorts/:id). No React
 * and no network, so every number on the page comes from the same few functions and the list of
 * modules, the cohort header and the progress panel can never disagree.
 *
 * The facts come from two places:
 *   module.questions            the ids of the module's questions, in the order the teacher set them
 *   userProgress.questionProgress   one entry per question the student has touched:
 *                                   { question, attempts, solved, bestScore, solvedAt }
 */

const idOf = (value) => String(value && value._id ? value._id : value);

/** A lookup of the student's entries by question id: Map<id, { solved, attempts }> */
export function progressByQuestion(userProgress) {
  const map = new Map();
  (userProgress?.questionProgress || []).forEach((entry) => {
    map.set(idOf(entry.question), { solved: Boolean(entry.solved), attempts: Number(entry.attempts) || 0 });
  });
  return map;
}

/** The ids of a module's questions, as strings */
export const questionIdsOf = (module) => (Array.isArray(module?.questions) ? module.questions.map(idOf) : []);

/**
 * How a module stands: { total, solved, percent, complete }.
 * `complete` needs at least one question, so an empty module is never shown as done.
 */
export function moduleSummary(module, byQuestion) {
  const ids = questionIdsOf(module);
  const solved = ids.filter((id) => byQuestion.get(id)?.solved).length;
  return {
    total: ids.length,
    solved,
    percent: ids.length > 0 ? Math.round((solved / ids.length) * 100) : 0,
    complete: ids.length > 0 && solved === ids.length,
  };
}

/** The same figures for every module together */
export function cohortSummary(modules, byQuestion) {
  const parts = (modules || []).map((module) => moduleSummary(module, byQuestion));
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  const solved = parts.reduce((sum, part) => sum + part.solved, 0);
  return {
    total,
    solved,
    percent: total > 0 ? Math.round((solved / total) * 100) : 0,
    modulesComplete: parts.filter((part) => part.complete).length,
    modules: parts.length,
  };
}
