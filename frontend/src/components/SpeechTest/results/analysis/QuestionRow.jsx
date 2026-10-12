import React from "react";
import { Box, Collapse, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import useSurface from "../../setup/useSurface";
import ScoreBadge from "./ScoreBadge";
import { DARK_CARD } from "../resultsTheme";

/** Grid shared by the column header and the rows, so the columns line up. */
export const rowColumns = (columnCount) => ({
  xs: "20px 40px minmax(0, 1fr) 58px",
  md: `20px 44px minmax(0, 1fr) ${columnCount ? `repeat(${columnCount}, 104px) ` : ""}64px`,
});

/**
 * One question in the analysis list. The summary line is always visible; the
 * detail (children) opens under it.
 */
const QuestionRow = ({ question, columns, open, expandable, onToggle, children }) => {
  const { card, border, accent, muted, isDark } = useSurface();
  const { analysis } = question;

  const scoreOf = (key) => analysis?.rings.find((ring) => ring.key === key)?.score;

  return (
    <Box
      sx={{
        bgcolor: isDark ? DARK_CARD : card,
        border: `1px solid ${open ? accent : border}`,
        borderRadius: "12px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        disabled={!expandable}
        aria-expanded={open}
        sx={{
          width: "100%",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          bgcolor: "transparent",
          border: "none",
          cursor: expandable ? "pointer" : "default",
          display: "grid",
          gridTemplateColumns: rowColumns(columns.length),
          alignItems: "center",
          gap: 1.5,
          px: 2.5,
          py: 1.5,
          "&:hover": expandable ? { bgcolor: "rgba(5, 133, 224, 0.05)" } : {},
          "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: -2 },
        }}
      >
        <ChevronRightRoundedIcon
          sx={{
            fontSize: 20,
            color: expandable ? accent : "transparent",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
        <Typography sx={{ fontWeight: 700, fontSize: "0.88rem" }}>Q{question.number}</Typography>
        <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
          {question.text}
        </Typography>

        {question.answered ? (
          columns.map((column) => (
            <Typography
              key={column.key}
              sx={{ display: { xs: "none", md: "block" }, textAlign: "center", fontWeight: 600, fontSize: "0.88rem" }}
            >
              {scoreOf(column.key) ?? "-"}
            </Typography>
          ))
        ) : columns.length > 0 ? (
          <Typography
            sx={{
              display: { xs: "none", md: "block" },
              gridColumn: `span ${columns.length}`,
              textAlign: "center",
              color: muted,
              fontSize: "0.85rem",
            }}
          >
            Not answered
          </Typography>
        ) : null}

        <Box sx={{ textAlign: "right" }}>
          <ScoreBadge score={question.score} answered={question.answered} />
        </Box>
      </Box>

      <Collapse in={open} unmountOnExit>
        {children}
      </Collapse>
    </Box>
  );
};

export default QuestionRow;
