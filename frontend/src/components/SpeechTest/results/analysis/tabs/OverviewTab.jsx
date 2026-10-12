import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../../setup/useSurface";
import Reveal from "../../../setup/Reveal";
import ScoreRing from "../ScoreRing";
import { TONE_COLORS } from "../../resultsTheme";

/** One headline score: a ring, its name, and a one-line note. */
const RingCard = ({ ring }) => {
  const { border, muted } = useSurface();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        p: 2,
        borderRadius: "12px",
        border: `1px solid ${border}`,
        minWidth: 0,
      }}
    >
      <ScoreRing score={ring.score} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>{ring.label}</Typography>
        {ring.note && <Typography sx={{ color: muted, fontSize: "0.78rem", mt: 0.25 }}>{ring.note}</Typography>}
      </Box>
    </Box>
  );
};

/** Headline scores and the written feedback. */
const OverviewTab = ({ analysis }) => {
  const { muted } = useSurface();

  return (
    <Box>
      {analysis.rings.length > 0 && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${analysis.rings.length}, 1fr)` }, gap: 2 }}>
          {analysis.rings.map((ring, i) => (
            <Reveal key={ring.key} y={10} delay={0.05 + i * 0.08} sx={{ display: "flex", "& > *": { flex: 1 } }}>
              <RingCard ring={ring} />
            </Reveal>
          ))}
        </Box>
      )}

      {analysis.feedback.length > 0 && (
        <Box sx={{ mt: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", mb: 1 }}>Feedback</Typography>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 0.9 }}>
            {analysis.feedback.map((item, i) => (
              <Box key={i} component="li">
                <Reveal y={8} duration={0.4} delay={0.3 + i * 0.07} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                  <Box
                    aria-hidden
                    sx={{ width: 7, height: 7, mt: "7px", borderRadius: "50%", flexShrink: 0, bgcolor: TONE_COLORS[item.tone] }}
                  />
                  <Typography sx={{ fontSize: "0.85rem", color: muted }}>{item.text}</Typography>
                </Reveal>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default OverviewTab;
