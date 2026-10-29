import React from "react";
import { Box } from "@mui/material";
import useSurface from "../setup/useSurface";
import { STATE_COLORS } from "./runnerTheme";

/**
 * One numbered square of the question palette.
 * `state` is current | review | later | answered | open (first match wins on
 * the caller's side).
 */
const QuestionTile = ({ number, state, disabled, onClick }) => {
  const { border, accent } = useSurface();
  const color = STATE_COLORS[state];
  const current = state === "current";

  const labels = {
    current: "current question",
    review: "marked for review",
    later: "visit later",
    answered: "answered",
    open: "not answered",
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Question ${number}, ${labels[state]}`}
      aria-current={current ? "step" : undefined}
      sx={{
        aspectRatio: "1",
        width: "100%",
        borderRadius: "9px",
        font: "inherit",
        fontSize: "0.85rem",
        fontWeight: 700,
        cursor: "pointer",
        color: current ? "#fff" : color || "text.primary",
        bgcolor: current ? accent : color ? `${color}1f` : "transparent",
        border: `1.5px solid ${current ? accent : color || border}`,
        transition: "background-color 0.15s, border-color 0.15s, transform 0.15s",
        "&:hover:not(:disabled)": { transform: "translateY(-1px)", borderColor: current ? accent : color || accent },
        "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 },
        "&:disabled": { cursor: "default", opacity: 0.6 },
      }}
    >
      {number}
    </Box>
  );
};

export default QuestionTile;
