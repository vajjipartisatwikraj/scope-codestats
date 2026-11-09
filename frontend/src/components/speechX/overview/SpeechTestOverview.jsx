import React, { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { Button, EmptyState, Skeleton, formatDateTime } from "../../ui";
import { FocusHeader, FocusPage, Reveal, SpeechCard, examStatusOf } from "../shared";
import SectionRow from "./SectionRow";
import TestInfoCard from "./TestInfoCard";
import { StartSectionDialog, EndTestDialog } from "./SectionDialogs";
import { enterFullscreen } from "../../../utils/fullscreen";
import useTestOverview from "./useTestOverview";
import "./overview.css";

/** The list and the side card while the test loads, in the shape of the real page. */
const LoadingLayout = () => (
  <div className="sxv-layout" role="status" aria-label="Loading the test">
    <div className="sxv-intro">
      <Skeleton width={220} height={32} />
      <Skeleton width="60%" height={18} style={{ marginTop: 8 }} />
    </div>
    <div className="sxv-main">
      <div className="sxv-skeleton-rows">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} height={76} radius="var(--ds-radius-xl)" />
        ))}
      </div>
    </div>
    <div className="sxv-aside">
      <div className="sxv-side">
        <Skeleton height={220} radius="var(--ds-radius-xl)" />
        <Skeleton height={180} radius="var(--ds-radius-xl)" />
      </div>
    </div>
  </div>
);

/**
 * The student's section list for a test they have started (route /speech-tests/:id): what to do
 * next, each section's state and score, and how to finish. A focus screen: the fixed FocusHeader,
 * the list on the left and the test card with the
 * progress tile on the right (stacked on a phone). The footer comes from the app shell.
 *
 * Behaviour as before: a live test the student has not started goes to /setup; a finished test
 * goes to /feedback once (unless `location.state.feedbackHandled`); the data is polled while a
 * section is waiting for its score.
 */
const SpeechTestOverview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const unfinishedCount = sections.filter((s) => ["in_progress", "queued", "scoring", "failed"].includes(s.status)).length;
  const notStartedCount = sections.filter((s) => s.status === "not_started").length;

  const startableReason = (section) => {
    if (completed) return "You have ended this test";
    if (windowState === "upcoming") return "The test has not started";
    if (windowState === "ended") return "The test has ended";
    if (running && running.sectionId !== section.sectionId) return "Submit the section you have open first";
    return "";
  };

  // The one filled button of the page: resume the open section, else start the first section that
  // can be started, else (everything scored) end the test.
  const nextSectionId = running
    ? running.sectionId
    : sections.find((s) => s.status === "not_started" && !startableReason(s))?.sectionId;

  const openSection = (section) => {
    setConfirmSection(null);
    // Asked here, in the click that opens the section: a browser only allows full screen after a click or a key press
    enterFullscreen();
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

  let body;
  if (loading) {
    body = <LoadingLayout />;
  } else if (error || !test) {
    body = (
      <Reveal className="sxv-centered">
        <SpeechCard>
          <EmptyState
            icon={<WarningCircleIcon size={28} aria-hidden="true" />}
            title="Could not open this test"
            text={error || "Test not found"}
            action={
              <div className="sxv-buttons">
                <Button onClick={reload}>Retry</Button>
                <Button variant="ghost" onClick={() => navigate("/speech-tests")}>
                  Back to VocalQ
                </Button>
              </div>
            }
          />
        </SpeechCard>
      </Reveal>
    );
  } else if (!attempt) {
    // No attempt: either the test has not opened yet, or it closed unattempted.
    body = (
      <Reveal className="sxv-centered">
        <TestInfoCard
          test={test}
          status={examStatus}
          note={
            windowState === "upcoming"
              ? `This test opens on ${formatDateTime(test.startTime)}.`
              : "The test window has closed and you did not attempt it."
          }
        />
        <Button variant="ghost" onClick={() => navigate("/speech-tests")}>
          Back to VocalQ
        </Button>
      </Reveal>
    );
  } else {
    body = (
      <div className="sxv-layout">
        <Reveal className="sxv-intro" delay={0.04}>
          <h1 className="sxv-title">{completed ? "Your sections" : "Choose a section"}</h1>
          <p className="sxv-lead">
            {completed
              ? "Your test is complete. Open a section to see its scores."
              : "Start any section when you are ready. One section can be open at a time."}
          </p>
        </Reveal>

        <Reveal className="sxv-main" delay={0.08}>
          <SpeechCard as="div" padded={false} className="sxv-list-card">
            <ol className="sxv-list" aria-label="Sections">
              {sections.map((section, index) => {
                const blockedReason = startableReason(section);
                return (
                  <SectionRow
                    key={section.sectionId}
                    index={index}
                    section={section}
                    startable={!blockedReason}
                    blockedReason={blockedReason}
                    isNext={section.sectionId === nextSectionId}
                    onViewScores={() => navigate(`/speech-tests/${id}/sections/${section.sectionId}/results`)}
                    onStart={() => setConfirmSection(section)}
                    onResume={() => openSection(section)}
                    onRetry={() => retry(section)}
                  />
                );
              })}
            </ol>
          </SpeechCard>
        </Reveal>

        <Reveal className="sxv-aside" delay={0.12}>
          <TestInfoCard
            test={test}
            status={examStatus}
            scored={scoredCount}
            total={sections.length}
            completed={completed}
            finalScore={attempt.finalScore}
            timeUsedSeconds={attempt.totalTimeUsedSeconds}
            canEnd={attempt.canEnd}
            endIsNext={!nextSectionId}
            onEnd={() => setConfirmEnd(true)}
            onLeaderboard={() => navigate(`/speech-tests/${id}/leaderboard`)}
          />
        </Reveal>
      </div>
    );
  }

  return (
    <>
      <FocusHeader subtitle="VocalQ" />

      <FocusPage width="full">{body}</FocusPage>

      <StartSectionDialog section={confirmSection} onClose={() => setConfirmSection(null)} onConfirm={() => openSection(confirmSection)} />
      <EndTestDialog
        open={confirmEnd}
        busy={ending}
        total={sections.length}
        scored={scoredCount}
        unfinished={unfinishedCount}
        notStarted={notStartedCount}
        onClose={() => setConfirmEnd(false)}
        onConfirm={endTest}
      />
    </>
  );
};

export default SpeechTestOverview;
