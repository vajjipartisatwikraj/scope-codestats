import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";
import useEntered from "../../results/motion/useEntered";
import { CSS_EASE } from "../../results/motion/motionTokens";

/** A thin bar showing `value` out of `max`, which fills in from the left when it appears. */
const MeterBar = ({ value, max, color, delayMs = 0 }) => {
  const { border, accent } = useSurface();
  const entered = useEntered(delayMs);
  const share = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <Box sx={{ height: 6, borderRadius: 3, bgcolor: border, overflow: "hidden", flex: 1 }}>
      <Box
        sx={{
          width: entered ? `${share}%` : 0,
          height: "100%",
          borderRadius: 3,
          bgcolor: color || accent,
          transition: `width 0.8s ${CSS_EASE}`,
        }}
      />
    </Box>
  );
};

export default MeterBar;
