import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import useNotFoundRedirect from "../useNotFoundRedirect";
import SetupHeader from "./SetupHeader";
import HeaderTools from "./HeaderTools";
import Reveal from "./Reveal";
import StepTransition from "./StepTransition";
import InstructionsStep from "./InstructionsStep";
import SpeakerCheckStep from "./SpeakerCheckStep";
import AudioCheckStep from "./AudioCheckStep";
import { FOOTER_HEIGHT } from "../runner/runnerTheme";

// The order students move through. Add a step here and render it below.
const STEPS = ["instructions", "speaker", "audio"];

/**
 * Everything a student sees between pressing "Start Test" and the first
 * section: the instructions, then a microphone check. The attempt is only
 * created when they press "Start exam", so reading and checking use up nothing.
 *
 * The two steps live in one page so the move between them can slide.
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

  const serverNow = now + clockOffset;
  const state = !test
    ? null
    : serverNow < new Date(test.startTime).getTime()
    ? "upcoming"
    : serverNow >= new Date(test.endTime).getTime()
    ? "ended"
    : "live";

  return (
    // The footer is rendered by the app shell below this screen. The min-height
    // keeps it at the bottom of the viewport and lets the content sit centred.
    <Reveal
      y={0}
      duration={0.35}
      leaving={leaving}
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 110px)",
        // The instructions step is sized to the screen (top bar + content + footer
        // fill the viewport exactly) so it never scrolls on desktop.
        ...(step === "instructions" && !loading && test
          ? { height: { md: `calc(100vh - ${FOOTER_HEIGHT.sm})` }, overflow: { md: "hidden" } }
          : {}),
      }}
    >
      <SetupHeader subtitle="Speech Judge">
        <HeaderTools />
      </SetupHeader>

      {loading ? (
        <Reveal y={0} delay={0.2} sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={28} thickness={4} />
        </Reveal>
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
      ) : (
        // overflow keeps the sliding steps from causing a horizontal scrollbar.
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <StepTransition key={step} direction={direction}>
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
                <AudioCheckStep
                  testId={id}
                  test={test}
                  state={state}
                  starting={starting}
                  onBack={() => move(-1)}
                  onStart={startExam}
                />
              )}
            </StepTransition>
          </AnimatePresence>
        </Box>
      )}
    </Reveal>
  );
};

export default SpeechTestSetup;
