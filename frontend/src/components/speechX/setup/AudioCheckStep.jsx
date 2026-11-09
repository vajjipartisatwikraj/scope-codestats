import React, { useEffect, useMemo, useRef, useState } from "react";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { RocketLaunchIcon } from "@phosphor-icons/react/dist/csr/RocketLaunch";
import { Button, Notice } from "../../ui";
import { AudioWaveform } from "../../custom-components";
import { SpeechCard, formatClock, formatDateTime } from "../shared";
import RecordButton from "./RecordButton";
import StepHead from "./StepHead";
import StepNav from "./StepNav";
import CheckList from "./CheckList";
import TranscriptPanel from "./TranscriptPanel";
import useAudioCheck, { MAX_CHECK_SECONDS } from "./useAudioCheck";
import useClipPlayback from "./useClipPlayback";
import useInputLevel from "./useInputLevel";
import { buildChecks, detectBrowser } from "./audioChecks";

/** The line under the record button, matching where the check is at. */
const describeAction = ({ phase, checking, hasClip }) => {
  if (phase === "recording") return "Recording. Tap to stop";
  if (phase === "processing") return "Processing your recording\u2026";
  if (checking) return "Checking your audio\u2026";
  if (hasClip) return "Tap to record again";
  return "Tap to start recording";
};

/** The sentence beside a locked "Start exam" button: the one thing left to do */
const startReason = ({ state, hasClip, result, passed, phase }) => {
  if (state === "upcoming") return "This test is not open yet.";
  if (state !== "live") return "This test has ended.";
  if (passed) return "";
  if (phase === "recording" || phase === "processing") return "Finish your recording to continue.";
  if (!hasClip) return "Record your name and check your audio to start.";
  if (!result) return "Select Check audio to start.";
  return "Your audio was not clear enough yet. Record again and check it once more.";
};

/**
 * Step 3 of the pre-test flow: the student says their name, we show what was heard, and only then
 * can the exam start. Nothing recorded here is stored.
 *
 * Left: the recorder (timer, 72px record button, live waveform, playback, the transcript). Right:
 * the checklist (microphone access, input level, clear speech, browser support) with a "How to fix"
 * for whatever is wrong. "Start exam" stays locked until `passed` (unchanged logic) and says why.
 *
 * Props: testId, test, state ('upcoming' | 'live' | 'ended'), starting, onBack, onStart
 */
