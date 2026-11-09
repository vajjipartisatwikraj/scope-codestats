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
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/csr/ShieldCheck';
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
        label: 'Cohorts',
        icon: StackIcon,
        path: (user) => getResourcePath(user, 'cohorts'),
        visible: () => true,
      },
      {
        id: 'practice-arena',
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
        label: 'Courses',
        icon: BookIcon,
        path: (user) => getResourcePath(user, 'courses'),
        visible: (user) => !isTeacherUser(user),
      },
      {
        id: 'opportunities',
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
        id: 'suspend-accounts',
        label: 'Suspend accounts',
        icon: UserMinusIcon,
        // Admins only: remove a student's coding profiles and all history stored with them
        path: () => '/admin/suspend-accounts',
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
    ],
  },
];

/**
 * The groups this user can see, with paths resolved and counts filled in.
 * Groups with nothing visible are left out.
 *
 * @param {Object} user  The signed-in user (needs `userType`).
 * @param {{ teacherRequestCount?: number, loginMode?: string }} [context]  Numbers shown on badges,
 *        and how the server lets people in ('domain' | 'allowlist'), which some entries depend on.
 */
export function buildNavigation(user, { teacherRequestCount = 0, loginMode } = {}) {
  return GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    items: group.items
      .filter((item) => item.visible(user, { loginMode }))
      .map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        path: item.path(user),
        matchPaths: item.matchPaths,
        badgeCount: item.badge === 'teacherRequests' ? teacherRequestCount : 0,
      })),
  })).filter((group) => group.items.length > 0);
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
