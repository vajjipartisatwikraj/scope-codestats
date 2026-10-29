/**
 * speechX/leaderboard: the results of a speech test.
 *
 * SpeechTestLeaderboardPage is the route component of
 *   /speech-tests/:id/leaderboard            (students: finished attempts, their own row marked)
 *   /admin/communication-tests/:id/results   (staff: every attempt, the feedback summary, delete a submission)
 *
 *   import { SpeechTestLeaderboardPage } from "./components/speechX/leaderboard";
 *
 * The parts are exported too, in case another screen wants them.
 */
export { default as SpeechTestLeaderboardPage } from "./SpeechTestLeaderboardPage";
export { default } from "./SpeechTestLeaderboardPage";
export { default as SpeechTestLeaderboard } from "./SpeechTestLeaderboard";
export { default as DeleteSubmissionDialog } from "./DeleteSubmissionDialog";
export { default as FeedbackSummaryPanel } from "./FeedbackSummaryPanel";
export { default as useSpeechLeaderboard } from "./useSpeechLeaderboard";
