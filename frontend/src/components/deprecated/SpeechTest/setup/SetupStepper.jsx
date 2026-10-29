import React from "react";
import { Box } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import useSurface from "./useSurface";

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
};

/**
 * Progress path for the pre-test flow: numbered circles joined by a line, with
 * no visible text. The step names are kept for screen readers.
 *
 * @param {Array<{label: string}>} steps
 * @param {number} current zero-based index of the active step
 */
const SetupStepper = ({ steps, current }) => {
  const { accent, muted, border } = useSurface();

  return (
    <Box
      component="ol"
      aria-label="Test setup progress"
      sx={{ display: "flex", alignItems: "center", justifyContent: "center", m: 0, p: 0, listStyle: "none" }}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const filled = active || done;

        return (
          <Box
            component="li"
            key={step.label}
            aria-current={active ? "step" : undefined}
            sx={{ display: "flex", alignItems: "center" }}
          >
            {index > 0 && (
              <Box
                aria-hidden
                sx={{
                  width: { xs: 56, sm: 96 },
                  height: 2,
                  borderRadius: 1,
                  bgcolor: index <= current ? accent : border,
                }}
              />
            )}
            <Box
              sx={{
                position: "relative",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.9rem",
                fontWeight: 700,
                bgcolor: filled ? accent : "transparent",
                color: filled ? "#fff" : muted,
                border: filled ? `2px solid ${accent}` : `2px solid ${border}`,
                boxShadow: active ? "0 0 0 4px rgba(5, 133, 224, 0.2)" : "none",
              }}
            >
              {done ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : index + 1}
              <Box component="span" sx={visuallyHidden}>
                {step.label}
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default SetupStepper;
