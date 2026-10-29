import React from "react";
import { Alert, Box, Tooltip, Typography } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import SectionStatusChip from "./SectionStatusChip";
import { formatScore, typeLabel } from "../speechTestMeta";

/**
 * One section in the list: its number, name and facts, its status, and the
 * action that fits where it is (start, resume, view scores, retry). View scores
 * opens the section's results page.
 */
const SectionRow = ({
  index,
  section,
  startable,
  blockedReason,
  onViewScores,
  onStart,
  onResume,
  onRetry,
}) => {
  const { card, border, accent, muted } = useSurface();

  const running = section.status === "in_progress";
  const scored = section.status === "scored";
  const failed = section.status === "failed";

  const meta = [
    typeLabel(section.type),
    `${section.timeLimitMinutes} min`,
    `${section.questionCount} question${section.questionCount === 1 ? "" : "s"}`,
  ].join(" · ");

  return (
    <Box
      sx={{
        bgcolor: card,
        border: `1px solid ${running ? accent : border}`,
        borderRadius: "14px",
        transition: "border-color 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
          px: 2.25,
          py: 2,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${border}`,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </Box>

        <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>{section.title}</Typography>
          <Typography sx={{ color: muted, fontSize: "0.88rem", mt: 0.25 }}>{meta}</Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <SectionStatusChip status={section.status} />

          {scored && (
            <Typography sx={{ color: accent, fontWeight: 700, fontSize: "1.2rem", minWidth: 64, textAlign: "right" }}>
              {formatScore(section.score)}
            </Typography>
          )}

          {scored && (
            <SetupButton variant="secondary" onClick={onViewScores}>
              View scores
            </SetupButton>
          )}

          {failed && (
            <SetupButton onClick={onRetry} startIcon={<RefreshRoundedIcon />}>
              Retry
            </SetupButton>
          )}

          {running && (
            <SetupButton onClick={onResume} startIcon={<PlayArrowRoundedIcon />}>
              Resume section
            </SetupButton>
          )}

          {section.status === "not_started" &&
            (startable ? (
              <SetupButton onClick={onStart}>Start section</SetupButton>
            ) : (
              <Tooltip title={blockedReason}>
                <span>
                  <SetupButton disabled>Start section</SetupButton>
                </span>
              </Tooltip>
            ))}
        </Box>
      </Box>

      {failed && (
        <Alert severity="error" sx={{ mx: 2.25, mb: 2 }}>
          Your answers are saved, but scoring did not finish. {section.error}
        </Alert>
      )}

    </Box>
  );
};

export default SectionRow;
