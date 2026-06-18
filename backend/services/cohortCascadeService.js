const mongoose = require("mongoose");
const Cohort = require("../models/Cohort");
const Module = require("../models/Module");
const Question = require("../models/Question");
const Submission = require("../models/Submission");
const UserCohort = require("../models/UserCohort");
const Note = require("../models/Note");
const QuestionReport = require("../models/QuestionReport");
const CohortFeedback = require("../models/CohortFeedback");

/**
 * ============================================================================
 * COHORT CASCADE SERVICE
 * ============================================================================
 * Centralized service for managing relational cohort synchronization and
 * cascade operations across shared content (modules, questions, reviews).
 *
 * Key Concepts:
 * - Relational Cohorts: Cohorts sharing identical module sets ("clone family")
 * - Cascade Sync: All CRUD operations propagate to all related cohorts
 * - Last Cohort Logic: When deleting the last cohort, remove all shared data
 * - User Data Cleanup: Remove user-specific data when eligibility changes
 */

// ============================================================================
// HELPER: Get Related Cohorts
// ============================================================================
/**
 * Find all cohorts that share the exact same set of modules.
 * These form a "relational group" or "clone family".
 *
 * DETECTION LOGIC:
 * 1. If cohort has cloneGroupId, find all cohorts with same cloneGroupId
 * 2. Otherwise, find cohorts with identical module sets
 * 3. This allows empty duplicated cohorts to stay synced before modules are added
 *
 * @param {ObjectId} cohortId - The cohort to find relations for
 * @returns {Promise<Array>} - Array of related cohort objects {_id, title, modules}
 */
async function getRelatedCohorts(cohortId) {
  try {
    const cohort = await Cohort.findById(cohortId).select(
      "modules title cloneGroupId"
    );

    // Handle case where cohort doesn't exist
    if (!cohort) {
      throw new Error(`Cohort with ID ${cohortId} not found`);
    }

    // PRIMARY DETECTION: If cohort has cloneGroupId, find all cohorts in same clone group
    if (cohort.cloneGroupId) {
      const relatedCohorts = await Cohort.find({
        cloneGroupId: cohort.cloneGroupId,
      }).select("_id title modules");

      console.log(
        `[CascadeService] Found ${relatedCohorts.length} related cohorts via cloneGroupId "${cohort.cloneGroupId}"`
      );

      return relatedCohorts.map((c) => ({
        _id: c._id,
        title: c.title,
        modules: c.modules,
      }));
    }

    // FALLBACK DETECTION: Find cohorts with identical module sets
    // Handle case where cohort has no modules and no cloneGroupId
    if (!cohort.modules || cohort.modules.length === 0) {
      console.log(
        `[CascadeService] Cohort "${cohort.title}" has no modules and no cloneGroupId - returning only self`
      );
      return [{ _id: cohort._id, title: cohort.title, modules: [] }];
    }

    // Sort module IDs for consistent comparison
    const moduleIds = cohort.modules.map((m) => m.toString()).sort();

    // Find all cohorts that contain ALL these modules
    const allCohorts = await Cohort.find({
      modules: { $all: cohort.modules },
    }).select("_id title modules");

    // Filter to cohorts with EXACTLY the same module set (bidirectional match)
    const relatedCohorts = allCohorts.filter((c) => {
      const cModuleIds = c.modules.map((m) => m.toString()).sort();
      return JSON.stringify(moduleIds) === JSON.stringify(cModuleIds);
    });

    console.log(
      `[CascadeService] Found ${relatedCohorts.length} related cohorts via module comparison for "${cohort.title}"`
    );

    return relatedCohorts.map((c) => ({
      _id: c._id,
      title: c.title,
      modules: c.modules,
    }));
  } catch (err) {
    console.error("[CascadeService] Error finding related cohorts:", err);
    throw err;
  }
}

// ============================================================================
// FEEDBACK/REVIEW CASCADE OPERATIONS (CLONE GROUP LEVEL)
// ============================================================================

/**
 * Get the clone group ID for a cohort
 * If cohort doesn't have a cloneGroupId, generates one based on module structure
 */
