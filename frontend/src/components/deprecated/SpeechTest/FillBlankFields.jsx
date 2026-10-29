import React from "react";
import { Box, TextField } from "@mui/material";

/**
 * Answer key of a fill-in-the-blank question: the correct answer and, one per
 * line, any other answers that are also right. The comparison ignores capital
 * letters and extra spaces; anything else must match exactly.
 */
const FillBlankFields = ({ question, locked, onChange }) => (
  <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
    <TextField
      label="Correct answer"
      value={question.answerKey}
      onChange={(e) => onChange({ answerKey: e.target.value })}
      size="small"
      fullWidth
      disabled={locked}
      placeholder="is watching"
      inputProps={{ maxLength: 500 }}
      helperText="Capital letters and extra spaces are ignored. Spelling and punctuation must match."
    />
    <TextField
      label="Other accepted answers (optional, one per line)"
      value={(question.acceptedAnswers || []).join("\n")}
      onChange={(e) => onChange({ acceptedAnswers: e.target.value.split("\n") })}
      size="small"
      fullWidth
      multiline
      minRows={2}
      maxRows={6}
      disabled={locked}
      placeholder={"watching\nis currently watching"}
    />
  </Box>
);

export default FillBlankFields;
