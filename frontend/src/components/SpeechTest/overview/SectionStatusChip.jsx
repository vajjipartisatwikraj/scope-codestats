import React from "react";
import { Chip, CircularProgress } from "@mui/material";
import useSurface from "../setup/useSurface";

/** Small status label for a section, in a handful of calm tones. */
const SectionStatusChip = ({ status }) => {
  const { accent, accentSoft } = useSurface();

  const tones = {
    not_started: { label: "Not started", bg: accentSoft, color: accent },
    in_progress: { label: "In progress", bg: accent, color: "#fff" },
    queued: { label: "Waiting for score", bg: "rgba(240, 160, 44, 0.16)", color: "#f0a02c", busy: true },
    scoring: { label: "Waiting for score", bg: "rgba(240, 160, 44, 0.16)", color: "#f0a02c", busy: true },
    scored: { label: "Score ready", bg: "rgba(76, 175, 80, 0.16)", color: "#4caf50" },
    failed: { label: "Scoring failed", bg: "rgba(232, 72, 79, 0.16)", color: "#e8484f" },
  };
  const tone = tones[status] || tones.not_started;

  return (
    <Chip
      size="small"
      label={tone.label}
      icon={tone.busy ? <CircularProgress size={11} thickness={6} sx={{ color: "inherit !important" }} /> : undefined}
      sx={{ height: 24, bgcolor: tone.bg, color: tone.color, fontWeight: 600, fontSize: "0.76rem", "& .MuiChip-icon": { ml: 1 } }}
    />
  );
};

export default SectionStatusChip;