async function getCloneGroupId(cohortId) {
  const cohort = await Cohort.findById(cohortId).select("cloneGroupId modules");

  if (!cohort) {
    throw new Error(`Cohort with ID ${cohortId} not found`);
  }

  // If cohort already has a cloneGroupId, use it
  if (cohort.cloneGroupId) {
    return cohort.cloneGroupId;
  }

  // Otherwise, generate a deterministic ID based on sorted module IDs
  // This ensures cohorts with same modules get the same clone group ID
  if (!cohort.modules || cohort.modules.length === 0) {
    // For empty cohorts, use cohort ID itself (no sharing)
    return `solo_${cohortId}`;
  }

  const moduleIds = cohort.modules.map((m) => m.toString()).sort();
  return `modules_${moduleIds.join("_")}`;
}

/**
 * Add or update feedback for a clone group
 * Stores ONE review per user per clone group
 *
 * @param {ObjectId} cohortId - Any cohort in the clone group
 * @param {ObjectId} userId - User giving feedback
 * @param {Number} rating - Rating (1-5)
 * @param {String} comment - Optional comment
 * @param {Object} session - MongoDB session for transaction
 * @returns {Promise<Object>} - The feedback document
 */
async function addOrUpdateFeedback(
  cohortId,
  userId,
  rating,
  comment,
  session = null
) {
  try {
    const cloneGroupId = await getCloneGroupId(cohortId);

    console.log(
      `[CascadeService] Adding/updating feedback for clone group "${cloneGroupId}"`
    );

    // Find existing feedback for this user in this clone group
    const existingFeedback = await CohortFeedback.findOne({
      cloneGroupId,
      user: userId,
    }).session(session);

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.rating = rating;
      if (comment !== undefined) {
        existingFeedback.comment = comment;
      }
      existingFeedback.cohort = cohortId; // Update reference to current cohort
      feedback = await existingFeedback.save({ session });

      console.log(
        `[CascadeService] Updated existing feedback for user ${userId}`
      );
    } else {
      // Create new feedback
      feedback = new CohortFeedback({
        cloneGroupId,
        cohort: cohortId,
        user: userId,
        rating,
        comment,
      });
      await feedback.save({ session });

      console.log(`[CascadeService] Created new feedback for user ${userId}`);
    }

    // Update average rating in all related cohorts
    await updateAverageRatingForCloneGroup(cloneGroupId, session);

    return feedback;
  } catch (err) {
    console.error("[CascadeService] Error adding/updating feedback:", err);
    throw err;
  }
}

/**
 * Calculate and update average rating for all cohorts in a clone group
 */
async function updateAverageRatingForCloneGroup(cloneGroupId, session = null) {
  try {
    // Get all feedback for this clone group
    const feedbacks = await CohortFeedback.find({ cloneGroupId }).session(
      session
    );

    // Calculate average
    const averageRating =
      feedbacks.length > 0
        ? parseFloat(
            (
              feedbacks.reduce((sum, fb) => sum + fb.rating, 0) /
              feedbacks.length
            ).toFixed(1)
          )
        : 0;

    // Update all cohorts in this clone group
    await Cohort.updateMany(
      { cloneGroupId },
      { $set: { averageRating } },
      { session }
    );

    console.log(
      `[CascadeService] Updated average rating (${averageRating}) for clone group "${cloneGroupId}"`
    );

    return averageRating;
  } catch (err) {
    console.error("[CascadeService] Error updating average rating:", err);
    throw err;
  }
}

/**
 * Get all feedback for a clone group
 *
 * @param {ObjectId} cohortId - Any cohort in the clone group
 * @param {Object} session - MongoDB session for transaction
 * @returns {Promise<Array>} - Array of feedback documents
 */
async function getFeedbackForCloneGroup(cohortId, session = null) {
  try {
    const cloneGroupId = await getCloneGroupId(cohortId);

    const feedbacks = await CohortFeedback.find({ cloneGroupId })
      .populate("user", "name rollNumber profilePicture")
      .sort({ createdAt: -1 })
      .session(session);

    return feedbacks;
  } catch (err) {
    console.error("[CascadeService] Error getting feedback:", err);
    throw err;
  }
}

