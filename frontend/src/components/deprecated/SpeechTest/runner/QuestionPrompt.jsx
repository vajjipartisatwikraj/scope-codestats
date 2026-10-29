import React from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import PromptHeading from "./PromptHeading";
import PromptText from "./PromptText";
import RepeatControls from "./RepeatControls";
import JumbledBuilder from "./JumbledBuilder";
import FillBlankAnswer from "./answers/FillBlankAnswer";
import McqAnswer from "./answers/McqAnswer";
import EmailAnswer from "./answers/EmailAnswer";
import { ANSWER_HINT, PROMPT_CUE } from "./runnerTheme";

/** The section's own instructions, shown above the first question only. */
const InstructionNote = ({ children }) => {
  const { accent, accentSoft } = useSurface();

  return (
    <Box
      sx={{
        mb: 2.5,
        px: 1.75,
        py: 1.1,
        borderRadius: "8px",
        borderLeft: `3px solid ${accent}`,
        bgcolor: accentSoft,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{children}</Typography>
    </Box>
  );
};

/**
 * Everything above the recorder for one question. What it shows depends on the
 * section type: the sentence to read, a play button, scrambled words, or a
 * question to answer.
 */
const QuestionPrompt = ({
  section,
  question,
  number,
  total,
  arrangement,
  answer,
  speaking,
  busy,
  onPlay,
  onArrange,
  onText,
}) => {
  const { type } = section;

  return (
    <Box>
      {number === 1 && section.instructions && <InstructionNote>{section.instructions}</InstructionNote>}

      <PromptHeading number={number} total={total} cue={PROMPT_CUE[type] || "Answer"} />

      {(type === "READING" || type === "QUESTION_ANSWER" || type === "STORYTELLING") && (
        <PromptText>{question.text}</PromptText>
      )}

      {type === "REPEAT" && <RepeatControls speaking={speaking} disabled={busy} onPlay={onPlay} />}

      {type === "FILL_BLANKS" && (
        <FillBlankAnswer question={question} answer={answer} disabled={busy} onChange={(text) => onText(text)} />
      )}
      {type === "MCQ" && (
        <McqAnswer
          question={question}
          answer={answer}
          disabled={busy}
          onChange={(text) => onText(text, { immediate: true })}
        />
      )}
      {type === "EMAIL_WRITING" && (
        <EmailAnswer question={question} answer={answer} disabled={busy} onChange={(text) => onText(text)} />
      )}

      {type === "JUMBLED" && (
        <JumbledBuilder
          words={question.words}
          arrangement={arrangement}
          interactive={question.mode === "ui"}
          disabled={busy}
          status={answer?.status}
          onArrange={onArrange}
        />
      )}

      {ANSWER_HINT[type] && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontWeight: 600 }}>
          {ANSWER_HINT[type]}
        </Typography>
      )}
    </Box>
  );
};

export default QuestionPrompt;
