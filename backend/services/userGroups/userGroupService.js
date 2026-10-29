/**
 * User groups: creating, reading, changing and deleting them.
 *
 * Attaching groups is in cohortGroupService.js and testGroupService.js. The rule that ties
 * them together: while a group is attached to a cohort or a communication test its members
 * cannot be removed and it cannot be deleted. Detach it first.
 */
const Cohort = require("../../models/Cohort");
const SpeechTest = require("../../models/SpeechTest");
const UserGroup = require("../../models/UserGroup");
const cohortGroupService = require("./cohortGroupService");
const testGroupService = require("./testGroupService");
const { MAX_GROUP_SIZE, normalizeRollNumbers, resolveMembers } = require("./rollNumberService");
const { ServiceError } = require("../../utils/ServiceError");

const DUPLICATE_KEY = 11000;

function cleanName(name) {
  const text = typeof name === "string" ? name.trim() : "";
  if (!text) throw new ServiceError(400, "A name is required for the user group");
  if (text.length > 100) throw new ServiceError(400, "The name can have at most 100 characters");
  return text;
}

function cleanDescription(description) {
  const text = typeof description === "string" ? description.trim() : "";
  if (text.length > 500) {
    throw new ServiceError(400, "The description can have at most 500 characters");
  }
  return text;
}

/** Save, turning a duplicate name into a readable error. */
async function saveGroup(group) {
  try {
    return await group.save();
  } catch (err) {
    if (err.code === DUPLICATE_KEY) {
      throw new ServiceError(409, `A user group named "${group.name}" already exists`, {
        reason: "duplicate_name",
      });
    }
    throw err;
  }
}

async function getGroupOrFail(groupId, projection = "") {
  if (!/^[a-f\d]{24}$/i.test(String(groupId))) {
    throw new ServiceError(404, "User group not found");
  }
  const group = await UserGroup.findById(groupId).select(projection);
  if (!group) throw new ServiceError(404, "User group not found");
  return group;
}

/** The 409 for actions that need the group to be detached first. */
async function refuseIfAttached(group, action) {
  const [cohorts, tests] = await Promise.all([
    cohortGroupService.findAttachedCohorts(group._id),
    testGroupService.findAttachedTests(group._id),
  ]);
  if (cohorts.length === 0 && tests.length === 0) return;

  const places = [];
  if (cohorts.length) places.push(`${cohorts.length} cohort(s)`);
  if (tests.length) places.push(`${tests.length} communication test(s)`);
  throw new ServiceError(
    409,
    `"${group.name}" is attached to ${places.join(" and ")}. Detach it before you ${action}.`,
    {
      reason: "attached_to_cohorts",
      cohorts: cohorts.map((c) => ({ _id: c._id, title: c.title })),
      tests: tests.map((t) => ({ _id: t._id, title: t.title })),
    }
  );
}

const summaryOf = (group) => ({
  _id: group._id,
  name: group.name,
  description: group.description,
  memberCount: group.rollNumbers.length,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});

