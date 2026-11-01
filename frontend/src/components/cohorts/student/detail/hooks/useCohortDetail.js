import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';
import { describeLoadFailure } from '../model/accessErrors';

/**
 * Loads one cohort for a student: GET {apiUrl}/cohorts/:id. The answer carries the cohort, its
 * modules (in the teacher's order, each with the ids of its questions), the student's own progress
 * and, for an exam, the exam window.
 *
 * A student who may open the cohort but has not joined it yet is joined here (POST .../enroll) and
 * the cohort is read again, quietly, so opening a cohort is all it takes to start it. Opening an
 * exam cohort also starts the student's personal exam clock on the server.
 *
 * When the server refuses (not open to this student, not published, an exam that has not started or
 * has ended, deleted) the student is told why in a toast and sent somewhere they may be; see
 * model/accessErrors.js.
 *
 * Returns { cohort, modules, loading, reload }. `loading` is true only until the first answer: a
 * later reload keeps the page on screen.
 */
export default function useCohortDetail(cohortId) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cohort, setCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const enrolling = useRef(false);

  const load = useCallback(async () => {
    const request = ++latest.current;
    if (!token) return;
    try {
      const response = await axios.get(`${apiUrl}/cohorts/${cohortId}`, {
        headers: { Authorization: `Bearer ${token}` },
        // Progress changes while a student works, so an old answer must never be reused
        params: { _t: Date.now() },
      });
      if (request !== latest.current) return;
      const data = response.data;
      setCohort(data);

      // Opening the cohort is what joins it: students the server let in, who are not joined yet
      const needsEnrolment = !data.userProgress || data.userProgress.status === 'applied';
      if (needsEnrolment && !enrolling.current) {
        enrolling.current = true;
        try {
          await axios.post(`${apiUrl}/cohorts/${cohortId}/enroll`, {}, { headers: { Authorization: `Bearer ${token}` } });
          toast.success('You have joined this cohort.');
          if (request === latest.current) load();
        } catch {
          // Not joined (an exam window, a related cohort already joined): the page still opens
        } finally {
          enrolling.current = false;
        }
      }
    } catch (error) {
      if (request !== latest.current) return;
      const failure = describeLoadFailure(error);
      (failure.level === 'info' ? toast.info : toast.error)(failure.message, { autoClose: 6000 });
      navigate(failure.to, { replace: true });
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [cohortId, token, navigate]);

  useEffect(() => {
    setCohort(null);
    setLoading(true);
    enrolling.current = false;
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  return { cohort, modules: cohort?.modules || [], loading, reload: load };
}
