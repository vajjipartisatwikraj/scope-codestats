/**
 * Scraper error types.
 *
 * Every failed fetch is reduced to one of these types so it can be stored on the
 * Profile document (`lastErrorType`) and shown to the student or the admin.
 * Keep this list in sync with the enum on the Profile model.
 */
const ERROR_TYPES = [
  "invalid_username",
  "not_found",
  "rate_limited",
  "timeout",
  "service_unavailable",
  "network",
  "unknown",
];

class ScraperError extends Error {
  constructor(type, message) {
    super(message);
    this.name = "ScraperError";
    this.type = ERROR_TYPES.includes(type) ? type : "unknown";
  }
}

/**
 * Maps any error thrown while fetching a profile to a ScraperError.
 * The platform modules throw plain Errors with descriptive messages, so the
 * HTTP status / axios code is checked first and the message second.
 */
function classifyError(error) {
  if (error instanceof ScraperError) return error;

  const status = error?.response?.status;
  const code = error?.code;
  const message = error?.message || "Unknown error";
  const text = message.toLowerCase();

  // The platform modules often rethrow with only the message, so the HTTP
  // status is also read from "status code NNN" in the text.
  const messageStatus = Number((text.match(/status code (\d{3})/) || [])[1]) || null;
  const httpStatus = status || messageStatus;

  let type = "unknown";
  if (/invalid .*username/.test(text)) type = "invalid_username";
  else if (httpStatus === 404 || /not found|does not exist|may not exist/.test(text))
    type = "not_found";
  else if (httpStatus === 429 || /rate limit/.test(text)) type = "rate_limited";
  else if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timed out|timeout/.test(text))
    type = "timeout";
  // 401/403 from a platform means our own credentials or access were refused,
  // not that the student's username is wrong.
  else if (
    (httpStatus && (httpStatus >= 500 || httpStatus === 401 || httpStatus === 403)) ||
    /temporarily unavailable|requiring login/.test(text)
  )
    type = "service_unavailable";
  else if (["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "EAI_AGAIN"].includes(code))
    type = "network";

  const wrapped = new ScraperError(type, message);
  wrapped.cause = error;
  return wrapped;
}

module.exports = { ERROR_TYPES, ScraperError, classifyError };
