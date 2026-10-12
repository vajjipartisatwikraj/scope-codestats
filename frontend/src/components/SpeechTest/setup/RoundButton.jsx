import React from "react";
import { Box, ButtonBase, CircularProgress } from "@mui/material";
import useSurface from "./useSurface";


/**
 * Large round action button in the platform blue, used for "record" and
 * "play". While `active` it shows `ActiveIcon` and soft rings spreading
 * outwards (no motion for users who prefer reduced motion). `busy` swaps the
 * icon for a spinner.
 */
const RoundButton = ({ icon: Icon, activeIcon: ActiveIcon = Icon, active, busy, disabled, label, onClick, size = 84 }) => {
  const { accent } = useSurface();

  const ring = (delay) => ({
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `2px solid ${accent}`,
    opacity: 0,
    animation: `roundRing 2s ease-out ${delay}s infinite`,
    "@keyframes roundRing": {
      "0%": { transform: "scale(1)", opacity: 0.45 },
      "100%": { transform: "scale(1.7)", opacity: 0 },
    },
    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
  });

  return (
    <Box sx={{ position: "relative", width: size, height: size, mx: "auto" }}>
      {active && (
        <>
          <Box aria-hidden sx={ring(0)} />
          <Box aria-hidden sx={ring(1)} />
        </>
      )}
      <ButtonBase
        onClick={onClick}
        disabled={disabled || busy}
        aria-label={label}
        sx={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: accent,
          color: "#fff",
          boxShadow: `0 ${Math.round(size * 0.12)}px ${Math.round(size * 0.31)}px rgba(5, 133, 224, 0.35)`,
          transition: "transform 0.2s, background-color 0.2s, box-shadow 0.2s",
          "&:hover": { bgcolor: "#046bb8", transform: "scale(1.04)" },
          "&.Mui-disabled": { bgcolor: "rgba(5, 133, 224, 0.4)", color: "rgba(255, 255, 255, 0.7)", boxShadow: "none" },
          "&:focus-visible": { outline: `3px solid ${accent}`, outlineOffset: 3 },
        }}
      >
        {busy ? (
          <CircularProgress size={Math.round(size * 0.36)} color="inherit" thickness={4} />
        ) : active ? (
          <ActiveIcon sx={{ fontSize: Math.round(size * 0.45) }} />
        ) : (
          <Icon sx={{ fontSize: Math.round(size * 0.45) }} />
        )}
      </ButtonBase>
    </Box>
  );
};

export default RoundButton;
