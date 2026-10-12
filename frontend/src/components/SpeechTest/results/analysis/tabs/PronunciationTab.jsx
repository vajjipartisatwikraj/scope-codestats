import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../../setup/useSurface";
import ScoreRing from "../ScoreRing";
import useEntered from "../../motion/useEntered";
import { CSS_EASE } from "../../motion/motionTokens";
import { BAND_COLORS, TONE_COLORS } from "../../resultsTheme";

const COLUMNS = "minmax(70px, 0.7fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(90px, 1.4fr) 56px";

/** Phoneme symbols in slashes; the ones that differed are amber and bold. */
const Phonemes = ({ units }) => (
  <Typography component="span" sx={{ fontFamily: '"Segoe UI", "Noto Sans", sans-serif', fontSize: "0.85rem" }}>
    /{" "}
    {units.map((unit, i) => (
      <Box
        key={i}
        component="span"
        sx={{
          mr: "0.3em",
          fontWeight: unit.wrong ? 800 : 500,
          color: unit.wrong ? TONE_COLORS.warn : "text.primary",
        }}
      >
        {unit.symbol}
      </Box>
    ))}
    /
  </Typography>
);

/** A match-rate bar that fills from the left, `delayMs` after the tab appears. */
const MatchBar = ({ value, level, delayMs }) => {
  const { border } = useSurface();
  const entered = useEntered(delayMs);
  return (
    <Box sx={{ height: 6, borderRadius: 3, bgcolor: border, overflow: "hidden" }}>
      <Box
        sx={{
          width: entered ? `${value}%` : 0,
          height: "100%",
          borderRadius: 3,
          bgcolor: level === "good" ? BAND_COLORS.excellent : TONE_COLORS.warn,
          transition: `width 0.8s ${CSS_EASE}`,
        }}
      />
    </Box>
  );
};

const HeaderCell = ({ children, align }) => {
  const { muted } = useSurface();
  return (
    <Typography sx={{ color: muted, fontSize: "0.72rem", fontWeight: 700, textAlign: align }}>{children}</Typography>
  );
};

/** Per word: expected sounds, heard sounds and how closely they matched. */
const PronunciationTab = ({ pronunciation }) => {
  const { muted, divider } = useSurface();

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, mb: 2 }}>
        <ScoreRing score={pronunciation.score} />
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>Pronunciation score</Typography>
          <Typography sx={{ color: muted, fontSize: "0.78rem", mt: 0.25 }}>
            Average sound match {pronunciation.averageMatch}%. Amber marks the sounds that differed from the expected ones.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 560 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 2, pb: 1 }}>
            <HeaderCell>Word</HeaderCell>
            <HeaderCell>Expected sounds</HeaderCell>
            <HeaderCell>Heard in your audio</HeaderCell>
            <HeaderCell>Match rate</HeaderCell>
            <HeaderCell align="right">Match</HeaderCell>
          </Box>

          {pronunciation.words.map((word, i) => (
            <Box
              key={`${word.word}-${i}`}
              sx={{
                display: "grid",
                gridTemplateColumns: COLUMNS,
                gap: 2,
                alignItems: "center",
                py: 1,
                borderTop: `1px solid ${divider}`,
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{word.word}</Typography>
              <Phonemes units={word.expectedUnits} />
              {word.heardUnits.length ? (
                <Phonemes units={word.heardUnits} />
              ) : (
                <Typography sx={{ color: muted, fontSize: "0.85rem" }}>Not heard</Typography>
              )}
              <MatchBar value={word.accuracy} level={word.level} delayMs={250 + i * 70} />
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", textAlign: "right" }}>{word.accuracy}%</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default PronunciationTab;
