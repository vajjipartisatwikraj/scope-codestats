/**
 * Feedback on a finished speech test: validating what a student sends, and
 * summarising what everyone sent for the admin.
 *
 * Skipped records are never counted; they only mark that the student was asked.
 */

const SpeechTestFeedback = require("../models/SpeechTestFeedback");

const round1 = (n) => Math.round(n * 10) / 10;
const COMMENT_LIMIT = 1000;

/** A whole number 1-5, or null when absent. Throws on anything else. */
function cleanRating(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) {
    throw Object.assign(new Error(`${label} must be a number from 1 to 5`), { status: 400 });
  }
  return number;
}

/**
 * Turns a request body into the fields to store.
 * @returns {{status: "submitted"|"skipped", rating?: number, ratings?: object, comment?: string}}
 */
function parseFeedback(body = {}) {
  if (body.skipped === true) return { status: "skipped" };

  const rating = cleanRating(body.rating, "The overall rating");
  if (rating === null) {
    throw Object.assign(new Error("Choose an overall star rating before sending feedback"), { status: 400 });
  }

  const ratings = {};
  SpeechTestFeedback.CRITERIA.forEach((key) => {
    ratings[key] = cleanRating(body.ratings?.[key], `The ${key} rating`);
  });

  const comment = String(body.comment || "").trim();
  if (comment.length > COMMENT_LIMIT) {
    throw Object.assign(new Error(`Keep the comment under ${COMMENT_LIMIT} characters`), { status: 400 });
  }

  return { status: "submitted", rating, ratings, comment };
}

/** Average of the numbers present, or null when there are none. */
function average(values) {
  const present = values.filter((v) => typeof v === "number");
  return present.length ? round1(present.reduce((a, b) => a + b, 0) / present.length) : null;
}

/** Feedback count and average overall rating for every test, for the admin list. */
async function countsByTest() {
  const rows = await SpeechTestFeedback.aggregate([
    { $match: { status: "submitted" } },
    { $group: { _id: "$test", count: { $sum: 1 }, average: { $avg: "$rating" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), { count: r.count, average: round1(r.average) }]));
}

/**
 * Everything the admin sees for one test: totals, averages, how the ratings
 * are spread, and the latest written comments.
 */
async function summarize(testId, { commentLimit = 25 } = {}) {
  const [submitted, skipped] = await Promise.all([
    SpeechTestFeedback.find({ test: testId, status: "submitted" })
      .sort({ createdAt: -1 })
      .populate("user", "name rollNumber")
      .lean(),
    SpeechTestFeedback.countDocuments({ test: testId, status: "skipped" }),
  ]);

  const distribution = [1, 2, 3, 4, 5].map((stars) => submitted.filter((f) => f.rating === stars).length);
  const criteria = {};
  SpeechTestFeedback.CRITERIA.forEach((key) => {
    criteria[key] = average(submitted.map((f) => f.ratings?.[key]));
  });

  return {
    total: submitted.length,
    skipped,
    averageRating: average(submitted.map((f) => f.rating)),
    distribution,
    criteria,
    comments: submitted
      .filter((f) => f.comment)
      .slice(0, commentLimit)
      .map((f) => ({
        id: f._id,
        name: f.user?.name || "Student",
        rollNumber: f.user?.rollNumber || "",
        rating: f.rating,
        comment: f.comment,
        createdAt: f.createdAt,
      })),
  };
}

module.exports = { parseFeedback, countsByTest, summarize };
