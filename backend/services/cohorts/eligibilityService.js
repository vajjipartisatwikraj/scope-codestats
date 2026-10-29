/**
 * Changing who is eligible for a cohort.
 *
 * `applyEligibleUsers` is the one place that writes `Cohort.eligibleUsers`. It checks
 * the clone rules, shows or performs the cleanup for students who lose access, and
 * saves. Attaching, detaching and syncing user groups
 * (services/userGroups/cohortGroupService.js) all go through it.
 *
 * Clone rule: a cohort and its clones share content, so a student may be eligible in,
 * and enrolled in, only one of them.
 */
const Cohort = require("../../models/Cohort");
const Note = require("../../models/Note");
const QuestionReport = require("../../models/QuestionReport");
const Question = require("../../models/Question");
const Submission = require("../../models/Submission");
const User = require("../../models/User");
const UserCohort = require("../../models/UserCohort");
const cascadeService = require("../cohortCascadeService");
const { runWithOptionalTransaction } = require("../../utils/mongoTransaction");
const log = require("../../utils/logger").scope("COHORT-ELIGIBILITY");

const idOf = (value) => String(value);

/** Turn conflict rows into the grouped shape the UI shows. */
function groupConflictsByCohort(rows) {
  const byCohort = new Map();
  rows.forEach(({ cohortId, cohortTitle, user, status }) => {
    if (!byCohort.has(idOf(cohortId))) {
      byCohort.set(idOf(cohortId), { cohortId, cohortTitle, users: [] });
    }
    byCohort.get(idOf(cohortId)).users.push({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      rollNumber: user.rollNumber,
      ...(status ? { status } : {}),
    });
  });
  return [...byCohort.values()];
}

function conflictText(prefix, conflictsByCohort) {
  let text = prefix;
  conflictsByCohort.forEach((entry) => {
    text += `\n• ${entry.cohortTitle}: ${entry.users.length} user(s)`;
    entry.users.forEach((u) => {
      text += `\n  - ${u.userName} (${u.userEmail})`;
    });
  });
  return text;
}

/**
 * Students being added who are already eligible or enrolled in a related cohort.
 * @returns {Promise<null | {status: number, body: object}>} the 409 answer, or null
 */
async function findCloneConflicts(cohort, addedUserIds) {
  if (addedUserIds.length === 0) return null;

  const related = await cascadeService.getRelatedCohorts(cohort._id);
  const otherIds = related
    .map((c) => c._id)
    .filter((id) => idOf(id) !== idOf(cohort._id));
  if (otherIds.length === 0) return null;

  const added = new Set(addedUserIds.map(idOf));

  // Already eligible in a related cohort
  const others = await Cohort.find({ _id: { $in: otherIds } }).select("title eligibleUsers");
  const eligibleRows = [];
  others.forEach((other) => {
    other.eligibleUsers.forEach((uid) => {
      if (added.has(idOf(uid))) {
        eligibleRows.push({ cohortId: other._id, cohortTitle: other.title, userId: uid });
      }
    });
  });

  if (eligibleRows.length > 0) {
    const users = await User.find({
      _id: { $in: [...new Set(eligibleRows.map((r) => idOf(r.userId)))] },
    }).select("name email rollNumber");
    const byId = new Map(users.map((u) => [idOf(u._id), u]));
    const conflicts = groupConflictsByCohort(
      eligibleRows.map((r) => ({
        ...r,
        user: byId.get(idOf(r.userId)) || {
          _id: r.userId,
          name: "Unknown",
          email: "",
          rollNumber: "",
        },
      }))
    );
    const total = new Set(eligibleRows.map((r) => idOf(r.userId))).size;
    return {
      status: 409,
      body: {
        message: "Some users are already eligible in related cohorts",
        totalConflicts: total,
        conflictsByCohort: conflicts,
        detailedMessage: conflictText(
          `Cannot update eligible users - ${total} user(s) already eligible in related cohorts:\n`,
          conflicts
        ),
        hint: "Users can only be eligible in one cohort from a set of related cohorts (original + clones). Detach the user group from the other cohort first.",
      },
    };
  }

  // Already enrolled in a related cohort
  const enrolled = await UserCohort.find({
    user: { $in: [...added] },
    cohort: { $in: otherIds },
    status: { $in: ["enrolled", "completed"] },
  })
    .populate("user", "name email rollNumber")
    .populate("cohort", "title");

  if (enrolled.length > 0) {
    const conflicts = groupConflictsByCohort(
      enrolled.map((uc) => ({
        cohortId: uc.cohort._id,
        cohortTitle: uc.cohort.title,
        user: uc.user,
        status: uc.status,
      }))
    );
    return {
      status: 409,
      body: {
        message: "Some users are already enrolled in related cohorts",
        totalConflicts: enrolled.length,
        conflictsByCohort: conflicts,
        detailedMessage: conflictText(
          `Cannot update eligible users - ${enrolled.length} user(s) already enrolled in related cohorts:\n`,
          conflicts
        ),
        hint: "Users can only be enrolled in one cohort from a set of related cohorts (original + clones). Remove these users from the group or unenroll them from the other cohort first.",
      },
    };
  }

  return null;
}

