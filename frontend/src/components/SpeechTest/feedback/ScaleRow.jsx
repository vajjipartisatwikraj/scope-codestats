import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";

const STEPS = [1, 2, 3, 4, 5];

/**
 * One question with a 1 to 5 scale: a label, then five segments. Choosing a
 * number fills every segment up to it (left to right, in a quick ripple); the
 * chosen number can be pressed again to clear it.
 */
const ScaleRow = ({ label, value, onChange, disabled = false }) => {
  const { accent, muted, isDark } = useSurface();
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  return (
    <Box
      role="radiogroup"
      aria-label={label}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "170px minmax(0, 1fr)" },
        alignItems: "center",
        gap: { xs: 0.75, sm: 2 },
      }}
      onMouseLeave={() => setHover(0)}
    >
      <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>{label}</Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 0.75 }}>
        {STEPS.map((step) => {
          const on = step <= shown;
          return (
            <Box
              key={step}
              component="button"
              type="button"
              role="radio"
              aria-checked={value === step}
              aria-label={`${label}: ${step} out of 5`}
              disabled={disabled}
              onClick={() => onChange(value === step ? null : step)}
              onMouseEnter={() => setHover(step)}
              onFocus={() => setHover(step)}
              onBlur={() => setHover(0)}
              sx={{
                font: "inherit",
                fontSize: "0.78rem",
                fontWeight: 700,
                height: 28,
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                color: on ? "#fff" : muted,
                bgcolor: on ? accent : isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.06)",
                opacity: hover && step <= hover && step > (value || 0) ? 0.7 : 1,
                // Filling ripples to the right; emptying is immediate.
                transition: `background-color 0.18s ease ${on ? step * 25 : 0}ms, color 0.18s ease, opacity 0.15s ease, transform 0.12s ease`,
                "&:hover:not(:disabled)": { transform: "translateY(-1px)" },
                "&:active:not(:disabled)": { transform: "scale(0.96)" },
                "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 },
                "&:disabled": { cursor: "default" },
              }}
            >
              {step}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ScaleRow;
