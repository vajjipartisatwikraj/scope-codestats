import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import ScoreBadge from "./ScoreBadge";
import { formatClock } from "../../speechTestMeta";

/** Top line of an open question: how long the answer was, and its overall score. */
const QuestionHeader = ({ question }) => {
  const { muted } = useSurface();
  const { analysis } = question;

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
      <Typography sx={{ color: muted, fontSize: "0.8rem", fontWeight: 600 }}>
        {analysis.durationS > 0 ? `Answer length ${formatClock(analysis.durationS)}` : "Your answer"}
      </Typography>
      <ScoreBadge score={question.score} prefix="Overall " />
    </Box>
  );
};

export default QuestionHeader;
