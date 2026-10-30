const mongoose = require("mongoose");

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model references User via the 'user' field. When a User is deleted the
 * cascade middleware in User.js removes these documents:
 * Resume.deleteMany({ user: userId })
 */

/**
 * A resume is three things and nothing more (see backend/resumeTemplates):
 *
 *   template   which template it uses: its id and its name
 *   details    what the student wrote: name, contacts, education, projects ... (plain JSON,
 *              cleaned by normalizeDetails() before it is saved)
 *   html       the finished resume as one HTML document, the template filled with the details.
 *              It is made on the server on every save, so it is always safe to show and to print.
 */
const resumeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  template: {
    type: String,
    required: true,
  },
  templateName: {
    type: String,
    default: "",
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  html: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

resumeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Resume", resumeSchema);
