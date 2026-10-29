import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../../setup/useSurface";
import Reveal from "../../../setup/Reveal";
import ScoreRing from "../ScoreRing";
import SpeechTimeline from "../SpeechTimeline";
import MetricTile from "../MetricTile";

/** Delivery: the speech timeline and the measured pace, pause and clarity figures. */
const FluencyTab = ({ fluency }) => {
  const { muted } = useSurface();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, mb: 2.25 }}>
        {fluency.score !== null && <ScoreRing score={fluency.score} />}
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>
            {fluency.score !== null ? "Fluency score" : "Delivery"}
          </Typography>
          <Typography sx={{ color: muted, fontSize: "0.78rem", mt: 0.25 }}>
            Based on acoustic analysis of pace, pauses and rhythm. {fluency.note}.
          </Typography>
        </Box>
      </Box>

      <SpeechTimeline timeline={fluency.timeline} />

      <Box
        sx={{
          mt: 2,
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
          gap: 1.5,
        }}
      >
        {fluency.tiles.map((tile, i) => (
          <Reveal key={tile.key} y={10} duration={0.4} delay={0.25 + i * 0.045} sx={{ display: "flex", "& > *": { flex: 1 } }}>
            <MetricTile tile={tile} />
          </Reveal>
        ))}
      </Box>
    </Box>
  );
};

export default FluencyTab;
