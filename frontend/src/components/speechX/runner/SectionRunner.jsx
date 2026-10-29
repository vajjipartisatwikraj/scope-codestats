import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { Button, Notice, Skeleton } from "../../ui";
import { FocusHeader, FocusPage, SpeechCard, isTextOnly, questionState, typeLabel } from "../shared";
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
import useDelayedFlag from "./useDelayedFlag";
import "./runner.css";

/**
 * Which state a palette tile shows: the current question first, then the student's own mark, then
 * answered. (The mark is "later" or "review"; shared/states.js orders the rest.)
 */
const tileState = ({ current, mark, answered }) =>
  questionState({ current, review: mark === "review", later: mark === "later", answered });

/** Why the record button cannot be pressed right now, in one sentence. */
const reasonFor = ({ busy, timeUp, speaking }) => {
  if (busy) return "Your section is being submitted.";
  if (timeUp) return "Time is up.";
  if (speaking) return "Wait until the sentence has finished playing.";
  return "";
};

/** Loading: the real layout as skeletons, so nothing jumps when the section opens. */
const LoadingScreen = () => (
  <div className="sxr-root">
    <FocusHeader subtitle="Speech Judge" locked compact />
    <RunnerStage layout="split" aria-busy="true" aria-label="Opening your section">
      <div className="sxr-palette sxr-skeleton" aria-hidden="true">
        <Skeleton width={120} height={20} />
        <div className="sxr-palette__tiles">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} width="100%" height={44} radius="var(--ds-radius-pill)" />
          ))}
        </div>
      </div>
      <section className="sxr-main sxr-skeleton">
        <div className="sxr-main__scroll">
          <div className="sxr-main__inner">
            <p className="sxr-loading" role="status">
              Opening your section…
            </p>
            <div aria-hidden="true" className="sxr-skeleton__lines">
              <Skeleton width={180} height={16} />
              <Skeleton width="85%" height={24} />
              <Skeleton width="60%" height={24} />
              <Skeleton width="100%" height={160} radius="var(--ds-radius-lg)" />
            </div>
          </div>
        </div>
      </section>
    </RunnerStage>
  </div>
);

/** Error: what happened and the way back. */
const ErrorScreen = ({ message, onBack }) => (
  <div className="sxr-root">
    <FocusHeader subtitle="Speech Judge" />
    <FocusPage narrow center>
      <SpeechCard icon={WarningCircleIcon} hue="coral" title="We could not open this section" description={message} headingAs="h1" divided={false}>
        <div className="sxr-actions">
          <Button variant="primary" onClick={onBack} startIcon={<ArrowLeftIcon size={18} weight="regular" aria-hidden="true" />}>
            Back to the section list
          </Button>
          <Button onClick={() => window.location.reload()} startIcon={<ArrowClockwiseIcon size={18} weight="regular" aria-hidden="true" />}>
            Try again
          </Button>
        </div>
      </SpeechCard>
    </FocusPage>
  </div>
);

/**
 * The question screen of a running section (route /speech-tests/:id/sections/:sectionId).
 *
 * Layout: fixed top bar, then a stage that fills the rest of the viewport with the question list
 * on the left (a block on top on phones) and the current question on the right. The page itself
 * never scrolls. The Review button swaps the stage for the review page (opened from the palette or
 * the last question) without leaving the route, so the timer, answers and leave guard keep
 * running. All behaviour lives in `useSectionRunner`.
 */
const SectionRunner = () => {
  const { id, sectionId } = useParams();

  const runner = useSectionRunner(id, sectionId);
  const { marks, toggleMark } = useQuestionMarks();
  const [view, setView] = useState("questions"); // questions | review
  const { phase, session, answers, index, remainingMs, dialog, setDialog, recorderRef } = runner;
  const scrollRef = useRef(null);

  // The unsaved notice waits a moment, so a quick save never flashes a message and shifts the page.
  const unsaved = session ? Object.values(answers).filter((a) => a.status !== "saved").length : 0;
  const showSaving = useDelayedFlag(unsaved > 0, 1500);

  // A new question starts at the top of its column.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [index, view]);

  if (phase === "loading") return <LoadingScreen />;

  if (phase === "error") return <ErrorScreen message={runner.loadError} onBack={runner.backToOverview} />;

  const { section, questions } = session;
  const question = questions[index];
  const answer = answers[question._id];
  const busy = phase === "submitting";
  const timeUp = remainingMs === 0;
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
  const segments = questions.map((q, i) => (i === index ? "active" : hasContent(answers[q._id]) ? "done" : "idle"));

  const isUiJumble = section.type === "JUMBLED" && question.mode === "ui";
  const hasRecorder = !isUiJumble && !isTextOnly(section.type);
  const audioAnswer = answer && answer.kind === "audio" ? answer : null;
  // One accent (primary) button per view: the record button has it until the question is answered.
  const nextIsPrimary = !hasRecorder || Boolean(audioAnswer);
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
    <div className="sxr-root">
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
        <RunnerStage layout="split">
          <QuestionPalette
            items={items}
            answeredCount={answeredCount}
            disabled={busy}
            onSelect={runner.goTo}
            onReview={openReview}
          />

          <section className="sxr-main" aria-label={`Question ${index + 1} of ${questions.length}`}>
            <div className="sxr-main__scroll" ref={scrollRef}>
              <div className="sxr-main__inner">
                {timeUp && <Notice tone="warning">Time is up. Submitting your answers…</Notice>}
                {showSaving && !timeUp && (
                  <Notice tone="info">
                    Saving your answers… If your connection dropped, they are kept on this device and sent again
                    automatically.
                  </Notice>
                )}

                <div className="sxr-question" key={question._id}>
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

                  {hasRecorder && (
                    <RecordingPanel
                      key={question._id}
                      ref={recorderRef}
                      maxSeconds={question.maxRecordSeconds}
                      disabled={busy || timeUp || runner.speaking}
                      disabledReason={reasonFor({ busy, timeUp, speaking: runner.speaking })}
                      answer={audioAnswer}
                      onRecorded={(result) => runner.handleRecorded(question._id, result)}
                    />
                  )}
                </div>
              </div>
            </div>

            <RunnerFooterNav
              isFirst={index === 0}
              isLast={index === questions.length - 1}
              mark={marks[question._id]}
              disabled={busy}
              emphasis={nextIsPrimary}
              onPrevious={() => runner.goTo(index - 1)}
              onNext={() => runner.goTo(index + 1)}
              onReview={openReview}
              onToggleMark={(kind) => toggleMark(question._id, kind)}
            />

            <p className="sx-sr" role="status" aria-live="polite">
              Question {index + 1} of {questions.length}
            </p>
          </section>
        </RunnerStage>
      )}

      <SubmitDialog
        kind={dialog}
        answered={answeredCount}
        total={questions.length}
        onCancel={() => setDialog(null)}
        onConfirm={() => runner.submit({ auto: false })}
      />
      {busy && <SubmittingOverlay />}
    </div>
  );
};

export default SectionRunner;
