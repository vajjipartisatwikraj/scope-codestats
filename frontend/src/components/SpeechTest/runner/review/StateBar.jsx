import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import { STATE_COLORS } from "../runnerTheme";

/** One thin segment per question, coloured by its state. */
const StateBar = ({ states }) => {
  const { border } = useSurface();

  return (
    <Box
      role="img"
      aria-label="Question states"
      sx={{ display: "flex", gap: "5px", width: "100%" }}
    >
      {states.map((state, i) => (
        <Box
          key={i}
          sx={{
            flex: 1,
            minWidth: 0,
            height: 5,
            borderRadius: 3,
            bgcolor: STATE_COLORS[state] || border,
          }}
        />
      ))}
    </Box>
  );
};

export default StateBar;
