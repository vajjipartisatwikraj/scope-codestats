import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../../setup/useSurface";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";
import { PROMPT_FONT } from "../runnerTheme";

const GAP = /_{2,}/;

/**
 * The sentence with its gap turned into a text box. If the teacher did not mark
 * a gap with underscores, the sentence is shown as it is and the box goes below.
 */
const FillBlankAnswer = ({ question, answer, disabled, onChange }) => {
  const { accent, border, muted } = useSurface();
  const value = answer?.text || "";
  const maxChars = question.maxChars || 500;

  const match = GAP.exec(question.text);
  const before = match ? question.text.slice(0, match.index) : question.text;
  const after = match ? question.text.slice(match.index + match[0].length) : "";

  const input = (
    <Box
      component="input"
      type="text"
      value={value}
      disabled={disabled}
      maxLength={maxChars}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Your answer for the blank"
      placeholder="Type here"
      sx={{
        // Grows with what is typed, between a sensible minimum and the line width.
        width: `${Math.min(Math.max(value.length + 2, 10), 40)}ch`,
        maxWidth: "100%",
        mx: match ? 0.75 : 0,
        px: 1,
        py: 0.25,
        font: "inherit",
        fontFamily: PROMPT_FONT,
        fontWeight: 600,
        color: "inherit",
        textAlign: "center",
        bgcolor: "transparent",
        border: "none",
        borderBottom: `2px solid ${value ? accent : border}`,
        borderRadius: 0,
        outline: "none",
        transition: "border-color 0.2s",
        "&::placeholder": { color: muted, opacity: 0.6, fontWeight: 500 },
        "&:focus": { borderBottomColor: accent },
        "&:disabled": { opacity: 0.6 },
      }}
    />
  );

  return (
    <Box>
      {match ? (
        <PromptText>
          {before}
          {input}
          {after}
        </PromptText>
      ) : (
        <>
          <PromptText>{question.text}</PromptText>
          <Box sx={{ mt: 2 }}>{input}</Box>
        </>
      )}
      <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: muted, fontWeight: 600 }}>
        Type the missing word or words.
      </Typography>
      <SaveStatusLine status={answer?.status} visible={value.length > 0} />
    </Box>
  );
};

export default FillBlankAnswer;
