/**
 * HTTP client for the external SpeechJudge service.
 *
 * SpeechJudge is a separate, independently deployed, stateless evaluator. It
 * receives audio plus question metadata and returns scores. It stores nothing
 * permanent, so everything the student produced is kept on our side until the
 * judge has answered.
 *
 * Only this module knows the judge URL and credential. The browser never talks
 * to SpeechJudge: all traffic goes through our authenticated speech-test routes.
 *
 * Contract (see SpeechJudge/speech-judge/README.md):
 *   GET  /api/v1/health                 liveness (no auth)
 *   GET  /api/v1/ready                  per-model readiness (200 / 503, no auth)
 *   POST /api/v1/evaluate/section       202 { job_id, request_id, status }
 *   GET  /api/v1/jobs/{job_id}          { status, section_score, results[], reason }
 *                                       each result also carries `detail` (the full evaluation)
 * Auth: `Authorization: Bearer <SJ_SERVICE_CREDENTIALS entry>`.
 *
 * Scores come back on a 0..1 scale.
 */

const BASE_URL = (process.env.SPEECHJUDGE_BASE_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  ""
);
const API_KEY = process.env.SPEECHJUDGE_API_KEY || "";

// Submitting a section uploads every recording, so allow a generous window.
const SUBMIT_TIMEOUT_MS = Number(process.env.SPEECHJUDGE_SUBMIT_TIMEOUT_MS) || 120000;
const READ_TIMEOUT_MS = Number(process.env.SPEECHJUDGE_READ_TIMEOUT_MS) || 20000;

class SpeechJudgeError extends Error {
  constructor(message, { status = 502, code = "SPEECHJUDGE_ERROR", details = null } = {}) {
    super(message);
    this.name = "SpeechJudgeError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isConfigured() {
  return Boolean(API_KEY);
}

async function request(path, { method = "GET", body, timeoutMs, auth = true } = {}) {
  if (auth && !API_KEY) {
    throw new SpeechJudgeError(
      "Speech scoring is not configured: set SPEECHJUDGE_API_KEY in the backend environment.",
      { status: 503, code: "SPEECHJUDGE_NOT_CONFIGURED" }
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs || (method === "GET" ? READ_TIMEOUT_MS : SUBMIT_TIMEOUT_MS)
  );

  const headers = { accept: "application/json" };
  if (auth) headers.authorization = `Bearer ${API_KEY}`;
  if (body !== undefined) headers["content-type"] = "application/json";

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new SpeechJudgeError("The speech judge did not respond in time.", {
        status: 504,
        code: "SPEECHJUDGE_TIMEOUT",
      });
    }
    throw new SpeechJudgeError(`The speech judge is unreachable: ${error.message}`, {
      status: 503,
      code: "SPEECHJUDGE_UNREACHABLE",
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { detail: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    const detail = payload?.detail;
    const errors = Array.isArray(payload?.errors) ? payload.errors.join("; ") : "";
    throw new SpeechJudgeError(
      `${typeof detail === "string" ? detail : `Speech judge responded with ${response.status}`}${
        errors ? ` (${errors})` : ""
      }`,
      {
        status: response.status,
        code: "SPEECHJUDGE_REQUEST_FAILED",
        details: payload,
      }
    );
  }

  return payload;
}

/** Liveness, used by diagnostics. */
function health() {
  return request("/api/v1/health", { auth: false });
}

/** Readiness. A 503 still carries a useful body, so it is returned, not thrown. */
async function ready() {
  try {
    return { ready: true, ...(await request("/api/v1/ready", { auth: false })) };
  } catch (error) {
    if (error instanceof SpeechJudgeError && error.details) {
      return { ready: false, ...error.details };
    }
    throw error;
  }
}

/**
 * Submits a whole section as one job.
 *
 * @param {object} p
 * @param {string} p.requestId   unique per dispatch
 * @param {string} p.studentId
 * @param {string} p.sectionType READING | REPEAT | JUMBLED | QUESTION_ANSWER | STORYTELLING
 * @param {Array}  p.questions   [{ question_id, audio?, expected_text?, question?, question_config? }]
 * @returns {Promise<{job_id: string, request_id: string, status: string}>}
 */
function submitSection({ requestId, studentId, sectionType, questions }) {
  return request("/api/v1/evaluate/section", {
    method: "POST",
    body: {
      request_id: requestId,
      student_id: studentId,
      section_id: sectionType,
      questions,
      // The full per-question breakdown (transcript, phonemes, pauses, rubric)
      // feeds the results page; the score alone is not enough.
      include_details: true,
    },
  });
}

/**
 * Scores a single recording and waits for the answer (POST /api/v1/evaluate).
 * Used for the quick microphone check before a test, where a reply within a few
 * seconds is wanted and nothing needs to be queued.
 *
 * @returns {Promise<object>} the judge's EvaluationResult
 */
function evaluate({ requestId, questionType, audio, expectedText, question }) {
  return request("/api/v1/evaluate", {
    method: "POST",
    timeoutMs: 45000,
    body: {
      request_id: requestId,
      question_type: questionType,
      audio,
      ...(expectedText ? { expected_text: expectedText } : {}),
      ...(question ? { question } : {}),
    },
  });
}

/** Job state. A 404 means the job expired or the judge was restarted. */
function getJob(jobId) {
  return request(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
}

module.exports = {
  SpeechJudgeError,
  BASE_URL,
  isConfigured,
  health,
  ready,
  submitSection,
  evaluate,
  getJob,
};