/** What removing these students would delete, per student and in total. */
async function previewRemoval(cohort, removedUserIds) {
  const questionIds = (
    await Question.find({ module: { $in: cohort.modules || [] } }).select("_id")
  ).map((q) => q._id);

  const userDetails = await Promise.all(
    removedUserIds.map(async (userId) => {
      const scope = { user: userId, cohort: cohort._id, question: { $in: questionIds } };
      const [submissions, notes, reports, userProgress, user] = await Promise.all([
        Submission.countDocuments(scope),
        Note.countDocuments(scope),
        QuestionReport.countDocuments(scope),
        UserCohort.countDocuments({ user: userId, cohort: cohort._id }),
        User.findById(userId).select("name email rollNumber"),
      ]);
      return {
        userId,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
        rollNumber: user?.rollNumber || "N/A",
        dataToDelete: { submissions, notes, reports, userProgress },
      };
    })
  );

  const total = (key) => userDetails.reduce((sum, u) => sum + u.dataToDelete[key], 0);
  const totalDataToDelete = {
    submissions: total("submissions"),
    notes: total("notes"),
    reports: total("reports"),
    userProgress: total("userProgress"),
  };

  return {
    action: "remove_users_from_eligibility",
    preview: true,
    usersToRemove: removedUserIds.length,
    userDetails,
    totalDataToDelete,
    message: `Removing ${removedUserIds.length} users will delete ${totalDataToDelete.submissions} submissions, ${totalDataToDelete.notes} notes, ${totalDataToDelete.reports} reports, and ${totalDataToDelete.userProgress} progress records.`,
    warning:
      "This action cannot be undone. All user data for this cohort will be permanently deleted.",
  };
}

/**
 * Replace the eligible students of a cohort (and, optionally, its attached groups).
 *
 * Students who are removed lose their data for this cohort. With `preview` nothing is
 * changed; the answer lists what would be deleted.
 *
 * @param {object} args
 * @param {import("mongoose").Document} args.cohort
 * @param {Array<string|ObjectId>} args.userIds the complete new eligible list
 * @param {Array<string|ObjectId>} [args.userGroupIds] new attached groups, saved together with the list
 * @param {boolean} [args.preview]
 * @returns {Promise<{status: number, body: object}>}
 */
async function applyEligibleUsers({ cohort, userIds, userGroupIds, preview = false }) {
  const current = new Set(cohort.eligibleUsers.map(idOf));
  const target = [...new Set(userIds.map(idOf))];
  const targetSet = new Set(target);

  const addedUserIds = target.filter((id) => !current.has(id));
  const removedUserIds = [...current].filter((id) => !targetSet.has(id));

  const conflict = await findCloneConflicts(cohort, addedUserIds);
  if (conflict) return conflict;

  if (preview) {
    if (removedUserIds.length === 0) {
      return {
        status: 200,
        body: {
          action: "remove_users_from_eligibility",
          preview: true,
          usersToRemove: 0,
          userDetails: [],
          totalDataToDelete: { submissions: 0, notes: 0, reports: 0, userProgress: 0 },
          message: "No students would lose access.",
        },
      };
    }
    return { status: 200, body: await previewRemoval(cohort, removedUserIds) };
  }

  log.debug(
    `Cohort "${cohort.title}": +${addedUserIds.length} / -${removedUserIds.length} eligible users`
  );

  const save = async (session) => {
    let stats = null;
    if (removedUserIds.length > 0) {
      stats = await cascadeService.removeMultipleUsersDataFromCohort(
        cohort._id,
        removedUserIds,
        session
      );
    }
    cohort.eligibleUsers = target;
    if (userGroupIds) cohort.userGroups = userGroupIds;
    await cohort.save(session ? { session } : {});
    return stats;
  };

  const cleanupStats =
    removedUserIds.length > 0
      ? (await runWithOptionalTransaction(save, { label: "eligible user cleanup" })).result
      : await save(null);

  return {
    status: 200,
    body: {
      message: "Eligible users updated successfully",
      totalEligibleUsers: target.length,
      usersAdded: addedUserIds.length,
      usersRemoved: removedUserIds.length,
      cleanupStats: cleanupStats || {
        submissionsDeleted: 0,
        notesDeleted: 0,
        reportsDeleted: 0,
        userProgressDeleted: 0,
      },
    },
  };
}

module.exports = { applyEligibleUsers };
