import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../../contexts/AuthContext';
import * as api from '../api/problemApi';
import { isAccepted } from '../model/submissions';

/**
 * The state of a multiple choice question: the option chosen, the answer once it is sent, and
 * sending it. A question already answered correctly opens with that option chosen and locked.
 *
 * Returns { selected, choose(id), submit(), submitting, answered, correct, locked }
 *   selected    the _id of the chosen option (null before a choice)
 *   answered    the answer has been sent (so the options show which were right)
 *   correct     the answer sent was right
 *   locked      already answered correctly: nothing more to send
 */
export default function useMcq({ ids, problem }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { question, submissions, loading, addSubmission } = problem;
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState(null); // { optionId, isCorrect }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(null);
    setAnswer(null);
    if (loading || question?.type !== 'mcq') return;
    // Already solved: show the accepted option as chosen
    const accepted = submissions.find(isAccepted);
    const option = accepted && (question.options || []).find((entry) => String(entry._id) === String(accepted.selectedOption));
    if (option) {
      setSelected(option._id);
      setAnswer({ optionId: option._id, isCorrect: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, question?._id]);

  const choose = useCallback((id) => {
    setSelected(id);
    setAnswer(null);
  }, []);

  const submit = useCallback(async () => {
    if (!selected) {
      toast.warn('Please select an answer first');
      return;
    }
    const option = (question.options || []).find((entry) => entry._id === selected);
    if (!option) {
      toast.error('Invalid option selected');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.submitMcq(token, ids, option);
      setAnswer({ optionId: option._id, isCorrect: Boolean(option.isCorrect) });
      if (response.submission) addSubmission(response.submission);
      if (option.isCorrect) toast.success('Correct answer');
      else toast.warn('Incorrect answer');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.error === 'COHORT_UNPUBLISHED') {
        toast.error('This cohort is not published yet');
        navigate('/cohorts');
        return;
      }
      toast.error(`Failed to submit answer: ${error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }, [selected, question, token, ids, addSubmission, navigate]);

  const answered = Boolean(answer);
  return { selected, choose, submit, submitting, answered, correct: Boolean(answer?.isCorrect), locked: answered && problem.solved };
}
