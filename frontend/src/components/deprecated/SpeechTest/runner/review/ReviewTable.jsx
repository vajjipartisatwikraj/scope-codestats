import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import ReviewRow, { ROW_COLUMNS } from "./ReviewRow";

/**
 * Every question of the section with its state. The header stays put and only
 * the rows scroll when there are more than fit on screen.
 *
 * `items` is [{ id, state }] in question order.
 */
const ReviewTable = ({ items, disabled, onGoTo }) => {
  const { border, muted } = useSurface();

  return (
    <Box
      role="table"
      aria-label="Questions"
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        border: `1px solid ${border}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <Box
        role="row"
        sx={{
          display: "grid",
          gridTemplateColumns: ROW_COLUMNS,
          gap: 2,
          px: 2.5,
          py: 1.1,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ color: muted, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.04em" }}>
          QUESTION
        </Typography>
        <Typography sx={{ color: muted, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.04em" }}>
          STATUS
        </Typography>
        {/* Same width as the buttons below, so the columns line up. */}
        <Typography
          sx={{ color: muted, fontWeight: 700, fontSize: "0.78rem", letterSpacing: "0.04em", textAlign: "right" }}
        >
          ACTION
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "rgba(5, 133, 224, 0.5)", borderRadius: 3 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          scrollbarWidth: "thin",
        }}
      >
        {items.map((item, i) => (
          <ReviewRow
            key={item.id}
            number={i + 1}
            state={item.state}
            disabled={disabled}
            onGoTo={() => onGoTo(i)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default ReviewTable;
