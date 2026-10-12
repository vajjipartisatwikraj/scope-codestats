import React from "react";
import { Box, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import useSurface from "../../setup/useSurface";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";

/** The answer is stored as the chosen option ids, comma separated. */
const parseSelected = (text) => (text ? text.split(",").filter(Boolean) : []);

/**
 * A multiple-choice question: the options as a list of large buttons. One
 * correct answer means a single choice (picking another replaces it); two
 * means the student may hold two at once.
 */
const McqAnswer = ({ question, answer, disabled, onChange }) => {
  const { accent, accentSoft, border, muted } = useSurface();
  const selected = parseSelected(answer?.text);
  const limit = question.selectCount || 1;

  const toggle = (id) => {
    let next;
    if (selected.includes(id)) next = selected.filter((s) => s !== id);
    else if (limit === 1) next = [id];
    else if (selected.length < limit) next = [...selected, id];
    else next = [...selected.slice(1), id]; // already holding the maximum: the oldest pick makes way
    onChange(next.join(","));
  };

  return (
    <Box>
      <PromptText>{question.text}</PromptText>
      <Typography variant="caption" sx={{ display: "block", mt: 1.25, color: muted, fontWeight: 600 }}>
        {limit === 1 ? "Choose one answer." : "Choose two answers."}
      </Typography>

      <Box
        role={limit === 1 ? "radiogroup" : "group"}
        aria-label="Answer options"
        sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.1, maxWidth: 640 }}
      >
        {question.options.map((option, i) => {
          const on = selected.includes(option.id);
          return (
            <Box
              key={option.id}
              component="button"
              type="button"
              role={limit === 1 ? "radio" : "checkbox"}
              aria-checked={on}
              disabled={disabled}
              onClick={() => toggle(option.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.75,
                width: "100%",
                p: 1.4,
                font: "inherit",
                fontSize: "0.98rem",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "12px",
                bgcolor: on ? accentSoft : "transparent",
                border: `1.5px solid ${on ? accent : border}`,
                transition: "border-color 0.15s, background-color 0.15s, transform 0.1s",
                "&:hover:not(:disabled)": { borderColor: accent },
                "&:active:not(:disabled)": { transform: "scale(0.995)" },
                "&:focus-visible": { outline: `2px solid ${accent}`, outlineOffset: 2 },
                "&:disabled": { cursor: "default", opacity: 0.6 },
              }}
            >
              <Box
                aria-hidden
                sx={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: limit === 1 ? "50%" : "8px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: on ? "#fff" : muted,
                  bgcolor: on ? accent : "transparent",
                  border: `1.5px solid ${on ? accent : border}`,
                  transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
                }}
              >
                {on ? <CheckRoundedIcon sx={{ fontSize: 18 }} /> : String.fromCharCode(65 + i)}
              </Box>
              <Box component="span" sx={{ flex: 1, minWidth: 0, fontWeight: on ? 600 : 500 }}>
                {option.text}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ mt: 1 }}>
        <SaveStatusLine status={answer?.status} visible={selected.length > 0} />
      </Box>
    </Box>
  );
};

export default McqAnswer;
