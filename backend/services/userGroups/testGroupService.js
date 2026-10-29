/**
 * Attaching user groups to communication (speech) tests.
 *
 * Same idea as for cohorts (see membershipService.js), but simpler: a test has no clone
 * family, and a student who loses access keeps their attempts. The attempts are just no
 * longer reachable, as before. Only real student accounts can be eligible; the roll
 * number matching already leaves out admins and teachers.
 */
const SpeechTest = require("../../models/SpeechTest");
const User = require("../../models/User");
const UserGroup = require("../../models/UserGroup");
const {
  memberIdsOf,
  eligibleListFor,
  loadGroup,
  describeAttachedGroups,
} = require("./membershipService");
const { ServiceError } = require("../../utils/ServiceError");

const idOf = (value) => String(value);

/** Tests a group is attached to. */
function findAttachedTests(groupId) {
  return SpeechTest.find({ userGroups: groupId }).select("title isPublished").lean();
}

/** The groups attached to a test and how many students it has. */
async function listTestGroups(test) {
  return {
    title: test.title,
    userGroups: await describeAttachedGroups(test),
    totalEligibleUsers: test.eligibleUsers.length,
  };
}

/**
 * Save a new eligible list and attached groups. With `preview` nothing is saved; the
 * answer lists the students who would lose access.
 * @returns {Promise<{status: number, body: object}>}
 */
async function applyList({ test, userIds, userGroupIds, preview = false }) {
  const current = new Set(test.eligibleUsers.map(idOf));
  const target = [...new Set(userIds.map(idOf))];
  const targetSet = new Set(target);
  const added = target.filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !targetSet.has(id));

  if (preview) {
    const users = await User.find({ _id: { $in: removed } }).select("name email rollNumber");
    return {
      status: 200,
      body: {
        action: "remove_users_from_eligibility",
        preview: true,
        usersToRemove: removed.length,
        userDetails: users.map((u) => ({
          userId: u._id,
          userName: u.name,
          userEmail: u.email,
          rollNumber: u.rollNumber,
        })),
        // No student data is deleted for a test; their attempts are kept.
        totalDataToDelete: null,
        message:
          removed.length === 0
            ? "No students would lose access."
            : `${removed.length} student(s) will no longer see this test. Their attempts are kept.`,
      },
    };
  }

  test.eligibleUsers = target;
  if (userGroupIds) test.userGroups = userGroupIds;
  await test.save();

  return {
    status: 200,
    body: {
      message: "Eligible students updated",
      totalEligibleUsers: target.length,
      usersAdded: added.length,
      usersRemoved: removed.length,
    },
  };
}

async function attachGroup({ test, groupId }) {
  const group = await loadGroup(groupId);

  if (test.userGroups.some((id) => idOf(id) === idOf(group._id))) {
    throw new ServiceError(409, `"${group.name}" is already attached to this test`, {
      reason: "already_attached",
    });
  }

  const nextGroups = [
    ...(await UserGroup.find({ _id: { $in: test.userGroups } }).select("rollNumbers")),
    group,
  ];
  const userIds = await eligibleListFor(test, nextGroups);
  const result = await applyList({
    test,
    userIds,
    userGroupIds: nextGroups.map((g) => g._id),
  });
  result.body.message = `"${group.name}" attached to "${test.title}"`;
  return result;
}

async function detachGroup({ test, groupId, preview = false }) {
  if (!test.userGroups.some((id) => idOf(id) === idOf(groupId))) {
    throw new ServiceError(404, "That user group is not attached to this test");
  }
  const group = await loadGroup(groupId);

  const remaining = await UserGroup.find({
    _id: { $in: test.userGroups.filter((id) => idOf(id) !== idOf(groupId)) },
  }).select("rollNumbers");
  const userIds = await eligibleListFor(test, remaining);

  const result = await applyList({
    test,
    userIds,
    userGroupIds: remaining.map((g) => g._id),
    preview,
  });
  if (!preview) result.body.message = `"${group.name}" detached from "${test.title}"`;
  return result;
}

/** Add students who joined the attached groups or registered since. Never removes anyone. */
async function syncTest(test) {
  const groups = await UserGroup.find({ _id: { $in: test.userGroups } }).select("rollNumbers");
  const members = await memberIdsOf(groups);
  const userIds = [...new Set([...test.eligibleUsers.map(idOf), ...members])];

  const result = await applyList({ test, userIds });
  result.body.message =
    result.body.usersAdded > 0
      ? `${result.body.usersAdded} student(s) added from the attached groups`
      : "Already up to date";
  return result;
}

/** Sync every test a group is attached to. One failing does not stop the others. */
async function syncAttachedTests(groupId) {
  const attached = await SpeechTest.find({ userGroups: groupId });
  const outcomes = [];

  for (const test of attached) {
    try {
      const { body } = await syncTest(test);
      outcomes.push({
        testId: test._id,
        title: test.title,
        status: "synced",
        usersAdded: body.usersAdded,
      });
    } catch (err) {
      outcomes.push({ testId: test._id, title: test.title, status: "failed", message: err.message });
    }
  }
  return outcomes;
}

module.exports = {
  findAttachedTests,
  listTestGroups,
  attachGroup,
  detachGroup,
  syncTest,
  syncAttachedTests,
};
