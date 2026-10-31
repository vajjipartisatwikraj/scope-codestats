import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for /api/admin/access-list (admins only): the email addresses allowed to sign in when
 * the server runs with LOGIN_MODE=allowlist. Components never build these URLs themselves.
 * Auth headers come from the shared axios instance.
 */
const base = `${apiUrl}/admin/access-list`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

export const accessListApi = {
  /** { loginMode, entries, total, page, pageSize, counts: { total, students, teachers } } */
  list: ({ search, role, page, pageSize } = {}) =>
    unwrap(
      axios.get(base, {
        params: {
          ...(search ? { search } : {}),
          ...(role && role !== "all" ? { role } : {}),
          page,
          pageSize,
        },
      })
    ),
  /** entries: [{ email, role?, note? }] -> { added, alreadyListed, invalidCount, invalid: [{ value, reason }] } */
  addMany: (entries) => unwrap(axios.post(`${base}/bulk`, { entries })),
  /** Adds every existing student and teacher account -> { added, alreadyListed } */
  importExisting: () => unwrap(axios.post(`${base}/import-existing`)),
  /** role: "student" | "teacher" */
  setRole: (id, role) => unwrap(axios.patch(`${base}/${id}`, { role })),
  /** Takes addresses off the list, which blocks those people -> { removed } */
  remove: (ids) => unwrap(axios.post(`${base}/remove`, { ids })),
};
