/**
 * Attaching user groups to cohorts.
 *
 * Attach, detach and sync work out the cohort's new full eligible list (see
 * membershipService.js) and hand it to services/cohorts/eligibilityService.applyEligibleUsers,
 * which checks the clone rules and does the cleanup for students who lose access.
 */
const Cohort = require("../../models/Cohort");
const UserGroup = require("../../models/UserGroup");
const { applyEligibleUsers } = require("../cohorts/eligibilityService");
const {
  memberIdsOf,
  eligibleListFor,
  loadGroup,
  attachedGroupsOf,
  describeAttachedGroups,
} = require("./membershipService");
const { ServiceError } = require("../../utils/ServiceError");

const idOf = (value) => String(value);

/** Cohorts a group is attached to. */
function findAttachedCohorts(groupId) {
  return Cohort.find({ userGroups: groupId }).select("title isActive isDraft").lean();
}

/** The groups attached to a cohort, with how many roll numbers each one has. */
async function listCohortGroups(cohort) {
  return {
    userGroups: await describeAttachedGroups(cohort),
    totalEligibleUsers: cohort.eligibleUsers.length,
  };
}
/**
 * Attach a group: its members become eligible.
 * @returns {Promise<{status: number, body: object}>}
 */
async function attachGroup({ cohort, groupId, preview = false }) {
  const group = await loadGroup(groupId);

  if (cohort.userGroups.some((id) => idOf(id) === idOf(group._id))) {
    throw new ServiceError(409, `"${group.name}" is already attached to this cohort`, {
      reason: "already_attached",
    });
  }

  const nextGroups = [
    ...(await UserGroup.find({ _id: { $in: cohort.userGroups } }).select("rollNumbers")),
    group,
  ];
  const userIds = await eligibleListFor(cohort, nextGroups);

  const result = await applyEligibleUsers({
    cohort,
    userIds,
    userGroupIds: nextGroups.map((g) => g._id),
    preview,
  });

  if (result.status === 200 && !preview) {
    result.body.message = `"${group.name}" attached to "${cohort.title}"`;
  }
  return result;
}

/**
 * Detach a group: members who are not covered by another attached group lose access
 * and their data for this cohort is deleted. Use `preview` to see what that is.
 * @returns {Promise<{status: number, body: object}>}
 */
async function detachGroup({ cohort, groupId, preview = false }) {
  if (!cohort.userGroups.some((id) => idOf(id) === idOf(groupId))) {
    throw new ServiceError(404, "That user group is not attached to this cohort");
  }
  const group = await loadGroup(groupId);

  const remainingGroups = await UserGroup.find({
    _id: { $in: cohort.userGroups.filter((id) => idOf(id) !== idOf(groupId)) },
  }).select("rollNumbers");
  const userIds = await eligibleListFor(cohort, remainingGroups);

  const result = await applyEligibleUsers({
    cohort,
    userIds,
    userGroupIds: remainingGroups.map((g) => g._id),
    preview,
  });

  if (result.status === 200 && !preview) {
    result.body.message = `"${group.name}" detached from "${cohort.title}"`;
  }
  return result;
}

/**
 * Pick up students who joined a group's roll numbers, or registered an account, after
 * the group was attached. Only adds; nobody loses access here.
 * @returns {Promise<{status: number, body: object}>}
 */
async function syncCohort(cohort) {
  const groups = await UserGroup.find({ _id: { $in: cohort.userGroups } }).select("rollNumbers");
  const members = await memberIdsOf(groups);
  const userIds = [...new Set([...cohort.eligibleUsers.map(idOf), ...members])];

  const result = await applyEligibleUsers({ cohort, userIds });
  if (result.status === 200) {
    result.body.message =
      result.body.usersAdded > 0
        ? `${result.body.usersAdded} student(s) added from the attached groups`
        : "Already up to date";
  }
  return result;
}

/**
 * Sync every cohort a group is attached to. One cohort failing (for example a clone
 * conflict) does not stop the others.
 * @returns {Promise<Array<{cohortId, title, status: string, usersAdded?: number, message?: string}>>}
 */
async function syncAttachedCohorts(groupId) {
  const attached = await Cohort.find({ userGroups: groupId });
  const outcomes = [];

  for (const cohort of attached) {
    try {
      const { status, body } = await syncCohort(cohort);
      outcomes.push(
        status === 200
          ? { cohortId: cohort._id, title: cohort.title, status: "synced", usersAdded: body.usersAdded }
          : { cohortId: cohort._id, title: cohort.title, status: "conflict", message: body.message }
      );
    } catch (err) {
      outcomes.push({
        cohortId: cohort._id,
        title: cohort.title,
        status: "failed",
        message: err.message,
      });
    }
  }
  return outcomes;
}

module.exports = {
  findAttachedCohorts,
  attachedGroupsOf,
  listCohortGroups,
  attachGroup,
  detachGroup,
  syncCohort,
  syncAttachedCohorts,
};
