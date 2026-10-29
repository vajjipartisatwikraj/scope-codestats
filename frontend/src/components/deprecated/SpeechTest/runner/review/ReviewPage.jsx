import React from "react";
import { Box } from "@mui/material";
import RunnerStage from "../RunnerStage";
import ReviewSummary from "./ReviewSummary";
import ReviewTable from "./ReviewTable";
import ReviewActions from "./ReviewActions";

/**
 * Overview of the whole section before submitting: how many questions are in
 * each state, a row per question with a way to jump back to it, and the submit
 * button. The page does not scroll; only the rows do, if there are many.
 *
 * `items` is [{ id, state }] in question order, where state is
 * answered | open | later | review.
 */
const ReviewPage = ({ title, items, disabled, onGoTo, onBack, onSubmit }) => {
  const states = items.map((item) => item.state);

  return (
    <RunnerStage sx={{ display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          maxWidth: 1100,
          mx: "auto",
          boxSizing: "border-box",
          px: { xs: 2, md: 6 },
          pt: 3.5,
          pb: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <ReviewSummary title={title} states={states} />
        <ReviewTable items={items} disabled={disabled} onGoTo={onGoTo} />
      </Box>

      <ReviewActions
        unanswered={states.filter((s) => s === "open").length}
        disabled={disabled}
        onBack={onBack}
        onSubmit={onSubmit}
      />
    </RunnerStage>
  );
};

export default ReviewPage;
