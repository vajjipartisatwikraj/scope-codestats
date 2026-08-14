/**
 * HTTP client for the external SQLJudge execution engine.
 *
 * SQLJudge is a separate, independently deployed service. It owns SQL question
 * assets (schema, seeds, expected output) in a private S3 bucket and grades
 * submitted SQL inside a throwaway MySQL container.
 *
 * Only this module knows the engine URL and the admin token. Nothing in the
 * browser ever talks to SQLJudge directly: student traffic is proxied through
 * our own authenticated cohort routes.
 *
 * Contract (verified against the deployed service):
 *   GET  /health                        -> engine status
 *   GET  /questions                     -> catalogue (public prefix)
 *   GET  /questions/:id?version=n       -> { question, testcases[] } (visible only)
 *   POST /run                           -> per-testcase detail for visible testcases
 *   POST /submit                        -> aggregate only { status, passed, total }
 *   POST /admin/questions/preview       -> generated expected.json, writes nothing
 *   POST /admin/questions               -> publishes the question to S3
 *
 * SQL errors and timeouts come back as HTTP 200 with a non-PASSED status,
 * because the execution itself worked. Only engine faults are 5xx.
 */

const BASE_URL = (
  process.env.SQLJUDGE_BASE_URL || "http://98.130.56.159:8080"
).replace(/\/+$/, "");
const ADMIN_TOKEN = process.env.SQLJUDGE_ADMIN_TOKEN || "";

// Grading runs every testcase in a fresh container, so allow for it.
const GRADE_TIMEOUT_MS = Number(process.env.SQLJUDGE_GRADE_TIMEOUT_MS) || 240000;
const READ_TIMEOUT_MS = Number(process.env.SQLJUDGE_READ_TIMEOUT_MS) || 30000;

class SqlJudgeError extends Error {
  constructor(message, { status = 502, code = "SQLJUDGE_ERROR", details = null } = {}) {
    super(message);
    this.name = "SqlJudgeError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isAdminConfigured() {
  return Boolean(ADMIN_TOKEN);
}

function requireAdminToken() {
  if (!ADMIN_TOKEN) {
    throw new SqlJudgeError(
      "SQL question publishing is disabled: set SQLJUDGE_ADMIN_TOKEN in the backend environment.",
      { status: 503, code: "SQLJUDGE_ADMIN_TOKEN_MISSING" }
    );
  }
  return ADMIN_TOKEN;
}

async function request(path, { method = "GET", body, admin = false, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs || (method === "GET" ? READ_TIMEOUT_MS : GRADE_TIMEOUT_MS)
  );

  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (admin) headers["x-admin-token"] = requireAdminToken();

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
      throw new SqlJudgeError("The SQL execution engine did not respond in time.", {
        status: 504,
        code: "SQLJUDGE_TIMEOUT",
      });
    }
    throw new SqlJudgeError(`The SQL execution engine is unreachable: ${error.message}`, {
      status: 503,
      code: "SQLJUDGE_UNREACHABLE",
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
      payload = { error: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    throw new SqlJudgeError(
      payload?.error || payload?.message || `SQL engine responded with ${response.status}`,
      {
        // Client mistakes and missing questions are surfaced as-is; anything
        // else is reported as a bad gateway so callers can tell them apart.
        status: response.status >= 400 && response.status < 500 ? response.status : 502,
        code: payload?.code || "SQLJUDGE_REQUEST_FAILED",
        details: payload,
      }
    );
  }

  return payload;
}

/** Engine health, used by diagnostics. */
function health() {
  return request("/health");
}

/** Catalogue of published SQL questions (public prefix only). */
function listQuestions() {
  return request("/questions");
}

/**
 * Student-facing question payload: metadata plus the visible testcases with
 * their seed SQL and expected rows. Never touches the private prefix.
 */
function getQuestion(questionId, version = 1) {
  return request(
    `/questions/${encodeURIComponent(questionId)}?version=${encodeURIComponent(version)}`
  );
}

/** Grade against the visible testcases, with per-testcase detail. */
function run({ questionId, version = 1, sql, submissionId }) {
  return request("/run", {
    method: "POST",
    body: { questionId, version, sql, ...(submissionId ? { submissionId } : {}) },
  });
}

/** Grade against every testcase. Returns an aggregate verdict only. */
function submit({ questionId, version = 1, sql, submissionId }) {
  return request("/submit", {
    method: "POST",
    body: { questionId, version, sql, ...(submissionId ? { submissionId } : {}) },
  });
}

/**
 * Authoring "Generate Outputs": executes the reference solution against every
 * seed and returns the generated expected output. Writes nothing to S3.
 */
function previewQuestion({ schemaSql, solutionSql, testcases }) {
  return request("/admin/questions/preview", {
    method: "POST",
    admin: true,
    body: { schemaSql, solutionSql, testcases },
  });
}

/**
 * Authoring "Submit": publishes the question to S3. The engine regenerates the
 * expected output itself and ignores anything the caller claims it should be.
 */
function publishQuestion(payload) {
  return request("/admin/questions", { method: "POST", admin: true, body: payload });
}

/** Confirms the configured admin token is accepted by the engine. */
function adminPing() {
  return request("/admin/ping", { admin: true });
}

module.exports = {
  SqlJudgeError,
  BASE_URL,
  isAdminConfigured,
  health,
  listQuestions,
  getQuestion,
  run,
  submit,
  previewQuestion,
  publishQuestion,
  adminPing,
};
