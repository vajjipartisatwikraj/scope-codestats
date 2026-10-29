import React from "react";
import { TextField } from "../../../ui";
import PromptText from "../PromptText";
import SaveStatusLine from "./SaveStatusLine";
import "./answers.css";

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/** The task, and a text box to write the email in, with a word and character count. */
const EmailAnswer = ({ question, answer, disabled, onChange }) => {
  const value = answer?.text || "";
  const maxChars = question.maxChars || 5000;

  return (
    <div>
      <PromptText>{question.text}</PromptText>

      <div className="sxr-email">
        <TextField
          label="Your email"
          multiline
          rows={9}
          value={value}
          disabled={disabled}
          maxLength={maxChars}
          onChange={(event) => onChange(event.target.value)}
          spellCheck
          placeholder={"Subject: …\n\nDear …,\n\n…\n\nRegards,\n…"}
        />
        <div className="sxr-email__foot">
          <SaveStatusLine status={answer?.status} visible={value.length > 0} />
          <span className="sxr-count">
            <span className="sxr-num">{wordCount(value)}</span> words · <span className="sxr-num">{value.length}</span> /{" "}
            <span className="sxr-num">{maxChars}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default EmailAnswer;
