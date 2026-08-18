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

  const { state, startsAt, endsAt, msUntilStart } = exam;

  // Compact form for the solving screen, where vertical space is scarce.
  if (compact) {
    if (state !== "open") return null;
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

  if (state === "not_started") {
    return (
      <Alert severity="info" icon={<EventAvailableIcon />} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Exam scheduled</AlertTitle>
        <Typography variant="body2">
          This exam opens at <strong>{formatMoment(startsAt)}</strong> and closes at{" "}
          <strong>{formatMoment(endsAt)}</strong>.
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Starts in <strong>{formatDuration(msUntilStart)}</strong>.
        </Typography>
      </Alert>
    );
  }

  if (state === "ended") {
    return (
      <Alert severity="warning" icon={<LockClockIcon />} sx={{ mb: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>Exam ended</AlertTitle>
        <Typography variant="body2">
          This exam closed at <strong>{formatMoment(endsAt)}</strong>. It can no
          longer be opened.
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

  // Live.
  const low = typeof remainingMs === "number" && remainingMs <= 5 * 60 * 1000;

  return (
    <Alert
      severity={low ? "warning" : "success"}
      icon={<TimerOutlinedIcon />}
      sx={{ mb: 2 }}
    >
      <AlertTitle sx={{ fontWeight: 700 }}>Exam in progress</AlertTitle>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="body2">
          Time remaining:{" "}
          <strong>{formatDuration(remainingMs)}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Closes at {formatMoment(endsAt)}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        Anything submitted after the exam closes is not accepted.
      </Typography>
    </Alert>
  );
};

export default ExamWindowBanner;
