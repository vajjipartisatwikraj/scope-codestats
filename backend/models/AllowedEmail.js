const mongoose = require("mongoose");
const { EMAIL_PATTERN, MAX_EMAIL_LENGTH } = require("../config/loginAccess");

/**
 * One address on the access list. When LOGIN_MODE=allowlist only these addresses (and
 * admins) can sign in, whatever their domain; removing one blocks that person again,
 * including a person who already has an account.
 *
 * Only the address and the role are stored. The person fills in their own roll number,
 * department, year and college when they set up their profile.
 */
const allowedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: MAX_EMAIL_LENGTH,
      match: [EMAIL_PATTERN, "Enter a valid email address"],
    },
    // "teacher" gives staff access on the first sign-in (an admin listed them). Never "admin".
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    note: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // How the address got on the list, shown to the admin
    source: {
      type: String,
      enum: ["manual", "csv", "existing-accounts"],
      default: "manual",
    },
  },
  { timestamps: true }
);

allowedEmailSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model("AllowedEmail", allowedEmailSchema);
