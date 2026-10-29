/**
 * Admin analytics controller: how all students perform over the coding platforms.
 *
 *   GET /filters    the values the filter dropdowns offer
 *   GET /overview   headline numbers, platform statistics, comparison, charts data
 *   GET /students   one page of the student table (sortable, searchable)
 *
 * Wired up in routes/adminAnalytics.js (authentication, rate limit, parameter validation).
 * The work is in services/adminAnalytics.
 */
const analytics = require("../services/adminAnalytics/analyticsService");
const log = require("../utils/logger").scope("ADMIN-ANALYTICS");

const fail = (res, what, error) => {
  log.error(`${what} failed:`, error);
  res.status(500).json({ message: `Could not load ${what}` });
};

/** GET /api/admin/analytics/filters */
const getFilters = async (_req, res) => {
  try {
    res.json(await analytics.getFilterOptions());
  } catch (error) {
    fail(res, "the filters", error);
  }
};

/** GET /api/admin/analytics/overview */
const getOverview = async (req, res) => {
  try {
    const { days, filters, groupBy } = req.analytics;
    res.json(await analytics.getOverview({ days, filters, groupBy }));
  } catch (error) {
    fail(res, "the analytics", error);
  }
};

/** GET /api/admin/analytics/students */
const getStudents = async (req, res) => {
  try {
    const { days, filters, sort, order, page, limit, search } = req.analytics;
    res.json(await analytics.getStudents({ days, filters, sort, order, page, limit, search }));
  } catch (error) {
    fail(res, "the students", error);
  }
};

module.exports = { getFilters, getOverview, getStudents };
