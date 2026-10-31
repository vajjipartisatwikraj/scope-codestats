/**
 * Access list controller (admins only): who may sign in when LOGIN_MODE=allowlist.
 *
 * Wired to URLs in routes/accessList.js, which applies the login and admin checks. The rules
 * live in services/accessListService.js. The admin is always taken from the JWT (`req.user`).
 */
const accessList = require("../services/accessListService");
const { loginMode } = require("../config/loginAccess");
const { ServiceError, respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("ACCESS-LIST");

// Runs a service call and sends its result, or the error it raised.
const handle = (action, work, successStatus = 200) => async (req, res) => {
  try {
    res.status(successStatus).json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

/** Closes the live connections of people who were just taken off the list. */
function disconnectSockets(req, userIds) {
  const io = req.app.get("io");
  if (!io) return;
  for (const id of userIds) io.in(`user:${id}`).disconnectSockets(true);
}

// The list, with the current login mode so the page can say when the list is not in use
const list = handle("listing the access list", async (req) => ({
  loginMode: loginMode(),
  ...(await accessList.list({
    search: req.query.search,
    role: req.query.role,
    page: req.query.page,
    pageSize: req.query.pageSize,
  })),
}));

// Add one address: { email, role?, note? }
const addOne = handle(
  "adding to the access list",
  async (req) => {
    const result = await accessList.addMany([req.body || {}], { adminId: req.user.id, source: "manual" });
    if (result.invalidCount > 0) throw new ServiceError(400, result.invalid[0].reason);
    if (result.added === 0) throw new ServiceError(409, "That address is already on the list");
    return { message: "Address added", ...result };
  },
  201
);

// Add many (a CSV the page has read): { entries: [{ email, role?, note? }] }
const addBulk = handle("adding many addresses to the access list", (req) =>
  accessList.addMany(req.body?.entries, { adminId: req.user.id, source: "csv" })
);

// Add every existing student and teacher account
const importExisting = handle("importing the existing accounts", (req) =>
  accessList.importExistingAccounts({ adminId: req.user.id })
);

// Change the role of one entry: { role: "student" | "teacher" }
const setRole = handle("changing a role on the access list", (req) =>
  accessList.setRole(req.params.id, req.body?.role)
);

// Remove addresses: { ids: [] }
const remove = handle("removing from the access list", async (req) => {
  const result = await accessList.remove(req.body?.ids);
  disconnectSockets(req, result.userIds);
  return { message: "Removed from the list", removed: result.removed };
});

module.exports = { list, addOne, addBulk, importExisting, setRole, remove };
