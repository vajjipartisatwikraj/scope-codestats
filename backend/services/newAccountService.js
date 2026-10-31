/**
 * The details a brand-new account starts with (used by config/passport.js).
 *
 *  - College address (config/loginAccess.isInstitutionEmail): the roll number, department and
 *    graduating year are read from the address, exactly as they always were. The roll number is
 *    the first part of the address, for example 23r21a05y9@mlrit.ac.in.
 *  - Any other address (LOGIN_MODE=allowlist): nothing can be read from it. The account gets a
 *    unique placeholder roll number and the department "OTHER", and the profile setup (which a
 *    new student cannot skip) asks the person for their roll number, department, graduating
 *    year and college.
 *  - A username for the public profile page that no other account has.
 */
const crypto = require("crypto");
const User = require("../models/User");
const escapeRegex = require("../utils/escapeRegex");
const { isInstitutionEmail } = require("../config/loginAccess");

// Department codes found inside a college roll number
const DEPARTMENT_CODES = {
  A05: "CSE",
  "05Y": "CSE",
  A06: "CSC",
  A33: "CSIT",
  A12: "IT",
  A67: "CSD",
  A66: "CSM",
  Y9: "CSE", // fallback for the 23r21a05y9 pattern
};

/** Roll number, department and graduating year read from a college address. */
function detailsFromCollegeEmail(email) {
  const parts = email.split("@");
  const rollNumber = parts[0].toUpperCase();

  // The code sits at characters 5 to 7 of a roll number, or is its last two characters
  let deptCode = "";
  if (rollNumber.length >= 8) deptCode = rollNumber.substring(5, 8);
  if (!DEPARTMENT_CODES[deptCode] && rollNumber.length >= 9) {
    const lastTwo = rollNumber.substring(rollNumber.length - 2);
    if (DEPARTMENT_CODES[lastTwo]) deptCode = lastTwo;
  }

  // The first two characters are the year they joined: graduating year = 2000 + that + 4
  const admissionYear = rollNumber.length >= 2 ? 2000 + parseInt(rollNumber.substring(0, 2), 10) : NaN;

  return {
    rollNumber,
    department: DEPARTMENT_CODES[deptCode] || "CSE",
    graduatingYear: admissionYear + 4 || new Date().getFullYear() + 4,
  };
}

/** What an address that is not a college address starts with. `id` is the new account's _id. */
function placeholderDetails(id) {
  return { rollNumber: `EXT-${String(id)}`, department: "OTHER", graduatingYear: undefined };
}

/** @param {string} email lower case @param {import("mongoose").Types.ObjectId} id */
function startingDetails(email, id) {
  return isInstitutionEmail(email) ? detailsFromCollegeEmail(email) : placeholderDetails(id);
}

// ─── Username ───────────────────────────────────────────────────────────────

/**
 * Taken means another account already answers to this address: it either stores the username, or
 * it is an older account (no stored username) whose email starts with it.
 */
async function isUsernameTaken(handle) {
  if (await User.exists({ username: handle })) return true;
  return Boolean(
    await User.exists({ username: { $exists: false }, email: new RegExp(`^${escapeRegex(handle)}@`, "i") })
  );
}

/**
 * The profile address for a new account: the part of the email before the "@", which is what
 * everyone has always had, with "-2", "-3", ... added when another domain already has it.
 */
async function uniqueUsername(email) {
  const base =
    String(email).split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/^-+|-+$/g, "") || "user";

  let candidate = base;
  for (let attempt = 2; await isUsernameTaken(candidate); attempt += 1) {
    // After a few tries a random ending is cheaper than counting further
    candidate = attempt <= 20 ? `${base}-${attempt}` : `${base}-${crypto.randomBytes(3).toString("hex")}`;
    if (attempt > 20) break;
  }
  return candidate;
}

module.exports = {
  DEPARTMENT_CODES,
  detailsFromCollegeEmail,
  placeholderDetails,
  startingDetails,
  isUsernameTaken,
  uniqueUsername,
};
