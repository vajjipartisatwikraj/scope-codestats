const mongoose = require("mongoose");
const {
  TEMPLATE_IDS,
  DEFAULT_TEMPLATE_ID,
} = require("../resumeTemplates");
const {
  RESUME_FONT_IDS,
  DEFAULT_RESUME_FONT_ID,
} = require("../resumeFonts");

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model references User via the 'user' field. When a User is deleted the
 * cascade middleware in User.js removes these documents:
 * Resume.deleteMany({ user: userId })
 */

/**
 * One editable field of a resume. The shape is driven by the template config in
 * backend/resumeTemplates, which also clamps the font size.
 *
 * `value` is Mixed because a field's type decides its shape:
 *   text / multiline -> String
 *   bullets          -> [String]
 *   repeater         -> [{ ...subFields }]
 * Everything is normalized by normalizeFields() before it reaches the database.
 */
const resumeFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: "" },
    fontSize: { type: Number, default: 13 },
  },
  { _id: false },
);

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
    enum: TEMPLATE_IDS,
    default: DEFAULT_TEMPLATE_ID,
  },
  // Chosen from backend/resumeFonts, which only lists fonts that render
  // identically in the preview, the PDF and the Word export
  font: {
    type: String,
    enum: RESUME_FONT_IDS,
    default: DEFAULT_RESUME_FONT_ID,
  },
  fields: {
    type: [resumeFieldSchema],
    default: [],
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
