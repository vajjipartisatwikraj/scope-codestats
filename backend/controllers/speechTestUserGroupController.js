/**
 * Communication test user groups controller: which user groups are attached to a test.
 * The students in them are the test's eligible students.
 *
 * Wired to URLs in routes/speechTests.js (/admin/:id/user-groups), which also applies the
 * login and admin checks.
 */
const SpeechTest = require("../models/SpeechTest");
const testGroupService = require("../services/userGroups/testGroupService");
const { ServiceError, respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("TEST-USER-GROUPS");

async function loadTest(testId) {
  const test = /^[a-f\d]{24}$/i.test(String(testId)) ? await SpeechTest.findById(testId) : null;
  if (!test) throw new ServiceError(404, "Test not found");
  return test;
}

// Runs a service call that answers { status, body } and sends it.
const handle = (action, work) => async (req, res) => {
  try {
    const test = await loadTest(req.params.id);
    const result = await work(test, req);
    res.status(result.status).json(result.body);
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

const listTestUserGroups = handle("listing the user groups of a test", async (test) => ({
  status: 200,
  body: await testGroupService.listTestGroups(test),
}));

const attachUserGroup = handle("attaching a user group to a test", (test, req) =>
  testGroupService.attachGroup({ test, groupId: req.params.groupId })
);

const detachUserGroup = handle("detaching a user group from a test", (test, req) =>
  testGroupService.detachGroup({
    test,
    groupId: req.params.groupId,
    preview: req.query.preview === "true",
  })
);

const syncUserGroups = handle("syncing the user groups of a test", (test) =>
  testGroupService.syncTest(test)
);

module.exports = {
  listTestUserGroups,
  attachUserGroup,
  detachUserGroup,
  syncUserGroups,
};
