const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'user' field.
 * When a User is deleted, all PATest documents with matching 'user' field
 * are automatically deleted via cascade deletion middleware in User.js
 *
 * Related deletion query: PATest.deleteMany({ user: userId })
 */

const PATestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    parameters: {
      subject: String,
      topics: [String],
      difficulty: {
        type: String,
        enum: ["easy", "medium", "hard", "mixed"],
        default: "mixed",
      },
      questionTypes: {
        mcq: {
          count: Number,
        },
        programming: {
          count: Number,
        },
      },
      timeLimit: {
        type: Number,
        default: 60, // default 60 minutes
      },
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "PAQuestion",
      },
    ],
    status: {
      type: String,
      enum: ["created", "started", "completed"],
      default: "created",
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    // Server-side timer synchronization fields
    serverStartTime: {
      type: Date,
      // Authoritative start time from server (not client-reported)
    },
    serverCurrentTime: {
      type: Date,
      // Last server update timestamp for timer sync
    },
    timeRemainingSeconds: {
      type: Number,
      // Calculated remaining time in seconds (server-side)
    },
    totalTimeTaken: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    maxPossibleScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to get submissions for this test
PATestSchema.virtual("submissions", {
  ref: "PASubmission",
  localField: "_id",
  foreignField: "test",
});

module.exports = mongoose.model("PATest", PATestSchema);
