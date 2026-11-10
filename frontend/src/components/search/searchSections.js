import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { describeStudent } from '../Navbar/formatters';

const isStaff = (user) => user?.userType === 'admin' || user?.userType === 'teacher';

/** "Live now", "Upcoming" or "Ended"; staff also see "Draft" for a test students cannot open yet. */
const speechTestStatus = (test, user) => {
  if (isStaff(user) && !test.isPublished) return 'Draft';
  if (test.state === 'live') return 'Live now';
  if (test.state === 'upcoming') return 'Upcoming';
  return 'Ended';
};

/**
 * What the search finds, in the order it is shown and moved through with the keyboard. Shared by
 * the navbar search (SearchBox) and the phone search page, so both list and open results alike.
 *
 *   key      the field of the API answer (GET /api/search)
 *   title    the section heading
 *   icon     a Phosphor icon, or null when the result brings its own picture (people)
 *   path     (item, user) => the route that opens the result
 *   label    (item) => the main line
 *   detail   (item, user) => an optional second line
 */
export const SEARCH_SECTIONS = [
  {
    key: 'users',
    title: 'Users',
    icon: null,
    path: (item) => `/public-profile/${encodeURIComponent(item.username)}`,
    label: (item) => item.name,
    detail: describeStudent,
  },
  {
    key: 'cohorts',
    title: 'Cohorts',
    icon: StackIcon,
    path: (item) => `/cohorts/${item._id}`,
    label: (item) => item.title,
  },
  {
    key: 'speechTests',
    title: 'VocalQ tests',
    icon: MicrophoneIcon,
    // Staff manage the test; a student opens it (the overview sends a new attempt to the setup screens)
    path: (item, user) =>
      isStaff(user) ? `/admin/communication-tests/${item._id}/edit` : `/speech-tests/${item._id}`,
    label: (item) => item.title,
    detail: speechTestStatus,
  },
  {
    key: 'opportunities',
    title: 'Opportunities',
    icon: BriefcaseIcon,
    path: (item) => `/opportunities/${item._id}`,
    label: (item) => item.title,
    detail: (item) => item.company,
  },
  {
    key: 'courses',
    title: 'Courses',
    icon: GraduationCapIcon,
    path: (item) => `/courses/${item._id}`,
    label: (item) => item.title,
    detail: (item) => item.instructor,
  },
];

/** What the search box invites you to look for, one word at a time: Search "Student", Search "Course", ... */
export const SEARCH_TERMS = ['Student', 'Cohort', 'Course', 'Opportunity', 'VocalQ test'];

/** Every result of an API answer as { section, item }, in display order. */
export const flattenResults = (results) =>
  SEARCH_SECTIONS.flatMap((section) => (results?.[section.key] ?? []).map((item) => ({ section, item })));
