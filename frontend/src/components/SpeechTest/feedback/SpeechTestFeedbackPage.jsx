import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress, useTheme } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import useSurface from "../setup/useSurface";
import Reveal from "../setup/Reveal";
import CompletionPanel from "./CompletionPanel";
import FeedbackForm from "./FeedbackForm";
import ThankYou from "./ThankYou";
import useFeedbackForm from "./useFeedbackForm";
import { studentApi } from "../../../services/speechTestApi";
import useNotFoundRedirect from "../useNotFoundRedirect";
import { FOOTER_HEIGHT } from "../runner/runnerTheme";
import { formatScore } from "../speechTestMeta";

/** 38 min, 1 h 5 min, or seconds when it was very short. */
const timeSpent = (seconds) => {
  const total = Math.max(0, Math.round(seconds || 0));
  if (total < 60) return `${total} s`;
  const minutes = Math.round(total / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
};

/**
 * Shown right after a student ends a speech test (route
 * /speech-tests/:id/feedback): a confirmation with their headline figures on
 * the left and a short feedback form on the right. It also opens for a test
 * that finished on its own (the window closed) until the student answers or
 * skips. Sending or skipping returns to the section list.
 */
const SpeechTestFeedbackPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const redirectIfNotFound = useNotFoundRedirect();
  const { card, border } = useSurface();

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

  // `feedbackHandled` tells the section list not to send the student straight back
  // here, even if recording the skip failed.
  const leave = useCallback(
    () => navigate(`/speech-tests/${id}`, { replace: true, state: { feedbackHandled: true } }),
    [id, navigate]
  );
  const form = useFeedbackForm(id, { onSkipped: leave });

  const { loading, attempt, feedbackDone } = state;
  const pageSx = {
    minHeight: {
      xs: `calc(100vh - ${FOOTER_HEIGHT.xs})`,
      sm: `calc(100vh - ${FOOTER_HEIGHT.sm})`,
    },
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    px: 2,
    py: 4,
    bgcolor: theme.palette.background.default,
  };

  if (loading) {
    return (
      <Box sx={pageSx}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  // Nothing to ask: not finished yet, or already answered.
  if (!attempt || attempt.status !== "completed" || feedbackDone) {
    return <Navigate to={`/speech-tests/${id}`} replace />;
  }

  const scored = attempt.sections.filter((s) => s.status === "scored").length;
  const stats = [
    { label: "Final score", value: formatScore(attempt.finalScore) },
    { label: "Sections", value: `${scored} of ${attempt.sections.length}` },
    { label: "Time spent", value: timeSpent(attempt.totalTimeUsedSeconds) },
  ];

  return (
    <Box sx={pageSx}>
      <Reveal
        y={20}
        duration={0.6}
        sx={{
          width: "100%",
          maxWidth: 880,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px minmax(0, 1fr)" },
          bgcolor: card,
          border: `1px solid ${border}`,
          borderRadius: "18px",
          overflow: "hidden",
        }}
      >
        <CompletionPanel stats={stats} />

        <Box sx={{ borderLeft: { md: `1px solid ${border}` }, minWidth: 0 }}>
          <AnimatePresence mode="wait" initial={false}>
            {form.phase === "form" ? (
              <motion.div key="form" exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <FeedbackForm form={form} />
              </motion.div>
            ) : (
              <motion.div key="thanks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <ThankYou onDone={leave} />
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Reveal>
    </Box>
  );
};

export default SpeechTestFeedbackPage;
