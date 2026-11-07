import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for /api/admin/suspend-accounts (admins only). Components never build these URLs
 * themselves. Auth headers come from the shared axios instance (the same JWT every user has).
 */
const base = `${apiUrl}/admin/suspend-accounts`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

export const accountSuspensionApi = {
  /** { accounts: [{ _id, name, email, rollNumber, userType, department, profiles: [...] }], total, page, limit } */
  list: ({ search, linkedOnly, page, limit }) =>
    unwrap(axios.get(base, { params: { search: search || undefined, linkedOnly: linkedOnly ? "true" : undefined, page, limit } })),
  /** What suspending the account would delete: { user, profiles, counts: { profiles, snapshots, scoreHistory, heatmapDays } } */
  preview: (userId) => unwrap(axios.get(`${base}/${userId}`)),
  /** Deletes the coding profiles and all history of the account. Permanent. */
  suspend: (userId) => unwrap(axios.delete(`${base}/${userId}`)),
};
