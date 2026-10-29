import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import { DARK_CARD } from "./resultsTheme";

/**
 * Surface used by the panels of the results page. With a `title` it adds a
 * heading row (and an optional caption on the right).
 */
const ResultCard = ({ title, caption, sx, children }) => {
  const { card, border, muted, isDark } = useSurface();

  return (
    <Box
      sx={{
        bgcolor: isDark ? DARK_CARD : card,
        border: `1px solid ${border}`,
        borderRadius: "14px",
        p: 2.5,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
      {title && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</Typography>
          {caption && <Typography sx={{ color: muted, fontSize: "0.78rem", fontWeight: 600 }}>{caption}</Typography>}
        </Box>
      )}
      {children}
    </Box>
  );
};

export default ResultCard;
