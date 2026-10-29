import React from "react";
import { Box, Typography } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import useSurface from "../../setup/useSurface";
import MeterBar from "./MeterBar";

const GOLD = "#f5b942";

/** The average overall rating, and how many students gave each star count. */
const RatingBreakdown = ({ average, total, distribution }) => {
  const { muted } = useSurface();

  return (
    <Box sx={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
      <Box sx={{ textAlign: "center", minWidth: 96 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "2.2rem", lineHeight: 1 }}>{average ?? "-"}</Typography>
        <Box sx={{ display: "flex", justifyContent: "center", color: GOLD, my: 0.5 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <StarRoundedIcon key={n} sx={{ fontSize: 16, opacity: average && n <= Math.round(average) ? 1 : 0.25 }} />
          ))}
        </Box>
        <Typography sx={{ color: muted, fontSize: "0.75rem" }}>
          {total} response{total === 1 ? "" : "s"}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 0.8 }}>
        {[5, 4, 3, 2, 1].map((stars, i) => (
          <Box key={stars} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ color: muted, fontSize: "0.75rem", fontWeight: 600, width: 12 }}>{stars}</Typography>
            <MeterBar value={distribution[stars - 1]} max={Math.max(total, 1)} color={GOLD} delayMs={150 + i * 70} />
            <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, width: 22, textAlign: "right" }}>
              {distribution[stars - 1]}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default RatingBreakdown;
