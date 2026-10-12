import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import useSurface from "./useSurface";

/**
 * Blue header band of a setup card: a small label, a title and a line of text.
 * An optional `watermark` icon is cropped into its bottom-right corner, and any
 * `children` are shown beneath the text. `compact` is the tighter version for
 * narrow side cards.
 */
const CardBanner = ({ label, badge, title, description, watermark: Watermark, compact = false, children }) => {
  const { accent } = useSurface();

  return (
    <Box
      sx={{
        position: "relative",
        bgcolor: accent,
        color: "#fff",
        px: compact ? 2.75 : 3.5,
        py: compact ? 3 : 4,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {Watermark && (
        <Watermark
          aria-hidden
          sx={{ position: "absolute", right: -16, bottom: -22, fontSize: compact ? 110 : 130, opacity: 0.14 }}
        />
      )}
      {/* `badge` (such as a status pill) sits at the right end of the label row. */}
      <Box
        sx={{
          position: "relative",
          mb: compact ? 1.25 : 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Chip
          label={label}
          sx={{
            height: compact ? 24 : 28,
            bgcolor: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            fontWeight: 600,
            fontSize: compact ? "0.78rem" : "0.84rem",
          }}
        />
        {badge}
      </Box>
      <Typography
        component="h1"
        sx={{ fontWeight: 700, fontSize: compact ? "1.5rem" : "2rem", lineHeight: 1.2, position: "relative" }}
      >
        {title}
      </Typography>
      {description && (
        <Typography sx={{ mt: 1, opacity: 0.92, fontSize: compact ? "0.95rem" : "1.05rem", position: "relative" }}>
          {description}
        </Typography>
      )}
      {children && <Box sx={{ position: "relative", mt: compact ? 1.75 : 2 }}>{children}</Box>}
    </Box>
  );
};

export default CardBanner;
