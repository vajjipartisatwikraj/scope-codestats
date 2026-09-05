import React from "react";
import { Autocomplete, Box, Button, Chip, IconButton, TextField, Typography } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { skillOptions } from "../../constants/profileOptions";
import { formatSkillLabel } from "../../utils/skillSets";

// Editable view of the skill sets. Unlike normalizeSkillSets this keeps blank
// rows, so a set the user just added stays on screen while they fill it in.
export const asEditableSkillSets = (value) =>
  Array.isArray(value)
    ? value.map((set) =>
        set && typeof set === "object"
          ? {
              name: set.name || "",
              skills: Array.isArray(set.skills) ? set.skills : [],
            }
          : { name: "", skills: [] },
      )
    : [];

// Editor for the grouped skills shape: [{ name: "Languages", skills: ["Java"] }]
const SkillSetsEditor = ({ value, onChange, darkMode = false, disabled = false }) => {
  const skillSets = asEditableSkillSets(value);

  const update = (updater) => onChange(updater(skillSets));

  const handleNameChange = (setIndex, name) =>
    update((sets) => sets.map((set, i) => (i === setIndex ? { ...set, name } : set)));

  const handleSkillsChange = (setIndex, skills) => {
    // Format each entry ("java script" -> "Java Script") and drop duplicates
    const formatted = [...new Set(skills.map(formatSkillLabel).filter(Boolean))];
    update((sets) =>
      sets.map((set, i) => (i === setIndex ? { ...set, skills: formatted } : set)),
    );
  };

  return (
    <Box sx={{ width: "100%" }}>
      {skillSets.length === 0 && (
        <Typography
          variant="body2"
          sx={{
            mb: 2,
            fontStyle: "italic",
            color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
          }}
        >
          No skill sets yet. Add one to get started.
        </Typography>
      )}

      {skillSets.map((skillSet, setIndex) => (
        <Box
          key={setIndex}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: "12px",
            border: `1px solid ${
              darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"
            }`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Skill set name"
              placeholder="e.g. Languages"
              value={skillSet.name}
              disabled={disabled}
              onChange={(e) => handleNameChange(setIndex, e.target.value)}
              onBlur={(e) =>
                handleNameChange(setIndex, formatSkillLabel(e.target.value))
              }
            />
            <IconButton
              aria-label="Remove skill set"
              disabled={disabled}
              onClick={() =>
                update((sets) => sets.filter((_, i) => i !== setIndex))
              }
              sx={{ color: "#f44336" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Autocomplete
            multiple
            freeSolo
            options={skillOptions}
            value={skillSet.skills}
            disabled={disabled}
            onChange={(e, newValue) => handleSkillsChange(setIndex, newValue)}
            renderTags={(tags, getTagProps) =>
              tags.map((option, chipIndex) => (
                <Chip
                  label={option}
                  {...getTagProps({ index: chipIndex })}
                  key={`${option}-${chipIndex}`}
                  size="small"
                  sx={{
                    bgcolor: darkMode
                      ? "rgba(0,136,204,0.2)"
                      : "rgba(0,136,204,0.1)",
                    color: "#0088cc",
                    border: "1px solid rgba(0,136,204,0.3)",
                  }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                margin="normal"
                label="Skills in this set"
                placeholder="Add a skill and press enter"
                helperText="Type a skill and press Enter, or pick from suggestions"
                disabled={disabled}
              />
            )}
          />
        </Box>
      ))}

      <Button
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={() => update((sets) => [...sets, { name: "", skills: [] }])}
        sx={{
          color: "#0088cc",
          borderColor: "rgba(0,136,204,0.5)",
          textTransform: "none",
        }}
      >
        + Add Skill Set
      </Button>
    </Box>
  );
};

export default SkillSetsEditor;
