import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import { fetchSqlQuestionContext } from '../../../../../services/sqlQuestionApi';
import { withExamSession } from '../../../../../utils/examSession';
import * as api from '../api/problemApi';
import { isAccepted, progressOf } from '../model/submissions';

/**
 * The question of the page and the student's own submissions to it.
 *
 * It loads the question (GET .../questions/:questionId, which carries the student's submissions)
 * and, for a SQL question, the schema and sample test cases from the SQL engine. Whatever the server
 * refuses is answered the way the page always did: an unpublished cohort sends the student to the
 * cohort list, a closed or not yet open exam leaves the exam, and any other failure goes back to
 * the cohort.
 *
 * Returns
 *   question, loading        the question (null until it arrives) and whether it is still loading
 *   submissions              the student's submissions, newest first
 *   solved, progress         whether an answer was accepted; 'solved' | 'attempted' | null
 *   sqlContext               the schema and sample cases of a SQL question (null otherwise)
 *   addSubmission(entry)     put a fresh submission first and mark the question solved if accepted
 *   refreshSubmissions()     read the student's submissions again
 *   reload()                 read everything again
 */
export default function useProblem({ cohortId, moduleId, questionId, examSession }) {
  const { token } = useAuth();
  // The router can hand out a new navigate function when the location changes; the loader must not restart for that
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [state, setState] = useState({ question: null, submissions: [], sqlContext: null, loading: true });
  const [solved, setSolved] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    setState({ question: null, submissions: [], sqlContext: null, loading: true });
    setSolved(false);
    try {
      const question = await api.fetchQuestion(token, { cohortId, moduleId, questionId });
      const submissions = Array.isArray(question.submissions) ? question.submissions : [];
      // A SQL question brings its schema, starting query and sample cases from the engine
      let sqlContext = null;
      if (question.type === 'sql') {
        try {
          sqlContext = await fetchSqlQuestionContext(cohortId, moduleId, questionId);
        } catch (contextError) {
          console.warn('Could not load SQL question context:', contextError?.message);
        }
      }
      if (request !== latest.current) return;
      setState({ question, submissions, sqlContext, loading: false });
      setSolved(submissions.some(isAccepted));
    } catch (error) {
      if (request !== latest.current) return;
      const data = error.response?.data;
      if (error.response?.status === 403 && data?.error === 'COHORT_UNPUBLISHED') {
        toast.error('This cohort is not published yet');
        navigateRef.current('/cohorts');
        return;
      }
      // The whole cohort is closed or not open yet: leave the exam rather than the question
      if (data?.reason === 'exam_ended') {
        toast.info('The exam has ended. Your submissions have been saved.', { autoClose: 6000 });
        navigateRef.current('/dashboard', { replace: true });
        return;
      }
      if (data?.reason === 'exam_not_started') {
        toast.info('This exam has not started yet.', { autoClose: 6000 });
        navigateRef.current('/cohorts', { replace: true });
        return;
      }
      console.error('Error fetching question details:', error);
      toast.error('Failed to fetch question details');
      navigateRef.current(withExamSession(`/cohorts/${cohortId}`, examSession));
    }
  }, [cohortId, moduleId, questionId, token, examSession]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const addSubmission = useCallback((entry) => {
    setState((current) => ({ ...current, submissions: [entry, ...current.submissions] }));
    if (isAccepted(entry)) setSolved(true);
  }, []);

  const refreshSubmissions = useCallback(async () => {
    try {
      const submissions = await api.fetchMySubmissions(token, { cohortId, questionId });
      setState((current) => ({ ...current, submissions }));
    } catch (error) {
      console.error('Error fetching my submissions:', error);
      setState((current) => ({ ...current, submissions: [] }));
    }
  }, [token, cohortId, questionId]);

  const progress = useMemo(() => (solved ? 'solved' : progressOf(state.submissions)), [solved, state.submissions]);

  return { ...state, solved, progress, addSubmission, refreshSubmissions, reload: load };
}
