import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/cohortAdminApi';

/**
 * The cohorts of the staff dashboard and what staff do to them: read the list, save (create or
 * edit), delete, duplicate and download an exam's results. Every action tells the staff member with
 * a toast and the list is read again after one that changes it.
 *
 * Returns
 *   cohorts, loading, failed, reload
 *   save(form, id)        creates (no id) or updates; resolves true when it worked
 *   remove(cohort)        resolves 'ok', 'attached' (user groups are still attached) or 'failed'
 *   duplicate(cohort)     { cohort, step } in `duplicating` while it runs
 *   duplicating           null, or { cohort, step } for the progress dialog
 *   exportReport(cohort)  downloads the exam results; `exportingId` is the cohort being exported
 */
export default function useAdminCohorts() {
  const { token } = useAuth();
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [duplicating, setDuplicating] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const list = await api.listCohorts(token);
      if (mounted.current) setCohorts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching cohorts:', error);
      if (mounted.current) {
        setFailed(true);
        toast.error('Failed to fetch cohorts');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (form, id) => {
      try {
        if (id) await api.updateCohort(token, id, form);
        else await api.createCohort(token, form);
        toast.success(id ? 'Cohort updated successfully' : 'Cohort created successfully');
        reload();
        return true;
      } catch (error) {
        console.error('Error saving cohort:', error);
        toast.error(error.response?.data?.message || 'Failed to save cohort');
        return false;
      }
    },
    [token, reload]
  );

  const remove = useCallback(
    async (cohort) => {
      try {
        const summary = await api.deleteCohort(token, cohort._id);
        toast.success(`Cohort deleted. Removed ${summary.userProgressDeleted} user progress records. Kept ${summary.modulesPreserved} modules and ${summary.questionsPreserved} questions.`, { autoClose: 5000 });
        reload();
        return 'ok';
      } catch (error) {
        console.error('Error deleting cohort:', error);
        toast.error(error.response?.data?.message || 'Failed to delete cohort');
        // Someone may have attached a group meanwhile
        return error.response?.data?.reason === 'user_groups_attached' ? 'attached' : 'failed';
      }
    },
    [token, reload]
  );

  const duplicate = useCallback(
    async (cohort) => {
      setDuplicating({ cohort, step: 'Creating the duplicate' });
      try {
        const result = await api.duplicateCohort(token, cohort._id);
        setDuplicating({ cohort, step: 'Duplicated' });
        // A moment to read the last step before the dialog goes
        window.setTimeout(() => {
          if (!mounted.current) return;
          setDuplicating(null);
          toast.success(`"${cohort.title}" was duplicated as a draft that uses ${result.stats?.modulesReferenced || 0} of the same modules.`);
          reload();
        }, 1500);
      } catch (error) {
        console.error('Error duplicating cohort:', error);
        setDuplicating(null);
        toast.error(error.code === 'ECONNABORTED' ? 'Request timed out' : error.response?.data?.message || 'Failed to duplicate cohort');
      }
    },
    [token, reload]
  );

  /** The server builds the workbook; this hands the file to the browser */
  const exportReport = useCallback(
    async (cohort) => {
      setExportingId(cohort._id);
      try {
        const response = await api.examReport(token, cohort._id);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        // The server's own file name if it sent one, else the cohort's title
        const named = /filename="?([^"]+)"?/.exec(response.headers['content-disposition'] || '');
        link.download = named?.[1] || `${cohort.title.replace(/\s+/g, '-')}-results.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Exam report downloaded');
      } catch (error) {
        console.error('Error downloading exam report:', error);
        toast.error(error.response?.data?.message || 'Failed to download the exam report');
      } finally {
        setExportingId(null);
      }
    },
    [token]
  );

  return { cohorts, loading, failed, reload, save, remove, duplicate, duplicating, exportReport, exportingId };
}
