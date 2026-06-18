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

// Update timestamps on each save
cohortSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Cohort", cohortSchema);
