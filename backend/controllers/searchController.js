/**
 * Search controller: one search box for users, cohorts, opportunities, courses and speech tests.
 *
 * Wired to URLs in routes/search.js (/api/search), which also applies the login check.
 */
const searchService = require("../services/searchService");
const { respondWithError } = require("../utils/ServiceError");
const log = require("../utils/logger").scope("SEARCH");

/** GET /api/search?query=text&limit=10 */
const search = async (req, res) => {
  try {
    const { query, limit } = req.query;
    res.json(await searchService.searchAll({ user: req.user, query, limit }));
  } catch (err) {
    respondWithError(res, err, log, "searching");
  }
};

module.exports = { search };
