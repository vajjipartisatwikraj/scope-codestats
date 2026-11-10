import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the admin Monitoring page: /api/admin/monitoring. Components never build these URLs
 * themselves. Auth headers come from the shared axios instance.
 */
const base = `${apiUrl}/admin/monitoring`;
const unwrap = (promise) => promise.then((response) => response.data);

/** Keeps only the parameters that have a value. */
const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));

/** A readable message from a failed request. */
export const monitoringErrorMessage = (error, fallback = "Could not load the monitoring data") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

/** True for a request that was cancelled on purpose (a newer one replaced it). */
export const isCancelled = (error) => error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

export const monitoringApi = {
  /**
   * API traffic of a range: totals, timeline, status codes, response types, every route.
   * @param {"1h"|"24h"|"7d"|"30d"|"all"} range
   */
  api: (range, { signal } = {}) => unwrap(axios.get(`${base}/api`, { params: { range }, signal })),

  /**
   * The errors and slow requests kept one by one, newest first.
   * @param {{limit?: number, before?: string, minStatus?: number}} query
   */
  events: (query = {}, { signal } = {}) => unwrap(axios.get(`${base}/api/events`, { params: clean(query), signal })),

  /**
   * VocalQ API usage, as SpeechJudge reports it through the backend.
   * @param {"1h"|"6h"|"24h"|"7d"|"30d"|"90d"} range
   */
  vocalq: (range, { signal } = {}) => unwrap(axios.get(`${base}/vocalq`, { params: { range }, signal })),

  /**
   * Judge0 (the code execution engine) as it reports itself: statistics, workers, limits, server.
   * @param {{refresh?: boolean}} options `refresh` asks Judge0 to count again instead of using its 10 minute copy
   */
  judge0: ({ refresh = false, signal } = {}) =>
    unwrap(axios.get(`${base}/judge0`, { params: clean({ refresh: refresh ? 1 : undefined }), signal })),

  /**
   * Every collection now, and the size history of the database.
   * @param {"30d"|"90d"|"1y"|"all"} range
   * @param {{refresh?: boolean}} options `refresh` skips the server's one-minute cache
   */
  database: (range, { refresh = false, signal } = {}) =>
    unwrap(axios.get(`${base}/database`, { params: clean({ range, refresh: refresh ? 1 : undefined }), signal })),
};
