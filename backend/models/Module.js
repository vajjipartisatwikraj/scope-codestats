const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
    required: true,
    default: 0,
  },
  videoResource: {
    type: String,
    trim: true,
  },
  documentationUrl: {
    type: String,
    trim: true,
  },
  resources: [
    {
      title: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ["video", "document", "tutorial", "article", "other"],
        default: "article",
      },
    },
  ],
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: true,
    description:
      "The cohort that originally created this module (for tracking purposes only)",
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
moduleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Module", moduleSchema);
