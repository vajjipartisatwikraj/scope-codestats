/**
 * What a student sees of a cohort, worked out from the list payload (GET /cohorts). No React and no
 * network in this file, so the rules can be read, reused by the cohort page and tested on their own.
 *
 *   examOf(cohort)         the exam facts of a cohort, or null for a practice cohort
 *   cohortStatus(cohort)   the one status shown as a badge, and used by the filter and the sort
 *   primaryAction(cohort)  the label of the main button and whether it can be pressed
 *   examNote(cohort)       one sentence on where the student stands in an exam
 *   examWindowText(cohort) the exam's opening and closing time as one phrase
 *   studentsLabel(cohort)  who the cohort is for
 *   groupCohorts(cohorts)  the cohorts split into the page's sections (tests, enrolled, global, assigned)
 *
 * The exam rules are the ones the list has always followed (the server decides access; these only
 * decide what to show): finishing an exam, by hand or by running out of time, is final; an attempt
 * that is already running may always be resumed, even after joining has closed.
 */
import { formatDateTime, pluralize } from '../../../../ui/format';

/** The exam facts, evaluated by the server and sent with the list. `null` for practice cohorts. */
export function examOf(cohort) {
  const window = cohort?.examWindow?.isExam ? cohort.examWindow : null;
  if (!window) return null;

  const state = window.state || null; // not_started | open | ended | misconfigured
  const attemptState = window.attemptState || null; // in_progress | submitted | time_up | ...
  const submitted = Boolean(cohort.examSubmitted) || attemptState === 'submitted' || attemptState === 'time_up';
  const inProgress = attemptState === 'in_progress';

  return {
    state,
    attemptState,
    submitted,
    timeUp: attemptState === 'time_up',
    inProgress,
    // Can the student go in now?
    open: !submitted && (state === null || state === 'open' || inProgress),
    startsAt: window.startsAt || null,
    endsAt: window.endsAt || null,
  };
}

/**
 * The status of a cohort for this student.
 *
 *   key    'inProgress' | 'notStarted' | 'completed'   (what the filter and the sort use)
 *   label  the word on the badge
 *   tone   a Badge tone
 *   icon   the name of the icon the badge draws, so the status is never colour alone
 */
export function cohortStatus(cohort) {
  const exam = examOf(cohort);

  if (exam) {
    if (exam.timeUp) return { key: 'completed', label: 'Time up, submitted', tone: 'success', icon: 'check' };
    if (exam.submitted) return { key: 'completed', label: 'Test submitted', tone: 'success', icon: 'check' };
    if (exam.inProgress) return { key: 'inProgress', label: 'Exam in progress', tone: 'warning', icon: 'live' };
    if (exam.state === 'open') return { key: 'inProgress', label: 'Exam live', tone: 'warning', icon: 'live' };
    if (exam.state === 'not_started') return { key: 'notStarted', label: 'Exam scheduled', tone: 'info', icon: 'clock' };
    if (exam.state === 'ended') return { key: 'completed', label: 'Exam ended', tone: 'neutral', icon: 'lock' };
    return { key: 'notStarted', label: 'Not scheduled', tone: 'neutral', icon: 'warning' };
  }

  const joined = cohort?.userProgress?.status;
  if (joined === 'completed') return { key: 'completed', label: 'Completed', tone: 'success', icon: 'check' };
  if (joined === 'enrolled') return { key: 'inProgress', label: 'In progress', tone: 'info', icon: 'progress' };
  return { key: 'notStarted', label: 'Not started', tone: 'neutral', icon: 'circle' };
}

/** The label and state of the main button of a cohort (Start learning, Resume exam, ...) */
export function primaryAction(cohort, progress) {
  const exam = examOf(cohort);
  const enrolled = Boolean(progress && progress.status === 'ready' && progress.isEnrolled) || cohort?.userProgress?.status === 'enrolled' || cohort?.userProgress?.status === 'completed';

  if (exam) {
    let label = 'Start exam';
    if (exam.submitted) label = 'Test submitted';
    else if (exam.inProgress) label = 'Resume exam';
    else if (exam.state === 'not_started') label = 'Exam not started';
    else if (exam.state === 'ended') label = 'Exam ended';
    else if (exam.state === 'misconfigured') label = 'Unavailable';
    return { label, disabled: !exam.open, exam: true };
  }
  return { label: enrolled ? 'Continue learning' : 'Start learning', disabled: false, exam: false };
}

/** "28 Oct, 9:00 am to 11:00 am" for an exam with a schedule, or null */
export function examWindowText(cohort) {
  const exam = examOf(cohort);
  if (!exam || !exam.startsAt || !exam.endsAt) return null;
  return `${formatDateTime(exam.startsAt)} to ${formatDateTime(exam.endsAt)}`;
}

