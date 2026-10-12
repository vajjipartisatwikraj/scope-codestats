import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import { scoreColor } from "../resultsTheme";

/** A score as a small tinted pill; a dash when the question was not answered. */
const ScoreBadge = ({ score, answered = true, prefix = "" }) => {
  const { border, muted } = useSurface();
  const color = answered ? scoreColor(score) : null;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        minWidth: 34,
        textAlign: "center",
        px: 1.1,
        py: 0.3,
        borderRadius: "999px",
        fontSize: "0.78rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        color: color || muted,
        bgcolor: color ? `${color}1f` : "transparent",
        border: `1px solid ${color ? `${color}55` : border}`,
      }}
    >
      {answered ? `${prefix}${Math.round(score)}` : "-"}
    </Box>
  );
};

export default ScoreBadge;
