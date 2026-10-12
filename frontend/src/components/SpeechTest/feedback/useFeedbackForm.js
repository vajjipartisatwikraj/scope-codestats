import { useState } from "react";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { COMMENT_LIMIT } from "./feedbackMeta";

/**
 * State and submission of the feedback form.
 *
 * `phase` is "form" until feedback is sent, then "thanks". Skipping records that
 * the form was dismissed and calls `onSkipped`, so it is not shown again.
 */
const useFeedbackForm = (testId, { onSkipped } = {}) => {
  const [rating, setRating] = useState(0);
  const [ratings, setRatings] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("form"); // form | thanks

  const setCriterion = (key, value) => setRatings((prev) => ({ ...prev, [key]: value }));
  const setCommentText = (text) => setComment(text.slice(0, COMMENT_LIMIT));

  const submit = async () => {
    if (!rating || busy) return;
    setBusy(true);
    try {
      await studentApi.submitFeedback(testId, { rating, ratings, comment });
      setPhase("thanks");
    } catch (error) {
      // Already sent from another tab: nothing more to ask.
      if (error?.response?.status === 409) {
        onSkipped?.();
        return;
      }
      toast.error(apiErrorMessage(error, "Could not send your feedback"));
    } finally {
      setBusy(false);
    }
  };

  const skip = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await studentApi.submitFeedback(testId, { skipped: true });
    } catch {
      // Skipping must never get in the way; leaving is fine even if this fails.
    } finally {
      setBusy(false);
      onSkipped?.();
    }
  };

  return {
    rating,
    setRating,
    ratings,
    setCriterion,
    comment,
    setComment: setCommentText,
    busy,
    phase,
    canSubmit: rating > 0,
    submit,
    skip,
  };
};

export default useFeedbackForm;