/**
 * Delete feedback from clone group
 *
 * @param {ObjectId} cohortId - Any cohort in the clone group
 * @param {ObjectId} feedbackId - Feedback ID to delete
 * @param {Object} session - MongoDB session for transaction
 */
async function deleteFeedback(cohortId, feedbackId, session = null) {
  try {
    const cloneGroupId = await getCloneGroupId(cohortId);

    const feedback = await CohortFeedback.findOneAndDelete({
      _id: feedbackId,
      cloneGroupId,
    }).session(session);

    if (!feedback) {
      throw new Error(
        "Feedback not found or does not belong to this clone group"
      );
    }

    console.log(`[CascadeService] Deleted feedback ${feedbackId}`);

    // Update average rating for all cohorts in clone group
    await updateAverageRatingForCloneGroup(cloneGroupId, session);

    return feedback;
  } catch (err) {
    console.error("[CascadeService] Error deleting feedback:", err);
    throw err;
  }
}

/**
 * Check if user has already given feedback for a clone group
 *
 * @param {ObjectId} cohortId - Any cohort in the clone group
 * @param {ObjectId} userId - User ID
 * @param {Object} session - MongoDB session for transaction
 * @returns {Promise<Object|null>} - Existing feedback or null
 */
async function getUserFeedbackForCloneGroup(cohortId, userId, session = null) {
  try {
    const cloneGroupId = await getCloneGroupId(cohortId);

    const feedback = await CohortFeedback.findOne({
      cloneGroupId,
      user: userId,
    })
      .populate("user", "name rollNumber profilePicture")
      .session(session);

    return feedback;
  } catch (err) {
    console.error("[CascadeService] Error getting user feedback:", err);
    throw err;
  }
}

// ============================================================================
// DEPRECATED: OLD FEEDBACK OPERATIONS (Keep for backward compatibility)
// ============================================================================
// These are deprecated in favor of clone-group-level feedback above

/**
 * @deprecated Use addOrUpdateFeedback instead
 * Sync feedback across all related cohorts
 * Ensures all cohorts in the relational group have identical feedback arrays
 *
 * @param {ObjectId} cohortId - Source cohort ID
 * @param {Array} feedbacks - Feedback array to sync
 * @param {Object} session - MongoDB session for transaction
 */
async function syncFeedbackAcrossRelatedCohorts(
  cohortId,
  feedbacks,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);

    console.log(
      `[CascadeService] Syncing feedback across ${relatedCohorts.length} cohorts`
    );

    const updatePromises = relatedCohorts.map((rc) =>
      Cohort.findByIdAndUpdate(
        rc._id,
        {
          feedbacks,
          averageRating: calculateAverageRating(feedbacks),
        },
        { session, new: true }
      )
    );

    await Promise.all(updatePromises);

    console.log(`[CascadeService] Feedback synced successfully`);
  } catch (err) {
    console.error("[CascadeService] Error syncing feedback:", err);
    throw err;
  }
}

/**
 * @deprecated
 * Calculate average rating from feedback array
 */
function calculateAverageRating(feedbacks) {
  if (!feedbacks || feedbacks.length === 0) return 0;
  const sum = feedbacks.reduce((acc, fb) => acc + fb.rating, 0);
  return sum / feedbacks.length;
}

/**
 * @deprecated Use addOrUpdateFeedback instead
 * Add feedback to all related cohorts
 */
async function addFeedbackToRelatedCohorts(
  cohortId,
  newFeedback,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);

    console.log(
      `[CascadeService] Adding feedback to ${relatedCohorts.length} cohorts`
    );

    const updatePromises = relatedCohorts.map(async (rc) => {
      const cohort = await Cohort.findById(rc._id).session(session);
      cohort.feedbacks.push(newFeedback);
      cohort.averageRating = calculateAverageRating(cohort.feedbacks);
      return cohort.save({ session });
    });

    await Promise.all(updatePromises);

    console.log(`[CascadeService] Feedback added successfully`);
  } catch (err) {
    console.error("[CascadeService] Error adding feedback:", err);
    throw err;
  }
}

/**
 * @deprecated Use addOrUpdateFeedback instead
 * Update feedback in all related cohorts
 */
