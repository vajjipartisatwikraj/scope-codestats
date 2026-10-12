import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import useEntered from "../motion/useEntered";
import { CSS_EASE } from "../motion/motionTokens";
import { TONE_COLORS } from "../resultsTheme";

const LABELS = { start: "Start", speech: "Speech", pause: "", end: "End" };

/**
 * The recording as a strip: silence before the first word, each stretch of
 * speech, pauses between them, and silence at the end. Widths follow duration.
 */
const SpeechTimeline = ({ timeline }) => {
  const { accent, muted } = useSurface();
  const entered = useEntered(150);
  if (!timeline) return null;

  const colorOf = (type) => (type === "speech" ? accent : TONE_COLORS.warn);

  return (
    <Box>
      <Typography sx={{ color: muted, fontSize: "0.76rem", fontWeight: 600, mb: 0.75 }}>
        Speech timeline ({timeline.totalS} s total)
      </Typography>
      <Box sx={{ display: "flex", gap: "3px", height: 28 }}>
        {timeline.segments.map((segment, i) => {
          const color = colorOf(segment.type);
          const label = LABELS[segment.type];
          return (
            <Box
              key={i}
              title={`${label || "Pause"} ${segment.seconds} s`}
              sx={{
                flex: `${segment.seconds} 1 0`,
                minWidth: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "5px",
                overflow: "hidden",
                // Each stretch grows out from its left edge, one after another.
                transformOrigin: "left center",
                transform: entered ? "scaleX(1)" : "scaleX(0)",
                opacity: entered ? 1 : 0,
                transition: `transform 0.7s ${CSS_EASE} ${i * 70}ms, opacity 0.4s ease ${i * 70}ms`,
                bgcolor: `${color}26`,
                border: `1px solid ${color}66`,
                color,
                fontSize: "0.7rem",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {segment.seconds >= 0.3 && `${label ? `${label} ` : ""}${segment.seconds}s`}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default SpeechTimeline;
