const mongoose = require("mongoose");
const { RUN_RETENTION_DAYS } = require("../config/rankings");

/**
 * RankingRun — one calculation of scores and ranks (after a profile sync, or an admin's
 * "recalculate ranks now"). Shown on the admin page and used by students' pages to say when
 * ranks were last calculated. Old runs expire on their own.
 */
const rankingRunSchema = new mongoose.Schema(
  {
    // 'YYYY-MM-DD' in IST: the day the records of this run are filed under
    dateKey: { type: String, required: true },
    source: { type: String, enum: ["cron", "admin", "recompute"], required: true },
    status: { type: String, enum: ["running", "completed", "failed"], default: "running" },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: 0 },

    // Active students ranked, and what happened to their history records
    students: { type: Number, default: 0 },
    written: { type: Number, default: 0 },
    unchanged: { type: Number, default: 0 },
    // How many students were ranked on each platform
    rankedByPlatform: { type: Map, of: Number, default: {} },

    // The sync this run followed (cron and admin sync runs only)
    sync: {
      totalProfiles: { type: Number, default: 0 },
      updatedProfiles: { type: Number, default: 0 },
      failedProfiles: { type: Number, default: 0 },
    },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

rankingRunSchema.index({ status: 1, finishedAt: -1 });
rankingRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: RUN_RETENTION_DAYS * 24 * 60 * 60 });

module.exports = mongoose.model("RankingRun", rankingRunSchema);
