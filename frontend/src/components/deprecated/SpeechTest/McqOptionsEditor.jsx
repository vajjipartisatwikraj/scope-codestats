import React from "react";
import { Box, Button, Checkbox, FormControlLabel, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const MAX_CORRECT = 2;

let optionSeed = 0;
const newOption = () => {
  optionSeed += 1;
  return { key: `o${Date.now()}-${optionSeed}`, text: "", isCorrect: false };
};

/**
 * Options of a multiple-choice question: 2 to 6 of them, one or two marked
 * correct. `options` is [{ key, _id?, text, isCorrect }].
 */
const McqOptionsEditor = ({ options, locked, onChange }) => {
  const correctCount = options.filter((o) => o.isCorrect).length;

  const update = (key, patch) => onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const remove = (key) => onChange(options.filter((o) => o.key !== key));

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary">
        Options (tick the correct ones: one or two)
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 0.75 }}>
        {options.map((option, i) => {
          // A third correct answer cannot be ticked.
          const blocked = !option.isCorrect && correctCount >= MAX_CORRECT;
          return (
            <Box key={option.key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={blocked ? `At most ${MAX_CORRECT} correct options` : "Mark as correct"}>
                <span>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    label=""
                    control={
                      <Checkbox
                        size="small"
                        checked={option.isCorrect}
                        disabled={locked || blocked}
                        onChange={(e) => update(option.key, { isCorrect: e.target.checked })}
                        inputProps={{ "aria-label": `Option ${i + 1} is correct` }}
                      />
                    }
                  />
                </span>
              </Tooltip>
              <TextField
                size="small"
                fullWidth
                value={option.text}
                disabled={locked}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => update(option.key, { text: e.target.value })}
                inputProps={{ maxLength: 300 }}
              />
              {!locked && (
                <Tooltip title={options.length <= MIN_OPTIONS ? `At least ${MIN_OPTIONS} options` : "Remove option"}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={options.length <= MIN_OPTIONS}
                      onClick={() => remove(option.key)}
                      aria-label={`Remove option ${i + 1}`}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      {!locked && options.length < MAX_OPTIONS && (
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange([...options, newOption()])}
          sx={{ textTransform: "none", mt: 1 }}
        >
          Add option
        </Button>
      )}

      <Typography
        variant="caption"
        sx={{ display: "block", mt: 0.5, color: correctCount === 0 ? "warning.main" : "text.secondary" }}
      >
        {correctCount === 0
          ? "Mark at least one correct option."
          : correctCount === 2
          ? "Two correct options: students choose two. Choosing only one earns half marks."
          : "One correct option: students choose one."}
      </Typography>
    </Box>
  );
};

export default McqOptionsEditor;
