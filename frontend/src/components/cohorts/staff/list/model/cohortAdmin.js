/**
 * What the staff side of the cohort dashboard works out from a cohort (GET /cohorts/admin): its
 * status, which tab it is in, the search, and the create and edit form with its checks. No React and
 * no network in this file.
 *
 *   adminStatus(cohort)        the one status badge { label, tone, icon } (the icons CohortStatusBadge draws)
 *   TABS, inTab(cohort, tab)   the tabs of the page and which cohorts each shows
 *   matchesSearch(cohort, q)   title or description contains the search
 *   emptyForm(), formFromCohort(cohort), validate(form), FIELD_ORDER   the form
 *   toInput(date), fromInput(text)   a Date as the value of a datetime-local field, and back
 */

export const TABS = [
  { key: 'all', label: 'All cohorts' },
  { key: 'active', label: 'Active' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'reviews', label: 'Reviews' },
];

export function inTab(cohort, tab) {
  if (tab === 'active') return cohort.isActive && !cohort.isDraft;
  if (tab === 'drafts') return Boolean(cohort.isDraft);
  return true;
}

export function matchesSearch(cohort, search) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return String(cohort.title || '').toLowerCase().includes(term) || String(cohort.description || '').toLowerCase().includes(term);
}

/**
 * The status shown on a cohort card. A draft is only a draft. An exam cohort is judged by its exam
 * window, not by the generic dates; after the window closes nobody new can join, though attempts
 * already running go on to their own deadlines.
 */
export function adminStatus(cohort, now = new Date()) {
  if (cohort.isDraft) return { label: 'Draft', tone: 'neutral', icon: 'circle' };

  if (cohort.mode === 'exam' && cohort.examStartTime && cohort.examEndTime) {
    if (now < new Date(cohort.examStartTime)) return { label: 'Exam scheduled', tone: 'info', icon: 'clock' };
    if (now >= new Date(cohort.examEndTime)) return { label: 'Joining closed', tone: 'warning', icon: 'lock' };
    return { label: 'Exam live', tone: 'success', icon: 'live' };
  }

  if (!cohort.isActive) return { label: 'Inactive', tone: 'danger', icon: 'warning' };
  if (now < new Date(cohort.startDate)) return { label: 'Upcoming', tone: 'info', icon: 'clock' };
  if (now > new Date(cohort.endDate)) return { label: 'Ended', tone: 'neutral', icon: 'lock' };
  return { label: 'Active', tone: 'success', icon: 'check' };
}

// ---- The form -----------------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

/** A new cohort: a draft that runs for 30 days from now, in practice mode, open to its user groups */
export const emptyForm = () => ({
  title: '',
  description: '',
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * DAY),
  videoResource: '',
  documentationUrl: '',
  isActive: true,
  isDraft: true,
  mode: 'practice',
  examStartTime: null,
  examEndTime: null,
  // Blank means the attempt simply runs to the exam end time
  examDurationMinutes: '',
  accessType: 'userGroups',
});

/** The form of a cohort being edited. Who can access it is not changed here (the User groups button does that). */
export const formFromCohort = (cohort) => ({
  title: cohort.title,
  description: cohort.description,
  startDate: new Date(cohort.startDate),
  endDate: new Date(cohort.endDate),
  videoResource: cohort.videoResource || '',
  documentationUrl: cohort.documentationUrl || '',
  isActive: cohort.isActive,
  isDraft: cohort.isDraft,
  // Cohorts made before exam mode existed have no `mode`
  mode: cohort.mode === 'exam' ? 'exam' : 'practice',
  examStartTime: cohort.examStartTime ? new Date(cohort.examStartTime) : null,
  examEndTime: cohort.examEndTime ? new Date(cohort.examEndTime) : null,
  examDurationMinutes: cohort.examDurationMinutes ?? '',
});

/** The order the fields appear in, so the first error can take focus */
export const FIELD_ORDER = ['title', 'description', 'startDate', 'endDate', 'examStartTime', 'examEndTime', 'examDurationMinutes'];

/**
 * The problems with a form, by field. The server enforces the same rules; this only saves a round
 * trip. Exam mode needs a complete, ordered window. The duration is optional; when given it is a
 * whole number of minutes that fits inside the window, since nobody could use more.
 */
export function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required';
  if (!form.description.trim()) errors.description = 'Description is required';
  if (!form.startDate) errors.startDate = 'Start date is required';
  if (!form.endDate) errors.endDate = 'End date is required';
  if (form.startDate && form.endDate && form.startDate >= form.endDate) errors.endDate = 'End date must be after the start date';

  if (form.mode === 'exam') {
    if (!form.examStartTime) errors.examStartTime = 'Exam start time is required';
    if (!form.examEndTime) errors.examEndTime = 'Exam end time is required';
    if (form.examStartTime && form.examEndTime && form.examStartTime >= form.examEndTime) errors.examEndTime = 'Exam end time must be after the exam start time';

    const raw = String(form.examDurationMinutes ?? '').trim();
    if (raw !== '') {
      const minutes = Number(raw);
      if (!Number.isInteger(minutes) || minutes < 1) {
        errors.examDurationMinutes = 'Enter a whole number of minutes, at least 1';
      } else if (minutes > 1440) {
        errors.examDurationMinutes = 'Duration cannot exceed 24 hours';
      } else if (form.examStartTime && form.examEndTime) {
        const windowMinutes = Math.floor((form.examEndTime - form.examStartTime) / 60000);
        if (minutes > windowMinutes) errors.examDurationMinutes = `Longer than the exam window (${windowMinutes} min)`;
      }
    }
  }
  return errors;
}

const pad = (number) => String(number).padStart(2, '0');

/** A Date as the value of a datetime-local field, in the viewer's time zone: 2026-10-26T14:30 */
export function toInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The value of a datetime-local field as a Date, or null when it is empty or incomplete */
export function fromInput(text) {
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "9:00 am" for the worked example under the exam fields */
export const timeOnly = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// ---- Sections ---------------------------------------------------------------------------------

/** The sections of the dashboard, in the order they are shown */
export const SECTIONS = [
  { key: 'exams', title: 'Exam cohorts', caption: 'Timed exams. Students can only start them inside the exam window.' },
  { key: 'global', title: 'Global cohorts', caption: 'Practice cohorts open to every student.' },
  { key: 'groups', title: 'User group cohorts', caption: 'Practice cohorts open to the students in their user groups.' },
];

/** The one section a cohort belongs to, so it is never listed twice */
export function sectionOf(cohort) {
  if (cohort.mode === 'exam') return 'exams';
  return cohort.accessType === 'global' ? 'global' : 'groups';
}

/** The cohorts split into SECTIONS, keeping their order; empty sections are left out */
export function groupAdminCohorts(cohorts) {
  const buckets = new Map(SECTIONS.map((section) => [section.key, []]));
  cohorts.forEach((cohort) => buckets.get(sectionOf(cohort)).push(cohort));
  return SECTIONS.map((section) => ({ ...section, cohorts: buckets.get(section.key) })).filter((section) => section.cohorts.length > 0);
}
