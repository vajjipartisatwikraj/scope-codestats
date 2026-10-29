import React from "react";
import { Box, Chip, Typography } from "@mui/material";
import useSurface from "./useSurface";

/**
 * Shows what the microphone check heard, with a badge for the verdict and the
 * reasons when the audio was not clear. Also covers the "check unavailable"
 * case, so a service problem never reads as the student's fault.
 */
const TranscriptPanel = ({ result }) => {
  const { border, muted, isDark } = useSurface();

  const unavailable = result.available === false;
  const clear = !unavailable && result.clear;

  const badge = unavailable
    ? { label: "Check skipped", color: muted, bg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }
    : clear
    ? { label: "Clear audio", color: "#4caf50", bg: "rgba(76, 175, 80, 0.16)" }
    : { label: "Unclear audio", color: "#f0a02c", bg: "rgba(240, 160, 44, 0.16)" };

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        textAlign: "left",
        px: 2.5,
        py: 2,
        borderRadius: "14px",
        border: `1px solid ${border}`,
        bgcolor: isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.02)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 0.75 }}>
        <Typography variant="caption" sx={{ color: muted, letterSpacing: "0.08em", fontWeight: 600 }}>
          {unavailable ? "AUDIO CHECK" : "WE HEARD"}
        </Typography>
        <Chip
          size="small"
          label={badge.label}
          sx={{ height: 24, bgcolor: badge.bg, color: badge.color, fontWeight: 600, fontSize: "0.78rem" }}
        />
      </Box>

      {unavailable ? (
        <Typography sx={{ fontSize: "1rem", lineHeight: 1.5 }}>
          The audio check is not available right now. Your microphone will still be used in the test, so you can
          continue.
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: "1.2rem", fontWeight: 500, lineHeight: 1.4 }}>
            {result.transcript ? `“${result.transcript}”` : "No speech detected"}
          </Typography>
          {result.issues?.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.25, color: muted }}>
              {result.issues.map((issue) => (
                <Typography component="li" variant="body2" key={issue} sx={{ lineHeight: 1.6 }}>
                  {issue}
                </Typography>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TranscriptPanel;
