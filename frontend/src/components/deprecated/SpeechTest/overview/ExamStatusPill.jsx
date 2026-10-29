import React from "react";
import { Box } from "@mui/material";
import { EXAM_STATUS_META } from "./examStatus";

/** A small translucent pill with a coloured dot and the exam status, for the blue banner. */
const ExamStatusPill = ({ status }) => {
  const meta = EXAM_STATUS_META[status];
  if (!meta) return null;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.9,
        height: 24,
        px: 1.4,
        borderRadius: "999px",
        bgcolor: "rgba(255, 255, 255, 0.2)",
        color: "#fff",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: meta.dot,
          ...(meta.pulse && {
            animation: "examPulse 1.8s ease-in-out infinite",
            "@keyframes examPulse": {
              "0%, 100%": { opacity: 1, transform: "scale(1)" },
              "50%": { opacity: 0.45, transform: "scale(0.8)" },
            },
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }),
        }}
      />
      {meta.label}
    </Box>
  );
};

export default ExamStatusPill;
