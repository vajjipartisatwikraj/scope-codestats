import axios from 'axios';
import { apiUrl } from '../../../config/apiConfig';

/**
 * Every request the bank library makes (routes in backend/routes/bankLibrary.js). Reading and
 * importing work for admins and teachers; changing a bank, topic or question is for admins.
 */

const base = `${apiUrl}/bank-library`;
const bearer = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
const get = (token, path, params) => axios.get(`${base}${path}`, { ...bearer(token), params }).then((response) => response.data);
const send = (method, token, path, body) => axios({ method, url: `${base}${path}`, data: body, ...bearer(token) }).then((response) => response.data);

const bankPath = (bankId) => `/banks/${bankId}`;
const topicPath = (bankId, topicId) => `${bankPath(bankId)}/topics/${topicId}`;
const questionPath = (bankId, topicId, questionId) => `${topicPath(bankId, topicId)}/questions${questionId ? `/${questionId}` : ''}`;

// ---- Reading ---------------------------------------------------------------------------------------

/** { configured, canManage, reachable?, reason? } */
export const getStatus = (token) => get(token, '/status');
export const listBanks = (token, params) => get(token, '/banks', params);
export const getBank = (token, bankId) => get(token, bankPath(bankId));
export const getTopic = (token, bankId, topicId) => get(token, topicPath(bankId, topicId));
export const listQuestions = (token, bankId, topicId, params) => get(token, questionPath(bankId, topicId), params);
export const getQuestion = (token, bankId, topicId, questionId) => get(token, questionPath(bankId, topicId, questionId));
/** { banks, topics, questions } whose name or tags match */
export const searchLibrary = (token, q) => get(token, '/search', { q });

// ---- Writing (admins) -----------------------------------------------------------------------------------

export const createBank = (token, data) => send('post', token, '/banks', data);
export const updateBank = (token, bankId, data) => send('put', token, bankPath(bankId), data);
export const deleteBank = (token, bankId) => send('delete', token, bankPath(bankId));

export const createTopic = (token, bankId, data) => send('post', token, `${bankPath(bankId)}/topics`, data);
export const updateTopic = (token, bankId, topicId, data) => send('put', token, topicPath(bankId, topicId), data);
export const deleteTopic = (token, bankId, topicId) => send('delete', token, topicPath(bankId, topicId));

export const createQuestion = (token, bankId, topicId, data) => send('post', token, questionPath(bankId, topicId), data);
export const updateQuestion = (token, bankId, topicId, questionId, data) => send('put', token, questionPath(bankId, topicId, questionId), data);
export const deleteQuestion = (token, bankId, topicId, questionId) => send('delete', token, questionPath(bankId, topicId, questionId));
/** payload: { files: [{ name, questions }] }, the same shape the cohort bulk upload sends */
export const bulkUploadQuestions = (token, bankId, topicId, payload) => send('post', token, `${questionPath(bankId, topicId)}/bulk`, payload);

/** Makes the catalog match the bucket again */
export const reindex = (token) => send('post', token, '/reindex');

// ---- Imports into a cohort -------------------------------------------------------------------------------

/** body: { cohortId, bankId, topicIds?, questionIds?, moduleId? }; answers at once with the job */
export const startImport = (token, body) => send('post', token, '/imports', body);
/** The latest imports of a cohort, newest first */
export const listImports = (token, cohortId, limit = 3) => get(token, '/imports', { cohortId, limit });
export const getImport = (token, jobId) => get(token, `/imports/${jobId}`);
export const cancelImport = (token, jobId) => send('post', token, `/imports/${jobId}/cancel`);
export const retryImport = (token, jobId) => send('post', token, `/imports/${jobId}/retry`);
