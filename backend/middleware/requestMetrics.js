/**
 * Counts every finished request for the admin monitoring page. Register it before the request
 * logger, near the top of the middleware chain:
 *
 *   app.use(require("./middleware/requestMetrics")());
 *
 * When the response finishes it hands one small description to services/monitoring, which only
 * adds it to counters in memory. Nothing here waits for the database, and it never throws into the
 * request. It records the route pattern, method, status, time, size, kind of response and the user
 * id from the sign-in token. It never reads the request body, query string, headers or IP address.
 *
 * It skips what the request log skips (preflights, health checks, static files), and the
 * monitoring endpoints themselves, so watching the page does not change the numbers.
 */
const monitoring = require("../services/monitoring");
const { UNMATCHED, kindOfContentType, normalizeRoute } = require("../services/monitoring/buckets");
const log = require("../utils/logger").scope("MONITORING");

const SKIP = [
  /^\/api\/health/,
  /^\/socket\.io\//,
  /^\/favicon\.ico$/,
  /^\/static\//,
  /\.(js|css|map|png|jpg|svg|ico|woff2?)$/,
  /^\/api\/admin\/monitoring(\/|$)/,
];

const MESSAGE_MAX = 160;
const clip = (text) => (text.length > MESSAGE_MAX ? `${text.slice(0, MESSAGE_MAX - 3)}...` : text);

/** The route as written in the code ("/api/users/:id"), or "(unmatched)" when no route answered. */
function routeOf(req) {
  const pattern = req.route?.path;
  if (pattern === undefined) return UNMATCHED;
  return normalizeRoute(`${req.baseUrl || ""}${typeof pattern === "string" ? pattern : String(pattern)}`);
}

module.exports = function requestMetrics() {
  return function requestMetricsMiddleware(req, res, next) {
    if (req.method === "OPTIONS" || SKIP.some((pattern) => pattern.test(req.path))) return next();

    const started = process.hrtime.bigint();

    // Read the one-sentence message of a JSON answer; the body itself is not kept
    let message = "";
    const json = res.json.bind(res);
    res.json = (body) => {
      if (body && typeof body.message === "string") message = clip(body.message);
      return json(body);
    };

    res.on("finish", () => {
      try {
        const thrown = res.locals.logError;
        monitoring.record({
          at: new Date(),
          method: req.method,
          route: routeOf(req),
          status: res.statusCode,
          ms: Number(process.hrtime.bigint() - started) / 1e6,
          // What was really sent (set by the response meter), else the declared length
          bytes: res.locals.logBytesSent ?? (Number(res.getHeader("content-length")) || 0),
          kind: kindOfContentType(res.getHeader("content-type")),
          user: req.user?.id ? String(req.user.id) : null,
          userType: req.user?.userType || null,
          message: thrown?.message ? clip(String(thrown.message)) : message,
          requestId: String(res.getHeader("x-request-id") || ""),
        });
      } catch (err) {
        log.warn(`could not count a request | ${err.message}`);
      }
    });

    next();
  };
};
