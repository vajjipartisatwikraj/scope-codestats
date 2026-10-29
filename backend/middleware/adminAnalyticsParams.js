/**
 * Validates the query of the admin analytics routes and puts the clean values on
 * `req.analytics`:
 *
 *   { days, filters: {department, graduatingYear, section}, groupBy,
 *     sort, order, page, limit, search }
 *
 * Anything unexpected (a value outside the lists, an array or object where a string is
 * expected, an oversized search) is refused with a 400 before it reaches a controller, so
 * services only ever see supported values.
 */
const User = require("../models/User");
const {
  PERIOD_OPTIONS,
  DEFAULT_PERIOD_DAYS,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  GROUP_BY_OPTIONS,
  DEFAULT_GROUP_BY,
  SORT_KEYS,
} = require("../config/adminAnalytics");

const DEPARTMENTS = User.schema.path("department").enumValues;
const SECTIONS = User.schema.path("section").enumValues;

class QueryError extends Error {}

/** A single string value, or undefined when absent or empty. */
function text(query, name) {
  const value = query[name];
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") throw new QueryError(`"${name}" must be a single value.`);
  return value.trim();
}

function integer(query, name, { min, max, oneOf } = {}) {
  const raw = text(query, name);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || (min !== undefined && value < min) || (max !== undefined && value > max) || (oneOf && !oneOf.includes(value))) {
    throw new QueryError(oneOf ? `"${name}" must be one of: ${oneOf.join(", ")}.` : `"${name}" is not valid.`);
  }
  return value;
}

function choice(query, name, allowed, fallback) {
  const raw = text(query, name);
  if (raw === undefined) return fallback;
  if (!allowed.includes(raw)) throw new QueryError(`"${name}" must be one of: ${[...allowed].join(", ")}.`);
  return raw;
}

function adminAnalyticsParams(req, res, next) {
  try {
    const q = req.query;
    const search = text(q, "search");
    if (search && search.length > MAX_SEARCH_LENGTH) throw new QueryError(`"search" is too long.`);

    req.analytics = {
      days: integer(q, "days", { oneOf: PERIOD_OPTIONS }) ?? DEFAULT_PERIOD_DAYS,
      filters: {
        department: choice(q, "department", DEPARTMENTS, undefined),
        section: choice(q, "section", SECTIONS, undefined),
        graduatingYear: integer(q, "graduatingYear", { min: 2000, max: 2100 }),
      },
      groupBy: choice(q, "groupBy", GROUP_BY_OPTIONS, DEFAULT_GROUP_BY),
      sort: choice(q, "sort", SORT_KEYS, "totalScore"),
      order: choice(q, "order", ["asc", "desc"], "desc"),
      page: integer(q, "page", { min: 1, max: 100000 }) ?? 1,
      limit: integer(q, "limit", { oneOf: PAGE_SIZE_OPTIONS }) ?? DEFAULT_PAGE_SIZE,
      search,
    };
    next();
  } catch (error) {
    if (error instanceof QueryError) return res.status(400).json({ message: error.message });
    next(error);
  }
}

module.exports = adminAnalyticsParams;
