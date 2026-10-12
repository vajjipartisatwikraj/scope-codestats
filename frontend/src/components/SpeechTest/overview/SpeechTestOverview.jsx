import React, { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { formatDateTime } from "../speechTestMeta";
import Reveal from "../setup/Reveal";
import useSurface from "../setup/useSurface";
import TestNavbar from "./TestNavbar";
import SectionRow from "./SectionRow";
import TestInfoCard from "./TestInfoCard";
import { StartSectionDialog, EndTestDialog } from "./SectionDialogs";
import useTestOverview from "./useTestOverview";
import { examStatusOf } from "./examStatus";
import { FOOTER_HEIGHT } from "../runner/runnerTheme";

/** One bar per section for the navbar's progress strip. */
const toSegments = (sections) =>
  sections.map((s) =>
    s.status === "scored"
      ? "done"
      : s.status === "in_progress"
      ? "active"
      : s.status === "queued" || s.status === "scoring"
      ? "pending"
      : "idle"
  );

/** "SPEECH TEST · SECTION 2 OF 4": the section being worked on, or the next one. */
const toNavbarLabel = (sections, completed) => {
  if (completed) return "Speech test · completed";
  const at = sections.findIndex((s) => s.status === "in_progress");
  const next = at >= 0 ? at : sections.findIndex((s) => s.status === "not_started");
  if (next < 0) return "Speech test · all sections submitted";
  return `Speech test · section ${next + 1} of ${sections.length}`;
};

/**
 * The student's section list for a test they have started: what to do next,
 * each section's state and score, and how to finish. Runs without the app
 * sidebar; the footer comes from the app shell.
 */
const SpeechTestOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { muted } = useSurface();

  const location = useLocation();
  const { test, attempt, setAttempt, feedbackDone, loading, error, windowState, reload } = useTestOverview(id);

  const [confirmSection, setConfirmSection] = useState(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  // A live test the student has not started always begins with the setup screens.
  if (!loading && test && !attempt && windowState === "live") {
    return <Navigate to={`/speech-tests/${id}/setup`} replace />;
  }

  // A finished test asks for feedback once (sending or skipping both count).
  if (!loading && attempt?.status === "completed" && !feedbackDone && !location.state?.feedbackHandled) {
    return <Navigate to={`/speech-tests/${id}/feedback`} replace />;
  }

  const sections = attempt?.sections || [];
  const completed = attempt?.status === "completed";
  const running = sections.find((s) => s.status === "in_progress");
  const scoredCount = sections.filter((s) => s.status === "scored").length;

  const startableReason = (section) => {
    if (completed) return "You have ended this test";
    if (windowState === "upcoming") return "The test has not started";
    if (windowState === "ended") return "The test has ended";
    if (running && running.sectionId !== section.sectionId) return "Submit the section you have open first";
    return "";
  };

  const openSection = (section) => {
    setConfirmSection(null);
    navigate(`/speech-tests/${id}/sections/${section.sectionId}`);
  };

  const retry = async (section) => {
    try {
      const data = await studentApi.retrySection(id, section.sectionId);
      setAttempt(data.attempt);
      toast.info("Submitted again. Waiting for the score.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not retry"));
    }
  };

  const endTest = async () => {
    setEnding(true);
    try {
      const data = await studentApi.end(id);
      setAttempt(data.attempt);
      setConfirmEnd(false);
      toast.success("Test ended. Your final score is ready.");
      navigate(`/speech-tests/${id}/feedback`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not end the test"));
      setConfirmEnd(false);
      reload();
    } finally {
      setEnding(false);
    }
  };

  const examStatus = examStatusOf(windowState, attempt);

  return (
    <Reveal
      y={0}
      duration={0.35}
      sx={{
        display: "flex",
        flexDirection: "column",
        // Navbar + content + app footer fill the viewport exactly on desktop, so
        // the page never scrolls; only the list of sections does. On small
        // screens the stacked layout scrolls as a normal page.
        minHeight: { xs: `calc(100vh - ${FOOTER_HEIGHT.xs})`, md: undefined },
        height: { md: `calc(100vh - ${FOOTER_HEIGHT.sm})` },
        overflow: { md: "hidden" },
      }}
    >
      <TestNavbar
        label={toNavbarLabel(sections, completed)}
        segments={toSegments(sections)}
        progressLabel={`${scoredCount} of ${sections.length} sections scored`}
      />

      {loading ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={28} thickness={4} />
        </Box>
      ) : error || !test ? (
        <Box sx={{ maxWidth: 560, mx: "auto", width: "100%", px: 2, py: 6 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/speech-tests")}>
                Back
              </Button>
            }
          >
            {error || "Test not found"}
          </Alert>
        </Box>
      ) : !attempt ? (
        // No attempt: either the test has not opened yet, or it closed unattempted.
        <Box sx={{ maxWidth: 420, mx: "auto", width: "100%", px: 2, py: 6, display: "flex" }}>
          <Reveal y={12} sx={{ width: "100%", display: "flex" }}>
            <TestInfoCard
              test={test}
              status={examStatus}
              note={
                windowState === "upcoming"
                  ? `This test opens on ${formatDateTime(test.startTime)}.`
                  : "The test window has closed and you did not attempt it."
              }
            />
          </Reveal>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 1600,
            mx: "auto",
            px: { xs: 2, md: 6 },
            pt: { xs: 3, md: 3.5 },
            pb: { xs: 3, md: 2.5 },
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 360px" },
            gap: { xs: 3, md: 5 },
            // On desktop the grid fills the space under the navbar: the side card
            // stays put and only the list of sections scrolls.
            minHeight: { md: 0 },
            gridTemplateRows: { md: "minmax(0, 1fr)" },
            alignItems: "stretch",
          }}
        >
          <Reveal delay={0.05} sx={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Box sx={{ flexShrink: 0 }}>
              <Typography component="h1" sx={{ fontWeight: 700, fontSize: "1.45rem" }}>
                Choose a section
              </Typography>
              <Typography sx={{ color: muted, fontSize: "0.95rem", mt: 0.25, mb: { xs: 2.5, md: 0.5 } }}>
                Start any section when you are ready. One section can be open at a time.
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                overflowY: { md: "auto" },
                pr: { md: 1 },
                // Rows fade out near the top and bottom edges instead of being cut
                // by a hard line. The padding matches the fade, so rows at rest
                // sit fully visible inside it and only fade while scrolling past.
                py: { md: "18px" },
                maskImage: {
                  md: "linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
                },
                WebkitMaskImage: {
                  md: "linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
                },
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(5, 133, 224, 0.5)", borderRadius: 3 },
                "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
                scrollbarWidth: "thin",
              }}
            >
              {sections.map((section, index) => {
                const blockedReason = startableReason(section);
                return (
                  <SectionRow
                    key={section.sectionId}
                    index={index}
                    section={section}
                    startable={!blockedReason}
                    blockedReason={blockedReason}
                    onViewScores={() => navigate(`/speech-tests/${id}/sections/${section.sectionId}/results`)}
                    onStart={() => setConfirmSection(section)}
                    onResume={() => openSection(section)}
                    onRetry={() => retry(section)}
                  />
                );
              })}
            </Box>
          </Reveal>

          <Reveal delay={0.15} sx={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
            <TestInfoCard
              test={test}
              status={examStatus}
              scored={scoredCount}
              total={sections.length}
              completed={completed}
              finalScore={attempt.finalScore}
              timeUsedSeconds={attempt.totalTimeUsedSeconds}
              canEnd={attempt.canEnd}
              onEnd={() => setConfirmEnd(true)}
              onLeaderboard={() => navigate(`/speech-tests/${id}/leaderboard`)}
            />
          </Reveal>
        </Box>
      )}

      <StartSectionDialog
        section={confirmSection}
        onClose={() => setConfirmSection(null)}
        onConfirm={() => openSection(confirmSection)}
      />
      <EndTestDialog
        open={confirmEnd}
        busy={ending}
        total={sections.length}
        onClose={() => setConfirmEnd(false)}
        onConfirm={endTest}
      />
    </Reveal>
  );
};

export default SpeechTestOverview;
