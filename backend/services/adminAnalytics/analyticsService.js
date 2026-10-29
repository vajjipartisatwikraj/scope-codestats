/**
 * Admin performance analytics: the entry points the controller calls.
 *
 * The data of one period (every active student, current numbers and changes) is loaded once
 * and cached for a minute, shared by the overview, the student table and every filter
 * combination, which are all worked out in memory (analyticsBuilder.js).
 */
const User = require("../../models/User");
const AcademicYearConfig = require("../../models/AcademicYearConfig");
const TtlCache = require("../../utils/TtlCache");
const {
  CACHE,
  PERIOD_OPTIONS,
  DEFAULT_PERIOD_DAYS,
  PAGE_SIZE_OPTIONS,
  GROUP_BY_OPTIONS,
  PLATFORM_STATS,
} = require("../../config/adminAnalytics");
const { activeStudentFilter } = require("../rankings/scoreHistoryService");
const { loadDataset } = require("./analyticsDataset");
const { buildOverview, pageStudents } = require("./analyticsBuilder");

const cache = new TtlCache(CACHE);

const datasetFor = (days) => cache.get(`period:${days}`, () => loadDataset(days));

/** The values the filter dropdowns offer, with how many students each has. */
function getFilterOptions() {
  return cache.get("filters", async () => {
    const [counts] = await User.aggregate([
      { $match: await activeStudentFilter() },
      {
        $facet: {
          departments: [{ $match: { department: { $nin: [null, ""] } } }, { $group: { _id: "$department", count: { $sum: 1 } } }],
          years: [{ $match: { graduatingYear: { $ne: null } } }, { $group: { _id: "$graduatingYear", count: { $sum: 1 } } }],
          sections: [{ $match: { section: { $nin: [null, ""] } } }, { $group: { _id: "$section", count: { $sum: 1 } } }],
        },
      },
    ]);
    const config = await AcademicYearConfig.getConfig();
    const labels = new Map(config.yearMappings.map((m) => [m.graduationYear, `${m.graduationYear} · ${m.displayName}`]));

    const byValue = (a, b) => String(a.value).localeCompare(String(b.value));
    return {
      departments: counts.departments.map((d) => ({ value: d._id, count: d.count })).sort(byValue),
      graduatingYears: counts.years
        .map((y) => ({ value: y._id, label: labels.get(y._id) || String(y._id), count: y.count }))
        .sort((a, b) => a.value - b.value),
      sections: counts.sections.map((s) => ({ value: s._id, count: s.count })).sort(byValue),
      periods: PERIOD_OPTIONS,
      defaultPeriod: DEFAULT_PERIOD_DAYS,
      groupBy: GROUP_BY_OPTIONS,
      pageSizes: PAGE_SIZE_OPTIONS,
      platforms: Object.keys(PLATFORM_STATS),
    };
  });
}

/** Headline numbers, platform statistics, comparison, distributions, leaders and trend. */
async function getOverview({ days, filters, groupBy }) {
  return buildOverview(await datasetFor(days), filters, groupBy);
}

/** One page of the student table. */
async function getStudents({ days, filters, sort, order, page, limit, search }) {
  return pageStudents(await datasetFor(days), filters, { sort, order, page, limit, search });
}

/** Forgets the loaded data (tests, and after a bulk change). */
const clearCache = () => cache.clear();

module.exports = { getFilterOptions, getOverview, getStudents, clearCache };
