import { daysUntil, formatDate } from '../ui';

/**
 * What the Opportunities page knows about an opportunity, worked out from the fields the server
 * sends: its type, its status and its deadline. Filters run on the client.
 */

/** The type chips. `key` is the category stored on an opportunity; 'all' shows every one (including 'other'). */
export const TYPES = [
  { key: 'all', label: 'All types' },
  { key: 'competition', label: 'Competitions' },
  { key: 'hackathon', label: 'Hackathons' },
  { key: 'internship', label: 'Internships' },
  { key: 'workshop', label: 'Workshops' },
];

/** The singular name of each category, shown on a row */
export const TYPE_NAMES = {
  competition: 'Competition',
  hackathon: 'Hackathon',
  internship: 'Internship',
  workshop: 'Workshop',
  other: 'Other',
};

export const EMPTY_FILTERS = { search: '', type: 'all' };

export const hasFilters = (filters) => Boolean(filters.search.trim()) || filters.type !== 'all';

const text = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

/** The opportunities that match the search (title, description, organiser) and the type */
export function filterOpportunities(opportunities, filters) {
  const term = filters.search.trim().toLowerCase();
  return opportunities.filter((opportunity) => {
    if (term && !text(opportunity.title).includes(term) && !text(opportunity.description).includes(term) && !text(opportunity.organizer).includes(term)) {
      return false;
    }
    if (filters.type !== 'all' && opportunity.category !== filters.type) return false;
    return true;
  });
}

/** The active filters in words, for the "nothing matches" message */
export function describeFilters(filters) {
  const parts = [];
  if (filters.search.trim()) parts.push(`search \u201C${filters.search.trim()}\u201D`);
  if (filters.type !== 'all') {
    const type = TYPES.find((entry) => entry.key === filters.type);
    parts.push(`type ${type ? type.label : filters.type}`);
  }
  return parts;
}

export const typeName = (category) => TYPE_NAMES[category] || TYPE_NAMES.other;

/** upcoming, ongoing or completed; anything else (or nothing) counts as ongoing, as it always has */
export const statusOf = (opportunity) => (['upcoming', 'ongoing', 'completed'].includes(opportunity.status) ? opportunity.status : 'ongoing');

/**
 * The deadline is free text on the server ("2026-10-26", "26 Oct 2026", "Rolling"). A date we can
 * read becomes a Date; anything else stays as written.
 */
export function parseDeadline(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const plain = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(plain);
  // A date without a time is that day here, not midnight in another time zone
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(plain);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The deadline badge of an opportunity (design/screens.md section 12):
 *   danger   closed: it is completed, or the deadline has passed
 *   warning  the deadline is within 3 days
 *   neutral  anything else: the date, or the text as written
 *
 * Returns { tone, label, state } with state 'closed' | 'soon' | 'open', and `date` (a Date or null).
 */
export function deadlineOf(opportunity) {
  const date = parseDeadline(opportunity.deadline);
  const days = date ? daysUntil(date) : null;
  const written = typeof opportunity.deadline === 'string' ? opportunity.deadline.trim() : '';

  if (statusOf(opportunity) === 'completed' || (days !== null && days < 0)) {
    return { tone: 'danger', state: 'closed', label: 'Closed', date, written };
  }
  if (days !== null && days <= 3) {
    const label = days === 0 ? 'Closes today' : days === 1 ? 'Closes tomorrow' : `Closes in ${days} days`;
    return { tone: 'warning', state: 'soon', label, date, written };
  }
  if (date) return { tone: 'neutral', state: 'open', label: `Closes ${formatDate(date)}`, date, written };
  return { tone: 'neutral', state: 'open', label: written || 'No deadline', date, written };
}

/** A link is only followed when it is http or https */
export function safeUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
