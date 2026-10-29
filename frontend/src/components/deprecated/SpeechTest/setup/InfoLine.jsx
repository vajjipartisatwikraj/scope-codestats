import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "./useSurface";

/** An icon in a tinted square with a small label and a value beside it. */
const InfoLine = ({ icon: Icon, label, value }) => {
  const { accent, accentSoft, muted } = useSurface();

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <Box
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: "9px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: accentSoft,
          color: accent,
        }}
      >
        <Icon sx={{ fontSize: 19 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ color: muted, lineHeight: 1.2, fontSize: "0.78rem" }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", lineHeight: 1.3 }}>{value}</Typography>
      </Box>
    </Box>
  );
};

export default InfoLine;
