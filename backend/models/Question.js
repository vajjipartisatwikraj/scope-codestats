const mongoose = require("mongoose");

/**
 * ⚠️ CASCADE DELETE NOTICE:
 * This model has a reference to User model via 'createdBy' field.
 * When a User is deleted, all Question documents with matching 'createdBy' field
 * are automatically deleted via cascade deletion middleware in User.js
 *
 * Related deletion query: Question.deleteMany({ createdBy: userId })
 */

// Define scoring tier schema for language-specific time-based scoring
const scoringTierSchema = new mongoose.Schema(
  {
    maxTime: {
      type: Number,
      required: true,
      min: 1,
      // Time in milliseconds (e.g., 500 for 500ms)
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Define testCase schema for programming problems
const testCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true,
  },
  output: {
    type: String,
    required: true,
  },
  hidden: {
    type: Boolean,
    default: false,
  },
  explanation: {
    type: String,
  },
});

/**
 * SQL question testcase reference.
 *
 * Unlike programming questions, SQL testcase data (seed + expected rows) is not
 * stored here. It lives in the SQLJudge private S3 bucket, and only the
 * identifier and object keys are kept for provenance and auditing.
 */
const sqlTestcaseRefSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    hidden: { type: Boolean, default: false },
    seedKey: { type: String },
    expectedKey: { type: String },
  },
  { _id: false }
);

/**
 * Everything needed to grade and render a SQL question, without duplicating the
 * testcase data that SQLJudge owns.
 *
 * `judgeQuestionId` + `judgeVersion` are the engine's own identifiers; they are
 * a different namespace from this document's `_id`. Question paths in S3 are
 * version pinned and therefore immutable.
 */
