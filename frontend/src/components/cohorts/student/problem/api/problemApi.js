import axios from 'axios';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * Every request the problem page makes, in one place. The paths, bodies and headers are the ones the
 * page has always sent; nothing here changes what the server receives.
 *
 * Most calls use the session token held by AuthContext (passed in). The two code-execution calls to
 * the compiler service read the token from localStorage and use VITE_API_URL, as they always did.
 */

const bearer = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
const compilerHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });
const cohortBase = (cohortId) => `${apiUrl}/cohorts/${cohortId}`;
const questionBase = (cohortId, moduleId, questionId) => `${cohortBase(cohortId)}/modules/${moduleId}/questions/${questionId}`;

// ---- Reading ----------------------------------------------------------------------------------

export const fetchQuestion = (token, { cohortId, moduleId, questionId }) =>
  axios.get(questionBase(cohortId, moduleId, questionId), bearer(token)).then((response) => response.data);

export const fetchMySubmissions = (token, { cohortId, questionId }) =>
  axios.get(`${cohortBase(cohortId)}/questions/${questionId}/submissions`, bearer(token)).then((response) => response.data || []);

export const fetchAllSubmissions = (token, { cohortId, moduleId, questionId }) =>
  axios.get(`${questionBase(cohortId, moduleId, questionId)}/all-submissions`, bearer(token)).then((response) => response.data || []);

export const fetchEditorial = (token, { cohortId, questionId }) =>
  axios.get(`${cohortBase(cohortId)}/questions/${questionId}/editorial`, bearer(token)).then((response) => response.data.editorial);

/** The module with its questions, for the problem list and for previous and next */
export const fetchModule = (token, { cohortId, moduleId }) =>
  axios.get(`${cohortBase(cohortId)}/modules/${moduleId}`, bearer(token)).then((response) => response.data);

// ---- Running and submitting --------------------------------------------------------------------

/** Run against the visible test cases only (the server never sends the hidden ones) */
export async function runWithQuestion({ language, code, questionId }) {
  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/compiler/execute-with-question`,
      { language, source_code: code, questionId, mode: 'run', options: {} },
      compilerHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error executing code with question:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to execute code');
  }
}

/** Run once with the student's own stdin; no test case is compared */
export async function runWithCustomInput({ language, code, input }) {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/compiler/run`, { language, source_code: code, input }, compilerHeaders());
    return response.data;
  } catch (error) {
    console.error('Error running code with custom input:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to run code');
  }
}

/**
 * Submit a programming answer. The server runs the code once on all test cases (hidden ones
 * included, never sent back), grades it, saves the submission and answers with the results to show.
 * The axios error is not wrapped, so a caller can read `error.response`.
 */
export const submitProgramming = (token, ids, { code, language }) =>
  axios.post(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/submit`, { code, language, submissionType: 'programming' }, bearer(token)).then((response) => response.data);

export const submitMcq = (token, ids, option) =>
  axios
    .post(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/submit`, { submissionType: 'mcq', selectedOption: option._id, isCorrect: option.isCorrect }, bearer(token))
    .then((response) => response.data);

// ---- Notes -------------------------------------------------------------------------------------

export const fetchNotes = (token, ids) => axios.get(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/notes`, bearer(token)).then((response) => response.data?.notes || '');
export const saveNotes = (token, ids, notes) => axios.post(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/notes`, { notes }, bearer(token));

// ---- Reports -----------------------------------------------------------------------------------

export const fetchReports = (token, ids) => axios.get(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/reports`, bearer(token)).then((response) => response.data || []);
export const postReport = (token, ids, body) => axios.post(`${questionBase(ids.cohortId, ids.moduleId, ids.questionId)}/report`, body, bearer(token));
export const updateReport = (token, cohortId, reportId, body) => axios.put(`${cohortBase(cohortId)}/reports/${reportId}`, body, bearer(token));
export const deleteReport = (token, cohortId, reportId) => axios.delete(`${cohortBase(cohortId)}/reports/${reportId}`, bearer(token));
