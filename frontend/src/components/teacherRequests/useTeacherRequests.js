import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, teacherRequestAdminApi, TEACHER_REQUESTS_CHANGED } from '../../services/teacherRequestApi';

/**
 * The data of the teacher requests page: the requests of one status, and the two decisions
 * (approve, reject). Same calls, messages and side effects as the previous page:
 *   - a failed load shows a toast (and the page shows a notice with Retry)
 *   - after a decision the sidebar badge is told (TEACHER_REQUESTS_CHANGED) and the list reloads
 *   - a 409 or 404 on a decision means someone else decided already, so the dialog closes and the
 *     list shows what is true now
 */
export default function useTeacherRequests() {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  const load = useCallback(async () => {
    // A slow answer for a tab the person has already left must not replace the current list
    const id = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const data = await teacherRequestAdminApi.list(status);
      if (id !== latest.current) return;
      setRequests(data.requests || []);
    } catch (failure) {
      if (id !== latest.current) return;
      const message = apiErrorMessage(failure, 'Could not load the requests');
      setRequests([]);
      setError(message);
      toast.error(message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Approve or reject. Resolves with { ok, message } so the page can close its dialog and announce
   * the result; it never throws.
   */
  const decide = useCallback(
    async (request, action, reason) => {
      try {
        let message;
        if (action === 'approve') {
          await teacherRequestAdminApi.approve(request._id);
          message = `${request.user.name} now has teacher access`;
        } else {
          await teacherRequestAdminApi.reject(request._id, reason);
          message = 'Request rejected';
        }
        toast.success(message);
        window.dispatchEvent(new Event(TEACHER_REQUESTS_CHANGED));
        await load();
        return { ok: true, message };
      } catch (failure) {
        toast.error(apiErrorMessage(failure, 'Could not save the decision'));
        // Someone else may have decided already; show what is true now.
        const code = failure?.response?.status;
        if (code === 409 || code === 404) {
          window.dispatchEvent(new Event(TEACHER_REQUESTS_CHANGED));
          await load();
          return { ok: false, stale: true };
        }
        return { ok: false, stale: false };
      }
    },
    [load]
  );

  return { status, setStatus, requests, loading, error, load, decide };
}
