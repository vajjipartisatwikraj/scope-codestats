const mongoose = require("mongoose");

/**
 * A named list of roll numbers that staff can attach to cohorts, like an IAM group.
 *
 * Only roll numbers are stored. They are matched to user accounts when the group is
 * attached or viewed, so students who register after the group was created are
 * picked up the next time the group is synced to a cohort.
 *
 * `rollNumbers` is always trimmed and unique ignoring case; use
 * services/userGroups/rollNumberService.normalizeRollNumbers before writing.
 * Which cohorts use a group is stored on the cohort (`Cohort.userGroups`).
 */
const userGroupSchema = new mongoose.Schema(
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
    rollNumbers: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

userGroupSchema.pre("validate", function (next) {
  if (this.name) this.nameKey = this.name.trim().toLowerCase();
  next();
});

module.exports = mongoose.model("UserGroup", userGroupSchema);
