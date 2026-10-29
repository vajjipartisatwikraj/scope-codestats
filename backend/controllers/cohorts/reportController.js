/**
 * Question reports controller.
 *
 * Reports that students raise about a question, and how staff handle them.
 *
 * Wired to URLs in routes/cohorts/report.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Notification = require("../../models/Notification");
const Question = require("../../models/Question");
const QuestionReport = require("../../models/QuestionReport");
const User = require("../../models/User");
const { isAdminOrTeacher } = require("../../utils/userHelpers");
const log = require("../../utils/logger").scope("COHORT-REPORTS");

// Question Report Routes
// Create a new question report
const createReport = async (req, res) => {
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
    log.error("Error creating question report:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all reports for a question (for both users and admins)
const getQuestionReports = async (req, res) => {
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
    log.error("Error fetching question reports:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all reports for a cohort (admin only)
const getCohortReports = async (req, res) => {
  try {
    const { cohortId } = req.params;

    const reports = await QuestionReport.find({ cohort: cohortId })
      .populate("user", "name email")
      .populate("question", "title type")
      .populate("module", "title")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    log.error("Error fetching cohort reports:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Update a report (admin only)
const updateReport = async (req, res) => {
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
        log.error(
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
    log.error("Error updating report:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete a report
const deleteReport = async (req, res) => {
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
    log.error("Error deleting report:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  createReport,
  getQuestionReports,
  getCohortReports,
  updateReport,
  deleteReport,
};
