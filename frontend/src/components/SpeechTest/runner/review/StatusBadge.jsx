import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import { STATE_COLORS, STATE_LABEL } from "../runnerTheme";

/** Small pill naming a question's state, tinted with that state's colour. */
const StatusBadge = ({ state }) => {
  const { border, muted, isDark } = useSurface();
  const color = STATE_COLORS[state];

  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1.25,
        py: 0.3,
        borderRadius: "999px",
        fontSize: "0.76rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: color || muted,
        bgcolor: color ? `${color}1f` : isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
        border: `1px solid ${color ? `${color}55` : border}`,
      }}
    >
      {STATE_LABEL[state]}
    </Box>
  );
};

export default StatusBadge;