async function updateFeedbackInRelatedCohorts(
  cohortId,
  feedbackId,
  updates,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);

    console.log(
      `[CascadeService] Updating feedback in ${relatedCohorts.length} cohorts`
    );

    const updatePromises = relatedCohorts.map(async (rc) => {
      const cohort = await Cohort.findById(rc._id).session(session);
      const feedback = cohort.feedbacks.id(feedbackId);
      if (feedback) {
        Object.assign(feedback, updates);
        cohort.averageRating = calculateAverageRating(cohort.feedbacks);
        return cohort.save({ session });
      }
    });

    await Promise.all(updatePromises);

    console.log(`[CascadeService] Feedback updated successfully`);
  } catch (err) {
    console.error("[CascadeService] Error updating feedback:", err);
    throw err;
  }
}

/**
 * @deprecated Use deleteFeedback instead
 * Delete feedback from all related cohorts
 */
async function deleteFeedbackFromRelatedCohorts(
  cohortId,
  feedbackId,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);

    console.log(
      `[CascadeService] Deleting feedback from ${relatedCohorts.length} cohorts`
    );

    const updatePromises = relatedCohorts.map(async (rc) => {
      const cohort = await Cohort.findById(rc._id).session(session);
      cohort.feedbacks.pull(feedbackId);
      cohort.averageRating = calculateAverageRating(cohort.feedbacks);
      return cohort.save({ session });
    });

    await Promise.all(updatePromises);

    console.log(`[CascadeService] Feedback deleted successfully`);
  } catch (err) {
    console.error("[CascadeService] Error deleting feedback:", err);
    throw err;
  }
}

// ============================================================================
// MODULE CASCADE OPERATIONS
// ============================================================================

/**
 * Delete module and ALL associated data from ALL related cohorts
 * Cascades to: questions, submissions, notes, reports
 */
async function deleteModuleFromRelatedCohorts(
  cohortId,
  moduleId,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const cohortIds = relatedCohorts.map((c) => c._id);

    console.log(
      `[CascadeService] Deleting module from ${relatedCohorts.length} cohorts`
    );

    // Get all questions in this module
    const questions = await Question.find({ module: moduleId })
      .select("_id")
      .session(session);
    const questionIds = questions.map((q) => q._id);

    // CASCADE DELETE: Delete all user data associated with these questions
    const deletionResults = await Promise.all([
      // Delete all submissions for these questions in all related cohorts
      Submission.deleteMany(
        { question: { $in: questionIds }, cohort: { $in: cohortIds } },
        { session }
      ),
      // Delete all notes for these questions in all related cohorts
      Note.deleteMany(
        { question: { $in: questionIds }, cohort: { $in: cohortIds } },
        { session }
      ),
      // Delete all reports for these questions in all related cohorts
      QuestionReport.deleteMany(
        { question: { $in: questionIds }, cohort: { $in: cohortIds } },
        { session }
      ),
    ]);

    console.log(`[CascadeService] Deleted user data:`, {
      submissions: deletionResults[0].deletedCount,
      notes: deletionResults[1].deletedCount,
      reports: deletionResults[2].deletedCount,
    });

    // Delete all questions in the module
    const questionDeletion = await Question.deleteMany(
      { module: moduleId },
      { session }
    );
    console.log(
      `[CascadeService] Deleted ${questionDeletion.deletedCount} questions`
    );

    // Remove module reference from all related cohorts
    const cohortUpdates = relatedCohorts.map((rc) =>
      Cohort.findByIdAndUpdate(
        rc._id,
        { $pull: { modules: moduleId } },
        { session, new: true }
      )
    );
    await Promise.all(cohortUpdates);

    // Delete the module itself
    await Module.findByIdAndDelete(moduleId, { session });

    console.log(
      `[CascadeService] Module deleted from ${relatedCohorts.length} cohorts`
    );

    return {
      affectedCohorts: relatedCohorts.length,
      deletedQuestions: questionDeletion.deletedCount,
      deletedSubmissions: deletionResults[0].deletedCount,
      deletedNotes: deletionResults[1].deletedCount,
      deletedReports: deletionResults[2].deletedCount,
    };
  } catch (err) {
    console.error("[CascadeService] Error deleting module:", err);
    throw err;
  }
}

