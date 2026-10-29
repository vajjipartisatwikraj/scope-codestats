/**
 * Teacher access requests controller.
 *
 *   Signed-in person   getMine, submit
 *   Admin only         list, pendingCount, approve, reject
 *
 * Wired to URLs in routes/teacherRequests.js, which decides who may call what. The
 * rules live in services/teacherRequestService.js. The person is always taken from the
 * JWT (`req.user`), never from the request body.
 */
const User = require("../models/User");
const teacherRequestService = require("../services/teacherRequestService");
const { ServiceError, respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("TEACHER-REQUESTS");

// Runs a service call and sends its result, or the error it raised.
const handle = (action, work, successStatus = 200) => async (req, res) => {
  try {
    res.status(successStatus).json(await work(req));
  } catch (err) {
    respondWithError(res, err, log, action);
  }
};

const getMine = handle("reading the teacher request status", async (req) => {
  const user = await User.findById(req.user.id).select("userType signupIntent");
  if (!user) throw new ServiceError(404, "User not found");
  return teacherRequestService.statusFor(user);
});

const submit = handle(
  "submitting a teacher request",
  (req) => teacherRequestService.submitRequest(req.user.id, { note: req.body?.note }),
  201
);

const list = handle("listing teacher requests", (req) =>
  teacherRequestService.listRequests({ status: req.query.status })
);

const pendingCount = handle("counting pending teacher requests", () =>
  teacherRequestService.pendingCount()
);

const approve = handle("approving a teacher request", (req) =>
  teacherRequestService.approve(req.params.id, req.user.id)
);

const reject = handle("rejecting a teacher request", (req) =>
  teacherRequestService.reject(req.params.id, req.user.id, { reason: req.body?.reason })
);

module.exports = { getMine, submit, list, pendingCount, approve, reject };
