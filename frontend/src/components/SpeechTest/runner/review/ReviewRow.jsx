import React from "react";
import { Box, Typography } from "@mui/material";
import SetupButton from "../../setup/SetupButton";
import useSurface from "../../setup/useSurface";
import StatusBadge from "./StatusBadge";

/** Column layout shared by the header and every row. */
export const ROW_COLUMNS = "minmax(0, 1fr) minmax(0, 1fr) 140px";

/** One question: its number, its state, and a button that opens it. */
const ReviewRow = ({ number, state, disabled, onGoTo }) => {
  const { divider, isDark } = useSurface();

  return (
    <Box
      role="row"
      sx={{
        display: "grid",
        gridTemplateColumns: ROW_COLUMNS,
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 1.1,
        borderTop: `1px solid ${divider}`,
        transition: "background-color 0.15s",
        "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.025)" : "rgba(0, 0, 0, 0.02)" },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: "0.92rem" }}>Question {number}</Typography>
      <Box>
        <StatusBadge state={state} />
      </Box>
      <SetupButton
        variant="secondary"
        disabled={disabled}
        onClick={onGoTo}
        aria-label={`Go to question ${number}`}
        sx={{ justifySelf: "end", px: 2, py: 0.4, fontSize: "0.82rem", fontWeight: 700 }}
      >
        Go to question
      </SetupButton>
    </Box>
  );
};

export default ReviewRow;
