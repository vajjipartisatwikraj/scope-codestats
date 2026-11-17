const mongoose = require("mongoose");

/**
 * What one user did with one alert or announcement: when they closed it (`dismissedAt`) and when they
 * pressed its button (`clickedAt`). This is the server's "seen" record: a notice with a `dismissedAt`
 * for the user is never sent to them again. Pressing the button also counts as dismissing it.
 *
 * `kind` says which collection `notice` points to ("alert" is models/Alert, "announcement" is
 * models/Announcement). There is at most one record per user and notice, which is also what keeps the
 * click counters on the notice to one count per person.
 */
const noticeInteractionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["alert", "announcement"],
      required: true,
    },
    notice: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    dismissedAt: Date,
    clickedAt: Date,
  },
  { timestamps: true }
);

noticeInteractionSchema.index({ user: 1, kind: 1, notice: 1 }, { unique: true });
// Deleting a notice removes its records
noticeInteractionSchema.index({ kind: 1, notice: 1 });

module.exports = mongoose.model("NoticeInteraction", noticeInteractionSchema);
