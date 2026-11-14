import { useMemo } from 'react';
import { apiErrorMessage } from '../../../services/mentorshipApi';
import useRemote from '../../../hooks/useRemote';

const messageOf = (failure) => apiErrorMessage(failure, 'Could not load the students');

/**
 * The students one mentor holds in one mentorship. The admin screen and the teacher screen both use
 * it, because both ask the same question through `api` (adminRoster or myRoster in mentorshipApi).
 *
 *   const { data, students, loading, error, reload } = useRoster(api);
 *
 * `data` is the whole answer ({ mentorship, teacher, students }) and `students` its list. A screen
 * that shows another roster should remount (give it `key={api.key}`) so no earlier roster lingers.
 */
export default function useRoster(api) {
  const { data, loading, error, reload } = useRemote((signal) => api.get({ signal }), [api.key], true, messageOf);
  const students = useMemo(() => (data && data.students) || [], [data]);
  return { data, students, loading, error, reload };
}
