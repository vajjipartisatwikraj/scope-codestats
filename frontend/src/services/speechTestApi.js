import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for /api/speech-tests. Components never build these URLs themselves.
 * Auth headers come from the shared axios instance.
 */
const base = `${apiUrl}/speech-tests`;
const unwrap = (promise) => promise.then((response) => response.data);

/** A readable message from a failed request. */
export const apiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.response?.data?.message ||
  (error?.response?.data?.problems && error.response.data.problems.join("; ")) ||
  (error?.request && !error?.response ? "Network problem. Check your connection." : null) ||
  fallback;

// ---- admin / teacher -------------------------------------------------------
export const adminApi = {
  list: () => unwrap(axios.get(`${base}/admin`)),
  get: (id) => unwrap(axios.get(`${base}/admin/${id}`)),
  create: (payload) => unwrap(axios.post(`${base}/admin`, payload)),
  update: (id, payload) => unwrap(axios.put(`${base}/admin/${id}`, payload)),
  remove: (id) => unwrap(axios.delete(`${base}/admin/${id}`)),
  publish: (id, publish) => unwrap(axios.post(`${base}/admin/${id}/publish`, { publish })),

  eligibleUsers: (id) => unwrap(axios.get(`${base}/admin/${id}/eligible-users`)),
  saveEligibleUsers: (id, userIds) =>
    unwrap(axios.put(`${base}/admin/${id}/eligible-users`, { userIds })),
  resolveRollsUrl: (id) => `${base}/admin/${id}/eligible-users/resolve-rolls`,
  eligibleUsersUrl: (id) => `${base}/admin/${id}/eligible-users`,

  results: (id) => unwrap(axios.get(`${base}/admin/${id}/results`)),
  deleteAttempt: (id, attemptId) => unwrap(axios.delete(`${base}/admin/${id}/attempts/${attemptId}`)),
  judgeStatus: () => unwrap(axios.get(`${base}/admin/judge/status`)),
  feedbackSummary: (id) => unwrap(axios.get(`${base}/admin/${id}/feedback`)),
};

// ---- shared ----------------------------------------------------------------
export const leaderboard = (id) => unwrap(axios.get(`${base}/${id}/leaderboard`));

// ---- student ---------------------------------------------------------------
export const studentApi = {
  myTests: () => unwrap(axios.get(`${base}/my`)),
  get: (id) => unwrap(axios.get(`${base}/${id}`)),
  start: (id) => unwrap(axios.post(`${base}/${id}/start`)),
  startSection: (id, sectionId) =>
    unwrap(axios.post(`${base}/${id}/sections/${sectionId}/start`)),
  saveAudioAnswer: (id, sectionId, questionId, wavBlob) =>
    unwrap(
      axios.put(`${base}/${id}/sections/${sectionId}/answers/${questionId}`, wavBlob, {
        headers: { "Content-Type": "audio/wav" },
        // The body is already a Blob; stop axios from trying to transform it.
        transformRequest: [(data) => data],
        timeout: 60000,
      })
    ),
  saveTextAnswer: (id, sectionId, questionId, text) =>
    unwrap(
      axios.put(`${base}/${id}/sections/${sectionId}/answers/${questionId}`, { text }, { timeout: 30000 })
    ),
  submitSection: (id, sectionId, auto = false) =>
    unwrap(axios.post(`${base}/${id}/sections/${sectionId}/submit`, { auto }, { timeout: 60000 })),
  retrySection: (id, sectionId) =>
    unwrap(axios.post(`${base}/${id}/sections/${sectionId}/retry`)),
  /** Detailed results of one scored section. */
  sectionResults: (id, sectionId) =>
    unwrap(axios.get(`${base}/${id}/sections/${sectionId}/results`)),
  end: (id) => unwrap(axios.post(`${base}/${id}/end`)),
  /** `{ rating, ratings: {instructions, accuracy, ease, scoring}, comment }` or `{ skipped: true }`. */
  submitFeedback: (id, payload) => unwrap(axios.post(`${base}/${id}/feedback`, payload)),
  /** Microphone check: resolves with what the judge heard and whether it was clear. */
  audioCheck: (id, wavBlob) =>
    unwrap(
      axios.post(`${base}/${id}/audio-check`, wavBlob, {
        headers: { "Content-Type": "audio/wav" },
        transformRequest: [(data) => data],
        timeout: 60000,
      })
    ),
};
