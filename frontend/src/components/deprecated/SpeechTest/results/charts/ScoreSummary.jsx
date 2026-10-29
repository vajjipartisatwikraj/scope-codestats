import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import ResultCard from "../ResultCard";
import Reveal from "../../setup/Reveal";
import Donut from "./Donut";
import AnimatedNumber from "../motion/AnimatedNumber";
import { BANDS, bandOf } from "../resultsTheme";

/**
 * Section score in a ring, with how many questions fell in each band. `delayMs`
 * is when its own animation starts (the card itself is revealed by the page).
 */
const ScoreSummary = ({ questions, score, delayMs = 0 }) => {
  const { border, muted } = useSurface();

  const counts = {};
  questions.forEach((q) => {
    const band = bandOf(q);
    counts[band] = (counts[band] || 0) + 1;
  });

  const segments = BANDS.filter((b) => b.color).map((b) => ({ value: counts[b.key] || 0, color: b.color }));

  return (
    <ResultCard title="Score summary" caption="Questions by band">
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
        <Donut segments={segments} delayMs={delayMs}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.5rem", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
            <AnimatedNumber value={score} decimals={Number.isInteger(score) ? 0 : 1} suffix="%" delayMs={delayMs} durationMs={1000} />
          </Typography>
          <Typography sx={{ color: muted, fontSize: "0.7rem", fontWeight: 600 }}>Section score</Typography>
        </Donut>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
          {BANDS.map((band, i) => (
            <Reveal key={band.key} y={6} duration={0.4} delay={delayMs / 1000 + 0.15 + i * 0.08}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 9,
                    height: 9,
                    borderRadius: "3px",
                    bgcolor: band.color || border,
                    border: band.color ? "none" : `1px solid ${muted}`,
                  }}
                />
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: muted, minWidth: 104 }}>
                  {band.label}
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
                  <AnimatedNumber value={counts[band.key] || 0} delayMs={delayMs + 300 + i * 80} durationMs={600} />
                </Typography>
              </Box>
            </Reveal>
          ))}
        </Box>
      </Box>
    </ResultCard>
  );
};

export default ScoreSummary;
