import React from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon,
  FormatSize as FormatSizeIcon,
} from "@mui/icons-material";
import { blankItem, clampFontSize, getFontSizeBounds } from "../../utils/resume";

/**
 * Editor for one template field. Handles every field type the templates
 * support (text, multiline, bullets, repeater) so ResumeEditPanel stays a thin
 * list and new fields need no UI work.
 */

// Bullet list: one input per point, with add/remove
const BulletsEditor = ({ definition, points, mutedColor, onChange }) => {
  const maxItems = definition.maxItems || 10;
  const list = Array.isArray(points) ? points : [];

  const update = (next) => onChange(next);

  return (
    <Box>
      {list.map((point, index) => (
        <Box key={index} sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mb: 1 }}>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            label={`Point ${index + 1}`}
            placeholder={definition.placeholder}
            value={point}
            onChange={(e) =>
              update(list.map((item, i) => (i === index ? e.target.value : item)))
            }
            inputProps={{ maxLength: definition.maxLength }}
          />
          <IconButton
            size="small"
            aria-label={`Remove point ${index + 1}`}
            onClick={() => update(list.filter((_, i) => i !== index))}
            sx={{ color: "#f44336", mt: 0.5 }}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}

      <Button
        size="small"
        startIcon={<AddIcon />}
        disabled={list.length >= maxItems}
        onClick={() => update([...list, ""])}
        sx={{ textTransform: "none", color: "#0088cc" }}
      >
        Add point
      </Button>
      <Typography variant="caption" sx={{ color: mutedColor, ml: 1 }}>
        {list.length}/{maxItems}
      </Typography>
    </Box>
  );
};

// Repeatable entries described by definition.subFields
const RepeaterEditor = ({ definition, items, darkMode, mutedColor, onChange }) => {
  const maxItems = definition.maxItems || 10;
  const list = Array.isArray(items) ? items : [];

  const patchItem = (index, patch) =>
    onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <Box>
      {list.map((item, index) => (
        <Box
          key={index}
          sx={{
            p: 1.5,
            mb: 1.5,
            borderRadius: "10px",
            border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ color: mutedColor, fontWeight: 600 }}>
              {definition.itemLabel || "Entry"} {index + 1}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="Remove entry">
              <IconButton
                size="small"
                onClick={() => onChange(list.filter((_, i) => i !== index))}
                sx={{ color: "#f44336" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {definition.subFields.map((subField) =>
            subField.type === "bullets" ? (
              <Box key={subField.key} sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ color: mutedColor }}>
                  {subField.label}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <BulletsEditor
                    definition={subField}
                    points={item[subField.key]}
                    mutedColor={mutedColor}
                    onChange={(points) => patchItem(index, { [subField.key]: points })}
                  />
                </Box>
              </Box>
            ) : (
              <TextField
                key={subField.key}
                fullWidth
                size="small"
                label={subField.label}
                placeholder={subField.placeholder}
                value={item[subField.key] ?? ""}
                onChange={(e) => patchItem(index, { [subField.key]: e.target.value })}
                inputProps={{ maxLength: subField.maxLength }}
                multiline={subField.type === "multiline"}
                minRows={subField.type === "multiline" ? 2 : undefined}
                sx={{ mt: 1 }}
              />
            ),
          )}
        </Box>
      ))}

      <Button
        size="small"
        startIcon={<AddIcon />}
        disabled={list.length >= maxItems}
        onClick={() => onChange([...list, blankItem(definition.subFields)])}
        sx={{ textTransform: "none", color: "#0088cc" }}
      >
        {definition.addLabel || "Add entry"}
      </Button>
      <Typography variant="caption" sx={{ color: mutedColor, ml: 1 }}>
        {list.length}/{maxItems}
      </Typography>
    </Box>
  );
};

const ResumeFieldEditor = ({ template, definition, field, darkMode, onChange }) => {
  const mutedColor = darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
  const { minFontSize, maxFontSize } = getFontSizeBounds(template);

  const setValue = (value) => onChange({ value });
  const stepFontSize = (delta) =>
    onChange({ fontSize: clampFontSize(template, field.fontSize + delta) });

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, color: darkMode ? "#fff" : "#000", mb: 0.5 }}
      >
        {definition.label}
      </Typography>

      {definition.helperText && (
        <Typography variant="caption" sx={{ display: "block", color: mutedColor, mb: 1 }}>
          {definition.helperText}
        </Typography>
      )}

      {definition.type === "repeater" ? (
        <RepeaterEditor
          definition={definition}
          items={field.value}
          darkMode={darkMode}
          mutedColor={mutedColor}
          onChange={setValue}
        />
      ) : definition.type === "bullets" ? (
        <BulletsEditor
          definition={definition}
          points={field.value}
          mutedColor={mutedColor}
          onChange={setValue}
        />
      ) : (
        <TextField
          fullWidth
          size="small"
          placeholder={definition.placeholder}
          value={field.value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          inputProps={{ maxLength: definition.maxLength }}
          multiline={definition.type === "multiline"}
          minRows={definition.type === "multiline" ? 4 : undefined}
        />
      )}

      {/* Font size for this field */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
        <Tooltip title="Decrease font size">
          <IconButton
            size="small"
            onClick={() => stepFontSize(-1)}
            disabled={field.fontSize <= minFontSize}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <TextField
          size="small"
          type="number"
          value={field.fontSize}
          onChange={(e) => onChange({ fontSize: clampFontSize(template, e.target.value) })}
          inputProps={{ min: minFontSize, max: maxFontSize, "aria-label": "Font size" }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FormatSizeIcon sx={{ fontSize: 16, color: mutedColor }} />
              </InputAdornment>
            ),
            endAdornment: <InputAdornment position="end">px</InputAdornment>,
          }}
          sx={{ width: 130 }}
        />

        <Tooltip title="Increase font size">
          <IconButton
            size="small"
            onClick={() => stepFontSize(1)}
            disabled={field.fontSize >= maxFontSize}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Typography variant="caption" sx={{ color: mutedColor, ml: 0.5 }}>
          {minFontSize}-{maxFontSize}px
        </Typography>
      </Box>
    </Box>
  );
};

export default ResumeFieldEditor;
