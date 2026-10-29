import React from "react";
import { Box } from "@mui/material";

export const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
export const DURATION = "0.38s";

/**
 * Shows or hides its content by animating the space it takes, along one axis,
 * with a fade. `axis="y"` shrinks the height, `axis="x"` the width. Because the
 * space itself animates, neighbouring elements slide into place instead of
 * jumping.
 *
 * It fades out first and fades in last, so text never looks squashed while the
 * space opens or closes. Motion is switched off for people who ask for less.
 */
const Collapsible = ({ open, axis = "y", sx, children }) => {
  const property = axis === "y" ? "gridTemplateRows" : "gridTemplateColumns";
  const cssProperty = axis === "y" ? "grid-template-rows" : "grid-template-columns";

  return (
    <Box
      aria-hidden={!open}
      sx={{
        display: "grid",
        [property]: open ? "1fr" : "0fr",
        opacity: open ? 1 : 0,
        transition: `${cssProperty} ${DURATION} ${EASE}, opacity ${open ? "0.28s 0.12s" : "0.14s"} ease`,
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        ...sx,
      }}
    >
      <Box sx={{ minHeight: 0, minWidth: 0, overflow: "hidden" }}>{children}</Box>
    </Box>
  );
};

export default Collapsible;
