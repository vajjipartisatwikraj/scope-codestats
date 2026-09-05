import React from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import {
  educationLevels,
  LEVEL_WITHOUT_STREAM,
  LEVEL_WITH_DEPARTMENT_STREAM,
  scoreLimits,
  scoreTypes,
} from "../../constants/profileOptions";
import { asEditableEducation, getScoreError } from "../../utils/education";

// Editor for User.education:
// [{ level, name, startDate, endDate, scoreType, score, stream }]
const EducationEditor = ({
  value,
  onChange,
  department = "",
  darkMode = false,
  disabled = false,
}) => {
  const entries = asEditableEducation(value);

  const update = (updater) => onChange(updater(entries));

  const setField = (index, field, fieldValue) =>
    update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: fieldValue } : row)),
    );

  // Engineering pulls its stream straight from the user's department
  const handleLevelChange = (index, level) =>
    update((rows) =>
      rows.map((row, i) => {
        if (i !== index) return row;
        if (level === LEVEL_WITHOUT_STREAM) return { ...row, level, stream: "" };
        if (level === LEVEL_WITH_DEPARTMENT_STREAM) {
          return { ...row, level, stream: department };
        }
        return { ...row, level };
      }),
    );

  const isDateRangeInvalid = (entry) =>
    Boolean(entry.startDate && entry.endDate && entry.startDate >= entry.endDate);

  return (
    <Box sx={{ width: "100%" }}>
      {entries.length === 0 && (
        <Typography
          variant="body2"
          sx={{
            mb: 2,
            fontStyle: "italic",
            color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
          }}
        >
          No education added yet. Add School, Intermediate, Diploma or Engineering.
        </Typography>
      )}

      {entries.map((entry, index) => {
        const dateError = isDateRangeInvalid(entry);
        const scoreError = getScoreError(entry.scoreType, entry.score);
        const streamFromDepartment = entry.level === LEVEL_WITH_DEPARTMENT_STREAM;

        return (
        <Box
          key={index}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: "12px",
            border: `1px solid ${
              darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"
            }`,
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Level"
                value={entry.level}
                disabled={disabled}
                onChange={(e) => handleLevelChange(index, e.target.value)}
              >
                {educationLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Institution name"
                  placeholder="College or university name"
                  value={entry.name}
                  disabled={disabled}
                  onChange={(e) => setField(index, "name", e.target.value)}
                />
                <IconButton
                  aria-label="Remove education entry"
                  disabled={disabled}
                  onClick={() => update((rows) => rows.filter((_, i) => i !== index))}
                  sx={{ color: "#f44336" }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="month"
                label="Start date"
                value={entry.startDate}
                disabled={disabled}
                onChange={(e) => setField(index, "startDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={dateError}
                inputProps={{ max: entry.endDate || undefined }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="month"
                label="End date"
                value={entry.endDate}
                disabled={disabled}
                onChange={(e) => setField(index, "endDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={dateError}
                inputProps={{ min: entry.startDate || undefined }}
                helperText={
                  dateError
                    ? "End date must be after the start date"
                    : "Leave empty if ongoing"
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={entry.scoreType}
                  disabled={disabled}
                  onChange={(e, newType) =>
                    newType && setField(index, "scoreType", newType)
                  }
                  sx={{ flexShrink: 0 }}
                >
                  {scoreTypes.map((type) => (
                    <ToggleButton
                      key={type}
                      value={type}
                      sx={{ textTransform: "none", px: 1.5 }}
                    >
                      {type}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <TextField
                  fullWidth
                  size="small"
                  label={entry.scoreType}
                  placeholder={entry.scoreType === "CGPA" ? "8.7" : "87.5"}
                  value={entry.score}
                  disabled={disabled}
                  onChange={(e) =>
                    setField(index, "score", e.target.value.replace(/[^\d.]/g, ""))
                  }
                  inputProps={{ inputMode: "decimal" }}
                  error={Boolean(scoreError)}
                  helperText={
                    scoreError ||
                    `0.00 - ${(scoreLimits[entry.scoreType] ?? 100).toFixed(2)}`
                  }
                />
              </Box>
            </Grid>
            {entry.level !== LEVEL_WITHOUT_STREAM && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Stream / Branch"
                  placeholder="e.g. MPC, Mechanical"
                  value={streamFromDepartment ? department || entry.stream : entry.stream}
                  disabled={disabled || streamFromDepartment}
                  onChange={(e) => setField(index, "stream", e.target.value)}
                  helperText={
                    streamFromDepartment ? "Taken from your department" : " "
                  }
                />
              </Grid>
            )}
          </Grid>
        </Box>
        );
      })}

      <Button
        variant="outlined"
        size="small"
        disabled={disabled}
        onClick={() =>
          update((rows) => [
            ...rows,
            {
              level: "",
              name: "",
              startDate: "",
              endDate: "",
              scoreType: "CGPA",
              score: "",
              stream: "",
            },
          ])
        }
        sx={{
          color: "#0088cc",
          borderColor: "rgba(0,136,204,0.5)",
          textTransform: "none",
        }}
      >
        + Add Education
      </Button>
    </Box>
  );
};

export default EducationEditor;
