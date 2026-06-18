const mongoose = require("mongoose");

/**
 * ============================================================================
 * COHORT FEEDBACK MODEL
 * ============================================================================
 * Stores feedback/reviews at the CLONE GROUP level, not per-cohort.
 * This ensures reviews are shared across all relational cohorts without duplication.
 *
 * Key Benefits:
 * - ONE review per user per clone group (no duplicates)
 * - Reviews persist when users switch between related cohorts
 * - Consistent average rating across all cohorts in the family
 */

const cohortFeedbackSchema = new mongoose.Schema({
  // Clone Group ID - the shared identifier for all related cohorts
  cloneGroupId: {
    type: String,
    required: true,
    index: true,
  },

  // Reference to ANY cohort in the clone group (for backward compatibility)
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: true,
    index: true,
  },

  // User who gave the feedback
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // Rating (1-5 stars)
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },

  // Optional comment
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

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one review per user per clone group
cohortFeedbackSchema.index({ cloneGroupId: 1, user: 1 }, { unique: true });

// Update the updatedAt timestamp on save
cohortFeedbackSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CohortFeedback", cohortFeedbackSchema);
