import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { Button, EmptyState, Skeleton, Stepper } from "../../ui";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { FocusHeader, FocusPage, Reveal, SpeechCard, useNotFoundRedirect } from "../shared";
import StepTransition from "./StepTransition";
import InstructionsStep from "./InstructionsStep";
import SpeakerCheckStep from "./SpeakerCheckStep";
import AudioCheckStep from "./AudioCheckStep";
import "./setup.css";

// The order students move through. Add a step here and render it below.
const STEPS = ["instructions", "speaker", "audio"];

/** The stepper's pills, in the same order */
const STEP_LABELS = [
  { key: "instructions", label: "Instructions" },
  { key: "speaker", label: "Speaker check" },
  { key: "audio", label: "Audio check" },
];

/** The page while the test loads: the shape of the instructions step */
const SetupSkeleton = () => (
  <div className="sxs-skeleton" role="status" aria-label="Loading your test setup">
    <div className="sxs-skeleton__head">
      <Skeleton width="min(320px, 70%)" height={32} radius="var(--ds-radius-md)" />
      <Skeleton width={96} height={20} radius="var(--ds-radius-md)" />
    </div>
    <div className="sxs-skeleton__grid">
      <Skeleton height={420} radius="var(--ds-radius-xl)" />
      <Skeleton height={420} radius="var(--ds-radius-xl)" />
    </div>
  </div>
);

/**
 * Everything a student sees between pressing "Start Test" and the first section: the
 * instructions, a speaker check, then a microphone check. The attempt is only created when they
 * press "Start exam", so reading and checking use up nothing.
 *
 * The steps live in one page so the move between them can slide (StepTransition). The order, the
 * gating (acknowledge, speaker confirmation, a passed audio check, a live test window) and the
 * redirects are unchanged from the Material UI version.
 */
const SpeechTestSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const redirectIfNotFound = useNotFoundRedirect();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(STEPS[0]);
  const [direction, setDirection] = useState(1);
  const [stepped, setStepped] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [clockOffset, setClockOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.get(id);
      // Already started: nothing to read or check again, go straight to the test.
      if (data.attempt) {
        navigate(`/speech-tests/${id}`, { replace: true });
        return;
      }
      setClockOffset(new Date(data.serverTime).getTime() - Date.now());
      setTest(data.test);
    } catch (err) {
      if (redirectIfNotFound(err)) return;
      setError(apiErrorMessage(err, "Could not load this test"));
    } finally {
      setLoading(false);
    }
  }, [id, navigate, redirectIfNotFound]);

  useEffect(() => {
    load();
  }, [load]);

  // Keeps "live" accurate if the student waits on this page for the start time.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Moves one step forward (+1) or back (-1) and sets the slide direction.
  const move = (delta) => {
    const next = STEPS[STEPS.indexOf(step) + delta];
    if (!next) return;
    setDirection(delta);
    setStepped(true);
    setStep(next);
  };

  const startExam = async () => {
    setStarting(true);
    try {
      await studentApi.start(id);
      // Fade the screen out before moving on, so the change is not abrupt.
      setLeaving(true);
      setTimeout(() => navigate(`/speech-tests/${id}`, { replace: true }), 220);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not start the test"));
      setStarting(false);
    }
  };

  // Asks for the test again after a failed load
  const retry = () => {
    setError("");
    setLoading(true);
    load();
  };

  const serverNow = now + clockOffset;
  const state = !test
    ? null
    : serverNow < new Date(test.startTime).getTime()
    ? "upcoming"
    : serverNow >= new Date(test.endTime).getTime()
    ? "ended"
    : "live";

  const stepIndex = STEPS.indexOf(step);

  return (
    <>
      <FocusHeader subtitle="Speech Judge" />

      {loading ? (
        <FocusPage wide aria-busy="true">
          <h1 className="sx-sr">Test setup</h1>
          <Reveal y={0} delay={0.2}>
            <SetupSkeleton />
          </Reveal>
        </FocusPage>
      ) : error || !test ? (
        <FocusPage narrow center>
          <h1 className="sx-sr">Test setup</h1>
          <Reveal>
            <SpeechCard>
              <EmptyState
                icon={<WarningCircleIcon size={28} weight="regular" />}
                title="We could not open this test"
                text={error || "Test not found"}
                action={
                  <div className="sxs-error-actions">
                    {error ? (
                      <Button onClick={retry} startIcon={<ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" />}>
                        Try again
                      </Button>
                    ) : null}
                    <Button variant={error ? "ghost" : "secondary"} onClick={() => navigate("/speech-tests")}>
                      Back to speech tests
                    </Button>
                  </div>
                }
              />
            </SpeechCard>
          </Reveal>
        </FocusPage>
      ) : (
        <FocusPage wide>
          <Reveal y={0} duration={0.32} leaving={leaving} className={`sxs-flow sxs-flow--${step}`}>
            <div className="sxs-head">
              <div className="sxs-head__text">
                <h1 className="sxs-head__title">{test.title}</h1>
                <p className="sxs-head__sub">Test setup</p>
              </div>
              <Stepper
                className="sxs-stepper"
                label="Test setup progress"
                steps={STEP_LABELS}
                current={step}
                completed={STEPS.slice(0, stepIndex)}
              />
            </div>

            {/* The overflow keeps the sliding steps from causing a horizontal scrollbar. */}
            <div className="sxs-viewport">
              <StepTransition key={step} direction={direction} animate={stepped}>
                {step === "instructions" && (
                  <InstructionsStep
                    test={test}
                    state={state}
                    acknowledged={acknowledged}
                    onAcknowledge={setAcknowledged}
                    onContinue={() => move(1)}
                    animateIn={!stepped}
                  />
                )}
                {step === "speaker" && <SpeakerCheckStep onBack={() => move(-1)} onContinue={() => move(1)} />}
                {step === "audio" && (
                  <AudioCheckStep testId={id} test={test} state={state} starting={starting} onBack={() => move(-1)} onStart={startExam} />
                )}
              </StepTransition>
            </div>
          </Reveal>
        </FocusPage>
      )}
    </>
  );
};

export default SpeechTestSetup;
