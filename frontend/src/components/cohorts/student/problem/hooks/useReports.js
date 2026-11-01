import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/problemApi';

/**
 * The reports about one question: the student's own (or everyone's, for staff), sending a new one,
 * deleting one's own, and, for staff, answering one and setting its status.
 *
 * Returns { reports, loading, sending, updating, reload, send(type, description), remove(id),
 * respond(id, status, response) }. Each of send, remove and respond resolves true when it worked.
 */
export default function useReports({ ids }) {
  const { token } = useAuth();
  const { cohortId, moduleId, questionId } = ids;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await api.fetchReports(token, { cohortId, moduleId, questionId }));
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [token, cohortId, moduleId, questionId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const send = useCallback(
    async (reportType, description) => {
      setSending(true);
      try {
        await api.postReport(token, { cohortId, moduleId, questionId }, { reportType, description });
        toast.success('Report submitted successfully');
        reload();
        return true;
      } catch (error) {
        console.error('Error submitting report:', error);
        toast.error('Failed to submit report');
        return false;
      } finally {
        setSending(false);
      }
    },
    [token, cohortId, moduleId, questionId, reload]
  );

  const remove = useCallback(
    async (reportId) => {
      try {
        await api.deleteReport(token, cohortId, reportId);
        toast.success('Report deleted successfully');
        reload();
        return true;
      } catch (error) {
        console.error('Error deleting report:', error);
        toast.error('Failed to delete report');
        return false;
      }
    },
    [token, cohortId, reload]
  );

  const respond = useCallback(
    async (reportId, status, response) => {
      setUpdating(true);
      try {
        await api.updateReport(token, cohortId, reportId, { status, adminResponse: response.trim() });
        toast.success('Report updated successfully');
        reload();
        return true;
      } catch (error) {
        console.error('Error updating report:', error);
        toast.error('Failed to update report');
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [token, cohortId, reload]
  );

  return { reports, loading, sending, updating, reload, send, remove, respond };
}
