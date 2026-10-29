import React, { useState } from "react";
import { Box, Button, useMediaQuery, useTheme } from "@mui/material";
import TipCard from "./TipCard";
import useSurface from "./useSurface";

const GAP = 20;

/**
 * Centred carousel: the active card sits in the middle with its neighbours
 * partly visible on either side. Works with the Previous / Next buttons, the
 * dots, a click on a neighbouring card and the arrow keys.
 *
 * The cards keep their full height and the whole carousel is centred in the
 * space its parent leaves; on a very short screen it gives up height (down to a
 * minimum) so the page does not need to scroll.
 */
const TipsCarousel = ({ tips }) => {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  const cardWidth = compact ? 290 : 420;

  const { border, accent, muted } = useSurface();
  const [index, setIndex] = useState(0);

  const go = (next) => setIndex(Math.min(tips.length - 1, Math.max(0, next)));

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  };

  const navButton = (label, onClick, disabled) => (
    <Button
      variant="outlined"
      onClick={onClick}
      disabled={disabled}
      sx={{
        textTransform: "none",
        fontWeight: 600,
        fontSize: "0.82rem",
        minWidth: 84,
        py: 0.4,
        borderRadius: "9px",
        color: "text.primary",
        borderColor: border,
      }}
    >
      {label}
    </Button>
  );

  return (
    // The carousel (cards and controls together) sits in the vertical middle of the
    // space the page leaves for it.
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <Box
        role="region"
        aria-roledescription="carousel"
        aria-label="Tips for taking the test"
        tabIndex={0}
        onKeyDown={onKeyDown}
        sx={{
          position: "relative",
          // 340px tall like before; shrinks only when the screen is too short for it.
          flex: "0 1 340px",
          minHeight: 150,
          overflow: "hidden",
          outline: "none",
          "&:focus-visible": { boxShadow: `0 0 0 2px ${accent}`, borderRadius: "16px" },
          // Soften the clipped neighbours at both edges.
          WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            display: "flex",
            alignItems: "center",
            gap: `${GAP}px`,
            py: "8px",
            boxSizing: "border-box",
            transform: `translateX(${-(index * (cardWidth + GAP) + cardWidth / 2)}px)`,
            transition: "transform 0.35s ease",
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        >
          {tips.map((tip, i) => (
            <TipCard
              key={tip.id}
              tip={tip}
              position={i + 1}
              total={tips.length}
              active={i === index}
              width={cardWidth}
              onSelect={() => go(i)}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 0.75 }}>
        {navButton("Previous", () => go(index - 1), index === 0)}

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
          {tips.map((tip, i) => (
            <Box
              key={tip.id}
              component="button"
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to tip ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              sx={{
                p: 0,
                border: "none",
                cursor: "pointer",
                height: 7,
                width: i === index ? 24 : 7,
                borderRadius: 4,
                bgcolor: i === index ? accent : muted,
                opacity: i === index ? 1 : 0.35,
                transition: "width 0.25s, opacity 0.25s",
              }}
            />
          ))}
        </Box>

        {navButton("Next", () => go(index + 1), index === tips.length - 1)}
      </Box>

      <Box component="span" aria-live="polite" sx={{ position: "absolute", left: -9999 }}>
        Tip {index + 1} of {tips.length}: {tips[index].title}
      </Box>
    </Box>
  );
};

export default TipsCarousel;
