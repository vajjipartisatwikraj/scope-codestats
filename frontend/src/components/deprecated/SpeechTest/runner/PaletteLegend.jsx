import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import { STATE_COLORS } from "./runnerTheme";

const ITEMS = [
  { key: "answered", label: "Answered" },
  { key: "open", label: "Unanswered" },
  { key: "later", label: "Visit later" },
  { key: "review", label: "Marked for review" },
];

/** Colour key for the question palette. */
const PaletteLegend = () => {
  const { border } = useSurface();

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
      {ITEMS.map(({ key, label }) => (
        <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 0.9, minWidth: 0 }}>
          <Box
            aria-hidden
            sx={{
              width: 11,
              height: 11,
              flexShrink: 0,
              borderRadius: "3px",
              border: `1.5px solid ${STATE_COLORS[key] || border}`,
              bgcolor: STATE_COLORS[key] ? `${STATE_COLORS[key]}33` : "transparent",
            }}
          />
          <Typography noWrap variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default PaletteLegend;
