import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for alerts and announcements. Components never build these URLs themselves; auth headers
 * come from the shared axios instance.
 *
 *   noticeApi          everyone signed in: what to show, and closing or pressing the button of it
 *                      (/api/notices)
 *   alertAdminApi      admins: create and manage alerts (/api/admin/alerts)
 *   announcementAdminApi   admins: create and manage announcements (/api/admin/announcements)
 *
 * The two admin clients have the same shape, so the management screens share one list hook.
 */

const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

// ---- what a signed-in user sees --------------------------------------------

const noticesBase = `${apiUrl}/notices`;

export const noticeApi = {
  /** { alerts: [...], announcements: [...] }: live now, for this user, not closed by them */
  active: () => unwrap(axios.get(`${noticesBase}/active`)),
  closeAlert: (id) => unwrap(axios.post(`${noticesBase}/alerts/${id}/close`)),
  clickAlert: (id) => unwrap(axios.post(`${noticesBase}/alerts/${id}/click`)),
  closeAnnouncement: (id) => unwrap(axios.post(`${noticesBase}/announcements/${id}/close`)),
  clickAnnouncement: (id) => unwrap(axios.post(`${noticesBase}/announcements/${id}/click`)),
};

// ---- admin management -------------------------------------------------------

/** The five calls every admin list of notices has, for the collection at `base`. */
const adminApiFor = (base) => ({
  list: () => unwrap(axios.get(base)),
  create: (body) => unwrap(axios.post(base, body)),
  update: (id, body) => unwrap(axios.put(`${base}/${id}`, body)),
  setActive: (id, isActive) => unwrap(axios.put(`${base}/${id}/active`, { isActive })),
  remove: (id) => unwrap(axios.delete(`${base}/${id}`)),
});

export const alertAdminApi = adminApiFor(`${apiUrl}/admin/alerts`);
export const announcementAdminApi = adminApiFor(`${apiUrl}/admin/announcements`);
