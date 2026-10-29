import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the dashboard Progress tab: /api/platform-progress (history and charts data)
 * and the unlink call in /api/profiles. Components never build these URLs themselves.
 * Auth headers come from the shared axios instance.
 */
const progressBase = `${apiUrl}/platform-progress/me`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

export const platformProgressApi = {
  /** One entry per platform plus the "problems by platform" totals. */
  overview: ({ signal } = {}) => unwrap(axios.get(`${progressBase}/overview`, { signal })),

  /**
   * One platform over the last `days` days (7, 30, 90, 180 or 365). The answer always has
   * a `state`; see backend/services/platformProgress/progressService.js.
   */
  platform: (platform, days, { signal } = {}) =>
    unwrap(axios.get(`${progressBase}/${platform}`, { params: { days }, signal })),

  /**
   * Total score, every platform's score, and the overall, department and per-platform
   * ranks over the last `days` days. The answer always has a `state` (not_ranked,
   * no_history, ok); see backend/services/rankings/scoreProgressService.js.
   */
  scores: (days, { signal } = {}) => unwrap(axios.get(`${progressBase}/scores`, { params: { days }, signal })),
};

/**
 * Unlinks a platform: removes the username, its stats and its whole stored history.
 * The server refuses unless the request says it was confirmed.
 */
export const removeLinkedPlatform = (platform) =>
  unwrap(axios.delete(`${apiUrl}/profiles/${platform}`, { data: { confirm: true } }));
