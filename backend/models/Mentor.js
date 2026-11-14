const mongoose = require("mongoose");

/**
 * The students one teacher mentors in one mentorship (MentorType).
 *
 * Two rules are kept by unique indexes, so no race between two teachers can break them:
 *   - a teacher has one roster per mentorship ({ mentorType, teacher });
 *   - a student is in at most one roster per mentorship ({ students, mentorType }).
 * The same student may be in rosters of different mentorships, with the same or other teachers.
 *
 * The second index is partial: a roster with no students is not indexed. Without that, MongoDB
 * indexes an empty array as one `undefined` key and two empty rosters of the same mentorship
 * would collide.
 *
 * Only students that already have an account are stored. Services: services/mentorships/.
 */
const mentorSchema = new mongoose.Schema(
  {
    mentorType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MentorType",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    students: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
  },
  { timestamps: true }
);

mentorSchema.index({ mentorType: 1, teacher: 1 }, { unique: true });
mentorSchema.index(
  { students: 1, mentorType: 1 },
  { unique: true, partialFilterExpression: { "students.0": { $exists: true } } }
);

module.exports = mongoose.model("Mentor", mentorSchema);
