import axios from "axios";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the admin's profile sync: /api/admin/sync-jobs. Every run of the sync (the nightly one
 * and the ones an admin starts) is a job. Components never build these URLs themselves. The admin
 * screens pass their token, like the other admin calls.
 */
const base = `${apiUrl}/admin/sync-jobs`;
const authHeaders = (token, extra = {}) => ({ headers: { Authorization: `Bearer ${token}` }, ...extra });
const unwrap = (promise) => promise.then((response) => response.data);

export const syncJobApi = {
  /** { syncs[], pagination: { total } }: the runs, newest first. `page` counts from 1. */
  list: (token, { page = 1, limit = 10 } = {}) => unwrap(axios.get(base, authHeaders(token, { params: { page, limit } }))),

  /** The totals of the last `days` days. */
  stats: (token, days = 30) => unwrap(axios.get(`${base}/stats`, authHeaders(token, { params: { days } }))),

  /** One run with its progress and the list of failed profiles. */
  get: (token, id) => unwrap(axios.get(`${base}/${id}`, authHeaders(token))),

  /** Starts a run. Refused with 409 (and the `syncId` of the run in progress) while one is running. */
  start: (token) => unwrap(axios.post(base, {}, authHeaders(token))),

  /** Stops a running run after the profiles it is working on. */
  cancel: (token, id) => unwrap(axios.post(`${base}/${id}/cancel`, {}, authHeaders(token))),
};
