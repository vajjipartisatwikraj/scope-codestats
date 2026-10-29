/**
 * speechX/feedback: the student's feedback screen after a speech test
 * (route /speech-tests/:id/feedback).
 *
 *   import { SpeechTestFeedbackPage } from "./components/speechX/feedback";
 *
 * feedbackMeta (RATING_LABELS, CRITERIA, COMMENT_LIMIT) is also used by the staff feedback summary
 * in speechX/leaderboard.
 */
export { default as SpeechTestFeedbackPage } from "./SpeechTestFeedbackPage";
export { default } from "./SpeechTestFeedbackPage";
export { RATING_LABELS, CRITERIA, COMMENT_LIMIT } from "./feedbackMeta";
