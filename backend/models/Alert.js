const mongoose = require("mongoose");

/**
 * An alert: one short message in a band across the top of the app, for everyone who is signed in
 * (students, teachers and admins), between `startsAt` and `endsAt`. Admins write it in the alert
 * management screen.
 *
 * The band can carry one button (`buttonText` and `buttonUrl`, both or neither). `closeClicks` and
 * `buttonClicks` count how many people pressed the cross and the button (one count per person, see
 * services/notices/noticeFeedService.js). Who has already closed an alert is stored per user in
 * NoticeInteraction, so it does not come back for them.
 *
 * `isActive` is the admin's on/off switch; the alert is live only while it is on and now is inside
 * its window (services/notices/noticeShared.statusOf).
 */
const alertSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    buttonText: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "",
    },
    // An https address, or a path inside the app that starts with a single "/"
    buttonUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    closeClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    buttonClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// The feed asks for "on, and now inside the window"
alertSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model("Alert", alertSchema);
