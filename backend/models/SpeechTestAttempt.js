const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * One student's attempt at a speech test.
 *
 * Section lifecycle:
 *   not_started -> in_progress -> queued -> scoring -> scored
 *                                    ^          |
 *                                    +- failed -+   (retry puts it back to queued)
 *
 * `queued` means the student has submitted but the answers have not yet been
 * accepted by SpeechJudge (or the judge was unreachable and will be retried).
 * `scoring` means the judge holds a job for it.
 *
 * The section clock runs only while the section is `in_progress`. Nothing ticks
 * between sections, so there is no test-level timer.
 */
const SECTION_STATUS = [
  "not_started",
  "in_progress",
  "queued",
  "scoring",
  "scored",
  "failed",
];

const questionResultSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    // Judge status for this question, or ANSWER_MISSING when nothing was given.
    status: { type: String, default: "" },
    // 0-100, always set. Missing or unscored answers count as 0.
    score: { type: Number, default: 0 },
    reason: { type: String, default: "" },
    flags: { type: [String], default: [] },
    // Detailed breakdown for the results page (see services/speechAnalysis).
    // Null for sections scored before this existed, or when the judge sent none.
    analysis: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const attemptSectionSchema = new Schema(
  {
    sectionId: { type: Schema.Types.ObjectId, required: true },
    status: { type: String, enum: SECTION_STATUS, default: "not_started" },
    startedAt: { type: Date, default: null },
    // min(startedAt + limit, test end). Authoritative; the client only mirrors it.
    deadlineAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
    scoredAt: { type: Date, default: null },
    // Seconds the section was actually open, for tie-breaking and reports.
    timeUsedSeconds: { type: Number, default: 0 },

    // Judge bookkeeping
    judgeJobId: { type: String, default: null },
    judgeRequestId: { type: String, default: null },
    dispatchAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: "" },

    // Result, out of 100.
    score: { type: Number, default: null },
    questionsTotal: { type: Number, default: 0 },
    questionsAnswered: { type: Number, default: 0 },
    results: { type: [questionResultSchema], default: [] },
    // Average of each skill over the answered questions, 0-100. Compared with
    // the rest of the batch on the results page.
    skills: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const speechTestAttemptSchema = new Schema(
  {
    test: { type: Schema.Types.ObjectId, ref: "SpeechTest", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    sections: { type: [attemptSectionSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    // Mean of the section scores, out of 100. Set when the test is ended.
    finalScore: { type: Number, default: null },
    totalTimeUsedSeconds: { type: Number, default: 0 },
    endReason: { type: String, enum: ["student", "window_closed", null], default: null },
  },
  { timestamps: true }
);

speechTestAttemptSchema.index({ test: 1, user: 1 }, { unique: true });
speechTestAttemptSchema.index({ test: 1, status: 1, finalScore: -1 });
// Sweeper support
speechTestAttemptSchema.index({ status: 1, "sections.status": 1 });

const SpeechTestAttempt = mongoose.model("SpeechTestAttempt", speechTestAttemptSchema);
SpeechTestAttempt.SECTION_STATUS = SECTION_STATUS;

module.exports = SpeechTestAttempt;
