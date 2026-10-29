/**
 * Cohort user groups controller: which user groups are attached to a cohort.
 * Attaching a group makes its students eligible; detaching removes the ones no other
 * attached group covers.
 *
 * Wired to URLs in routes/cohorts/userGroup.routes.js, which also applies the login and
 * admin checks.
 */
const Cohort = require("../../models/Cohort");
const cohortGroupService = require("../../services/userGroups/cohortGroupService");
const { ServiceError, respondWithError } = require("../../utils/ServiceError");
const log = require("../../utils/logger").scope("COHORT-USER-GROUPS");

async function loadCohort(cohortId) {
  const cohort = /^[a-f\d]{24}$/i.test(String(cohortId)) ? await Cohort.findById(cohortId) : null;
  if (!cohort) throw new ServiceError(404, "Cohort not found");
  return cohort;
}

// Runs a service call that answers { status, body } and sends it.
const handle = (action, work) => async (req, res) => {
  try {
    const cohort = await loadCohort(req.params.id);
    const result = await work(cohort, req);
    res.status(result.status).json(result.body);
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

const listCohortUserGroups = handle("listing the user groups of a cohort", async (cohort) => ({
  status: 200,
  body: await cohortGroupService.listCohortGroups(cohort),
}));

const attachUserGroup = handle("attaching a user group", (cohort, req) =>
  cohortGroupService.attachGroup({
    cohort,
    groupId: req.params.groupId,
    preview: req.query.preview === "true",
  })
);

const detachUserGroup = handle("detaching a user group", (cohort, req) =>
  cohortGroupService.detachGroup({
    cohort,
    groupId: req.params.groupId,
    preview: req.query.preview === "true",
  })
);

const syncUserGroups = handle("syncing the user groups of a cohort", (cohort) =>
  cohortGroupService.syncCohort(cohort)
);

module.exports = {
  listCohortUserGroups,
  attachUserGroup,
  detachUserGroup,
  syncUserGroups,
};