/** One sentence about where the student stands in an exam, or null for a practice cohort */
export function examNote(cohort) {
  const exam = examOf(cohort);
  if (!exam) return null;
  if (exam.timeUp) return 'Your time ran out and the test was submitted. It cannot be reopened.';
  if (exam.submitted) return 'You submitted this test. It cannot be reopened.';
  if (exam.inProgress) return 'Your attempt is running. Resume it before your time ends.';
  if (exam.state === 'not_started') return exam.startsAt ? `This exam opens on ${formatDateTime(exam.startsAt)}.` : 'This exam has not started yet.';
  if (exam.state === 'ended') return 'This exam has closed.';
  if (exam.state === 'misconfigured') return 'This exam has no schedule yet. Ask your teacher.';
  return exam.endsAt ? `Open until ${formatDateTime(exam.endsAt)}. Once you finish, you cannot reopen it.` : null;
}

/** "Open to all students", or how many students the cohort has */
export function studentsLabel(cohort) {
  if (cohort?.accessType === 'global') return 'Open to all students';
  const count = Array.isArray(cohort?.eligibleUsers) ? cohort.eligibleUsers.length : 0;
  return count > 0 ? pluralize(count, 'student') : null;
}

// ---- Filtering and ordering -------------------------------------------------------------------

/** The choices of the status control, in the order they are offered */
export const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'notStarted', label: 'Not started' },
  { key: 'completed', label: 'Completed' },
];

export const EMPTY_FILTERS = { search: '', status: 'all' };

export const hasFilters = (filters) => Boolean(filters.search.trim()) || filters.status !== 'all';

const text = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

/** The cohorts that match the search (title or description) and the status */
export function filterCohorts(cohorts, filters) {
  const term = filters.search.trim().toLowerCase();
  return cohorts.filter((cohort) => {
    if (term && !text(cohort.title).includes(term) && !text(cohort.description).includes(term)) return false;
    if (filters.status !== 'all' && cohortStatus(cohort).key !== filters.status) return false;
    return true;
  });
}

// What to look at first: a live exam and cohorts being worked on, then the ones not started, then done.
const ORDER = { inProgress: 0, notStarted: 1, completed: 2 };

/** A new list with the cohorts to act on first; cohorts of equal rank keep the order the server gave */
export function sortCohorts(cohorts) {
  return cohorts
    .map((cohort, index) => ({ cohort, index, rank: ORDER[cohortStatus(cohort).key] }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.cohort);
}

// ---- Sections ---------------------------------------------------------------------------------

/** The sections of the page, in the order they are shown: what anyone can join comes first */
export const SECTIONS = [
  { key: 'global', title: 'Global cohorts', caption: 'Open to every student. Join any of them.' },
  { key: 'tests', title: 'Scheduled tests', caption: 'Timed exams set by your teachers.' },
  { key: 'enrolled', title: 'My enrolled cohorts', caption: 'Cohorts you have joined.' },
  { key: 'assigned', title: 'Assigned to me', caption: 'Cohorts your teachers opened to you.' },
];

/**
 * The one section a cohort belongs to, so it is never listed twice:
 *   tests     any exam, whatever its state
 *   enrolled  a practice cohort the student has joined (or finished)
 *   global    a practice cohort open to everyone that the student has not joined yet
 *   assigned  any other practice cohort opened to the student by a user group
 */
export function sectionOf(cohort) {
  if (examOf(cohort)) return 'tests';
  const joined = cohort?.userProgress?.status;
  if (joined === 'enrolled' || joined === 'completed') return 'enrolled';
  return cohort?.accessType === 'global' ? 'global' : 'assigned';
}

/** The cohorts split into SECTIONS, in order, keeping each cohort's order; empty sections are left out */
export function groupCohorts(cohorts) {
  const buckets = new Map(SECTIONS.map((section) => [section.key, []]));
  cohorts.forEach((cohort) => buckets.get(sectionOf(cohort)).push(cohort));
  return SECTIONS.map((section) => ({ ...section, cohorts: buckets.get(section.key) })).filter((section) => section.cohorts.length > 0);
}

/** How many cohorts are in each status, for the counts on the filter pills */
export function countByStatus(cohorts) {
  const counts = { inProgress: 0, notStarted: 0, completed: 0 };
  cohorts.forEach((cohort) => {
    counts[cohortStatus(cohort).key] += 1;
  });
  return counts;
}

/** The active filters in words, for the "nothing matches" message */
export function describeFilters(filters) {
  const parts = [];
  if (filters.search.trim()) parts.push(`search \u201C${filters.search.trim()}\u201D`);
  if (filters.status !== 'all') {
    const status = STATUS_FILTERS.find((entry) => entry.key === filters.status);
    parts.push(`status ${status ? status.label.toLowerCase() : filters.status}`);
  }
  return parts;
}
