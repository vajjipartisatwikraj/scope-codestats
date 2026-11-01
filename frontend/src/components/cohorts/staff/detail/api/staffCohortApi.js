import axios from 'axios';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * Every request the staff cohort page makes. The paths, bodies and headers are the ones the page has
 * always sent. Changes to content that cohorts share go through a preview first (`?preview=true`):
 * the server answers with the cohorts the change would reach, the staff member confirms, and then
 * the same request is sent for real.
 */

const bearer = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
const cohortBase = (id) => `${apiUrl}/cohorts/${id}`;
const moduleBase = (id, moduleId) => `${cohortBase(id)}/modules${moduleId ? `/${moduleId}` : ''}`;
const questionBase = (id, moduleId, questionId) => `${moduleBase(id, moduleId)}/questions${questionId ? `/${questionId}` : ''}`;
const withPreview = (url) => `${url}?preview=true`;

// ---- Reading ----------------------------------------------------------------------------------

/** The cohort with its modules, for staff. The query defeats any cache: staff must see their own edits. */
export const fetchStaffCohort = (token, id) =>
  axios
    .get(`${apiUrl}/cohorts/admin/${id}`, {
      ...bearer(token),
      params: { _t: `${Date.now()}-${Math.random().toString(36).slice(2, 15)}` },
    })
    .then((response) => response.data);

/** The modules on their own, for a cohort that came back without them */
export const fetchModules = (token, id) =>
  axios
    .get(moduleBase(id), { ...bearer(token), params: { _t: `${Date.now()}-${Math.random().toString(36).slice(2, 15)}` } })
    .then((response) => response.data);

/** The whole question, as the form edits it */
export const fetchQuestionForEdit = (token, id, moduleId, questionId) => axios.get(`${questionBase(id, moduleId, questionId)}/edit`, bearer(token)).then((response) => response.data);

export const exportQuestions = (token, id, moduleId) => axios.get(`${questionBase(id, moduleId)}/export`, bearer(token)).then((response) => response.data);

// ---- Cohort ---------------------------------------------------------------------------------------

export const setDraft = (token, id, isDraft) => axios.put(cohortBase(id), { isDraft }, bearer(token));

// ---- Modules (preview, then the real call) ------------------------------------------------------------

export const previewModule = (token, id, data, module) =>
  (module ? axios.put(withPreview(moduleBase(id, module._id)), data, bearer(token)) : axios.post(withPreview(moduleBase(id)), data, bearer(token))).then((response) => response.data);
export const saveModule = (token, id, data, module) =>
  (module ? axios.put(moduleBase(id, module._id), data, bearer(token)) : axios.post(moduleBase(id), data, bearer(token))).then((response) => response.data);
export const previewDeleteModule = (token, id, moduleId) => axios.delete(withPreview(moduleBase(id, moduleId)), bearer(token)).then((response) => response.data);
export const deleteModule = (token, id, moduleId) => axios.delete(moduleBase(id, moduleId), bearer(token)).then((response) => response.data);

// ---- Questions ---------------------------------------------------------------------------------------

export const previewQuestion = (token, id, moduleId, data, question) =>
  (question ? axios.put(withPreview(questionBase(id, moduleId, question._id)), data, bearer(token)) : axios.post(withPreview(questionBase(id, moduleId)), data, bearer(token))).then((response) => response.data);
export const saveQuestion = (token, id, moduleId, data, question) =>
  (question ? axios.put(questionBase(id, moduleId, question._id), data, bearer(token)) : axios.post(questionBase(id, moduleId), data, bearer(token))).then((response) => response.data);
export const previewDeleteQuestion = (token, id, moduleId, questionId) => axios.delete(withPreview(questionBase(id, moduleId, questionId)), bearer(token)).then((response) => response.data);
export const deleteQuestion = (token, id, moduleId, questionId) => axios.delete(questionBase(id, moduleId, questionId), bearer(token)).then((response) => response.data);

export const previewBulk = (token, id, moduleId, payload) => axios.post(withPreview(`${questionBase(id, moduleId)}/bulk`), payload, bearer(token)).then((response) => response.data);
export const bulkUpload = (token, id, moduleId, payload) => axios.post(`${questionBase(id, moduleId)}/bulk`, payload, bearer(token)).then((response) => response.data);
