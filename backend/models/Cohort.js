const mongoose = require("mongoose");

const cohortSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  modules: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
    },
  ],
  eligibleUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  videoResource: {
    type: String,
    trim: true,
  },
  documentationUrl: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDraft: {
    type: Boolean,
    default: true,
  },
  /**
   * Delivery mode.
   *
   * `practice` (the default, and what every pre-existing cohort is) behaves
   * exactly as before: eligible users can open it any time while it is active
   * and published.
   *
   * `exam` adds a hard time window. The cohort is visible to eligible users as
   * soon as it is published, but its content is only reachable between
   * `examStartTime` and `examEndTime`. Once the window closes the cohort is
   * flipped to `isActive: false` and nobody can open it again.
   */
  mode: {
    type: String,
    enum: ["practice", "exam"],
    default: "practice",
    index: true,
    // Demoting an exam to practice drops its window immediately, so a later
    // promotion back to exam cannot silently reuse the old schedule.
    set: function (value) {
      if (value !== "exam" && this instanceof mongoose.Document) {
        this.examStartTime = null;
        this.examEndTime = null;
      }
      return value;
    },
  },
  /**
   * Exam window. Declared as field validators rather than a hook so the rules
   * hold for `validateSync()`, `validate()` and `save()` alike — a hook-only
   * invariant is silently skipped by synchronous validation.
   */
  examStartTime: {
    type: Date,
    default: null,
    required: [
      function () {
        return this.mode === "exam";
      },
      "Exam cohorts require an exam start time",
    ],
  },
  examEndTime: {
    type: Date,
    default: null,
    required: [
      function () {
        return this.mode === "exam";
      },
      "Exam cohorts require an exam end time",
    ],
    validate: {
      validator: function (value) {
        if (this.mode !== "exam") return true;
        if (!value || !this.examStartTime) return true; // `required` reports this
        return new Date(value) > new Date(this.examStartTime);
      },
      message: "Exam end time must be after the exam start time",
    },
  },
  feedbacks: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: [
          300,
          "Comment cannot exceed 50 words (approximately 300 characters)",
        ],
        validate: {
          validator: function (comment) {
            if (!comment) return true; // Allow empty comments
            // Count words by splitting on whitespace and filtering empty strings
            const wordCount = comment
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0).length;
            return wordCount <= 50;
          },
          message: "Comment cannot exceed 50 words",
        },
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  // Average rating calculated from all feedbacks
  averageRating: {
    type: Number,
    default: 0,
  },
  // Clone group ID for tracking relational cohorts (cohorts that share content)
  cloneGroupId: {
    type: String,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * A cohort switched back from exam to practice must not keep a stale window,
 * otherwise re-enabling exam mode later would silently reuse an old schedule.
 * Runs on both sync and async validation paths.
 */
function clearExamWindowForPracticeMode() {
  if (this.mode !== "exam") {
    this.examStartTime = null;
    this.examEndTime = null;
  }
}

cohortSchema.pre("validate", clearExamWindowForPracticeMode);

// Update timestamps on each save
cohortSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Sweeper query support: find exam cohorts whose window has closed.
cohortSchema.index({ mode: 1, isActive: 1, examEndTime: 1 });

module.exports = mongoose.model("Cohort", cohortSchema);
