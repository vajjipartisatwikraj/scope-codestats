/**
 * Analytics controller.
 *
 * Cohort statistics, progress, the leaderboard (students, teachers and admins who took part), and the exam report export.
 *
 * Wired to URLs in routes/cohorts/analytics.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const Module = require("../../models/Module");
const Question = require("../../models/Question");
const UserCohort = require("../../models/UserCohort");
const cohortProctorService = require("../../services/cohortProctorService");
const { buildExamReportWorkbook, buildExportFilename } = require("../../services/examReportExcelService");
const { syncStaffEnrollments } = require("../../services/cohorts/staffParticipationService");
const log = require("../../utils/logger").scope("COHORT-ANALYTICS");

// Get statistics for a cohort
const getCohortStats = async (req, res) => {
  try {
    const cohortId = req.params.id;

    // Find the cohort
    const cohort = await Cohort.findById(cohortId);
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }

    // Get total eligible users for this cohort
    // Get users who have enrolled in the cohort
    const enrolledUsers = await UserCohort.countDocuments({ cohort: cohortId });

    // A global cohort has no eligible list: everyone who joined is the total.
    const totalEnrolled =
      cohort.accessType === "global" ? enrolledUsers : cohort.eligibleUsers?.length || 0;

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
    log.error("Error fetching cohort statistics:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get simple progress for a cohort (just counts - super fast)
// ✅ SHARED CONTENT MODEL: Works for both original and cloned cohorts
const getCohortProgress = async (req, res) => {
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
    log.error("Error fetching cohort progress:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get leaderboard for a cohort
const getCohortLeaderboard = async (req, res) => {
  try {
    const cohortId = req.params.cohortId;

    // Get the cohort leaderboard: students, and the teachers and admins who took part
    const cohort = await Cohort.findById(cohortId).select("modules");
    if (cohort) await syncStaffEnrollments(cohort);
    const leaderboard = await UserCohort.find({ cohort: cohortId })
      .sort({ totalScore: -1 })
      .populate({
        path: "user",
        select:
          "name rollNumber email department section graduatingYear graduationYear userType profilePicture",
      });

    // Filter out entries where the account no longer exists
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
        // "user", "teacher" or "admin": the screens mark a teacher or admin and the exports have a Role column
        userType: entry.user.userType,
      },
      totalScore: entry.totalScore,
      completedModules: entry.moduleProgress.filter((mp) => mp.completed)
        .length,
      status: entry.status,
    }));

    res.json(formattedLeaderboard);
  } catch (err) {
    log.error("Error fetching leaderboard:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Question-wise progress of every person in a cohort, for the progress export: the questions in the
// order of the modules, and for each person with an enrollment their score, attempts and whether
// they solved each question they tried.
const getCohortQuestionProgress = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id).select("modules");
    if (!cohort) {
      return res.status(404).json({ message: "Cohort not found" });
    }
    await syncStaffEnrollments(cohort);

    const modules = await Module.find({ _id: { $in: cohort.modules || [] } })
      .sort({ order: 1 })
      .select("title questions")
      .lean();
    const questions = await Question.find({ module: { $in: modules.map((module) => module._id) } })
      .select("title marks module")
      .lean();

    // Questions in the order of their module, and inside a module in the order the module lists them
    const ordered = [];
    for (const module of modules) {
      const position = new Map((module.questions || []).map((id, index) => [String(id), index]));
      questions
        .filter((question) => String(question.module) === String(module._id))
        .sort((a, b) => (position.get(String(a._id)) ?? 1e9) - (position.get(String(b._id)) ?? 1e9))
        .forEach((question) =>
          ordered.push({ _id: question._id, title: question.title, marks: question.marks || 0, moduleTitle: module.title })
        );
    }

    const enrollments = await UserCohort.find({ cohort: cohort._id }).select("user questionProgress").lean();
    const progress = {};
    for (const enrollment of enrollments) {
      const row = {};
      for (const entry of enrollment.questionProgress || []) {
        row[String(entry.question)] = {
          score: entry.bestScore || 0,
          attempts: entry.attempts || 0,
          solved: Boolean(entry.solved),
        };
      }
      progress[String(enrollment.user)] = row;
    }

    res.json({ questions: ordered, progress });
  } catch (err) {
    log.error("Error fetching question-wise progress:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * PROCTORING — download the exam results workbook.
 *
 * Streams a styled .xlsx with the summary, per-student results, module and
 * question breakdowns. Exam cohorts only.
 */
const exportExamReport = async (req, res) => {
  try {
    const report = await cohortProctorService.buildExamReport(req.params.id);
    const buffer = await buildExamReportWorkbook(report);
    const filename = buildExportFilename(report);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(Buffer.from(buffer));

    log.debug(
      `📊 Exam report exported for cohort ${req.params.id} ` +
        `(${report.students.length} students) by ${req.user.id}`
    );
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    log.error("Error exporting exam report:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getCohortStats,
  getCohortProgress,
  getCohortLeaderboard,
  getCohortQuestionProgress,
  exportExamReport,
};