const AudioCheckStep = ({ testId, test, state, starting, onBack, onStart }) => {
  const audio = useAudioCheck(testId);
  const { phase, analyser, elapsed, result, checking, error, errorKind, passed, clip, hasClip, start, stop, check } = audio;
  const playback = useClipPlayback(clip);

  const recording = phase === "recording";
  const processing = phase === "processing";
  const { level, peak } = useInputLevel(recording ? analyser : null);

  // Once a recording has started, the browser has granted the microphone. A refusal takes it back.
  const [micAllowed, setMicAllowed] = useState(false);
  useEffect(() => {
    if (phase === "recording") setMicAllowed(true);
  }, [phase]);
  useEffect(() => {
    if (["blocked", "missing", "unavailable"].includes(errorKind)) setMicAllowed(false);
  }, [errorKind]);

  const browser = useMemo(() => detectBrowser(), []);
  const checks = buildChecks({ phase, errorKind, result, checking, hasClip, passed, micAllowed, peak, browser });

  // Screen reader status: transitions only, never the running clock (design/screens.md section 22)
  const [announcement, setAnnouncement] = useState("");
  const previousPhase = useRef(phase);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  useEffect(() => {
    const before = previousPhase.current;
    previousPhase.current = phase;
    if (before === phase) return;
    if (phase === "recording") setAnnouncement("Recording started");
    else if (before === "recording" && phase === "processing") {
      const seconds = Math.max(1, Math.round(elapsedRef.current));
      setAnnouncement(`Recording stopped, ${seconds} ${seconds === 1 ? "second" : "seconds"}`);
    } else if (phase === "ready") setAnnouncement("Recording ready. You can play it back or check your audio.");
  }, [phase]);
  const playingBefore = useRef(false);
  useEffect(() => {
    if (playingBefore.current === playback.playing) return;
    playingBefore.current = playback.playing;
    setAnnouncement(playback.playing ? "Playing your recording" : "Playback stopped");
  }, [playback.playing]);

  const toggleRecording = () => {
    if (recording) {
      stop();
      return;
    }
    playback.stop();
    start();
  };

  const showClipActions = hasClip && !recording && !processing;
  const reason = startReason({ state, hasClip, result, passed, phase });
  // Counts up while recording and rests on the length of the sample afterwards
  const timerValue = recording || hasClip || processing ? elapsed : 0;

  return (
    <div className="sxs-audio">
      <div className="sxs-audio__grid">
        <SpeechCard className="sxs-recorder" aria-labelledby="sxs-audio-title" fill>
          <StepHead
            id="sxs-audio-title"
            title="Test your audio"
            hideTitle
            description="Say your name clearly, then select Check audio. Nothing from this check is saved."
          />

          <div className="sxs-center">
            <p className="sxs-timer" aria-hidden="true">
              <span className="sxs-timer__value">{formatClock(timerValue)}</span>
              <span className="sxs-timer__limit"> of {formatClock(MAX_CHECK_SECONDS)}</span>
            </p>

            <RecordButton
              icon={MicrophoneIcon}
              activeIcon={StopIcon}
              active={recording}
              busy={processing}
              disabled={checking}
              label={recording ? "Stop recording" : hasClip ? "Record again" : "Start recording"}
              onClick={toggleRecording}
            />

            <p className="sxs-caption">{describeAction({ phase, checking, hasClip })}</p>

            <div className="sxs-wave" data-live={recording || playback.playing ? "true" : "false"}>
              <AudioWaveform
                analyser={recording ? analyser : playback.analyser}
                active={recording || playback.playing}
                color={playback.playing && !recording ? "var(--ds-accent)" : "var(--ds-danger)"}
                height={72}
                label={playback.playing && !recording ? "Playback level" : "Microphone level"}
              />
            </div>
          </div>

          <p className="sx-sr" role="status" aria-live="polite">
            {announcement}
          </p>

          {error ? (
            <Notice tone="danger" title="That did not work">
              {error}
            </Notice>
          ) : null}

          {showClipActions ? (
            <div className="sxs-actions">
              <Button
                onClick={playback.toggle}
                startIcon={playback.playing ? <StopIcon size={18} weight="fill" aria-hidden="true" /> : <PlayIcon size={18} weight="fill" aria-hidden="true" />}
              >
                {playback.playing ? "Stop playback" : "Play your recording"}
              </Button>
              <Button
                variant={passed || result ? "secondary" : "primary"}
                onClick={check}
                loading={checking}
                startIcon={result ? <ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" /> : undefined}
              >
                {checking ? "Checking\u2026" : result ? "Check again" : "Check audio"}
              </Button>
            </div>
          ) : null}

          {result ? <TranscriptPanel result={result} /> : null}

          {state !== "live" ? (
            <Notice tone="info">
              {state === "upcoming" ? `This test opens on ${formatDateTime(test.startTime)}. You can check your audio now.` : "This test has ended."}
            </Notice>
          ) : null}
        </SpeechCard>

        <SpeechCard className="sxs-checkscard" aria-labelledby="sxs-checks-title" fill>
          <h2 className="sxs-section-title" id="sxs-checks-title">
            Your checks
          </h2>
          <CheckList checks={checks} level={level} peak={peak} recording={recording} />
        </SpeechCard>
      </div>

      <StepNav
        onBack={onBack}
        backDisabled={starting}
        nextLabel="Start exam"
        onNext={onStart}
        nextDisabled={!passed || state !== "live"}
        nextLoading={starting}
        nextIcon={<RocketLaunchIcon size={18} weight="bold" aria-hidden="true" />}
        reason={reason}
      />
    </div>
  );
};

export default AudioCheckStep;
