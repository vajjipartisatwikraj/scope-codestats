import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for user groups: /api/user-groups (the groups themselves),
 * /api/cohorts/:id/user-groups and /api/speech-tests/admin/:id/user-groups (attaching them
 * to cohorts and communication tests). Components never build
 * these URLs themselves. Auth headers come from the shared axios instance.
 */
const groupsBase = `${apiUrl}/user-groups`;
const cohortsBase = `${apiUrl}/cohorts`;
const testsBase = `${apiUrl}/speech-tests/admin`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

// ---- the groups ------------------------------------------------------------
export const userGroupApi = {
  list: () => unwrap(axios.get(groupsBase)),
  get: (id) => unwrap(axios.get(`${groupsBase}/${id}`)),
  create: ({ name, description, rollNumbers }) =>
    unwrap(axios.post(groupsBase, { name, description, rollNumbers })),
  update: (id, { name, description }) =>
    unwrap(axios.put(`${groupsBase}/${id}`, { name, description })),
  addMembers: (id, rollNumbers) =>
    unwrap(axios.post(`${groupsBase}/${id}/members`, { rollNumbers })),
  removeMembers: (id, rollNumbers) =>
    unwrap(axios.delete(`${groupsBase}/${id}/members`, { data: { rollNumbers } })),
  remove: (id) => unwrap(axios.delete(`${groupsBase}/${id}`)),
};

// ---- groups of a cohort ----------------------------------------------------
export const cohortUserGroupApi = {
  list: (cohortId) => unwrap(axios.get(`${cohortsBase}/${cohortId}/user-groups`)),
  attach: (cohortId, groupId) =>
    unwrap(axios.put(`${cohortsBase}/${cohortId}/user-groups/${groupId}`)),
  /** Pass `preview: true` to see which students would lose their data, without detaching. */
  detach: (cohortId, groupId, { preview = false } = {}) =>
    unwrap(
      axios.delete(`${cohortsBase}/${cohortId}/user-groups/${groupId}`, {
        params: preview ? { preview: true } : undefined,
      })
    ),
  sync: (cohortId) => unwrap(axios.post(`${cohortsBase}/${cohortId}/user-groups/sync`)),
};

// ---- groups of a communication test ----------------------------------------
// Same shape as cohortUserGroupApi, so one dialog serves both.
export const testUserGroupApi = {
  list: (testId) => unwrap(axios.get(`${testsBase}/${testId}/user-groups`)),
  attach: (testId, groupId) =>
    unwrap(axios.put(`${testsBase}/${testId}/user-groups/${groupId}`)),
  /** Pass `preview: true` to see which students would lose access, without detaching. */
  detach: (testId, groupId, { preview = false } = {}) =>
    unwrap(
      axios.delete(`${testsBase}/${testId}/user-groups/${groupId}`, {
        params: preview ? { preview: true } : undefined,
      })
    ),
  sync: (testId) => unwrap(axios.post(`${testsBase}/${testId}/user-groups/sync`)),
};