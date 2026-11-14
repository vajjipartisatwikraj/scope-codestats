/**
 * What the mentorship screens share besides components: the paths, the sort choices and the small
 * text helpers. No React in this file.
 */

export const LIST_PATH = '/admin/mentorships';
export const MY_STUDENTS_PATH = '/admin/my-students';

export const mentorshipPath = (typeId) => `${LIST_PATH}/${typeId}`;
export const rosterPath = (typeId, teacherId) => `${LIST_PATH}/${typeId}/mentors/${teacherId}`;

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'Name A to Z' },
  { value: 'students', label: 'Most students' },
];

/** The list in the chosen order (the server sends the newest start first) */
export function sortMentorships(list, sort) {
  if (sort === 'name') return [...list].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'students') return [...list].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
  return list;
}

const lower = (value) => String(value || '').toLowerCase();

/** True when the search term is in any of the values (an empty term matches everything) */
export const matchesTerm = (term, values) => !term || values.some((value) => lower(value).includes(term));

/** A start date in the future is "Upcoming", otherwise the mentorship is "Running" */
export const isUpcoming = (mentorship) => Boolean(mentorship.startsAt) && new Date(mentorship.startsAt).getTime() > Date.now();

/** The value of a date input (yyyy-mm-dd) from a stored timestamp */
export const dateInputValue = (timestamp) => (timestamp ? new Date(timestamp).toISOString().slice(0, 10) : '');
