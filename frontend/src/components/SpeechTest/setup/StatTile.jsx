import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "./useSurface";

/**
 * A headline figure with a label underneath. Sits in a row with its siblings,
 * separated from the previous one by a thin vertical line (`separated`).
 */
const StatTile = ({ value, label, separated = false }) => {
  const { divider, muted } = useSurface();

  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        textAlign: "center",
        borderLeft: separated ? `1px solid ${divider}` : "none",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: "1.35rem", lineHeight: 1.1 }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: muted, mt: 0.25, fontSize: "0.82rem" }}>
        {label}
      </Typography>
    </Box>
  );
};

export default StatTile;
