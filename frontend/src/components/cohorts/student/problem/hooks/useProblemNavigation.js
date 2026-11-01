import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../contexts/AuthContext';
import { withExamSession } from '../../../../../utils/examSession';
import * as api from '../api/problemApi';

/** The module has used several names for "solved"; any of them counts */
export const isSolvedItem = (item) => Boolean(item.isSolved || item.solved || item.status === 'accepted' || item.userStatus === 'accepted');

/**
 * Moving between the questions of the module: the list for the problem list, the position of the
 * open question, and previous, next and choose-one. Every hop stays in this tab and keeps the exam
 * flag, so an exam keeps its fullscreen and its countdown.
 *
 * Previous is Ctrl or Cmd + Shift + , and next is Ctrl or Cmd + Shift + .
 *
 *   refreshKey   change it (when the question is solved) to read the module again
 */
export default function useProblemNavigation({ cohortId, moduleId, questionId, examSession, refreshKey }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ questions: [], loading: false });

  useEffect(() => {
    if (!cohortId || !moduleId || !token) return undefined;
    let current = true;
    setState((previous) => ({ ...previous, loading: true }));
    api
      .fetchModule(token, { cohortId, moduleId })
      .then((module) => current && setState({ questions: module?.questions || [], loading: false }))
      .catch((error) => {
        console.error('Error fetching module questions:', error);
        if (current) setState((previous) => ({ ...previous, loading: false }));
      });
    return () => {
      current = false;
    };
  }, [cohortId, moduleId, questionId, token, refreshKey]);

  const { questions, loading } = state;
  const index = questions.findIndex((entry) => entry._id === questionId);
  const hasPrevious = !loading && index > 0;
  const hasNext = !loading && index !== -1 && index < questions.length - 1;

  const go = useCallback(
    (target) => {
      if (target && target._id !== questionId) navigate(withExamSession(`/cohorts/${cohortId}/modules/${moduleId}/questions/${target._id}`, examSession));
    },
    [navigate, cohortId, moduleId, questionId, examSession]
  );
  const goPrevious = useCallback(() => hasPrevious && go(questions[index - 1]), [hasPrevious, go, questions, index]);
  const goNext = useCallback(() => hasNext && go(questions[index + 1]), [hasNext, go, questions, index]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
      if (event.code === 'Comma') {
        event.preventDefault();
        goPrevious();
      } else if (event.code === 'Period') {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goPrevious, goNext]);

  return { questions, loading, index, hasPrevious, hasNext, go, goPrevious, goNext };
}
