import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the admin dashboard's own numbers: /api/admin/stats (users, problems, departments and
 * platforms) and /api/admin/user-registration-stats (registrations over time). The student
 * performance analytics have their own client (adminAnalyticsApi). Components never build these
 * URLs themselves. Auth headers come from the shared axios instance.
 */
const base = `${apiUrl}/admin`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const dashboardErrorMessage = (error, fallback = "Could not load the dashboard") => {
  const status = error?.response?.status;
  if (status === 404) return "The statistics were not found. Check the server configuration.";
  if (status === 401) return "You are signed out. Sign in again.";
  return (
    error?.response?.data?.message ||
    (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
    fallback
  );
};

export const adminDashboardApi = {
  /** Users, problems solved per platform, departments, platform engagement, the top five students. */
  stats: ({ signal } = {}) => unwrap(axios.get(`${base}/stats`, { params: { timeframe: "weekly" }, signal })),

  /** Registrations per day, week, month and department, with the summary counts. */
  registrations: ({ signal } = {}) => unwrap(axios.get(`${base}/user-registration-stats`, { signal })),
};
