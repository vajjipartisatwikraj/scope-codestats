/**
 * The filters of the Courses page. Everything runs on the client: the server sends the whole
 * catalogue in one answer and nothing is asked of it again when a filter changes.
 */

/** The category chips. `key` is the value stored on a course; 'all' shows every course (including 'other'). */
export const CATEGORIES = [
  { key: 'all', label: 'All courses' },
  { key: 'algorithms', label: 'Algorithms' },
  { key: 'data-structures', label: 'Data structures' },
  { key: 'competitive', label: 'Competitive' },
  { key: 'problem-solving', label: 'Problem solving' },
];

/** The levels a course can have, in the order they are offered */
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export const EMPTY_FILTERS = { search: '', category: 'all', level: '' };

export const hasFilters = (filters) => Boolean(filters.search.trim()) || filters.category !== 'all' || Boolean(filters.level);

const text = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

/** The courses that match the search, the category and the level */
export function filterCourses(courses, filters) {
  const term = filters.search.trim().toLowerCase();
  return courses.filter((course) => {
    if (term) {
      const topics = Array.isArray(course.topics) ? course.topics.join(' ').toLowerCase() : '';
      const found = text(course.title).includes(term) || text(course.description).includes(term) || text(course.instructor).includes(term) || topics.includes(term);
      if (!found) return false;
    }
    if (filters.category !== 'all' && course.category !== filters.category) return false;
    if (filters.level && course.level !== filters.level) return false;
    return true;
  });
}

/** The levels to offer: the known ones, then any other level that appears in the data */
export function levelOptions(courses) {
  const extra = [...new Set(courses.map((course) => course.level).filter((level) => level && !LEVELS.includes(level)))];
  return [...LEVELS, ...extra];
}

/** The active filters in words, for the "nothing matches" message: ['search "graph"', 'category Algorithms'] */
export function describeFilters(filters) {
  const parts = [];
  if (filters.search.trim()) parts.push(`search \u201C${filters.search.trim()}\u201D`);
  if (filters.category !== 'all') {
    const category = CATEGORIES.find((entry) => entry.key === filters.category);
    parts.push(`category ${category ? category.label : filters.category}`);
  }
  if (filters.level) parts.push(`level ${filters.level}`);
  return parts;
}

/** The tone of the level badge. Words carry the meaning; the tone is only a second cue. */
export function levelTone(level) {
  if (level === 'Beginner') return 'success';
  if (level === 'Intermediate') return 'info';
  if (level === 'Advanced') return 'warning';
  return 'neutral';
}

// A link is only followed when it is http or https (shared with the cohort page)
export { safeUrl } from '../../utils/safeUrl';
