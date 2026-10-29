import React from "react";
import { Box, Typography } from "@mui/material";
import SetupButton from "../../setup/SetupButton";
import useSurface from "../../setup/useSurface";

/** Bottom bar of the review page: a reminder on the left, the two actions on the right. */
const ReviewActions = ({ unanswered, disabled, onBack, onSubmit }) => {
  const { border, muted } = useSurface();

  return (
    <Box
      sx={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
        px: { xs: 2, md: 6 },
        py: 2,
        borderTop: `1px solid ${border}`,
      }}
    >
      <Typography sx={{ color: muted, fontWeight: 600, fontSize: "0.88rem" }}>
        {unanswered > 0
          ? `${unanswered} unanswered question${unanswered === 1 ? "" : "s"} will get no score once you submit.`
          : "All questions are answered. You cannot change them after you submit."}
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5 }}>
        <SetupButton variant="secondary" disabled={disabled} onClick={onBack} sx={{ fontWeight: 700 }}>
          Back to questions
        </SetupButton>
        <SetupButton disabled={disabled} onClick={onSubmit} sx={{ fontWeight: 700 }}>
          Submit section
        </SetupButton>
      </Box>
    </Box>
  );
};

export default ReviewActions;
