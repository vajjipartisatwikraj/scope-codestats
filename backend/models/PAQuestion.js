const mongoose = require("mongoose");

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

const paQuestionSchema = new mongoose.Schema({
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
    enum: ["mcq", "programming"],
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
  questionBank: {
    type: String,
    required: true,
    trim: true,
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
              if (!tier.maxTime || tier.points === undefined) return false;
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
  examples: [
    {
      input: String,
      output: String,
      explanation: String,
    },
  ],
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

  // Fill in the Blank Feature (encryptedEditor)
  encryptedEditor: {
    type: Boolean,
    default: false,
    description:
      "Enable Fill in the Blank mode - restricts student editing to specific code sections marked with special comments in boilerplate code",
  },

  // Encryption is ALWAYS enabled - no toggle needed
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

// Update timestamps on each save
paQuestionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Calculate acceptance rate
  if (this.stats.totalSubmissions > 0) {
    this.stats.acceptanceRate =
      (this.stats.acceptedSubmissions / this.stats.totalSubmissions) * 100;
  }

  next();
});

module.exports = mongoose.model("PAQuestion", paQuestionSchema);
