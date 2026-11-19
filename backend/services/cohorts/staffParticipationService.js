/**
 * Teachers and admins take part in a cohort like students do: what they submit is scored, they appear
 * on the cohort leaderboard and in the exports. Students enrol (or are enrolled) before they can
 * submit; staff can open any cohort, so their enrollment is created the first time they submit.
 *
 * Staff submissions made before this existed were saved without an enrollment. syncStaffEnrollments
 * rebuilds those from the saved submissions the first time a cohort's leaderboard or report is read,
 * so nothing has to be run by hand.
 */
const Question = require("../../models/Question");
const Submission = require("../../models/Submission");
const User = require("../../models/User");
const UserCohort = require("../../models/UserCohort");
const log = require("../../utils/logger").scope("COHORT-STAFF");
const { updateCohortLeaderboard } = require("./leaderboardService");

const DUPLICATE_KEY = 11000;
// How long a cohort is trusted to be in sync after it was checked, so reading the leaderboard over and
// over does not repeat the work
const RECHECK_MS = 30 * 1000;
const lastChecked = new Map();

/** A new enrollment with an empty progress entry for every module of the cohort. */
async function createEnrollment(cohort, userId) {
  const moduleProgress = await Promise.all(
    (cohort.modules || []).map(async (moduleId) => ({
      module: moduleId,
      questionsCompleted: 0,
      totalQuestions: await Question.countDocuments({ module: moduleId }),
      score: 0,
      completed: false,
    }))
  );
  return UserCohort.create({
    user: userId,
    cohort: cohort._id,
    status: "enrolled",
    enrolledAt: new Date(),
    moduleProgress,
  });
}

/**
 * The staff member's enrollment in this cohort, created on first use. Two submissions arriving
 * together cannot make two: the unique (user, cohort) index refuses the second, which then reads the
 * first.
 */
async function ensureStaffEnrollment(cohort, userId) {
  const existing = await UserCohort.findOne({ user: userId, cohort: cohort._id });
  if (existing) return existing;
  try {
    return await createEnrollment(cohort, userId);
  } catch (err) {
    if (err.code !== DUPLICATE_KEY) throw err;
    return UserCohort.findOne({ user: userId, cohort: cohort._id });
  }
}

/**
 * Work the progress of one enrollment out again from the user's saved submissions, by the same rules
 * as a live submission: a question is solved by an accepted submission, its score is the best
 * accepted one, a module is complete when all its questions are solved, the total is the sum of the
 * best scores.
 */
async function rebuildProgress(userCohort, cohort) {
  const submissions = await Submission.find({ user: userCohort.user, cohort: cohort._id })
    .select("question status score submittedAt")
    .sort({ submittedAt: 1 })
    .lean();

  const byQuestion = new Map();
  for (const submission of submissions) {
    const key = String(submission.question);
    const entry = byQuestion.get(key) || { question: submission.question, attempts: 0, solved: false, bestScore: 0, solvedAt: null };
    entry.attempts += 1;
    if (submission.status === "accepted") {
      entry.solved = true;
      const score = Number(submission.score) || 0;
      if (score >= entry.bestScore) {
        entry.bestScore = score;
        entry.solvedAt = submission.submittedAt;
      }
    }
    byQuestion.set(key, entry);
  }
  const questionProgress = [...byQuestion.values()];
  const solved = new Map(questionProgress.filter((entry) => entry.solved).map((entry) => [String(entry.question), entry]));

  const moduleIds = cohort.modules || [];
  const questions = await Question.find({ module: { $in: moduleIds } }).select("_id module").lean();
  const moduleProgress = moduleIds.map((moduleId) => {
    const moduleQuestions = questions.filter((question) => String(question.module) === String(moduleId));
    const solvedHere = moduleQuestions.filter((question) => solved.has(String(question._id)));
    const completed = moduleQuestions.length > 0 && solvedHere.length === moduleQuestions.length;
    return {
      module: moduleId,
      questionsCompleted: solvedHere.length,
      totalQuestions: moduleQuestions.length,
      score: solvedHere.reduce((sum, question) => sum + solved.get(String(question._id)).bestScore, 0),
      completed,
      completedAt: completed ? new Date() : null,
    };
  });

  userCohort.questionProgress = questionProgress;
  userCohort.moduleProgress = moduleProgress;
  userCohort.totalScore = questionProgress.filter((entry) => entry.solved).reduce((sum, entry) => sum + entry.bestScore, 0);
  if (moduleProgress.length > 0 && moduleProgress.every((entry) => entry.completed)) {
    userCohort.status = "completed";
    userCohort.completedAt = new Date();
  }
  await userCohort.save();
}

/**
 * Make sure every teacher or admin who submitted in this cohort has an enrollment with their scores.
 * A staff member with submissions and no enrollment (or an enrollment with no progress yet) is rebuilt
 * from those submissions, and the ranks are worked out again if anything changed. Cheap when there is
 * nothing to do: it looks only at the submissions of staff accounts, and a cohort is checked at most
 * once every 30 seconds. A failure is logged and never stops the page that asked.
 *
 *   cohort   the cohort document (needs _id and modules)
 */
async function syncStaffEnrollments(cohort) {
  const key = String(cohort._id);
  const now = Date.now();
  if (now - (lastChecked.get(key) || 0) < RECHECK_MS) return;
  lastChecked.set(key, now);

  try {
    const staff = await User.find({ userType: { $in: ["admin", "teacher"] } }).select("_id").lean();
    if (staff.length === 0) return;
    const submitters = await Submission.distinct("user", { cohort: cohort._id, user: { $in: staff.map((member) => member._id) } });
    if (submitters.length === 0) return;

    const enrollments = await UserCohort.find({ cohort: cohort._id, user: { $in: submitters } }).select("user questionProgress");
    const byUser = new Map(enrollments.map((enrollment) => [String(enrollment.user), enrollment]));

    let changed = 0;
    for (const userId of submitters) {
      let enrollment = byUser.get(String(userId));
      if (enrollment && enrollment.questionProgress.length > 0) continue;
      if (!enrollment) enrollment = await ensureStaffEnrollment(cohort, userId);
      await rebuildProgress(enrollment, cohort);
      changed += 1;
    }

    if (changed > 0) {
      await updateCohortLeaderboard(cohort._id);
      log.info(`rebuilt the progress of ${changed} teacher or admin enrollment(s) from their submissions`, { cohort: key.slice(-6) });
    }
  } catch (err) {
    lastChecked.delete(key);
    log.error("Could not bring teacher and admin enrollments up to date:", err);
  }
}

module.exports = { ensureStaffEnrollment, syncStaffEnrollments, rebuildProgress };
