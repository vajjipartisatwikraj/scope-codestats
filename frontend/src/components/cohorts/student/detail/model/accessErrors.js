import { formatDateTime } from '../../../../ui/format';

/**
 * What to tell a student, and where to send them, when the server will not open a cohort. The server
 * answers `reason` on every protected cohort route, and this table is the one place that decides what
 * each reason means for the student.
 *
 *   describeLoadFailure(error)  -> { level: 'error' | 'info', message, to }
 *
 * `to` is always a page the student may open. An error that is not a known refusal (a dropped
 * connection, a server fault) gets the generic message and goes back to the list as well.
 */
export function describeLoadFailure(error) {
  const status = error?.response?.status;
  const data = error?.response?.data || {};

  if (status === 404 && data.reason === 'not_found') {
    return { level: 'error', message: 'This cohort was not found. It may have been deleted.', to: '/cohorts' };
  }

  if (status === 403) {
    switch (data.reason) {
      case 'not_eligible':
        return { level: 'error', message: 'This cohort is not open to you.', to: '/cohorts' };
      case 'not_active':
        return { level: 'error', message: 'This cohort is not active right now.', to: '/cohorts' };
      case 'draft_mode':
        return { level: 'error', message: 'This cohort is not published yet.', to: '/cohorts' };
      case 'exam_ended':
        return { level: 'info', message: 'This exam has ended.', to: '/dashboard' };
      case 'exam_not_started': {
        const startsAt = data.exam?.startsAt;
        return {
          level: 'info',
          message: startsAt ? `This exam opens on ${formatDateTime(startsAt)}.` : 'This exam has not started yet.',
          to: '/cohorts',
        };
      }
      case 'exam_misconfigured':
        return { level: 'error', message: 'This exam has no valid schedule. Ask your teacher.', to: '/cohorts' };
      default:
        break;
    }
  }

  return { level: 'error', message: 'We could not open this cohort. Check your connection and try again.', to: '/cohorts' };
}
