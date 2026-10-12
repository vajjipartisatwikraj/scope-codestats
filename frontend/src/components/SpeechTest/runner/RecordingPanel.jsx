import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, Box, Button, CircularProgress, Typography, useTheme } from "@mui/material";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import AudioWaveform from "../AudioWaveform";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import useInputLevel from "./useInputLevel";
import { MicRecorder, blobToWav16k } from "../../../utils/speechAudio";
import { formatClock } from "../speechTestMeta";

const SAVE_STATUS = {
  saved: { label: "Answer saved", Icon: CheckCircleOutlineIcon, color: "success.main" },
  saving: { label: "Saving…", Icon: CloudSyncOutlinedIcon, color: "text.secondary" },
  pending: { label: "Saving…", Icon: CloudSyncOutlinedIcon, color: "text.secondary" },
  error: { label: "Not saved yet. Retrying automatically…", Icon: CloudOffOutlinedIcon, color: "warning.main" },
};

const pulse = {
  animation: "recPulse 1.1s ease-in-out infinite",
  "@keyframes recPulse": {
    "0%,100%": { opacity: 1, transform: "scale(1)" },
    "50%": { opacity: 0.4, transform: "scale(0.8)" },
  },
};

/** Status dot + text on the left of the panel header. */
const StatusLine = ({ phase, elapsed }) => {
  if (phase === "processing") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CircularProgress size={14} />
        <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Processing your recording…</Typography>
      </Box>
    );
  }
  const recording = phase === "recording";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        aria-hidden
        sx={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          bgcolor: recording ? "error.main" : "text.disabled",
          ...(recording && pulse),
        }}
      />
      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
        {recording ? `Recording ${formatClock(elapsed)}` : "Ready to record"}
      </Typography>
    </Box>
  );
};

/** "Answer saved" / "Saving…" line under a recorded answer. */
const SaveStatus = ({ status }) => {
  const meta = SAVE_STATUS[status];
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: meta.color }}>
      <Icon sx={{ fontSize: 18 }} />
      <Typography variant="caption" sx={{ fontWeight: 600 }}>
        {meta.label}
      </Typography>
    </Box>
  );
};

/**
 * Record / review / re-record control for one spoken answer.
 *
 * It only produces audio. The parent decides what to do with it (`onRecorded`),
 * so saving and retrying live in one place. `finish()` lets the parent stop an
 * in-flight recording and wait for it to be handed over, which is what happens
 * when the section timer runs out or the student moves to another question.
 *
 * @param {object}   props
 * @param {number}   props.maxSeconds   recording stops by itself at this length
 * @param {boolean}  props.disabled
 * @param {object}   props.answer       { blob, url, durationS, status } or null
 * @param {function} props.onRecorded   async ({ blob, durationS }) => void
 */
const RecordingPanel = forwardRef(function RecordingPanel(
  { maxSeconds = 60, disabled = false, answer, onRecorded },
  ref
) {
  const theme = useTheme();
  const { isDark } = useSurface();

  const [phase, setPhase] = useState("idle"); // idle | recording | processing
  const [elapsed, setElapsed] = useState(0);
  const [analyser, setAnalyser] = useState(null);
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const startedAtRef = useRef(0);
  const phaseRef = useRef("idle");
  const finishingRef = useRef(null);

  const inputLevel = useInputLevel(analyser);

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
        await onRecorded({ blob: wav.blob, durationS: wav.durationS });
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
  }, [onRecorded]);

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
  const hasAnswer = Boolean(answer);
  const showPlayer = hasAnswer && phase === "idle";

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <StatusLine phase={phase} elapsed={elapsed} />
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Max {formatClock(maxSeconds)}
          {recording && ` · Input level: ${inputLevel}`}
        </Typography>
      </Box>

      <Box sx={{ my: 2.5 }}>
        {showPlayer ? (
          <Box>
            {answer.url ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio controls src={answer.url} style={{ width: "100%", height: 40 }} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                You answered this question{answer.durationS ? ` (${formatClock(answer.durationS)})` : ""}.
              </Typography>
            )}
            <Box sx={{ mt: 1 }}>
              <SaveStatus status={answer.status} />
            </Box>
          </Box>
        ) : (
          <AudioWaveform
            analyser={analyser}
            active={recording}
            color={recording ? theme.palette.error.main : isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.22)"}
            height={56}
            ariaLabel={recording ? "Live microphone level" : "Microphone idle"}
          />
        )}
      </Box>

      {recording ? (
        <Button
          variant="contained"
          color="error"
          disableElevation
          startIcon={<StopRoundedIcon />}
          onClick={finish}
          sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.92rem", borderRadius: "10px", px: 3, py: 0.9 }}
        >
          Stop recording
        </Button>
      ) : (
        <SetupButton
          variant={hasAnswer ? "secondary" : "primary"}
          disabled={disabled || phase === "processing"}
          startIcon={hasAnswer ? <ReplayIcon /> : <MicNoneOutlinedIcon />}
          onClick={start}
          sx={{ fontWeight: 700 }}
        >
          {hasAnswer ? "Record again" : "Start recording"}
        </SetupButton>
      )}
    </Box>
  );
});

export default RecordingPanel;
