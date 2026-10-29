/**
 * Questions controller.
 *
 * The questions of a module: viewing, exporting, adding (one or in bulk), editing and deleting them.
 *
 * Wired to URLs in routes/cohorts/question.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const Question = require("../../models/Question");
const Submission = require("../../models/Submission");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../../services/cohortCascadeService");
const { BulkQuestionUploadError, TransactionsUnavailableError, persistBulkQuestions, prepareBulkQuestionUpload } = require("../../services/bulkQuestionUploadService");
const { EXAM_MODE } = require("../../utils/examAccess");
const { blockedByExamWindow } = require("../../services/cohorts/examGateService");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { runWithOptionalTransaction } = require("../../utils/mongoTransaction");
const log = require("../../utils/logger").scope("COHORT-QUESTIONS");

// Get questions for a specific module - OPTIMIZED to return only minimal data
const getModuleQuestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cohortId, moduleId } = req.params;

    log.debug(
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

      // An exam cohort that has closed is handled below so the client gets the
      // specific reason rather than a bare "Access denied".
      const inactiveForNonExam =
        cohortExists.mode !== EXAM_MODE && !cohortExists.isActive;

      if (!isEligible || inactiveForNonExam || cohortExists.isDraft) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (await blockedByExamWindow(res, cohortExists, {
        isPrivileged: false,
        userId: req.user.id,
      })) {
        return;
      }
    }

    // Get questions for this specific module - ONLY essential fields
    const questions = await Question.find({
      module: moduleId,
    })
      .select("title type difficultyLevel marks stats")
      .lean();

    log.debug(`Found ${questions.length} questions for module ${moduleId}`);
    res.json(questions);
  } catch (err) {
    log.error("Error fetching module questions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ EXPORT: Export all questions of a module as JSON (admin only)
const exportModuleQuestions = async (req, res) => {
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
    log.error("Error exporting module questions:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get a specific question
const getQuestion = async (req, res) => {
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
        isDraft: false,
        $or: [{ isActive: true }, { mode: EXAM_MODE }],
      });

      if (!cohort) {
        return res
          .status(404)
          .json({ message: "Cohort not found or not eligible" });
      }

      if (cohort.mode !== EXAM_MODE && !cohort.isActive) {
        return res
          .status(404)
          .json({ message: "Cohort not found or not eligible" });
      }

      // Covers the joining window, this student's own deadline, and an exam
      // they have already finished.
      if (
        await blockedByExamWindow(res, cohort, {
          isPrivileged: false,
          userId: req.user.id,
        })
      ) {
        return;
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
      log.debug(
        `📊 Filtered test cases: ${questionData.testCases.length} visible out of ${question.testCases.length} total`
      );
    }

    // Include scoring tiers in response - these are safe to send to frontend
    // Students should see the scoring tiers to understand performance benchmarks
    // Languages array already includes scoringTiers and minimumPoints fields

    // Log editorial field info
    log.debug(
      `📝 Editorial field: ${
        questionData.editorial
          ? `Present (${questionData.editorial.length} chars)`
          : "Empty or undefined"
      }`
    );
    log.debug(
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
    log.error("Error fetching question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get question editorial (loaded on-demand when user clicks Editorial tab)
// SECURITY: Only show editorial if user has ACCEPTED (correct) submission
const getQuestionEditorial = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    // Check if user has an ACCEPTED (correct) submission for this question
    const Submission = require("../../models/Submission");
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
    log.error("Error fetching editorial:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get complete question data for editing (admin only)
// ✅ SHARED CONTENT MODEL: Returns question data regardless of which cohort it's accessed from
// Changes made will affect ALL cohorts that reference this question
const getQuestionForEdit = async (req, res) => {
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
    log.error("Error fetching question for editing:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// QUESTIONS API Endpoints
// ✅ SHARED CONTENT MODEL: Create question (available in ALL related cohorts)
const createQuestion = async (req, res) => {
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

    log.debug(
      "📝 CREATE Question - Received fillInTheBlank:",
      fillInTheBlank
    );
    log.debug(
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
    const relatedCohorts = await cascadeService.getRelatedCohorts(req.params.cohortId);

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
        log.debug(
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

    log.debug(
      `Question "${title}" created and added to ${relatedCohorts.length} cohort(s)`
    );

    res.status(201).json({
      message: `Question created and added to ${relatedCohorts.length} cohort(s)`,
      question,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("Error creating question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ BULK UPLOAD: Atomically create questions from one or more JSON files
const bulkCreateQuestions = async (req, res) => {
  try {
    // Preserve the shared-content relationship checks used by the single-create route.
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

    const relatedCohorts = await cascadeService.getRelatedCohorts(req.params.cohortId);

    // Full preflight occurs before preview responses and before any write starts.
    const prepared = await prepareBulkQuestionUpload(req.body, {
      moduleId: module._id,
      createdBy: req.user.id,
    });

    if (req.query.preview === "true") {
      return res.json({
        action: "bulk_create_questions",
        affectedCohorts: relatedCohorts,
        module: { _id: module._id, title: module.title },
        questionCount: prepared.questionCount,
      });
    }

    const result = await persistBulkQuestions({
      documents: prepared.documents,
      moduleId: module._id,
      relatedCohortIds: relatedCohorts.map((relatedCohort) => relatedCohort._id),
    });

    log.debug(
      `✅ Bulk upload: ${result.created} questions created for module "${module.title}" across ${relatedCohorts.length} cohort(s)`
    );

    return res.status(201).json({
      message: `${result.created} question(s) created successfully`,
      created: result.created,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    if (
      err instanceof BulkQuestionUploadError ||
      err instanceof TransactionsUnavailableError
    ) {
      const body = typeof err.toResponse === "function"
        ? err.toResponse()
        : { message: err.message, code: err.code };
      return res.status(err.status).json(body);
    }

    log.error("Error in bulk question upload:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update an existing question
// ✅ SHARED CONTENT MODEL: Updates affect ALL cohorts using this question
const updateQuestion = async (req, res) => {
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
    const relatedCohorts = await cascadeService.getRelatedCohorts(cohortId);

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

    log.debug(
      `Question "${updatedQuestion.title}" updated across ${relatedCohorts.length} cohort(s)`
    );

    res.json({
      message: `Question updated across ${relatedCohorts.length} cohort(s)`,
      question: updatedQuestion,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("Error updating question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete a question
// ✅ UNIFIED CASCADE MODEL: Deletes question from all cohorts with full cascade
const deleteQuestion = async (req, res) => {
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
    const relatedCohorts = await cascadeService.getRelatedCohorts(cohortId);

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
    const { result: deletionStats } = await runWithOptionalTransaction(
      async (session) => {
        const sessionOptions = session ? { session } : {};

        // Use cascade service for comprehensive deletion
        const stats = await cascadeService.deleteQuestionFromRelatedCohorts(
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
          sessionOptions
        );

        // Update module progress counts for ALL cohorts
        await UserCohort.updateMany(
          {
            "moduleProgress.module": moduleId,
          },
          {
            $inc: { "moduleProgress.$.totalQuestions": -1 },
          },
          sessionOptions
        );

        return stats;
      },
      { label: "question deletion" }
    );

    log.debug(
      `✅ Question "${question.title}" deleted from ${deletionStats.affectedCohorts} cohort(s) with full cascade`
    );

    res.json({
      message: `Question deleted from ${deletionStats.affectedCohorts} cohort(s)`,
      ...deletionStats,
      affectedCohorts: relatedCohorts,
    });
  } catch (err) {
    log.error("❌ Error deleting question:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getModuleQuestions,
  exportModuleQuestions,
  getQuestion,
  getQuestionEditorial,
  getQuestionForEdit,
  createQuestion,
  bulkCreateQuestions,
  updateQuestion,
  deleteQuestion,
};