// ============================================================================
// QUESTION CASCADE OPERATIONS
// ============================================================================

/**
 * Delete question and ALL associated data from ALL related cohorts
 * Cascades to: submissions, notes, reports
 */
async function deleteQuestionFromRelatedCohorts(
  cohortId,
  questionId,
  session = null
) {
  try {
    const relatedCohorts = await getRelatedCohorts(cohortId);
    const cohortIds = relatedCohorts.map((c) => c._id);

    console.log(
      `[CascadeService] Deleting question from ${relatedCohorts.length} cohorts`
    );

    // Get the question to find its module
    const question = await Question.findById(questionId)
      .select("module")
      .session(session);
    if (!question) {
      throw new Error("Question not found");
    }

    // CASCADE DELETE: Delete all user data associated with this question
    const deletionResults = await Promise.all([
      // Delete all submissions for this question in all related cohorts
      Submission.deleteMany(
        { question: questionId, cohort: { $in: cohortIds } },
        { session }
      ),
      // Delete all notes for this question in all related cohorts
      Note.deleteMany(
        { question: questionId, cohort: { $in: cohortIds } },
        { session }
      ),
      // Delete all reports for this question in all related cohorts
      QuestionReport.deleteMany(
        { question: questionId, cohort: { $in: cohortIds } },
        { session }
      ),
    ]);

    console.log(`[CascadeService] Deleted user data:`, {
      submissions: deletionResults[0].deletedCount,
      notes: deletionResults[1].deletedCount,
      reports: deletionResults[2].deletedCount,
    });

    // Remove question reference from its module
    await Module.findByIdAndUpdate(
      question.module,
      { $pull: { questions: questionId } },
      { session }
    );

    // Delete the question itself
    await Question.findByIdAndDelete(questionId, { session });

    console.log(
      `[CascadeService] Question deleted from ${relatedCohorts.length} cohorts`
    );

    return {
      affectedCohorts: relatedCohorts.length,
      deletedSubmissions: deletionResults[0].deletedCount,
      deletedNotes: deletionResults[1].deletedCount,
      deletedReports: deletionResults[2].deletedCount,
    };
  } catch (err) {
    console.error("[CascadeService] Error deleting question:", err);
    throw err;
  }
}

// ============================================================================
// COHORT DELETION CASCADE
// ============================================================================

/**
 * Check if cohort is the last in its relational group
 */
async function isLastCohortInGroup(cohortId) {
  const relatedCohorts = await getRelatedCohorts(cohortId);
  return relatedCohorts.length === 1;
}

/**
 * Delete cohort with proper cascade logic
 * - If last cohort: Delete all shared modules, questions, and ALL user data globally
 * - If not last: Only delete user data specific to this cohort
 */
