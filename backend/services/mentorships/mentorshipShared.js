/**
 * Small pieces the mentorship services share: id and text checks, the fields of a student that are
 * shown, and the short form of an id for log lines.
 */
const { ServiceError } = require("../../utils/ServiceError");

/** The fields of a student's account that a mentor sees. */
const STUDENT_FIELDS = "name email rollNumber department section graduatingYear";

/** The most students one teacher can hold in one mentorship. */
const MAX_ROSTER_SIZE = 5000;

/** Last 6 characters of an id: enough to match a log line to a record without printing the whole id. */
const shortId = (id) => String(id).slice(-6);

const isObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value));

/** Throws a 404 with `message` when `value` cannot be an id. */
function assertObjectId(value, message) {
  if (!isObjectId(value)) throw new ServiceError(404, message);
}

/**
 * A trimmed text with a length limit.
 * @param {{label: string, max: number, required?: boolean}} rules
 */
function cleanText(value, { label, max, required = false }) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new ServiceError(400, `${label} is required`);
  if (text.length > max) throw new ServiceError(400, `${label} can have at most ${max} characters`);
  return text;
}

/** A list of ids without repeats, or a 400 when it is not a list of valid ids. */
function cleanIdList(value, { label, max }) {
  if (!Array.isArray(value)) throw new ServiceError(400, `${label} must be a list`);
  if (value.length > max) throw new ServiceError(400, `${label} can have at most ${max} entries`);
  const ids = [...new Set(value.map((item) => String(item)))];
  if (ids.some((id) => !isObjectId(id))) throw new ServiceError(400, `${label} has an entry that is not valid`);
  return ids;
}

module.exports = { STUDENT_FIELDS, MAX_ROSTER_SIZE, shortId, isObjectId, assertObjectId, cleanText, cleanIdList };
