import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import Reveal from "../setup/Reveal";
import AnimatedCheck from "./AnimatedCheck";

/** One "label ... value" line under the message, separated from the next by a rule. */
const StatRow = ({ label, value, delay }) => (
  <Reveal
    y={6}
    delay={delay}
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      py: 1.15,
      borderTop: "1px solid rgba(255, 255, 255, 0.25)",
    }}
  >
    <Typography sx={{ color: "rgba(255, 255, 255, 0.82)", fontSize: "0.85rem" }}>{label}</Typography>
    <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>{value}</Typography>
  </Reveal>
);

/**
 * Left side of the feedback card, in the platform blue: confirmation that the
 * test is finished, and the figures worth seeing straight away.
 * `stats` is [{ label, value }].
 */
const CompletionPanel = ({ stats }) => {
  const { accent } = useSurface();

  return (
    <Box
      sx={{
        p: { xs: 3, md: 3.5 },
        bgcolor: accent,
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AnimatedCheck delay={0.15} onBlue />

      <Reveal y={8} delay={0.3}>
        <Typography component="h1" sx={{ mt: 2.5, fontWeight: 700, fontSize: "1.45rem", lineHeight: 1.2 }}>
          Test completed
        </Typography>
        <Typography sx={{ mt: 1, color: "rgba(255, 255, 255, 0.88)", fontSize: "0.9rem", lineHeight: 1.55 }}>
          Thanks for finishing the speech test. Your answers are submitted.
        </Typography>
      </Reveal>

      <Box sx={{ mt: 3 }}>
        {stats.map((stat, i) => (
          <StatRow key={stat.label} label={stat.label} value={stat.value} delay={0.42 + i * 0.08} />
        ))}
      </Box>
    </Box>
  );
};

export default CompletionPanel;
