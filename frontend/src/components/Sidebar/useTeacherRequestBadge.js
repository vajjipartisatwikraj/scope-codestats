import { useEffect, useState } from 'react';
import {
  teacherRequestAdminApi,
  TEACHER_REQUESTS_CHANGED,
} from '../../services/teacherRequestApi';

/**
 * How many teacher access requests are waiting for an admin (shown as a badge on the
 * sidebar). Only admins ask; everyone else gets 0 without a request.
 */
export default function useTeacherRequestBadge(enabled) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const refresh = async ({ force = false } = {}) => {
      try {
        const { count: pending } = await teacherRequestAdminApi.pendingCount({ force });
        if (!cancelled) setCount(pending);
      } catch {
        // The badge is a convenience; the page itself shows errors.
      }
    };
    // A decision on the Teacher Requests page changes the count right away.
    const onDecision = () => refresh({ force: true });
    // Background check: slow, and not at all while the tab is hidden.
    const onTick = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    // Coming back to the tab refreshes the badge (served from the cache if it is recent).
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    refresh();
    const timer = setInterval(onTick, 5 * 60 * 1000);
    window.addEventListener(TEACHER_REQUESTS_CHANGED, onDecision);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener(TEACHER_REQUESTS_CHANGED, onDecision);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return count;
}
