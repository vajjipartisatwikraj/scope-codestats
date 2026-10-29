import React from "react";
import { Typography } from "@mui/material";
import useSurface from "../setup/useSurface";

/** Small caps caption: "QUESTION 4 OF 10 · READ THIS ALOUD". */
const PromptHeading = ({ number, total, cue }) => {
  const { accent } = useSurface();

  return (
    <Typography
      sx={{
        color: accent,
        fontSize: "0.74rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      Question {number} of {total} · {cue}
    </Typography>
  );
};

export default PromptHeading;
