import axios from "axios";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the admin's score and rank calculation: /api/admin/rankings.
 * Components never build these URLs themselves. The admin screens pass their token, like
 * the other admin calls.
 */
const base = `${apiUrl}/admin/rankings`;
const authHeaders = (token) => ({ headers: { Authorization: `Bearer ${token}` } });
const unwrap = (promise) => promise.then((response) => response.data);

export const rankingAdminApi = {
  /** { running, syncRunning, runs[] }: the latest calculations, newest first. */
  status: (token) => unwrap(axios.get(`${base}/status`, authHeaders(token))),

  /**
   * Calculates scores and ranks now, from the scores already stored. Refused with 409 while a
   * profile sync or another calculation is running (`reason`: "sync_running" or
   * "ranking_running").
   */
  recompute: (token) => unwrap(axios.post(`${base}/recompute`, {}, authHeaders(token))),
};