async function deleteCohortWithCascade(cohortId, session = null) {
  try {
    const cohort = await Cohort.findById(cohortId).session(session);
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    const relatedCohorts = await getRelatedCohorts(cohortId);
    const isLast = relatedCohorts.length === 1;

    console.log(
      `[CascadeService] Deleting cohort "${cohort.title}" (${
        isLast ? "LAST in group" : `${relatedCohorts.length} in group`
      })`
    );

    const moduleIds = cohort.modules || [];
    const questionIds = await Question.find({ module: { $in: moduleIds } })
      .select("_id")
      .session(session)
      .then((qs) => qs.map((q) => q._id));

    let deletionStats = {
      cohortDeleted: true,
      isLastCohort: isLast,
      userProgressDeleted: 0,
      submissionsDeleted: 0,
      notesDeleted: 0,
      reportsDeleted: 0,
      modulesDeleted: 0,
      questionsDeleted: 0,
    };

    if (isLast) {
      // LAST COHORT: Delete EVERYTHING globally
      console.log("[CascadeService] Last cohort - performing global cleanup");

      const [submissions, notes, reports, questions, modules, userProgress] =
        await Promise.all([
          // Delete ALL submissions for these questions (all users, all cohorts)
          Submission.deleteMany(
            { question: { $in: questionIds } },
            { session }
          ),
          // Delete ALL notes for these questions
          Note.deleteMany({ question: { $in: questionIds } }, { session }),
          // Delete ALL reports for these questions
          QuestionReport.deleteMany(
            { question: { $in: questionIds } },
            { session }
          ),
          // Delete ALL questions
          Question.deleteMany({ module: { $in: moduleIds } }, { session }),
          // Delete ALL modules
          Module.deleteMany({ _id: { $in: moduleIds } }, { session }),
          // Delete user progress for this cohort
          UserCohort.deleteMany({ cohort: cohortId }, { session }),
        ]);

      deletionStats.submissionsDeleted = submissions.deletedCount;
      deletionStats.notesDeleted = notes.deletedCount;
      deletionStats.reportsDeleted = reports.deletedCount;
      deletionStats.questionsDeleted = questions.deletedCount;
      deletionStats.modulesDeleted = modules.deletedCount;
      deletionStats.userProgressDeleted = userProgress.deletedCount;
    } else {
      // NOT LAST: Only delete user data for THIS cohort
      console.log(
        `[CascadeService] Not last cohort - deleting only cohort-specific user data`
      );

      const [submissions, notes, reports, userProgress] = await Promise.all([
        // Delete submissions for THIS cohort only
        Submission.deleteMany(
          { cohort: cohortId, question: { $in: questionIds } },
          { session }
        ),
        // Delete notes for THIS cohort only
        Note.deleteMany(
          { cohort: cohortId, question: { $in: questionIds } },
          { session }
        ),
        // Delete reports for THIS cohort only
        QuestionReport.deleteMany(
          { cohort: cohortId, question: { $in: questionIds } },
          { session }
        ),
        // Delete user progress for THIS cohort only
        UserCohort.deleteMany({ cohort: cohortId }, { session }),
      ]);

      deletionStats.submissionsDeleted = submissions.deletedCount;
      deletionStats.notesDeleted = notes.deletedCount;
      deletionStats.reportsDeleted = reports.deletedCount;
      deletionStats.userProgressDeleted = userProgress.deletedCount;
      deletionStats.modulesPreserved = moduleIds.length;
      deletionStats.questionsPreserved = questionIds.length;
    }

    // Delete the cohort itself
    await Cohort.findByIdAndDelete(cohortId, { session });

    console.log("[CascadeService] Cohort deletion complete:", deletionStats);

    return deletionStats;
  } catch (err) {
    console.error("[CascadeService] Error deleting cohort:", err);
    throw err;
  }
}

// ============================================================================
// USER ELIGIBILITY CASCADE
// ============================================================================

/**
 * Clean up user data when removed from cohort eligibility
 * Deletes: submissions, notes, reports, user progress for the specific cohort
 */
async function removeUserDataFromCohort(cohortId, userId, session = null) {
  try {
    console.log(
      `[CascadeService] Removing user ${userId} data from cohort ${cohortId}`
    );

    // Get all modules and questions for this cohort
    const cohort = await Cohort.findById(cohortId)
      .select("modules")
      .session(session);
    if (!cohort) {
      throw new Error("Cohort not found");
    }

    const moduleIds = cohort.modules || [];
    const questionIds = await Question.find({ module: { $in: moduleIds } })
      .select("_id")
      .session(session)
      .then((qs) => qs.map((q) => q._id));

    // Delete all user data for this specific cohort
    const [submissions, notes, reports, userProgress] = await Promise.all([
      Submission.deleteMany(
        {
          user: userId,
          cohort: cohortId,
          question: { $in: questionIds },
        },
        { session }
      ),
      Note.deleteMany(
        {
          user: userId,
          cohort: cohortId,
          question: { $in: questionIds },
        },
        { session }
      ),
      QuestionReport.deleteMany(
        {
          user: userId,
          cohort: cohortId,
          question: { $in: questionIds },
        },
        { session }
      ),
      UserCohort.deleteMany(
        {
          user: userId,
          cohort: cohortId,
        },
        { session }
      ),
    ]);

    const deletionStats = {
      submissionsDeleted: submissions.deletedCount,
      notesDeleted: notes.deletedCount,
      reportsDeleted: reports.deletedCount,
      userProgressDeleted: userProgress.deletedCount,
    };

    console.log(`[CascadeService] User data removed:`, deletionStats);

    return deletionStats;
  } catch (err) {
    console.error("[CascadeService] Error removing user data:", err);
    throw err;
  }
}

