import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import { TONE_COLORS } from "../resultsTheme";

/** One delivery measurement: its value, the target, and a Good / needs-work tag. */
const MetricTile = ({ tile }) => {
  const { border, muted } = useSurface();
  const color = TONE_COLORS[tile.tone];

  return (
    <Box sx={{ p: 1.75, borderRadius: "12px", border: `1px solid ${border}`, minWidth: 0 }}>
      <Typography sx={{ color: muted, fontSize: "0.74rem", fontWeight: 600 }}>{tile.label}</Typography>
      <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.2 }}>
        {tile.value}
        {tile.unit && (
          <Typography component="span" sx={{ ml: 0.5, color: muted, fontSize: "0.78rem", fontWeight: 600 }}>
            {tile.unit}
          </Typography>
        )}
      </Typography>
      <Typography sx={{ color: muted, fontSize: "0.72rem", mt: 0.25 }}>{tile.ideal}</Typography>
      <Box
        component="span"
        sx={{
          display: "inline-block",
          mt: 1,
          px: 1,
          py: 0.15,
          borderRadius: "999px",
          fontSize: "0.7rem",
          fontWeight: 700,
          color,
          bgcolor: `${color}1f`,
          border: `1px solid ${color}55`,
        }}
      >
        {tile.badge}
      </Box>
    </Box>
  );
};

export default MetricTile;
