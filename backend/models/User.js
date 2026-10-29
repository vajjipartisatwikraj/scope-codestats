const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const log = require("../utils/logger").scope("USER");

const userSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ["user", "admin", "teacher"],
      default: "user",
    },
    newUser: {
      type: Boolean,
      default: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    // Which sign-in page the account was created from. "teacher" accounts skip the
    // student profile form and stay regular users (userType "user") until an admin
    // approves their teacher access request (see TeacherRequest). Set once, only by
    // the Google sign-in, never from a request body.
    signupIntent: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /(@mlrit\.ac\.in|@mlrinstitutions\.ac\.in)$/,
        "Please use your MLRIT college email address",
      ],
    },
    department: {
      type: String,
      required: true,
      enum: [
        "AERO",
        "CSC",
        "CSD",
        "CSE",
        "CSM",
        "CSIT",
        "IT",
        "ECE",
        "MECH",
        "EEE",
      ],
    },
    section: {
      type: String,
      enum: ["A", "B", "C", "D", "E", "F", "G"],
    },
    graduatingYear: {
      type: Number,
      min: 2024,
      max: 2030,
      validate: {
        validator: Number.isInteger,
        message: "Graduating year must be a 4-digit number",
      },
    },
    mobileNumber: {
      type: String,
      unique: false,
      required: false,
      validate: {
        validator: function (v) {
          // Skip validation if empty or undefined
          if (!v || v.length === 0) return true;

          // Only validate for exactly 10 digits
          return /^\d{10}$/.test(v);
        },
        message: "Please enter a valid 10-digit mobile number",
      },
    },
    password: {
      type: String,
      required: false,
    },
    // Ranking fields for competitive performance tracking
    rankingInfo: {
      overallRank: {
        type: Number,
        default: null,
        index: true, // Index for faster rank-based queries
      },
      departmentRank: {
        type: Number,
        default: null,
        index: true,
      },
      yearRank: {
        type: Number,
        default: null,
      },
      lastRankUpdate: {
        type: Date,
        default: null,
      },
      rankChange: {
        type: Number,
        default: 0, // Positive = improved rank (moved up), Negative = dropped rank
      },
      departmentRankChange: {
        type: Number,
        default: 0,
      },
      totalUsers: {
        type: Number,
        default: 0, // Total users in the ranking system
      },
      departmentUsers: {
        type: Number,
        default: 0, // Total users in the same department
      },
      percentile: {
        type: Number,
        default: 0, // Percentile ranking (0-100)
      },
    },
    // Education history, one entry per level, e.g.
    // [{ level: "Engineering", name: "MLRIT", startDate: "2022-08",
    //    endDate: "2026-05", scoreType: "CGPA", score: 8.7, stream: "CSE" }]
    education: {
      type: [
        {
          _id: false,
          // Not marked required so an incomplete legacy/partial row can never
          // block an unrelated user.save(); the routes normalize before saving
          level: {
            type: String,
            enum: ["School", "Intermediate", "Diploma", "Engineering"],
          },
          name: { type: String, default: "", trim: true },
          // Stored as "YYYY-MM" so the UI can use a month picker directly
          startDate: { type: String, default: "" },
          endDate: { type: String, default: "" },
          scoreType: {
            type: String,
            enum: ["CGPA", "Percentage"],
            default: "CGPA",
          },
          score: { type: Number, default: null },
          // Not applicable to School
          stream: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    // Skills grouped into named sets, e.g.
    // [{ name: "Languages", skills: ["Java", "Python"] }]
    skills: {
      type: [
        {
          _id: false,
          // Not required: legacy documents stored skills as a flat string array
          // and must not fail validation on an unrelated user.save()
          name: { type: String, default: "", trim: true },
          skills: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    about: {
      type: String,
      default: "",
    },
    linkedinUrl: {
      type: String,
      default: "",
    },
    resumeLink: {
      type: String,
      default: "",
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // The last 7 days of the student's total score, worked out from the score history after
    // every profile sync (services/weeklyActivity). Filled by that service only.
    weeklyActivity: {
      // Days (of the last 7) on which the total score changed
      activeDays: { type: Number, default: 0, min: 0, max: 7 },
      // 0-5 from activeDays: 6-7 days = 5, 5 = 4, 4 = 3, 3 = 2, 2 = 1, 0-1 = 0
      consistencyIndex: { type: Number, default: 0, min: 0, max: 5 },
      // Total score now minus total score 7 days ago (negative when it fell)
      scoreChange: { type: Number, default: 0 },
      calculatedAt: { type: Date, default: null },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    pushSubscriptions: [
      {
        endpoint: {
          type: String,
          required: true,
        },
        keys: {
          p256dh: {
            type: String,
            required: true,
          },
          auth: {
            type: String,
            required: true,
          },
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        deviceInfo: {
          type: String,
          default: "",
        },
      },
    ],
    // Session token for single active login enforcement
    // When user logs in, a unique session token is generated
    // Only the latest session token is valid - old sessions are invalidated
    sessionToken: {
      type: String,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginDevice: {
      type: String,
      default: "",
    },
    // Practice Arena daily test limit tracking (resets at 12:00 AM IST)
    practiceArenaDailyLimit: {
      lastResetDate: {
        type: Date,
        default: null,
      },
      testsStartedToday: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Legacy data support: skills used to be a flat array of strings
 * (["Java", "Python"]). Reshape it before mongoose casts the document,
 * otherwise each string is cast into an empty skill-set subdocument and the
 * original values are lost on the next save().
 */
userSchema.pre("init", function (doc) {
  if (!Array.isArray(doc?.skills)) return;

  const legacySkills = doc.skills.filter((item) => typeof item === "string");
  if (legacySkills.length === 0) return;

  const skillSets = doc.skills.filter(
    (item) => item && typeof item === "object",
  );

  doc.skills = [{ name: "Skills", skills: legacySkills }, ...skillSets];
});

// Update lastActive whenever the user document is modified
userSchema.pre("save", async function (next) {
  this.lastActive = new Date();
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// ===== CASCADE DELETION MIDDLEWARE =====
// This middleware ensures that when a user is deleted, all related documents
// in other collections are automatically deleted to maintain data consistency
// and prevent orphaned records.

/**
 * CASCADE DELETE MIDDLEWARE for deleteOne() method
 * Automatically deletes all related documents when a single user document is deleted
 * This middleware is triggered when calling user.deleteOne() on a document instance
 */
userSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    try {
      const userId = this._id;
      log.debug(`🗑️ Starting cascade deletion for user: ${userId}`);

      // Delete all related documents across different collections
      // Each deleteMany operation targets documents that reference this user
      const deletionResults = await Promise.all([
        // Profile data - platform profiles (leetcode, codechef, etc.)
        mongoose.model("Profile").deleteMany({ userId: userId }),

        // Notification data - user notifications
        mongoose.model("Notification").deleteMany({ userId: userId }),

        // Achievement data - user achievements, internships, projects, certifications
        mongoose.model("Achievement").deleteMany({ user: userId }),

        // Resume data - resumes built with the resume builder
        mongoose.model("Resume").deleteMany({ user: userId }),

        // Activity heatmap data - sparse per-day problem-solved counts
        mongoose.model("ActivityHeatmap").deleteMany({ userId: userId }),

        // Platform history - daily snapshots of coding platform stats
        mongoose.model("PlatformSnapshot").deleteMany({ userId: userId }),

        // Score and rank history
        mongoose.model("ScoreHistory").deleteMany({ userId: userId }),

        // Submission data - cohort programming submissions
        mongoose.model("Submission").deleteMany({ user: userId }),

        // Practice Arena submission data - practice test submissions
        mongoose.model("PASubmission").deleteMany({ user: userId }),

        // User cohort data - cohort enrollments and progress
        mongoose.model("UserCohort").deleteMany({ user: userId }),

        // Note data - user notes (Note: references 'user' not 'User')
        mongoose.model("note").deleteMany({ user: userId }),

        // Question report data - reports filed by user
        mongoose.model("QuestionReport").deleteMany({ user: userId }),

        // Practice Arena test data - tests created by user
        mongoose.model("PATest").deleteMany({ user: userId }),

        // Question data - questions created by user
        mongoose.model("Question").deleteMany({ createdBy: userId }),
      ]);

      // Log deletion summary
      const totalDeleted = deletionResults.reduce(
        (sum, result) => sum + result.deletedCount,
        0
      );
      log.debug(`✅ Cascade deletion completed for user: ${userId}`);
      log.debug(`📊 Total related documents deleted: ${totalDeleted}`);
    } catch (error) {
      log.error("❌ Error in cascade deletion:", error);
      throw error; // This will prevent the user deletion if cascade fails
    }
  }
);

/**
 * CASCADE DELETE MIDDLEWARE for findOneAndDelete() method
 * This is the most commonly used deletion method in routes
 * Triggered when calling User.findOneAndDelete() or User.findByIdAndDelete()
 */
userSchema.pre("findOneAndDelete", async function () {
  try {
    // Get the user document that will be deleted
    const user = await this.model.findOne(this.getQuery());
    if (!user) return;

    const userId = user._id;
    log.debug(
      `🗑️ Starting cascade deletion for user: ${userId} (${user.name})`
    );

    // Delete all related documents across different collections
    const deletionResults = await Promise.all([
      // Profile data - platform profiles (leetcode, codechef, etc.)
      mongoose.model("Profile").deleteMany({ userId: userId }),

      // Notification data - user notifications
      mongoose.model("Notification").deleteMany({ userId: userId }),

      // Achievement data - user achievements, internships, projects, certifications
      mongoose.model("Achievement").deleteMany({ user: userId }),

      // Resume data - resumes built with the resume builder
      mongoose.model("Resume").deleteMany({ user: userId }),

      // Activity heatmap data - sparse per-day problem-solved counts
      mongoose.model("ActivityHeatmap").deleteMany({ userId: userId }),

      // Platform history - daily snapshots of coding platform stats
      mongoose.model("PlatformSnapshot").deleteMany({ userId: userId }),

      // Score and rank history
      mongoose.model("ScoreHistory").deleteMany({ userId: userId }),

      // Submission data - cohort programming submissions
      mongoose.model("Submission").deleteMany({ user: userId }),

      // Practice Arena submission data - practice test submissions
      mongoose.model("PASubmission").deleteMany({ user: userId }),

      // User cohort data - cohort enrollments and progress
      mongoose.model("UserCohort").deleteMany({ user: userId }),

      // Note data - user notes (Note: references 'user' not 'User')
      mongoose.model("note").deleteMany({ user: userId }),

      // Question report data - reports filed by user
      mongoose.model("QuestionReport").deleteMany({ user: userId }),

      // Practice Arena test data - tests created by user
      mongoose.model("PATest").deleteMany({ user: userId }),

      // Question data - questions created by user
      mongoose.model("Question").deleteMany({ createdBy: userId }),
    ]);

    // Log deletion summary
    const totalDeleted = deletionResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );
    log.debug(
      `✅ Cascade deletion completed for user: ${userId} (${user.name})`
    );
    log.debug(`📊 Total related documents deleted: ${totalDeleted}`);
  } catch (error) {
    log.error("❌ Error in cascade deletion:", error);
    throw error;
  }
});

/**
 * CASCADE DELETE MIDDLEWARE for findByIdAndDelete() method
 * Specific handler for deletion by ID
 */
userSchema.pre("findByIdAndDelete", async function () {
  try {
    const userId = this.getQuery()._id;
    log.debug(`🗑️ Starting cascade deletion for user: ${userId}`);

    // Delete all related documents across different collections
    const deletionResults = await Promise.all([
      // Profile data - platform profiles (leetcode, codechef, etc.)
      mongoose.model("Profile").deleteMany({ userId: userId }),

      // Notification data - user notifications
      mongoose.model("Notification").deleteMany({ userId: userId }),

      // Achievement data - user achievements, internships, projects, certifications
      mongoose.model("Achievement").deleteMany({ user: userId }),

      // Resume data - resumes built with the resume builder
      mongoose.model("Resume").deleteMany({ user: userId }),

      // Activity heatmap data - sparse per-day problem-solved counts
      mongoose.model("ActivityHeatmap").deleteMany({ userId: userId }),

      // Platform history - daily snapshots of coding platform stats
      mongoose.model("PlatformSnapshot").deleteMany({ userId: userId }),

      // Score and rank history
      mongoose.model("ScoreHistory").deleteMany({ userId: userId }),

      // Submission data - cohort programming submissions
      mongoose.model("Submission").deleteMany({ user: userId }),

      // Practice Arena submission data - practice test submissions
      mongoose.model("PASubmission").deleteMany({ user: userId }),

      // User cohort data - cohort enrollments and progress
      mongoose.model("UserCohort").deleteMany({ user: userId }),

      // Note data - user notes (Note: references 'user' not 'User')
      mongoose.model("note").deleteMany({ user: userId }),

      // Question report data - reports filed by user
      mongoose.model("QuestionReport").deleteMany({ user: userId }),

      // Practice Arena test data - tests created by user
      mongoose.model("PATest").deleteMany({ user: userId }),

      // Question data - questions created by user
      mongoose.model("Question").deleteMany({ createdBy: userId }),
    ]);

    // Log deletion summary
    const totalDeleted = deletionResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );
    log.debug(`✅ Cascade deletion completed for user: ${userId}`);
    log.debug(`📊 Total related documents deleted: ${totalDeleted}`);
  } catch (error) {
    log.error("❌ Error in cascade deletion:", error);
    throw error;
  }
});

/**
 * CASCADE DELETE MIDDLEWARE for deleteMany() method
 * Handles bulk user deletion operations
 */
userSchema.pre("deleteMany", async function () {
  try {
    // Get all user IDs that will be deleted
    const users = await this.model.find(this.getQuery(), { _id: 1, name: 1 });
    const userIds = users.map((user) => user._id);

    if (userIds.length === 0) return;

    log.debug(
      `🗑️ Starting bulk cascade deletion for ${userIds.length} users`
    );

    // Delete all related documents for these users using $in operator
    const deletionResults = await Promise.all([
      // Profile data - platform profiles (leetcode, codechef, etc.)
      mongoose.model("Profile").deleteMany({ userId: { $in: userIds } }),

      // Notification data - user notifications
      mongoose.model("Notification").deleteMany({ userId: { $in: userIds } }),

      // Achievement data - user achievements, internships, projects, certifications
      mongoose.model("Achievement").deleteMany({ user: { $in: userIds } }),

      // Resume data - resumes built with the resume builder
      mongoose.model("Resume").deleteMany({ user: { $in: userIds } }),

      // Activity heatmap data - sparse per-day problem-solved counts
      mongoose.model("ActivityHeatmap").deleteMany({ userId: { $in: userIds } }),

      // Platform history - daily snapshots of coding platform stats
      mongoose.model("PlatformSnapshot").deleteMany({ userId: { $in: userIds } }),

      // Score and rank history
      mongoose.model("ScoreHistory").deleteMany({ userId: { $in: userIds } }),

      // Submission data - cohort programming submissions
      mongoose.model("Submission").deleteMany({ user: { $in: userIds } }),

      // Practice Arena submission data - practice test submissions
      mongoose.model("PASubmission").deleteMany({ user: { $in: userIds } }),

      // User cohort data - cohort enrollments and progress
      mongoose.model("UserCohort").deleteMany({ user: { $in: userIds } }),

      // Note data - user notes (Note: references 'user' not 'User')
      mongoose.model("note").deleteMany({ user: { $in: userIds } }),

      // Question report data - reports filed by user
      mongoose.model("QuestionReport").deleteMany({ user: { $in: userIds } }),

      // Practice Arena test data - tests created by user
      mongoose.model("PATest").deleteMany({ user: { $in: userIds } }),

      // Question data - questions created by user
      mongoose.model("Question").deleteMany({ createdBy: { $in: userIds } }),
    ]);

    // Log deletion summary
    const totalDeleted = deletionResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );
    log.debug(
      `✅ Bulk cascade deletion completed for ${userIds.length} users`
    );
    log.debug(`📊 Total related documents deleted: ${totalDeleted}`);
  } catch (error) {
    log.error("❌ Error in bulk cascade deletion:", error);
    throw error;
  }
});

/**
 * SAFE DELETE STATIC METHOD
 * Provides detailed information about what will be deleted before actual deletion
 * Usage: const result = await User.safeDelete(userId);
 */
userSchema.statics.safeDelete = async function (userId) {
  try {
    log.debug(`🔍 Starting safe deletion analysis for user: ${userId}`);

    // Get user info for logging
    const user = await this.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Count related documents before deletion to provide detailed feedback
    const [
      profileCount,
      notificationCount,
      achievementCount,
      submissionCount,
      paSubmissionCount,
      userCohortCount,
      noteCount,
      questionReportCount,
      paTestCount,
      questionCount,
    ] = await Promise.all([
      mongoose.model("Profile").countDocuments({ userId: userId }),
      mongoose.model("Notification").countDocuments({ userId: userId }),
      mongoose.model("Achievement").countDocuments({ user: userId }),
      mongoose.model("Submission").countDocuments({ user: userId }),
      mongoose.model("PASubmission").countDocuments({ user: userId }),
      mongoose.model("UserCohort").countDocuments({ user: userId }),
      mongoose.model("note").countDocuments({ user: userId }),
      mongoose.model("QuestionReport").countDocuments({ user: userId }),
      mongoose.model("PATest").countDocuments({ user: userId }),
      mongoose.model("Question").countDocuments({ createdBy: userId }),
    ]);

    log.debug(`📊 User ${user.name} (${user.email}) has:`);
    log.debug(`   📱 ${profileCount} platform profiles`);
    log.debug(`   🔔 ${notificationCount} notifications`);
    log.debug(`   🏆 ${achievementCount} achievements`);
    log.debug(`   📝 ${submissionCount} cohort submissions`);
    log.debug(`   🎯 ${paSubmissionCount} practice arena submissions`);
    log.debug(`   👥 ${userCohortCount} cohort memberships`);
    log.debug(`   📄 ${noteCount} notes`);
    log.debug(`   🚨 ${questionReportCount} question reports`);
    log.debug(`   🧪 ${paTestCount} practice tests created`);
    log.debug(`   ❓ ${questionCount} questions created`);

    // Delete the user (will trigger cascade deletion middleware)
    const deletedUser = await this.findByIdAndDelete(userId);

    log.debug(
      `✅ Successfully deleted user and all related data for: ${user.name}`
    );

    return {
      success: true,
      deletedUser,
      deletedCounts: {
        profiles: profileCount,
        notifications: notificationCount,
        achievements: achievementCount,
        submissions: submissionCount,
        paSubmissions: paSubmissionCount,
        userCohorts: userCohortCount,
        notes: noteCount,
        questionReports: questionReportCount,
        paTests: paTestCount,
        questions: questionCount,
        total:
          profileCount +
          notificationCount +
          achievementCount +
          submissionCount +
          paSubmissionCount +
          userCohortCount +
          noteCount +
          questionReportCount +
          paTestCount +
          questionCount,
      },
    };
  } catch (error) {
    log.error("❌ Error in safe user deletion:", error);
    throw error;
  }
};

module.exports = mongoose.model("User", userSchema);

// Registered here so the cascade deletion above can always find it.
require("./PlatformSnapshot");
require("./ScoreHistory");
