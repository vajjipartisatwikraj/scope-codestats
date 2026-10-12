import React from "react";
import { Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import StyledDialog from "../../common/StyledDialog";
import useSurface from "../setup/useSurface";
import { SECTION_TYPES, SECTION_TYPE_META } from "../speechTestMeta";

/** Dialog with one tile per section type; choosing a tile adds a section of that type. */
const SectionTypePicker = ({ open, onClose, onPick }) => {
  const { isDark, border, muted } = useSurface();

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      darkMode={isDark}
      icon={<AddIcon />}
      title="Add a section"
      subtitle="Each section holds one type of question and has its own time limit."
      maxWidth="md"
    >
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
        {SECTION_TYPES.map((type) => {
          const meta = SECTION_TYPE_META[type];
          return (
            <Box
              key={type}
              component="button"
              type="button"
              onClick={() => onPick(type)}
              sx={{
                textAlign: "left",
                font: "inherit",
                color: "inherit",
                bgcolor: "transparent",
                cursor: "pointer",
                p: 2,
                borderRadius: "12px",
                border: `1px solid ${border}`,
                borderLeft: `4px solid ${meta.color}`,
                transition: "border-color 0.2s, background-color 0.2s",
                "&:hover, &:focus-visible": { borderColor: meta.color, bgcolor: `${meta.color}14`, outline: "none" },
              }}
            >
              <Typography sx={{ fontWeight: 700, color: meta.color }}>{meta.label}</Typography>
              <Typography sx={{ color: muted, fontSize: "0.86rem", mt: 0.25 }}>{meta.hint}</Typography>
            </Box>
          );
        })}
      </Box>
    </StyledDialog>
  );
};

export default SectionTypePicker;
