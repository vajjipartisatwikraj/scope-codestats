import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/** The task, and a text box to write the email in, with a word and character count. */
const EmailAnswer = ({ question, answer, disabled, onChange }) => {
  const { accent, border, muted, isDark } = useSurface();
  const value = answer?.text || "";
  const maxChars = question.maxChars || 5000;

  return (
    <Box>
      <PromptText>{question.text}</PromptText>

      <Box
        component="textarea"
        value={value}
        disabled={disabled}
        maxLength={maxChars}
        onChange={(event) => onChange(event.target.value)}
        rows={9}
        spellCheck
        aria-label="Write your email here"
        placeholder={"Subject: …\n\nDear …,\n\n…\n\nRegards,\n…"}
        sx={{
          display: "block",
          width: "100%",
          maxWidth: 760,
          boxSizing: "border-box",
          mt: 2.5,
          p: 1.75,
          resize: "vertical",
          font: "inherit",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          color: "inherit",
          bgcolor: "transparent",
          border: `1.5px solid ${border}`,
          borderRadius: "12px",
          transition: "border-color 0.15s, box-shadow 0.15s",
          "&::placeholder": { color: muted, opacity: 0.7 },
          "&:hover": { borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)" },
          "&:focus": { outline: "none", borderColor: accent, boxShadow: `0 0 0 3px ${accent}26` },
          "&:disabled": { opacity: 0.6 },
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", maxWidth: 760, mt: 0.75 }}>
        <SaveStatusLine status={answer?.status} visible={value.length > 0} />
        <Typography variant="caption" sx={{ color: muted, fontWeight: 600, whiteSpace: "nowrap" }}>
          {wordCount(value)} words · {value.length} / {maxChars}
        </Typography>
      </Box>
    </Box>
  );
};

export default EmailAnswer;
