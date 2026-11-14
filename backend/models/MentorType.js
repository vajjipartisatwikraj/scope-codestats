const mongoose = require("mongoose");

/**
 * A mentorship: a programme in which teachers mentor groups of students (CRT, Academic, E-Cell,
 * Research Project ...). Only admins create them.
 *
 * `eligibleTeachers` is the one place that says which teachers may mentor in it. What each of those
 * teachers holds (their students) is in the Mentor collection, created the first time a teacher adds a
 * student. Services: services/mentorships/.
 */
const mentorTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // Lower-cased name, used only to keep names unique ignoring case.
    nameKey: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    startsAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    eligibleTeachers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// "My mentorships" asks for the types a teacher is eligible for.
mentorTypeSchema.index({ eligibleTeachers: 1 });

mentorTypeSchema.pre("validate", function (next) {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
  next();
});

module.exports = mongoose.model("MentorType", mentorTypeSchema);
