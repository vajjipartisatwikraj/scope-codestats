import React from "react";
import { Box, Typography } from "@mui/material";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import QuestionTile from "./QuestionTile";
import PaletteLegend from "./PaletteLegend";

/**
 * Left column of the question screen: a numbered tile per question showing its
 * state, a colour key, and a button that opens the review page. It sits
 * directly on the page and is separated from the answer area by a line.
 *
 * `items` is [{ id, state }] in question order.
 */
const QuestionPalette = ({ items, answeredCount, disabled, onSelect, onReview }) => {
  const { border, divider } = useSurface();

  return (
    <Box
      component="nav"
      aria-label="Questions"
      sx={{
        height: "100%",
        boxSizing: "border-box",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2.5,
        minHeight: 0,
        borderRight: { md: `1px solid ${border}` },
        borderBottom: { xs: `1px solid ${border}`, md: "none" },
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>Questions</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {answeredCount} of {items.length} answered
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 1,
          alignContent: "start",
          overflowY: "auto",
          minHeight: 0,
          p: "3px",
          m: "-3px",
        }}
      >
        {items.map((item, i) => (
          <QuestionTile
            key={item.id}
            number={i + 1}
            state={item.state}
            disabled={disabled}
            onClick={() => onSelect(i)}
          />
        ))}
      </Box>

      <Box sx={{ borderTop: `1px solid ${divider}`, pt: 2 }}>
        <PaletteLegend />
      </Box>

      <Box sx={{ mt: "auto" }}>
        <SetupButton variant="secondary" fullWidth disabled={disabled} onClick={onReview} sx={{ fontWeight: 700 }}>
          Review
        </SetupButton>
      </Box>
    </Box>
  );
};

export default QuestionPalette;
