import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the admin performance analytics: /api/admin/analytics. Components never build
 * these URLs themselves. Auth headers come from the shared axios instance.
 */
const base = `${apiUrl}/admin/analytics`;
const unwrap = (promise) => promise.then((response) => response.data);

/** Keeps only the parameters that have a value (an empty filter means "all"). */
const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));

/** A readable message from a failed request. */
export const analyticsErrorMessage = (error, fallback = "Could not load the analytics") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

export const adminAnalyticsApi = {
  /** Departments, graduating years, sections, periods the filters offer. */
  filters: ({ signal } = {}) => unwrap(axios.get(`${base}/filters`, { signal })),

  /**
   * Headline numbers, platform statistics, comparison, distributions, leaders and trend.
   * @param {{days, department, graduatingYear, section, groupBy}} query
   */
  overview: (query, { signal } = {}) => unwrap(axios.get(`${base}/overview`, { params: clean(query), signal })),

  /**
   * One page of students.
   * @param {{days, department, graduatingYear, section, sort, order, page, limit, search}} query
   */
  students: (query, { signal } = {}) => unwrap(axios.get(`${base}/students`, { params: clean(query), signal })),
};
