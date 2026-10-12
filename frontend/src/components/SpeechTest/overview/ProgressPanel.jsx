import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import { formatClock, formatScore } from "../speechTestMeta";

/**
 * Progress and finish controls, shown inside the test's side card. While the
 * test is under way it shows how many sections are scored and the End test
 * button (enabled once all are). After the test it shows the final score.
 *
 * It fills the space left in the card, and the main button sits at the very
 * bottom of it.
 */
const ProgressPanel = ({ scored, total, completed, finalScore, timeUsedSeconds, canEnd, onEnd, onLeaderboard }) => {
  const { border, accent, muted } = useSurface();

  return (
    <Box sx={{ p: 2.75, flex: 1, display: "flex", flexDirection: "column" }}>
      {completed ? (
        <>
          <Typography sx={{ color: muted, fontWeight: 600, fontSize: "0.9rem" }}>Final score</Typography>
          <Typography sx={{ color: accent, fontWeight: 700, fontSize: "2.4rem", lineHeight: 1.15, mt: 0.5 }}>
            {formatScore(finalScore)}
          </Typography>
          <Typography sx={{ color: muted, fontSize: "0.9rem", lineHeight: 1.55, mt: 1 }}>
            Average of your {total} section score{total === 1 ? "" : "s"}
            {timeUsedSeconds ? `, ${formatClock(timeUsedSeconds)} spent in sections` : ""}.
          </Typography>
          <Box sx={{ mt: "auto", pt: 2.5 }}>
            <SetupButton onClick={onLeaderboard} sx={{ width: "100%" }}>
              View leaderboard
            </SetupButton>
          </Box>
        </>
      ) : (
        <>
          <Typography sx={{ color: muted, fontWeight: 600, fontSize: "0.9rem" }}>Your progress</Typography>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "2.1rem", lineHeight: 1.15 }}>
              {scored} of {total}
            </Typography>
            <Typography sx={{ color: muted, fontSize: "0.9rem" }}>scored</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={total ? (scored / total) * 100 : 0}
            aria-label="Sections scored"
            sx={{
              mt: 1.5,
              height: 6,
              borderRadius: 3,
              bgcolor: border,
              "& .MuiLinearProgress-bar": { bgcolor: "#4caf50", borderRadius: 3 },
            }}
          />
          <Typography sx={{ color: muted, fontSize: "0.9rem", lineHeight: 1.6, mt: 2 }}>
            A section's timer runs only while you are inside it. You can start the next section without waiting for
            scores.
          </Typography>

          <Box sx={{ mt: "auto", pt: 2.5 }}>
            <SetupButton
              variant={canEnd ? "primary" : "secondary"}
              onClick={onEnd}
              disabled={!canEnd}
              sx={{ width: "100%" }}
            >
              End test
            </SetupButton>
            {!canEnd && (
              <Typography sx={{ color: muted, fontSize: "0.82rem", mt: 1, textAlign: "center" }}>
                Available once every section is scored.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ProgressPanel;
