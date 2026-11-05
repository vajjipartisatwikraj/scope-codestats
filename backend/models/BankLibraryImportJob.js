const mongoose = require("mongoose");

/**
 * One import from the bank library into a cohort (services/bankLibrary/importService.js).
 *
 * An import can bring in hundreds of questions, so it runs in the background: the request that starts
 * it returns at once with this document, and the page reads the document again every second or two to
 * show progress. The document is written after every batch, which also makes an import resumable: it
 * remembers which steps are done and the module each step writes into, so "Retry" carries on where it
 * stopped.
 *
 * A step is one topic (or a group of single questions) going into one module.
 */
const failureSchema = new mongoose.Schema(
  {
    questionId: String,
    title: String,
    reason: String,
  },
  { _id: false }
);

const stepSchema = new mongoose.Schema(
  {
    topicId: { type: String }, // the library topic the questions come from
    topicName: { type: String },
    // The module the questions go into. Set before the first question is written, so a retry finds it.
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", default: null },
    createModule: { type: Boolean, default: false }, // the module is made by this import
    questionIds: [String], // planned when the import is started, so a retry does the same work
    status: { type: String, enum: ["pending", "running", "done", "partial", "failed", "skipped"], default: "pending" },
    imported: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }, // already in the module from an earlier import
    failed: { type: Number, default: 0 },
    failures: { type: [failureSchema], default: [] }, // the first few, to show why
    error: { type: String },
  },
  { _id: false }
);

const importJobSchema = new mongoose.Schema(
  {
    cohort: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bankId: { type: String, required: true },
    bankName: { type: String, required: true },
    // "bank": the topics of a bank become new modules. "selection": chosen topics and questions go into one module.
    kind: { type: String, enum: ["bank", "selection"], required: true },
    targetModule: { type: mongoose.Schema.Types.ObjectId, ref: "Module", default: null },

    status: { type: String, enum: ["queued", "running", "done", "partial", "failed", "cancelled", "interrupted"], default: "queued", index: true },
    steps: [stepSchema],
    progress: {
      total: { type: Number, default: 0 },
      imported: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      stepsDone: { type: Number, default: 0 },
      stepsTotal: { type: Number, default: 0 },
    },
    cancelRequested: { type: Boolean, default: false },
    error: { type: String },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankLibraryImportJob", importJobSchema);
