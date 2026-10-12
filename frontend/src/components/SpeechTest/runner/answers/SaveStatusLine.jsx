import React from "react";
import { Typography } from "@mui/material";

const LABELS = { saved: "Answer saved", error: "Not saved yet. Retrying…" };

/** A small line under a typed or chosen answer saying whether it has reached the server. */
const SaveStatusLine = ({ status, visible }) => (
  <Typography
    variant="caption"
    aria-live="polite"
    sx={{
      display: "block",
      minHeight: 20,
      fontWeight: 600,
      color: status === "saved" ? "success.main" : "text.secondary",
      opacity: visible && status ? 1 : 0,
      transition: "opacity 0.2s",
    }}
  >
    {LABELS[status] || "Saving…"}
  </Typography>
);

export default SaveStatusLine;
