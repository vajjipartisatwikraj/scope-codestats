import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { BookIcon } from '@phosphor-icons/react/dist/csr/Book';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { ChalkboardTeacherIcon } from '@phosphor-icons/react/dist/csr/ChalkboardTeacher';
import { ChartBarIcon } from '@phosphor-icons/react/dist/csr/ChartBar';
import { ChatsIcon } from '@phosphor-icons/react/dist/csr/Chats';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone';
import { PulseIcon } from '@phosphor-icons/react/dist/csr/Pulse';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
import { SlidersHorizontalIcon } from '@phosphor-icons/react/dist/csr/SlidersHorizontal';
import { SquaresFourIcon } from '@phosphor-icons/react/dist/csr/SquaresFour';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TargetIcon } from '@phosphor-icons/react/dist/csr/Target';
import { UserGearIcon } from '@phosphor-icons/react/dist/csr/UserGear';
import { UserMinusIcon } from '@phosphor-icons/react/dist/csr/UserMinus';
import { UsersThreeIcon } from '@phosphor-icons/react/dist/csr/UsersThree';
import {
  getDashboardPath,
  getResourcePath,
  isAdminOrTeacher,
} from '../../utils/userHelpers';

/**
 * What the sidebar shows, and to whom.
 *
 * Pure data and rules, no React: the groups below are filtered for the signed-in user by
 * buildNavigation(), and isItemActive() says which entry matches the current URL.
 */

const isStaff = (user) => Boolean(isAdminOrTeacher(user));
const isAdminUser = (user) => user?.userType === 'admin';
const isTeacherUser = (user) => user?.userType === 'teacher';

