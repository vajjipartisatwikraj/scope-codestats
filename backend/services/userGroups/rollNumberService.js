/**
 * Roll number handling for user groups: cleaning what an admin uploads, and matching
 * stored roll numbers to user accounts.
 *
 * Matching itself (case-insensitive, indexed first, staff excluded) lives in
 * utils/resolveRollNumbers.js and is shared with speech tests.
 */
const { resolveRollNumbers, MAX_ROLL_NUMBERS } = require("../../utils/resolveRollNumbers");
const { ServiceError } = require("../../utils/ServiceError");

/** Upper bound for the roll numbers one group may hold. */
const MAX_GROUP_SIZE = 20000;

/**
 * Trim, drop blanks and remove duplicates ignoring case. Keeps the first spelling of
 * each roll number and the original order.
 *
 * @param {unknown} raw list as sent by the client
 * @returns {{rollNumbers: string[], blankRows: number, duplicates: number}}
 */
function normalizeRollNumbers(raw) {
  if (!Array.isArray(raw)) {
    throw new ServiceError(400, "`rollNumbers` must be an array of roll numbers");
  }
  if (raw.length > MAX_ROLL_NUMBERS) {
    throw new ServiceError(
      400,
      `Too many roll numbers: ${raw.length}. The limit is ${MAX_ROLL_NUMBERS} per upload.`
    );
  }

  const seen = new Set();
  const rollNumbers = [];
  let blankRows = 0;

  raw.forEach((value) => {
    const text = String(value ?? "").trim();
    if (!text) {
      blankRows += 1;
      return;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rollNumbers.push(text);
  });

  return { rollNumbers, blankRows, duplicates: raw.length - blankRows - rollNumbers.length };
}

/**
 * Match roll numbers to student accounts.
 *
 * @param {string[]} rollNumbers already normalized
 * @returns {Promise<{users: object[], unmatched: string[]}>}
 */
async function resolveMembers(rollNumbers) {
  const users = [];
  const unmatched = [];

  // The shared resolver accepts MAX_ROLL_NUMBERS at a time and rejects empty lists.
  for (let i = 0; i < rollNumbers.length; i += MAX_ROLL_NUMBERS) {
    const slice = rollNumbers.slice(i, i + MAX_ROLL_NUMBERS);
    const result = await resolveRollNumbers(slice);
    users.push(...result.matchedUsers);
    unmatched.push(...result.notFoundRollNumbers);
  }

  return { users, unmatched };
}

module.exports = { MAX_GROUP_SIZE, normalizeRollNumbers, resolveMembers };
