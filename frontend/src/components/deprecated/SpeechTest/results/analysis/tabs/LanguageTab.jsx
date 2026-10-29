import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../../setup/useSurface";
import useEntered from "../../motion/useEntered";
import { CSS_EASE } from "../../motion/motionTokens";
import { scoreColor } from "../../resultsTheme";

/** The coloured fill of a score bar, growing from the left. */
const GrowBar = ({ value, delayMs }) => {
  const entered = useEntered(delayMs);
  return (
    <Box
      sx={{
        width: entered ? `${value}%` : 0,
        height: "100%",
        bgcolor: scoreColor(value),
        borderRadius: 3,
        transition: `width 0.8s ${CSS_EASE}`,
      }}
    />
  );
};

/** The language rubric: each criterion with its score and the reason given. */
const LanguageTab = ({ language }) => {
  const { border, muted, divider } = useSurface();

  return (
    <Box>
      <Typography sx={{ color: muted, fontSize: "0.8rem", mb: 1.5 }}>
        Your answer was scored on these criteria, each out of 100.
      </Typography>
      {language.dimensions.map((dimension, i) => (
        <Box
          key={dimension.key}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "150px 150px minmax(0, 1fr)" },
            gap: { xs: 0.75, md: 2 },
            alignItems: "center",
            py: 1.25,
            borderTop: i ? `1px solid ${divider}` : "none",
          }}
        >
          <Typography sx={{ fontWeight: 600, fontSize: "0.86rem" }}>{dimension.label}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: border, overflow: "hidden" }}>
              <GrowBar value={dimension.score} delayMs={150 + i * 80} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", minWidth: 24, textAlign: "right" }}>
              {dimension.score}
            </Typography>
          </Box>
          <Typography sx={{ color: muted, fontSize: "0.82rem" }}>{dimension.justification || "-"}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default LanguageTab;