// Group headings are sentence case (design/screens.md, section 2).
const GROUPS = [
  {
    id: 'practice',
    title: 'Practice',
    items: [
      {
        id: 'dashboard',
        adminGroup: 'overview', // admins have no Practice or Grow: this item sits under overview for them
        label: 'Dashboard',
        icon: SquaresFourIcon,
        // Staff go to /admin/dashboard, everyone else to /dashboard.
        path: (user) => getDashboardPath(user),
        // `/admin` is the same page, so it must highlight this item too.
        matchPaths: ['/dashboard', '/admin', '/admin/dashboard'],
        visible: () => true,
      },
      {
        id: 'leaderboard',
        adminGroup: 'overview', // admins have no Practice or Grow: this item sits under overview for them
        label: 'Leaderboard',
        icon: ChartBarIcon,
        path: () => '/leaderboard',
        visible: () => true,
      },
      {
        id: 'codepad',
        label: 'CodePad',
        icon: CodeIcon,
        path: () => '/codepad',
        // Students only: admins and teachers have no practice editor of their own
        visible: (user) => !isStaff(user),
      },
      {
        id: 'cohorts',
        adminGroup: 'manage', // admins have no Practice or Grow: this item sits under manage for them
        label: 'Cohorts',
        icon: StackIcon,
        path: (user) => getResourcePath(user, 'cohorts'),
        visible: () => true,
      },
      {
        id: 'practice-arena',
        adminGroup: 'manage', // admins have no Practice or Grow: this item sits under manage for them
        label: 'Practice arena',
        icon: TargetIcon,
        path: (user) => getResourcePath(user, 'practice-arena'),
        visible: (user) => !isTeacherUser(user),
      },
      {
        id: 'speech-test',
        label: 'VocalQ',
        icon: MicrophoneIcon,
        // Students: the tests scheduled for them
        path: () => '/speech-tests',
        visible: (user) => !isStaff(user),
      },
    ],
  },
  {
    id: 'grow',
    title: 'Grow',
    items: [
      {
        id: 'courses',
        adminGroup: 'manage', // admins have no Practice or Grow: this item sits under manage for them
        label: 'Courses',
        icon: BookIcon,
        path: (user) => getResourcePath(user, 'courses'),
        visible: (user) => !isTeacherUser(user),
      },
      {
        id: 'opportunities',
        adminGroup: 'manage', // admins have no Practice or Grow: this item sits under manage for them
        label: 'Opportunities',
        icon: BriefcaseIcon,
        path: (user) => getResourcePath(user, 'opportunities'),
        visible: (user) => !isTeacherUser(user),
      },
      {
        id: 'build-resume',
        label: 'Build my resume',
        icon: FileTextIcon,
        path: () => '/build-resume',
        // Students only: admins and teachers have no resumes of their own
        visible: (user) => !isStaff(user),
      },
    ],
  },
  // Staff only from here: what teachers and admins use to run the courses, who is on the platform, and the platform itself.
  {
    id: 'manage',
    title: 'Manage',
    items: [
      {
        id: 'communication-test',
        label: 'Communication test',
        icon: ChatsIcon,
        // Teachers and admins: create and schedule communication tests
        path: () => '/admin/communication-tests',
        visible: (user) => isStaff(user),
      },
      {
        id: 'user-groups',
        label: 'User groups',
        icon: UsersThreeIcon,
        // Teachers and admins: named roll number lists to attach to cohorts
        path: () => '/admin/user-groups',
        visible: (user) => isStaff(user),
      },
      {
        id: 'bank-library',
        label: 'Bank library',
        icon: BooksIcon,
        // Admins only: banks of questions kept in S3, imported into cohorts by admins and teachers
        path: () => '/admin/bank-library',
        visible: (user) => isAdminUser(user),
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: BellIcon,
        path: (user) => getResourcePath(user, 'notifications'),
        visible: (user) => isAdminUser(user),
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    items: [
      {
        id: 'teacher-requests',
        label: 'Teacher requests',
        icon: ChalkboardTeacherIcon,
        // Admins only: approve or reject teacher access requests
        path: () => '/admin/teacher-requests',
        visible: (user) => isAdminUser(user),
        badge: 'teacherRequests',
      },
      {
        id: 'manage-users',
        label: 'Manage users',
        icon: UserGearIcon,
        path: () => '/admin/manage-users',
        visible: (user) => isAdminUser(user),
      },
      {
        id: 'access-list',
        label: 'Access control list',
        icon: ShieldCheckIcon,
        // Admins only, and only while the server lets people in by email address (LOGIN_MODE=allowlist)
        path: () => '/admin/access-list',
        visible: (user, { loginMode } = {}) => isAdminUser(user) && loginMode === 'allowlist',
      },
      {
        id: 'suspend-accounts',
        label: 'Suspend accounts',
        icon: UserMinusIcon,
        // Admins only: remove a student's coding profiles and all history stored with them
        path: () => '/admin/suspend-accounts',
        visible: (user) => isAdminUser(user),
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      {
        id: 'control-panel',
        label: 'Control panel',
        icon: SlidersHorizontalIcon,
        // Admins only: run the profile sync and recalculate scores and ranks
        path: () => '/admin/control-panel',
        visible: (user) => isAdminUser(user),
      },
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: PulseIcon,
        // Admins only: API traffic and database size
        path: () => '/admin/monitoring',
        visible: (user) => isAdminUser(user),
      },
    ],
  },
];

// The headings of the groups. Students and teachers see Practice and Grow; admins do not (they manage the
// platform, they do not practise on it), so for them the shared items are moved by `adminGroup`.
const GROUP_TITLES = {
  overview: 'Overview',
  practice: 'Practice',
  grow: 'Grow',
  manage: 'Manage',
  admin: 'Admin',
  system: 'System',
};
const MEMBER_ORDER = ['practice', 'grow', 'manage', 'admin', 'system'];
const ADMIN_ORDER = ['overview', 'manage', 'admin', 'system'];

/**
 * The groups this user can see, with paths resolved and counts filled in.
 * Groups with nothing visible are left out.
 *
 * Students and teachers: Practice, Grow, then (staff) Manage. Admins: Overview (Dashboard,
 * Leaderboard), Manage (cohorts, practice arena, courses, opportunities and the other content
 * screens), Admin (people and access) and System (control panel, monitoring).
 *
 * @param {Object} user  The signed-in user (needs `userType`).
 * @param {{ teacherRequestCount?: number, loginMode?: string }} [context]  Numbers shown on badges,
 *        and how the server lets people in ('domain' | 'allowlist'), which some entries depend on.
 */
export function buildNavigation(user, { teacherRequestCount = 0, loginMode } = {}) {
  const admin = isAdminUser(user);
  const order = admin ? ADMIN_ORDER : MEMBER_ORDER;
  const buckets = new Map(order.map((id) => [id, []]));

  GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      if (!item.visible(user, { loginMode })) return;
      const target = admin && item.adminGroup ? item.adminGroup : group.id;
      const bucket = buckets.get(target);
      if (!bucket) return;
      bucket.push({
        id: item.id,
        label: item.label,
        icon: item.icon,
        path: item.path(user),
        matchPaths: item.matchPaths,
        badgeCount: item.badge === 'teacherRequests' ? teacherRequestCount : 0,
      });
    });
  });

  return order.map((id) => ({ id, title: GROUP_TITLES[id], items: buckets.get(id) })).filter((group) => group.items.length > 0);
}
/**
 * Whether an entry represents the current page.
 *
 * An entry can declare `matchPaths` for pages reachable at more than one URL: the admin
 * dashboard answers to both `/admin` and `/admin/dashboard`. Otherwise an exact match wins,
 * with a prefix match so child routes such as `/admin/cohorts/:id` keep their parent
 * highlighted.
 */
export function isItemActive(item, pathname) {
  if (item.matchPaths?.includes(pathname)) return true;
  if (pathname === item.path) return true;

  // A bare prefix match on the dashboard would light it up on every page.
  if (item.path === '/dashboard' || item.path === '/admin/dashboard') {
    return false;
  }

  return pathname.startsWith(item.path);
}
