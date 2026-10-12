import React from "react";
import { Box } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import useSurface from "../../setup/useSurface";

/** A white circle with a blue arrow pointing left, for going back from the blue ribbon. */
const RibbonBackButton = ({ onClick, label = "Back to sections" }) => {
  const { accent } = useSurface();

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      sx={{
        width: 42,
        height: 42,
        flexShrink: 0,
        p: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#fff",
        color: accent,
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateX(-2px)", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.24)" },
        "&:active": { transform: "scale(0.94)" },
        "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 3 },
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <ArrowBackRoundedIcon sx={{ fontSize: 26 }} />
    </Box>
  );
};

export default RibbonBackButton;
