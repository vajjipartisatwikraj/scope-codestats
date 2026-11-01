import axios from 'axios';
import { apiUrl } from '../../../../../config/apiConfig';

/**
 * Every request the staff cohort dashboard makes. The paths, bodies and headers are the ones the
 * page has always sent.
 */

const bearer = (token) => ({ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

export const listCohorts = (token) => axios.get(`${apiUrl}/cohorts/admin`, bearer(token)).then((response) => response.data);

/** `form` is sent as it is; a cohort being edited has no accessType in it */
export const createCohort = (token, form) => axios.post(`${apiUrl}/cohorts`, form, bearer(token));
export const updateCohort = (token, id, form) => axios.put(`${apiUrl}/cohorts/${id}`, form, bearer(token));

export const deleteCohort = (token, id) => axios.delete(`${apiUrl}/cohorts/${id}`, bearer(token)).then((response) => response.data);

/** What deleting would remove and which user groups are still attached */
export const deletionImpact = (token, id) => axios.get(`${apiUrl}/cohorts/${id}/deletion-impact`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.data);

/** Copies the cohort as a draft that references the same modules and questions */
export const duplicateCohort = (token, id) => axios.post(`${apiUrl}/cohorts/${id}/duplicate`, {}, { ...bearer(token), timeout: 60000 }).then((response) => response.data);

/** The exam results workbook (.xlsx) as a blob response */
export const examReport = (token, id) => axios.get(`${apiUrl}/cohorts/${id}/exam-report/export`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });

export const cohortFeedback = (token, id) => axios.get(`${apiUrl}/cohorts/${id}/feedback`, bearer(token)).then((response) => response.data);
export const deleteFeedback = (token, cohortId, reviewId) => axios.delete(`${apiUrl}/cohorts/${cohortId}/feedback/${reviewId}`, bearer(token));
