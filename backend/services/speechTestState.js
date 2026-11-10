/**
 * Small, pure helpers about where a speech test and a student's attempt stand.
 */
const mongoose = require("mongoose");

const { ObjectId } = mongoose.Types;

/** True only for a canonical 24-character ObjectId string. */
const isValidId = (value) =>
  ObjectId.isValid(String(value)) && String(new ObjectId(String(value))) === String(value);

/** Where "now" falls in the test window: "upcoming", "live" or "ended". */
function windowState(test, now = new Date()) {
  if (now < new Date(test.startTime)) return "upcoming";
  if (now >= new Date(test.endTime)) return "ended";
  return "live";
}

/** The attempt's progress record for one section, or undefined. */
const attemptSectionOf = (attempt, sectionId) =>
  attempt.sections.find((s) => String(s.sectionId) === String(sectionId));

module.exports = { isValidId, windowState, attemptSectionOf };
