import React from "react";
import { Box } from "@mui/material";
import useSurface from "./useSurface";

/** The rounded surface used for the main cards of the pre-test screens. */
const SetupCard = ({ minHeight, sx, children }) => {
  const { card, border } = useSurface();

  return (
    <Box
      sx={{
        bgcolor: card,
        border: `1px solid ${border}`,
        borderRadius: "18px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default SetupCard;
