import React from "react";
import { Box } from "@mui/material";
import useSurface from "../setup/useSurface";

const pad = (n) => String(n).padStart(2, "0");

/** 526000 ms -> "08:46", 3725000 ms -> "1:02:05" */
const clock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** Time left in the section. Turns red for the final minute. */
const TimerPill = ({ remainingMs }) => {
  const { border, isDark } = useSurface();
  const low = remainingMs !== null && remainingMs <= 60000;

  return (
    <Box
      role="timer"
      aria-label="Time remaining"
      sx={{
        px: 1.75,
        py: 0.6,
        borderRadius: "999px",
        border: `1px solid ${low ? "rgba(244, 67, 54, 0.6)" : border}`,
        bgcolor: low ? "rgba(244, 67, 54, 0.1)" : isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
        color: low ? "error.main" : "text.primary",
        fontSize: "0.9rem",
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        transition: "color 0.3s, border-color 0.3s, background-color 0.3s",
      }}
    >
      {remainingMs === null ? "--:--" : clock(remainingMs)}
    </Box>
  );
};

export default TimerPill;
