/**
 * Words shared by the question screens. From SpeechTest/runner/runnerTheme.js, without the look:
 * the colours and the footer height are replaced by states.js and the --sx-* CSS variables, and
 * the retired Outfit prompt font is gone (the prompt uses the app font).
 */

/** Student-facing name of each question state (the full set lives in states.js). */
export { STATE_LABEL } from "./states";

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
