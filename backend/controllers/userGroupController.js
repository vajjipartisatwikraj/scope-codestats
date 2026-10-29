/**
 * User groups controller: staff create named lists of roll numbers (from a CSV) that
 * can later be attached to cohorts.
 *
 * Wired to URLs in routes/userGroups.js, which also applies the login and admin checks.
 * The rules live in services/userGroups/userGroupService.js.
 */
const userGroupService = require("../services/userGroups/userGroupService");
const { respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("USER-GROUPS");

// Runs a service call and sends its result, or the error it raised.
const handle = (action, work, successStatus = 200) => async (req, res) => {
  try {
    res.status(successStatus).json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

const listUserGroups = handle("listing user groups", () => userGroupService.listGroups().then((userGroups) => ({ userGroups })));

const getUserGroup = handle("reading a user group", (req) =>
  userGroupService.getGroupDetails(req.params.id)
);

const createUserGroup = handle(
  "creating a user group",
  (req) =>
    userGroupService.createGroup({
      name: req.body?.name,
      description: req.body?.description,
      rollNumbers: req.body?.rollNumbers,
      userId: req.user.id,
    }),
  201
);

const updateUserGroup = handle("updating a user group", (req) =>
  userGroupService.updateGroup(req.params.id, {
    name: req.body?.name,
    description: req.body?.description,
  })
);

const addMembers = handle("adding roll numbers to a user group", (req) =>
  userGroupService.addMembers(req.params.id, req.body?.rollNumbers)
);

const removeMembers = handle("removing roll numbers from a user group", (req) =>
  userGroupService.removeMembers(req.params.id, req.body?.rollNumbers)
);

const deleteUserGroup = handle("deleting a user group", (req) =>
  userGroupService.deleteGroup(req.params.id)
);

module.exports = {
  listUserGroups,
  getUserGroup,
  createUserGroup,
  updateUserGroup,
  addMembers,
  removeMembers,
  deleteUserGroup,
};
