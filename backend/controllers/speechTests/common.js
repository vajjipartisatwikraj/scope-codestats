/**
 * Pieces shared by the speech test controllers: error handling and the lookups that
 * every student request starts with.
 */
const SpeechTest = require("../../models/SpeechTest");
const speechJudge = require("../../services/speechJudgeClient");
const { ServiceError } = require("../../utils/ServiceError");
const { isValidId } = require("../../services/speechTestState");
const log = require("../../utils/logger").scope("SPEECH-TESTS");

/** Sends the response for anything a handler threw. */
function sendError(res, error) {
  if (error instanceof ServiceError) {
    return res.status(error.status).json(error.body);
  }
  if (error instanceof speechJudge.SpeechJudgeError) {
    return res.status(error.status || 400).json({ message: error.message, code: error.code });
  }
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: first?.message || error.message });
  }
  log.error("[SpeechTest] route error:", error);
  return res.status(500).json({ message: "Server error", error: error.message });
}

/** Wraps a handler so `throw new ServiceError(...)` (or any error) becomes a JSON response. */
const handle = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    sendError(res, error);
  }
};

const isStaff = (req) => req.user.userType === "admin" || req.user.userType === "teacher";

/** Loads a test a student may open: published and they are on the eligible list. */
async function loadStudentTest(req) {
  if (!isValidId(req.params.id)) throw new ServiceError(404, "Test not found");

  const test = await SpeechTest.findOne({
    _id: req.params.id,
    isPublished: true,
    eligibleUsers: req.user.id,
  });
  if (!test) throw new ServiceError(404, "Test not found or you are not eligible for it");
  return test;
}

/** Loads any test by the `:id` parameter, for staff. Optionally limits the fields read. */
async function loadTestById(req, { select, lean = false } = {}) {
  if (!isValidId(req.params.id)) throw new ServiceError(404, "Test not found");
  let query = SpeechTest.findById(req.params.id);
  if (select) query = query.select(select);
  if (lean) query = query.lean();
  const test = await query;
  if (!test) throw new ServiceError(404, "Test not found");
  return test;
}

function findSection(test, sectionId) {
  if (!isValidId(sectionId)) throw new ServiceError(404, "Section not found");
  const section = test.sections.find((s) => String(s._id) === String(sectionId));
  if (!section) throw new ServiceError(404, "Section not found");
  return section;
}

module.exports = { handle, sendError, isStaff, loadStudentTest, loadTestById, findSection, log };
