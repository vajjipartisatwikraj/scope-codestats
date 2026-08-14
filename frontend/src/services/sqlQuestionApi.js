import axios from "axios";
import { apiUrl } from "../config/apiConfig";

/**
 * Client for the SQL question endpoints.
 *
 * Every call goes to our own backend, which proxies the external SQLJudge
 * engine after applying authentication and cohort authorisation. The browser
 * never talks to the engine directly and never sees its admin token.
 */

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "Content-Type": "application/json",
  },
});

const moduleBase = (cohortId, moduleId) =>
  `${apiUrl}/cohorts/${cohortId}/modules/${moduleId}`;

const questionBase = (cohortId, moduleId, questionId) =>
  `${moduleBase(cohortId, moduleId)}/questions/${questionId}`;

/** Normalises an axios failure into a message the UI can display. */
export const toSqlErrorMessage = (error, fallback = "Request failed") => {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (data.message && data.error && data.message !== data.error) {
    return `${data.message}: ${data.error}`;
  }
  return data.message || data.error || fallback;
};

// ─────────────────────────────── admin ───────────────────────────────

/** Engine reachability and whether publishing is configured. */
export const fetchSqlEngineHealth = async () => {
  const { data } = await axios.get(`${apiUrl}/cohorts/sql-engine/health`, authHeaders());
  return data;
};

/**
 * Generate Outputs — runs the reference solution against every seed and returns
 * the generated expected rows per testcase. Writes nothing.
 */
export const generateSqlOutputs = async (cohortId, moduleId, payload) => {
  const { data } = await axios.post(
    `${moduleBase(cohortId, moduleId)}/sql-questions/generate-outputs`,
    payload,
    authHeaders()
  );
  return data;
};

/** Validate testcases — re-runs the solution and diffs against expected rows. */
export const validateSqlTestcases = async (cohortId, moduleId, payload) => {
  const { data } = await axios.post(
    `${moduleBase(cohortId, moduleId)}/sql-questions/validate`,
    payload,
    authHeaders()
  );
  return data;
};

/** Submit — publishes to S3 through the engine, then creates the question. */
export const publishSqlQuestion = async (cohortId, moduleId, payload, { preview = false } = {}) => {
  const url = `${moduleBase(cohortId, moduleId)}/sql-questions${preview ? "?preview=true" : ""}`;
  const { data } = await axios.post(url, payload, authHeaders());
  return data;
};

// ─────────────────────────────── user ────────────────────────────────

/** Schema, starting query and visible testcases for the solving screen. */
export const fetchSqlQuestionContext = async (cohortId, moduleId, questionId) => {
  const { data } = await axios.get(
    `${questionBase(cohortId, moduleId, questionId)}/sql/context`,
    authHeaders()
  );
  return data;
};

/** Run — visible testcases only, with per-testcase rows and mismatch detail. */
export const runSqlQuery = async (cohortId, moduleId, questionId, sql) => {
  const { data } = await axios.post(
    `${questionBase(cohortId, moduleId, questionId)}/sql/run`,
    { sql },
    authHeaders()
  );
  return data;
};

/**
 * Submit — graded against visible + hidden testcases and recorded as a
 * submission. The engine returns an aggregate only, so no hidden testcase rows
 * are ever available to the client.
 */
export const submitSqlQuery = async (cohortId, moduleId, questionId, sql) => {
  const { data } = await axios.post(
    `${questionBase(cohortId, moduleId, questionId)}/submit`,
    { submissionType: "sql", code: sql, language: "sql" },
    authHeaders()
  );
  return data;
};

export default {
  fetchSqlEngineHealth,
  generateSqlOutputs,
  validateSqlTestcases,
  publishSqlQuestion,
  fetchSqlQuestionContext,
  runSqlQuery,
  submitSqlQuery,
  toSqlErrorMessage,
};
