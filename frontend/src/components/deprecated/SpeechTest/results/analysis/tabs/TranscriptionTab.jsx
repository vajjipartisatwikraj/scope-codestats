import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../../setup/useSurface";
import Reveal from "../../../setup/Reveal";
import ScoreRing from "../ScoreRing";
import { TONE_COLORS } from "../../resultsTheme";

const TAGS = {
  match: { label: "Match", tone: "good" },
  substitution: { label: "Substitution", tone: "warn" },
  missing: { label: "Missing", tone: "warn" },
  extra: { label: "Extra", tone: "warn" },
};

/** A word in one of the two rows. Differing words are tinted amber. */
const WordCell = ({ word, differs }) => {
  const { border, muted, isDark } = useSurface();
  const amber = TONE_COLORS.warn;

  return (
    <Box
      sx={{
        height: 34,
        px: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        fontSize: "0.85rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        color: word ? "text.primary" : muted,
        bgcolor: differs ? `${amber}26` : isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)",
        border: `1px solid ${differs ? `${amber}66` : border}`,
      }}
    >
      {word || "-"}
    </Box>
  );
};

const Tag = ({ status }) => {
  const { label, tone } = TAGS[status];
  const color = TONE_COLORS[tone];
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: 0.2,
        borderRadius: "999px",
        fontSize: "0.7rem",
        fontWeight: 700,
        color,
        bgcolor: `${color}1f`,
        border: `1px solid ${color}55`,
      }}
    >
      {label}
    </Box>
  );
};

const RowLabel = ({ children, height }) => {
  const { muted } = useSurface();
  return (
    <Box sx={{ height, display: "flex", alignItems: "center", color: muted, fontSize: "0.76rem", fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </Box>
  );
};

const Stat = ({ label, value }) => {
  const { border, muted } = useSurface();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 1.75,
        py: 1,
        borderRadius: "10px",
        border: `1px solid ${border}`,
      }}
    >
      <Typography sx={{ color: muted, fontSize: "0.82rem", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{value}</Typography>
    </Box>
  );
};

/**
 * With a target sentence: expected words lined up against the heard words,
 * with the error counts. Without one (open answers): just the transcript.
 */
const TranscriptionTab = ({ transcription }) => {
  const { muted, border } = useSurface();

  if (!transcription.rows) {
    return (
      <Box>
        <Typography sx={{ color: muted, fontSize: "0.8rem", fontWeight: 600, mb: 1 }}>
          What the speech recogniser heard
        </Typography>
        <Typography sx={{ fontSize: "0.92rem", lineHeight: 1.65 }}>{transcription.text || "Nothing was recognised."}</Typography>
      </Box>
    );
  }

  const { rows, counts } = transcription;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 230px" }, gap: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: muted, fontSize: "0.8rem", mb: 1.5 }}>
          The expected text is lined up with what the speech recogniser heard, word by word.
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <RowLabel height={34}>Expected text</RowLabel>
            <RowLabel height={34}>We heard</RowLabel>
            <RowLabel height={22}>Result</RowLabel>
          </Box>

          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1, minWidth: 0 }}>
            {rows.map((row, i) => (
              <Reveal
                key={i}
                y={8}
                duration={0.4}
                delay={0.1 + Math.min(i, 14) * 0.05}
                sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "stretch" }}
              >
                <WordCell word={row.expected} differs={row.status !== "match"} />
                <WordCell word={row.heard} differs={row.status !== "match"} />
                <Box sx={{ height: 22, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Tag status={row.status} />
                </Box>
              </Reveal>
            ))}
          </Box>
        </Box>

        <Typography sx={{ color: muted, fontSize: "0.76rem", mt: 1 }}>{transcription.summary}</Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1.25, borderBottom: `1px solid ${border}` }}>
          <ScoreRing score={transcription.score} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Transcription score</Typography>
            <Typography sx={{ color: muted, fontSize: "0.75rem" }}>Out of 100</Typography>
          </Box>
        </Box>
        <Stat label="Insertions" value={counts.extra} />
        <Stat label="Deletions" value={counts.missing} />
        <Stat label="Substitutions" value={counts.substitutions} />
      </Box>
    </Box>
  );
};

export default TranscriptionTab;
