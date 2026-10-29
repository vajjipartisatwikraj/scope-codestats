import React from "react";
import { Box, Typography } from "@mui/material";
import { DURATION, EASE } from "./Collapsible";

/**
 * A small caption over a value, in white for use on the blue ribbon. When
 * `compact` the value shrinks a little; the caption keeps its style.
 */
const RibbonItem = ({ label, children, large = false, compact = false }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography
      sx={{
        color: "rgba(255, 255, 255, 0.72)",
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
        pb: 0.35,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        color: "#fff",
        fontWeight: 700,
        fontSize: compact ? "0.95rem" : large ? "1.1rem" : "0.88rem",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
        transition: `font-size ${DURATION} ${EASE}`,
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      {children}
    </Typography>
  </Box>
);

export default RibbonItem;
