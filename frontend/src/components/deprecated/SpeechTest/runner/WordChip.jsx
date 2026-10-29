import React from "react";
import { Box } from "@mui/material";
import useSurface from "../setup/useSurface";
import { PROMPT_FONT } from "./runnerTheme";

/** A single word button of the jumbled-sentence exercise. `filled` = placed in the answer. */
const WordChip = ({ word, filled = false, disabled, title, onClick }) => {
  const { border, accent } = useSurface();

  return (
    <Box
      component="button"
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      sx={{
        font: "inherit",
        fontFamily: PROMPT_FONT,
        fontSize: "1.05rem",
        fontWeight: 500,
        px: 1.75,
        py: 0.75,
        borderRadius: "10px",
        cursor: "pointer",
        color: filled ? "#fff" : "text.primary",
        bgcolor: filled ? accent : "transparent",
        border: `1.5px solid ${filled ? accent : border}`,
        transition: "border-color 0.15s, opacity 0.15s",
        "&:hover:not(:disabled)": { borderColor: accent },
        "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 },
        "&:disabled": { cursor: "default", opacity: filled ? 1 : 0.35 },
      }}
    >
      {word}
    </Box>
  );
};

export default WordChip;
