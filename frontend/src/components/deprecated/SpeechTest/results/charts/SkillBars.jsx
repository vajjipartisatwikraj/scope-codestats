import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import useEntered from "../motion/useEntered";
import { CSS_EASE } from "../motion/motionTokens";

/**
 * Horizontal bars for the skill profile, used when too few skills were measured
 * to draw a radar (it needs at least three). The bars fill in one after another.
 */
const SkillBars = ({ axes, you, delayMs = 0 }) => {
  const { border, accent, muted } = useSurface();
  const entered = useEntered(delayMs);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.6, width: "100%" }}>
      {axes.map((axis, i) => (
        <Box key={axis.key}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography sx={{ color: muted, fontSize: "0.78rem", fontWeight: 600 }}>{axis.label}</Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{you[axis.key]}</Typography>
          </Box>
          <Box sx={{ height: 6, borderRadius: 3, bgcolor: border, overflow: "hidden" }}>
            <Box
              sx={{
                width: entered ? `${you[axis.key]}%` : 0,
                height: "100%",
                bgcolor: accent,
                borderRadius: 3,
                transition: `width 0.9s ${CSS_EASE} ${i * 90}ms`,
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default SkillBars;
