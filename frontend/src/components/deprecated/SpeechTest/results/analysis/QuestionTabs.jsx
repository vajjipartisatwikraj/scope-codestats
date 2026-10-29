import React from "react";
import { Box } from "@mui/material";
import useSurface from "../../setup/useSurface";

/** Underlined tab strip. `tabs` is [{ key, label }]. */
const QuestionTabs = ({ tabs, value, onChange }) => {
  const { accent, border, muted } = useSurface();

  return (
    <Box role="tablist" sx={{ display: "flex", gap: 3, borderBottom: `1px solid ${border}`, overflowX: "auto" }}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Box
            key={tab.key}
            component="button"
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            sx={{
              font: "inherit",
              fontSize: "0.85rem",
              fontWeight: 700,
              px: 0.25,
              py: 1.1,
              mb: "-1px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              color: active ? accent : muted,
              bgcolor: "transparent",
              border: "none",
              borderBottom: `2px solid ${active ? accent : "transparent"}`,
              transition: "color 0.15s, border-color 0.15s",
              "&:hover": { color: active ? accent : "text.primary" },
              "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 },
            }}
          >
            {tab.label}
          </Box>
        );
      })}
    </Box>
  );
};

export default QuestionTabs;
