import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "./useSurface";

/** Height of a tip card; it only gets shorter when the carousel has less room than this. */
const CARD_HEIGHT = 258;

/**
 * A single tip. The active card is filled with the platform blue; its
 * neighbours recede into the normal card surface.
 */
const TipCard = ({ tip, position, total, active, width, onSelect }) => {
  const { cardRaised, border, accent, accentSoft, muted } = useSurface();
  const { Icon } = tip;

  return (
    <Box
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} of ${total}`}
      aria-current={active ? "true" : undefined}
      onClick={active ? undefined : onSelect}
      sx={{
        flex: `0 0 ${width}px`,
        width,
        height: CARD_HEIGHT,
        maxHeight: "100%",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        p: 3.5,
        borderRadius: "18px",
        bgcolor: active ? accent : cardRaised,
        color: active ? "#fff" : "text.primary",
        border: `1px solid ${active ? accent : border}`,
        boxShadow: active ? "0 16px 36px rgba(5, 133, 224, 0.34)" : "none",
        cursor: active ? "default" : "pointer",
        opacity: active ? 1 : 0.55,
        transform: active ? "scale(1)" : "scale(0.92)",
        transition: "opacity 0.3s, transform 0.3s, background-color 0.3s, box-shadow 0.3s",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      {/* Large faint copy of the tip's icon, cropped by the bottom-right corner */}
      <Icon
        aria-hidden
        sx={{
          position: "absolute",
          right: -18,
          bottom: -24,
          fontSize: 150,
          color: "#fff",
          opacity: active ? 0.14 : 0,
          pointerEvents: "none",
          transition: "opacity 0.3s, color 0.3s",
        }}
      />
      <Box
        sx={{
          position: "relative",
          width: 54,
          height: 54,
          mb: 2,
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: active ? "rgba(255, 255, 255, 0.2)" : accentSoft,
          color: active ? "#fff" : accent,
        }}
      >
        <Icon sx={{ fontSize: 29 }} />
      </Box>
      <Typography
        variant="body2"
        sx={{ position: "relative", fontSize: "0.82rem", color: active ? "rgba(255, 255, 255, 0.8)" : muted, letterSpacing: "0.08em", fontWeight: 600 }}
      >
        TIP {position} OF {total}
      </Typography>
      <Typography sx={{ position: "relative", fontWeight: 700, fontSize: "1.35rem", mt: 0.5, mb: 1 }}>
        {tip.title}
      </Typography>
      <Typography
        sx={{ position: "relative", color: active ? "rgba(255, 255, 255, 0.92)" : muted, lineHeight: 1.6, fontSize: "1rem" }}
      >
        {tip.description}
      </Typography>
    </Box>
  );
};

export default TipCard;
