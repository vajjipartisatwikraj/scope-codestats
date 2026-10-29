import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { formatClock, formatDateTime } from "../speechTestMeta";
import AudioWaveform from "../AudioWaveform";
import MicIcon from "@mui/icons-material/Mic";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RoundButton from "./RoundButton";
import useClipPlayback from "./useClipPlayback";
import SetupButton from "./SetupButton";
import TranscriptPanel from "./TranscriptPanel";
import useAudioCheck, { MAX_CHECK_SECONDS } from "./useAudioCheck";
import useSurface from "./useSurface";

/** The line under the microphone button, matching where the check is at. */
const describeAction = ({ phase, elapsed, checking, hasClip }) => {
  if (phase === "recording") return `Recording ${formatClock(elapsed)} / ${formatClock(MAX_CHECK_SECONDS)}. Tap to stop`;
  if (phase === "processing") return "Processing your recording…";
  if (checking) return "Checking your audio…";
  if (hasClip) return "Tap to record again";
  return "Tap to start recording";
};

/**
 * Step 2 of the pre-test flow: the student says their name, we show what was
 * heard, and only then can the exam start. Nothing recorded here is stored.
 * Laid out as plain content on the page, with no card around it.
 */
const AudioCheckStep = ({ testId, test, state, starting, onBack, onStart }) => {
  const { accent, muted } = useSurface();
  const audio = useAudioCheck(testId);
  const { phase, analyser, result, checking, error, passed, clip, hasClip, start, stop, check } = audio;
  const playback = useClipPlayback(clip);

  const recording = phase === "recording";
  const processing = phase === "processing";

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 620,
        width: "100%",
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 5 },
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.7rem" }}>
        Test your audio
      </Typography>
      <Typography sx={{ color: muted, mt: 0.75, fontSize: "1rem" }}>
        Say your name clearly, then tap Check audio. Nothing from this check is saved.
      </Typography>

      <Box sx={{ mt: 5 }}>
        <RoundButton
          icon={MicIcon}
          activeIcon={StopRoundedIcon}
          active={recording}
          busy={processing}
          disabled={checking}
          label={recording ? "Stop recording" : "Start recording"}
          onClick={() => {
            if (recording) {
              stop();
              return;
            }
            playback.stop();
            start();
          }}
        />
        <Typography sx={{ color: muted, mt: 2, fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }} role="status">
          {describeAction({ ...audio })}
        </Typography>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 440, mx: "auto", mt: 2.5 }}>
        <AudioWaveform
          analyser={recording ? analyser : playback.analyser}
          active={recording || playback.playing}
          color={accent}
          height={72}
          ariaLabel={playback.playing ? "Playback level" : "Microphone level"}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2.5, textAlign: "left" }}>
          {error}
        </Alert>
      )}

      {hasClip && !recording && !processing && (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25 }}>
          <RoundButton
            size={56}
            icon={PlayArrowRoundedIcon}
            activeIcon={StopRoundedIcon}
            active={playback.playing}
            label={playback.playing ? "Stop playback" : "Play your recording"}
            onClick={playback.toggle}
          />
          <Typography sx={{ color: muted, fontSize: "0.92rem" }}>
            {playback.playing ? "Playing your recording. Tap to stop" : "Listen to your recording"}
          </Typography>
        </Box>
      )}

      {hasClip && !recording && !processing && (
        <Box sx={{ mt: 3 }}>
          <SetupButton onClick={check} loading={checking}>
            {checking ? "Checking…" : result ? "Check again" : "Check audio"}
          </SetupButton>
        </Box>
      )}

      {result && (
        <Box sx={{ mt: 3 }}>
          <TranscriptPanel result={result} />
        </Box>
      )}

      {state !== "live" && (
        <Alert severity="info" sx={{ mt: 3, textAlign: "left" }}>
          {state === "upcoming"
            ? `This test opens on ${formatDateTime(test.startTime)}. You can check your audio now.`
            : "This test has ended."}
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ mt: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <SetupButton variant="secondary" onClick={onBack} disabled={starting}>
          Back
        </SetupButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {!passed && (
            <Typography variant="body2" sx={{ color: muted, display: { xs: "none", sm: "block" } }}>
              Record and check your audio to continue
            </Typography>
          )}
          <SetupButton onClick={onStart} disabled={!passed || state !== "live"} loading={starting}>
            Start exam
          </SetupButton>
        </Box>
      </Box>
    </Box>
  );
};

export default AudioCheckStep;
