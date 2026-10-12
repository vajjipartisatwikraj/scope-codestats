const User = require("../models/User");

const MAX_ROLL_NUMBERS = 5000;

class RollResolveError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "RollResolveError";
    this.status = status;
  }
}

/**
 * Resolves roll numbers (from a CSV or pasted text) into user accounts.
 *
 * Same behaviour and response shape as the cohort eligible-users import, so the
 * shared `RollNumberCsvImport` component works for both. Matching ignores case:
 * an indexed `$in` over the obvious spellings first, then a `$toLower` fallback
 * only for the leftovers so a large class list never becomes a full scan.
 *
 * Read-only: nothing is added anywhere. The caller decides what to do.
 *
 * @param {Array} rollNumbers      raw values as provided by the admin
 * @param {Set<string>} eligibleIds user ids that are already eligible
 */
async function resolveRollNumbers(rollNumbers, eligibleIds = new Set()) {
  if (!Array.isArray(rollNumbers)) {
    throw new RollResolveError("`rollNumbers` must be an array of roll numbers");
  }
  if (rollNumbers.length === 0) {
    throw new RollResolveError("The file contained no roll numbers");
  }
  if (rollNumbers.length > MAX_ROLL_NUMBERS) {
    throw new RollResolveError(
      `Too many roll numbers: ${rollNumbers.length}. The limit is ${MAX_ROLL_NUMBERS} per upload.`
    );
  }

  // Keep the first spelling of each roll so the report echoes the admin's own.
  const originalByKey = new Map();
  let blankCount = 0;

  rollNumbers.forEach((raw) => {
    const text = String(raw ?? "").trim();
    if (!text) {
      blankCount += 1;
      return;
    }
    const key = text.toLowerCase();
    if (!originalByKey.has(key)) originalByKey.set(key, text);
  });

  const keys = [...originalByKey.keys()];
  if (keys.length === 0) {
    throw new RollResolveError("The file contained no usable roll numbers");
  }

  const projection = "name email rollNumber department section graduatingYear userType";
  const variants = keys.flatMap((key) => [key, key.toUpperCase()]);

  let users = await User.find({ rollNumber: { $in: variants } })
    .select(projection)
    .lean();

  const foundKeys = new Set(users.map((u) => u.rollNumber.toLowerCase()));
  const missingKeys = keys.filter((key) => !foundKeys.has(key));

  if (missingKeys.length > 0) {
    const extra = await User.aggregate([
      { $match: { $expr: { $in: [{ $toLower: "$rollNumber" }, missingKeys] } } },
      {
        $project: {
          name: 1,
          email: 1,
          rollNumber: 1,
          department: 1,
          section: 1,
          graduatingYear: 1,
          userType: 1,
        },
      },
    ]);
    users = users.concat(extra);
    extra.forEach((u) => foundKeys.add(u.rollNumber.toLowerCase()));
  }

  // Staff accounts are never students of a test.
  users = users.filter((u) => u.userType !== "admin" && u.userType !== "teacher");

  const matchedUsers = users.map((user) => ({
    _id: user._id.toString(),
    name: user.name || "Unknown",
    email: user.email || "",
    rollNumber: user.rollNumber || "",
    department: user.department || "",
    section: user.section || "",
    graduatingYear: user.graduatingYear || "",
    alreadyEligible: eligibleIds.has(user._id.toString()),
  }));

  const matchedKeys = new Set(matchedUsers.map((u) => u.rollNumber.toLowerCase()));
  const notFoundRollNumbers = keys
    .filter((key) => !matchedKeys.has(key))
    .map((key) => originalByKey.get(key));

  const alreadyEligible = matchedUsers.filter((u) => u.alreadyEligible);
  const readyToAdd = matchedUsers.filter((u) => !u.alreadyEligible);

  return {
    summary: {
      totalProvided: rollNumbers.length,
      uniqueProvided: keys.length,
      blankRows: blankCount,
      duplicatesInFile: Math.max(rollNumbers.length - keys.length - blankCount, 0),
      usersFound: matchedUsers.length,
      usersNotFound: notFoundRollNumbers.length,
      alreadyEligible: alreadyEligible.length,
      readyToAdd: readyToAdd.length,
    },
    matchedUsers,
    notFoundRollNumbers,
  };
}

module.exports = { resolveRollNumbers, RollResolveError, MAX_ROLL_NUMBERS };
