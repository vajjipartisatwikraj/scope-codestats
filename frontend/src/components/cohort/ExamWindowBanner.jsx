import React from "react";
import { Alert, AlertTitle, Box, Chip, Typography, useTheme } from "@mui/material";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import LockClockIcon from "@mui/icons-material/LockClock";

/** `2h 05m 09s`, dropping empty leading units. */
export const formatDuration = (ms) => {
  if (typeof ms !== "number" || ms < 0) return "--";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}h ${pad(mins)}m ${pad(secs)}s`;
  if (mins > 0) return `${mins}m ${pad(secs)}s`;
  return `${secs}s`;
};

const formatMoment = (iso) => {
  if (!iso) return "--";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/**
 * Exam schedule and live countdown for an exam-mode cohort.
 *
 * Renders nothing for practice cohorts, so callers can mount it unconditionally.
 * The countdown value comes from `useExamGuard`, which anchors it to server
 * time; this component only formats what it is given.
 */
const ExamWindowBanner = ({ exam, remainingMs, compact = false }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (!exam?.isExam) return null;

  const {
    state,
    startsAt,
    endsAt,
    msUntilStart,
    durationMinutes,
    attemptState,
    deadlineAt,
  } = exam;

  // An attempt under way is the student's own clock, which may run past the
  // cohort's end time on a timed exam.
  const inProgress = attemptState === "in_progress";
  const finished = attemptState === "submitted" || attemptState === "time_up";

  // Compact form for the solving screen, where vertical space is scarce.
  if (compact) {
    if (!inProgress && state !== "open") return null;
    const low = typeof remainingMs === "number" && remainingMs <= 5 * 60 * 1000;

    return (
      <Chip
        size="small"
        icon={<TimerOutlinedIcon />}
        label={`Exam ends in ${formatDuration(remainingMs)}`}
        sx={{
          fontWeight: 700,
          color: low ? (isDark ? "#f44336" : "#c62828") : undefined,
          borderColor: low ? (isDark ? "#f44336" : "#c62828") : undefined,
        }}
        variant="outlined"
      />
    );
  }

  if (finished) {
    return (
      <Alert severity="warning" icon={<LockClockIcon />} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>
          {attemptState === "time_up" ? "Time is up" : "Exam submitted"}
        </AlertTitle>
        <Typography variant="body2">
          {attemptState === "time_up"
            ? "Your time ran out and the exam was submitted automatically."
            : "You have ended this exam. It cannot be opened again."}
        </Typography>
      </Alert>
    );
  }

  if (!inProgress && state === "not_started") {
    return (
      <Alert severity="info" icon={<EventAvailableIcon />} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Exam scheduled</AlertTitle>
        <Typography variant="body2">
          You can start this exam any time between{" "}
          <strong>{formatMoment(startsAt)}</strong> and{" "}
          <strong>{formatMoment(endsAt)}</strong>.
        </Typography>
        {durationMinutes ? (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Once you start you will have{" "}
            <strong>{formatDuration(durationMinutes * 60 * 1000)}</strong> to
            finish.
          </Typography>
        ) : null}
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Opens in <strong>{formatDuration(msUntilStart)}</strong>.
        </Typography>
      </Alert>
    );
  }

  if (!inProgress && state === "ended") {
    return (
      <Alert severity="warning" icon={<LockClockIcon />} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Exam closed</AlertTitle>
        <Typography variant="body2">
          Joining closed at <strong>{formatMoment(endsAt)}</strong>. This exam can
          no longer be started.
        </Typography>
      </Alert>
    );
  }

  if (state === "misconfigured") {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Exam not scheduled</AlertTitle>
        <Typography variant="body2">
          This exam has no valid time window. Please contact your administrator.
        </Typography>
      </Alert>
    );
  }

  // Live: either an attempt under way, or the window open and not yet started.
  const low = typeof remainingMs === "number" && remainingMs <= 5 * 60 * 1000;
  // On a timed exam the student's own deadline is what counts; otherwise it is
  // the shared window end.
  const closesAt = deadlineAt || endsAt;

  return (
    <Alert
      severity={low ? "warning" : "success"}
      icon={<TimerOutlinedIcon />}
      sx={{ mb: 2 }}
    >
      <AlertTitle sx={{ fontWeight: 700 }}>
        {inProgress ? "Exam in progress" : "Exam open"}
      </AlertTitle>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="body2">
          {inProgress ? "Your time remaining: " : "You will get: "}
          <strong>{formatDuration(remainingMs)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {inProgress
            ? `Your exam closes at ${formatMoment(closesAt)}`
            : `Joining closes at ${formatMoment(endsAt)}`}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {inProgress
          ? "When your time ends the exam is submitted automatically."
          : durationMinutes
          ? `Your ${durationMinutes}-minute timer starts the moment you open the exam.`
          : "Anything submitted after the exam closes is not accepted."}
      </Typography>
    </Alert>
  );
};

export default ExamWindowBanner;
