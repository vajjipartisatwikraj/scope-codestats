import React from "react";
import { Box, Collapse, Divider, Grid, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SetupButton from "../setup/SetupButton";
import useSurface from "../setup/useSurface";
import SpeechQuestionEditor from "../SpeechQuestionEditor";
import { SECTION_TYPE_META } from "../speechTestMeta";

/**
 * One section of the editor, styled like a row of the student's section list.
 * The header (number, name, facts, actions) is always visible; clicking it opens
 * the settings and questions underneath.
 *
 * `started` means students have begun the test: sections and questions that
 * were already saved are then read-only and cannot be moved or removed, but new
 * ones can still be added.
 */
const SectionEditorCard = ({
  index,
  total,
  section,
  open,
  started,
  onToggle,
  onChange,
  onMove,
  onRemove,
  onQuestionChange,
  onAddQuestion,
  onRemoveQuestion,
}) => {
  const { card, border, divider, accent, muted } = useSurface();
  const meta = SECTION_TYPE_META[section.type];
  const locked = started && Boolean(section._id);
  const count = section.questions.length;

  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler();
  };

  return (
    <Box sx={{ bgcolor: card, border: `1px solid ${open ? accent : border}`, borderRadius: "14px", transition: "border-color 0.2s" }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle())}
        sx={{ display: "flex", alignItems: "center", gap: 2, px: 2.25, py: 1.75, cursor: "pointer" }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${border}`,
            fontWeight: 700,
          }}
        >
          {index + 1}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.3 }}>
            {section.title || meta.label}
          </Typography>
          <Typography noWrap sx={{ color: muted, fontSize: "0.86rem", mt: 0.25 }}>
            <Box component="span" sx={{ color: meta.color, fontWeight: 600 }}>
              {meta.label}
            </Box>{" "}
            · {section.timeLimitMinutes} min · {count} question{count === 1 ? "" : "s"}
          </Typography>
        </Box>

        {locked && (
          <Tooltip title="Students have started, so this section is locked. You can still add questions to it.">
            <LockOutlinedIcon fontSize="small" sx={{ color: muted }} />
          </Tooltip>
        )}

        {!started && (
          <Box sx={{ display: "flex" }}>
            <Tooltip title="Move up">
              <span>
                <IconButton size="small" onClick={stop(() => onMove(-1))} disabled={index === 0} aria-label="Move section up">
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton
                  size="small"
                  onClick={stop(() => onMove(1))}
                  disabled={index === total - 1}
                  aria-label="Move section down"
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
        {!locked && (
          <Tooltip title="Delete section">
            <IconButton size="small" onClick={stop(onRemove)} aria-label="Delete section">
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <ExpandMoreIcon
          sx={{ color: muted, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </Box>

      <Collapse in={open} unmountOnExit>
        <Divider sx={{ borderColor: divider }} />
        <Box sx={{ p: 2.25 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={7}>
              <TextField
                label="Section title"
                value={section.title}
                onChange={(e) => onChange({ title: e.target.value })}
                fullWidth
                size="small"
                disabled={locked}
                inputProps={{ maxLength: 120 }}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Time limit (minutes)"
                type="number"
                value={section.timeLimitMinutes}
                onChange={(e) => onChange({ timeLimitMinutes: e.target.value })}
                fullWidth
                size="small"
                disabled={locked}
                inputProps={{ min: 1, max: 120 }}
                helperText="Runs only while the student is in this section"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Section instructions (optional)"
                value={section.instructions}
                onChange={(e) => onChange({ instructions: e.target.value })}
                fullWidth
                size="small"
                disabled={locked}
                placeholder={meta.hint}
                inputProps={{ maxLength: 1000 }}
              />
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2.5 }}>
            {section.questions.map((question, qIndex) => (
              <SpeechQuestionEditor
                key={question.key}
                index={qIndex}
                type={section.type}
                question={question}
                locked={started && Boolean(question._id)}
                onChange={(patch) => onQuestionChange(question.key, patch)}
                onRemove={() => onRemoveQuestion(question.key)}
              />
            ))}
          </Box>

          <SetupButton
            variant="secondary"
            startIcon={<AddIcon />}
            onClick={onAddQuestion}
            sx={{ mt: count ? 2 : 0 }}
          >
            Add question
          </SetupButton>
        </Box>
      </Collapse>
    </Box>
  );
};

export default SectionEditorCard;
