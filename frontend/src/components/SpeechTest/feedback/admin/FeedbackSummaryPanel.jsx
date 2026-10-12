import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import Reveal from "../../setup/Reveal";
import RatingBreakdown from "./RatingBreakdown";
import CriteriaAverages from "./CriteriaAverages";
import CommentList from "./CommentList";
import { adminApi, apiErrorMessage } from "../../../../services/speechTestApi";

/** One titled column of the panel. */
const Column = ({ title, children }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", mb: 1.75 }}>{title}</Typography>
    {children}
  </Box>
);

/**
 * Admin view of the feedback students sent for one test: how many responded,
 * the average rating and its spread, the average for each rated part of the
 * test, and the latest written suggestions.
 */
const FeedbackSummaryPanel = ({ testId }) => {
  const isDark = useTheme().palette.mode === "dark";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminApi
      .feedbackSummary(testId)
      .then((data) => !cancelled && setSummary(data.summary))
      .catch((err) => !cancelled && setError(apiErrorMessage(err, "Could not load feedback")));
    return () => {
      cancelled = true;
    };
  }, [testId]);

  return (
    <Reveal
      y={12}
      sx={{
        mb: 3,
        p: { xs: 2, md: 3 },
        borderRadius: "16px",
        border: `1px solid ${border}`,
        bgcolor: isDark ? "#0A0A0A" : "#fff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, mb: 2.5, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>Student feedback</Typography>
        {summary && (
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
              {summary.total}
            </Box>{" "}
            feedback{summary.total === 1 ? "" : "s"} received
            {summary.skipped > 0 && ` · ${summary.skipped} skipped`}
          </Typography>
        )}
      </Box>

      {error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : !summary ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : summary.total === 0 ? (
        <Typography color="text.secondary" variant="body2">
          No feedback yet. Students are asked for it when they finish the test.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.9fr 1.25fr" }, gap: { xs: 3, md: 4 } }}>
          <Column title="Overall rating">
            <RatingBreakdown average={summary.averageRating} total={summary.total} distribution={summary.distribution} />
          </Column>
          <Column title="Rated parts of the test">
            <CriteriaAverages criteria={summary.criteria} />
          </Column>
          <Column title="Suggestions">
            <CommentList comments={summary.comments} />
          </Column>
        </Box>
      )}
    </Reveal>
  );
};

export default FeedbackSummaryPanel;
