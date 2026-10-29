import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import { formatDateTime } from "../speechTestMeta";
import Reveal from "./Reveal";
import TestSummaryCard from "./TestSummaryCard";
import TipsCarousel from "./TipsCarousel";
import AcknowledgeBar from "./AcknowledgeBar";
import instructionTips from "./instructionTips";
import useSurface from "./useSurface";

/**
 * Step 1 of the pre-test flow: what the test covers and how to prepare.
 * `animateIn` staggers the blocks on the first visit only; coming back from the
 * next step, the slide transition is the only movement.
 *
 * On desktop the step fills exactly the space between the top bar and the
 * footer: the summary card and the tips share that height and the page does not
 * scroll. (On phones the blocks stack and the page scrolls as usual.)
 */
const InstructionsStep = ({ test, state, acknowledged, onAcknowledge, onContinue, animateIn }) => {
  const { muted } = useSurface();

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        maxWidth: 1420,
        width: "100%",
        mx: "auto",
        px: { xs: 2, md: 6 },
        py: { xs: 3, md: 2.5 },
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 30%) minmax(0, 1fr)" },
          gridTemplateRows: { md: "minmax(0, 1fr)" },
          gap: { xs: 3, md: 5 },
        }}
      >
        <Reveal delay={0.05} still={!animateIn} sx={{ minHeight: 0, height: "100%" }}>
          <TestSummaryCard test={test} />
        </Reveal>

        <Reveal
          delay={0.18}
          still={!animateIn}
          sx={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}
        >
          <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.25rem" }}>
            Before you begin
          </Typography>
          <Typography sx={{ color: muted, mt: 0.15, mb: 0.5, fontSize: "0.88rem" }}>
            A few things that help your recordings score well.
          </Typography>

          <TipsCarousel tips={instructionTips} />

          {test.instructions && (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>From your teacher</Typography>
              <Typography
                variant="body2"
                sx={{
                  color: muted,
                  fontSize: "0.82rem",
                  whiteSpace: "pre-line",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {test.instructions}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 1.25 }}>
            {state !== "live" && (
              <Alert severity="info" sx={{ mb: 1, py: 0, fontSize: "0.82rem" }}>
                {state === "upcoming"
                  ? `This test opens on ${formatDateTime(test.startTime)}. You can read the instructions now.`
                  : "This test has ended."}
              </Alert>
            )}
            <AcknowledgeBar
              checked={acknowledged}
              onChange={onAcknowledge}
              label="I have read and understood the instructions"
              actionLabel="Continue"
              onAction={onContinue}
              disabled={state !== "live"}
            />
          </Box>
        </Reveal>
      </Box>
    </Box>
  );
};

export default InstructionsStep;
