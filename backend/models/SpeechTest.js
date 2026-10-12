const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Communication (speech) test.
 *
 * A teacher schedules a test with a live window, a list of eligible students
 * and an ordered list of sections. Each section holds exactly one question type
 * and its own time limit. Grading is done by the external SpeechJudge service,
 * so the types here mirror the section ids that service accepts.
 */

const SECTION_TYPES = [
  "READING",
  "REPEAT",
  "JUMBLED",
  "QUESTION_ANSWER",
  "STORYTELLING",
  "FILL_BLANKS",
  "MCQ",
  "EMAIL_WRITING",
];

/** Types the student answers by typing or choosing, with no recording. */
const TEXT_ONLY_TYPES = ["FILL_BLANKS", "MCQ", "EMAIL_WRITING"];

/** One choice of a multiple-choice question. Its _id is what the student's answer refers to. */
const optionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 300 },
  isCorrect: { type: Boolean, default: false },
});

const questionSchema = new Schema({
  /**
   * READING / JUMBLED: the sentence (JUMBLED shows it scrambled).
   * REPEAT: the sentence the browser speaks aloud (never displayed).
   * QUESTION_ANSWER / STORYTELLING: the prompt shown to the student.
   * FILL_BLANKS: the sentence with the gap marked by underscores.
   * MCQ: the question. EMAIL_WRITING: the task the email is written for.
   */
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  // REPEAT only: the accent the student's browser should speak the sentence in.
  // There is no stored audio: the browser's own text-to-speech reads `text`
  // aloud while the sentence itself stays hidden on screen.
  accent: { type: String, enum: ["en-IN", "en-US", "en-GB", "en-AU"], default: "en-IN" },
  // REPEAT only: male or female voice. Browsers do not expose a voice's gender,
  // so the student's browser picks the best match it can find by name.
  gender: { type: String, enum: ["female", "male"], default: "female" },
  // JUMBLED only: answer by arranging words on screen, or by speaking.
  jumbledMode: { type: String, enum: ["ui", "audio"], default: "ui" },
  // FILL_BLANKS only: the correct answer, and any other answers also accepted.
  // Matching ignores case and extra spaces; nothing else is forgiven.
  answerKey: { type: String, trim: true, default: "", maxlength: 500 },
  acceptedAnswers: { type: [String], default: [] },
  // MCQ only: 2 to 6 choices, one or two of them correct.
  options: { type: [optionSchema], default: [] },
});

const sectionSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: SECTION_TYPES, required: true },
  instructions: { type: String, trim: true, default: "", maxlength: 1000 },
  timeLimitMinutes: { type: Number, required: true, min: 1, max: 120 },
  questions: { type: [questionSchema], default: [] },
});

const speechTestSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, default: "", maxlength: 2000 },
    instructions: { type: String, trim: true, default: "", maxlength: 3000 },
    startTime: { type: Date, required: true },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          if (!value || !this.startTime) return true;
          return new Date(value) > new Date(this.startTime);
        },
        message: "End time must be after the start time",
      },
    },
    sections: { type: [sectionSchema], default: [] },
    eligibleUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // Students only see published tests.
    isPublished: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

speechTestSchema.index({ eligibleUsers: 1, isPublished: 1 });

const SpeechTest = mongoose.model("SpeechTest", speechTestSchema);
SpeechTest.SECTION_TYPES = SECTION_TYPES;
SpeechTest.TEXT_ONLY_TYPES = TEXT_ONLY_TYPES;

module.exports = SpeechTest;
