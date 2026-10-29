/** Look-and-feel constants shared by the question screen components. */

/** The reading text uses a geometric sans so long sentences stay easy to read. */
export const PROMPT_FONT = '"Outfit", "Nekst", "Inter", sans-serif';

/** Colours of the question states, used by the palette tiles and its legend. */
export const STATE_COLORS = {
  answered: "#4caf50",
  later: "#e5a21d",
  review: "#8b6cf0",
};

/**
 * Height of the app footer (padding + 32px logo + border), per breakpoint. The
 * question screen subtracts it so header, content and footer together fill the
 * viewport exactly and the page does not scroll.
 */
export const FOOTER_HEIGHT = { xs: "92px", sm: "58px" };

/** Student-facing name of each question state. */
export const STATE_LABEL = {
  answered: "Answered",
  open: "Unanswered",
  later: "Visit later",
  review: "Marked for review",
};

/** One short cue per section type, shown above the question text. */
export const PROMPT_CUE = {
  READING: "Read this aloud",
  REPEAT: "Listen and repeat",
  JUMBLED: "Rebuild the sentence",
  QUESTION_ANSWER: "Answer this question",
  STORYTELLING: "Tell a story",
  FILL_BLANKS: "Fill in the blank",
  MCQ: "Choose the answer",
  EMAIL_WRITING: "Write an email",
};

/** Suggested answer length per section type. */
export const ANSWER_HINT = {
  QUESTION_ANSWER: "Aim for roughly 15 to 30 seconds.",
  STORYTELLING: "Aim for roughly 30 to 60 seconds.",
  EMAIL_WRITING: "Include a greeting, your main message and a sign-off.",
};
