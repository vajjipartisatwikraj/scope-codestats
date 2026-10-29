import React from "react";
import { Box } from "@mui/material";
import useSurface from "../setup/useSurface";

/**
 * A row of short bars, one per section. Each takes a state:
 *   done     scored (green)
 *   pending  submitted, waiting for its score (soft blue)
 *   active   currently open (blue)
 *   idle     not started
 */
const SegmentedProgress = ({ segments, label }) => {
  const { accent, border } = useSurface();

  const colors = {
    done: "#4caf50",
    pending: "rgba(5, 133, 224, 0.45)",
    active: accent,
    idle: border,
  };

  return (
    <Box role="img" aria-label={label} sx={{ display: "flex", gap: 0.75, width: "100%", maxWidth: 360 }}>
      {segments.map((state, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            bgcolor: colors[state] || colors.idle,
            transition: "background-color 0.3s",
          }}
        />
      ))}
    </Box>
  );
};

export default SegmentedProgress;
