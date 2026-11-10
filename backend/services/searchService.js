/**
 * Search across the whole platform: users, cohorts, opportunities, courses and speech tests.
 * The text is matched literally and case-insensitively.
 */
const User = require("../models/User");
const Cohort = require("../models/Cohort");
const Opportunity = require("../models/Opportunity");
const Course = require("../models/Course");
const escapeRegex = require("../utils/escapeRegex");
const { searchSpeechTests } = require("./speechTestSearch");

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const EMPTY_RESULTS = Object.freeze({
  users: [],
  cohorts: [],
  opportunities: [],
  courses: [],
  speechTests: [],
});

/** A positive whole number up to MAX_LIMIT; anything else falls back to the default. */
function parseLimit(value) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 1) return DEFAULT_LIMIT;
  return Math.min(number, MAX_LIMIT);
}

const matchAny = (pattern, fields) => ({ $or: fields.map((field) => ({ [field]: pattern })) });

function findUsers(pattern, limit) {
  // Admin and teacher accounts are not listed
  return User.find({
    $and: [matchAny(pattern, ["email", "name"]), { userType: { $nin: ["admin", "teacher"] } }],
  })
    .select("name email username rollNumber department section profilePicture")
    .limit(limit)
    .lean();
}

const findCohorts = (pattern, limit) =>
  Cohort.find(matchAny(pattern, ["title", "description"])).select("title description").limit(limit).lean();

const findOpportunities = (pattern, limit) =>
  Opportunity.find(matchAny(pattern, ["title", "company"])).select("title company type").limit(limit).lean();

const findCourses = (pattern, limit) =>
  Course.find(matchAny(pattern, ["title", "instructor"])).select("title instructor category").limit(limit).lean();

/**
 * @param {{user: object, query: string, limit?: number|string}} params `user` is the signed-in
 *   user, because speech tests are shown according to who is asking.
 * @returns {Promise<{users: Array, cohorts: Array, opportunities: Array, courses: Array, speechTests: Array}>}
 */
async function searchAll({ user, query, limit }) {
  const text = String(query || "").trim();
  if (!text) return { ...EMPTY_RESULTS };

  const pattern = new RegExp(escapeRegex(text), "i");
  const max = parseLimit(limit);

  const [users, cohorts, opportunities, courses, speechTests] = await Promise.all([
    findUsers(pattern, max),
    findCohorts(pattern, max),
    findOpportunities(pattern, max),
    findCourses(pattern, max),
    searchSpeechTests({ user, query: text, limit: max }),
  ]);

  return {
    // A user without a stored username is reached through the part of the email before the @
    users: users.map((person) => ({ ...person, username: person.username || person.email.split("@")[0] })),
    cohorts,
    opportunities,
    courses,
    speechTests,
  };
}

module.exports = { searchAll, parseLimit };
