/**
 * What the course screen knows about a course: the choices, the empty form, the form a course
 * turns into, the validation, the filters and the sort. Plain functions, no React.
 */

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

export const CATEGORIES = [
  { value: 'algorithms', label: 'Algorithms' },
  { value: 'data-structures', label: 'Data structures' },
  { value: 'competitive', label: 'Competitive programming' },
  { value: 'problem-solving', label: 'Problem solving' },
  { value: 'other', label: 'Other' },
];

export const categoryLabel = (value) => (CATEGORIES.find((category) => category.value === value) || { label: 'Other' }).label;

export const levelLabel = (value) => (value === 'All Levels' ? 'All levels' : value || 'Intermediate');

/** The form of a course that does not exist yet (the same fields and defaults the page always sent) */
export const emptyForm = () => ({
  title: '',
  description: '',
  courseLink: '',
  image: '',
  instructor: '',
  level: 'Intermediate',
  category: 'other',
  duration: '',
  topics: [],
  prerequisites: [],
  resources: [],
  isActive: true,
});

/** The form of an existing course */
export const formFromCourse = (course) => ({
  title: course.title,
  description: course.description,
  courseLink: course.courseLink || '',
  image: course.image || '',
  instructor: course.instructor || '',
  level: course.level || 'Intermediate',
  category: course.category || 'other',
  duration: course.duration || '',
  topics: course.topics || [],
  prerequisites: course.prerequisites || [],
  resources: course.resources || [],
  isActive: course.isActive !== undefined ? course.isActive : true,
});

/** Title, description and the course link are required (the course model requires them too) */
export function validate(form) {
  const errors = {};
  if (!String(form.title || '').trim()) errors.title = 'Enter a title for the course.';
  if (!String(form.description || '').trim()) errors.description = 'Describe what the course covers.';
  if (!String(form.courseLink || '').trim()) errors.courseLink = 'Enter the link students open to start the course.';
  return errors;
}

/** The order the fields appear in, so the first error can take focus */
export const FIELD_ORDER = ['title', 'description', 'courseLink'];

const lower = (value) => String(value || '').toLowerCase();

/** Search looks at the title and the description; level and category narrow it down */
export function matches(course, { search, level, category }) {
  const term = lower(search);
  if (term && !lower(course.title).includes(term) && !lower(course.description).includes(term)) return false;
  if (level && course.level !== level) return false;
  if (category && (course.category || 'other') !== category) return false;
  return true;
}

const LEVEL_RANK = Object.fromEntries(LEVELS.map((level, index) => [level, index]));

/** Sorts a copy of the list; without a key the list stays in the order the server sent */
export function sortCourses(courses, sort) {
  if (!sort || !sort.key) return courses;
  const direction = sort.dir === 'desc' ? -1 : 1;
  const valueOf = (course) => {
    if (sort.key === 'students') return Number(course.students) || 0;
    if (sort.key === 'level') return LEVEL_RANK[course.level] ?? 99;
    return lower(course.title);
  };
  return [...courses].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return 0;
  });
}
