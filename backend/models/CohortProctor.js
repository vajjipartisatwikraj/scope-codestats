const mongoose = require("mongoose");

/**
 * Proctoring record for an exam-mode cohort.
 *
 * One document per cohort, holding the exam-level roll-up plus a row per
 * participant. Only cohorts with `mode: "exam"` ever get a document: practice
 * cohorts are untracked, so nothing about the existing flow changes.
 *
 * Integrity notes
 *   - Counters are incremented server-side from reported events. The client can
 *     only say "a tab switch happened"; it can never set a total, so a tampered
 *     client cannot lower its own count.
 *   - Scores, ranks and timings are never taken from the client. They are
 *     recomputed from UserCohort and Submission when the summary or the export
 *     is requested.
 *   - The violation log is capped so a misbehaving or malicious client cannot
 *     grow a document without bound. Counters keep counting after the cap.
 */

const MAX_VIOLATION_LOG = 200;

/** Event kinds the client may report. */
const VIOLATION_TYPES = [
  "tab_switch",
  "fullscreen_exit",
  "window_blur",
  "copy",
  "paste",
  "context_menu",
];

const violationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: VIOLATION_TYPES, required: true },
    at: { type: Date, default: Date.now },
    // Optional free-form detail, e.g. how long the student was away.
    detail: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const participantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── attendance ───────────────────────────────────────────────────────
    /** First time this student opened the exam. Absence means "did not attend". */
    startedAt: { type: Date, default: null },
    /** Set when they press END TEST, mirrored from UserCohort. */
    submittedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },

    // ── proctoring counters ──────────────────────────────────────────────
    tabSwitchCount: { type: Number, default: 0, min: 0 },
    fullscreenExitCount: { type: Number, default: 0, min: 0 },
    windowBlurCount: { type: Number, default: 0, min: 0 },
    copyCount: { type: Number, default: 0, min: 0 },
    pasteCount: { type: Number, default: 0, min: 0 },
    violations: { type: [violationSchema], default: [] },

    // ── results, recomputed from the authoritative collections ───────────
    totalScore: { type: Number, default: 0 },
    questionsSolved: { type: Number, default: 0 },
    /** Submit time minus start time, in milliseconds. */
    timeTakenMs: { type: Number, default: null },
  },
  { _id: false }
);

const cohortProctorSchema = new mongoose.Schema({
  cohort: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cohort",
    required: true,
    unique: true,
    index: true,
  },

  // Snapshot of the exam schedule, so a report still reads correctly after an
  // admin edits or deletes the cohort's window.
  examStartTime: { type: Date, default: null },
  examEndTime: { type: Date, default: null },

  // ── cohort-level roll-up ───────────────────────────────────────────────
  totalEligibleUsers: { type: Number, default: 0 },
  attendedCount: { type: Number, default: 0 },
  notAttendedCount: { type: Number, default: 0 },
  submittedCount: { type: Number, default: 0 },
  totalMarksAchieved: { type: Number, default: 0 },
  totalTabSwitches: { type: Number, default: 0 },
  totalFullscreenExits: { type: Number, default: 0 },

  participants: { type: [participantSchema], default: [] },

  lastRecalculatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

cohortProctorSchema.index({ cohort: 1, "participants.user": 1 });

cohortProctorSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

/** Finds the participant row for a user, or null. */
cohortProctorSchema.methods.findParticipant = function (userId) {
  const id = userId.toString();
  return this.participants.find((p) => p.user.toString() === id) || null;
};

/** Finds or appends the participant row for a user. */
cohortProctorSchema.methods.ensureParticipant = function (userId) {
  const existing = this.findParticipant(userId);
  if (existing) return existing;

  this.participants.push({ user: userId });
  return this.participants[this.participants.length - 1];
};

/** Recomputes the cohort-level roll-up from the participant rows. */
cohortProctorSchema.methods.recomputeTotals = function (totalEligibleUsers) {
  if (typeof totalEligibleUsers === "number") {
    this.totalEligibleUsers = totalEligibleUsers;
  }

  const attended = this.participants.filter((p) => p.startedAt);

  this.attendedCount = attended.length;
  this.notAttendedCount = Math.max(
    (this.totalEligibleUsers || 0) - attended.length,
    0
  );
  this.submittedCount = this.participants.filter((p) => p.submittedAt).length;
  this.totalMarksAchieved = this.participants.reduce(
    (sum, p) => sum + (p.totalScore || 0),
    0
  );
  this.totalTabSwitches = this.participants.reduce(
    (sum, p) => sum + (p.tabSwitchCount || 0),
    0
  );
  this.totalFullscreenExits = this.participants.reduce(
    (sum, p) => sum + (p.fullscreenExitCount || 0),
    0
  );
  this.lastRecalculatedAt = new Date();
};

module.exports = mongoose.model("CohortProctor", cohortProctorSchema);
module.exports.VIOLATION_TYPES = VIOLATION_TYPES;
module.exports.MAX_VIOLATION_LOG = MAX_VIOLATION_LOG;
