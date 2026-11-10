/**
 * Finding speech (communication) tests by what the person typed.
 *
 * Staff search every test, drafts included. A student only finds tests that are published and
 * list them as eligible, the same rule as their own test list.
 */
const SpeechTest = require("../models/SpeechTest");
const escapeRegex = require("../utils/escapeRegex");
const { windowState } = require("./speechTestState");

const isStaff = (user) => user?.userType === "admin" || user?.userType === "teacher";

/**
 * Mongo filter for tests whose title, description or a section title contains `query`
 * (case-insensitive, matched literally), limited to what `user` may see.
 */
function buildSearchFilter(user, query) {
  const pattern = new RegExp(escapeRegex(String(query).trim()), "i");
  const filter = {
    $or: [{ title: pattern }, { description: pattern }, { "sections.title": pattern }],
  };
  if (!isStaff(user)) {
    filter.isPublished = true;
    filter.eligibleUsers = user.id;
  }
  return filter;
}

/**
 * @param {{user: {id: string, userType: string}, query: string, limit?: number}} params
 * @returns {Promise<Array<{_id, title, description, startTime, endTime, state, isPublished}>>}
 */
async function searchSpeechTests({ user, query, limit = 10 }) {
  if (!String(query || "").trim()) return [];

  const tests = await SpeechTest.find(buildSearchFilter(user, query))
    .sort({ startTime: -1 })
    .limit(limit)
    .select("title description startTime endTime isPublished")
    .lean();

  const now = new Date();
  return tests.map((test) => ({
    _id: test._id,
    title: test.title,
    description: test.description,
    startTime: test.startTime,
    endTime: test.endTime,
    isPublished: test.isPublished,
    state: windowState(test, now),
  }));
}

module.exports = { searchSpeechTests, buildSearchFilter };
