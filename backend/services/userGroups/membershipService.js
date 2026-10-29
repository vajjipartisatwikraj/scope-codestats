/**
 * Working out eligible students from attached user groups. Shared by everything that
 * groups can be attached to (cohorts, communication tests): any document with an
 * `eligibleUsers` list and a `userGroups` list.
 *
 * The stored `eligibleUsers` list is always:
 *
 *     students added individually (before groups existed)  +  members of attached groups
 *
 * The individually added students are not stored separately. They are whoever is in
 * `eligibleUsers` but not a member of any currently attached group.
 */
const UserGroup = require("../../models/UserGroup");
const { resolveMembers } = require("./rollNumberService");
const { ServiceError } = require("../../utils/ServiceError");

const idOf = (value) => String(value);

/** Student ids of every given group, as one set. */
async function memberIdsOf(groups) {
  const ids = new Set();
  for (const group of groups) {
    const { users } = await resolveMembers(group.rollNumbers);
    users.forEach((u) => ids.add(idOf(u._id)));
  }
  return ids;
}

/**
 * The full eligible list `target` should have once its attached groups become
 * `nextGroups`. Students who were added individually are kept.
 */
async function eligibleListFor(target, nextGroups) {
  const currentGroups = await UserGroup.find({ _id: { $in: target.userGroups } }).select(
    "rollNumbers"
  );
  const currentMembers = await memberIdsOf(currentGroups);
  const nextMembers = await memberIdsOf(nextGroups);

  const individuallyAdded = target.eligibleUsers
    .map(idOf)
    .filter((id) => !currentMembers.has(id));

  return [...new Set([...individuallyAdded, ...nextMembers])];
}

async function loadGroup(groupId) {
  const group = /^[a-f\d]{24}$/i.test(String(groupId))
    ? await UserGroup.findById(groupId).select("name rollNumbers")
    : null;
  if (!group) throw new ServiceError(404, "User group not found");
  return group;
}

/** Id and name of each group attached to `target`. Empty when none are. */
async function attachedGroupsOf(target) {
  if (!target.userGroups || target.userGroups.length === 0) return [];
  const groups = await UserGroup.find({ _id: { $in: target.userGroups } })
    .select("name")
    .sort({ name: 1 })
    .lean();
  return groups.map((g) => ({ _id: g._id, name: g.name }));
}

/** The groups attached to `target`, with how many roll numbers each one has. */
async function describeAttachedGroups(target) {
  const groups = await UserGroup.find({ _id: { $in: target.userGroups } })
    .select("name description rollNumbers")
    .sort({ name: 1 })
    .lean();

  return groups.map((g) => ({
    _id: g._id,
    name: g.name,
    description: g.description,
    memberCount: g.rollNumbers.length,
  }));
}

module.exports = {
  memberIdsOf,
  eligibleListFor,
  loadGroup,
  attachedGroupsOf,
  describeAttachedGroups,
};
