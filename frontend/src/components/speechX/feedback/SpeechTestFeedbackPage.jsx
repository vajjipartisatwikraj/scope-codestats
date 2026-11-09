import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Skeleton, formatNumber } from "../../ui";
import { FocusHeader, FocusPage, Reveal, formatScore, useNotFoundRedirect } from "../shared";
import { studentApi } from "../../../services/speechTestApi";
import CompletionPanel from "./CompletionPanel";
import FeedbackForm from "./FeedbackForm";
import ThankYou from "./ThankYou";
import useFeedbackForm from "./useFeedbackForm";
import "./feedback.css";

/** 38 min, 1 h 5 min, or seconds when it was very short. */
const timeSpent = (seconds) => {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total} s`;
  const minutes = Math.round(total / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
};

/**
 * Shown right after a student ends a speech test (route /speech-tests/:id/feedback): one card with
 * a confirmation and their final score on the left and a short feedback form on the right. It also
 * opens for a test that finished on its own (the window closed) until the student answers or
 * skips. Sending or skipping returns to the section list.
 *
 * Like the old page it has no way out except the form: the header is locked (the brand is plain
 * text, the profile is not pressable).
 */
const SpeechTestFeedbackPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const redirectIfNotFound = useNotFoundRedirect();

  const [state, setState] = useState({ loading: true, attempt: null, feedbackDone: false });

  useEffect(() => {
    let cancelled = false;
    studentApi
      .get(id)
      .then((data) => !cancelled && setState({ loading: false, attempt: data.attempt, feedbackDone: data.feedbackDone }))
      .catch((error) => {
        if (cancelled || redirectIfNotFound(error)) return;
        setState({ loading: false, attempt: null, feedbackDone: false });
      });
    return () => {
      cancelled = true;
    };
  }, [id, redirectIfNotFound]);

  // `feedbackHandled` tells the section list not to send the student straight back here, even if
  // recording the skip failed.
  const leave = useCallback(
    () => navigate(`/speech-tests/${id}`, { replace: true, state: { feedbackHandled: true } }),
    [id, navigate]
  );
  const form = useFeedbackForm(id, { onSkipped: leave });

  const { loading, attempt, feedbackDone } = state;

  if (loading) {
    return (
      <>
        <FocusHeader subtitle="VocalQ" locked />
        <FocusPage center role="status" aria-label="Loading">
          <div className="sxf-skeleton">
            <Skeleton height={480} radius="var(--ds-radius-lg)" />
          </div>
        </FocusPage>
      </>
    );
  }

  // Nothing to ask: not finished yet, or already answered.
  if (!attempt || attempt.status !== "completed" || feedbackDone) {
    return <Navigate to={`/speech-tests/${id}`} replace />;
  }

  const scored = attempt.sections.filter((s) => s.status === "scored").length;
  const total = attempt.sections.length;

  return (
    <>
      <FocusHeader subtitle="VocalQ" locked />
      <FocusPage center>
        <div className="sxf-card">
          <CompletionPanel
            finalScore={formatScore(attempt.finalScore)}
            sections={`${formatNumber(scored)} of ${formatNumber(total)}`}
            timeSpent={timeSpent(attempt.totalTimeUsedSeconds)}
          />

          {/* Remounted on a change of phase, so the new card plays its entrance */}
          <Reveal key={form.phase} y={form.phase === "form" ? 12 : 8} className="sxf-side">
            {form.phase === "form" ? <FeedbackForm form={form} /> : <ThankYou onDone={leave} />}
          </Reveal>
        </div>
      </FocusPage>
    </>
  );
};

export default SpeechTestFeedbackPage;
