import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import StateBar from "./StateBar";
import { STATE_COLORS, STATE_LABEL } from "../runnerTheme";

const ORDER = ["answered", "open", "later", "review"];

/**
 * Top of the review page: title, how many questions are answered, a bar with
 * one segment per question and a count for each state.
 */
const ReviewSummary = ({ title, states }) => {
  const { border, muted } = useSurface();
  const count = (state) => states.filter((s) => s === state).length;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 2 }}>
        <Typography component="h1" sx={{ fontWeight: 700, fontSize: "1.45rem" }}>
          Review {title}
        </Typography>
        <Typography sx={{ color: muted, fontWeight: 600, fontSize: "0.92rem", whiteSpace: "nowrap" }}>
          {count("answered")} of {states.length} answered
        </Typography>
      </Box>

      <StateBar states={states} />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1.5, md: 3 }, mt: 1.75 }}>
        {ORDER.map((state) => (
          <Box key={state} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              aria-hidden
              sx={{
                width: 9,
                height: 9,
                borderRadius: "3px",
                bgcolor: STATE_COLORS[state] || border,
              }}
            />
            <Typography sx={{ color: muted, fontWeight: 600, fontSize: "0.85rem" }}>
              {count(state)} {STATE_LABEL[state]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ReviewSummary;
