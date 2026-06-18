const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
  },
  isVisible: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

// Update timestamps on each save
questionBankSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Add case-insensitive index for name
questionBankSchema.index(
  { name: 1 },
  { collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("QuestionBank", questionBankSchema);
