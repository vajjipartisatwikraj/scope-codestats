import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import MeterBar from "./MeterBar";
import { CRITERIA } from "../feedbackMeta";

/** Average score, out of 5, for each part of the test students were asked to rate. */
const CriteriaAverages = ({ criteria }) => {
  const { muted } = useSurface();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
      {CRITERIA.map((item, i) => (
        <Box key={item.key}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography sx={{ color: muted, fontSize: "0.78rem", fontWeight: 600 }}>{item.label}</Typography>
            <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
              {criteria[item.key] ?? "-"}
              <Typography component="span" sx={{ color: muted, fontSize: "0.72rem" }}>
                {" "}
                / 5
              </Typography>
            </Typography>
          </Box>
          <Box sx={{ display: "flex" }}>
            <MeterBar value={criteria[item.key] || 0} max={5} delayMs={200 + i * 80} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default CriteriaAverages;
