import React, { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { Button, Notice } from "../../ui";
import { AudioClipPlayer, AudioWaveform, LevelMeter } from "../../custom-components";
import { formatClock } from "../shared";
import useInputLevel from "./useInputLevel";
import SaveStatusLine from "./answers/SaveStatusLine";
import { MicRecorder, blobToWav16k } from "../../../utils/speechAudio";
import "./RecordingPanel.css";

/**
 * The clip player sits straight on the question card, so it takes the raised tone, and its play
 * circle a soft accent tint: the view's one accent fill is the record button.
 */
const PLAYER_COLORS = { bg: "var(--ds-raised)", button: "var(--ds-accent-soft)", onButton: "var(--ds-accent-text)" };

/** The live level next to the record button. Its own component, so ten updates a second never re-render the panel. */
const InputMeter = ({ analyser }) => {
  const { label, level } = useInputLevel(analyser);
  return (
    <div className="sxr-meter">
      <LevelMeter level={level} bars={10} height={32} label="Input level" valueText={label} />
      <p className="sxr-meter__text">
        Input level: <strong>{label}</strong>
      </p>
    </div>
  );
};

/** Dot and words on the left of the panel head. */
const StatusLine = ({ phase, hasAnswer }) => {
  if (phase === "processing") {
    return (
      <p className="sxr-rec__status" data-phase="processing">
        <SpinnerGapIcon className="sxr-spin" size={16} weight="bold" aria-hidden="true" />
        Processing your recording…
      </p>
    );
  }
  const recording = phase === "recording";
  return (
    <p className="sxr-rec__status" data-phase={phase}>
      <span className={recording ? "sxr-rec__dot sx-pulse" : "sxr-rec__dot"} data-on={recording ? "true" : "false"} aria-hidden="true" />
      {recording ? "Recording" : hasAnswer ? "Recorded" : "Ready to record"}
    </p>
  );
};

/**
 * Record / review / re-record control for one spoken answer.
 *
 * It only produces audio. The parent decides what to do with it (`onRecorded`), so saving and
 * retrying live in one place. `finish()` lets the parent stop an in-flight recording and wait for
 * it to be handed over, which is what happens when the section timer runs out or the student
 * moves to another question: `recorderRef.current.finish()` (the ref API the section screen
 * relies on, unchanged).
 *
 * The 72px round button is accent when idle, danger with a square while recording, and a quiet
 * raised button with a replay arrow once there is an answer ("Record again"). It is one element in
 * every state, so keyboard focus stays on it. Changes are spoken in a polite live region
 * ("Recording started", "Recording stopped, 42 seconds").
 *
 * @param {object}   props
 * @param {number}   props.maxSeconds      recording stops by itself at this length
 * @param {boolean}  props.disabled
 * @param {string}   props.disabledReason  one sentence shown while disabled, saying why
 * @param {object}   props.answer          { blob, url, durationS, status } or null
 * @param {function} props.onRecorded      async ({ blob, durationS }) => void
 */
const RecordingPanel = forwardRef(function RecordingPanel(
  { maxSeconds = 60, disabled = false, disabledReason = "", answer, onRecorded },
  ref
) {
  const [phase, setPhase] = useState("idle"); // idle | recording | processing
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState("");
  const [spoken, setSpoken] = useState({ n: 0, text: "" });

  const recorderRef = useRef(null);
  const startedAtRef = useRef(0);
  const phaseRef = useRef("idle");
  const finishingRef = useRef(null);
  const buttonRef = useRef(null);
  const hintId = useId();
  // The parent passes a new callback on every render; keeping it in a ref keeps `finish` and the
  // recording clock from being rebuilt each time.
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const say = useCallback((text) => setSpoken((previous) => ({ n: previous.n + 1, text })), []);

  const setPhaseBoth = (value) => {
    phaseRef.current = value;
    setPhase(value);
  };

  /** Stops, converts and hands the recording to the parent. */
  const finish = useCallback(async () => {
    if (finishingRef.current) return finishingRef.current;
    if (phaseRef.current !== "recording" || !recorderRef.current) return undefined;

    const run = (async () => {
      setAnalyser(null);
      setPhaseBoth("processing");
      try {
        const raw = await recorderRef.current.stop();
        recorderRef.current = null;
        if (!raw || raw.size === 0) {
          setError("Nothing was recorded. Please try again.");
          return;
        }
        const wav = await blobToWav16k(raw);
        await onRecordedRef.current({ blob: wav.blob, durationS: wav.durationS });
        const seconds = Math.max(1, Math.round(wav.durationS || 0));
        say(`Recording stopped, ${seconds} ${seconds === 1 ? "second" : "seconds"}`);
      } catch (err) {
        console.error("Recording failed:", err);
        setError("Could not process that recording. Please record again.");
      } finally {
        setPhaseBoth("idle");
        finishingRef.current = null;
      }
    })();

    finishingRef.current = run;
    return run;
  }, [say]);

  useImperativeHandle(ref, () => ({ finish }), [finish]);

  const start = async () => {
    setError("");
    try {
      const recorder = new MicRecorder();
      await recorder.start();
      recorderRef.current = recorder;
      setAnalyser(recorder.analyser);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhaseBoth("recording");
      say("Recording started");
    } catch (err) {
      console.error("Microphone error:", err);
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone access is blocked. Allow it in your browser settings and try again."
          : "Could not start the microphone. Check that one is connected."
      );
    }
  };

  // Clock for the recording, with auto-stop at the limit.
  useEffect(() => {
    if (phase !== "recording") return undefined;
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= maxSeconds) finish();
    }, 200);
    return () => clearInterval(timer);
  }, [phase, maxSeconds, finish]);

  // Release the microphone if the panel goes away mid-recording.
  useEffect(
    () => () => {
      recorderRef.current?.release();
      recorderRef.current = null;
    },
    []
  );

  const recording = phase === "recording";
  const processing = phase === "processing";
  const hasAnswer = Boolean(answer);
  const showPlayer = hasAnswer && phase === "idle";
  const blocked = disabled && !recording && !processing;

  const action = recording ? "Stop recording" : hasAnswer ? "Record again" : "Start recording";
  const hint = processing
    ? "This takes a moment."
    : recording
      ? "Press the square when you have finished."
      : blocked && disabledReason
        ? disabledReason
        : hasAnswer
          ? "Your new recording replaces this one."
          : "Press the microphone, then speak clearly.";

  return (
    <section className="sxr-rec" aria-label="Your recording" data-phase={phase}>
      {error ? (
        <Notice
          tone="danger"
          action={
            <Button variant="ghost" size="sm" onClick={() => setError("")}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Notice>
      ) : null}

      <div className="sxr-rec__head">
        <StatusLine phase={phase} hasAnswer={hasAnswer} />
        <p className="sxr-rec__max">
          Max <span className="sxr-num">{formatClock(maxSeconds)}</span>
        </p>
      </div>

      <div className="sxr-rec__visual">
        {showPlayer ? (
          <div className="sxr-rec__player">
            {answer.url ? (
              <AudioClipPlayer src={answer.url} title="Your answer" duration={answer.durationS || undefined} colors={PLAYER_COLORS} />
            ) : (
              <p className="sxr-rec__answered">
                You answered this question
                {answer.durationS ? ` (${formatClock(answer.durationS)})` : ""}.
              </p>
            )}
            <SaveStatusLine status={answer.status} visible />
          </div>
        ) : (
          <AudioWaveform
            analyser={analyser}
            active={recording}
            height={56}
            label={recording ? "Live microphone level" : "Microphone idle"}
          />
        )}
      </div>

      <div className="sxr-rec__controls">
        <button
          ref={buttonRef}
          type="button"
          className="sxr-rec__button"
          data-mode={processing ? "processing" : recording ? "recording" : hasAnswer ? "again" : "start"}
          aria-label={processing ? "Processing your recording" : action}
          aria-disabled={processing || blocked ? "true" : undefined}
          aria-describedby={hintId}
          onClick={processing || blocked ? undefined : recording ? finish : start}
        >
          {processing ? (
            <SpinnerGapIcon className="sxr-spin" size={32} weight="bold" aria-hidden="true" />
          ) : recording ? (
            <StopIcon size={32} weight="fill" aria-hidden="true" />
          ) : hasAnswer ? (
            <ArrowCounterClockwiseIcon size={32} weight="bold" aria-hidden="true" />
          ) : (
            <MicrophoneIcon size={32} weight="fill" aria-hidden="true" />
          )}
        </button>

        <div className="sxr-rec__copy">
          {recording ? (
            <p className="sxr-rec__time" aria-hidden="true">
              {formatClock(elapsed)}
            </p>
          ) : (
            <p className="sxr-rec__action">{processing ? "Processing…" : action}</p>
          )}
          <p className="sxr-rec__hint" id={hintId}>{hint}</p>
        </div>

        {recording ? <InputMeter analyser={analyser} /> : null}
      </div>

      <p className="sx-sr" role="status" aria-live="polite">
        <span key={spoken.n}>{spoken.text}</span>
      </p>
    </section>
  );
});

export default RecordingPanel;
