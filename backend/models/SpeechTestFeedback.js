const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * A student's feedback about a speech test, collected once when they finish it.
 *
 * `status` is "skipped" when the student dismissed the form without rating
 * anything. A skipped record carries no ratings; it only remembers that they
 * were asked, so the form is not shown again, and it is left out of every
 * count and average.
 *
 * One record per attempt. Deleting an attempt (so the student can retake the
 * test) deletes its feedback too.
 */
const ratingField = { type: Number, min: 1, max: 5, default: null };

const speechTestFeedbackSchema = new Schema(
  {
    test: { type: Schema.Types.ObjectId, ref: "SpeechTest", required: true },
    attempt: { type: Schema.Types.ObjectId, ref: "SpeechTestAttempt", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["submitted", "skipped"], required: true },

    // Overall experience, 1-5 stars.
    rating: ratingField,
    // Optional 1-5 scores for specific parts of the test.
    ratings: {
      instructions: ratingField,
      accuracy: ratingField,
      ease: ratingField,
      scoring: ratingField,
    },
    comment: { type: String, default: "", trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

speechTestFeedbackSchema.index({ attempt: 1 }, { unique: true });
speechTestFeedbackSchema.index({ test: 1, status: 1, createdAt: -1 });

const CRITERIA = ["instructions", "accuracy", "ease", "scoring"];

const SpeechTestFeedback = mongoose.model("SpeechTestFeedback", speechTestFeedbackSchema);
SpeechTestFeedback.CRITERIA = CRITERIA;

module.exports = SpeechTestFeedback;
