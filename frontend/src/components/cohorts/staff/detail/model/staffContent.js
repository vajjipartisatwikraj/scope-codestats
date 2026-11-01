/**
 * The forms and wording of the staff cohort page: the module form, the question form's starting
 * point and how a saved question maps into it, the words of the shared-content warning, and how a
 * failed bulk upload is described. No React and no network.
 */

// ---- Modules ------------------------------------------------------------------------------------

export const emptyModuleForm = (order = 0) => ({ title: '', description: '', order, videoResource: '', documentationUrl: '', resources: [] });

export const moduleFormFrom = (module) => ({
  title: module.title,
  description: module.description,
  order: module.order || 0,
  videoResource: module.videoResource || '',
  documentationUrl: module.documentationUrl || '',
  resources: module.resources || [],
});

/** The problems with a module form, by field */
export function validateModule(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.description.trim()) errors.description = 'Description is required';
  return errors;
}

export const MODULE_FIELD_ORDER = ['title', 'description'];

// ---- Questions ------------------------------------------------------------------------------------

const JAVA_STARTER = 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}';

/** What the question form starts from for a new question */
export const emptyQuestionForm = () => ({
  title: '',
  description: '',
  type: 'programming',
  difficultyLevel: 'medium',
  marks: 10,
  options: [],
  languages: [{ name: 'java', version: '15.0.2', boilerplateCode: JAVA_STARTER, solutionCode: '' }],
  defaultLanguage: 'java',
  testCases: [],
  examples: [],
  constraints: { timeLimit: 1000, memoryLimit: 256 },
  hints: [],
  tags: [],
  companies: [],
});

/** A question read for editing (GET .../questions/:id/edit) as the form wants it, with the defaults filled in */
export function questionFormFrom(question) {
  const base = emptyQuestionForm();
  return {
    title: question.title || '',
    description: question.description || '',
    type: question.type || 'programming',
    difficultyLevel: question.difficultyLevel || 'medium',
    marks: question.marks || 10,
    options: question.options || [],
    languages: question.languages || base.languages,
    defaultLanguage: question.defaultLanguage || 'java',
    testCases: question.testCases || [],
    examples: question.examples || [],
    constraints: {
      timeLimit: question.constraints?.timeLimit || 1000,
      memoryLimit: question.constraints?.memoryLimit || 256,
    },
    hints: question.hints || [],
    tags: question.tags || [],
    companies: question.companies || [],
    editorial: question.editorial || '',
    encryptedEditor: question.encryptedEditor ?? false,
    encryptionSettings: { allowPlainTextPaste: question.encryptionSettings?.allowPlainTextPaste ?? false },
    fillInTheBlank: question.fillInTheBlank ?? false,
  };
}

/** The acceptance rate of a question, or null while nobody has submitted */
export function acceptanceOf(question) {
  const total = Number(question?.stats?.totalSubmissions);
  const accepted = Number(question?.stats?.acceptedSubmissions);
  return total > 0 ? Math.round((Math.min(accepted || 0, total) / total) * 100) : null;
}

/** The questions that match the search (title, tags, question bank) and the difficulty */
export function filterStaffQuestions(questions, { search, difficulty }) {
  const term = search.trim().toLowerCase();
  return questions.filter((question) => {
    if (difficulty !== 'all' && question.difficultyLevel !== difficulty) return false;
    if (!term) return true;
    return (
      String(question.title || '').toLowerCase().includes(term) ||
      (question.tags || []).some((tag) => String(tag).toLowerCase().includes(term)) ||
      String(question.questionBank || '').toLowerCase().includes(term)
    );
  });
}

// ---- Shared content -----------------------------------------------------------------------------------

/**
 * Cohorts cloned from one another share their modules and questions, so a change reaches all of them.
 * What the warning says for each kind of change, and how serious it is (the tone of the notice).
 */
export function sharedActionInfo(action, count, details = {}) {
  const all = `ALL ${count} related cohort(s)`;
  switch (action) {
    case 'create_module':
      return { title: 'Add the module to all related cohorts', description: `This module will be added to ${all}.`, warning: 'The module will be visible in all of them immediately.', tone: 'info' };
    case 'edit_module':
      return { title: 'Edit the module in all cohorts', description: `This updates the module in ${all}.`, warning: 'The changes reach all of them immediately.', tone: 'warning' };
    case 'delete_module':
      return {
        title: 'Delete the module from all cohorts',
        description: `This permanently deletes the module from ${all}.`,
        warning: `This also deletes ${details.questionCount || 0} questions. This cannot be undone.`,
        tone: 'danger',
      };
    case 'create_question':
      return { title: 'Add the question to all related cohorts', description: `This question will be added to ${all}.`, warning: 'The question will be visible in all of them immediately.', tone: 'info' };
    case 'bulk_create_questions':
      return {
        title: 'Upload the questions to all related cohorts',
        description: `${details.questionCount || 0} question(s) will be added to the module \u201c${details.moduleName || 'Module'}\u201d in ${all}.`,
        warning: 'All the questions will be visible in all of them immediately.',
        tone: 'info',
      };
    case 'edit_question':
      return { title: 'Edit the question in all cohorts', description: `This updates the question in ${all}.`, warning: 'The changes reach all of them immediately.', tone: 'warning' };
    case 'delete_question':
      return {
        title: 'Delete the question from all cohorts',
        description: `This permanently deletes the question from ${all}.`,
        warning: 'Existing submissions are kept for the record.',
        tone: 'danger',
      };
    default:
      return { title: 'This reaches several cohorts', description: 'This action affects more than one cohort.', warning: 'Review the cohorts below.', tone: 'warning' };
  }
}

// ---- Bulk upload ------------------------------------------------------------------------------------------

/** One line per problem the server found in a bulk upload: "File: a.json | Question: 3 | Title: t | Issues: ..." */
function bulkErrorLines(entry) {
  if (typeof entry === 'string') return [entry];
  const parts = [
    entry.file ? `File: ${entry.file}` : null,
    entry.questionIndex !== undefined ? `Question: ${Number(entry.questionIndex) + 1}` : null,
    entry.title ? `Title: ${entry.title}` : null,
    Array.isArray(entry.issues) && entry.issues.length ? `Issues: ${entry.issues.join('; ')}` : entry.message ? `Issues: ${entry.message}` : null,
  ].filter(Boolean);
  return parts.length ? [parts.join(' | ')] : [];
}

/** The text of the error toast for a failed bulk upload */
export function bulkErrorMessage(error) {
  const data = error?.response?.data || {};
  const raw = data.validationErrors || data.errors || (data.code === 'BULK_VALIDATION_FAILED' ? [data] : []);
  const details = Array.isArray(raw) ? raw.flatMap(bulkErrorLines).join('\n') : '';
  return [data.message || error?.message || 'Failed to upload questions', details].filter(Boolean).join('\n');
}
