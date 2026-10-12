import { useCallback, useEffect, useRef, useState } from "react";
import { MicRecorder, blobToWav16k } from "../../../utils/speechAudio";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { playStartTone, playStopTone } from "../../../utils/feedbackTones";

export const MAX_CHECK_SECONDS = 10;
const MIN_CHECK_SECONDS = 0.6;
/** After this many unclear results the student may continue anyway. */
const MAX_UNCLEAR_CHECKS = 3;

const micErrorMessage = (error) =>
  error?.name === "NotAllowedError"
    ? "Microphone access is blocked. Allow it in your browser settings and try again."
    : "Could not start the microphone. Check that one is connected.";

/**
 * State machine behind the microphone check: record a short clip, send it for
 * analysis, keep the result.
 *
 * phase: "idle" -> "recording" -> "processing" -> "ready"
 * `checking` is true while the clip is being analysed; `result` holds the last
 * answer. `passed` says whether the student may carry on: the audio was clear,
 * the check service was unavailable, or they have tried enough times.
 */
const useAudioCheck = (testId) => {
  const [phase, setPhase] = useState("idle");
  const [analyser, setAnalyser] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState(null);
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [unclearCount, setUnclearCount] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const startedAtRef = useRef(0);
  const stoppingRef = useRef(false);

  const start = useCallback(async () => {
    setError("");
    setResult(null);
    setClip(null);
    try {
      // Let the start sound finish first so the microphone does not record it.
      const toneMs = playStartTone();
      if (toneMs > 0) await new Promise((resolve) => setTimeout(resolve, toneMs + 60));

      const recorder = new MicRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsed(0);
      setAnalyser(recorder.analyser);
      setPhase("recording");
    } catch (err) {
      setError(micErrorMessage(err));
      setPhase("idle");
    }
  }, []);

  const stop = useCallback(async () => {
    if (!recorderRef.current || stoppingRef.current) return;
    stoppingRef.current = true;
    setAnalyser(null);
    setPhase("processing");

    try {
      const raw = await recorderRef.current.stop();
      recorderRef.current = null;
      // The microphone is already closed, so this sound is not captured.
      playStopTone();
      if (!raw || raw.size === 0) throw new Error("empty");

      const wav = await blobToWav16k(raw);
      if (wav.durationS < MIN_CHECK_SECONDS) {
        setError("That was too short. Say your name and then stop the recording.");
        setPhase("idle");
        return;
      }
      setClip(wav.blob);
      setPhase("ready");
    } catch {
      setError("Could not process that recording. Please try again.");
      setPhase("idle");
    } finally {
      stoppingRef.current = false;
    }
  }, []);

  // Recording clock, with an automatic stop at the limit.
  useEffect(() => {
    if (phase !== "recording") return undefined;
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_CHECK_SECONDS) stop();
    }, 200);
    return () => clearInterval(timer);
  }, [phase, stop]);

  // Release the microphone if the student leaves mid-recording.
  useEffect(
    () => () => {
      recorderRef.current?.release();
      recorderRef.current = null;
    },
    []
  );

  const check = useCallback(async () => {
    if (!clip) return;
    setChecking(true);
    setError("");
    try {
      const data = await studentApi.audioCheck(testId, clip);
      setResult(data);
      if (data.available && !data.clear) setUnclearCount((count) => count + 1);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not check your audio. Please try again."));
    } finally {
      setChecking(false);
    }
  }, [clip, testId]);

  const passed =
    Boolean(result) && (result.available === false || result.clear || unclearCount >= MAX_UNCLEAR_CHECKS);

  return { phase, analyser, elapsed, result, checking, error, passed, clip, hasClip: Boolean(clip), start, stop, check };
};

export default useAudioCheck;
