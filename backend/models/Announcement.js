const mongoose = require("mongoose");

/**
 * An announcement: a larger message that opens as a card after sign-in, with an optional image on the
 * left and a rich text description on the right, for the people in its audience between `startsAt` and
 * `endsAt`. Admins write it in the announcement management screen.
 *
 * Audience:
 *   all       every signed-in user
 *   students  students only
 *   teachers  teachers and admins
 *   groups    the students whose roll number is in one of `userGroups` (see models/UserGroup)
 *
 * `description` is HTML written in the rich text editor. It is cleaned again in the browser before it
 * is shown (utils/sanitizeHtml). `closeClicks` and `buttonClicks` count how many people pressed the
 * cross and the button (one count per person). Who has already closed it is stored per user in
 * NoticeInteraction, so it does not open again for them.
 */
const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    // An https address of the picture shown on the left (optional)
    imageUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    audience: {
      type: String,
      enum: ["all", "students", "teachers", "groups"],
      default: "all",
    },
    userGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserGroup",
      },
    ],
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

announcementSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model("Announcement", announcementSchema);
