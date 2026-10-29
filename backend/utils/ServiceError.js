/**
 * An expected failure raised by a service, carrying the HTTP answer for it.
 *
 *   throw new ServiceError(409, "Group is attached", { reason: "attached", cohorts });
 *
 * `body` is sent as the JSON response; `message` is always part of it. Controllers
 * pass anything they catch to `respondWithError`, which sends a ServiceError as
 * described and logs and answers 500 for everything else.
 */
class ServiceError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.name = "ServiceError";
    this.status = status;
    this.body = { message, ...extra };
  }
}

/**
 * Send the response for an error caught in a controller.
 * @param {import("express").Response} res
 * @param {Error} err
 * @param {{error: Function}} log scoped logger of the caller
 * @param {string} action what was being done, for the log line
 */
function respondWithError(res, err, log, action) {
  if (err instanceof ServiceError) {
    return res.status(err.status).json(err.body);
  }
  // The shared roll number resolver raises its own error type with a status.
  if (err && err.name === "RollResolveError") {
    return res.status(err.status || 400).json({ message: err.message });
  }
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  log.error(`Error ${action}:`, err);
  return res.status(500).json({ message: "Server error", error: err.message });
}

module.exports = { ServiceError, respondWithError };
