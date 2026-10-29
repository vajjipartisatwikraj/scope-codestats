import React from "react";
import { Typography } from "@mui/material";
import { PROMPT_FONT } from "./runnerTheme";

/** The large question line, set in the prompt typeface. */
const PromptText = ({ children }) => (
  <Typography
    component="h1"
    sx={{
      mt: 1.5,
      fontFamily: PROMPT_FONT,
      fontWeight: 600,
      fontSize: { xs: "1.45rem", md: "1.8rem" },
      lineHeight: 1.4,
      letterSpacing: "-0.005em",
      maxWidth: "34em",
    }}
  >
    {children}
  </Typography>
);

export default PromptText;
