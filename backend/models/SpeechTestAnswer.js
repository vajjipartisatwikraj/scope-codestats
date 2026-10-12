const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * A student's saved answer to one question, held until the section is scored.
 *
 * Every answer is written here the moment the student gives it, so a crash, a
 * dropped connection or a closed tab loses nothing. The section submit reads
 * from this collection (never from the browser) when it builds the SpeechJudge
 * request. Audio is deleted once the section has been scored.
 */
const speechTestAnswerSchema = new Schema(
  {
    attempt: { type: Schema.Types.ObjectId, ref: "SpeechTestAttempt", required: true },
    test: { type: Schema.Types.ObjectId, ref: "SpeechTest", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sectionId: { type: Schema.Types.ObjectId, required: true },
    questionId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ["audio", "text"], required: true },
    // 16 kHz mono WAV, produced by the browser.
    audio: { type: Buffer, default: null },
    durationS: { type: Number, default: 0 },
    // JUMBLED (on-screen mode): the words in the order the student chose.
    text: { type: String, default: "" },
  },
  { timestamps: true }
);

speechTestAnswerSchema.index({ attempt: 1, questionId: 1 }, { unique: true });
speechTestAnswerSchema.index({ attempt: 1, sectionId: 1 });

module.exports = mongoose.model("SpeechTestAnswer", speechTestAnswerSchema);
