import React from "react";
import { Box, Button, Typography, useTheme } from "@mui/material";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { formatDuration } from "./ExamWindowBanner";

// Every layout offset in the exam session derives from this, so the bar can be
// resized here alone.
export const EXAM_BAR_HEIGHT = 62;

/**
 * Slim fixed bar for an exam session tab.
 *
 * Replaces the navbar and sidebar that exam mode collapses away, and keeps the
 * remaining time dead centre at the top of the screen for the whole session,
 * including while a question is open.
 *
 * The countdown value is produced by `useExamGuard`, which anchors it to server
 * time; this component only formats it. The last five minutes turn red.
 */
const ExamSessionBar = ({
  title,
  remainingMs,
  state = "open",
  onEndTest,
  ending = false,
  violationCount = 0,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const isLow = typeof remainingMs === "number" && remainingMs <= 5 * 60 * 1000;
  const ended = state === "ended";

  const accent = ended
    ? isDark
      ? "#4caf50"
      : "#2e7d32"
    : isLow
    ? isDark
      ? "#f44336"
      : "#c62828"
    : isDark
    ? "#90caf9"
    : "#1565c0";

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: `${EXAM_BAR_HEIGHT}px`,
        zIndex: theme.zIndex.drawer + 3,
        display: "flex",
        alignItems: "center",
        px: 2,
        borderBottom: "1px solid",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
        bgcolor: isDark ? "#0A0A0A" : "#FFFFFF",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Left: brand, then the exam name */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box
          component="img"
          src="/scope-blac.png"
          alt="Codestats"
          sx={{ width: 22, height: 22, objectFit: "contain" }}
        />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1.05rem",
            whiteSpace: "nowrap",
            color: isDark ? "#fff" : "#101010",
          }}
        >
          C{"<>"}destats
        </Typography>
        <Typography
          sx={{
            fontSize: "1.05rem",
            color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
          }}
        >
          |
        </Typography>
        <Typography
          noWrap
          sx={{
            fontWeight: 600,
            fontSize: "0.95rem",
            minWidth: 0,
            color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)",
          }}
        >
          {title || "Exam"}
        </Typography>
      </Box>

      {/* Centre: the countdown. Absolutely positioned so it stays exactly
          centred on screen regardless of how long the title is. */}
      <Box
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          color: accent,
        }}
      >
        <TimerOutlinedIcon sx={{ fontSize: "1.5rem" }} />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1.35rem",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.02em",
          }}
        >
          {ended ? "Exam ended" : formatDuration(remainingMs)}
        </Typography>
      </Box>

      {/* Right: end the test. Balances the flex row so the centre stays centred. */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {/* Integrity counter, shown only once something has been recorded, so a
            clean session stays uncluttered. */}
        {violationCount > 0 && !ended && (
          <Typography
            variant="caption"
            sx={{
              mr: 1.5,
              fontWeight: 700,
              color: isDark ? "#ffb74d" : "#e65100",
            }}
          >
            {violationCount} warning{violationCount === 1 ? "" : "s"}
          </Typography>
        )}

        {onEndTest && !ended && (
          <Button
            variant="contained"
            color="error"
            disabled={ending}
            onClick={onEndTest}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.95rem",
              px: 2.5,
              py: 0.65,
              bgcolor: "#D32F2F",
              "&:hover": { bgcolor: "#B71C1C" },
            }}
          >
            {ending ? "Ending…" : "END TEST"}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ExamSessionBar;
