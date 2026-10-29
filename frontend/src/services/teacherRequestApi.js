import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for /api/teacher-requests. Components never build these URLs themselves.
 * Auth headers come from the shared axios instance (the same JWT every user has).
 */
const base = `${apiUrl}/teacher-requests`;
const unwrap = (promise) => promise.then((response) => response.data);

/** Fired after an admin decides a request, so the sidebar badge refreshes. */
export const TEACHER_REQUESTS_CHANGED = "teacher-requests-changed";

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

// ---- the signed-in person --------------------------------------------------
export const teacherRequestApi = {
  /** { eligibleToRequest, request: { status, note, rejectionReason, canRequestAgainAt, ... } | null } */
  mine: () => unwrap(axios.get(`${base}/me`)),
  submit: (note) => unwrap(axios.post(base, { note })),
};

// ---- admin only ------------------------------------------------------------

// The sidebar asks for the pending count every time it mounts, and it mounts again each
// time the app shell is hidden and shown (exam pages, full-screen pages). Share one
// answer between those mounts for a short while instead of asking the server each time.
const PENDING_COUNT_TTL_MS = 60 * 1000;
let pendingCountCache = { at: 0, promise: null };

const pendingCount = ({ force = false } = {}) => {
  const fresh = Date.now() - pendingCountCache.at < PENDING_COUNT_TTL_MS;
  if (!force && fresh && pendingCountCache.promise) return pendingCountCache.promise;

  const promise = unwrap(axios.get(`${base}/pending-count`)).catch((error) => {
    pendingCountCache = { at: 0, promise: null }; // do not cache a failure
    throw error;
  });
  pendingCountCache = { at: Date.now(), promise };
  return promise;
};

export const teacherRequestAdminApi = {
  list: (status) => unwrap(axios.get(base, { params: status ? { status } : undefined })),
  /** Cached for a minute; pass { force: true } right after a decision. */
  pendingCount,
  approve: (id) => unwrap(axios.post(`${base}/${id}/approve`)),
  reject: (id, reason) => unwrap(axios.post(`${base}/${id}/reject`, { reason })),
};
