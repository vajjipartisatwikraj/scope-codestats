import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

export { apiErrorMessage } from "./userGroupApi";

/**
 * Client for mentorships. Components never build these URLs themselves. Auth headers come from the
 * shared axios instance.
 *
 *   mentorshipApi    admins: /api/mentorships (create and manage mentorships, choose their teachers)
 *   myMentorshipApi  teachers: /api/my-mentorships (their own mentorships)
 *   adminRoster(typeId, teacherId) and myRoster(typeId) answer the same three calls (get, add,
 *   remove), so one roster screen works for both: an admin names the teacher, a teacher is always
 *   themselves.
 */
const adminBase = `${apiUrl}/mentorships`;
const mineBase = `${apiUrl}/my-mentorships`;
const unwrap = (promise) => promise.then((response) => response.data);

export const mentorshipApi = {
  list: ({ signal } = {}) => unwrap(axios.get(adminBase, { signal })),
  get: (typeId, { signal } = {}) => unwrap(axios.get(`${adminBase}/${typeId}`, { signal })),
  create: ({ name, description, startsAt }) => unwrap(axios.post(adminBase, { name, description, startsAt })),
  update: (typeId, { name, description, startsAt }) => unwrap(axios.put(`${adminBase}/${typeId}`, { name, description, startsAt })),
  remove: (typeId) => unwrap(axios.delete(`${adminBase}/${typeId}`)),
  teachers: ({ signal } = {}) => unwrap(axios.get(`${adminBase}/teachers`, { signal })),
  setTeachers: (typeId, teacherIds) => unwrap(axios.put(`${adminBase}/${typeId}/teachers`, { teacherIds })),
};

export const myMentorshipApi = {
  list: ({ signal } = {}) => unwrap(axios.get(mineBase, { signal })),
};

/** The three roster calls on one URL: { get({signal}), add(rollNumbers), remove(studentIds) } */
const rosterAt = (url) => ({
  get: ({ signal } = {}) => unwrap(axios.get(url, { signal })),
  add: (rollNumbers) => unwrap(axios.post(url, { rollNumbers })),
  remove: (studentIds) => unwrap(axios.delete(url, { data: { studentIds } })),
});

export const adminRoster = (typeId, teacherId) => ({ key: `${typeId}/${teacherId}`, ...rosterAt(`${adminBase}/${typeId}/teachers/${teacherId}/students`) });
export const myRoster = (typeId) => ({ key: typeId, ...rosterAt(`${mineBase}/${typeId}/students`) });
