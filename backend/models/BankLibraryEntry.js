const mongoose = require("mongoose");

/**
 * The catalog of the bank library: one row for every bank, topic and question that lives in the S3
 * bucket. S3 holds the real documents (the bucket is the source of truth); this catalog exists only
 * because S3 can list by prefix but cannot search, count or sort. It is written together with S3 by
 * services/bankLibrary/catalogService.js and can be rebuilt from the bucket at any time ("Rebuild
 * index" on the bank library page).
 *
 *   kind       "bank", "topic" or "question"
 *   uid        the id used in S3 keys: bank_..., topic_..., q_...
 *   bankId     the bank of a topic or a question
 *   topicId    the topic of a question
 *   name       a bank's or topic's name, or a question's title
 *   status     banks only: "draft" (admins only) or "published" (teachers can import it)
 */
const entrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["bank", "topic", "question"], required: true },
    uid: { type: String, required: true, unique: true },
    bankId: { type: String, index: true },
    topicId: { type: String },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published"], default: "draft" },

    // Questions only: enough to list, filter and search without opening the file
    type: { type: String, enum: ["mcq", "programming"] },
    difficultyLevel: { type: String, enum: ["easy", "medium", "hard"] },
    marks: { type: Number },
    tags: [String],

    s3Key: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Listing a bank's topics and a topic's questions in order
entrySchema.index({ kind: 1, bankId: 1, topicId: 1, order: 1 });
// Bank names are unique ignoring case; the service checks it, the collation makes the lookup use the index
entrySchema.index({ kind: 1, name: 1 }, { collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("BankLibraryEntry", entrySchema);
