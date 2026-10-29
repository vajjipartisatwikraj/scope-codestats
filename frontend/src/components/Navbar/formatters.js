import { getDisplayNameForGraduation } from '../../utils/academicYearConfig';

/** "ananya reddy" -> "Ananya Reddy" */
export const toTitleCase = (name) =>
  (name || 'User')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

/** "AR" from the first two words of a name. */
export const initialsOf = (name) => {
  const words = (name || '').split(' ').filter(Boolean);
  const letters = `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase();
  return letters || 'U';
};

/**
 * The second line of the account pill: the role for staff, "CSE · III Year" for students.
 * Only what is known is shown; nothing is filled in when a field is missing.
 */
export const describeAccount = (user, academicYearConfig) => {
  if (user?.userType === 'admin') return 'Admin';
  if (user?.userType === 'teacher') return 'Teacher';

  const year = user?.graduatingYear
    ? getDisplayNameForGraduation(user.graduatingYear, academicYearConfig)
    : '';
  return [user?.department, year].filter(Boolean).join(' · ');
};

/** "CSE-A" for a student in a search result; whatever part is known. */
export const describeStudent = (person) =>
  [person?.department, person?.section].filter(Boolean).join('-');

const clockFormat = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const weekdayFormat = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * "Today, 4:10 pm", "Yesterday, 4:10 pm", "Mon, 4:10 pm" within a week, then "26 Oct 2026, 4:10 pm".
 */
export const formatNotificationTime = (value, now = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const time = clockFormat.format(date);
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (daysAgo <= 0) return `Today, ${time}`;
  if (daysAgo === 1) return `Yesterday, ${time}`;
  if (daysAgo < 7) return `${weekdayFormat.format(date)}, ${time}`;
  return `${dateFormat.format(date)}, ${time}`;
};