/**
 * Clean up multiple users' data when removed from cohort eligibility
 */
async function removeMultipleUsersDataFromCohort(
  cohortId,
  userIds,
  session = null
) {
  try {
    console.log(
      `[CascadeService] Removing ${userIds.length} users' data from cohort ${cohortId}`
    );

    const deletionPromises = userIds.map((userId) =>
      removeUserDataFromCohort(cohortId, userId, session)
    );

    const results = await Promise.all(deletionPromises);

    // Aggregate stats
    const aggregatedStats = results.reduce(
      (acc, curr) => ({
        submissionsDeleted: acc.submissionsDeleted + curr.submissionsDeleted,
        notesDeleted: acc.notesDeleted + curr.notesDeleted,
        reportsDeleted: acc.reportsDeleted + curr.reportsDeleted,
        userProgressDeleted: acc.userProgressDeleted + curr.userProgressDeleted,
      }),
      {
        submissionsDeleted: 0,
        notesDeleted: 0,
        reportsDeleted: 0,
        userProgressDeleted: 0,
      }
    );

    console.log(
      `[CascadeService] Multiple users data removed:`,
      aggregatedStats
    );

    return aggregatedStats;
  } catch (err) {
    console.error("[CascadeService] Error removing multiple users data:", err);
    throw err;
  }
}

// ============================================================================
// CLONE GROUP MANAGEMENT
// ============================================================================

/**
 * Link existing cohorts into a clone group
 * Useful for migrating existing cohorts or manually establishing relationships
 *
 * @param {Array<ObjectId>} cohortIds - Array of cohort IDs to link
 * @returns {Promise<String>} - The clone group ID
 */
async function linkCohortsToCloneGroup(cohortIds) {
  try {
    if (!cohortIds || cohortIds.length === 0) {
      throw new Error("No cohort IDs provided");
    }

    // Generate new clone group ID
    const cloneGroupId = `clone_manual_${Date.now()}`;

    // Update all cohorts with the same cloneGroupId
    await Cohort.updateMany(
      { _id: { $in: cohortIds } },
      { $set: { cloneGroupId: cloneGroupId } }
    );

    console.log(
      `[CascadeService] Linked ${cohortIds.length} cohorts to clone group ${cloneGroupId}`
    );

    return cloneGroupId;
  } catch (err) {
    console.error("[CascadeService] Error linking cohorts:", err);
    throw err;
  }
}

/**
 * Remove a cohort from its clone group
 * The cohort will become independent and no longer sync with other cohorts
 *
 * @param {ObjectId} cohortId - Cohort ID to unlink
 */
async function unlinkCohortFromCloneGroup(cohortId) {
  try {
    await Cohort.findByIdAndUpdate(cohortId, {
      $unset: { cloneGroupId: "" },
    });

    console.log(
      `[CascadeService] Unlinked cohort ${cohortId} from clone group`
    );
  } catch (err) {
    console.error("[CascadeService] Error unlinking cohort:", err);
    throw err;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Helper
  getRelatedCohorts,
  isLastCohortInGroup,
  getCloneGroupId,

  // NEW: Clone Group Level Feedback Operations (Recommended)
  addOrUpdateFeedback,
  getFeedbackForCloneGroup,
  deleteFeedback,
  getUserFeedbackForCloneGroup,
  updateAverageRatingForCloneGroup,

  // DEPRECATED: Old Feedback/Review operations (kept for backward compatibility)
  syncFeedbackAcrossRelatedCohorts,
  addFeedbackToRelatedCohorts,
  updateFeedbackInRelatedCohorts,
  deleteFeedbackFromRelatedCohorts,

  // Module operations
  deleteModuleFromRelatedCohorts,

  // Question operations
  deleteQuestionFromRelatedCohorts,

  // Cohort operations
  deleteCohortWithCascade,

  // User eligibility operations
  removeUserDataFromCohort,
  removeMultipleUsersDataFromCohort,

  // Clone group management
  linkCohortsToCloneGroup,
  unlinkCohortFromCloneGroup,
};
