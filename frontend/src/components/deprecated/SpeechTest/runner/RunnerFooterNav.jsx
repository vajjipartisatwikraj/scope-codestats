import React from "react";
import { Box } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ScheduleIcon from "@mui/icons-material/Schedule";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import MarkButton from "./MarkButton";
import { STATE_COLORS } from "./runnerTheme";

/**
 * Bottom row of the question card: Previous on the left, the two bookmark
 * toggles in the middle, Next on the right (Review on the last question).
 */
const RunnerFooterNav = ({ isFirst, isLast, mark, disabled, onPrevious, onNext, onReview, onToggleMark }) => {
  const { divider } = useSurface();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        pt: 2.5,
        borderTop: `1px solid ${divider}`,
      }}
    >
      <SetupButton
        variant="secondary"
        startIcon={<ArrowBackIcon />}
        disabled={isFirst || disabled}
        onClick={onPrevious}
        sx={{ fontWeight: 700 }}
      >
        Previous
      </SetupButton>

      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", justifyContent: "center" }}>
        <MarkButton
          active={mark === "later"}
          color={STATE_COLORS.later}
          disabled={disabled}
          startIcon={<ScheduleIcon />}
          onClick={() => onToggleMark("later")}
        >
          Visit later
        </MarkButton>
        <MarkButton
          active={mark === "review"}
          color={STATE_COLORS.review}
          disabled={disabled}
          startIcon={<BookmarkBorderIcon />}
          onClick={() => onToggleMark("review")}
        >
          Mark for review
        </MarkButton>
      </Box>

      {isLast ? (
        <SetupButton disabled={disabled} onClick={onReview} sx={{ fontWeight: 700 }}>
          Review
        </SetupButton>
      ) : (
        <SetupButton endIcon={<ArrowForwardIcon />} disabled={disabled} onClick={onNext} sx={{ fontWeight: 700 }}>
          Next
        </SetupButton>
      )}
    </Box>
  );
};

export default RunnerFooterNav;
