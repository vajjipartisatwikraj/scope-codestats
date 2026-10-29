import { daysUntil, formatDate } from '../ui/format';

/**
 * What the opportunity screen knows about an opportunity: the choices, the empty form, the form an
 * opportunity turns into, the validation, what is sent, the filters, the sort and the deadline
 * wording. Plain functions, no React.
 */

export const CATEGORIES = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' },
  { value: 'internship', label: 'Internship' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'other', label: 'Other' },
];

export const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const STATUSES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

export const TAG_SUGGESTIONS = [
  'Beginner-Friendly',
  'Advanced',
  'Prizes',
  'Remote',
  'International',
  'Hackathon',
  'Coding',
  'AI',
  'Machine Learning',
  'Web Development',
  'Mobile',
  'Game Dev',
  'Data Science',
  'Blockchain',
  'Cybersecurity',
];

const labelIn = (list, value, fallback) => (list.find((entry) => entry.value === value) || { label: fallback ?? value ?? '' }).label;

export const categoryLabel = (value) => labelIn(CATEGORIES, value, 'Other');
export const difficultyLabel = (value) => labelIn(DIFFICULTIES, value, '');
export const statusLabel = (value) => labelIn(STATUSES, value, '');

/** The form of an opportunity that does not exist yet (the same fields and defaults the page always sent) */
export const emptyForm = () => ({
  title: '',
  description: '',
  organizer: '',
  organizerImageUrl: '',
  category: 'other',
  difficulty: 'intermediate',
  deadline: '',
  registrationOpen: true,
  location: '',
  link: '',
  tags: [],
  prize: '',
  eligibility: '',
  applicationLink: '',
  status: 'upcoming',
  image: '',
});

/** The form of an existing opportunity */
export function formFromOpportunity(opportunity) {
  const tags = opportunity.tags ? (Array.isArray(opportunity.tags) ? opportunity.tags : [opportunity.tags]) : [];
  return {
    title: opportunity.title,
    description: opportunity.description,
    organizer: opportunity.organizer || '',
    organizerImageUrl: opportunity.organizerImageUrl || '',
    category: opportunity.category || 'other',
    difficulty: opportunity.difficulty || 'intermediate',
    deadline: opportunity.deadline?.split('T')[0] || '',
    registrationOpen: opportunity.registrationOpen ?? true,
    location: opportunity.location || '',
    link: opportunity.link || '',
    tags,
    prize: opportunity.prize || '',
    eligibility: opportunity.eligibility || '',
    applicationLink: opportunity.applicationLink || '',
    status: opportunity.status || 'upcoming',
    image: opportunity.image || '',
  };
}

const isValidUrl = (text) => {
  try {
    new URL(text);
    return true;
  } catch (error) {
    return false;
  }
};

const REQUIRED = {
  title: 'Enter a title.',
  description: 'Describe the opportunity.',
  link: 'Enter the link to the opportunity.',
  deadline: 'Choose the deadline.',
  organizer: 'Enter who is organising it.',
  status: 'Choose a status.',
};

const URL_FIELDS = {
  link: 'Enter a full web address, for example https://example.com.',
  applicationLink: 'Enter a full web address, for example https://example.com/apply.',
  organizerImageUrl: 'Enter a full web address for the organizer image.',
  image: 'Enter a full web address for the opportunity image.',
};

/** The rules the page has always had: six required fields, and four links that must be real URLs */
export function validate(form) {
  const errors = {};
  Object.keys(REQUIRED).forEach((field) => {
    if (!form[field]) errors[field] = REQUIRED[field];
  });
  Object.keys(URL_FIELDS).forEach((field) => {
    if (!errors[field] && form[field] && !isValidUrl(form[field])) errors[field] = URL_FIELDS[field];
  });
  return errors;
}

/** The order the fields appear in, so the first error can take focus */
export const FIELD_ORDER = ['title', 'description', 'organizer', 'organizerImageUrl', 'status', 'deadline', 'link', 'applicationLink', 'image'];

/** What is sent: tags as an array of strings, and a prize only for a hackathon */
export const buildPayload = (form) => ({
  ...form,
  tags: Array.isArray(form.tags) ? form.tags : [],
  prize: form.category === 'hackathon' ? form.prize : '',
});

const lower = (value) => String(value || '').toLowerCase();

/** Search looks at the title, the description and the organizer; the selects narrow it down */
export function matches(opportunity, { search, category, status, registration }) {
  const term = lower(search);
  if (term && !lower(opportunity.title).includes(term) && !lower(opportunity.description).includes(term) && !lower(opportunity.organizer).includes(term)) return false;
  if (category && (opportunity.category || 'other') !== category) return false;
  if (status && opportunity.status !== status) return false;
  if (registration === 'open' && !opportunity.registrationOpen) return false;
  if (registration === 'closed' && opportunity.registrationOpen) return false;
  return true;
}

const STATUS_RANK = { upcoming: 0, ongoing: 1, completed: 2 };

/** Sorts a copy of the list; without a key the list stays in the order the server sent */
export function sortOpportunities(list, sort) {
  if (!sort || !sort.key) return list;
  const direction = sort.dir === 'desc' ? -1 : 1;
  const valueOf = (item) => {
    if (sort.key === 'deadline') {
      const time = new Date(item.deadline).getTime();
      return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
    }
    if (sort.key === 'status') return STATUS_RANK[item.status] ?? 9;
    return lower(item.title);
  };
  return [...list].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);
    if (left < right) return -1 * direction;
    if (left > right) return 1 * direction;
    return 0;
  });
}

/**
 * The deadline in words: the date, how far away it is, and a badge when it needs attention (within
 * 3 days: warning; passed while the opportunity is not completed: danger).
 * @returns {{ date: string, relative: string, badge: null | { tone: string, label: string } }}
 */
export function deadlineInfo(opportunity) {
  const days = daysUntil(opportunity.deadline);
  if (days === null) return { date: '\u2013', relative: '', badge: null };
  let relative;
  if (days < -1) relative = `${-days} days ago`;
  else if (days === -1) relative = 'yesterday';
  else if (days === 0) relative = 'today';
  else if (days === 1) relative = 'tomorrow';
  else relative = `in ${days} days`;

  let badge = null;
  if (opportunity.status !== 'completed') {
    if (days < 0) badge = { tone: 'danger', label: 'Deadline passed' };
    else if (days === 0) badge = { tone: 'warning', label: 'Due today' };
    else if (days <= 3) badge = { tone: 'warning', label: `Due in ${days} ${days === 1 ? 'day' : 'days'}` };
  }
  return { date: formatDate(opportunity.deadline), relative, badge };
}
