const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const Cohort = require("../models/Cohort");
const Module = require("../models/Module");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const UserCohort = require("../models/UserCohort");
const User = require("../models/User");
const mongoose = require("mongoose");
const { isAdminOrTeacher } = require("../utils/userHelpers");
const Note = require("../models/Note");
const QuestionReport = require("../models/QuestionReport");
const Notification = require("../models/Notification");
const ActivityHeatmap = require("../models/ActivityHeatmap");
const {
  submitCodeCombined,
} = require("../services/simpleCodeExecutionService");

// Import Cascade Service
const cascadeService = require("../services/cohortCascadeService");

// ============================================================================
// HELPER FUNCTION: Get Related Cohorts (Shared Content Model)
// ============================================================================
/**
 * Find all cohorts that share the same modules (related cohorts).
 * These cohorts form a "clone family" where modules and questions are shared.
 *
 * @param {ObjectId} cohortId - The cohort to find relations for
 * @returns {Promise<Array>} - Array of related cohort objects with _id and title
 */
async function getRelatedCohorts(cohortId) {
  return cascadeService.getRelatedCohorts(cohortId);
}

// Get all cohorts (admin view) - OPTIMIZED with minimal data
router.get("/admin", [auth, adminAuth], async (req, res) => {
  try {
    const cohorts = await Cohort.find()
      .select(
        "title description startDate endDate eligibleUsers createdBy createdAt isActive isDraft"
      )
      .populate("createdBy", "name email")
      .lean()
      .sort({ createdAt: -1 });

    // Transform cohorts to include user count instead of full user array
    const cohortsWithCount = cohorts.map((cohort) => {
      const userCount = cohort.eligibleUsers ? cohort.eligibleUsers.length : 0;
      // Remove the full eligibleUsers array, replace with count
      const { eligibleUsers, ...cohortWithoutUsers } = cohort;
      return {
        ...cohortWithoutUsers,
        eligibleUsersCount: userCount,
      };
    });

    res.json(cohortsWithCount);
  } catch (err) {
    console.error("Error fetching cohorts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all cohorts (user view - only eligible cohorts) - OPTIMIZED with minimal data
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cohorts where the user is eligible - ONLY return fields needed for list display
    const eligibleCohorts = await Cohort.find({
      eligibleUsers: userId,
      isActive: true,
      isDraft: false,
    })
      .select(
        "title description startDate endDate createdBy createdAt modules eligibleUsers averageRating feedbacks"
      ) // Include modules, eligibleUsers, and rating fields
      .populate("createdBy", "name email")
      .lean();

    // Get the user's cohort progress - only essential fields
    const userCohorts = await UserCohort.find({ user: userId })
      .select("cohort status totalScore rank")
      .lean();

    // Combine the data
    const cohortsWithProgress = eligibleCohorts.map((cohort) => {
      const userCohort = userCohorts.find(
        (uc) => uc.cohort.toString() === cohort._id.toString()
      );

      return {
        ...cohort,
        userProgress: userCohort
          ? {
              status: userCohort.status,
              totalScore: userCohort.totalScore,
              rank: userCohort.rank,
            }
          : null,
      };
    });

    res.json(cohortsWithProgress);
  } catch (err) {
    console.error("Error fetching cohorts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get a specific cohort (admin view) - OPTIMIZED to not populate questions OR users
router.get("/admin/:id", [auth, adminAuth], async (req, res) => {
  try {
    const cohortId = req.params.id;
    console.log(`Admin fetching cohort: ${cohortId}`);

    // Check if the cohort exists - ONLY populate modules WITHOUT questions
    // DO NOT populate eligibleUsers - they will be fetched when "Manage Users" is clicked
    const cohort = await Cohort.findById(cohortId)
      .select(
        "title description startDate endDate videoResource documentationUrl createdBy createdAt updatedAt isActive isDraft"
      )
      .populate("createdBy", "name email")
      .populate({
        path: "modules",
        select:
          "title description order videoResource documentationUrl resources cohort questions createdAt updatedAt",
      })
      .lean();

    if (!cohort) {
      console.log(`Cohort ${cohortId} not found in the database (admin view)`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    console.log(
      `Successfully fetched cohort ${cohortId} for admin with ${
        cohort.modules?.length || 0
      } modules (questions NOT populated, eligibleUsers NOT populated - will load on demand)`
    );
    res.json(cohort);
  } catch (err) {
    console.error("Error fetching cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get a specific cohort (user view)
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    console.log(`Fetching cohort: ${cohortId}, user: ${userId}`);

    // First check if the cohort exists at all
    const cohortExists = await Cohort.findById(cohortId);
    if (!cohortExists) {
      console.log(`Cohort ${cohortId} not found in the database`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // Check if user is admin or teacher - use consistent property access
    const isAdmin = isAdminOrTeacher(req.user);
    console.log(
      `User is admin/teacher: ${isAdmin}, userType: ${req.user.userType}`
    );

    // If admin, skip the eligibility checks
    if (!isAdmin) {
      const isEligible = cohortExists.eligibleUsers.some(
        (id) => id.toString() === userId.toString()
      );
      const isActive = cohortExists.isActive;
      const isDraft = cohortExists.isDraft;

      console.log(
        `User eligibility check - isEligible: ${isEligible}, isActive: ${isActive}, isDraft: ${isDraft}`
      );

      if (!isEligible) {
        return res.status(403).json({
          message: "You are not eligible for this cohort",
          reason: "not_eligible",
        });
      }

      if (!isActive) {
        return res
          .status(403)
          .json({ message: "This cohort is not active", reason: "not_active" });
      }

      if (isDraft) {
        return res.status(403).json({
          message: "This cohort is in draft mode",
          reason: "draft_mode",
        });
      }
    } else {
      console.log(
        `Admin user: bypassing eligibility checks for cohort ${cohortId}`
      );
    }

    // Get the cohort with properly populated fields - INCLUDING modules array and feedbacks
    const cohort = await Cohort.findById(cohortId)
      .select(
        "title description startDate endDate videoResource documentationUrl eligibleUsers modules createdBy createdAt updatedAt cloneGroupId feedbacks averageRating"
      )
      .populate("createdBy", "name email")
      .lean(); // Use lean() for better performance

    // Get the modules for this cohort - fetch by IDs from cohort.modules array
    // This supports the shared content model where modules are referenced, not owned
    const moduleIds = cohort.modules || [];
    const modules = await Module.find({ _id: { $in: moduleIds } })
      .sort({ order: 1 })
      .select(
        "title description order videoResource documentationUrl resources cohort questions"
      )
      .lean();

    // Get the user's progress
    const userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    })
      .select("status totalScore rank moduleProgress questionProgress")
      .lean();

    // Get cohort leaderboard excluding admin and teacher users
    const leaderboard = await UserCohort.find({ cohort: cohortId })
      .sort({ totalScore: -1 })
      .limit(10)
      .populate({
        path: "user",
        match: { userType: { $nin: ["admin", "teacher"] } }, // Exclude admin and teacher users
        select: "name rollNumber department userType",
      });

    // Filter out entries where user is null (admin users filtered out by populate match)
    const filteredLeaderboard = leaderboard.filter(
      (entry) => entry.user !== null
    );

    // EXPLICITLY fetch the top 3 enrolled users with profile pictures
    // Convert ID strings to ObjectIds if necessary
    const userIds = cohort.eligibleUsers.map((id) =>
      typeof id === "string" ? mongoose.Types.ObjectId(id) : id
    );

    // Get top 3 eligible users with their profile pictures
    const enrolledUsers = await User.find({
      _id: { $in: userIds },
    })
      .select("name profilePicture")
      .limit(3);

    console.log(
      "Enrolled users with profile pictures:",
      JSON.stringify(enrolledUsers)
    );

    // Combine the data
    const result = {
      ...cohort,
      modules,
      userProgress: userCohort
        ? {
            status: userCohort.status,
            totalScore: userCohort.totalScore,
            rank: userCohort.rank,
            moduleProgress: userCohort.moduleProgress,
            questionProgress: userCohort.questionProgress,
          }
        : null,
      leaderboard: filteredLeaderboard.map((entry) => ({
        user: entry.user,
        totalScore: entry.totalScore,
        rank: entry.rank,
      })),
      enrolledUsers: enrolledUsers,
    };

    console.log(
      `Successfully fetched cohort ${cohortId} with ${modules.length} modules`
    );
    console.log(
      `Included ${enrolledUsers.length} enrolled users with profile data`
    );

    res.json(result);
  } catch (err) {
    console.error("Error fetching cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get modules for a specific cohort
router.get("/:id/modules", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    console.log(`Fetching modules for cohort: ${cohortId}, user: ${userId}`);
    console.log(
      `User type: ${
        req.user.userType
      }, isAdmin/Teacher check: ${isAdminOrTeacher(req.user)}`
    );

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);
    console.log(`User is admin/teacher: ${isAdmin}`);

    // First check if the cohort exists at all
    const cohortExists = await Cohort.findById(cohortId);
    if (!cohortExists) {
      console.log(`Cohort ${cohortId} not found in the database`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // If user is admin, skip eligibility checks
    if (isAdmin) {
      console.log(`Admin user: bypassing eligibility checks`);
      // Use the cohort's modules array as the source of truth (supports cloned/shared modules)
      const modules = await Module.find({ _id: { $in: cohortExists.modules } })
        .sort({ order: 1 })
        .populate({
          path: "questions",
          select: "title type difficultyLevel marks stats",
        });

      console.log(
        `Found ${modules.length} modules for cohort ${cohortId} (admin access)`
      );
      return res.json({ modules });
    }

    // For regular users, check eligibility
    const isEligible = cohortExists.eligibleUsers.some(
      (id) => id.toString() === userId.toString()
    );
    const isActive = cohortExists.isActive;
    const isDraft = cohortExists.isDraft;

    console.log(
      `User eligibility check - isEligible: ${isEligible}, isActive: ${isActive}, isDraft: ${isDraft}`
    );

    if (!isEligible) {
      return res.status(403).json({
        message: "You are not eligible for this cohort",
        reason: "not_eligible",
      });
    }

    if (!isActive) {
      return res
        .status(403)
        .json({ message: "This cohort is not active", reason: "not_active" });
    }

    if (isDraft) {
      return res.status(403).json({
        message: "This cohort is in draft mode",
        reason: "draft_mode",
      });
    }

    // Get the modules for this cohort (use the cohort's modules array as source of truth)
    const modules = await Module.find({ _id: { $in: cohortExists.modules } })
      .sort({ order: 1 })
      .populate({
        path: "questions",
        select: "title type difficultyLevel marks stats",
      });

    console.log(`Found ${modules.length} modules for cohort ${cohortId}`);
    res.json({ modules });
  } catch (err) {
    console.error("Error fetching modules:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get a specific module from a cohort
router.get("/:id/modules/:moduleId", auth, async (req, res) => {
  try {
    const { id: cohortId, moduleId } = req.params;
    const userId = req.user.id;

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);

    // Verify the cohort exists and user has access
    let cohort;
    if (isAdmin) {
      cohort = await Cohort.findById(cohortId);
    } else {
      cohort = await Cohort.findOne({
        _id: cohortId,
        eligibleUsers: userId,
        isActive: true,
        isDraft: false,
      });
    }

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not eligible" });
    }

    // Find the specific module
    const module = await Module.findOne({
      _id: moduleId,
      cohort: cohortId,
    }).populate({
      path: "questions",
      select: isAdmin ? "" : "title type difficultyLevel marks stats",
    });

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    res.json(module);
  } catch (err) {
    console.error("Error fetching module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get questions for a specific module - OPTIMIZED to return only minimal data
router.get("/:cohortId/modules/:moduleId/questions", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, moduleId } = req.params;

    console.log(
      `Fetching questions for module ${moduleId} in cohort ${cohortId}`
    );

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);

    // First check if the cohort exists
    const cohortExists = await Cohort.findById(cohortId);
    if (!cohortExists) {
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // If not admin, check eligibility
    if (!isAdmin) {
      const isEligible = cohortExists.eligibleUsers.some(
        (id) => id.toString() === userId.toString()
      );

      if (!isEligible || !cohortExists.isActive || cohortExists.isDraft) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Get questions for this specific module - ONLY essential fields
    const questions = await Question.find({
      module: moduleId,
    })
      .select("title type difficultyLevel marks stats")
      .lean();

    console.log(`Found ${questions.length} questions for module ${moduleId}`);
    res.json(questions);
  } catch (err) {
    console.error("Error fetching module questions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ EXPORT: Export all questions of a module as JSON (admin only)
router.get(
  "/:cohortId/modules/:moduleId/questions/export",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { cohortId, moduleId } = req.params;

      // Verify cohort exists
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      // Verify module belongs to cohort
      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === moduleId
      );
      if (!moduleIsInCohort) {
        return res
          .status(400)
          .json({ message: "Module does not belong to this cohort" });
      }

      const module = await Module.findById(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Fetch all questions with full data, excluding internal/meta fields
      const questions = await Question.find({ module: moduleId })
        .select('-module -createdBy -createdAt -updatedAt -__v -stats')
        .lean();

      // Clean up each question for export
      const exportQuestions = questions.map((q) => {
        const cleaned = { ...q };

        // Remove MongoDB _id from root and nested objects
        delete cleaned._id;

        // Clean options (remove _id)
        if (cleaned.options && Array.isArray(cleaned.options)) {
          cleaned.options = cleaned.options.map(({ _id, ...opt }) => opt);
        }

        // Clean test cases (remove _id)
        if (cleaned.testCases && Array.isArray(cleaned.testCases)) {
          cleaned.testCases = cleaned.testCases.map(({ _id, ...tc }) => tc);
        }

        // Clean languages (remove _id, clean nested scoringTiers)
        if (cleaned.languages && Array.isArray(cleaned.languages)) {
          cleaned.languages = cleaned.languages.map(({ _id, scoringTiers, ...lang }) => {
            const cleanLang = { ...lang };
            if (scoringTiers && scoringTiers.length > 0) {
              cleanLang.scoringTiers = scoringTiers.map(({ _id: tid, ...tier }) => tier);
            }
            return cleanLang;
          });
        }

        // Remove empty arrays and default values to keep export clean
        if (cleaned.hints && cleaned.hints.length === 0) delete cleaned.hints;
        if (cleaned.tags && cleaned.tags.length === 0) delete cleaned.tags;
        if (cleaned.companies && cleaned.companies.length === 0) delete cleaned.companies;
        if (!cleaned.editorial) delete cleaned.editorial;
        if (cleaned.type !== 'programming') {
          delete cleaned.languages;
          delete cleaned.defaultLanguage;
          delete cleaned.testCases;
          delete cleaned.constraints;
          delete cleaned.fillInTheBlank;
          delete cleaned.encryptedEditor;
          delete cleaned.encryptionSettings;
        }
        if (cleaned.type !== 'mcq') {
          delete cleaned.options;
        }

        return cleaned;
      });

      res.json({
        moduleName: module.title,
        moduleId: module._id,
        totalQuestions: exportQuestions.length,
        exportedAt: new Date().toISOString(),
        questions: exportQuestions,
      });
    } catch (err) {
      console.error("Error exporting module questions:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get full details of a specific question (including notes) - ONLY when user clicks on it
router.get("/:cohortId/questions/:questionId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, questionId } = req.params;

    console.log(
      `Fetching full question details: ${questionId} for user ${userId}`
    );

    // Check if user is admin or teacher
    const isAdmin = isAdminOrTeacher(req.user);

    // Verify cohort access
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    if (!isAdmin) {
      const isEligible = cohort.eligibleUsers.some(
        (id) => id.toString() === userId.toString()
      );

      if (!isEligible || !cohort.isActive || cohort.isDraft) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    // Get question details - EXCLUDE editorial (will be loaded on-demand)
    // Also exclude solution code from languages to prevent cheating
    const question = await Question.findById(questionId)
      .select("-editorial") // Exclude editorial - loaded separately when user clicks Editorial tab
      .lean();

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Remove solution code from languages array (keep only boilerplate)
    if (question.languages && Array.isArray(question.languages)) {
      question.languages = question.languages.map((lang) => ({
        name: lang.name,
        version: lang.version,
        boilerplateCode: lang.boilerplateCode,
        scoringTiers: lang.scoringTiers,
        minimumPoints: lang.minimumPoints,
        // solutionCode is excluded
      }));
    }

    // Only show non-hidden test cases to regular users
    if (!isAdmin && question.testCases && Array.isArray(question.testCases)) {
      question.testCases = question.testCases
        .filter((tc) => !tc.hidden)
        .map((tc) => ({
          input: tc.input,
          output: tc.output,
          explanation: tc.explanation,
        }));
    }

    // Get user's notes - NO NEED TO LOAD IMMEDIATELY
    // Notes will be loaded when user clicks Notes tab
    // const notes = await Note.find({
    //   user: userId,
    //   question: questionId,
    //   cohort: cohortId
    // })
    //   .select('content createdAt updatedAt')
    //   .sort({ createdAt: -1 })
    //   .lean();

    // Get ONLY the most recent submission (not last 5)
    // Full submission history will be loaded when user clicks Submissions tab
    const submissions = await Submission.find({
      user: userId,
      question: questionId,
      cohort: cohortId,
    })
      .select("status score language submittedAt code submissionType selectedOption isCorrect") // Include MCQ fields
      .sort({ submittedAt: -1 })
      .limit(1) // Only get the most recent submission
      .lean();

    res.json({
      question,
      // notes,  // Removed - will be loaded on-demand
      submissions, // Only most recent submission
    });
  } catch (err) {
    console.error("Error fetching question details:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get question editorial (loaded on-demand when user clicks Editorial tab)
// SECURITY: Only show editorial if user has ACCEPTED (correct) submission
router.get(
  "/:cohortId/questions/:questionId/editorial",
  auth,
  async (req, res) => {
    try {
      const { questionId } = req.params;
      const userId = req.user.id;

      // Check if user has an ACCEPTED (correct) submission for this question
      const Submission = require("../models/Submission");
      const acceptedSubmission = await Submission.findOne({
        user: userId,
        question: questionId,
        status: "accepted", // CRITICAL: Must be accepted, not just any submission
      }).select("_id");

      if (!acceptedSubmission) {
        return res.status(403).json({
          message:
            "You must submit a correct solution before viewing the editorial.",
          error: "NO_ACCEPTED_SUBMISSION",
        });
      }

      const question = await Question.findById(questionId)
        .select("editorial")
        .lean();

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json({ editorial: question.editorial || "" });
    } catch (err) {
      console.error("Error fetching editorial:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get user's notes for a question (loaded on-demand when user clicks Notes tab)
router.get("/:cohortId/questions/:questionId/notes", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, questionId } = req.params;

    const notes = await Note.find({
      user: userId,
      question: questionId,
      cohort: cohortId,
    })
      .select("content createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json(notes);
  } catch (err) {
    console.error("Error fetching notes:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get user's submission history for a question (loaded on-demand when user clicks Submissions tab)
router.get(
  "/:cohortId/questions/:questionId/submissions",
  auth,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { cohortId, questionId } = req.params;

      const submissions = await Submission.find({
        user: userId,
        question: questionId,
        cohort: cohortId,
      })
        .select("status score language submittedAt code testCaseResults executionTime memoryUsed createdAt submissionType selectedOption isCorrect")
        .sort({ submittedAt: -1 })
        .limit(20) // Get last 20 submissions
        .lean();

      res.json(submissions);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Create a new cohort
router.post("/", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive,
      isDraft,
      eligibleUserIds,
    } = req.body;

    // Validate required fields
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description", "startDate", "endDate"],
      });
    }

    // Create the cohort
    const cohort = new Cohort({
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive: isActive !== undefined ? isActive : true,
      isDraft: isDraft !== undefined ? isDraft : true,
      eligibleUsers: eligibleUserIds || [],
      createdBy: req.user.id,
    });

    await cohort.save();

    res.status(201).json(cohort);
  } catch (err) {
    console.error("Error creating cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Duplicate a cohort - creates a new cohort referencing the same modules and questions
router.post("/:id/duplicate", [auth, adminAuth], async (req, res) => {
  try {
    const originalCohortId = req.params.id;
    console.log(`Starting cohort duplication for cohort ${originalCohortId}`);

    // Step 1: Fetch the original cohort
    console.log("Fetching original cohort...");
    const originalCohort = await Cohort.findById(originalCohortId);
    if (!originalCohort) {
      return res.status(404).json({ message: "Original cohort not found" });
    }

    // Step 2: Get module IDs directly from the cohort's modules array
    // (modules are now shared across related cohorts)
    console.log("Getting module references from cohort...");
    const moduleIds = originalCohort.modules || [];
    console.log(`Found ${moduleIds.length} modules to reference`);

    // Step 2b: Establish or join clone group
    // If original cohort has cloneGroupId, use it; otherwise create new one
    let cloneGroupId = originalCohort.cloneGroupId;

    if (!cloneGroupId) {
      // Generate new clone group ID using original cohort ID
      cloneGroupId = `clone_${originalCohortId}_${Date.now()}`;
      console.log(`Creating new clone group: ${cloneGroupId}`);

      // Update original cohort with cloneGroupId
      originalCohort.cloneGroupId = cloneGroupId;
      await originalCohort.save();
      console.log(`Updated original cohort with cloneGroupId`);
    } else {
      console.log(`Joining existing clone group: ${cloneGroupId}`);
    }

    // Step 3: Create the new cohort with references to the same modules
    console.log("Creating new cohort...");

    // Determine initial active state based on dates
    const now = new Date();
    const startDate = new Date(originalCohort.startDate);
    const endDate = new Date(originalCohort.endDate);
    const shouldBeActive = now >= startDate && now <= endDate;

    const duplicatedCohort = new Cohort({
      title: `Copy of ${originalCohort.title}`,
      description: originalCohort.description,
      startDate: originalCohort.startDate,
      endDate: originalCohort.endDate,
      videoResource: originalCohort.videoResource,
      documentationUrl: originalCohort.documentationUrl,
      isActive: shouldBeActive, // Set based on current date and cohort dates
      isDraft: false, // ✅ CHANGED: Set as published so users can see it immediately after adding eligibleUsers
      modules: moduleIds, // Reference the same module IDs
      eligibleUsers: [], // Don't copy eligible users
      cloneGroupId: cloneGroupId, // ✅ CRITICAL: Set clone group ID for cascade system
      createdBy: req.user.id,
    });

    await duplicatedCohort.save();
    console.log(`Created new cohort with ID: ${duplicatedCohort._id}`);
    console.log(`- Clone Group ID: ${cloneGroupId}`);
    console.log(`- Cohort references ${moduleIds.length} existing modules`);
    console.log(`- Module IDs in cloned cohort:`, duplicatedCohort.modules);
    console.log(`- Active state: ${shouldBeActive}`);
    console.log(`- Draft status: false`);

    // DEBUG: Verify the modules were actually saved by re-fetching
    const verifyClone = await Cohort.findById(duplicatedCohort._id).select(
      "modules"
    );
    console.log(
      `- VERIFY: Re-fetched cloned cohort has ${verifyClone.modules.length} modules:`,
      verifyClone.modules
    );

    // Step 4: Count questions for informational purposes
    const totalQuestions = await Question.countDocuments({
      module: { $in: moduleIds },
    });

    console.log(`Duplication completed successfully!`);
    console.log(
      `- Original cohort: ${originalCohort.title} (${originalCohortId})`
    );
    console.log(
      `- New cohort: ${duplicatedCohort.title} (${duplicatedCohort._id})`
    );
    console.log(`- Modules referenced: ${moduleIds.length}`);
    console.log(`- Questions accessible: ${totalQuestions}`);

    // Populate the response
    const populatedCohort = await Cohort.findById(duplicatedCohort._id)
      .populate("createdBy", "name email")
      .populate("modules", "title description order");

    res.status(201).json({
      message:
        "Cohort duplicated successfully - referencing existing modules and questions",
      cohort: populatedCohort,
      stats: {
        modulesReferenced: moduleIds.length,
        questionsAccessible: totalQuestions,
      },
    });
  } catch (err) {
    console.error("Error during cohort duplication:", err);
    res
      .status(500)
      .json({ message: "Failed to duplicate cohort", error: err.message });
  }
});

// Update a cohort
router.put("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      videoResource,
      documentationUrl,
      isActive,
      isDraft,
      eligibleUserIds,
    } = req.body;

    // Find the cohort
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Update the fields
    if (title) cohort.title = title;
    if (description) cohort.description = description;
    if (startDate) cohort.startDate = startDate;
    if (endDate) cohort.endDate = endDate;
    if (videoResource !== undefined) cohort.videoResource = videoResource;
    if (documentationUrl !== undefined)
      cohort.documentationUrl = documentationUrl;

    // Handle isDraft changes - when publishing a draft, automatically set correct active state
    if (isDraft !== undefined) {
      const wasOriginallyDraft = cohort.isDraft;
      cohort.isDraft = isDraft;

      // If we're publishing a draft (changing from draft=true to draft=false)
      if (wasOriginallyDraft && !isDraft) {
        console.log(
          "Publishing draft cohort, determining active state based on dates..."
        );

        // Automatically determine active state based on current date and cohort dates
        const now = new Date();
        const start = new Date(cohort.startDate);
        const end = new Date(cohort.endDate);

        // Set active if current date is between start and end dates
        const shouldBeActive = now >= start && now <= end;
        cohort.isActive = shouldBeActive;

        console.log(`Cohort "${cohort.title}" published:`, {
          currentDate: now.toISOString(),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          setAsActive: shouldBeActive,
        });
      }
    }

    // Allow manual override of isActive if explicitly provided
    if (isActive !== undefined) {
      cohort.isActive = isActive;
    }

    if (eligibleUserIds) cohort.eligibleUsers = eligibleUserIds;

    await cohort.save();

    res.json(cohort);
  } catch (err) {
    console.error("Error updating cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Check deletion impact for a cohort (before actual deletion)
router.get("/:id/deletion-impact", [auth, adminAuth], async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get module IDs for this cohort
    const moduleIds = cohort.modules || [];

    // Find all OTHER cohorts that share ANY of these modules
    const relatedCohorts = await Cohort.find({
      modules: { $in: moduleIds }, // Find cohorts that have any of these modules
      _id: { $ne: cohort._id }, // Exclude the cohort being deleted
    }).select("_id title modules");

    const isLastCohort = relatedCohorts.length === 0;

    // Get module and question counts
    const moduleCount = moduleIds.length;
    const questionCount = await Question.countDocuments({
      module: { $in: moduleIds },
    });

    // Get user progress count
    const userProgressCount = await UserCohort.countDocuments({
      cohort: cohort._id,
    });

    const impact = {
      isLastCohort,
      relatedCohorts: relatedCohorts.map((c) => ({
        id: c._id,
        title: c.title,
        sharedModules: c.modules.filter((m) => moduleIds.includes(m.toString()))
          .length,
      })),
      relatedCohortsCount: relatedCohorts.length,
      modulesCount: moduleCount,
      questionsCount: questionCount,
      userProgressCount,
      warning: isLastCohort
        ? `⚠️ This is the LAST cohort using these modules. Deleting it will permanently remove ${moduleCount} modules and ${questionCount} questions.`
        : `✅ ${relatedCohorts.length} other cohort(s) are using these modules. Modules and questions will be preserved.`,
    };

    console.log(`Deletion impact for cohort "${cohort.title}":`, impact);

    res.json(impact);
  } catch (err) {
    console.error("Error checking deletion impact:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a cohort
// ✅ UNIFIED CASCADE MODEL: Uses cascade service for proper relational deletion
// - If last cohort in group: Deletes ALL modules, questions, and user data globally
// - If not last: Deletes only cohort-specific user data, preserves shared content
router.delete("/:id", [auth, adminAuth], async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    console.log(`🗑️ Deleting cohort ${cohort._id} (${cohort.title})`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Use cascade service for proper deletion with relational logic
      const deletionStats = await cascadeService.deleteCohortWithCascade(
        cohort._id,
        session
      );

      await session.commitTransaction();

      const deletionSummary = {
        message: deletionStats.isLastCohort
          ? "Last cohort deleted - all shared content removed"
          : "Cohort deleted - shared content preserved for other cohorts",
        ...deletionStats,
      };

      console.log("✅ Cohort deletion completed:", deletionSummary);

      res.json(deletionSummary);
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("❌ Error deleting cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add eligible users to a cohort - top performers
// ✅ SHARED CONTENT MODEL: Prevents adding users who are already enrolled in related cohorts
router.post("/:id/add-top-users", [auth, adminAuth], async (req, res) => {
  try {
    const { count } = req.body;
    const cohortId = req.params.id;

    if (!count || isNaN(count) || count <= 0) {
      return res.status(400).json({ message: "Invalid count provided" });
    }

    const cohort = await Cohort.findById(cohortId);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get top users by total score
    const topUsers = await User.find({ userType: "user" })
      .sort({ totalScore: -1 })
      .limit(parseInt(count))
      .select("_id");

    const topUserIds = topUsers.map((user) => user._id);

    // ✅ Find all related cohorts using cascade service (works with cloneGroupId)
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);

    console.log(
      `📋 Checking top users against ${relatedCohorts.length} related cohorts`
    );

    // ✅ Check for enrollment conflicts
    const alreadyEnrolled = await UserCohort.find({
      user: { $in: topUserIds },
      cohort: { $in: [cohortId, ...relatedCohortIds] },
      status: { $in: ["enrolled", "completed"] },
    });

    const conflictUserIds = alreadyEnrolled.map((uc) => uc.user.toString());

    // Filter out users with conflicts
    const eligibleTopUsers = topUserIds.filter(
      (userId) => !conflictUserIds.includes(userId.toString())
    );

    // Add these users to eligible list if not already there
    const existingEligibleUserIds = cohort.eligibleUsers.map((id) =>
      id.toString()
    );
    const newEligibleUserIds = eligibleTopUsers.filter(
      (id) => !existingEligibleUserIds.includes(id.toString())
    );

    cohort.eligibleUsers = [...cohort.eligibleUsers, ...newEligibleUserIds];
    await cohort.save();

    const message =
      conflictUserIds.length > 0
        ? `Added ${newEligibleUserIds.length} top users (${conflictUserIds.length} skipped - already enrolled in related cohorts)`
        : `Added ${newEligibleUserIds.length} top users to cohort`;

    res.json({
      message,
      totalEligibleUsers: cohort.eligibleUsers.length,
      newUsersAdded: newEligibleUserIds.length,
      skippedDueToConflicts: conflictUserIds.length,
    });
  } catch (err) {
    console.error("Error adding top users to cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Apply to a cohort (user)
router.post("/:id/apply", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    // Check if the cohort exists and is active
    const cohort = await Cohort.findOne({
      _id: cohortId,
      isActive: true,
      isDraft: false,
    });

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not active" });
    }

    // Check if the user is eligible
    const isEligible = cohort.eligibleUsers.some(
      (id) => id.toString() === userId
    );

    console.log(`[APPLY DEBUG] Checking eligibility for user: ${userId}`);
    console.log(
      `[APPLY DEBUG] eligibleUsers array:`,
      cohort.eligibleUsers.map((id) => id.toString())
    );
    console.log(`[APPLY DEBUG] isEligible result:`, isEligible);

    if (!isEligible) {
      return res
        .status(403)
        .json({ message: "You are not eligible for this cohort" });
    }

    // Check if the user has already applied/enrolled
    let userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });

    if (userCohort) {
      return res.status(400).json({
        message: `You have already ${userCohort.status} for this cohort`,
      });
    }

    // Create a new user cohort record
    userCohort = new UserCohort({
      user: userId,
      cohort: cohortId,
      status: "applied",
      enrolledAt: new Date(),
    });

    await userCohort.save();

    res.status(201).json({
      message: "Successfully applied to cohort",
      userCohort,
    });
  } catch (err) {
    console.error("Error applying to cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Auto-enroll in a cohort for eligible users
router.post("/:id/enroll", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    // Check if the cohort exists and is active
    const cohort = await Cohort.findOne({
      _id: cohortId,
      isActive: true,
      isDraft: false,
    });

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found or not active" });
    }

    // Check if the user is eligible
    const isEligible = cohort.eligibleUsers.some(
      (id) => id.toString() === userId
    );

    if (!isEligible) {
      return res
        .status(403)
        .json({ message: "You are not eligible for this cohort" });
    }

    // ✅ Check if user is already enrolled in ANY related cohort (original or clones)
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);

    const existingEnrollment = await UserCohort.findOne({
      user: userId,
      cohort: { $in: relatedCohortIds },
      status: { $in: ["enrolled", "completed"] },
    }).populate("cohort", "title");

    if (existingEnrollment) {
      return res.status(409).json({
        message: "Already enrolled in a related cohort",
        enrolledInCohort: existingEnrollment.cohort.title,
        enrolledInCohortId: existingEnrollment.cohort._id,
        status: existingEnrollment.status,
        hint: "You can only be enrolled in one cohort from a set of related cohorts (original + clones). Please unenroll from the other cohort first.",
      });
    }

    // Check if the user has already enrolled
    let userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });

    if (userCohort) {
      // If the user has applied but not enrolled, update status to enrolled
      if (userCohort.status === "applied") {
        userCohort.status = "enrolled";
        userCohort.enrolledAt = new Date();
        await userCohort.save();

        return res.json({
          message: "Successfully enrolled in cohort",
          userCohort,
        });
      }

      // If already enrolled or completed, return current status
      return res.json({
        message: `You are already ${userCohort.status} in this cohort`,
        userCohort,
      });
    }

    // Create a new user cohort record with enrolled status
    userCohort = new UserCohort({
      user: userId,
      cohort: cohortId,
      status: "enrolled",
      enrolledAt: new Date(),
    });

    // ✅ SHARED CONTENT MODEL: Use cohort's modules array (works for cloned cohorts)
    const cohortDoc = await Cohort.findById(cohortId);
    const moduleIds = cohortDoc.modules;

    for (const moduleId of moduleIds) {
      // Get questions count for this module
      const questionsCount = await Question.countDocuments({
        module: moduleId,
      });

      userCohort.moduleProgress.push({
        module: moduleId,
        questionsCompleted: 0,
        totalQuestions: questionsCount,
        score: 0,
        completed: false,
      });
    }

    await userCohort.save();

    // Return success response
    res.status(201).json({
      message: "Successfully enrolled in cohort",
      userCohort,
    });
  } catch (err) {
    console.error("Error enrolling in cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Add eligible users to a cohort
// ✅ SHARED CONTENT MODEL: Prevents adding users who are already enrolled in related cohorts
router.post("/:id/eligible-users", [auth, adminAuth], async (req, res) => {
  try {
    const cohortId = req.params.id;
    const { userIds } = req.body;

    console.log(
      `Adding ${userIds?.length || 0} eligible users to cohort ${cohortId}`
    );

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        message: "No valid user IDs provided",
        example: { userIds: ["userId1", "userId2"] },
      });
    }

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);

    if (!cohort) {
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // ✅ Find all related cohorts using cascade service (works with cloneGroupId)
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);
    const otherRelatedCohortIds = relatedCohortIds.filter(
      (id) => id.toString() !== cohortId.toString()
    );

    console.log(
      `📋 Checking for conflicts with ${relatedCohortIds.length} related cohorts`
    );

    // ✅ Check if any users are already ELIGIBLE in other related cohorts
    const otherRelatedCohortsData = await Cohort.find({
      _id: { $in: otherRelatedCohortIds },
    }).select("title eligibleUsers");

    const eligibilityConflicts = [];
    otherRelatedCohortsData.forEach((relatedCohort) => {
      const eligibleUserIds = relatedCohort.eligibleUsers.map((id) =>
        id.toString()
      );
      userIds.forEach((userId) => {
        if (eligibleUserIds.includes(userId.toString())) {
          eligibilityConflicts.push({
            userId: userId,
            cohortId: relatedCohort._id,
            cohortTitle: relatedCohort.title,
          });
        }
      });
    });

    if (eligibilityConflicts.length > 0) {
      // Get user details for conflicts
      const conflictUserIds = [
        ...new Set(eligibilityConflicts.map((c) => c.userId)),
      ];
      const users = await User.find({ _id: { $in: conflictUserIds } }).select(
        "name email rollNumber"
      );

      const conflictsByCohort = {};
      eligibilityConflicts.forEach((conflict) => {
        const user = users.find(
          (u) => u._id.toString() === conflict.userId.toString()
        );
        if (!conflictsByCohort[conflict.cohortTitle]) {
          conflictsByCohort[conflict.cohortTitle] = {
            cohortId: conflict.cohortId,
            cohortTitle: conflict.cohortTitle,
            users: [],
          };
        }
        conflictsByCohort[conflict.cohortTitle].users.push({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          rollNumber: user.rollNumber,
        });
      });

      const conflictDetails = Object.values(conflictsByCohort);
      const totalConflicts = conflictUserIds.length;

      let conflictMessage = `Cannot add ${totalConflicts} user(s) - already eligible in related cohorts:\n`;
      conflictDetails.forEach((cohortConflict) => {
        conflictMessage += `\n• ${cohortConflict.cohortTitle}: ${cohortConflict.users.length} user(s)`;
      });

      console.log(
        `⚠️ Found ${totalConflicts} users already eligible in ${conflictDetails.length} related cohort(s)`
      );

      return res.status(409).json({
        message: "Some users are already eligible in related cohorts",
        totalConflicts: totalConflicts,
        conflictedUserIds: conflictUserIds,
        conflictsByCohort: conflictDetails,
        detailedMessage: conflictMessage,
        hint: "Users can only be eligible in one cohort from a set of related cohorts (original + clones). Please remove these users from the other cohort's eligible list first.",
      });
    }

    // ✅ Check if any users are already ENROLLED in other related cohorts
    const alreadyEnrolled = await UserCohort.find({
      user: { $in: userIds },
      cohort: { $in: otherRelatedCohortIds },
      status: { $in: ["enrolled", "completed"] },
    })
      .populate("user", "name email rollNumber")
      .populate("cohort", "title");

    if (alreadyEnrolled.length > 0) {
      // Group conflicts by cohort for better display
      const conflictsByCohort = {};
      alreadyEnrolled.forEach((uc) => {
        const cohortTitle = uc.cohort.title;
        if (!conflictsByCohort[cohortTitle]) {
          conflictsByCohort[cohortTitle] = {
            cohortId: uc.cohort._id,
            cohortTitle: cohortTitle,
            users: [],
          };
        }
        conflictsByCohort[cohortTitle].users.push({
          userId: uc.user._id,
          userName: uc.user.name,
          userEmail: uc.user.email,
          rollNumber: uc.user.rollNumber,
          status: uc.status,
        });
      });

      const conflictDetails = Object.values(conflictsByCohort);
      const totalConflicts = alreadyEnrolled.length;
      const conflictedUserIds = alreadyEnrolled.map((uc) =>
        uc.user._id.toString()
      );

      // Build detailed message
      let conflictMessage = `Cannot add ${totalConflicts} user(s) - already enrolled in related cohorts:\n`;
      conflictDetails.forEach((cohortConflict) => {
        conflictMessage += `\n• ${cohortConflict.cohortTitle}: ${cohortConflict.users.length} user(s)`;
      });

      console.log(
        `⚠️ Found ${totalConflicts} users already enrolled in ${conflictDetails.length} related cohort(s)`
      );

      return res.status(409).json({
        message: "Some users are already enrolled in related cohorts",
        totalConflicts: totalConflicts,
        conflictedUserIds: conflictedUserIds,
        conflictsByCohort: conflictDetails,
        detailedMessage: conflictMessage,
        hint: "Users can only be enrolled in one cohort from a set of related cohorts (original + clones). Please remove these users from the list or unenroll them from the other cohort first.",
      });
    }

    // Convert existing eligibleUsers to string format for easy comparison
    const existingUserIds = cohort.eligibleUsers.map((id) => id.toString());

    // Filter out IDs that already exist
    const newUserIds = userIds.filter(
      (id) => !existingUserIds.includes(id.toString())
    );

    // Add the new IDs to the cohort's eligibleUsers array
    cohort.eligibleUsers = [...cohort.eligibleUsers, ...newUserIds];

    await cohort.save();

    console.log(
      `✅ Added ${newUserIds.length} new users to cohort ${cohortId}`
    );

    res.json({
      message: `Added ${newUserIds.length} new users to cohort`,
      totalEligibleUsers: cohort.eligibleUsers.length,
      newUsersAdded: newUserIds.length,
      alreadyExistingUsers: userIds.length - newUserIds.length,
    });
  } catch (err) {
    console.error("Error adding eligible users to cohort:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// MODULES API Endpoints

// Create a new module in a cohort
// ✅ SHARED CONTENT MODEL: Create module and add to ALL related cohorts
router.post("/:cohortId/modules", [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      description,
      order,
      videoResource,
      documentationUrl,
      resources,
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        message: "Missing required fields",
        required: ["title", "description"],
      });
    }

    // Check if the cohort exists
    const cohort = await Cohort.findById(req.params.cohortId);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get all related cohorts (cohorts sharing the same modules)
    const relatedCohorts = await getRelatedCohorts(cohort._id);

    // PREVIEW MODE: Return information about affected cohorts for frontend confirmation
    if (req.query.preview === "true") {
      return res.json({
        action: "create_module",
        affectedCohorts: relatedCohorts,
        moduleData: {
          title,
          description,
          order: order || 0,
          videoResource,
          documentationUrl,
          resourcesCount: resources?.length || 0,
        },
      });
    }

    // Find the highest order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const highestOrderModule = await Module.findOne({
        cohort: cohort._id,
      }).sort({ order: -1 });

      moduleOrder = highestOrderModule ? highestOrderModule.order + 1 : 0;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the module
      const module = new Module({
        title,
        description,
        order: moduleOrder,
        videoResource,
        documentationUrl,
        resources: resources || [],
        cohort: cohort._id, // Track creator cohort
      });

      await module.save({ session });

      // Add the module to ALL related cohorts
      await Cohort.updateMany(
        { _id: { $in: relatedCohorts.map((c) => c._id) } },
        { $push: { modules: module._id } },
        { session }
      );

      await session.commitTransaction();

      console.log(
        `Module "${title}" created and added to ${relatedCohorts.length} cohort(s)`
      );

      res.status(201).json({
        message: `Module created and added to ${relatedCohorts.length} cohort(s)`,
        module,
        affectedCohorts: relatedCohorts,
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("Error creating module:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ✅ SHARED CONTENT MODEL: Update module (affects ALL related cohorts)
router.put(
  "/:cohortId/modules/:moduleId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const {
        title,
        description,
        order,
        videoResource,
        documentationUrl,
        resources,
      } = req.body;

      // Find the module (don't check cohort ownership since module is shared)
      const module = await Module.findById(req.params.moduleId);

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(req.params.cohortId);

      // PREVIEW MODE: Return information about affected cohorts
      if (req.query.preview === "true") {
        return res.json({
          action: "edit_module",
          affectedCohorts: relatedCohorts,
          currentData: {
            title: module.title,
            description: module.description,
            order: module.order,
            videoResource: module.videoResource,
            documentationUrl: module.documentationUrl,
            resourcesCount: module.resources?.length || 0,
          },
          newData: req.body,
        });
      }

      // Update the fields (affects all cohorts since they share the reference)
      if (title) module.title = title;
      if (description) module.description = description;
      if (order !== undefined) module.order = order;
      if (videoResource !== undefined) module.videoResource = videoResource;
      if (documentationUrl !== undefined)
        module.documentationUrl = documentationUrl;
      if (resources) module.resources = resources;

      await module.save();

      console.log(
        `Module "${module.title}" updated across ${relatedCohorts.length} cohort(s)`
      );

      res.json({
        message: `Module updated across ${relatedCohorts.length} cohort(s)`,
        module,
        affectedCohorts: relatedCohorts,
      });
    } catch (err) {
      console.error("Error updating module:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// ✅ UNIFIED CASCADE MODEL: Delete module from ALL related cohorts with full cascade
router.delete(
  "/:cohortId/modules/:moduleId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      // Find the module
      const module = await Module.findById(req.params.moduleId).populate(
        "questions"
      );

      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(req.params.cohortId);

      // PREVIEW MODE: Return information about affected cohorts
      if (req.query.preview === "true") {
        return res.json({
          action: "delete_module",
          affectedCohorts: relatedCohorts,
          module: {
            _id: module._id,
            title: module.title,
            questionCount: module.questions?.length || 0,
          },
        });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Use cascade service for comprehensive deletion
        const deletionStats =
          await cascadeService.deleteModuleFromRelatedCohorts(
            req.params.cohortId,
            module._id,
            session
          );

        // Update user progress - remove module from ALL cohorts' user progress
        await UserCohort.updateMany(
          { cohort: { $in: relatedCohorts.map((c) => c._id) } },
          {
            $pull: {
              moduleProgress: { module: module._id },
              questionProgress: {
                question: { $in: module.questions.map((q) => q._id) },
              },
            },
          },
          { session }
        );

        await session.commitTransaction();

        console.log(
          `✅ Module "${module.title}" deleted from ${deletionStats.affectedCohorts} cohort(s) with full cascade`
        );

        res.json({
          message: `Module deleted from ${deletionStats.affectedCohorts} cohort(s)`,
          ...deletionStats,
          affectedCohorts: relatedCohorts,
        });
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error("❌ Error deleting module:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// QUESTIONS API Endpoints

// ✅ SHARED CONTENT MODEL: Create question (available in ALL related cohorts)
router.post(
  "/:cohortId/modules/:moduleId/questions",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        difficultyLevel,
        marks,
        options,
        languages, // Now includes scoringTiers and minimumPoints per language
        defaultLanguage,
        testCases,
        inputFormat,
        outputFormat,
        examples,
        constraints,
        hints,
        tags,
        companies,
        editorial,
        encryptedEditor,
        encryptionSettings,
        fillInTheBlank, // Fill in the Blank feature toggle
      } = req.body;

      console.log(
        "📝 CREATE Question - Received fillInTheBlank:",
        fillInTheBlank
      );
      console.log(
        "📝 CREATE Question - Request body keys:",
        Object.keys(req.body)
      );

      // Validate required fields
      if (!title || !description || !type) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["title", "description", "type"],
        });
      }

      // Check if module is referenced by the cohort (supports cloned cohorts)
      const cohort = await Cohort.findById(req.params.cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      // Check if this cohort references the module (works for both original and cloned cohorts)
      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === req.params.moduleId
      );

      if (!moduleIsInCohort) {
        return res.status(404).json({
          message: "Module not found in this cohort",
          reason: "module_not_in_cohort",
        });
      }

      // Get the module
      const module = await Module.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(req.params.cohortId);

      // PREVIEW MODE: Return information about affected cohorts
      if (req.query.preview === "true") {
        return res.json({
          action: "create_question",
          affectedCohorts: relatedCohorts,
          module: {
            _id: module._id,
            title: module.title,
          },
          questionData: {
            title,
            type,
            difficultyLevel: difficultyLevel || "medium",
            marks: marks || 10,
          },
        });
      }

      // Build the question object based on type
      const questionData = {
        title,
        description,
        type,
        difficultyLevel: difficultyLevel || "medium",
        marks: marks || 10,
        module: module._id,
        hints: hints || [],
        tags: tags || [],
        companies: companies || [],
        editorial: editorial || "",
        createdBy: req.user.id,
      };

      // Add type-specific fields
      if (type === "mcq") {
        questionData.options = options || [];
      } else if (type === "programming") {
        // Support for languages with scoring tiers
        questionData.languages = languages || [];
        questionData.defaultLanguage = defaultLanguage || "python";
        questionData.testCases = testCases || [];
        questionData.inputFormat = inputFormat || "";
        questionData.outputFormat = outputFormat || "";
        questionData.examples = examples || [];
        questionData.constraints = constraints || {
          timeLimit: 1000,
          memoryLimit: 256,
        };

        // Add encryption settings for programming questions
        if (encryptedEditor !== undefined) {
          questionData.encryptedEditor = encryptedEditor;
        }
        if (encryptionSettings) {
          questionData.encryptionSettings = encryptionSettings;
        }

        // Add Fill in the Blank setting for programming questions
        if (fillInTheBlank !== undefined) {
          questionData.fillInTheBlank = fillInTheBlank;
          console.log(
            "📝 CREATE Question - Setting fillInTheBlank to:",
            fillInTheBlank
          );
        }

        // Note: scoringTiers and minimumPoints are now included in the languages array
        // Each language object can have:
        // - scoringTiers: [{ maxTime: Number, points: Number }] (defaults applied by model)
        // - minimumPoints: Number (defaults to 1)
      }

      // Create the question
      const question = new Question(questionData);

      await question.save();

      // Add the question to the module
      module.questions.push(question._id);
      await module.save();

      // Update user cohorts with new question entry for ALL related cohorts
      const relatedCohortIds = relatedCohorts.map((c) => c._id);
      const userCohorts = await UserCohort.find({
        cohort: { $in: relatedCohortIds },
      });

      for (const userCohort of userCohorts) {
        // Check if the module is already in progress
        const moduleProgressIndex = userCohort.moduleProgress.findIndex(
          (mp) => mp.module.toString() === module._id.toString()
        );

        if (moduleProgressIndex !== -1) {
          // Update module progress
          userCohort.moduleProgress[moduleProgressIndex].totalQuestions += 1;

          // Add new question progress
          userCohort.questionProgress.push({
            question: question._id,
            attempts: 0,
            solved: false,
            bestScore: 0,
          });

          await userCohort.save();
        }
      }

      console.log(
        `Question "${title}" created and added to ${relatedCohorts.length} cohort(s)`
      );

      res.status(201).json({
        message: `Question created and added to ${relatedCohorts.length} cohort(s)`,
        question,
        affectedCohorts: relatedCohorts,
      });
    } catch (err) {
      console.error("Error creating question:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// ✅ BULK UPLOAD: Create multiple questions at once from JSON
router.post(
  "/:cohortId/modules/:moduleId/questions/bulk",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { questions } = req.body;

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          message: "Request body must contain a non-empty 'questions' array",
        });
      }

      // Validate each question has required fields
      const validationErrors = [];
      questions.forEach((q, index) => {
        if (!q.title) validationErrors.push(`Question ${index + 1}: missing 'title'`);
        if (!q.description) validationErrors.push(`Question ${index + 1}: missing 'description'`);
        if (!q.type || !["mcq", "programming"].includes(q.type)) {
          validationErrors.push(`Question ${index + 1}: 'type' must be 'mcq' or 'programming'`);
        }
        if (q.type === "mcq" && (!q.options || q.options.length < 2)) {
          validationErrors.push(`Question ${index + 1}: MCQ must have at least 2 options`);
        }
        if (q.type === "mcq" && q.options && !q.options.some(opt => opt.isCorrect)) {
          validationErrors.push(`Question ${index + 1}: MCQ must have at least one correct option`);
        }
        if (q.type === "programming" && (!q.testCases || q.testCases.length === 0)) {
          validationErrors.push(`Question ${index + 1}: Programming question must have at least one test case`);
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "Validation errors found in questions",
          errors: validationErrors,
        });
      }

      // Check if module is referenced by the cohort
      const cohort = await Cohort.findById(req.params.cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === req.params.moduleId
      );
      if (!moduleIsInCohort) {
        return res.status(404).json({
          message: "Module not found in this cohort",
          reason: "module_not_in_cohort",
        });
      }

      const module = await Module.findById(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(req.params.cohortId);

      // PREVIEW MODE
      if (req.query.preview === "true") {
        return res.json({
          action: "bulk_create_questions",
          affectedCohorts: relatedCohorts,
          module: { _id: module._id, title: module.title },
          questionCount: questions.length,
        });
      }

      // Create all questions
      const createdQuestions = [];
      const errors = [];

      for (let i = 0; i < questions.length; i++) {
        try {
          const q = questions[i];

          const questionData = {
            title: q.title,
            description: q.description,
            type: q.type,
            difficultyLevel: q.difficultyLevel || "medium",
            marks: q.marks || 10,
            module: module._id,
            hints: q.hints || [],
            tags: q.tags || [],
            companies: q.companies || [],
            editorial: q.editorial || "",
            createdBy: req.user.id,
          };

          if (q.type === "mcq") {
            questionData.options = q.options || [];
          } else if (q.type === "programming") {
            questionData.languages = q.languages || [];
            questionData.defaultLanguage = q.defaultLanguage || "python";
            questionData.testCases = q.testCases || [];
            questionData.constraints = q.constraints || {
              timeLimit: 1000,
              memoryLimit: 256,
            };
            if (q.encryptedEditor !== undefined) {
              questionData.encryptedEditor = q.encryptedEditor;
            }
            if (q.encryptionSettings) {
              questionData.encryptionSettings = q.encryptionSettings;
            }
            if (q.fillInTheBlank !== undefined) {
              questionData.fillInTheBlank = q.fillInTheBlank;
            }
          }

          const question = new Question(questionData);
          await question.save();

          // Add question to module
          module.questions.push(question._id);

          createdQuestions.push(question);
        } catch (err) {
          errors.push({
            index: i,
            title: questions[i].title || `Question ${i + 1}`,
            error: err.message,
          });
        }
      }

      // Save module with all new question references
      await module.save();

      // Update user cohorts for ALL related cohorts
      const relatedCohortIds = relatedCohorts.map((c) => c._id);
      const userCohorts = await UserCohort.find({
        cohort: { $in: relatedCohortIds },
      });

      for (const userCohort of userCohorts) {
        const moduleProgressIndex = userCohort.moduleProgress.findIndex(
          (mp) => mp.module.toString() === module._id.toString()
        );

        if (moduleProgressIndex !== -1) {
          userCohort.moduleProgress[moduleProgressIndex].totalQuestions +=
            createdQuestions.length;

          for (const question of createdQuestions) {
            userCohort.questionProgress.push({
              question: question._id,
              attempts: 0,
              solved: false,
              bestScore: 0,
            });
          }

          await userCohort.save();
        }
      }

      console.log(
        `✅ Bulk upload: ${createdQuestions.length}/${questions.length} questions created for module "${module.title}" across ${relatedCohorts.length} cohort(s)`
      );

      res.status(201).json({
        message: `${createdQuestions.length} question(s) created successfully${
          errors.length > 0 ? `, ${errors.length} failed` : ""
        }`,
        created: createdQuestions.length,
        failed: errors.length,
        total: questions.length,
        errors: errors.length > 0 ? errors : undefined,
        questions: createdQuestions,
        affectedCohorts: relatedCohorts,
      });
    } catch (err) {
      console.error("Error in bulk question upload:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get a specific question
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  auth,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { cohortId, moduleId, questionId } = req.params;

      // Check if user is admin or teacher
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      // For regular users, check if they are eligible for this cohort
      // Admins and teachers can view any question without eligibility check
      let cohort;
      if (isAdminOrTeacher) {
        // Admin/Teacher: Just verify cohort exists
        cohort = await Cohort.findOne({
          _id: cohortId,
        });

        if (!cohort) {
          return res.status(404).json({ message: "Cohort not found" });
        }
      } else {
        // Regular user: Check eligibility
        cohort = await Cohort.findOne({
          _id: cohortId,
          eligibleUsers: userId,
          isActive: true,
          isDraft: false,
        });

        if (!cohort) {
          return res
            .status(404)
            .json({ message: "Cohort not found or not eligible" });
        }
      }

      // Get the question
      const question = await Question.findOne({
        _id: questionId,
        module: moduleId,
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // IMPORTANT: Filter out hidden test cases for students
      // Hidden test cases should NEVER be sent to the frontend for security and performance
      // They are only used on the backend during submission execution
      const questionData = question.toObject();

      // Only send visible test cases to frontend (hidden: false or undefined)
      if (questionData.testCases && Array.isArray(questionData.testCases)) {
        questionData.testCases = questionData.testCases.filter(
          (tc) => !tc.hidden
        );
        console.log(
          `📊 Filtered test cases: ${questionData.testCases.length} visible out of ${question.testCases.length} total`
        );
      }

      // Include scoring tiers in response - these are safe to send to frontend
      // Students should see the scoring tiers to understand performance benchmarks
      // Languages array already includes scoringTiers and minimumPoints fields

      // Log editorial field info
      console.log(
        `📝 Editorial field: ${
          questionData.editorial
            ? `Present (${questionData.editorial.length} chars)`
            : "Empty or undefined"
        }`
      );
      console.log(
        `🎯 Scoring tiers included for ${
          questionData.languages?.length || 0
        } languages`
      );

      // Get the user's progress for this question
      // For admins/teachers, they may not have a UserCohort entry, so handle gracefully
      let questionProgress = null;
      if (!isAdminOrTeacher) {
        const userCohort = await UserCohort.findOne({
          user: userId,
          cohort: cohortId,
        });

        questionProgress = userCohort?.questionProgress?.find(
          (qp) => qp.question.toString() === questionId
        );
      }

      // Get user's submissions for this question
      const submissions = await Submission.find({
        user: userId,
        question: questionId,
      })
        .select('language code status score executionTime memoryUsed submittedAt')
        .sort({ submittedAt: -1 })
        .lean();

      const result = {
        ...questionData,
        userProgress: questionProgress || null,
        submissions,
      };

      res.json(result);
    } catch (err) {
      console.error("Error fetching question:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get complete question data for editing (admin only)
// ✅ SHARED CONTENT MODEL: Returns question data regardless of which cohort it's accessed from
// Changes made will affect ALL cohorts that reference this question
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/edit",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;

      // Verify the cohort exists and has access to this module
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      // Check if this cohort references the module
      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === moduleId
      );

      if (!moduleIsInCohort) {
        return res.status(404).json({
          message: "Module not found in this cohort",
        });
      }

      // Get the module to find original cohort
      const module = await Module.findById(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Get the question
      const question = await Question.findOne({
        _id: questionId,
        module: moduleId,
      }).lean();

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Find the original cohort (the cohort that owns this module)
      const originalCohortId = module.originalCohort || module.cohort;

      // Return complete question data with original cohort information
      res.json({
        ...question,
        _meta: {
          originalCohortId: originalCohortId,
          accessedFromCohortId: cohortId,
          isClonedAccess: originalCohortId.toString() !== cohortId,
          editWarning:
            originalCohortId.toString() !== cohortId
              ? "Changes will affect all cohorts using this question"
              : null,
        },
      });
    } catch (err) {
      console.error("Error fetching question for editing:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Update an existing question
// ✅ SHARED CONTENT MODEL: Updates affect ALL cohorts using this question
router.put(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;

      // Verify cohort has access to this module
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === moduleId
      );

      if (!moduleIsInCohort) {
        return res.status(404).json({
          message: "Module not found in this cohort",
        });
      }

      // Check if the question exists
      const question = await Question.findOne({
        _id: questionId,
        module: moduleId,
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(cohortId);

      // PREVIEW MODE: Return information about affected cohorts
      if (req.query.preview === "true") {
        return res.json({
          action: "edit_question",
          affectedCohorts: relatedCohorts,
          currentData: {
            title: question.title,
            type: question.type,
            difficultyLevel: question.difficultyLevel,
            marks: question.marks,
          },
          newData: {
            title: req.body.title,
            difficultyLevel: req.body.difficultyLevel,
            marks: req.body.marks,
          },
        });
      }

      // Extract fields from request body
      const {
        title,
        description,
        type,
        difficultyLevel,
        marks,
        options,
        languages,
        defaultLanguage,
        testCases,
        inputFormat,
        outputFormat,
        examples,
        constraints,
        hints,
        tags,
        companies,
        editorial,
        encryptedEditor,
        encryptionSettings,
        fillInTheBlank,
      } = req.body;

      // Update the question (affects all cohorts using it)
      const updateData = {
        title: title || question.title,
        description: description || question.description,
        type: type || question.type,
        difficultyLevel: difficultyLevel || question.difficultyLevel,
        marks: marks || question.marks,
        options: type === "mcq" ? options : question.options,
        languages: type === "programming" ? languages : question.languages,
        defaultLanguage:
          type === "programming" ? defaultLanguage : question.defaultLanguage,
        testCases: type === "programming" ? testCases : question.testCases,
        inputFormat:
          type === "programming" ? inputFormat : question.inputFormat,
        outputFormat:
          type === "programming" ? outputFormat : question.outputFormat,
        examples: type === "programming" ? examples : question.examples,
        constraints:
          type === "programming" ? constraints : question.constraints,
        hints: hints || question.hints,
        tags: tags || question.tags,
        companies: companies || question.companies,
        editorial: editorial !== undefined ? editorial : question.editorial,
        updatedAt: Date.now(),
      };

      if (encryptedEditor !== undefined) {
        updateData.encryptedEditor = encryptedEditor;
      }
      if (encryptionSettings !== undefined) {
        updateData.encryptionSettings = encryptionSettings;
      }
      if (fillInTheBlank !== undefined) {
        updateData.fillInTheBlank = fillInTheBlank;
      }

      const updatedQuestion = await Question.findByIdAndUpdate(
        questionId,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      console.log(
        `Question "${updatedQuestion.title}" updated across ${relatedCohorts.length} cohort(s)`
      );

      res.json({
        message: `Question updated across ${relatedCohorts.length} cohort(s)`,
        question: updatedQuestion,
        affectedCohorts: relatedCohorts,
      });
    } catch (err) {
      console.error("Error updating question:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Delete a question
// ✅ UNIFIED CASCADE MODEL: Deletes question from all cohorts with full cascade
router.delete(
  "/:cohortId/modules/:moduleId/questions/:questionId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;

      // Verify cohort has access to this module
      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      const moduleIsInCohort = cohort.modules.some(
        (modId) => modId.toString() === moduleId
      );

      if (!moduleIsInCohort) {
        return res.status(404).json({
          message: "Module not found in this cohort",
        });
      }

      // Get the module
      const module = await Module.findById(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }

      // Check if the question exists
      const question = await Question.findOne({
        _id: questionId,
        module: moduleId,
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Get all related cohorts
      const relatedCohorts = await getRelatedCohorts(cohortId);

      // PREVIEW MODE: Return information about affected cohorts
      if (req.query.preview === "true") {
        return res.json({
          action: "delete_question",
          affectedCohorts: relatedCohorts,
          question: {
            _id: question._id,
            title: question.title,
            type: question.type,
            marks: question.marks,
          },
        });
      }

      // Delete affects ALL cohorts using this question
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Use cascade service for comprehensive deletion
        const deletionStats =
          await cascadeService.deleteQuestionFromRelatedCohorts(
            cohortId,
            questionId,
            session
          );

        // Update ALL user progress data to remove this question
        await UserCohort.updateMany(
          {},
          {
            $pull: {
              questionProgress: { question: questionId },
            },
          },
          { session }
        );

        // Update module progress counts for ALL cohorts
        await UserCohort.updateMany(
          {
            "moduleProgress.module": moduleId,
          },
          {
            $inc: { "moduleProgress.$.totalQuestions": -1 },
          },
          { session }
        );

        await session.commitTransaction();

        console.log(
          `✅ Question "${question.title}" deleted from ${deletionStats.affectedCohorts} cohort(s) with full cascade`
        );

        res.json({
          message: `Question deleted from ${deletionStats.affectedCohorts} cohort(s)`,
          ...deletionStats,
          affectedCohorts: relatedCohorts,
        });
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } catch (err) {
      console.error("❌ Error deleting question:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Submit answer to a question
// Auth required, NO rate limiter (validation already happened in frontend)
// This endpoint just saves the submission to database
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/submit",
  auth,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { cohortId, moduleId, questionId } = req.params;
      const {
        code,
        language,
        selectedOption,
        testCaseResults,
        status,
        isCorrect,
        executionTime,
        memoryUsed,
        submissionType,
      } = req.body;

      console.log(
        `Processing submission for question ${questionId}, user ${userId}, type: ${submissionType}`
      );

      // Check if user is admin or teacher
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      // PARALLEL BATCH 1: Fetch cohort, question, userCohort, and enforce submission limit simultaneously
      const [cohort, question, enrollmentCheck] = await Promise.all([
        Cohort.findById(cohortId),
        Question.findOne({ _id: questionId, module: moduleId }),
        isAdminOrTeacher
          ? Promise.resolve(null)
          : UserCohort.findOne({ user: userId, cohort: cohortId }),
        Submission.enforceSubmissionLimit(userId, questionId),
      ]);

      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      // Block access to unpublished cohorts for regular users
      if (!isAdminOrTeacher && cohort.isDraft) {
        return res.status(403).json({
          message: "This cohort is not published yet",
          error: "COHORT_UNPUBLISHED",
        });
      }

      // Check if the user is eligible for this cohort
      if (!isAdminOrTeacher) {
        if (!enrollmentCheck) {
          console.log(`User ${userId} is not enrolled in cohort ${cohortId}`);
          return res
            .status(403)
            .json({ message: "Not enrolled in this cohort" });
        }
      } else {
        console.log(
          `Admin/Teacher ${userId} submitting to cohort ${cohortId} for testing`
        );
      }

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Create a submission based on question type
      let submission;
      let submissionIsCorrect = false;
      let programmingSummary = null; // authoritative pass/total for programming

      if (submissionType === "mcq") {
        console.log("Processing MCQ submission");
        // Check the selected option
        if (!selectedOption) {
          return res.status(400).json({ message: "No option selected" });
        }

        // Find the selected option in the question
        const option = question.options.find(
          (opt) => opt._id.toString() === selectedOption
        );

        if (!option) {
          return res.status(400).json({ message: "Invalid option selected" });
        }

        const isOptionCorrect = option.isCorrect;
        submissionIsCorrect = isOptionCorrect;

        console.log(
          `📝 MCQ submission - User: ${userId}, Question: ${questionId}, Result: ${
            isOptionCorrect ? "Correct" : "Wrong"
          }`
        );

        // Create submission record
        submission = new Submission({
          user: userId,
          question: questionId,
          module: moduleId,
          cohort: cohortId,
          submissionType: "mcq",
          selectedOption,
          isCorrect: isOptionCorrect,
          // Set proper status based on correctness instead of defaulting to pending
          status: isOptionCorrect ? "accepted" : "wrong_answer",
          score: isOptionCorrect ? question.marks : 0,
        });
      } else if (submissionType === "programming") {
        // Handle programming submission
        if (!code || !language) {
          return res.status(400).json({
            message: "Missing required fields",
            required: ["code", "language"],
          });
        }

        if (!question.testCases || question.testCases.length === 0) {
          return res
            .status(400)
            .json({ message: "Question has no test cases" });
        }

        // ─────────────────────────────────────────────────────────────────
        // AUTHORITATIVE GRADING (SECURITY-CRITICAL)
        // Never trust client-sent `isCorrect` / `status` / `testCaseResults`.
        // Re-execute the submitted code against ALL test cases (including
        // hidden ones) on the server and decide correctness here. This is the
        // single source of truth for whether a problem is solved and scored.
        // ─────────────────────────────────────────────────────────────────
        const timeLimitMs = question.constraints?.timeLimit || 2000;
        const memoryLimitKB = question.constraints?.memoryLimit
          ? question.constraints.memoryLimit * 1024
          : 128000;

        const formattedTestCases = question.testCases.map((tc) => ({
          input: tc.input || "",
          output: tc.output || "",
          expectedOutput: tc.output || "",
          hidden: tc.hidden || false,
        }));

        const execResult = await submitCodeCombined(
          language,
          code,
          formattedTestCases,
          { time_limit: timeLimitMs / 1000, memory_limit: memoryLimitKB },
          "submit"
        );

        const totalCases = execResult?.summary?.total || 0;
        const passedCases = execResult?.summary?.passed || 0;
        // Correct ONLY if execution succeeded and EVERY test case passed.
        const serverIsCorrect =
          execResult?.success === true &&
          totalCases > 0 &&
          passedCases === totalCases;

        const serverExecutionTime = execResult?.execution?.time
          ? Math.round(parseFloat(execResult.execution.time) * 1000)
          : 0;
        const serverMemoryUsed = execResult?.execution?.memory || 0;

        // Derive a valid status enum value from the execution outcome.
        let serverStatus = "wrong_answer";
        if (!execResult?.success) {
          const errText = (execResult?.error || "").toLowerCase();
          if (errText.includes("compilation")) {
            serverStatus = "compilation_error";
          } else if (errText.includes("time limit")) {
            serverStatus = "time_limit_exceeded";
          } else if (errText.includes("memory")) {
            serverStatus = "memory_limit_exceeded";
          } else {
            serverStatus = "runtime_error";
          }
        } else {
          serverStatus = serverIsCorrect ? "accepted" : "wrong_answer";
        }

        // Store per-test-case results (server truth). Do not leak hidden
        // inputs/expected outputs into stored student-visible fields.
        const storedResults = Array.isArray(execResult?.results)
          ? execResult.results.map((r) => ({
              passed: r.status === "passed",
              executionTime: serverExecutionTime,
              memoryUsed: serverMemoryUsed,
              output: "",
              error: r.status === "passed" ? "" : "Test case failed",
            }))
          : [];

        console.log(
          `📝 Programming submission (server-graded) - User: ${userId}, Question: ${questionId}, Language: ${language}, ${passedCases}/${totalCases} passed → ${
            serverIsCorrect ? "Accepted" : serverStatus
          }`
        );

        // ✅ SCORING TIERS: only award points when the server confirms correct.
        let pointsEarned = 0;
        let tierAchieved = -1;

        if (serverIsCorrect) {
          if (serverExecutionTime > 0) {
            try {
              const scoringResult = question.calculatePoints(
                language,
                serverExecutionTime
              );
              pointsEarned = scoringResult.points;
              tierAchieved = scoringResult.tierIndex;

              console.log(
                `🏆 Scoring Tiers - Execution: ${serverExecutionTime}ms, Points: ${pointsEarned}, Tier: ${
                  tierAchieved >= 0 ? tierAchieved + 1 : "Minimum"
                }`
              );
            } catch (error) {
              console.warn(
                `⚠️ Error calculating tier-based points: ${error.message}, using default full marks`
              );
              pointsEarned = question.marks;
              tierAchieved = -1;
            }
          } else {
            pointsEarned = question.marks;
            tierAchieved = -1;
          }
        }

        // Expose authoritative summary in the response for the frontend.
        programmingSummary = {
          total: totalCases,
          passed: passedCases,
          failed: totalCases - passedCases,
        };

        // Create submission with SERVER-COMPUTED results (client values ignored)
        submission = new Submission({
          user: userId,
          question: questionId,
          module: moduleId,
          cohort: cohortId,
          submissionType: "programming",
          code,
          language,
          status: serverStatus,
          testCaseResults: storedResults,
          executionTime: serverExecutionTime,
          memoryUsed: serverMemoryUsed,
          isCorrect: serverIsCorrect,
          score: pointsEarned,
          pointsEarned: pointsEarned,
          tierAchieved: tierAchieved,
        });

        submissionIsCorrect = serverIsCorrect;
      } else {
        return res.status(400).json({ message: "Invalid submission type" });
      }

      // PARALLEL BATCH 2: Save submission + update question stats simultaneously
      await Promise.all([
        submission.save(),
        Question.updateOne(
          { _id: questionId },
          {
            $inc: {
              "stats.totalSubmissions": 1,
              "stats.acceptedSubmissions": submissionIsCorrect ? 1 : 0,
            },
          }
        ),
      ]);

      // Update user progress (skip for admins/teachers as they don't have UserCohort entries)
      if (!isAdminOrTeacher) {
        // Reuse enrollmentCheck from PARALLEL BATCH 1 instead of querying again
        const userCohort = enrollmentCheck;

        if (userCohort) {
          // Tracks whether THIS submission solved the problem for the first
          // time — used to increment the activity heatmap exactly once per
          // problem (re-solving an already-solved problem does not re-count).
          let newlySolvedProblem = false;

          const questionProgressIndex = userCohort.questionProgress.findIndex(
            (qp) => qp.question.toString() === questionId
          );

          if (questionProgressIndex !== -1) {
            const qp = userCohort.questionProgress[questionProgressIndex];
            qp.attempts += 1;

            // ✅ MAX SCORE OVERRIDE: Only update best score if new score is higher
            if (submissionIsCorrect) {
              const wasSolvedBefore = qp.solved === true;
              if (!wasSolvedBefore) newlySolvedProblem = true;
              qp.solved = true;

              // CRITICAL: Use max score logic - only update if new score is better
              if (submission.score > qp.bestScore) {
                console.log(
                  `📈 Score improved! Previous: ${qp.bestScore}, New: ${submission.score}`
                );
                qp.bestScore = submission.score;
                qp.solvedAt = new Date();
              } else {
                console.log(
                  `📊 Score not improved. Best: ${qp.bestScore}, Current: ${submission.score}`
                );
              }
            } else {
              // Wrong answer - don't update score
              console.log(
                `❌ Wrong answer - best score remains: ${qp.bestScore}`
              );
            }
          } else {
            // Add new question progress entry
            if (submissionIsCorrect) newlySolvedProblem = true;
            userCohort.questionProgress.push({
              question: questionId,
              attempts: 1,
              solved: submissionIsCorrect,
              bestScore: submissionIsCorrect ? submission.score : 0,
              solvedAt: submissionIsCorrect ? new Date() : null,
            });
          }

          // Update module progress
          const moduleProgressIndex = userCohort.moduleProgress.findIndex(
            (mp) => mp.module.toString() === moduleId
          );

          if (moduleProgressIndex !== -1) {
            const mp = userCohort.moduleProgress[moduleProgressIndex];

            // Calculate how many questions are solved in this module
            const moduleQuestions = await Question.find({ module: moduleId });
            const solvedQuestionIds = userCohort.questionProgress
              .filter((qp) => qp.solved)
              .map((qp) => qp.question.toString());

            const solvedModuleQuestions = moduleQuestions.filter((q) =>
              solvedQuestionIds.includes(q._id.toString())
            );

            // Update module progress
            mp.questionsCompleted = solvedModuleQuestions.length;
            mp.totalQuestions = moduleQuestions.length;

            // Calculate total score from all solved questions in this module
            mp.score = userCohort.questionProgress
              .filter(
                (qp) =>
                  moduleQuestions.some(
                    (q) => q._id.toString() === qp.question.toString()
                  ) && qp.solved
              )
              .reduce((sum, qp) => sum + qp.bestScore, 0);

            // Check if module is completed
            mp.completed =
              mp.questionsCompleted === mp.totalQuestions &&
              mp.totalQuestions > 0;
            if (mp.completed && !mp.completedAt) {
              mp.completedAt = new Date();
            }
          } else {
            // Add new module progress entry
            const moduleQuestions = await Question.find({ module: moduleId });
            const isModuleCompleted =
              moduleQuestions.length === 1 && submissionIsCorrect;

            userCohort.moduleProgress.push({
              module: moduleId,
              questionsCompleted: submissionIsCorrect ? 1 : 0,
              totalQuestions: moduleQuestions.length,
              score: submissionIsCorrect ? submission.score : 0,
              completed: isModuleCompleted,
              completedAt: isModuleCompleted ? new Date() : null,
            });
          }

          // Calculate total score across all modules
          userCohort.totalScore = userCohort.questionProgress
            .filter((qp) => qp.solved)
            .reduce((sum, qp) => sum + qp.bestScore, 0);

          // IMPORTANT: Save userCohort NOW so the DB has the updated totalScore
          // before we query allActiveUserCohorts below (otherwise the query reads stale data)
          await userCohort.save();

          // PARALLEL BATCH 3: Fetch user + all active cohorts simultaneously
          const [user, allActiveUserCohorts] = await Promise.all([
            User.findById(userId),
            UserCohort.find({
              user: userId,
              status: { $in: ["enrolled", "completed"] },
            })
              .select("totalScore questionProgress")
              .lean(),
          ]);

          if (user) {
            // Sum up total scores from ALL active cohorts
            const totalActiveCohortScore = allActiveUserCohorts.reduce(
              (sum, uc) => sum + (uc.totalScore || 0),
              0
            );

            // Sum up total problems solved from ALL active cohorts
            const totalActiveCohortProblems = allActiveUserCohorts.reduce(
              (sum, uc) => {
                if (uc.questionProgress && Array.isArray(uc.questionProgress)) {
                  const solvedCount = uc.questionProgress.filter(
                    (q) => q.solved === true
                  ).length;
                  return sum + solvedCount;
                }
                return sum;
              },
              0
            );

            // Update lifetime score if total active score exceeds it
            if (totalActiveCohortScore > (user.lifetimeScopeScore || 0)) {
              user.lifetimeScopeScore = totalActiveCohortScore;
              console.log(
                `✅ Updated lifetimeScopeScore for user ${userId}: ${user.lifetimeScopeScore} (from ${allActiveUserCohorts.length} active cohorts)`
              );
            }

            // Update lifetime problems solved if total active problems exceed it
            if (
              totalActiveCohortProblems >
              (user.lifetimeCohortProblemsSolved || 0)
            ) {
              user.lifetimeCohortProblemsSolved = totalActiveCohortProblems;
              console.log(
                `✅ Updated lifetimeCohortProblemsSolved for user ${userId}: ${user.lifetimeCohortProblemsSolved} (from ${allActiveUserCohorts.length} active cohorts)`
              );
            }

            // Immediately update platformScores.scopecodestats and totalScore
            // so the leaderboard reflects the new score without waiting for profile sync
            const totalCohortScore = Math.max(
              user.lifetimeScopeScore || 0,
              totalActiveCohortScore
            );
            const consistencyScore = (user.consistencyIndex || 0) * 10;
            const newScopeCodestatsScore = Math.round(totalCohortScore + consistencyScore);

            // Get current scopecodestats data or create new
            const currentScopeData = user.platformScores?.get?.("scopecodestats") || {};
            const updatedScopeData = {
              ...currentScopeData,
              totalCohortScore,
              score: newScopeCodestatsScore,
              totalCohortProblemsolved: Math.max(
                user.lifetimeCohortProblemsSolved || 0,
                totalActiveCohortProblems
              ),
              lastUpdated: new Date(),
            };

            // Update platformScores Map
            if (!user.platformScores) {
              user.platformScores = new Map();
            }
            user.platformScores.set("scopecodestats", updatedScopeData);

            // Recalculate totalScore = sum of all platform scores
            let newTotalScore = 0;
            if (user.platformScores instanceof Map) {
              for (const [, data] of user.platformScores) {
                const score = typeof data?.score === "number" && !isNaN(data.score) ? data.score : 0;
                newTotalScore += score;
              }
            } else {
              for (const [, data] of Object.entries(user.platformScores || {})) {
                const score = typeof data?.score === "number" && !isNaN(data.score) ? data.score : 0;
                newTotalScore += score;
              }
            }
            user.totalScore = newTotalScore;

            console.log(
              `✅ Updated scopecodestats score: ${newScopeCodestatsScore}, totalScore: ${newTotalScore} for user ${userId}`
            );

            await user.save();
          }

          // Check if the entire cohort is completed
          // Reuse cohort from PARALLEL BATCH 1 instead of querying DB again
          const cohortModules = cohort.modules || [];
          const completedModules = userCohort.moduleProgress.filter(
            (mp) => mp.completed
          );

          if (
            completedModules.length === cohortModules.length &&
            cohortModules.length > 0
          ) {
            userCohort.status = "completed";
            userCohort.completedAt = new Date();
          }

          await userCohort.save();

          // Fire-and-forget: Update cohort leaderboard rankings in background
          // User doesn't need to wait for all ranks to recalculate
          updateCohortLeaderboard(cohortId).catch((err) =>
            console.error("Background leaderboard update failed:", err)
          );

          // Fire-and-forget: record activity heatmap increment when a problem
          // is solved for the first time (Trigger 1 — in-app submissions).
          if (newlySolvedProblem) {
            ActivityHeatmap.incrementActivity(userId, "cohort", 1).catch((err) =>
              console.error("Heatmap increment (cohort) failed:", err.message)
            );
          }

          console.log(
            `✅ Submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
          );

          // Return the submission result with detailed progress information
          res.json({
            submission,
            isCorrect: submissionIsCorrect,
            summary: programmingSummary,
            userProgress: {
              questionProgress: userCohort.questionProgress.find(
                (qp) => qp.question.toString() === questionId
              ),
              moduleProgress: userCohort.moduleProgress.find(
                (mp) => mp.module.toString() === moduleId
              ),
              totalScore: userCohort.totalScore,
              rank: userCohort.rank,
            },
          });
        } else {
          console.log(
            `✅ Submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
          );
        }
      } else {
        // Admin/Teacher response - no progress tracking
        console.log(
          `✅ Admin/Teacher submission saved - User: ${userId}, Question: ${questionId}, Score: ${submission.score}`
        );
        res.json({
          submission,
          isCorrect: submissionIsCorrect,
          summary: programmingSummary,
          message: "Submission saved (admin/teacher - no progress tracking)",
        });
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get all users' submissions for a question
// SECURITY: Only show if user has submitted their own solution
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/all-submissions",
  auth,
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;
      const userId = req.user.id;

      console.log(
        `📊 Fetching all submissions for question ${questionId} in cohort ${cohortId}`
      );

      // Check if user is admin or teacher
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      // SECURITY: Regular users must have submitted before viewing others' submissions
      if (!isAdminOrTeacher) {
        // Check if user has an ACCEPTED (correct) submission for this question
        const userSubmission = await Submission.findOne({
          user: userId,
          question: questionId,
          cohort: cohortId,
          status: "accepted", // CRITICAL: Must be accepted, not just any submission
        }).select("_id");

        if (!userSubmission) {
          return res.status(403).json({
            message:
              "You must submit a correct solution before viewing others' submissions.",
            error: "NO_ACCEPTED_SUBMISSION",
          });
        }

        // Verify user is enrolled in this cohort
        const userCohort = await UserCohort.findOne({
          user: userId,
          cohort: cohortId,
        });

        if (!userCohort) {
          console.log(`❌ User ${userId} not enrolled in cohort ${cohortId}`);
          return res
            .status(403)
            .json({ message: "Not enrolled in this cohort" });
        }
      }

      // Get all submissions for this question in this cohort
      // Limit to last 100 submissions to prevent performance issues
      const submissions = await Submission.find({
        question: questionId,
        cohort: cohortId,
      })
        .select("status score language submittedAt user testCaseResults executionTime memoryUsed code submissionType selectedOption") // Include all necessary fields
        .populate("user", "name username avatar rollNumber email") // Include minimal user details
        .sort({ submittedAt: -1 })
        .limit(100) // Limit to prevent massive data transfer
        .lean(); // Return plain objects for better performance

      console.log(
        `✅ Found ${submissions.length} submissions for question ${questionId}`
      );
      res.json(submissions);
    } catch (err) {
      console.error("❌ Error fetching all submissions:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Test run code (for programming questions - doesn't count as submission)
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/test-run",
  auth,
  async (req, res) => {
    try {
      const { code, language, input } = req.body;
      const { cohortId, questionId } = req.params;
      const userId = req.user.id;

      if (!code || !language) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["code", "language"],
        });
      }

      // SECURITY: Check cohort access and published status
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      // Block access to unpublished cohorts for regular users
      if (!isAdminOrTeacher) {
        if (cohort.isDraft) {
          return res.status(403).json({
            message: "This cohort is not published yet",
            error: "COHORT_UNPUBLISHED",
          });
        }

        // Verify user is enrolled
        const isEligible = cohort.eligibleUsers.some(
          (id) => id.toString() === userId.toString()
        );

        if (!isEligible || !cohort.isActive) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Import the code execution service instead of platformAPI
      const codeExecutionService = require("../services/codeExecutionService");

      // Get question details to include expected output in response
      const question = await Question.findById(questionId);

      // Find the test case that matches this input if exists
      const testCase =
        question && question.testCases
          ? question.testCases.find((tc) => tc.input === input)
          : null;

      // Execute the code using the new service
      const result = await codeExecutionService.executeCode(
        language,
        code,
        input
      );

      // Ensure the response is null-safe
      const runResult = result.run || {};
      const compileResult = result.compile || {};
      const compileError = compileResult.stderr || "";

      // Calculate if output matches expected if we have test case
      let passed = false;
      let expectedOutput = "";

      if (testCase) {
        expectedOutput = testCase.output || "";
        // Compare trimmed outputs to handle whitespace differences
        passed =
          (runResult.stdout || "").trim() === expectedOutput.trim() &&
          !runResult.stderr &&
          !compileError &&
          runResult.code === 0;
      }

      // Format the result to match what the frontend expects
      const formattedResult = {
        output: runResult.stdout || "",
        actualOutput: runResult.stdout || "",
        expectedOutput: expectedOutput,
        error: runResult.stderr || compileError || "",
        executionTime: runResult.time
          ? parseFloat((runResult.time * 1000).toFixed(2))
          : 0, // convert to ms
        memoryUsed: runResult.memory || 0, // in KB
        status: runResult.code === 0 && !compileError ? "success" : "error",
        passed: passed,
        isCompileError: !!compileError,
        exitCode: runResult.code || 0,
        input: input,
        testCaseId: testCase ? testCase._id : null,
      };

      res.json(formattedResult);
    } catch (err) {
      console.error("Error test running code:", err);
      res.status(500).json({
        message: "Server error",
        error: err.message,
        // Add basic error fields for the frontend
        output: "",
        actualOutput: "",
        error: err.message || "Unknown error occurred",
        executionTime: 0,
        memoryUsed: 0,
        status: "error",
        passed: false,
        exitCode: 1,
      });
    }
  }
);

// Get leaderboard for a cohort
router.get("/:cohortId/leaderboard", auth, async (req, res) => {
  try {
    const cohortId = req.params.cohortId;

    // Get cohort leaderboard excluding admin users
    const leaderboard = await UserCohort.find({ cohort: cohortId })
      .sort({ totalScore: -1 })
      .populate({
        path: "user",
        match: { userType: { $nin: ["admin", "teacher"] } }, // Exclude admin and teacher users
        select:
          "name rollNumber email department section graduatingYear graduationYear userType profilePicture",
      });

    // Filter out entries where user is null (admin and teacher users filtered out by populate match)
    const filteredLeaderboard = leaderboard.filter(
      (entry) => entry.user !== null
    );

    // Format the response
    const formattedLeaderboard = filteredLeaderboard.map((entry, index) => ({
      rank: index + 1,
      user: {
        _id: entry.user._id,
        name: entry.user.name,
        rollNumber: entry.user.rollNumber,
        email: entry.user.email,
        department: entry.user.department,
        section: entry.user.section,
        graduatingYear: entry.user.graduatingYear || entry.user.graduationYear,
        profilePicture: entry.user.profilePicture,
      },
      totalScore: entry.totalScore,
      completedModules: entry.moduleProgress.filter((mp) => mp.completed)
        .length,
      status: entry.status,
    }));

    res.json(formattedLeaderboard);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Helper function to update cohort leaderboard rankings
async function updateCohortLeaderboard(cohortId) {
  try {
    // Get all user cohorts for this cohort, sorted by total score, excluding admin and teacher users
    const userCohorts = await UserCohort.find({ cohort: cohortId })
      .populate({
        path: "user",
        match: { userType: { $nin: ["admin", "teacher"] } }, // Exclude admin and teacher users
        select: "userType",
      })
      .sort({ totalScore: -1 });

    // Filter out entries where user is null (admin and teacher users filtered out by populate match)
    const filteredUserCohorts = userCohorts.filter(
      (entry) => entry.user !== null
    );

    // Update ranks using bulkWrite for O(1) DB round-trips instead of N sequential saves
    if (filteredUserCohorts.length > 0) {
      const bulkOps = filteredUserCohorts.map((uc, i) => ({
        updateOne: {
          filter: { _id: uc._id },
          update: { $set: { rank: i + 1 } },
        },
      }));
      await UserCohort.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error("Error updating cohort leaderboard:", err);
  }
}

// Get modules for a specific cohort (admin view)
router.get("/admin/:id/modules", [auth, adminAuth], async (req, res) => {
  try {
    const cohortId = req.params.id;
    console.log(`Admin fetching modules for cohort: ${cohortId}`);

    // Check if the cohort exists
    const cohort = await Cohort.findById(cohortId);

    if (!cohort) {
      console.log(`Cohort ${cohortId} not found in the database (admin view)`);
      return res
        .status(404)
        .json({ message: "Cohort not found", reason: "not_found" });
    }

    // Get the modules for this cohort - use cohort.modules array
    const moduleIds = cohort.modules || [];
    const modules = await Module.find({ _id: { $in: moduleIds } })
      .sort({ order: 1 })
      .populate({
        path: "questions",
      });

    console.log(
      `Found ${modules.length} modules for cohort ${cohortId} (admin view)`
    );
    res.json({ modules });
  } catch (err) {
    console.error("Error fetching modules (admin view):", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get notes for a specific question
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/notes",
  auth,
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;
      const userId = req.user.id;

      // SECURITY: Check cohort published status
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      if (!isAdminOrTeacher && cohort.isDraft) {
        return res.status(403).json({
          message: "This cohort is not published yet",
          error: "COHORT_UNPUBLISHED",
        });
      }

      // Check if the user has access to this cohort
      const userCohort = await UserCohort.findOne({
        user: userId,
        cohort: cohortId,
      });

      if (!userCohort && !isAdminOrTeacher) {
        return res.status(403).json({
          message: "Not enrolled in this cohort",
          reason: "not_enrolled",
        });
      }

      // Find the note or return empty notes
      const note = await Note.findOne({
        user: userId,
        cohort: cohortId,
        module: moduleId,
        question: questionId,
      });

      // Return notes or empty string if not found
      res.json({
        notes: note ? note.notes : "",
        lastUpdated: note ? note.updatedAt : null,
      });
    } catch (err) {
      console.error("Error fetching notes:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Save notes for a specific question
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/notes",
  auth,
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;
      const { notes } = req.body;
      const userId = req.user.id;

      // SECURITY: Check cohort published status
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      if (!isAdminOrTeacher && cohort.isDraft) {
        return res.status(403).json({
          message: "This cohort is not published yet",
          error: "COHORT_UNPUBLISHED",
        });
      }

      // Check if the user has access to this cohort
      const userCohort = await UserCohort.findOne({
        user: userId,
        cohort: cohortId,
      });

      if (!userCohort) {
        return res.status(403).json({
          message: "Not enrolled in this cohort",
          reason: "not_enrolled",
        });
      }

      // Find and update the note or create a new one
      let note = await Note.findOne({
        user: userId,
        cohort: cohortId,
        module: moduleId,
        question: questionId,
      });

      if (note) {
        // Update existing note
        note.notes = notes;
        note.updatedAt = Date.now();
      } else {
        // Create new note
        note = new Note({
          user: userId,
          cohort: cohortId,
          module: moduleId,
          question: questionId,
          notes,
        });
      }

      await note.save();

      res.json({
        message: "Notes saved successfully",
        lastUpdated: note.updatedAt,
      });
    } catch (err) {
      console.error("Error saving notes:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Question Report Routes

// Create a new question report
router.post(
  "/:cohortId/modules/:moduleId/questions/:questionId/report",
  auth,
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;
      const { reportType, description } = req.body;
      const userId = req.user.id;

      // SECURITY: Check cohort published status
      const isAdminOrTeacher =
        req.user.userType === "admin" || req.user.userType === "teacher";

      const cohort = await Cohort.findById(cohortId);
      if (!cohort) {
        return res.status(404).json({ message: "Cohort not found" });
      }

      if (!isAdminOrTeacher && cohort.isDraft) {
        return res.status(403).json({
          message: "This cohort is not published yet",
          error: "COHORT_UNPUBLISHED",
        });
      }

      // Validate required fields
      if (!reportType || !description) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["reportType", "description"],
        });
      }

      // Check if the question exists
      const question = await Question.findOne({
        _id: questionId,
        module: moduleId,
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Create the report
      const report = new QuestionReport({
        user: userId,
        question: questionId,
        module: moduleId,
        cohort: cohortId,
        reportType,
        description,
        status: "pending",
      });

      await report.save();

      res.status(201).json({
        message: "Report submitted successfully",
        report,
      });
    } catch (err) {
      console.error("Error creating question report:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get all reports for a question (for both users and admins)
router.get(
  "/:cohortId/modules/:moduleId/questions/:questionId/reports",
  auth,
  async (req, res) => {
    try {
      const { cohortId, moduleId, questionId } = req.params;
      const userId = req.user.id;
      const isAdmin = isAdminOrTeacher(req.user);

      // For regular users, only return their own reports
      // For admins, return all reports for the question
      const query = isAdmin
        ? { question: questionId, module: moduleId, cohort: cohortId }
        : {
            question: questionId,
            module: moduleId,
            cohort: cohortId,
            user: userId,
          };

      const reports = await QuestionReport.find(query)
        .populate("user", "name email")
        .sort({ createdAt: -1 });

      res.json(reports);
    } catch (err) {
      console.error("Error fetching question reports:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Get all reports for a cohort (admin only)
router.get("/:cohortId/reports", [auth, adminAuth], async (req, res) => {
  try {
    const { cohortId } = req.params;

    const reports = await QuestionReport.find({ cohort: cohortId })
      .populate("user", "name email")
      .populate("question", "title type")
      .populate("module", "title")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("Error fetching cohort reports:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Update a report (admin only)
router.put(
  "/:cohortId/reports/:reportId",
  [auth, adminAuth],
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, adminResponse } = req.body;

      // Find the report
      const report = await QuestionReport.findById(reportId);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Update the report fields
      if (status) report.status = status;
      if (adminResponse !== undefined) report.adminResponse = adminResponse;
      report.updatedAt = Date.now();

      await report.save();

      // Create a notification for the user who submitted the report
      if (adminResponse && report.user) {
        try {
          // Find the user to get their name
          const user = await User.findById(report.user);

          if (user) {
            // Create a notification for the user with a 3-day expiration
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

            const notification = new Notification({
              userId: report.user,
              title: "Your Report Has Been Addressed",
              message: `Hey ${user.name}! Your report has been addressed by our SCOPE team. Please check it out.`,
              read: false,
              deletionTime: threeDaysFromNow, // Auto delete after 3 days
            });

            await notification.save();
          }
        } catch (notifyError) {
          console.error(
            "Error creating notification for report update:",
            notifyError
          );
          // Continue execution even if notification fails
        }
      }

      res.json({
        message: "Report updated successfully",
        report,
      });
    } catch (err) {
      console.error("Error updating report:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

// Delete a report
router.delete("/:cohortId/reports/:reportId", auth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const isAdmin = isAdminOrTeacher(req.user);

    // Find the report
    const report = await QuestionReport.findById(reportId);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Check permissions - users can only delete their own reports, admins can delete any
    if (!isAdmin && report.user.toString() !== userId) {
      return res.status(403).json({
        message: "You can only delete your own reports",
      });
    }

    // Delete the report
    await QuestionReport.findByIdAndDelete(reportId);

    res.json({
      message: "Report deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting report:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Feedback Routes

// Add or update feedback for a cohort
// ✅ CLONE GROUP LEVEL: One review per user per clone group (no duplicates)
router.post("/:id/feedback", auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const cohortId = req.params.id;
    const userId = req.user.id;

    // Validate the rating
    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    // Validate comment length
    if (comment) {
      // Check character limit (approximately 6 characters per word)
      if (comment.length > 300) {
        return res.status(400).json({
          message:
            "Comment is too long. Please limit to 50 words (approximately 300 characters).",
          error: "COMMENT_TOO_LONG",
          maxLength: 300,
          currentLength: comment.length,
        });
      }

      // Check word count
      const wordCount = comment
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
      if (wordCount > 50) {
        return res.status(400).json({
          message: "Comment cannot exceed 50 words.",
          error: "TOO_MANY_WORDS",
          maxWords: 50,
          currentWords: wordCount,
        });
      }
    }

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Check if cohort is published (admin/teacher can bypass)
    const isAdminOrTeacher =
      req.user.userType === "admin" || req.user.userType === "teacher";
    if (!isAdminOrTeacher && cohort.isDraft) {
      return res.status(403).json({
        message: "This cohort is not published yet",
        error: "COHORT_UNPUBLISHED",
      });
    }

    // ✅ Check if user is enrolled in ANY related cohort
    const relatedCohorts = await cascadeService.getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);

    const userEnrolledInAnyCohort = await UserCohort.findOne({
      user: userId,
      cohort: { $in: relatedCohortIds },
    });

    if (!userEnrolledInAnyCohort) {
      return res.status(403).json({
        message:
          "You must be enrolled in this cohort or a related cohort to provide feedback",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ✅ Add or update feedback at clone group level
      const feedback = await cascadeService.addOrUpdateFeedback(
        cohortId,
        userId,
        rating,
        comment,
        session
      );

      await session.commitTransaction();

      // Get updated average rating
      const updatedCohort = await Cohort.findById(cohortId).select(
        "averageRating"
      );

      console.log(
        `✅ Feedback ${
          feedback.createdAt === feedback.updatedAt ? "created" : "updated"
        } for clone group`
      );

      res.json({
        message:
          feedback.createdAt === feedback.updatedAt
            ? "Feedback submitted successfully"
            : "Feedback updated successfully",
        feedback: {
          _id: feedback._id,
          user: feedback.user,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
          updatedAt: feedback.updatedAt,
        },
        averageRating: updatedCohort.averageRating,
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("❌ Error submitting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all feedback for a cohort (from clone group)
// ✅ CLONE GROUP LEVEL: Returns all reviews for the entire clone group
router.get("/:id/feedback", async (req, res) => {
  try {
    const cohortId = req.params.id;

    // Verify cohort exists
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get all feedback for this clone group
    const feedbacks = await cascadeService.getFeedbackForCloneGroup(cohortId);

    // Get average rating
    const averageRating = cohort.averageRating || 0;

    res.json({
      feedbacks,
      averageRating,
      totalReviews: feedbacks.length,
    });
  } catch (err) {
    console.error("❌ Error getting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get current user's feedback for a cohort
// ✅ CLONE GROUP LEVEL: Returns user's review for the clone group
router.get("/:id/feedback/user/me", auth, async (req, res) => {
  try {
    const cohortId = req.params.id;
    const userId = req.user.id;

    // Verify cohort exists
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get user's feedback for this clone group
    const feedback = await cascadeService.getUserFeedbackForCloneGroup(
      cohortId,
      userId
    );

    if (!feedback) {
      return res.json({
        hasFeedback: false,
        feedback: null,
      });
    }

    res.json({
      hasFeedback: true,
      feedback: {
        _id: feedback._id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ Error getting user feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete feedback from a cohort
// ✅ CLONE GROUP LEVEL: Deletes feedback from the entire clone group
router.delete("/:id/feedback/:feedbackId", auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id: cohortId, feedbackId } = req.params;
    const userId = req.user.id;

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get the feedback to check ownership
    const CohortFeedback = require("../models/CohortFeedback");
    const feedback = await CohortFeedback.findById(feedbackId);

    if (!feedback) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Feedback not found" });
    }

    // ✅ ADMIN OVERRIDE: Admin/teacher can delete any feedback, users can only delete their own
    const isAdmin = isAdminOrTeacher(req.user);
    const isOwner = feedback.user.toString() === userId;

    if (!isAdmin && !isOwner) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        message: "You can only delete your own feedback",
      });
    }

    try {
      // 🔄 Delete feedback from clone group
      await cascadeService.deleteFeedback(cohortId, feedbackId, session);

      await session.commitTransaction();

      console.log(`✅ Feedback deleted from clone group by user ${userId}`);

      res.json({
        success: true,
        message: "Feedback deleted successfully",
      });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error("❌ Error deleting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get all feedback for a cohort
router.get("/:id/feedback", auth, async (req, res) => {
  try {
    const cohortId = req.params.id;

    // Find the cohort and populate user information with rollNumber (identifier)
    const cohort = await Cohort.findById(cohortId).populate(
      "feedbacks.user",
      "name profilePicture rollNumber"
    );

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Return all feedbacks sorted by most recent
    const feedbacks = cohort.feedbacks.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    res.json({
      feedbacks,
      averageRating: cohort.averageRating,
      totalFeedbacks: cohort.feedbacks.length,
    });
  } catch (err) {
    console.error("Error getting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get user's feedback for a specific cohort
router.get("/:id/feedback/user", auth, async (req, res) => {
  try {
    const cohortId = req.params.id;
    const userId = req.user.id;

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Find user's feedback
    const userFeedback = cohort.feedbacks.find(
      (feedback) => feedback.user.toString() === userId
    );

    if (!userFeedback) {
      return res.json({
        hasFeedback: false,
        message: "You have not provided feedback for this cohort yet",
      });
    }

    res.json({
      hasFeedback: true,
      feedback: userFeedback,
    });
  } catch (err) {
    console.error("Error getting user feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get statistics for a cohort
router.get("/:id/stats", auth, async (req, res) => {
  try {
    const cohortId = req.params.id;

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get total eligible users for this cohort
    const totalEnrolled = cohort.eligibleUsers
      ? cohort.eligibleUsers.length
      : 0;

    // Get users who have enrolled in the cohort
    const enrolledUsers = await UserCohort.countDocuments({ cohort: cohortId });

    // Get users who have completed the cohort
    const completedUsers = await UserCohort.countDocuments({
      cohort: cohortId,
      status: "completed",
    });

    // Calculate completion rate
    const completionRate =
      enrolledUsers > 0
        ? Math.round((completedUsers / enrolledUsers) * 100)
        : 0;

    // Get active users (users who have at least started a module)
    const activeUsers = await UserCohort.countDocuments({
      cohort: cohortId,
      "moduleProgress.questionsCompleted": { $gt: 0 },
    });

    // Get all modules for this cohort - use cohort.modules array
    const cohortData = await Cohort.findById(cohortId).select("modules");
    const moduleIds = cohortData?.modules || [];
    const modules = await Module.find({ _id: { $in: moduleIds } }).select(
      "_id title"
    );

    // Calculate module completion rates
    const moduleCompletionRates = [];

    for (const module of modules) {
      // Count users who completed this module
      const usersCompletedModule = await UserCohort.countDocuments({
        cohort: cohortId,
        moduleProgress: {
          $elemMatch: {
            module: module._id,
            completed: true,
          },
        },
      });

      const completionPercentage =
        enrolledUsers > 0
          ? Math.round((usersCompletedModule / enrolledUsers) * 100)
          : 0;

      moduleCompletionRates.push({
        id: module._id,
        name: module.title,
        completion: completionPercentage,
      });
    }

    // Return the statistics
    const stats = {
      totalEnrolled,
      enrolledUsers,
      activeUsers,
      completionRate,
      moduleCompletionRates,
    };

    res.json(stats);
  } catch (err) {
    console.error("Error fetching cohort statistics:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get eligible users for a cohort
router.get("/:id/eligible-users", [auth, adminAuth], async (req, res) => {
  try {
    const cohortId = req.params.id;

    // Find the cohort
    const cohort = await Cohort.findById(cohortId).populate(
      "eligibleUsers",
      "name email department section graduatingYear rollNumber totalScore"
    );

    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Return the eligible users
    res.json({
      users: cohort.eligibleUsers || [],
      totalCount: cohort.eligibleUsers ? cohort.eligibleUsers.length : 0,
    });
  } catch (error) {
    console.error("Error fetching eligible users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update eligible users for a cohort (replace the entire list)
// ✅ UNIFIED CASCADE MODEL: Removes user data when users are removed from eligibility
router.put("/:id/eligible-users", [auth, adminAuth], async (req, res) => {
  try {
    const cohortId = req.params.id;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: "User IDs array is required" });
    }

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // ✅ Find all related cohorts (original + all clones that share the same modules)
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const relatedCohortIds = relatedCohorts.map((c) => c._id);
    const otherRelatedCohortIds = relatedCohortIds.filter(
      (id) => id.toString() !== cohortId.toString()
    );

    console.log(
      `📋 Cohort "${cohort.title}" has ${relatedCohortIds.length} related cohorts`
    );

    // ✅ Check if any users are already ELIGIBLE in other related cohorts
    const otherRelatedCohortsData = await Cohort.find({
      _id: { $in: otherRelatedCohortIds },
    }).select("title eligibleUsers");

    const eligibilityConflicts = [];
    otherRelatedCohortsData.forEach((relatedCohort) => {
      const eligibleUserIds = relatedCohort.eligibleUsers.map((id) =>
        id.toString()
      );
      userIds.forEach((userId) => {
        if (eligibleUserIds.includes(userId.toString())) {
          eligibilityConflicts.push({
            userId: userId,
            cohortId: relatedCohort._id,
            cohortTitle: relatedCohort.title,
          });
        }
      });
    });

    if (eligibilityConflicts.length > 0) {
      // Get user details for conflicts
      const conflictUserIds = [
        ...new Set(eligibilityConflicts.map((c) => c.userId)),
      ];
      const users = await User.find({ _id: { $in: conflictUserIds } }).select(
        "name email rollNumber"
      );

      const conflictsByCohort = {};
      eligibilityConflicts.forEach((conflict) => {
        const user = users.find(
          (u) => u._id.toString() === conflict.userId.toString()
        );
        if (!conflictsByCohort[conflict.cohortTitle]) {
          conflictsByCohort[conflict.cohortTitle] = {
            cohortId: conflict.cohortId,
            cohortTitle: conflict.cohortTitle,
            users: [],
          };
        }
        conflictsByCohort[conflict.cohortTitle].users.push({
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          rollNumber: user.rollNumber,
        });
      });

      const conflictDetails = Object.values(conflictsByCohort);
      const totalConflicts = conflictUserIds.length;

      let conflictMessage = `Cannot update eligible users - ${totalConflicts} user(s) already eligible in related cohorts:\n`;
      conflictDetails.forEach((cohortConflict) => {
        conflictMessage += `\n• ${cohortConflict.cohortTitle}: ${cohortConflict.users.length} user(s)`;
        cohortConflict.users.forEach((user) => {
          conflictMessage += `\n  - ${user.userName} (${user.userEmail})`;
        });
      });

      return res.status(409).json({
        message: "Some users are already eligible in related cohorts",
        totalConflicts: totalConflicts,
        conflictsByCohort: conflictDetails,
        detailedMessage: conflictMessage,
        hint: "Users can only be eligible in one cohort from a set of related cohorts (original + clones). Please remove these users from the other cohort's eligible list first.",
      });
    }

    // ✅ Check if any users are already enrolled in related cohorts
    const alreadyEnrolled = await UserCohort.find({
      user: { $in: userIds },
      cohort: { $in: otherRelatedCohortIds },
      status: { $in: ["enrolled", "completed"] },
    })
      .populate("user", "name email rollNumber")
      .populate("cohort", "title");

    if (alreadyEnrolled.length > 0) {
      // Group conflicts by cohort for better display
      const conflictsByCohort = {};
      alreadyEnrolled.forEach((uc) => {
        const cohortTitle = uc.cohort.title;
        if (!conflictsByCohort[cohortTitle]) {
          conflictsByCohort[cohortTitle] = {
            cohortId: uc.cohort._id,
            cohortTitle: cohortTitle,
            users: [],
          };
        }
        conflictsByCohort[cohortTitle].users.push({
          userId: uc.user._id,
          userName: uc.user.name,
          userEmail: uc.user.email,
          rollNumber: uc.user.rollNumber,
          status: uc.status,
        });
      });

      const conflictDetails = Object.values(conflictsByCohort);
      const totalConflicts = alreadyEnrolled.length;

      // Build detailed message
      let conflictMessage = `Cannot update eligible users - ${totalConflicts} user(s) already enrolled in related cohorts:\n`;
      conflictDetails.forEach((cohortConflict) => {
        conflictMessage += `\n• ${cohortConflict.cohortTitle}: ${cohortConflict.users.length} user(s)`;
        cohortConflict.users.forEach((user) => {
          conflictMessage += `\n  - ${user.userName} (${user.userEmail})`;
        });
      });

      return res.status(409).json({
        message: "Some users are already enrolled in related cohorts",
        totalConflicts: totalConflicts,
        conflictsByCohort: conflictDetails,
        detailedMessage: conflictMessage,
        hint: "Users can only be enrolled in one cohort from a set of related cohorts (original + clones). Please remove these users from the list or unenroll them from the other cohort first.",
      });
    }

    // 🗑️ CASCADE DELETE: Find users being removed and clean up their data
    const existingUserIds = cohort.eligibleUsers.map((id) => id.toString());
    const newUserIds = userIds.map((id) => id.toString());
    const removedUserIds = existingUserIds.filter(
      (id) => !newUserIds.includes(id)
    );

    console.log(`🗑️ Removing ${removedUserIds.length} users from eligibility`);

    // 📋 PREVIEW MODE: Show what will be deleted before actually deleting
    if (removedUserIds.length > 0 && req.query.preview === "true") {
      // Get module and question counts for preview
      const moduleIds = cohort.modules || [];
      const questionIds = await Question.find({ module: { $in: moduleIds } })
        .select("_id")
        .then((qs) => qs.map((q) => q._id));

      // Count data that will be deleted for each user
      const previewData = await Promise.all(
        removedUserIds.map(async (userId) => {
          const [submissions, notes, reports, userProgress] = await Promise.all(
            [
              Submission.countDocuments({
                user: userId,
                cohort: cohortId,
                question: { $in: questionIds },
              }),
              Note.countDocuments({
                user: userId,
                cohort: cohortId,
                question: { $in: questionIds },
              }),
              QuestionReport.countDocuments({
                user: userId,
                cohort: cohortId,
                question: { $in: questionIds },
              }),
              UserCohort.countDocuments({
                user: userId,
                cohort: cohortId,
              }),
            ]
          );

          // Get user details
          const user = await User.findById(userId).select(
            "name email rollNumber"
          );

          return {
            userId,
            userName: user?.name || "Unknown",
            userEmail: user?.email || "Unknown",
            rollNumber: user?.rollNumber || "N/A",
            dataToDelete: {
              submissions,
              notes,
              reports,
              userProgress,
            },
          };
        })
      );

      const totalSubmissions = previewData.reduce(
        (sum, u) => sum + u.dataToDelete.submissions,
        0
      );
      const totalNotes = previewData.reduce(
        (sum, u) => sum + u.dataToDelete.notes,
        0
      );
      const totalReports = previewData.reduce(
        (sum, u) => sum + u.dataToDelete.reports,
        0
      );
      const totalUserProgress = previewData.reduce(
        (sum, u) => sum + u.dataToDelete.userProgress,
        0
      );

      return res.json({
        action: "remove_users_from_eligibility",
        preview: true,
        usersToRemove: removedUserIds.length,
        userDetails: previewData,
        totalDataToDelete: {
          submissions: totalSubmissions,
          notes: totalNotes,
          reports: totalReports,
          userProgress: totalUserProgress,
        },
        message: `Removing ${removedUserIds.length} users will delete ${totalSubmissions} submissions, ${totalNotes} notes, ${totalReports} reports, and ${totalUserProgress} progress records.`,
        warning:
          "This action cannot be undone. All user data for this cohort will be permanently deleted.",
      });
    }

    let cleanupStats = null;
    if (removedUserIds.length > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Use cascade service to clean up removed users' data
        cleanupStats = await cascadeService.removeMultipleUsersDataFromCohort(
          cohortId,
          removedUserIds,
          session
        );

        // Update the eligible users list
        cohort.eligibleUsers = userIds;
        await cohort.save({ session });

        await session.commitTransaction();
        console.log(`✅ User data cleanup completed:`, cleanupStats);
      } catch (err) {
        await session.abortTransaction();
        throw err;
      } finally {
        session.endSession();
      }
    } else {
      // No users removed, just update the list
      cohort.eligibleUsers = userIds;
      await cohort.save();
    }

    console.log(
      `✅ Successfully updated eligible users for cohort "${cohort.title}"`
    );

    // Return the updated cohort with count
    res.json({
      message: "Eligible users updated successfully",
      totalEligibleUsers: cohort.eligibleUsers.length,
      usersRemoved: removedUserIds.length,
      cleanupStats: cleanupStats || {
        submissionsDeleted: 0,
        notesDeleted: 0,
        reportsDeleted: 0,
        userProgressDeleted: 0,
      },
    });
  } catch (error) {
    console.error("Error updating eligible users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get simple progress for a cohort (just counts - super fast)
// ✅ SHARED CONTENT MODEL: Works for both original and cloned cohorts
router.get("/:id/progress", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cohortId = req.params.id;

    // Get cohort and its module references
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Use cohort's modules array (works for cloned cohorts)
    const moduleIds = cohort.modules;
    const totalQuestions = await Question.countDocuments({
      module: { $in: moduleIds },
    });

    // Get user's solved questions count
    const userCohort = await UserCohort.findOne({
      user: userId,
      cohort: cohortId,
    });
    const solvedQuestions = userCohort
      ? userCohort.questionProgress.filter((q) => q.solved).length
      : 0;

    // Calculate progress percentage
    const progressPercentage =
      totalQuestions > 0
        ? Math.round((solvedQuestions / totalQuestions) * 100)
        : 0;

    res.json({
      totalQuestions,
      solvedQuestions,
      progressPercentage,
      isEnrolled: !!userCohort,
    });
  } catch (err) {
    console.error("Error fetching cohort progress:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