const sqlMetaSchema = new mongoose.Schema(
  {
    judgeQuestionId: { type: String, required: true },
    judgeVersion: { type: Number, required: true, default: 1, min: 1 },
    database: {
      type: { type: String, default: "MYSQL" },
      version: { type: String, default: "8.4" },
    },
    // Kept locally for display: students need to see the table definitions.
    schemaSql: { type: String, default: "" },
    // Starting query shown in the editor.
    boilerplateSql: { type: String, default: "" },
    // Reference solution is authoring-only and never served to students.
    solutionSql: { type: String, default: "", select: false },
    expectedColumns: [String],
    testcases: [sqlTestcaseRefSchema],
    visibleTestcaseCount: { type: Number, default: 0 },
    hiddenTestcaseCount: { type: Number, default: 0 },
    totalTestcaseCount: { type: Number, default: 0 },
    // S3 object keys written by the engine when the question was published.
    s3Keys: {
      question: { type: String },
      config: { type: String },
      schema: { type: String },
      solution: { type: String },
    },
    publishedAt: { type: Date },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

// Define options schema for MCQ
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
  },
});

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["mcq", "programming", "sql"],
    required: true,
  },
  difficultyLevel: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  marks: {
    type: Number,
    required: true,
    default: 10,
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
    required: true,
    description: "The parent module containing this question",
  },
  // Fields for MCQ type
  options: [optionSchema],

  // Fields for Programming type
  languages: [
    {
      name: {
        type: String,
        enum: ["c", "cpp", "java", "python", "javascript"],
      },
      version: {
        type: String,
      },
      boilerplateCode: {
        type: String,
      },
      solutionCode: {
        type: String,
      },
      // Language-specific scoring tiers based on execution time
      scoringTiers: {
        type: [scoringTierSchema],
        default: undefined, // Don't create default tiers - let frontend/admin configure them
        validate: {
          validator: function (tiers) {
            // Skip validation if no tiers or empty array
            if (!tiers || tiers.length === 0) return true;

            // Check each tier has valid values
            for (const tier of tiers) {
              if (!tier.maxTime || !tier.points === undefined) return false;
            }

            // Ensure tiers are sorted by maxTime (ascending) and points (descending)
            for (let i = 0; i < tiers.length - 1; i++) {
              if (tiers[i].maxTime >= tiers[i + 1].maxTime) {
                return false;
              }
              if (tiers[i].points <= tiers[i + 1].points) {
                return false;
              }
            }
            return true;
          },
          message:
            "Scoring tiers must be sorted by maxTime (ascending) and points (descending)",
        },
      },
      // Minimum points awarded for any accepted solution (beyond all tiers)
      minimumPoints: {
        type: Number,
        default: 1,
        min: 0,
      },
    },
  ],
  defaultLanguage: {
    type: String,
    enum: ["c", "cpp", "java", "python", "javascript", null],
    default: function () {
      return this.type === "programming" ? "python" : null;
    },
    validate: {
      validator: function (value) {
        // Only validate if the question is a programming type, otherwise allow null
        return (
          this.type !== "programming" ||
          ["c", "cpp", "java", "python", "javascript"].includes(value)
        );
      },
      message:
        "defaultLanguage must be a valid programming language for programming questions",
    },
  },
  testCases: [testCaseSchema],

  // Fields for SQL type. Present only when type === "sql".
  sqlMeta: {
    type: sqlMetaSchema,
    default: undefined,
  },

  constraints: {
    timeLimit: {
      type: Number,
      default: 2000, // in milliseconds (will be converted to seconds for Judge0)
    },
    memoryLimit: {
      type: Number,
      default: 256, // in MB
    },
  },
  hints: [String],
  tags: [String],
  companies: [String],
  editorial: {
    type: String,
    default: "",
  },

  // Fill in the Blank Feature
  fillInTheBlank: {
    type: Boolean,
    default: false,
    description:
      "Enable Fill in the Blank mode - restricts student editing to specific code sections marked with special comments in boilerplate code",
  },

  // Encrypted Editor - prevents copy/paste in the code editor
  encryptedEditor: {
    type: Boolean,
    default: false,
    description:
      "Enable encrypted editor mode - prevents copy/paste actions by encrypting clipboard content",
  },

  // Optional: Store encryption settings per question
  encryptionSettings: {
    allowPlainTextPaste: {
      type: Boolean,
      default: false,
      description:
        "Allow pasting plain text content when encryption is enabled",
    },
  },

  // Stats about the question
  stats: {
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    acceptedSubmissions: {
      type: Number,
      default: 0,
    },
    acceptanceRate: {
      type: Number,
      default: 0,
    },
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

// ✅ SQL VALIDATION: a SQL question is only usable if it points at a published
// SQLJudge question, since that is where its testcases and expected output live.
questionSchema.pre("validate", function (next) {
  if (this.type !== "sql") return next();

  if (!this.sqlMeta || !this.sqlMeta.judgeQuestionId) {
    return next(
      new Error(
        "SQL questions require sqlMeta.judgeQuestionId referencing a published SQLJudge question"
      )
    );
  }
  if (!this.sqlMeta.judgeVersion || this.sqlMeta.judgeVersion < 1) {
    return next(new Error("SQL questions require a positive sqlMeta.judgeVersion"));
  }
  if (!Array.isArray(this.sqlMeta.testcases) || this.sqlMeta.testcases.length === 0) {
    return next(new Error("SQL questions require at least one testcase reference"));
  }
  next();
});

// ✅ CRITICAL VALIDATION: Ensure scoring tier points don't exceed question marks
questionSchema.pre("validate", function (next) {
  // Only validate for programming type questions
  if (
    this.type === "programming" &&
    this.languages &&
    this.languages.length > 0
  ) {
    const questionMarks = this.marks;

    for (const language of this.languages) {
      // Check scoring tiers
      if (language.scoringTiers && language.scoringTiers.length > 0) {
        for (const tier of language.scoringTiers) {
          if (tier.points > questionMarks) {
            return next(
              new Error(
                `Scoring tier points (${tier.points}) for language "${language.name}" cannot exceed question marks (${questionMarks})`
              )
            );
          }
        }
      }

      // Check minimum points
      if (
        language.minimumPoints !== undefined &&
        language.minimumPoints > questionMarks
      ) {
        return next(
          new Error(
            `Minimum points (${language.minimumPoints}) for language "${language.name}" cannot exceed question marks (${questionMarks})`
          )
        );
      }
    }
  }

  next();
});

// Update timestamps on each save
questionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Calculate acceptance rate
  if (this.stats.totalSubmissions > 0) {
    this.stats.acceptanceRate =
      (this.stats.acceptedSubmissions / this.stats.totalSubmissions) * 100;
  }

  next();
});

// Helper method to calculate points based on execution time and language
// Returns { points, tierIndex } where tierIndex indicates which tier was achieved
questionSchema.methods.calculatePoints = function (
  languageName,
  executionTime
) {
  const language = this.languages.find((lang) => lang.name === languageName);

  if (!language) {
    throw new Error(`Language ${languageName} not found for this question`);
  }

  // Check if execution time exceeds time limit
  if (executionTime > this.constraints.timeLimit) {
    return { points: 0, tierIndex: -2 }; // -2 indicates Time Limit Exceeded
  }

  // Check if scoring tiers are configured and valid
  if (!language.scoringTiers || language.scoringTiers.length === 0) {
    // No scoring tiers configured - use full marks for correct answer
    console.log(
      `⚠️ No scoring tiers configured for ${languageName}, using full marks`
    );
    return { points: this.marks, tierIndex: -1 };
  }

  // Find the appropriate tier
  for (let i = 0; i < language.scoringTiers.length; i++) {
    const tier = language.scoringTiers[i];

    // Validate tier has required fields
    if (!tier.maxTime || tier.points === undefined) {
      console.warn(`⚠️ Invalid tier at index ${i}, skipping`);
      continue;
    }

    if (executionTime <= tier.maxTime) {
      return { points: tier.points, tierIndex: i };
    }
  }

  // If execution time exceeds all tiers, return minimum points
  return { points: language.minimumPoints || 0, tierIndex: -1 }; // -1 indicates minimum/fallback tier
};

module.exports = mongoose.model("Question", questionSchema);
