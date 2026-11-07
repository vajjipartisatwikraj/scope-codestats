/**
 * Suspend accounts controller (admin only).
 *
 *   list     accounts with their linked coding profiles, searchable and paged
 *   preview  what suspending one account would delete
 *   suspend  delete the coding profiles and all history of one account
 *
 * Wired to URLs in routes/accountSuspension.js, which applies the login and admin checks.
 * The rules live in services/accountSuspensionService.js.
 */
const service = require("../services/accountSuspensionService");
const { respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("ACCOUNT-SUSPENSION");

const handle = (action, work) => async (req, res) => {
  try {
    res.json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

const list = handle("listing accounts", (req) =>
  service.listAccounts({
    search: req.query.search,
    linkedOnly: req.query.linkedOnly === "true",
    page: req.query.page,
    limit: req.query.limit,
  })
);

const preview = handle("reading an account to suspend", (req) => service.previewSuspension(req.params.userId));

const suspend = handle("suspending an account", async (req) => {
  const result = await service.suspendAccount(req.params.userId, req.user.id);
  return { success: true, message: "Coding accounts removed", ...result };
});

module.exports = { list, preview, suspend };
