import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography, useTheme } from "@mui/material";
import SetupButton from "../setup/SetupButton";
import RunnerNavbar from "./RunnerNavbar";
import RunnerStage from "./RunnerStage";
import QuestionPalette from "./QuestionPalette";
import QuestionPrompt from "./QuestionPrompt";
import RecordingPanel from "./RecordingPanel";
import RunnerFooterNav from "./RunnerFooterNav";
import ReviewPage from "./review/ReviewPage";
import { SubmitDialog, SubmittingOverlay } from "./SubmitDialogs";
import useSectionRunner, { hasContent } from "./useSectionRunner";
import useQuestionMarks from "./useQuestionMarks";
import { isTextOnly, typeLabel } from "../speechTestMeta";
import { FOOTER_HEIGHT } from "./runnerTheme";

/** Page shell for the loading and error states. */
const CenteredMessage = ({ children }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: {
          xs: `calc(100vh - ${FOOTER_HEIGHT.xs})`,
          sm: `calc(100vh - ${FOOTER_HEIGHT.sm})`,
        },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: theme.palette.background.default,
      }}
    >
      {children}
    </Box>
  );
};

/** Which colour a palette tile takes: the current question first, then bookmarks, then answered. */
const tileState = ({ current, mark, answered }) => {
  if (current) return "current";
  if (mark) return mark;
  return answered ? "answered" : "open";
};

/**
 * The question screen of a running section (route
 * /speech-tests/:id/sections/:sectionId).
 *
 * Layout: fixed top bar, then a stage that fills the rest of the viewport with
 * the question list on the left and the current question on the right. The
 * page itself never scrolls. The Review button swaps the stage for the review
 * page (opened from the palette or the last question) without leaving the route, so the timer, answers and leave guard keep
 * running. All behaviour lives in `useSectionRunner`.
 */
const SectionRunner = () => {
  const { id, sectionId } = useParams();
  const isDark = useTheme().palette.mode === "dark";

  const runner = useSectionRunner(id, sectionId);
  const { marks, toggleMark } = useQuestionMarks();
  const [view, setView] = useState("questions"); // questions | review
  const { phase, session, answers, index, remainingMs, dialog, setDialog, recorderRef } = runner;

  if (phase === "loading") {
    return (
      <CenteredMessage>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <CircularProgress size={28} />
          <Typography variant="body2" color="text.secondary">
            Opening your section…
          </Typography>
        </Box>
      </CenteredMessage>
    );
  }

  if (phase === "error") {
    return (
      <CenteredMessage>
        <Alert
          severity="error"
          sx={{ maxWidth: 560 }}
          action={<SetupButton variant="secondary" onClick={runner.backToOverview}>Back</SetupButton>}
        >
          {runner.loadError}
        </Alert>
      </CenteredMessage>
    );
  }

  const { section, questions } = session;
  const question = questions[index];
  const answer = answers[question._id];
  const busy = phase === "submitting";
  const timeUp = remainingMs === 0;
  const unsaved = Object.values(answers).filter((a) => a.status !== "saved").length;
  const reviewing = view === "review";

  const items = questions.map((q, i) => ({
    id: q._id,
    state: tileState({ current: i === index, mark: marks[q._id], answered: hasContent(answers[q._id]) }),
  }));
  // The review page has no "current" question, only each one's own state.
  const reviewItems = questions.map((q) => ({
    id: q._id,
    state: tileState({ current: false, mark: marks[q._id], answered: hasContent(answers[q._id]) }),
  }));
  const answeredCount = questions.filter((q) => hasContent(answers[q._id])).length;
  const segments = questions.map((q, i) =>
    i === index ? "active" : hasContent(answers[q._id]) ? "done" : "idle"
  );

  const isUiJumble = section.type === "JUMBLED" && question.mode === "ui";
  const label = section.position
    ? `Speech test · Section ${section.position} of ${section.totalSections}`
    : `Speech test · ${typeLabel(section.type)}`;

  // Never lose a recording that is still going when the student changes screen.
  const openReview = async () => {
    await recorderRef.current?.finish();
    setView("review");
  };

  const goToFromReview = (target) => {
    setView("questions");
    runner.goTo(target);
  };

  return (
    <Box>
      <RunnerNavbar
        label={label}
        title={section.title}
        segments={segments}
        progressLabel={`${answeredCount} of ${questions.length} questions answered`}
        remainingMs={remainingMs}
      />

      {reviewing ? (
        <ReviewPage
          title={section.title}
          items={reviewItems}
          disabled={busy}
          onGoTo={goToFromReview}
          onBack={() => setView("questions")}
          onSubmit={() => setDialog("submit")}
        />
      ) : (
        <RunnerStage
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "300px minmax(0, 1fr)" },
            gridTemplateRows: { xs: "auto minmax(0, 1fr)", md: "minmax(0, 1fr)" },
          }}
        >
          <QuestionPalette
            items={items}
            answeredCount={answeredCount}
            disabled={busy}
            onSelect={runner.goTo}
            onReview={openReview}
          />

          <Box
            sx={{
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 2.5, md: 6 },
              py: 4,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {timeUp && <Alert severity="warning">Time is up. Submitting your answers…</Alert>}
            {unsaved > 0 && !timeUp && (
              <Alert severity="info">
                Saving your answers… If your connection dropped, they are kept on this device and sent again
                automatically.
              </Alert>
            )}

            <QuestionPrompt
              section={section}
              question={question}
              number={index + 1}
              total={questions.length}
              arrangement={runner.arrangements[question._id] || []}
              answer={answer}
              speaking={runner.speaking}
              busy={busy}
              onPlay={runner.playPrompt}
              onArrange={(next) => runner.handleArrange(question, next)}
              onText={(text, options) => runner.handleTextAnswer(question, text, options)}
            />

            {!isUiJumble && !isTextOnly(section.type) && (
              <RecordingPanel
                key={question._id}
                ref={recorderRef}
                maxSeconds={question.maxRecordSeconds}
                disabled={busy || timeUp || runner.speaking}
                answer={answer && answer.kind === "audio" ? answer : null}
                onRecorded={(result) => runner.handleRecorded(question._id, result)}
              />
            )}

            <Box sx={{ mt: "auto" }}>
              <RunnerFooterNav
                isFirst={index === 0}
                isLast={index === questions.length - 1}
                mark={marks[question._id]}
                disabled={busy}
                onPrevious={() => runner.goTo(index - 1)}
                onNext={() => runner.goTo(index + 1)}
                onReview={openReview}
                onToggleMark={(kind) => toggleMark(question._id, kind)}
              />
            </Box>
          </Box>
        </RunnerStage>
      )}

      <SubmitDialog
        kind={dialog}
        isDark={isDark}
        answered={answeredCount}
        total={questions.length}
        onCancel={() => setDialog(null)}
        onConfirm={() => runner.submit({ auto: false })}
      />
      {busy && <SubmittingOverlay />}
    </Box>
  );
};

export default SectionRunner;
