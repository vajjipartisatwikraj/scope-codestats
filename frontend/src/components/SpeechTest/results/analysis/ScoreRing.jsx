import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import useEntered from "../motion/useEntered";
import AnimatedNumber from "../motion/AnimatedNumber";
import { CSS_EASE } from "../motion/motionTokens";
import { scoreColor } from "../resultsTheme";

/**
 * A circular gauge for a 0..100 score, coloured by band, with the number inside.
 * The arc is drawn and the number counts up when it appears.
 */
const ScoreRing = ({ score, size = 56, thickness = 5, delayMs = 120 }) => {
  const { border } = useSurface();
  const entered = useEntered(delayMs);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const filled = entered ? target : 0;

  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={border} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          // Hidden until it starts: a zero-length round-capped arc would show a dot.
          style={{ opacity: entered ? 1 : 0, transition: `stroke-dasharray 0.95s ${CSS_EASE}, opacity 0.2s ease` }}
        />
      </svg>
      <Typography
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: size >= 56 ? "1rem" : "0.85rem",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <AnimatedNumber value={Math.round(score)} delayMs={delayMs} durationMs={950} />
      </Typography>
    </Box>
  );
};

export default ScoreRing;
