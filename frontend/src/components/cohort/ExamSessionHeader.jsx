import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import { toast } from "react-toastify";
import axios from "../../utils/axiosConfig";
import { apiUrl } from "../../config/apiConfig";
import ExamSessionBar from "./ExamSessionBar";
import useExamGuard from "../../hooks/useExamGuard";
import useExamProctor from "../../hooks/useExamProctor";

/**
 * Owns everything that belongs to the exam session as a whole: the clock, the
 * END TEST action, fullscreen enforcement and integrity monitoring.
 *
 * Mounted by the app shell for the whole exam tab, so all of it persists while
 * the student moves between the cohort page and individual questions. Because it
 * lives above the routes it is also the single guard for the tab — the
 * page-level guards stand down during an exam session so the student cannot
 * receive the same notice several times over.
 */
const ExamSessionHeader = ({ cohortId }) => {
  const { exam, title, remainingMs, refresh } = useExamGuard({ cohortId });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);

  const isLiveExam = Boolean(exam?.isExam) && exam.state === "open";

  // Warnings are toasted rather than blocking, so a student is told immediately
  // without losing their place in the paper.
  const handleWarning = useCallback(({ message }) => {
    toast.warn(message, { autoClose: 5000, toastId: "proctor-warning" });
  }, []);

  const { fullscreen, counters, enterFullscreen } = useExamProctor({
    cohortId,
    enabled: isLiveExam,
    onWarning: handleWarning,
  });

  // Fullscreen can only be requested from a user gesture, so the exam asks for
  // it with a dialog on entry and again after every exit.
  useEffect(() => {
    if (!isLiveExam) {
      setFullscreenPromptOpen(false);
      return;
    }
    if (!fullscreen) setFullscreenPromptOpen(true);
  }, [isLiveExam, fullscreen]);

  const goFullscreen = async () => {
    const ok = await enterFullscreen();
    if (ok) {
      setFullscreenPromptOpen(false);
    } else {
      toast.error(
        "Your browser refused fullscreen. Press F11 to continue in fullscreen."
      );
    }
  };

  const endTest = async () => {
    setEnding(true);
    try {
      await axios.post(`${apiUrl}/cohorts/${cohortId}/exam/finish`, {});
      toast.success("Test submitted. You cannot reopen this exam.", {
        autoClose: 5000,
      });
      // Leaving fullscreen after the test is over is not a violation, and
      // monitoring has already stopped by the time the guard evicts.
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      // The guard's next poll sees `exam_submitted` and evicts to the dashboard,
      // which keeps one code path responsible for leaving the exam.
      await refresh();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not submit the test. Try again."
      );
    } finally {
      setEnding(false);
      setConfirmOpen(false);
    }
  };

  // Nothing to show until the first heartbeat confirms this is an exam. The bar
  // would otherwise flash an empty timer on a practice cohort opened with the
  // exam flag by hand.
  if (!exam?.isExam) return null;

  const flagged =
    (counters.tabSwitchCount || 0) + (counters.fullscreenExitCount || 0);

  return (
    <>
      <ExamSessionBar
        title={title}
        remainingMs={remainingMs}
        state={exam.state}
        ending={ending}
        onEndTest={() => setConfirmOpen(true)}
        violationCount={flagged}
      />

      {/* Fullscreen gate. Non-dismissable while the exam is live: the only way
          out is entering fullscreen or ending the test. */}
      <Dialog open={fullscreenPromptOpen} disableEscapeKeyDown maxWidth="xs">
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}
        >
          <WarningAmberIcon color="warning" />
          Fullscreen required
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This exam runs in fullscreen. Leaving fullscreen, switching tabs or
            moving to another window is recorded and shared with your evaluator.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1.5, fontSize: "0.85rem" }}>
            Reloading the page always ends fullscreen — that is a browser rule and
            it is not counted against you. Click below, or anywhere on the page,
            to go back to fullscreen.
          </DialogContentText>
          {flagged > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="error" sx={{ fontWeight: 700 }}>
                Recorded so far: {counters.tabSwitchCount || 0} tab switch(es),{" "}
                {counters.fullscreenExitCount || 0} fullscreen exit(s).
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={goFullscreen}
            variant="contained"
            startIcon={<FullscreenIcon />}
          >
            Enter Fullscreen
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>End this test?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your submitted answers are already saved. Ending the test is final —
            you will not be able to open this exam again, even if time remains.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">
            Keep working
          </Button>
          <Button
            onClick={endTest}
            color="error"
            variant="contained"
            disabled={ending}
          >
            {ending ? "Ending…" : "End Test"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ExamSessionHeader;
