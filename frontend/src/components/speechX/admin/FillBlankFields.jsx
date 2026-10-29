import React from "react";
import { TextField } from "../../ui";

/**
 * Answer key of a fill-in-the-blank question: the correct answer and, one per
 * line, any other answers that are also right. The comparison ignores capital
 * letters and extra spaces; anything else must match exactly.
 *
 * Props: question, locked, onChange(patch), idPrefix (ids of the two fields).
 */
const FillBlankFields = ({ question, locked, onChange, idPrefix }) => (
  <div className="sxa-q-fields">
    <TextField
      id={`${idPrefix}-answer`}
      label="Correct answer"
      value={question.answerKey}
      onChange={(event) => onChange({ answerKey: event.target.value })}
      disabled={locked}
      placeholder="is watching"
      maxLength={500}
      hint="Capital letters and extra spaces are ignored. Spelling and punctuation must match."
    />
    <TextField
      id={`${idPrefix}-accepted`}
      label="Other accepted answers (optional, one per line)"
      value={(question.acceptedAnswers || []).join("\n")}
      onChange={(event) => onChange({ acceptedAnswers: event.target.value.split("\n") })}
      multiline
      rows={3}
      disabled={locked}
      placeholder={"watching\nis currently watching"}
    />
  </div>
);

export default FillBlankFields;