/** All groups, newest first, with how many roll numbers and cohorts each has. */
async function listGroups() {
  const groups = await UserGroup.aggregate([
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        memberCount: { $size: "$rollNumbers" },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  const usage = await Cohort.aggregate([
    { $match: { userGroups: { $in: groups.map((g) => g._id) } } },
    { $unwind: "$userGroups" },
    { $group: { _id: "$userGroups", cohortCount: { $sum: 1 } } },
  ]);
  const cohortCounts = new Map(usage.map((u) => [String(u._id), u.cohortCount]));

  const testUsage = await SpeechTest.aggregate([
    { $match: { userGroups: { $in: groups.map((g) => g._id) } } },
    { $unwind: "$userGroups" },
    { $group: { _id: "$userGroups", testCount: { $sum: 1 } } },
  ]);
  const testCounts = new Map(testUsage.map((u) => [String(u._id), u.testCount]));

  return groups.map((g) => ({
    ...g,
    cohortCount: cohortCounts.get(String(g._id)) || 0,
    testCount: testCounts.get(String(g._id)) || 0,
  }));
}

/** One group with its roll numbers matched to accounts and the cohorts it is attached to. */
async function getGroupDetails(groupId) {
  const group = await getGroupOrFail(groupId);
  const [{ users, unmatched }, cohorts, tests] = await Promise.all([
    resolveMembers(group.rollNumbers),
    cohortGroupService.findAttachedCohorts(group._id),
    testGroupService.findAttachedTests(group._id),
  ]);

  return {
    group: summaryOf(group),
    members: users,
    unmatchedRollNumbers: unmatched,
    cohorts: cohorts.map((c) => ({ _id: c._id, title: c.title, isActive: c.isActive, isDraft: c.isDraft })),
    tests: tests.map((t) => ({ _id: t._id, title: t.title, isPublished: t.isPublished })),
  };
}

async function createGroup({ name, description, rollNumbers, userId }) {
  const normalized = normalizeRollNumbers(rollNumbers ?? []);
  if (normalized.rollNumbers.length === 0) {
    throw new ServiceError(400, "Add at least one roll number to create a user group");
  }

  const group = await saveGroup(
    new UserGroup({
      name: cleanName(name),
      description: cleanDescription(description),
      rollNumbers: normalized.rollNumbers,
      createdBy: userId,
    })
  );

  return {
    group: summaryOf(group),
    import: { blankRows: normalized.blankRows, duplicatesInFile: normalized.duplicates },
  };
}

async function updateGroup(groupId, { name, description }) {
  const group = await getGroupOrFail(groupId);
  if (name !== undefined) group.name = cleanName(name);
  if (description !== undefined) group.description = cleanDescription(description);
  await saveGroup(group);
  return { group: summaryOf(group) };
}

/**
 * Add roll numbers. Cohorts and tests the group is attached to get the new students right
 * away; a cohort that cannot take them (a clone conflict) is reported and can be synced later.
 */
async function addMembers(groupId, rollNumbers) {
  const group = await getGroupOrFail(groupId);
  const incoming = normalizeRollNumbers(rollNumbers);

  const known = new Set(group.rollNumbers.map((r) => r.toLowerCase()));
  const fresh = incoming.rollNumbers.filter((r) => !known.has(r.toLowerCase()));

  if (group.rollNumbers.length + fresh.length > MAX_GROUP_SIZE) {
    throw new ServiceError(400, `A user group can hold at most ${MAX_GROUP_SIZE} roll numbers`);
  }

  if (fresh.length > 0) {
    group.rollNumbers.push(...fresh);
    await group.save();
  }

  const cohorts = fresh.length > 0 ? await cohortGroupService.syncAttachedCohorts(group._id) : [];
  const tests = fresh.length > 0 ? await testGroupService.syncAttachedTests(group._id) : [];

  return {
    group: summaryOf(group),
    added: fresh.length,
    alreadyInGroup: incoming.rollNumbers.length - fresh.length,
    blankRows: incoming.blankRows,
    duplicatesInFile: incoming.duplicates,
    cohorts,
    tests,
  };
}

/** Remove roll numbers. Only for groups nothing uses, because removing would revoke access. */
async function removeMembers(groupId, rollNumbers) {
  const group = await getGroupOrFail(groupId);
  await refuseIfAttached(group, "remove roll numbers from it");

  const doomed = new Set(normalizeRollNumbers(rollNumbers).rollNumbers.map((r) => r.toLowerCase()));
  const before = group.rollNumbers.length;
  group.rollNumbers = group.rollNumbers.filter((r) => !doomed.has(r.toLowerCase()));
  if (group.rollNumbers.length === 0) {
    throw new ServiceError(400, "A user group needs at least one roll number. Delete the group instead.");
  }
  await group.save();

  return { group: summaryOf(group), removed: before - group.rollNumbers.length };
}

async function deleteGroup(groupId) {
  const group = await getGroupOrFail(groupId);
  await refuseIfAttached(group, "delete it");
  await group.deleteOne();
  return { message: `User group "${group.name}" deleted` };
}

module.exports = {
  listGroups,
  getGroupDetails,
  createGroup,
  updateGroup,
  addMembers,
  removeMembers,
  deleteGroup,
};
