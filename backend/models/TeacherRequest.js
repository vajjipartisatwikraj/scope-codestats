const mongoose = require("mongoose");

/**
 * A request for teacher access, made by someone who signed in from the teacher sign-in
 * page. An admin approves or rejects it; approving turns the account into a teacher
 * (services/teacherRequestService.js).
 *
 * A user can have many requests over time (for example after a rejection) but only one
 * pending at once.
 */
const teacherRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    // Anything that helps the admin recognise the person: department, designation.
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

// At most one pending request per user, enforced by the database so two quick clicks
// cannot create two.
teacherRequestSchema.index(
  { user: 1 },
  { name: "one_pending_per_user", unique: true, partialFilterExpression: { status: "pending" } }
);

// A person's latest request
teacherRequestSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("TeacherRequest", teacherRequestSchema);
