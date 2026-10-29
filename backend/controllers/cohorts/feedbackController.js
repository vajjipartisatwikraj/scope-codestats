/**
 * Feedback controller.
 *
 * Ratings and reviews of a cohort. A review applies to the whole group of related cohorts (clones).
 *
 * Wired to URLs in routes/cohorts/feedback.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../../services/cohortCascadeService");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const { runWithOptionalTransaction } = require("../../utils/mongoTransaction");
const log = require("../../utils/logger").scope("COHORT-FEEDBACK");

// Feedback Routes
// Add or update feedback for a cohort
// ✅ CLONE GROUP LEVEL: One review per user per clone group (no duplicates)
const submitFeedback = async (req, res) => {
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

    {
      // ✅ Add or update feedback at clone group level
      const { result: feedback } = await runWithOptionalTransaction(
        (session) =>
          cascadeService.addOrUpdateFeedback(
            cohortId,
            userId,
            rating,
            comment,
            session
          ),
        { label: "feedback submission" }
      );

      // Get updated average rating
      const updatedCohort = await Cohort.findById(cohortId).select(
        "averageRating"
      );

      log.debug(
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
    }
  } catch (err) {
    log.error("❌ Error submitting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all feedback for a cohort (from clone group)
// ✅ CLONE GROUP LEVEL: Returns all reviews for the entire clone group
const getFeedback = async (req, res) => {
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
    log.error("❌ Error getting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get current user's feedback for a cohort
// ✅ CLONE GROUP LEVEL: Returns user's review for the clone group
const getMyFeedback = async (req, res) => {
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
    log.error("❌ Error getting user feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete feedback from a cohort
// ✅ CLONE GROUP LEVEL: Deletes feedback from the entire clone group
const deleteFeedback = async (req, res) => {
  try {
    const { id: cohortId, feedbackId } = req.params;
    const userId = req.user.id;

    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get the feedback to check ownership
    const CohortFeedback = require("../../models/CohortFeedback");
    const feedback = await CohortFeedback.findById(feedbackId);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // ✅ ADMIN OVERRIDE: Admin/teacher can delete any feedback, users can only delete their own
    const isAdmin = isAdminOrTeacher(req.user);
    const isOwner = feedback.user.toString() === userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: "You can only delete your own feedback",
      });
    }

    {
      // 🔄 Delete feedback from clone group
      await runWithOptionalTransaction(
        (session) =>
          cascadeService.deleteFeedback(cohortId, feedbackId, session),
        { label: "feedback deletion" }
      );

      log.debug(`✅ Feedback deleted from clone group by user ${userId}`);

      res.json({
        success: true,
        message: "Feedback deleted successfully",
      });
    }
  } catch (err) {
    log.error("❌ Error deleting feedback:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  submitFeedback,
  getFeedback,
  getMyFeedback,
  deleteFeedback,
};
